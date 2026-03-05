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
	/// Text content of the chunk
	pub content: String,
	/// Section heading, if any
	pub heading: Option<String>,
	/// Starting line number (1-indexed)
	pub line_start: usize,
	/// Ending line number (1-indexed)
	pub line_end: usize,
	/// SHA-256 hash of content (first 16 hex chars)
	pub content_hash: String,
}
