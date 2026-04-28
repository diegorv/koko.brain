//! Phase 1.2 - `vault::parsing::extract_outgoing_links` parity tests.
//!
//! Mirrors the TS test surface for `parseWikilinks` in
//! `src/lib/features/backlinks/backlinks.logic.ts`. Every case below has
//! a corresponding TS behavior; if you change one side, change the other.
//! Phase 3.5's parity gate runs the same vectors through both extractors
//! and compares.

use kokobrain_lib::vault::entry::WikiLink;
use kokobrain_lib::vault::parsing::{extract_outgoing_links, extract_tags_strict};

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
