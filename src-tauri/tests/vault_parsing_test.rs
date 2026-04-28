//! Phase 1.2 - `vault::parsing::extract_outgoing_links` parity tests.
//!
//! Mirrors the TS test surface for `parseWikilinks` in
//! `src/lib/features/backlinks/backlinks.logic.ts`. Every case below has
//! a corresponding TS behavior; if you change one side, change the other.
//! Phase 3.5's parity gate runs the same vectors through both extractors
//! and compares.

use kokobrain_lib::vault::entry::WikiLink;
use kokobrain_lib::vault::parsing::extract_outgoing_links;

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
