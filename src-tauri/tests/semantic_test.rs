use kokobrain_lib::semantic::chunker::{chunk_markdown, ChunkOptions};
use kokobrain_lib::semantic::embedder::cosine_similarity;

// --- Chunker Tests ---

fn default_options() -> ChunkOptions {
	ChunkOptions {
		min_chunk_chars: 50,
		max_chunk_chars: 10_000,
		overlap_lines: 2,
	}
}

#[test]
fn chunk_single_heading() {
	let content = "# Hello World\n\nThis is a test document with enough content to meet the minimum chunk size requirement.\n";
	let chunks = chunk_markdown("test.md", content, &default_options());
	assert_eq!(chunks.len(), 1, "should produce one chunk");
	assert_eq!(chunks[0].heading.as_deref(), Some("Hello World"));
	assert_eq!(chunks[0].source_path, "test.md");
}

#[test]
fn chunk_multiple_headings() {
	let content = "# First Section\n\nThis is the first section with enough content to be a valid chunk in the chunking system.\n\n## Second Section\n\nThis is the second section with enough content to be a valid chunk in the chunking system.\n\n## Third Section\n\nThis is the third section with enough content to be a valid chunk in the chunking system.\n";
	let chunks = chunk_markdown("test.md", content, &default_options());
	assert_eq!(chunks.len(), 3, "should produce three chunks");
	assert_eq!(chunks[0].heading.as_deref(), Some("First Section"));
	assert_eq!(chunks[1].heading.as_deref(), Some("Second Section"));
	assert_eq!(chunks[2].heading.as_deref(), Some("Third Section"));
}

#[test]
fn chunk_no_headings() {
	let content = "This is a document without any headings but with enough content to meet the minimum chunk size.\n\nIt has multiple paragraphs of content.\n";
	let chunks = chunk_markdown("test.md", content, &default_options());
	assert_eq!(chunks.len(), 1, "should produce one chunk for entire file");
	assert!(chunks[0].heading.is_none(), "heading should be None");
}

#[test]
fn chunk_below_min_chars() {
	let content = "# Short\n\nToo short.\n";
	let chunks = chunk_markdown("test.md", content, &default_options());
	assert!(chunks.is_empty(), "chunks below min_chunk_chars should be skipped");
}

#[test]
fn chunk_above_max_chars() {
	let long_content = format!(
		"# Big Section\n\n{}",
		"A".repeat(15_000)
	);
	let options = ChunkOptions {
		min_chunk_chars: 50,
		max_chunk_chars: 10_000,
		overlap_lines: 2,
	};
	let chunks = chunk_markdown("test.md", &long_content, &options);
	assert_eq!(chunks.len(), 1, "should still produce one chunk");
	assert!(
		chunks[0].content.len() <= 10_000,
		"chunk content should be truncated to max_chunk_chars"
	);
}

#[test]
fn chunk_strips_frontmatter() {
	let content = "---\ntitle: Test\ntags:\n  - hello\n---\n# Main Content\n\nThis is the main content of the document with enough text to meet the minimum requirement.\n";
	let chunks = chunk_markdown("test.md", content, &default_options());
	assert!(!chunks.is_empty(), "should produce chunks");
	for chunk in &chunks {
		assert!(
			!chunk.content.contains("title: Test"),
			"frontmatter should be stripped"
		);
	}
}

#[test]
fn chunk_tracks_line_numbers() {
	let content = "# First\n\nThis is the first section with enough content to be a valid chunk that meets the minimum requirement.\n\n## Second\n\nThis is the second section with enough content to be a valid chunk that meets the minimum requirement.\n";
	let chunks = chunk_markdown("test.md", content, &default_options());
	assert!(chunks.len() >= 2, "should have at least 2 chunks");
	assert_eq!(chunks[0].line_start, 1, "first chunk starts at line 1");
	assert!(
		chunks[1].line_start > chunks[0].line_start,
		"second chunk starts after first"
	);
}

#[test]
fn chunk_empty_file() {
	let chunks = chunk_markdown("test.md", "", &default_options());
	assert!(chunks.is_empty(), "empty file should produce no chunks");
}

#[test]
fn chunk_content_hash_consistent() {
	let content = "# Test\n\nThis is a test document with enough content to meet the minimum chunk size requirement for hashing.\n";
	let chunks1 = chunk_markdown("test.md", content, &default_options());
	let chunks2 = chunk_markdown("test.md", content, &default_options());
	assert_eq!(
		chunks1[0].content_hash, chunks2[0].content_hash,
		"same content should produce same hash"
	);
}

#[test]
fn chunk_content_hash_changes_with_content() {
	let content1 = "# Test\n\nThis is content version one with enough text to meet the minimum chunk size requirement.\n";
	let content2 = "# Test\n\nThis is content version two with enough text to meet the minimum chunk size requirement.\n";
	let chunks1 = chunk_markdown("test.md", content1, &default_options());
	let chunks2 = chunk_markdown("test.md", content2, &default_options());
	assert_ne!(
		chunks1[0].content_hash, chunks2[0].content_hash,
		"different content should produce different hash"
	);
}

// --- Non-ASCII Heading Extraction ---

#[test]
fn chunk_heading_with_emoji() {
	let content = "# 🎉 Party\n\nThis is a celebration note with enough content to meet the minimum chunk size requirement.\n";
	let chunks = chunk_markdown("test.md", content, &default_options());
	assert_eq!(chunks.len(), 1);
	assert_eq!(chunks[0].heading.as_deref(), Some("🎉 Party"));
}

#[test]
fn chunk_heading_with_accented_chars() {
	let content = "## café notes\n\nThese are notes about a café visit with enough content to meet the minimum chunk size requirement.\n";
	let chunks = chunk_markdown("test.md", content, &default_options());
	assert_eq!(chunks.len(), 1);
	assert_eq!(chunks[0].heading.as_deref(), Some("café notes"));
}

#[test]
fn chunk_heading_with_cjk() {
	let content = "### 見出し\n\nこれは日本語のテスト文書で、最小チャンクサイズの要件を満たすのに十分なコンテンツがあります。\n";
	let chunks = chunk_markdown("test.md", content, &default_options());
	assert_eq!(chunks.len(), 1);
	assert_eq!(chunks[0].heading.as_deref(), Some("見出し"));
}

// --- Code Block Stripping ---

#[test]
fn chunk_strips_code_blocks() {
	let content = "# Guide\n\nHere is some prose that should remain in the chunk content after processing.\n\n```rust\nfn main() {\n    println!(\"this should be stripped\");\n}\n```\n\nMore prose after the code block that should also remain in the output.\n";
	let chunks = chunk_markdown("test.md", content, &default_options());
	assert!(!chunks.is_empty(), "should produce chunks");
	assert!(
		!chunks[0].content.contains("println!"),
		"code block content should be stripped"
	);
	assert!(
		chunks[0].content.contains("prose that should remain"),
		"prose before code block should remain"
	);
	assert!(
		chunks[0].content.contains("More prose after"),
		"prose after code block should remain"
	);
}

// --- Overlap ---

#[test]
fn chunk_overlap_includes_previous_lines() {
	let section1 = "This is the first section with enough content to be a valid chunk.\nLine two of first section.\nLine three of first section.";
	let section2 = "This is the second section with enough content to be a valid chunk.\nSecond section continues here.";
	let content = format!("# First\n\n{}\n\n## Second\n\n{}\n", section1, section2);

	let options = ChunkOptions {
		min_chunk_chars: 10,
		max_chunk_chars: 10_000,
		overlap_lines: 2,
	};
	let chunks = chunk_markdown("test.md", &content, &options);
	assert!(chunks.len() >= 2, "should have at least 2 chunks");
	// Second chunk should contain overlap lines from first section
	assert!(
		chunks[1].content.contains("Line three of first section"),
		"second chunk should include overlap from first section"
	);
}

#[test]
fn chunk_no_overlap_when_zero() {
	let section1 = "This is the first section with unique content that only belongs here in section one.";
	let section2 = "This is the second section with its own unique content that belongs to section two.";
	let content = format!("# First\n\n{}\n\n## Second\n\n{}\n", section1, section2);

	let options = ChunkOptions {
		min_chunk_chars: 10,
		max_chunk_chars: 10_000,
		overlap_lines: 0,
	};
	let chunks = chunk_markdown("test.md", &content, &options);
	assert!(chunks.len() >= 2, "should have at least 2 chunks");
	assert!(
		!chunks[1].content.contains("only belongs here"),
		"second chunk should NOT contain first section content when overlap is 0"
	);
}

// --- Chunk Key Format ---

#[test]
fn chunk_key_format() {
	let content = "# Hello World\n\nThis is a test document with enough content to meet the minimum chunk size requirement.\n";
	let chunks = chunk_markdown("notes/test.md", content, &default_options());
	assert_eq!(chunks.len(), 1);
	let key = &chunks[0].key;
	// Key format: "path#heading-slug-line_start"
	assert!(
		key.starts_with("notes/test.md#"),
		"key should start with file path and #, got: {key}"
	);
	assert!(
		key.contains("hello-world"),
		"key should contain heading slug, got: {key}"
	);
}

// --- Cosine Similarity Tests ---

#[test]
fn cosine_identical_vectors() {
	let a = vec![1.0, 2.0, 3.0];
	let b = vec![1.0, 2.0, 3.0];
	let sim = cosine_similarity(&a, &b);
	assert!((sim - 1.0).abs() < 1e-6, "identical vectors should have similarity 1.0, got {sim}");
}

#[test]
fn cosine_orthogonal_vectors() {
	let a = vec![1.0, 0.0, 0.0];
	let b = vec![0.0, 1.0, 0.0];
	let sim = cosine_similarity(&a, &b);
	assert!(sim.abs() < 1e-6, "orthogonal vectors should have similarity 0.0, got {sim}");
}

#[test]
fn cosine_zero_vector() {
	let a = vec![0.0, 0.0, 0.0];
	let b = vec![1.0, 2.0, 3.0];
	let sim = cosine_similarity(&a, &b);
	assert_eq!(sim, 0.0, "zero vector should return 0.0");
}

#[test]
fn cosine_opposite_vectors() {
	let a = vec![1.0, 2.0, 3.0];
	let b = vec![-1.0, -2.0, -3.0];
	let sim = cosine_similarity(&a, &b);
	assert!((sim + 1.0).abs() < 1e-6, "opposite vectors should have similarity -1.0, got {sim}");
}

#[test]
fn cosine_different_lengths() {
	let a = vec![1.0, 2.0];
	let b = vec![1.0, 2.0, 3.0];
	let sim = cosine_similarity(&a, &b);
	assert_eq!(sim, 0.0, "different length vectors should return 0.0");
}

#[test]
fn cosine_empty_vectors() {
	let a: Vec<f32> = vec![];
	let b: Vec<f32> = vec![];
	let sim = cosine_similarity(&a, &b);
	assert_eq!(sim, 0.0, "empty vectors should return 0.0");
}
