use crate::rag::config;
use crate::rag::config::RetrievalConfig;
use crate::rag::retrieval::{retrieve, RetrievedChunk};
use crate::semantic::reranker::RerankerModelManager;
use std::path::Path;
use tauri::{AppHandle, Emitter};

/// Progress event payload emitted during reranker model download.
/// Mirrors `SemanticProgress` shape so the frontend can reuse the same
/// progress-bar component if it wants to.
#[derive(serde::Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct RerankerProgress {
	phase: String,
	current: usize,
	total: usize,
	message: String,
}

/// Checks whether the reranker ONNX model files are present on disk.
/// Returns `true` only when both `model.onnx` and `tokenizer.json` exist
/// under `{vault}/.kokobrain/models/bge-reranker-v2-m3/`.
#[tauri::command]
pub fn is_reranker_model_available(vault_path: String) -> Result<bool, String> {
	let manager = RerankerModelManager::new(Path::new(&vault_path));
	Ok(manager.is_model_available())
}

/// Downloads the BGE-reranker-v2-m3 ONNX model from HuggingFace Hub.
/// Emits `rag-reranker-progress` events with `{phase, current, total, message}`
/// payloads (percent-based, current=0..100). Returns `true` when all files are
/// present (whether already downloaded or freshly fetched).
#[tauri::command]
pub async fn rag_download_reranker(
	vault_path: String,
	app: AppHandle,
) -> Result<bool, String> {
	let manager = RerankerModelManager::new(Path::new(&vault_path));
	if manager.is_model_available() {
		return Ok(true);
	}

	manager
		.download_model(|progress| {
			let pct = (progress * 100.0) as usize;
			let _ = app.emit(
				"rag-reranker-progress",
				RerankerProgress {
					phase: "downloading".to_string(),
					current: pct,
					total: 100,
					message: format!("Downloading reranker model... {}%", pct),
				},
			);
		})
		.await?;

	Ok(true)
}

/// Configuration health-check for the chat panel. Returns whether
/// `rag.toml` exists, whether it parses, and whether an API key is
/// resolvable. The frontend uses this to decide between "Configure RAG"
/// CTA and the chat input.
#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RagConfigStatus {
	pub config_exists: bool,
	pub config_valid: bool,
	pub api_key_resolved: bool,
	pub error: Option<String>,
}

/// Runs the retrieval pipeline only (no LLM call). Returns the top-N
/// chunks the LLM would receive — useful for preview, debugging, and
/// "show sources" UI before a chat is initiated.
///
/// Uses defaults from `RetrievalConfig` when `rag.toml` is absent so
/// the user can preview retrieval before configuring the LLM provider.
#[tauri::command]
pub async fn rag_search(
	vault_path: String,
	query: String,
) -> Result<Vec<RetrievedChunk>, String> {
	let retrieval_cfg = match config::load(Path::new(&vault_path)) {
		Ok(cfg) => cfg.retrieval,
		Err(_) => RetrievalConfig::default(),
	};
	retrieve(query, retrieval_cfg).await
}

#[tauri::command]
pub fn rag_config_status(vault_path: String) -> Result<RagConfigStatus, String> {
	let path = config::config_path(Path::new(&vault_path));
	let config_exists = path.exists();
	if !config_exists {
		return Ok(RagConfigStatus {
			config_exists: false,
			config_valid: false,
			api_key_resolved: false,
			error: None,
		});
	}
	match config::load(Path::new(&vault_path)) {
		Ok(cfg) => match config::resolve_api_key(&cfg.llm) {
			Ok(_) => Ok(RagConfigStatus {
				config_exists: true,
				config_valid: true,
				api_key_resolved: true,
				error: None,
			}),
			Err(e) => Ok(RagConfigStatus {
				config_exists: true,
				config_valid: true,
				api_key_resolved: false,
				error: Some(e),
			}),
		},
		Err(e) => Ok(RagConfigStatus {
			config_exists: true,
			config_valid: false,
			api_key_resolved: false,
			error: Some(e),
		}),
	}
}
