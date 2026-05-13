//! MCP tool implementations for Kokobrain.
//!
//! Each tool is a method on `KokoMcp` annotated with `#[tool(...)]`.
//! `#[tool_router]` aggregates them into a `ToolRouter`, consumed by
//! the rmcp `ServerHandler` impl below.
//!
//! Single tool: `search` (wraps `commands::semantic::search_hybrid`).
//! Note reading is delegated to the MCP client's own filesystem
//! capabilities (Claude Code already runs in the vault directory and
//! can `Read` the vault-relative paths search returns).

use rmcp::{
	handler::server::{router::tool::ToolRouter, wrapper::Parameters},
	model::{CallToolResult, Content, Implementation, ProtocolVersion, ServerCapabilities, ServerInfo},
	schemars,
	tool, tool_handler, tool_router,
	ErrorData as McpError, ServerHandler,
};
use serde::{Deserialize, Serialize};

use crate::commands::semantic;
use crate::utils::logger::debug_log;

/// Input schema for the `search` tool. Mirrors the public surface of
/// `commands::semantic::search_hybrid`. JSON field names follow the
/// project's camelCase wire convention (matches `SemanticResult` and
/// the rest of the Tauri command surface).
#[derive(Debug, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SearchParams {
	/// Free-text query to search across the user's Kokobrain vault.
	/// Queries shorter than three characters return an empty result
	/// list (matching the in-app behaviour).
	pub query: String,
	/// Optional cap on returned hits. Defaults to 20 when omitted.
	#[serde(default)]
	pub max_results: Option<u32>,
}

/// One ranked chunk in the response. Field shape is stable across the
/// FTS / semantic / hybrid pipelines because `search_hybrid` already
/// projects everything onto `SemanticResult`. camelCase on the wire
/// to mirror the rest of Kokobrain's serialized payloads.
#[derive(Debug, Serialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
struct SearchHit {
	/// Vault-relative file path (same convention as `search_hybrid`'s
	/// `source_path`).
	path: String,
	/// Section heading the chunk belongs to, when one was inferred
	/// during chunking; `None` for top-of-file or headless documents.
	heading: Option<String>,
	/// Chunk text, ready to display as a snippet.
	content: String,
	/// First line of the chunk (1-based) in the source file.
	line_start: usize,
	/// Last line of the chunk (1-based) in the source file.
	line_end: usize,
	/// Final relevance score. Reranker logit when the BGE cross-
	/// encoder model is on disk; otherwise the RRF score.
	score: f32,
}

/// Wraps the hit array in a named field so the tool result reads as
/// `{ "hits": [...] }` instead of a bare array — friendlier for LLM
/// consumers that prefer structured shapes.
#[derive(Debug, Serialize, schemars::JsonSchema)]
struct SearchResponse {
	hits: Vec<SearchHit>,
}

/// MCP service object. A fresh instance is constructed per session by
/// `StreamableHttpService::new` (see `mcp::start`).
///
/// The `tool_router` field follows the rmcp counter example pattern
/// (`examples/servers/src/common/counter.rs`); the `#[tool_handler]`
/// macro currently rebuilds the router via `Self::tool_router()`
/// rather than reading the field, hence the explicit
/// `#[allow(dead_code)]`. Drop the allow if a future rmcp release
/// starts reading the field directly.
#[derive(Clone)]
pub struct KokoMcp {
	#[allow(dead_code)]
	tool_router: ToolRouter<KokoMcp>,
}

#[tool_router]
impl KokoMcp {
	/// Constructs a session-scoped MCP service with the static tool
	/// router built by the `#[tool_router]` macro.
	pub fn new() -> Self {
		Self {
			tool_router: Self::tool_router(),
		}
	}

	/// Hybrid (FTS5 + BGE-M3 semantic + optional BGE-reranker)
	/// search. Wraps `commands::semantic::search_hybrid` so the same
	/// fused ranking the in-app search panel produces is what Claude
	/// Code sees over MCP.
	///
	/// Empty / sub-three-character queries short-circuit to an empty
	/// hit list inside `search_hybrid` itself; this tool preserves
	/// that contract.
	#[tool(
		description = "Hybrid (FTS + semantic + optional reranker) search across the user's Kokobrain vault. Returns ranked chunks with vault-relative path, section heading, line range, and a content snippet. Use this whenever the user wants to find notes by topic, quote, or fuzzy meaning. Read the returned paths with your own filesystem tools — the MCP server intentionally exposes search only."
	)]
	async fn search(
		&self,
		Parameters(SearchParams { query, max_results }): Parameters<SearchParams>,
	) -> Result<CallToolResult, McpError> {
		let started = std::time::Instant::now();
		let limit = max_results.map(|n| n as usize);
		let q_for_log = query.clone();

		let results = match semantic::search_hybrid(query, limit).await {
			Ok(r) => r,
			Err(err) => {
				debug_log(
					"MCP",
					format!("tool=search query={q_for_log:?} error: {err}"),
				);
				return Err(McpError::internal_error(err, None));
			}
		};

		let response = SearchResponse {
			hits: results
				.into_iter()
				.map(|r| SearchHit {
					path: r.source_path,
					heading: r.heading,
					content: r.content,
					line_start: r.line_start,
					line_end: r.line_end,
					score: r.score,
				})
				.collect(),
		};

		debug_log(
			"MCP",
			format!(
				"tool=search query={:?} results={} took={}ms",
				q_for_log,
				response.hits.len(),
				started.elapsed().as_millis(),
			),
		);

		let json = serde_json::to_string(&response)
			.map_err(|e| McpError::internal_error(e.to_string(), None))?;
		Ok(CallToolResult::success(vec![Content::text(json)]))
	}
}

impl Default for KokoMcp {
	fn default() -> Self {
		Self::new()
	}
}

#[tool_handler]
impl ServerHandler for KokoMcp {
	fn get_info(&self) -> ServerInfo {
		ServerInfo::new(
			ServerCapabilities::builder().enable_tools().build(),
		)
		.with_server_info(Implementation::from_build_env())
		.with_protocol_version(ProtocolVersion::V_2024_11_05)
		.with_instructions(
			"Kokobrain vault: hybrid search across notes (search). Returns ranked chunks with vault-relative paths, headings, line ranges, and snippets. Read the returned paths with your own filesystem tools — note reading is delegated to the client (Claude Code's Read, etc.) so the MCP surface stays single-purpose."
				.to_string(),
		)
	}
}
