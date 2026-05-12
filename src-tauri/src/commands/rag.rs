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
