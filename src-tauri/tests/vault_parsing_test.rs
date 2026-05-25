//! Phase 1.2 - `vault::parsing::extract_outgoing_links` parity tests.
//!
//! Mirrors the TS test surface for `parseWikilinks` in
//! `src/lib/features/backlinks/backlinks.logic.ts`. Every case below has
//! a corresponding TS behavior; if you change one side, change the other.
//! Phase 3.5's parity gate runs the same vectors through both extractors
//! and compares.

use kokobrain_lib::vault::entry::WikiLink;
use kokobrain_lib::vault::parsing::{
	extract_outgoing_links, extract_tags_strict, parse_frontmatter,
};
use serde_json::{json, Value};

fn link(target: &str, alias: Option<&str>, heading: Option<&str>, position: usize) -> WikiLink {
	WikiLink {
		target: target.to_string(),
		alias: alias.map(str::to_string),
		heading: heading.map(str::to_string),
		position,
	}
}

#[test]
fn empty_content_returns_empty() {
	assert_eq!(extract_outgoing_links(""), vec![]);
}

#[test]
fn content_without_wikilinks_returns_empty() {
	assert_eq!(extract_outgoing_links("Just plain text with no links."), vec![]);
}

#[test]
fn single_plain_wikilink() {
	let result = extract_outgoing_links("[[note]]");
	assert_eq!(result, vec![link("note", None, None, 0)]);
}

#[test]
fn wikilink_with_alias() {
	let result = extract_outgoing_links("[[target|alias]]");
	assert_eq!(result, vec![link("target", Some("alias"), None, 0)]);
}

#[test]
fn wikilink_with_heading() {
	let result = extract_outgoing_links("[[target#heading]]");
	assert_eq!(result, vec![link("target", None, Some("heading"), 0)]);
}

#[test]
fn wikilink_with_block_reference() {
	// `^block-id` is a block reference; the `^` is part of the heading capture.
	let result = extract_outgoing_links("[[target#^block-id]]");
	assert_eq!(result, vec![link("target", None, Some("^block-id"), 0)]);
}

#[test]
fn wikilink_with_heading_then_alias() {
	// Pipe split runs first. Left side `target#heading` is then split on `#`.
	let result = extract_outgoing_links("[[target#heading|alias]]");
	assert_eq!(result, vec![link("target", Some("alias"), Some("heading"), 0)]);
}

#[test]
fn hash_after_pipe_stays_in_alias() {
	// Pipe split runs first; `#` after the pipe is part of the alias verbatim.
	let result = extract_outgoing_links("[[target|alias#heading]]");
	assert_eq!(result, vec![link("target", Some("alias#heading"), None, 0)]);
}

#[test]
fn second_pipe_stays_in_alias() {
	// Only the first pipe splits; subsequent pipes belong to the alias.
	let result = extract_outgoing_links("[[target|alias|extra]]");
	assert_eq!(result, vec![link("target", Some("alias|extra"), None, 0)]);
}

#[test]
fn empty_inner_does_not_match() {
	// TS regex `[^\]]+?` requires at least one inner char. `[[]]` is not a wikilink.
	assert_eq!(extract_outgoing_links("[[]]"), vec![]);
}

#[test]
fn whitespace_only_inner_matches_with_empty_target() {
	// `[[ ]]` matches; raw=' ', target after trim is empty. Mirrors TS exactly.
	let result = extract_outgoing_links("[[ ]]");
	assert_eq!(result, vec![link("", None, None, 0)]);
}

#[test]
fn target_is_trimmed_alias_and_heading_are_not() {
	// Only `target` is trimmed in the TS code; alias/heading are preserved as-is.
	let result = extract_outgoing_links("[[  target  | alias |spaced |]]");
	assert_eq!(
		result,
		vec![link("target", Some(" alias |spaced |"), None, 0)],
	);
}

#[test]
fn single_bracket_does_not_match() {
	assert_eq!(extract_outgoing_links("[note]"), vec![]);
}

#[test]
fn single_internal_bracket_breaks_match() {
	// `[[a]b]]` cannot satisfy the regex: after consuming `a`, the engine
	// needs `]]` next but sees `]b`. The next-char `b` breaks it. After
	// backtracking attempts fail, no match is produced.
	assert_eq!(extract_outgoing_links("[[a]b]]"), vec![]);
}

#[test]
fn nested_open_bracket_in_inner_is_consumed() {
	// `[[a[b]]` — inner is `a[b`, no `|` or `#`. Target='a[b' (trimmed).
	let result = extract_outgoing_links("[[a[b]]");
	assert_eq!(result, vec![link("a[b", None, None, 0)]);
}

#[test]
fn extra_closing_bracket_after_match_is_skipped() {
	// `[[a]]b]]` — first match is `a` at position 0; trailing `b]]` has no `[[`.
	let result = extract_outgoing_links("[[a]]b]]");
	assert_eq!(result, vec![link("a", None, None, 0)]);
}

#[test]
fn three_open_brackets_starts_match_at_first_pair() {
	// `[[[note]]` — `[[` at position 0; inner is `[note`. Target='[note'.
	let result = extract_outgoing_links("[[[note]]");
	assert_eq!(result, vec![link("[note", None, None, 0)]);
}

#[test]
fn adjacent_wikilinks_emit_two_entries_with_correct_positions() {
	let result = extract_outgoing_links("[[a]][[b]]");
	assert_eq!(
		result,
		vec![
			link("a", None, None, 0),
			link("b", None, None, 5),
		],
	);
}

#[test]
fn wikilink_at_end_of_content() {
	let result = extract_outgoing_links("text before [[note]]");
	assert_eq!(result, vec![link("note", None, None, 12)]);
}

#[test]
fn wikilink_at_start_followed_by_text() {
	let result = extract_outgoing_links("[[note]] more text");
	assert_eq!(result, vec![link("note", None, None, 0)]);
}

#[test]
fn position_is_byte_offset_after_multibyte_chars() {
	// `e\u{0301}` is 'e' + combining acute (3 bytes total). Following `[[`
	// starts at byte offset 3. TS produces UTF-16 code-unit offset 2 for the
	// same input; the divergence is intentional and documented in
	// `parsing.rs` (positions stay internal to Rust until Phase 2's
	// getContextSnippet port).
	let content = "e\u{0301}[[note]]";
	let result = extract_outgoing_links(content);
	assert_eq!(result, vec![link("note", None, None, 3)]);
}

#[test]
fn unmatched_open_brackets_do_not_produce_entries() {
	// `[[unclosed` runs out of content before finding `]]`.
	assert_eq!(extract_outgoing_links("[[unclosed"), vec![]);
	// `[[a` followed by EOF.
	assert_eq!(extract_outgoing_links("[[a"), vec![]);
	// `[[a]` followed by EOF (single closing bracket).
	assert_eq!(extract_outgoing_links("[[a]"), vec![]);
}

#[test]
fn wikilink_inside_frontmatter_is_included() {
	// `parseWikilinks` does NOT strip frontmatter — wikilinks declared in
	// YAML produce backlink entries in the current TS implementation.
	// Mirror enforces parity; opportunistic exclusion is deferred to a
	// future BEHAVIORAL phase.
	let content = "---\nrelated: [[other]]\n---\n# Body\n";
	let result = extract_outgoing_links(content);
	assert_eq!(result.len(), 1);
	assert_eq!(result[0].target, "other");
}

#[test]
fn wikilink_inside_fenced_code_block_is_included() {
	// Same parity rationale as the frontmatter case above.
	let content = "Some prose.\n\n```\nA wikilink in code: [[ignored-by-future-phase]]\n```\n";
	let result = extract_outgoing_links(content);
	assert_eq!(result.len(), 1);
	assert_eq!(result[0].target, "ignored-by-future-phase");
}

#[test]
fn many_wikilinks_in_document_order() {
	let content = "[[a]] body [[b#h]] more [[c|d]] end [[e#h|f]]";
	let result = extract_outgoing_links(content);
	let targets: Vec<&str> = result.iter().map(|l| l.target.as_str()).collect();
	assert_eq!(targets, vec!["a", "b", "c", "e"]);
	assert_eq!(result[1].heading.as_deref(), Some("h"));
	assert_eq!(result[2].alias.as_deref(), Some("d"));
	assert_eq!(result[3].alias.as_deref(), Some("f"));
	assert_eq!(result[3].heading.as_deref(), Some("h"));
}

#[test]
fn empty_alias_after_pipe_is_some_empty_string() {
	// TS does `alias = raw.substring(pipeIndex + 1)` which returns `""`,
	// not `null`. Mirror returns Some(String::new()) for the same input.
	let result = extract_outgoing_links("[[t|]]");
	assert_eq!(result, vec![link("t", Some(""), None, 0)]);
}

#[test]
fn empty_heading_after_hash_is_some_empty_string() {
	let result = extract_outgoing_links("[[t#]]");
	assert_eq!(result, vec![link("t", None, Some(""), 0)]);
}

// --- extract_tags_strict (Phase 1.3) ----------------------------------------
//
// Parity tests for `tags.logic.ts::extractAllTags`. The strict extractor
// coexists with `search::fts_logic::extract_tags` (the permissive variant
// kept for FTS recall); cases here lock the strict semantics so the future
// VaultIndex consumers see the same tag list the TS panels render today.

// Frontmatter cases ----------------------------------------------------------

#[test]
fn frontmatter_inline_array_is_extracted() {
	let content = "---\ntags: [foo, bar, baz]\n---\nbody";
	assert_eq!(extract_tags_strict(content), vec!["foo", "bar", "baz"]);
}

#[test]
fn frontmatter_inline_array_strips_quotes() {
	let content = "---\ntags: [\"foo\", 'bar']\n---\n";
	assert_eq!(extract_tags_strict(content), vec!["foo", "bar"]);
}

#[test]
fn frontmatter_inline_array_strips_leading_hash() {
	let content = "---\ntags: [#foo, #bar]\n---\n";
	assert_eq!(extract_tags_strict(content), vec!["foo", "bar"]);
}

#[test]
fn frontmatter_inline_array_drops_empty_entries() {
	let content = "---\ntags: [foo, ,bar]\n---\n";
	assert_eq!(extract_tags_strict(content), vec!["foo", "bar"]);
}

#[test]
fn frontmatter_inline_array_with_extra_whitespace() {
	let content = "---\ntags: [  foo ,   bar  ]\n---\n";
	assert_eq!(extract_tags_strict(content), vec!["foo", "bar"]);
}

#[test]
fn frontmatter_single_value_on_same_line() {
	let content = "---\ntags: solo\n---\n";
	assert_eq!(extract_tags_strict(content), vec!["solo"]);
}

#[test]
fn frontmatter_single_value_strips_quotes() {
	let content = "---\ntags: \"quoted\"\n---\n";
	assert_eq!(extract_tags_strict(content), vec!["quoted"]);
}

#[test]
fn frontmatter_single_value_strips_leading_hash() {
	let content = "---\ntags: \"#hash\"\n---\n";
	assert_eq!(extract_tags_strict(content), vec!["hash"]);
}

#[test]
fn frontmatter_block_array_is_extracted() {
	let content = "---\ntags:\n  - foo\n  - bar\n  - baz\n---\n";
	assert_eq!(extract_tags_strict(content), vec!["foo", "bar", "baz"]);
}

#[test]
fn frontmatter_block_array_strips_leading_hash_and_quotes() {
	let content = "---\ntags:\n  - \"#foo\"\n  - 'bar'\n  - #baz\n---\n";
	assert_eq!(extract_tags_strict(content), vec!["foo", "bar", "baz"]);
}

#[test]
fn frontmatter_block_array_skips_blank_lines_then_stops_on_other_content() {
	let content = "---\ntags:\n  - foo\n\n  - bar\nother: nope\n  - never\n---\n";
	// Blank lines between block items are tolerated; non-blank, non-list
	// lines stop the block (so `other: nope` and beyond are ignored).
	assert_eq!(extract_tags_strict(content), vec!["foo", "bar"]);
}

#[test]
fn frontmatter_empty_tags_value_returns_empty() {
	let content = "---\ntags:\n---\n";
	assert_eq!(extract_tags_strict(content), Vec::<String>::new());
}

#[test]
fn frontmatter_no_tags_key_returns_empty() {
	let content = "---\nstatus: draft\nauthor: me\n---\n";
	assert_eq!(extract_tags_strict(content), Vec::<String>::new());
}

#[test]
fn no_frontmatter_at_all_returns_empty_from_frontmatter_path() {
	let content = "no frontmatter here\nbody only\n";
	assert_eq!(extract_tags_strict(content), Vec::<String>::new());
}

#[test]
fn frontmatter_skips_tags_inside_multiline_quoted_scalar() {
	// The `tags` line is INSIDE a multi-line double-quoted value of `desc`.
	// findTopLevelKey must skip those lines until the closing quote and
	// then continue, so the real `tags:` key further down is selected.
	let content = "---\ndesc: \"this is\nmulti-line\nwith tags: [fake1, fake2]\nstill quoted\"\ntags: [real]\n---\n";
	assert_eq!(extract_tags_strict(content), vec!["real"]);
}

// Inline cases ---------------------------------------------------------------

#[test]
fn inline_tag_after_space() {
	assert_eq!(extract_tags_strict("text #foo more"), vec!["foo"]);
}

#[test]
fn inline_tag_after_newline() {
	assert_eq!(extract_tags_strict("text\n#foo"), vec!["foo"]);
}

#[test]
fn inline_tag_at_start_of_content() {
	assert_eq!(extract_tags_strict("#foo"), vec!["foo"]);
}

#[test]
fn inline_tag_with_path_segments() {
	assert_eq!(extract_tags_strict("#area/sub/leaf"), vec!["area/sub/leaf"]);
}

#[test]
fn inline_tag_with_dashes_and_underscores() {
	assert_eq!(
		extract_tags_strict("#a-b #c_d #e-f_g/h"),
		vec!["a-b", "c_d", "e-f_g/h"],
	);
}

#[test]
fn inline_tag_strips_single_trailing_slash() {
	assert_eq!(extract_tags_strict("#topic/"), vec!["topic"]);
}

#[test]
fn inline_tag_strips_multiple_trailing_slashes() {
	assert_eq!(extract_tags_strict("#topic///"), vec!["topic"]);
}

#[test]
fn inline_tag_digit_first_is_rejected() {
	assert_eq!(extract_tags_strict("text #1foo"), Vec::<String>::new());
}

#[test]
fn inline_tag_in_word_is_rejected() {
	assert_eq!(extract_tags_strict("foo#bar"), Vec::<String>::new());
}

#[test]
fn inline_tag_terminates_at_punctuation() {
	assert_eq!(extract_tags_strict("hi #foo!"), vec!["foo"]);
	assert_eq!(extract_tags_strict("hi #foo, bar"), vec!["foo"]);
	assert_eq!(extract_tags_strict("(#foo)"), Vec::<String>::new());
	// '(' is not whitespace, so the preceding-char gate rejects this.
}

#[test]
fn inline_tag_inside_fenced_code_is_excluded() {
	let content = "before\n```\n#code-tag\n```\nafter #real";
	assert_eq!(extract_tags_strict(content), vec!["real"]);
}

#[test]
fn inline_tag_inside_inline_code_is_excluded() {
	assert_eq!(extract_tags_strict("text `#fake` then #real"), vec!["real"]);
}

#[test]
fn inline_tag_inside_html_comment_is_excluded() {
	assert_eq!(
		extract_tags_strict("body <!-- #commented --> then #real"),
		vec!["real"],
	);
}

#[test]
fn inline_tag_dedup_is_case_sensitive_within_inline() {
	// extractInlineTags dedupes via Set on raw bytes (case-sensitive). The
	// case-insensitive dedup happens later in extractAllTags merging.
	// Within inline only, `#Foo` and `#foo` would both survive — but the
	// merge step then folds them. Net result: first occurrence wins.
	assert_eq!(extract_tags_strict("#Foo #foo"), vec!["Foo"]);
}

#[test]
fn inline_tag_unicode_letters_are_supported() {
	// `\p{L}` matches Unicode letters; `é`, `ü`, CJK chars all qualify.
	assert_eq!(
		extract_tags_strict("note #café about #日本語/learning"),
		vec!["café", "日本語/learning"],
	);
}

// Combined frontmatter + inline ---------------------------------------------

#[test]
fn frontmatter_and_inline_tags_are_merged_in_order() {
	let content = "---\ntags: [a, b]\n---\nbody #c #d";
	assert_eq!(extract_tags_strict(content), vec!["a", "b", "c", "d"]);
}

#[test]
fn case_insensitive_dedup_keeps_first_occurrence_casing() {
	// Frontmatter wins because it appears first in the merge order.
	let content = "---\ntags: [Project]\n---\nbody #project #PROJECT";
	assert_eq!(extract_tags_strict(content), vec!["Project"]);
}

#[test]
fn realistic_document_extraction() {
	let content = "---\ntitle: Example\ntags:\n  - work\n  - alpha\n  - \"#beta\"\n---\n# Heading\n\nThis note covers #work topics and #area/sub/leaf navigation.\n\n```\n#code-snippet ignored\n```\n\nInline `#also-ignored` and a real #note tag.\n\n<!-- #commented-out -->\n";
	let tags = extract_tags_strict(content);
	// Expected order: frontmatter first (work, alpha, beta), then inline
	// merged dedup-ed (work already present, area/sub/leaf, note).
	assert_eq!(tags, vec!["work", "alpha", "beta", "area/sub/leaf", "note"]);
}

// --- parse_frontmatter (Phase 1.4) ------------------------------------------
//
// The Rust parser is intentionally a SUBSET of YAML (see the module
// comment in `parsing.rs`). These tests pin both:
//   1. the supported subset (scalars, inline arrays, block arrays, nested
//      maps as null), and
//   2. the deliberate divergences from the TS `yaml` library (no comment
//      stripping, quoted keys not unquoted, no block scalar `|`/`>`,
//      no anchors/references). Phase 8 (Properties migration) is the
//      natural place to revisit if the gaps bite real notes.

fn fm_int(n: i64) -> Value {
	json!(n)
}

#[test]
fn parse_no_frontmatter_returns_empty_map() {
	assert!(parse_frontmatter("just body, no fm\n").is_empty());
	assert!(parse_frontmatter("").is_empty());
}

#[test]
fn parse_empty_frontmatter_returns_empty_map() {
	assert!(parse_frontmatter("---\n---\n").is_empty());
	// Single blank line between delimiters is also empty.
	assert!(parse_frontmatter("---\n\n---\n").is_empty());
}

#[test]
fn parse_bare_string_scalar() {
	let m = parse_frontmatter("---\nkey: hello\n---\n");
	assert_eq!(m.get("key"), Some(&Value::String("hello".to_string())));
}

#[test]
fn parse_double_and_single_quoted_strings() {
	let m = parse_frontmatter("---\na: \"double\"\nb: 'single'\n---\n");
	assert_eq!(m.get("a"), Some(&Value::String("double".to_string())));
	assert_eq!(m.get("b"), Some(&Value::String("single".to_string())));
}

#[test]
fn parse_quoted_empty_string() {
	let m = parse_frontmatter("---\nkey: \"\"\n---\n");
	assert_eq!(m.get("key"), Some(&Value::String(String::new())));
}

#[test]
fn parse_integer_and_negative_integer() {
	let m = parse_frontmatter("---\npos: 42\nneg: -5\n---\n");
	assert_eq!(m.get("pos"), Some(&fm_int(42)));
	assert_eq!(m.get("neg"), Some(&fm_int(-5)));
}

#[test]
fn parse_float() {
	let m = parse_frontmatter("---\npi: 3.14\n---\n");
	assert_eq!(m.get("pi"), Some(&json!(3.14)));
}

#[test]
fn parse_boolean_variants() {
	let m = parse_frontmatter("---\na: true\nb: True\nc: TRUE\nd: false\ne: False\nf: FALSE\n---\n");
	assert_eq!(m.get("a"), Some(&Value::Bool(true)));
	assert_eq!(m.get("b"), Some(&Value::Bool(true)));
	assert_eq!(m.get("c"), Some(&Value::Bool(true)));
	assert_eq!(m.get("d"), Some(&Value::Bool(false)));
	assert_eq!(m.get("e"), Some(&Value::Bool(false)));
	assert_eq!(m.get("f"), Some(&Value::Bool(false)));
}

#[test]
fn parse_null_variants() {
	let m = parse_frontmatter("---\na: null\nb: Null\nc: NULL\nd: ~\ne:\n---\n");
	assert_eq!(m.get("a"), Some(&Value::Null));
	assert_eq!(m.get("b"), Some(&Value::Null));
	assert_eq!(m.get("c"), Some(&Value::Null));
	assert_eq!(m.get("d"), Some(&Value::Null));
	assert_eq!(m.get("e"), Some(&Value::Null));
}

#[test]
fn parse_quoted_string_that_looks_like_number_stays_string() {
	let m = parse_frontmatter("---\nkey: \"42\"\n---\n");
	assert_eq!(m.get("key"), Some(&Value::String("42".to_string())));
}

#[test]
fn parse_iso_date_remains_a_string_at_parser_layer() {
	// The TS parseFrontmatterProperties detects ISO dates and assigns the
	// `date` property type, but the YAML parsing step itself keeps the
	// raw string. Our Rust parser stops at the YAML layer; date detection
	// happens at the consumer.
	let m = parse_frontmatter("---\nstart: 2026-04-28\n---\n");
	assert_eq!(m.get("start"), Some(&Value::String("2026-04-28".to_string())));
}

#[test]
fn parse_inline_array_of_strings() {
	let m = parse_frontmatter("---\ntags: [foo, bar, baz]\n---\n");
	assert_eq!(m.get("tags"), Some(&json!(["foo", "bar", "baz"])));
}

#[test]
fn parse_inline_array_mixed_types() {
	let m = parse_frontmatter("---\nmixed: [1, \"two\", true, null, 3.5]\n---\n");
	assert_eq!(m.get("mixed"), Some(&json!([1, "two", true, null, 3.5])));
}

#[test]
fn parse_inline_array_drops_stray_commas() {
	let m = parse_frontmatter("---\ntags: [a, , b]\n---\n");
	assert_eq!(m.get("tags"), Some(&json!(["a", "b"])));
}

#[test]
fn parse_inline_array_preserves_quoted_empty_string() {
	// A bare empty slot is a stray comma (dropped); a quoted empty `""`
	// is intentional and survives.
	let m = parse_frontmatter("---\nslots: [a, \"\", b]\n---\n");
	assert_eq!(m.get("slots"), Some(&json!(["a", "", "b"])));
}

#[test]
fn parse_inline_array_unclosed_bracket_lenient() {
	let m = parse_frontmatter("---\ntags: [a, b\n---\n");
	assert_eq!(m.get("tags"), Some(&json!(["a", "b"])));
}

#[test]
fn parse_empty_inline_array() {
	let m = parse_frontmatter("---\nempty: []\n---\n");
	assert_eq!(m.get("empty"), Some(&json!([])));
}

#[test]
fn parse_block_array_of_strings() {
	let content = "---\ntags:\n  - foo\n  - bar\n  - baz\n---\n";
	let m = parse_frontmatter(content);
	assert_eq!(m.get("tags"), Some(&json!(["foo", "bar", "baz"])));
}

#[test]
fn parse_block_array_with_quoted_items() {
	let content = "---\ntags:\n  - \"foo\"\n  - 'bar'\n---\n";
	let m = parse_frontmatter(content);
	assert_eq!(m.get("tags"), Some(&json!(["foo", "bar"])));
}

#[test]
fn parse_block_array_lone_dash_is_null_item() {
	let content = "---\nitems:\n  - first\n  -\n  - third\n---\n";
	let m = parse_frontmatter(content);
	assert_eq!(m.get("items"), Some(&json!(["first", null, "third"])));
}

#[test]
fn parse_block_array_with_4_space_indent() {
	let content = "---\ntags:\n    - foo\n    - bar\n---\n";
	let m = parse_frontmatter(content);
	assert_eq!(m.get("tags"), Some(&json!(["foo", "bar"])));
}

#[test]
fn parse_block_array_terminates_when_indent_decreases() {
	// Once a less-indented line appears, the block ends and the next key
	// is a new top-level key.
	let content = "---\ntags:\n  - foo\nnext: hello\n  - skipped\n---\n";
	let m = parse_frontmatter(content);
	assert_eq!(m.get("tags"), Some(&json!(["foo"])));
	assert_eq!(m.get("next"), Some(&Value::String("hello".to_string())));
}

#[test]
fn parse_nested_map_records_parent_as_null_and_preserves_sibling() {
	// The plan calls for nested maps to land as JSON null entries in the
	// top-level map so consumers can detect key presence without forcing
	// arbitrary depth here. Sibling keys after the nested block must
	// continue to parse normally.
	let content = "---\nparent:\n  child1: value1\n  child2: value2\nsibling: hello\n---\n";
	let m = parse_frontmatter(content);
	assert_eq!(m.get("parent"), Some(&Value::Null));
	assert_eq!(m.get("sibling"), Some(&Value::String("hello".to_string())));
}

#[test]
fn parse_deeply_nested_map_preserves_top_level_siblings() {
	let content = "---\nroot:\n  level1:\n    level2: deep\n    other: thing\nafter: yes\n---\n";
	let m = parse_frontmatter(content);
	assert_eq!(m.get("root"), Some(&Value::Null));
	assert_eq!(m.get("after"), Some(&Value::String("yes".to_string())));
}

#[test]
fn parse_multiple_top_level_keys() {
	let content = "---\ntitle: Example\nauthor: me\ncount: 7\ndraft: true\n---\n";
	let m = parse_frontmatter(content);
	assert_eq!(m.get("title"), Some(&Value::String("Example".to_string())));
	assert_eq!(m.get("author"), Some(&Value::String("me".to_string())));
	assert_eq!(m.get("count"), Some(&fm_int(7)));
	assert_eq!(m.get("draft"), Some(&Value::Bool(true)));
}

#[test]
fn parse_blank_lines_between_keys_are_skipped() {
	let content = "---\na: 1\n\n\nb: 2\n---\n";
	let m = parse_frontmatter(content);
	assert_eq!(m.get("a"), Some(&fm_int(1)));
	assert_eq!(m.get("b"), Some(&fm_int(2)));
}

#[test]
fn parse_malformed_line_without_colon_is_skipped() {
	let content = "---\nvalid: yes\nthis is not valid yaml\nanother: ok\n---\n";
	let m = parse_frontmatter(content);
	assert_eq!(m.get("valid"), Some(&Value::String("yes".to_string())));
	assert_eq!(m.get("another"), Some(&Value::String("ok".to_string())));
	assert_eq!(m.len(), 2);
}

#[test]
fn parse_line_with_empty_key_is_skipped() {
	let content = "---\n: orphan value\nreal: ok\n---\n";
	let m = parse_frontmatter(content);
	assert_eq!(m.get("real"), Some(&Value::String("ok".to_string())));
	assert_eq!(m.len(), 1);
}

#[test]
fn parse_value_is_trimmed_of_outer_whitespace() {
	let content = "---\nkey:    value with internal spaces   \n---\n";
	let m = parse_frontmatter(content);
	assert_eq!(
		m.get("key"),
		Some(&Value::String("value with internal spaces".to_string())),
	);
}

#[test]
fn parse_duplicate_keys_last_value_wins() {
	// BTreeMap semantics: the last `insert` for a given key wins. This
	// matches the TS `yaml` library's `uniqueKeys: false` option used in
	// `parseFrontmatterProperties`.
	let content = "---\nkey: first\nkey: second\nkey: third\n---\n";
	let m = parse_frontmatter(content);
	assert_eq!(m.get("key"), Some(&Value::String("third".to_string())));
	assert_eq!(m.len(), 1);
}

#[test]
fn parse_handles_crlf_line_endings() {
	let content = "---\r\ntitle: Example\r\ncount: 3\r\n---\r\n";
	let m = parse_frontmatter(content);
	assert_eq!(m.get("title"), Some(&Value::String("Example".to_string())));
	assert_eq!(m.get("count"), Some(&fm_int(3)));
}

#[test]
fn parse_frontmatter_without_trailing_newline_is_recognised() {
	// `---\nkey: v\n---trailing` — the JS regex `/^---\r?\n([\s\S]*?)\r?\n---/`
	// does not require any specific char after the closing `---`. Our
	// frontmatter_range mirrors that behavior; trailing junk on the close
	// line stays in the body.
	let content = "---\nkey: v\n---trailing";
	let m = parse_frontmatter(content);
	assert_eq!(m.get("key"), Some(&Value::String("v".to_string())));
}

#[test]
fn parse_comments_after_value_are_kept_as_part_of_string() {
	// Documented divergence: the TS `yaml` library strips `#`-comments;
	// the Rust minimal parser does not. The whole right-hand side becomes
	// the string. Phase 8 may revisit if real notes hit this.
	let content = "---\nkey: value # not a comment in this parser\n---\n";
	let m = parse_frontmatter(content);
	assert_eq!(
		m.get("key"),
		Some(&Value::String(
			"value # not a comment in this parser".to_string()
		)),
	);
}

#[test]
fn parse_realistic_note_frontmatter() {
	let content = "---\ntitle: \"Q2 Review\"\ndate: 2026-04-28\nauthor: me\ntags: [work, draft, q2]\nchecklist:\n  - kickoff\n  - midway\n  - retro\nfeatured: true\nrating: 4.5\nrelated:\n  parent: somewhere\n  child: deep\n---\n# Body\n";
	let m = parse_frontmatter(content);
	assert_eq!(m.get("title"), Some(&Value::String("Q2 Review".to_string())));
	assert_eq!(m.get("date"), Some(&Value::String("2026-04-28".to_string())));
	assert_eq!(m.get("author"), Some(&Value::String("me".to_string())));
	assert_eq!(m.get("tags"), Some(&json!(["work", "draft", "q2"])));
	assert_eq!(
		m.get("checklist"),
		Some(&json!(["kickoff", "midway", "retro"])),
	);
	assert_eq!(m.get("featured"), Some(&Value::Bool(true)));
	assert_eq!(m.get("rating"), Some(&json!(4.5)));
	assert_eq!(m.get("related"), Some(&Value::Null)); // nested -> null
}

// --- Phase 6.2 helpers: strip_non_body_content + find_plain_text_mention_positions ---

use kokobrain_lib::vault::parsing::{
	find_plain_text_mention_positions, is_word_boundary_char, strip_non_body_content,
};

#[test]
fn strip_non_body_replaces_frontmatter_with_spaces_preserving_length() {
	let input = "---\ntitle: x\n---\nbody";
	let stripped = strip_non_body_content(input);
	assert_eq!(stripped.len(), input.len());
	// Frontmatter range is all spaces; body is preserved verbatim.
	assert!(stripped.starts_with("                "));
	assert!(stripped.ends_with("body"));
}

#[test]
fn strip_non_body_replaces_fenced_code_blocks_with_spaces() {
	let input = "before\n```\ncode\n```\nafter";
	let stripped = strip_non_body_content(input);
	assert_eq!(stripped.len(), input.len());
	assert!(stripped.starts_with("before\n"));
	assert!(stripped.ends_with("\nafter"));
	assert!(stripped.contains("            ")); // many spaces in the fence range
}

#[test]
fn strip_non_body_handles_multiple_fences() {
	let input = "a\n```\nA\n```\nb\n```\nB\n```\nc";
	let stripped = strip_non_body_content(input);
	assert_eq!(stripped.len(), input.len());
	// b between fences is preserved
	let mid = stripped.find('b').unwrap();
	assert_eq!(input.as_bytes()[mid], b'b');
}

#[test]
fn strip_non_body_unclosed_fence_is_left_intact() {
	let input = "before\n```\nunclosed code";
	let stripped = strip_non_body_content(input);
	// JS regex non-greedy with no closer => no match => no replacement.
	assert_eq!(stripped, input);
}

#[test]
fn strip_non_body_no_frontmatter_no_fences_is_identity() {
	let input = "Plain prose with [[wikilink]] and *italic* text.";
	let stripped = strip_non_body_content(input);
	assert_eq!(stripped, input);
}

#[test]
fn strip_non_body_preserves_byte_positions_of_body() {
	let input = "---\nfm: 1\n---\nLine A with X\n```\nIGNORED\n```\nLine B with X";
	let stripped = strip_non_body_content(input);
	// Both 'X's should be at the same byte offsets in the stripped output.
	let original_xs: Vec<usize> = input
		.bytes()
		.enumerate()
		.filter(|(_, b)| *b == b'X')
		.map(|(i, _)| i)
		.collect();
	let stripped_xs: Vec<usize> = stripped
		.bytes()
		.enumerate()
		.filter(|(_, b)| *b == b'X')
		.map(|(i, _)| i)
		.collect();
	assert_eq!(original_xs.len(), 2);
	assert_eq!(original_xs, stripped_xs);
}

#[test]
fn is_word_boundary_char_covers_ascii_whitespace_and_punctuation() {
	for c in [' ', '\t', '\n', '.', ',', '!', '?', '(', ')', '"', '\''] {
		assert!(is_word_boundary_char(c), "expected boundary: {:?}", c);
	}
	for c in ['a', 'Z', '0', 'é', '_'] {
		// `_` is ASCII punctuation in TS \p{P}
		if c == '_' {
			assert!(is_word_boundary_char(c));
		} else {
			assert!(!is_word_boundary_char(c), "expected non-boundary: {:?}", c);
		}
	}
}

#[test]
fn is_word_boundary_char_covers_common_unicode_punct() {
	for c in [
		'\u{00AB}', // «
		'\u{00BB}', // »
		'\u{201C}', // left double quote
		'\u{201D}', // right double quote
		'\u{2018}', // left single quote
		'\u{2019}', // right single quote
		'\u{2014}', // em dash
		'\u{2013}', // en dash
		'\u{2026}', // ellipsis
		'\u{00B7}', // middle dot
	] {
		assert!(is_word_boundary_char(c), "expected boundary: U+{:04X}", c as u32);
	}
}

#[test]
fn find_plain_text_mention_returns_empty_when_no_match() {
	let content = "no relevant words here";
	let stripped_lower = strip_non_body_content(content).to_lowercase();
	assert!(find_plain_text_mention_positions(content, &stripped_lower, "Note A").is_empty());
}

#[test]
fn find_plain_text_mention_returns_word_boundary_position() {
	let content = "See Note A in the docs.";
	let stripped_lower = strip_non_body_content(content).to_lowercase();
	let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
	assert_eq!(positions, vec![4]);
}

#[test]
fn find_plain_text_mention_excludes_in_word_match() {
	let content = "Annotation X has noteAfoo inside.";
	let stripped_lower = strip_non_body_content(content).to_lowercase();
	let positions = find_plain_text_mention_positions(content, &stripped_lower, "noteA");
	// 'noteA' is followed by 'foo' (alphanumeric, not a boundary) — rejected.
	assert!(positions.is_empty());
}

#[test]
fn find_plain_text_mention_excludes_match_inside_wikilink() {
	let content = "Click [[Note A]] here";
	let stripped_lower = strip_non_body_content(content).to_lowercase();
	let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
	assert!(positions.is_empty());
}

#[test]
fn find_plain_text_mention_finds_outside_wikilink_on_same_line() {
	let content = "[[Note B]] mentions Note A explicitly";
	let stripped_lower = strip_non_body_content(content).to_lowercase();
	let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
	assert_eq!(positions.len(), 1);
}

#[test]
fn find_plain_text_mention_handles_multiple_matches_same_line() {
	let content = "Note A and Note A again, plus Note A at the end";
	let stripped_lower = strip_non_body_content(content).to_lowercase();
	let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
	assert_eq!(positions.len(), 3);
}

#[test]
fn find_plain_text_mention_skips_matches_in_fenced_code_blocks() {
	let content = "Note A here\n```\nNote A in code\n```\nNote A again";
	let stripped_lower = strip_non_body_content(content).to_lowercase();
	let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
	// Two matches: the first and the last; the one in the fence is gone after strip.
	assert_eq!(positions.len(), 2);
}

#[test]
fn find_plain_text_mention_skips_matches_in_frontmatter() {
	let content = "---\nrelated: Note A\n---\nNote A in body";
	let stripped_lower = strip_non_body_content(content).to_lowercase();
	let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
	assert_eq!(positions.len(), 1);
}

#[test]
fn find_plain_text_mention_at_start_of_content() {
	let content = "Note A starts the file";
	let stripped_lower = strip_non_body_content(content).to_lowercase();
	let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
	assert_eq!(positions, vec![0]);
}

#[test]
fn find_plain_text_mention_at_end_of_content() {
	let content = "Ends with Note A";
	let stripped_lower = strip_non_body_content(content).to_lowercase();
	let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
	assert_eq!(positions, vec!["Ends with ".len()]);
}

#[test]
fn find_plain_text_mention_case_insensitive() {
	let content = "Click NOTE A or note a in upper or lower";
	let stripped_lower = strip_non_body_content(content).to_lowercase();
	let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
	assert_eq!(positions.len(), 2);
}

#[test]
fn find_plain_text_mention_does_not_panic_when_lowercase_shifts_bytes_into_multibyte_char() {
	// İ (U+0130, 2 bytes UTF-8) lowercases to "i" + U+0307 combining dot
	// above (1 + 2 = 3 bytes), so every İ in `content` makes subsequent
	// byte positions in `stripped_lower` lag `content` by +1. When the
	// search term's match position in `stripped_lower` corresponds to a
	// byte inside a multi-byte codepoint in `content` (e.g. the 4-byte 🔴),
	// the previous implementation panicked on `char_before_byte`'s
	// `content[..idx]` slice with "is not a char boundary; it is inside
	// '🔴'". Regression for that crash: the function must not panic and
	// instead skips the unsafe match.
	let content = "İ🔴abc";
	let stripped_lower = strip_non_body_content(content).to_lowercase();
	let positions = find_plain_text_mention_positions(content, &stripped_lower, "🔴abc");
	// Match's idx in stripped_lower lands inside the emoji's bytes in
	// content, so the match is dropped — no positions, no panic.
	assert!(positions.is_empty());
}

#[test]
fn find_plain_text_mention_still_finds_match_before_lowercase_byte_shift() {
	// Sanity check that the panic-guard didn't break the happy path: a
	// match BEFORE the case-shifting char is still returned even though
	// the document also contains an İ later on.
	let content = "Note A starts here. İ later in the file.";
	let stripped_lower = strip_non_body_content(content).to_lowercase();
	let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
	assert_eq!(positions, vec![0]);
}

// --- Frontmatter alias normalization -----------------------------------------

#[test]
fn parse_frontmatter_normalizes_is_a_to_type() {
	let content = "---\nis_a: person\ntitle: Bob\n---\n";
	let fm = parse_frontmatter(content);
	assert_eq!(fm.get("type"), Some(&json!("person")));
	assert!(fm.get("is_a").is_none());
}

#[test]
fn parse_frontmatter_normalizes_space_aliases() {
	let content = "---\nis a: place\nbelongs to: geography\nrelated to: maps\n---\n";
	let fm = parse_frontmatter(content);
	assert_eq!(fm.get("type"), Some(&json!("place")));
	assert_eq!(fm.get("belongs_to"), Some(&json!("geography")));
	assert_eq!(fm.get("related_to"), Some(&json!("maps")));
}

#[test]
fn parse_frontmatter_normalizes_system_underscore_keys() {
	let content = "---\nicon: rocket\nfavorite: true\norder: 5\ncolor: red\n---\n";
	let fm = parse_frontmatter(content);
	assert_eq!(fm.get("_icon"), Some(&json!("rocket")));
	assert_eq!(fm.get("_favorite"), Some(&json!(true)));
	assert_eq!(fm.get("_order"), Some(&json!(5)));
	assert_eq!(fm.get("_color"), Some(&json!("red")));
	assert!(fm.get("icon").is_none());
}

#[test]
fn parse_frontmatter_normalizes_sidebar_label_variants() {
	let content = "---\nsidebar_label: Notes\n---\n";
	let fm = parse_frontmatter(content);
	assert_eq!(fm.get("_sidebar_label"), Some(&json!("Notes")));
	assert!(fm.get("sidebar_label").is_none());

	let content2 = "---\nsidebar label: Docs\n---\n";
	let fm2 = parse_frontmatter(content2);
	assert_eq!(fm2.get("_sidebar_label"), Some(&json!("Docs")));
}

#[test]
fn parse_frontmatter_leaves_unknown_keys_unchanged() {
	let content = "---\ntitle: Hello\ntags: [a, b]\n---\n";
	let fm = parse_frontmatter(content);
	assert_eq!(fm.get("title"), Some(&json!("Hello")));
	assert_eq!(fm.get("tags"), Some(&json!(["a", "b"])));
}

#[test]
fn parse_frontmatter_leaves_canonical_keys_unchanged() {
	let content = "---\n_icon: star\ntype: note\n_organized: true\n---\n";
	let fm = parse_frontmatter(content);
	assert_eq!(fm.get("_icon"), Some(&json!("star")));
	assert_eq!(fm.get("type"), Some(&json!("note")));
	assert_eq!(fm.get("_organized"), Some(&json!(true)));
}
