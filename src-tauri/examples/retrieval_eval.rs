//! Offline retrieval eval harness.
//!
//! Runs every query of a JSON fixture through the `text`, `semantic` and
//! `hybrid` search paths of a real vault and writes a JSON report with the
//! top-10 paths per mode, recall@5 / recall@10 / MRR@10, result counts and
//! p50 latency. Run it once before a retrieval change (baseline) and once
//! after, then diff the two reports with `--compare`.
//!
//! The vault must already carry its `.kokobrain/kokobrain.db` (FTS5 +
//! chunks) and, for the semantic and hybrid modes, the models under
//! `.kokobrain/models/`. Nothing is written to the vault except the report.
//!
//! ```sh
//! cargo run --release --manifest-path src-tauri/Cargo.toml --example retrieval_eval -- \
//!   --vault ~/Vault \
//!   [--queries ~/Vault/.kokobrain/eval/queries.json] \
//!   [--out ~/Vault/.kokobrain/eval/report-<timestamp>.json] \
//!   [--compare ~/Vault/.kokobrain/eval/report-baseline.json] \
//!   [--limit 20] [--modes text,semantic,hybrid] [--verbose]
//! ```
//!
//! To compare the int8 embedding cache against the pre-quantization f32
//! baseline, run the same fixture twice — `KOKO_SEARCH_CACHE=f32` keeps the
//! f32 vectors resident and scores with `embedder::cosine_similarity` — then
//! `--compare` the two reports and read the per-query regression list:
//!
//! ```sh
//! KOKO_SEARCH_CACHE=f32 cargo run --release … -- --vault ~/Vault --out /tmp/f32.json
//! cargo run --release … -- --vault ~/Vault --out /tmp/int8.json --compare /tmp/f32.json
//! ```
//!
//! Do not have a fixture yet? `--init-fixture` drafts one from the vault's
//! own FTS index: bucket A from terms that occur in exactly one note, bucket
//! B from note titles (rewrite those as paraphrases), bucket C from nonsense
//! queries verified absent from the vocabulary. Review, trim, then run.
//!
//! ```sh
//! cargo run --release --manifest-path src-tauri/Cargo.toml --example retrieval_eval -- \
//!   --vault ~/Vault --init-fixture [--count 10] [--force]
//! ```
//!
//! See `retrieval_eval.queries.example.json` next to this file for the
//! fixture format and `docs/SEARCH.md` § "Evaluating retrieval changes".

use kokobrain_lib::commands::search_index::search_fts_inner;
use kokobrain_lib::commands::semantic::{
	init_semantic_search, is_reranker_model_available, search_cache_label, search_hybrid,
	search_semantic,
};
use kokobrain_lib::db;
use kokobrain_lib::search::eval_metrics::{
	dedupe_paths, looks_like_a_real_term, recall_at_k, reciprocal_rank_at_k, summarize, ModeSummary,
	QueryEval,
};
use kokobrain_lib::utils::logger::set_debug_mode;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::PathBuf;
use std::time::Instant;

/// How many result paths per mode are stored in the report.
const REPORT_TOP_N: usize = 10;

/// Default modes, in execution order.
const ALL_MODES: [&str; 3] = ["text", "semantic", "hybrid"];

/// Parsed command line.
struct Args {
	vault: PathBuf,
	queries: PathBuf,
	out: PathBuf,
	compare: Option<PathBuf>,
	limit: usize,
	modes: Vec<String>,
	verbose: bool,
	/// Draft a fixture from the vault instead of running the eval.
	init_fixture: bool,
	/// Queries per bucket for `--init-fixture` (bucket C is capped at 3).
	count: usize,
	/// Overwrite an existing fixture in `--init-fixture` mode.
	force: bool,
}

impl Args {
	fn parse(raw: Vec<String>) -> Result<Self, String> {
		let mut vault: Option<PathBuf> = None;
		let mut queries: Option<PathBuf> = None;
		let mut out: Option<PathBuf> = None;
		let mut compare: Option<PathBuf> = None;
		let mut limit = 20usize;
		let mut modes: Vec<String> = ALL_MODES.iter().map(|m| m.to_string()).collect();
		let mut verbose = false;
		let mut init_fixture = false;
		let mut count = 10usize;
		let mut force = false;

		let mut iter = raw.into_iter();
		while let Some(flag) = iter.next() {
			match flag.as_str() {
				"--vault" => vault = Some(PathBuf::from(next_value(&mut iter, &flag)?)),
				"--queries" => queries = Some(PathBuf::from(next_value(&mut iter, &flag)?)),
				"--out" => out = Some(PathBuf::from(next_value(&mut iter, &flag)?)),
				"--compare" => compare = Some(PathBuf::from(next_value(&mut iter, &flag)?)),
				"--limit" => {
					limit = next_value(&mut iter, &flag)?
						.parse()
						.map_err(|e| format!("--limit must be an integer: {e}"))?;
				}
				"--modes" => {
					modes = next_value(&mut iter, &flag)?
						.split(',')
						.map(|m| m.trim().to_string())
						.filter(|m| !m.is_empty())
						.collect();
					for m in &modes {
						if !ALL_MODES.contains(&m.as_str()) {
							return Err(format!("unknown mode {m:?}; valid: text, semantic, hybrid"));
						}
					}
				}
				"--verbose" => verbose = true,
				"--init-fixture" => init_fixture = true,
				"--count" => {
					count = next_value(&mut iter, &flag)?
						.parse()
						.map_err(|e| format!("--count must be an integer: {e}"))?;
				}
				"--force" => force = true,
				"--help" | "-h" => return Err(USAGE.to_string()),
				other => return Err(format!("unknown argument {other:?}\n{USAGE}")),
			}
		}

		let vault = vault.ok_or_else(|| format!("--vault is required\n{USAGE}"))?;
		let eval_dir = vault.join(".kokobrain").join("eval");
		let queries = queries.unwrap_or_else(|| eval_dir.join("queries.json"));
		let out = out.unwrap_or_else(|| {
			let stamp = chrono::Local::now().format("%Y%m%d-%H%M%S");
			eval_dir.join(format!("report-{stamp}.json"))
		});
		Ok(Self {
			vault,
			queries,
			out,
			compare,
			limit,
			modes,
			verbose,
			init_fixture,
			count,
			force,
		})
	}
}

const USAGE: &str = "usage: retrieval_eval --vault <path> [--queries <file>] [--out <file>] \
[--compare <baseline.json>] [--limit N] [--modes text,semantic,hybrid] [--verbose]\n\
       retrieval_eval --vault <path> --init-fixture [--queries <file>] [--count N] [--force]";

fn next_value(iter: &mut impl Iterator<Item = String>, flag: &str) -> Result<String, String> {
	iter.next().ok_or_else(|| format!("{flag} expects a value"))
}

/// Fixture file: `{ "queries": [ ... ] }`.
#[derive(Deserialize)]
struct Fixture {
	queries: Vec<FixtureQuery>,
}

/// One fixture query. `expected` is empty for "nothing relevant" queries.
#[derive(Deserialize, Serialize, Clone)]
struct FixtureQuery {
	id: String,
	#[serde(default)]
	bucket: String,
	query: String,
	#[serde(default)]
	expected: Vec<String>,
}

/// Per-query, per-mode outcome stored in the report.
#[derive(Serialize, Deserialize, Clone)]
struct ModeOutcome {
	/// Unique paths returned, best first, capped at `REPORT_TOP_N`.
	paths: Vec<String>,
	/// Unique paths returned before the cap (filter behavior signal).
	result_count: usize,
	latency_ms: f32,
	recall_at_5: Option<f32>,
	recall_at_10: Option<f32>,
	reciprocal_rank_at_10: Option<f32>,
	/// Set when the search call failed; `paths` is then empty.
	error: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct QueryReport {
	id: String,
	bucket: String,
	query: String,
	expected: Vec<String>,
	modes: BTreeMap<String, ModeOutcome>,
}

#[derive(Serialize, Deserialize)]
struct Report {
	generated_at: String,
	git_head: Option<String>,
	vault: String,
	limit: usize,
	embedder_available: bool,
	reranker_available: bool,
	modes: Vec<String>,
	queries: Vec<QueryReport>,
	/// Embedding-cache layout the semantic scan used: `int8` (what the app
	/// ships) or `f32` when `KOKO_SEARCH_CACHE=f32` forced the
	/// pre-quantization baseline. Empty in reports written before the int8
	/// cache landed.
	#[serde(default)]
	search_cache: String,
	/// mode -> summary over all queries
	summary: BTreeMap<String, ModeSummary>,
	/// bucket -> mode -> summary
	per_bucket: BTreeMap<String, BTreeMap<String, ModeSummary>>,
}

fn main() {
	if let Err(err) = run() {
		eprintln!("retrieval_eval: {err}");
		std::process::exit(1);
	}
}

fn run() -> Result<(), String> {
	let args = Args::parse(std::env::args().skip(1).collect())?;
	set_debug_mode(args.verbose);

	if args.init_fixture {
		db::open_database(&args.vault)?;
		let result = init_fixture(&args);
		let _ = db::close_database();
		return result;
	}

	let fixture_text = std::fs::read_to_string(&args.queries)
		.map_err(|e| format!("cannot read fixture {:?}: {e}", args.queries))?;
	let fixture: Fixture = serde_json::from_str(&fixture_text)
		.map_err(|e| format!("fixture {:?} is not valid: {e}", args.queries))?;
	if fixture.queries.is_empty() {
		return Err("fixture has no queries".to_string());
	}

	db::open_database(&args.vault)?;
	let runtime = tokio::runtime::Runtime::new().map_err(|e| format!("tokio runtime: {e}"))?;
	let vault_str = args.vault.to_string_lossy().to_string();

	let embedder_available = runtime.block_on(init_semantic_search(vault_str.clone()))?;
	let reranker_available = is_reranker_model_available(vault_str.clone())?;

	let mut modes = args.modes.clone();
	if !embedder_available {
		let dropped: Vec<&str> = modes
			.iter()
			.filter(|m| m.as_str() != "text")
			.map(|m| m.as_str())
			.collect();
		if !dropped.is_empty() {
			eprintln!(
				"embedder model not found under {:?}; skipping {}",
				args.vault.join(".kokobrain").join("models"),
				dropped.join(", ")
			);
		}
		modes.retain(|m| m == "text");
	}
	if modes.is_empty() {
		return Err("no runnable modes".to_string());
	}
	eprintln!(
		"vault={} queries={} modes={} embedder={} reranker={} search_cache={}",
		vault_str,
		fixture.queries.len(),
		modes.join(","),
		embedder_available,
		reranker_available,
		search_cache_label()
	);

	// Warm-up: the first semantic call lazy-loads the embedder cache and the
	// first rerank lazy-loads the cross-encoder. Neither belongs in a latency
	// number, so run every mode once on the first query and discard it.
	let first = &fixture.queries[0];
	for mode in &modes {
		let _ = run_mode(&runtime, mode, &first.query, args.limit);
	}

	let mut query_reports: Vec<QueryReport> = Vec::with_capacity(fixture.queries.len());
	let mut evals_by_mode: BTreeMap<String, Vec<QueryEval>> = BTreeMap::new();
	let mut evals_by_bucket_mode: BTreeMap<String, BTreeMap<String, Vec<QueryEval>>> =
		BTreeMap::new();

	for fq in &fixture.queries {
		let mut outcomes: BTreeMap<String, ModeOutcome> = BTreeMap::new();
		for mode in &modes {
			let start = Instant::now();
			let result = run_mode(&runtime, mode, &fq.query, args.limit);
			let latency_ms = start.elapsed().as_secs_f32() * 1000.0;
			let (paths, error) = match result {
				Ok(raw) => (dedupe_paths(raw), None),
				Err(e) => {
					eprintln!("[{}] {} failed: {}", fq.id, mode, e);
					(Vec::new(), Some(e))
				}
			};
			let outcome = ModeOutcome {
				result_count: paths.len(),
				recall_at_5: recall_at_k(&paths, &fq.expected, 5),
				recall_at_10: recall_at_k(&paths, &fq.expected, REPORT_TOP_N),
				reciprocal_rank_at_10: reciprocal_rank_at_k(&paths, &fq.expected, REPORT_TOP_N),
				latency_ms,
				error,
				paths: paths.iter().take(REPORT_TOP_N).cloned().collect(),
			};
			let eval = QueryEval {
				returned: paths,
				expected: fq.expected.clone(),
				latency_ms,
			};
			evals_by_bucket_mode
				.entry(fq.bucket.clone())
				.or_default()
				.entry(mode.clone())
				.or_default()
				.push(QueryEval {
					returned: eval.returned.clone(),
					expected: eval.expected.clone(),
					latency_ms: eval.latency_ms,
				});
			evals_by_mode.entry(mode.clone()).or_default().push(eval);
			outcomes.insert(mode.clone(), outcome);
		}
		query_reports.push(QueryReport {
			id: fq.id.clone(),
			bucket: fq.bucket.clone(),
			query: fq.query.clone(),
			expected: fq.expected.clone(),
			modes: outcomes,
		});
	}

	let summary: BTreeMap<String, ModeSummary> = evals_by_mode
		.iter()
		.map(|(mode, evals)| (mode.clone(), summarize(evals)))
		.collect();
	let per_bucket: BTreeMap<String, BTreeMap<String, ModeSummary>> = evals_by_bucket_mode
		.iter()
		.map(|(bucket, by_mode)| {
			let inner = by_mode
				.iter()
				.map(|(mode, evals)| (mode.clone(), summarize(evals)))
				.collect();
			(bucket.clone(), inner)
		})
		.collect();

	let report = Report {
		generated_at: chrono::Local::now().to_rfc3339(),
		git_head: git_head(),
		vault: vault_str,
		limit: args.limit,
		embedder_available,
		reranker_available,
		modes: modes.clone(),
		queries: query_reports,
		search_cache: search_cache_label().to_string(),
		summary,
		per_bucket,
	};

	if let Some(parent) = args.out.parent() {
		std::fs::create_dir_all(parent).map_err(|e| format!("cannot create {parent:?}: {e}"))?;
	}
	let json = serde_json::to_string_pretty(&report).map_err(|e| format!("serialize report: {e}"))?;
	std::fs::write(&args.out, json).map_err(|e| format!("cannot write {:?}: {e}", args.out))?;

	print_summary("all queries", &report.summary);
	for (bucket, by_mode) in &report.per_bucket {
		let label = if bucket.is_empty() { "bucket (unset)".to_string() } else { format!("bucket {bucket}") };
		print_summary(&label, by_mode);
	}
	print_misses(&report);

	if let Some(baseline_path) = &args.compare {
		let baseline_text = std::fs::read_to_string(baseline_path)
			.map_err(|e| format!("cannot read baseline {baseline_path:?}: {e}"))?;
		let baseline: Report = serde_json::from_str(&baseline_text)
			.map_err(|e| format!("baseline {baseline_path:?} is not a report: {e}"))?;
		print_comparison(&baseline, &report);
	}

	println!("\nreport written to {}", args.out.display());
	let _ = db::close_database();
	Ok(())
}

/// Fixture file as written by `--init-fixture`. Same shape the eval reads,
/// plus a `_comment` and per-query `_todo` hints that the reader ignores.
#[derive(Serialize)]
struct FixtureDraft {
	#[serde(rename = "_comment")]
	comment: String,
	queries: Vec<FixtureDraftQuery>,
}

#[derive(Serialize)]
struct FixtureDraftQuery {
	id: String,
	bucket: String,
	query: String,
	expected: Vec<String>,
	#[serde(rename = "_todo", skip_serializing_if = "Option::is_none")]
	todo: Option<String>,
}

/// Nonsense queries for bucket C; each token is checked against the vault
/// vocabulary and the query is dropped if any token exists.
const NONSENSE_QUERIES: [&str; 3] = [
	"zorblat quennifer plasmoid kettleworth",
	"vintrosque halberdine mocassinage",
	"frumblewick oscillatrix pendragonal",
];

/// Drafts `queries.json` from the vault's own FTS index. Bucket A: terms
/// that occur in exactly one note (rare exact terms, the case hybrid must
/// not lose). Bucket B: note titles, to be rewritten as paraphrases by the
/// author. Bucket C: nonsense verified absent from the vocabulary.
fn init_fixture(args: &Args) -> Result<(), String> {
	if args.queries.exists() && !args.force {
		return Err(format!(
			"{} already exists; pass --force to overwrite or --queries <other file>",
			args.queries.display()
		));
	}
	let count_a = args.count.max(1);
	let count_b = args.count.max(1);

	let (bucket_a, bucket_b, bucket_c) = db::with_fts_db(|conn| {
		// A `row`-type fts5vocab table gives (term, doc, cnt) straight from
		// the index. It must live in temp to reference a main-db FTS table
		// by name; the `instance`-type table the app keeps would need a
		// GROUP BY over every token occurrence.
		conn.execute(
			"CREATE VIRTUAL TABLE IF NOT EXISTS temp.eval_vocab USING fts5vocab('main', 'notes_fts', 'row')",
			[],
		)
		.map_err(|e| format!("cannot create temp vocab table: {e}"))?;

		// Bucket A candidates: single-document terms, 7-30 chars, no digits,
		// random order. Over-fetch so junk can be filtered below.
		let mut stmt = conn
			.prepare(
				"SELECT term FROM temp.eval_vocab
				 WHERE doc = 1 AND length(term) BETWEEN 7 AND 30 AND term NOT GLOB '*[0-9]*'
				 ORDER BY random() LIMIT ?1",
			)
			.map_err(|e| format!("vocab query failed: {e}"))?;
		let terms: Vec<String> = stmt
			.query_map(rusqlite::params![(count_a * 6) as i64], |row| row.get::<_, String>(0))
			.map_err(|e| format!("vocab query execution failed: {e}"))?
			.filter_map(|r| r.ok())
			.collect();

		let mut bucket_a: Vec<(String, String)> = Vec::new();
		for term in terms {
			if bucket_a.len() >= count_a {
				break;
			}
			if !looks_like_a_real_term(&term) {
				continue;
			}
			let hits = db::fts_repo::search_match(conn, &format!("\"{}\"", term), 2)?;
			if hits.len() == 1 {
				bucket_a.push((term, hits[0].path.clone()));
			}
		}

		// Bucket B: random titled notes.
		let mut stmt = conn
			.prepare(
				"SELECT path, title FROM notes_content
				 WHERE length(trim(title)) >= 4 ORDER BY random() LIMIT ?1",
			)
			.map_err(|e| format!("notes_content query failed: {e}"))?;
		let bucket_b: Vec<(String, String)> = stmt
			.query_map(rusqlite::params![count_b as i64], |row| {
				Ok((row.get::<_, String>(1)?, row.get::<_, String>(0)?))
			})
			.map_err(|e| format!("notes_content query execution failed: {e}"))?
			.filter_map(|r| r.ok())
			.collect();

		// Bucket C: keep a nonsense query only if none of its tokens exists.
		let mut exists = conn
			.prepare("SELECT 1 FROM temp.eval_vocab WHERE term = ?1 LIMIT 1")
			.map_err(|e| format!("vocab lookup failed: {e}"))?;
		let mut bucket_c: Vec<String> = Vec::new();
		for q in NONSENSE_QUERIES {
			let any_known = q.split_whitespace().any(|tok| {
				exists
					.query_row(rusqlite::params![tok], |_| Ok(()))
					.is_ok()
			});
			if !any_known {
				bucket_c.push(q.to_string());
			}
		}
		Ok((bucket_a, bucket_b, bucket_c))
	})?;

	if bucket_a.is_empty() && bucket_b.is_empty() {
		return Err("the FTS index is empty; open the vault in the app once so it gets indexed".to_string());
	}

	let mut queries: Vec<FixtureDraftQuery> = Vec::new();
	for (i, (term, path)) in bucket_a.iter().enumerate() {
		queries.push(FixtureDraftQuery {
			id: format!("a{:02}", i + 1),
			bucket: "A".to_string(),
			query: term.clone(),
			expected: vec![path.clone()],
			todo: Some("Keep only if this term is something you would actually search for (identifier, name, acronym); delete junk.".to_string()),
		});
	}
	for (i, (title, path)) in bucket_b.iter().enumerate() {
		queries.push(FixtureDraftQuery {
			id: format!("b{:02}", i + 1),
			bucket: "B".to_string(),
			query: title.clone(),
			expected: vec![path.clone()],
			todo: Some("Rewrite this query as a paraphrase in your own words (do not reuse the title's words), then delete this key.".to_string()),
		});
	}
	for (i, q) in bucket_c.iter().enumerate() {
		queries.push(FixtureDraftQuery {
			id: format!("c{:02}", i + 1),
			bucket: "C".to_string(),
			query: q.clone(),
			expected: Vec::new(),
			todo: None,
		});
	}

	let draft = FixtureDraft {
		comment: "DRAFT generated by retrieval_eval --init-fixture. Review every entry: delete junk in A, paraphrase B, add 1-2 more expected paths where another note is equally relevant. Paths are vault-relative. Delete the _todo keys when done.".to_string(),
		queries,
	};
	if let Some(parent) = args.queries.parent() {
		std::fs::create_dir_all(parent).map_err(|e| format!("cannot create {parent:?}: {e}"))?;
	}
	let json = serde_json::to_string_pretty(&draft).map_err(|e| format!("serialize fixture: {e}"))?;
	std::fs::write(&args.queries, json).map_err(|e| format!("cannot write {:?}: {e}", args.queries))?;
	println!(
		"fixture draft written to {}\n  bucket A (rare terms): {}\n  bucket B (titles, paraphrase them): {}\n  bucket C (nothing relevant): {}\nReview it, then run the eval without --init-fixture.",
		args.queries.display(),
		bucket_a.len(),
		bucket_b.len(),
		bucket_c.len()
	);
	Ok(())
}

/// Runs one query in one mode and returns the raw path list, best first.
fn run_mode(
	runtime: &tokio::runtime::Runtime,
	mode: &str,
	query: &str,
	limit: usize,
) -> Result<Vec<String>, String> {
	match mode {
		"text" => Ok(search_fts_inner(query, limit, false)?
			.into_iter()
			.map(|r| r.path)
			.collect()),
		"semantic" => Ok(runtime
			.block_on(search_semantic(query.to_string(), Some(limit), None))?
			.into_iter()
			.map(|r| r.source_path)
			.collect()),
		"hybrid" => Ok(runtime
			.block_on(search_hybrid(query.to_string(), Some(limit)))?
			.into_iter()
			.map(|r| r.source_path)
			.collect()),
		other => Err(format!("unknown mode {other}")),
	}
}

fn git_head() -> Option<String> {
	let output = std::process::Command::new("git")
		.args(["rev-parse", "--short", "HEAD"])
		.output()
		.ok()?;
	if !output.status.success() {
		return None;
	}
	Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn fmt_opt(value: Option<f32>) -> String {
	match value {
		Some(v) => format!("{v:.3}"),
		None => "-".to_string(),
	}
}

fn print_summary(label: &str, by_mode: &BTreeMap<String, ModeSummary>) {
	println!("\n== {label} ==");
	println!(
		"{:<9} {:>3} {:>4} {:>7} {:>7} {:>7} {:>8} {:>9}",
		"mode", "n", "n_exp", "R@5", "R@10", "MRR@10", "avg_res", "p50_ms"
	);
	for (mode, s) in by_mode {
		println!(
			"{:<9} {:>3} {:>4} {:>7} {:>7} {:>7} {:>8.1} {:>9.1}",
			mode,
			s.queries,
			s.queries_with_expected,
			fmt_opt(s.recall_at_5),
			fmt_opt(s.recall_at_10),
			fmt_opt(s.mrr_at_10),
			s.mean_result_count,
			s.p50_latency_ms
		);
	}
}

/// Lists every (query, mode) where an expected path is missing from the
/// top 10. This is the list to read first after a change.
fn print_misses(report: &Report) {
	println!("\n== misses (expected path not in top {REPORT_TOP_N}) ==");
	let mut any = false;
	for q in &report.queries {
		for (mode, outcome) in &q.modes {
			match outcome.recall_at_10 {
				Some(r) if r < 1.0 => {
					any = true;
					let missing: Vec<&str> = q
						.expected
						.iter()
						.filter(|e| !outcome.paths.iter().any(|p| p == *e))
						.map(|e| e.as_str())
						.collect();
					println!("[{}] {:<8} missing {}", q.id, mode, missing.join(", "));
				}
				_ => {}
			}
		}
	}
	if !any {
		println!("none");
	}
}

fn print_comparison(baseline: &Report, current: &Report) {
	println!(
		"\n== compared with baseline {} ({}) ==",
		baseline.git_head.as_deref().unwrap_or("?"),
		baseline.generated_at
	);
	// The int8-vs-f32 recall gate is exactly this line reading `f32 -> int8`
	// with an empty regression list below.
	println!(
		"search cache: {} → {}",
		if baseline.search_cache.is_empty() { "?" } else { &baseline.search_cache },
		if current.search_cache.is_empty() { "?" } else { &current.search_cache }
	);
	println!(
		"{:<9} {:>15} {:>15} {:>15} {:>15}",
		"mode", "R@10 base→cur", "MRR base→cur", "avg_res b→c", "p50_ms b→c"
	);
	for (mode, cur) in &current.summary {
		let Some(base) = baseline.summary.get(mode) else {
			println!("{mode:<9} (not in baseline)");
			continue;
		};
		println!(
			"{:<9} {:>6}→{:<8} {:>6}→{:<8} {:>6.1}→{:<8.1} {:>6.0}→{:<8.0}",
			mode,
			fmt_opt(base.recall_at_10),
			fmt_opt(cur.recall_at_10),
			fmt_opt(base.mrr_at_10),
			fmt_opt(cur.mrr_at_10),
			base.mean_result_count,
			cur.mean_result_count,
			base.p50_latency_ms,
			cur.p50_latency_ms
		);
	}

	// Per-query regressions: an expected path that the baseline had in its
	// top 10 and the current run does not.
	println!("\n== per-query regressions (in baseline top 10, gone now) ==");
	let mut any = false;
	for cur_q in &current.queries {
		let Some(base_q) = baseline.queries.iter().find(|q| q.id == cur_q.id) else {
			continue;
		};
		for (mode, cur_o) in &cur_q.modes {
			let Some(base_o) = base_q.modes.get(mode) else { continue };
			for expected in &cur_q.expected {
				let had = base_o.paths.iter().any(|p| p == expected);
				let has = cur_o.paths.iter().any(|p| p == expected);
				if had && !has {
					any = true;
					println!("[{}] {:<8} lost {}", cur_q.id, mode, expected);
				}
			}
		}
	}
	if !any {
		println!("none");
	}
}
