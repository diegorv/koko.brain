/// A search result from semantic (embedding-based) search.
#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SemanticResult {
	/// Unique key: "relative/path.md#heading-linenum"
	pub key: String,
	/// Vault-relative source file path
	pub source_path: String,
	/// Chunk text content (for preview)
	pub content: String,
	/// Section heading this chunk belongs to, if any
	pub heading: Option<String>,
	/// Starting line number in the source file
	pub line_start: usize,
	/// Ending line number in the source file
	pub line_end: usize,
	/// Cosine similarity score (0.0 to 1.0)
	pub score: f32,
}

/// Statistics about the semantic search index.
#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SemanticStats {
	/// Total number of chunks in the index
	pub total_chunks: u64,
	/// Total number of unique source files
	pub total_sources: u64,
	/// Whether the ONNX model is currently loaded
	pub model_loaded: bool,
}

/// Per-file semantic indexing status. Returned by `get_semantic_file_status`
/// for status-bar display on the active markdown tab.
#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SemanticFileStatus {
	/// Number of indexed chunks stored for this source file (0 = not indexed).
	pub chunk_count: u64,
	/// Most recent `embedded_at` Unix-ms timestamp across this file's chunks,
	/// or `None` when the file has no chunks.
	pub last_embedded_at: Option<i64>,
	/// Whether the ONNX embedder is currently loaded in memory.
	pub model_loaded: bool,
}

/// Progress event emitted during semantic indexing.
#[derive(serde::Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SemanticProgress {
	/// Current phase: "downloading", "chunking", or "embedding"
	pub phase: String,
	/// Current item number
	pub current: usize,
	/// Total items to process
	pub total: usize,
	/// Human-readable progress message
	pub message: String,
}

/// A chunk of markdown content ready for embedding.
pub struct Chunk {
	/// Unique key: "path#heading-linenum"
	pub key: String,
	/// Vault-relative source file path
	pub source_path: String,
	/// Text content of the chunk (used for display)
	pub content: String,
	/// Section heading, if any
	pub heading: Option<String>,
	/// Ancestor heading hierarchy from H1 down to (but not including) `heading`.
	/// Empty for chunks at the document root, or in files without headings.
	/// Prepended to `content` when embedding to give the model topical context.
	pub parent_headings: Vec<String>,
	/// Starting line number (1-indexed)
	pub line_start: usize,
	/// Ending line number (1-indexed)
	pub line_end: usize,
	/// SHA-256 hash of `embed_text()` output (first 16 hex chars).
	/// Includes parent_headings so any heading-tree change invalidates the chunk.
	pub content_hash: String,
}

impl Chunk {
	/// Returns the text that should be fed to the embedder.
	/// Format: `H1 > H2 > Hn\n\n<content>` when parent_headings is non-empty,
	/// `<heading>\n\n<content>` when only the local heading is known,
	/// or `<content>` alone for headless documents.
	pub fn embed_text(&self) -> String {
		let mut parts: Vec<&str> = self
			.parent_headings
			.iter()
			.map(|s| s.as_str())
			.collect();
		if let Some(h) = &self.heading {
			parts.push(h.as_str());
		}
		if parts.is_empty() {
			self.content.clone()
		} else {
			format!("{}\n\n{}", parts.join(" > "), self.content)
		}
	}
}
