//! Integration tests for the in-process MCP server module.
//!
//! Lives alongside the rest of the integration tests under
//! `src-tauri/tests/`. The MCP module is exposed as `mcp` on
//! `kokobrain_lib`; tests interact with the public surface only.
//!
//! Tool surface is intentionally narrow: `search` only. Note reading
//! is handled by the MCP client (Claude Code's own `Read` tool, etc.)
//! since the client already has filesystem access to the vault.

use kokobrain_lib::mcp::tools::{KokoMcp, SearchParams};
use rmcp::ServerHandler;

/// The MCP service advertises Kokobrain and the `tools` capability.
/// Guards against accidental regression of the `get_info` instructions
/// or capability flags.
#[test]
fn mcp_get_info_advertises_kokobrain_and_tools_capability() {
	let svc = KokoMcp::new();
	let info = svc.get_info();
	let instructions = info
		.instructions
		.as_deref()
		.expect("MCP service should advertise instructions");
	assert!(
		instructions.contains("Kokobrain"),
		"instructions should mention Kokobrain, got: {instructions:?}"
	);
	assert!(
		info.capabilities.tools.is_some(),
		"tools capability should be enabled, capabilities={:?}",
		info.capabilities
	);
}

// --- `search` tool ---------------------------------------------------------

/// `SearchParams` wire shape: camelCase keys, optional `maxResults`.
/// Guards against accidental rename or default-removal regressions —
/// the LLM-facing JSON Schema is built off this struct, so the wire
/// contract has to stay deterministic.
#[test]
fn search_params_deserializes_camel_case_with_optional_max_results() {
	let with_max: SearchParams =
		serde_json::from_str(r#"{"query":"linear algebra","maxResults":7}"#).expect("parse");
	assert_eq!(with_max.query, "linear algebra");
	assert_eq!(with_max.max_results, Some(7));

	let without_max: SearchParams =
		serde_json::from_str(r#"{"query":"foo"}"#).expect("parse");
	assert_eq!(without_max.query, "foo");
	assert_eq!(without_max.max_results, None);
}

/// Empty-string `query` deserializes — `search_hybrid` itself enforces
/// the three-character minimum and returns an empty result list, so
/// the MCP tool transparently passes through the empty result.
#[test]
fn search_params_accepts_empty_query_string() {
	let empty: SearchParams = serde_json::from_str(r#"{"query":""}"#).expect("parse");
	assert_eq!(empty.query, "");
	assert_eq!(empty.max_results, None);
}

/// Missing `query` field is a hard error — the tool requires it.
#[test]
fn search_params_rejects_missing_query() {
	let err = serde_json::from_str::<SearchParams>(r#"{"maxResults":3}"#)
		.expect_err("missing query should fail");
	let msg = err.to_string();
	assert!(
		msg.contains("query"),
		"error should mention `query`, got: {msg}"
	);
}
