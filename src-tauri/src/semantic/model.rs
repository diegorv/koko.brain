use futures_util::StreamExt;
use std::path::{Path, PathBuf};
use tokio::io::AsyncWriteExt;

/// Static configuration for a downloadable ONNX model.
///
/// `name` is used as the on-disk subdirectory under `.kokobrain/models/`.
/// `downloads` is the list of `(url, local_filename)` pairs the manager fetches.
/// `files` is the set of filenames `is_available` checks for.
pub struct ManagedModel {
	pub name: &'static str,
	pub downloads: &'static [(&'static str, &'static str)],
	pub files: &'static [&'static str],
}

/// BGE-M3 dense retrieval embedder (Xenova's INT8 ONNX conversion).
/// 1024 dimensions, 100+ languages, 8192 max tokens, no query/passage prefixes.
pub const BGE_M3_EMBEDDER: ManagedModel = ManagedModel {
	name: "bge-m3",
	downloads: &[
		(
			"https://huggingface.co/Xenova/bge-m3/resolve/main/onnx/model_quantized.onnx",
			"model.onnx",
		),
		(
			"https://huggingface.co/Xenova/bge-m3/resolve/main/tokenizer.json",
			"tokenizer.json",
		),
	],
	files: &["model.onnx", "tokenizer.json"],
};

/// BGE-reranker-v2-m3 cross-encoder for reranking (`onnx-community/bge-reranker-v2-m3-ONNX`).
/// 568M params, XLM-RoBERTa tokenizer, multilingual incl. PT-BR. Apache 2.0 license.
/// INT8 quantized variant — ~571MB on disk, ~500ms CPU latency for top-50 query rerank.
pub const BGE_RERANKER_V2_M3: ManagedModel = ManagedModel {
	name: "bge-reranker-v2-m3",
	downloads: &[
		(
			"https://huggingface.co/onnx-community/bge-reranker-v2-m3-ONNX/resolve/main/onnx/model_int8.onnx",
			"model.onnx",
		),
		(
			"https://huggingface.co/onnx-community/bge-reranker-v2-m3-ONNX/resolve/main/tokenizer.json",
			"tokenizer.json",
		),
	],
	files: &["model.onnx", "tokenizer.json"],
};

/// Manages ONNX model availability and download for a single `ManagedModel`.
pub struct ModelManager {
	models_dir: PathBuf,
	model: &'static ManagedModel,
}

impl ModelManager {
	/// Creates a manager scoped to a specific `ManagedModel`.
	/// Files live at `{vault_path}/.kokobrain/models/{model.name}/`.
	pub fn new(vault_path: &Path, model: &'static ManagedModel) -> Self {
		Self {
			models_dir: vault_path
				.join(".kokobrain")
				.join("models")
				.join(model.name),
			model,
		}
	}

	/// Manager for the dense retrieval embedder (BGE-M3).
	pub fn for_embedder(vault_path: &Path) -> Self {
		Self::new(vault_path, &BGE_M3_EMBEDDER)
	}

	/// Manager for the cross-encoder reranker (BGE-reranker-v2-m3).
	pub fn for_reranker(vault_path: &Path) -> Self {
		Self::new(vault_path, &BGE_RERANKER_V2_M3)
	}

	/// Checks if all required model files exist on disk.
	pub fn is_model_available(&self) -> bool {
		self.model
			.files
			.iter()
			.all(|f| self.models_dir.join(f).exists())
	}

	/// Returns the path to the model directory.
	pub fn model_path(&self) -> PathBuf {
		self.models_dir.clone()
	}

	/// Downloads all model files from HuggingFace Hub.
	///
	/// Calls `on_progress` with a value between 0.0 and 1.0 for overall progress.
	/// Creates the model directory if it doesn't exist.
	pub async fn download_model(
		&self,
		on_progress: impl Fn(f32),
	) -> Result<PathBuf, String> {
		tokio::fs::create_dir_all(&self.models_dir)
			.await
			.map_err(|e| format!("Failed to create models dir: {e}"))?;

		let total_files = self.model.downloads.len();

		for (idx, (url, local_name)) in self.model.downloads.iter().enumerate() {
			let file_path = self.models_dir.join(local_name);

			// Skip if already downloaded
			if file_path.exists() {
				let progress = (idx + 1) as f32 / total_files as f32;
				on_progress(progress);
				continue;
			}

			self.download_file(url, &file_path, |file_progress| {
				let overall = (idx as f32 + file_progress) / total_files as f32;
				on_progress(overall);
			})
			.await?;
		}

		on_progress(1.0);
		Ok(self.models_dir.clone())
	}

	/// Downloads a single file with streaming progress.
	async fn download_file(
		&self,
		url: &str,
		dest: &Path,
		on_progress: impl Fn(f32),
	) -> Result<(), String> {
		let client = reqwest::Client::new(); // huggingface.co downloads only
		let response = client
			.get(url)
			.send()
			.await
			.map_err(|e| format!("Download request failed: {e}"))?;

		if !response.status().is_success() {
			return Err(format!(
				"Download failed with status {}: {}",
				response.status(),
				url
			));
		}

		let total_size = response.content_length().unwrap_or(0);
		let mut downloaded: u64 = 0;

		// Write to a temp file first, then rename (atomic)
		let temp_path = dest.with_extension("tmp");
		let mut file = tokio::fs::File::create(&temp_path)
			.await
			.map_err(|e| format!("Failed to create temp file: {e}"))?;

		let result = async {
			let mut stream = response.bytes_stream();
			while let Some(chunk) = stream.next().await {
				let chunk = chunk.map_err(|e| format!("Download stream error: {e}"))?;
				file.write_all(&chunk)
					.await
					.map_err(|e| format!("Failed to write chunk: {e}"))?;
				downloaded += chunk.len() as u64;
				if total_size > 0 {
					on_progress(downloaded as f32 / total_size as f32);
				}
			}
			file.flush()
				.await
				.map_err(|e| format!("Failed to flush file: {e}"))?;

			// Rename temp file to final destination
			tokio::fs::rename(&temp_path, dest)
				.await
				.map_err(|e| format!("Failed to rename temp file: {e}"))?;

			Ok::<(), String>(())
		}
		.await;

		// Clean up temp file on failure
		if result.is_err() {
			let _ = tokio::fs::remove_file(&temp_path).await;
		}

		result
	}
}
