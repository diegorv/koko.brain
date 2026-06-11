//! Dedicated tests for `merge_short_sections` behavior in the markdown
//! chunker (`src/semantic/chunker.rs`), exercised through the public
//! `chunk_markdown` boundary.
//!
//! The merge step appends sections shorter than `min_chunk_chars` to the
//! previous section via `merged.last_mut().unwrap()`; the `!merged.is_empty()`
//! guard is what keeps that unwrap from panicking when the FIRST section is
//! already short. These tests pin the guard path (short first section, with
//! and without following sections) and the merge/accumulate behavior
//! (line_end extension, content concatenation) that the inline unit tests in
//! chunker.rs only hit incidentally.

use kokobrain_lib::semantic::chunker::{chunk_markdown, ChunkOptions};

/// Options with no overlap so content assertions stay deterministic.
fn options(min_chunk_chars: usize) -> ChunkOptions {
	ChunkOptions {
		min_chunk_chars,
		max_chunk_chars: 10_000,
		overlap_chars: 0,
	}
}

#[test]
fn short_first_section_followed_by_long_section_does_not_panic() {
	// First section ("# Tiny\nhi") is far below min_chunk_chars, so
	// merge_short_sections sees it with an EMPTY accumulator — the
	// `!merged.is_empty()` guard must push it instead of unwrapping a
	// non-existent previous section.
	let body = "Big section body with plenty of characters to clear the fifty char minimum easily.";
	let content = format!("# Tiny\nhi\n\n# Big Section\n{}\n", body);
	let chunks = chunk_markdown("test.md", &content, &options(50));

	// The short first section stays its own section (merge only goes
	// backward) and is then dropped at emit time for being under min.
	assert_eq!(chunks.len(), 1, "only the long section should be emitted");
	assert_eq!(chunks[0].heading.as_deref(), Some("Big Section"));
	assert!(
		!chunks[0].content.contains("Tiny"),
		"short first section must NOT be merged forward into the next section"
	);
}

#[test]
fn short_middle_section_merges_into_previous_extending_line_end() {
	let body_a = "Alpha section body with plenty of characters to clear the fifty char minimum easily.";
	let body_b = "Third section body, also long enough to clear the fifty character minimum threshold.";
	// Lines: 1 "# First", 2 body_a, 3 "", 4 "## Tiny", 5 "xyzzy", 6 "", 7 "## Third", 8 body_b
	let content = format!(
		"# First\n{}\n\n## Tiny\nxyzzy\n\n## Third\n{}\n",
		body_a, body_b
	);
	let chunks = chunk_markdown("test.md", &content, &options(50));

	assert_eq!(chunks.len(), 2, "short middle section should not be its own chunk");

	// The short "## Tiny" section merged into the previous "# First" section:
	// its lines are appended and line_end extends past the merged section.
	assert_eq!(chunks[0].heading.as_deref(), Some("First"));
	assert!(
		chunks[0].content.contains("## Tiny"),
		"merged section heading line should be inside the previous chunk"
	);
	assert!(
		chunks[0].content.contains("xyzzy"),
		"merged section body should be inside the previous chunk"
	);
	assert_eq!(chunks[0].line_start, 1);
	assert_eq!(chunks[0].line_end, 6, "line_end must extend to the merged section's end");

	// The following long section is unaffected.
	assert_eq!(chunks[1].heading.as_deref(), Some("Third"));
	assert_eq!(chunks[1].line_start, 7);
	assert!(
		!chunks[1].content.contains("xyzzy"),
		"merged content must not leak into the next chunk"
	);
}

#[test]
fn consecutive_short_sections_accumulate_into_first_section() {
	// All three sections are individually below min_chunk_chars (15).
	// The first one hits the empty-accumulator guard and gets pushed; the
	// following two each merge into it, so the accumulated section clears
	// the minimum and is emitted as ONE chunk under the first heading.
	let content = "# A\nhi\n\n# B\nyo\n\n# C\nok\n";
	let chunks = chunk_markdown("test.md", content, &options(15));

	assert_eq!(chunks.len(), 1, "all short sections should collapse into one chunk");
	assert_eq!(chunks[0].heading.as_deref(), Some("A"));
	assert!(chunks[0].content.contains("# B"), "second section merged in");
	assert!(chunks[0].content.contains("# C"), "third section merged in");
	assert_eq!(chunks[0].line_start, 1);
	assert_eq!(chunks[0].line_end, 8, "line_end must cover the last merged section");
}
