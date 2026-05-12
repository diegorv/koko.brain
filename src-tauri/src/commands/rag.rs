use crate::rag::config;
use crate::rag::config::RetrievalConfig;
use crate::rag::llm::openai_compat::OpenAICompatProvider;
use crate::rag::llm::LlmProvider;
use crate::rag::retrieval::{retrieve, RetrievedChunk};
use crate::semantic::reranker::RerankerModelManager;
use futures_util::StreamExt;
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

/// Payload of the terminal `rag-chat-done` event.
#[derive(serde::Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct RagChatDone {
	tokens_emitted: u64,
	sources_count: usize,
}

/// Runs full RAG: retrieves chunks, opens an LLM stream, and emits the
/// response token-by-token. Events:
///   - `rag-chat-sources` (`Vec<RetrievedChunk>`): fired once after retrieval.
///   - `rag-chat-token` (`String`): per-token deltas as the stream produces them.
///   - `rag-chat-done` (`RagChatDone`): final emission on success.
///   - `rag-chat-error` (`String`): mid-stream failure; replaces a `done` event.
///
/// Returns `Ok(())` once streaming completes (or fails). The Tauri Result
/// is mostly bookkeeping for the IPC layer — the UI drives off the events.
#[tauri::command]
pub async fn rag_chat(
	vault_path: String,
	query: String,
	app: AppHandle,
) -> Result<(), String> {
	let cfg = config::load(Path::new(&vault_path))?;
	let api_key = config::resolve_api_key(&cfg.llm)?;

	let chunks = retrieve(query.clone(), cfg.retrieval.clone()).await?;

	let _ = app.emit("rag-chat-sources", &chunks);

	if chunks.is_empty() {
		let _ = app.emit(
			"rag-chat-token",
			"I could not find any relevant notes for that question.".to_string(),
		);
		let _ = app.emit(
			"rag-chat-done",
			RagChatDone {
				tokens_emitted: 0,
				sources_count: 0,
			},
		);
		return Ok(());
	}

	let provider = OpenAICompatProvider::new(&cfg.llm.endpoint, &api_key, &cfg.llm.model);

	let mut stream = match provider.chat_stream(&query, &chunks).await {
		Ok(s) => s,
		Err(e) => {
			let _ = app.emit("rag-chat-error", e.clone());
			return Err(e);
		}
	};

	let mut tokens_emitted: u64 = 0;
	while let Some(item) = stream.next().await {
		match item {
			Ok(text) if text.is_empty() => continue,
			Ok(text) => {
				tokens_emitted += 1;
				let _ = app.emit("rag-chat-token", text);
			}
			Err(e) => {
				let _ = app.emit("rag-chat-error", e.clone());
				return Err(e);
			}
		}
	}

	let _ = app.emit(
		"rag-chat-done",
		RagChatDone {
			tokens_emitted,
			sources_count: chunks.len(),
		},
	);

	Ok(())
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
