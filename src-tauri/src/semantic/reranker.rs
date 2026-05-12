use crate::utils::logger::debug_log;
use futures_util::StreamExt;
use half::f16;
use ndarray::Array2;
use ort::session::Session;
use std::path::{Path, PathBuf};
use tokenizers::Tokenizer;
use tokio::io::AsyncWriteExt;

/// Model name used for the cross-encoder reranker.
const MODEL_NAME: &str = "bge-reranker-v2-m3";

/// Remote files to download for Xenova's BGE-reranker-v2-m3 quantized ONNX (~280 MB).
/// Cross-encoder: takes (query, passage) pairs and returns a relevance logit per pair.
/// XLM-RoBERTa backbone, 512-token pair limit, multilingual.
const MODEL_DOWNLOADS: &[(&str, &str)] = &[
	(
		"https://huggingface.co/Xenova/bge-reranker-v2-m3/resolve/main/onnx/model_quantized.onnx",
		"model.onnx",
	),
	(
		"https://huggingface.co/Xenova/bge-reranker-v2-m3/resolve/main/tokenizer.json",
		"tokenizer.json",
	),
];

const MODEL_FILES: &[&str] = &["model.onnx", "tokenizer.json"];

/// Maximum pair length (query + passage) the reranker sees. BGE-reranker-v2-m3
/// is trained with 512 max — beyond that, quality drops and inference slows.
const MAX_PAIR_TOKENS: usize = 512;

/// Pairs per ONNX inference call. The reranker is a cross-encoder so each pair
/// is a full forward pass; batching amortizes Python/Rust call overhead but does
/// not reduce per-pair compute.
const INFERENCE_BATCH_SIZE: usize = 16;

/// Manages ONNX model availability and download for the reranker.
pub struct RerankerModelManager {
	models_dir: PathBuf,
}

impl RerankerModelManager {
	pub fn new(vault_path: &Path) -> Self {
		Self {
			models_dir: vault_path
				.join(".kokobrain")
				.join("models")
				.join(MODEL_NAME),
		}
	}

	pub fn is_model_available(&self) -> bool {
		MODEL_FILES
			.iter()
			.all(|f| self.models_dir.join(f).exists())
	}

	pub fn model_path(&self) -> PathBuf {
		self.models_dir.clone()
	}

	/// Downloads all model files from HuggingFace Hub.
	/// Calls `on_progress` with a value between 0.0 and 1.0 for overall progress.
	pub async fn download_model(
		&self,
		on_progress: impl Fn(f32),
	) -> Result<PathBuf, String> {
		tokio::fs::create_dir_all(&self.models_dir)
			.await
			.map_err(|e| format!("Failed to create models dir: {e}"))?;

		let total_files = MODEL_DOWNLOADS.len();

		for (idx, (url, local_name)) in MODEL_DOWNLOADS.iter().enumerate() {
			let file_path = self.models_dir.join(local_name);

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

	async fn download_file(
		&self,
		url: &str,
		dest: &Path,
		on_progress: impl Fn(f32),
	) -> Result<(), String> {
		let client = reqwest::Client::new();
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
			tokio::fs::rename(&temp_path, dest)
				.await
				.map_err(|e| format!("Failed to rename temp file: {e}"))?;
			Ok::<(), String>(())
		}
		.await;

		if result.is_err() {
			let _ = tokio::fs::remove_file(&temp_path).await;
		}

		result
	}
}

/// One scored candidate after reranking.
#[derive(Debug, Clone, Copy)]
pub struct RerankResult {
	/// Index into the original `candidates` slice passed to `rerank`.
	pub index: usize,
	/// Raw model logit (not a probability). Higher = more relevant.
	pub score: f32,
}

/// Cross-encoder reranker wrapping the ONNX session and tokenizer.
pub struct Reranker {
	session: Session,
	tokenizer: Tokenizer,
	uses_token_type_ids: bool,
}

impl Reranker {
	/// Loads the ONNX model and tokenizer from the given directory.
	pub fn load(model_dir: &Path) -> Result<Self, String> {
		let model_path = model_dir.join("model.onnx");
		let tokenizer_path = model_dir.join("tokenizer.json");

		if !model_path.exists() {
			return Err(format!("Reranker model not found: {:?}", model_path));
		}
		if !tokenizer_path.exists() {
			return Err(format!("Reranker tokenizer not found: {:?}", tokenizer_path));
		}

		let num_threads = std::thread::available_parallelism()
			.map(|n| n.get().min(4))
			.unwrap_or(4);
		debug_log("RERANKER", format!("Using {} intra-op threads", num_threads));

		let session = Session::builder()
			.map_err(|e| format!("Failed to create session builder: {e}"))?
			.with_intra_threads(num_threads)
			.map_err(|e| format!("Failed to set threads: {e}"))?
			.commit_from_file(&model_path)
			.map_err(|e| format!("Failed to load reranker model: {e}"))?;

		let input_names: Vec<_> = session.inputs().iter().map(|i| format!("{:?}", i.name())).collect();
		debug_log("RERANKER", format!("Model inputs: {}", input_names.join(", ")));
		let output_names: Vec<_> = session.outputs().iter().map(|o| format!("{:?}", o.name())).collect();
		debug_log("RERANKER", format!("Model outputs: {}", output_names.join(", ")));

		let tokenizer = Tokenizer::from_file(&tokenizer_path)
			.map_err(|e| format!("Failed to load reranker tokenizer: {e}"))?;

		// XLM-RoBERTa (the reranker backbone) doesn't use token_type_ids; check anyway.
		let uses_token_type_ids = session
			.inputs()
			.iter()
			.any(|input| input.name() == "token_type_ids");
		debug_log(
			"RERANKER",
			format!("uses_token_type_ids: {}", uses_token_type_ids),
		);

		Ok(Self {
			session,
			tokenizer,
			uses_token_type_ids,
		})
	}

	/// Scores each `(query, candidate)` pair and returns the indices sorted by
	/// score descending. The returned `index` field refers back to the original
	/// `candidates` slice.
	///
	/// Score is the raw model logit (not sigmoid'd) — use the relative ordering,
	/// not the absolute magnitude. Apply sigmoid yourself if you need 0..1.
	pub fn rerank(
		&mut self,
		query: &str,
		candidates: &[&str],
	) -> Result<Vec<RerankResult>, String> {
		if candidates.is_empty() {
			return Ok(Vec::new());
		}

		let mut scored: Vec<RerankResult> = Vec::with_capacity(candidates.len());

		for (batch_idx, chunk) in candidates.chunks(INFERENCE_BATCH_SIZE).enumerate() {
			let batch_scores = self.score_batch(query, chunk)?;
			let base = batch_idx * INFERENCE_BATCH_SIZE;
			for (i, score) in batch_scores.into_iter().enumerate() {
				scored.push(RerankResult {
					index: base + i,
					score,
				});
			}
		}

		scored.sort_by(|a, b| b.score.total_cmp(&a.score));
		Ok(scored)
	}

	fn score_batch(&mut self, query: &str, batch: &[&str]) -> Result<Vec<f32>, String> {
		// Pair encoding: `(query, passage)` becomes `[CLS] q [SEP] p [SEP]` with
		// proper attention/type ids built by the tokenizer. Do NOT concatenate
		// manually — it would produce wrong token_type_ids on BERT-style models
		// and miss the special tokens on RoBERTa-style models.
		let pairs: Vec<(String, String)> = batch
			.iter()
			.map(|cand| (query.to_string(), cand.to_string()))
			.collect();

		let encodings = self
			.tokenizer
			.encode_batch(pairs, true)
			.map_err(|e| format!("Reranker tokenization failed: {e}"))?;

		let batch_len = encodings.len();
		let max_len = encodings
			.iter()
			.map(|e| e.get_ids().len())
			.max()
			.unwrap_or(0)
			.min(MAX_PAIR_TOKENS);

		if max_len == 0 {
			return Ok(vec![0.0; batch_len]);
		}

		let mut input_ids = Array2::<i64>::zeros((batch_len, max_len));
		let mut attention_mask = Array2::<i64>::zeros((batch_len, max_len));

		for (i, encoding) in encodings.iter().enumerate() {
			let ids = encoding.get_ids();
			let mask = encoding.get_attention_mask();
			let len = ids.len().min(max_len);
			for j in 0..len {
				input_ids[[i, j]] = ids[j] as i64;
				attention_mask[[i, j]] = mask[j] as i64;
			}
		}

		let input_ids_tensor = ort::value::Tensor::from_array(input_ids)
			.map_err(|e| format!("Failed to create input_ids tensor: {e}"))?;
		let attention_mask_tensor = ort::value::Tensor::from_array(attention_mask)
			.map_err(|e| format!("Failed to create attention_mask tensor: {e}"))?;

		let outputs = if self.uses_token_type_ids {
			let mut token_type_ids = Array2::<i64>::zeros((batch_len, max_len));
			for (i, encoding) in encodings.iter().enumerate() {
				let type_ids = encoding.get_type_ids();
				let len = type_ids.len().min(max_len);
				for j in 0..len {
					token_type_ids[[i, j]] = type_ids[j] as i64;
				}
			}
			let token_type_ids_tensor = ort::value::Tensor::from_array(token_type_ids)
				.map_err(|e| format!("Failed to create token_type_ids tensor: {e}"))?;
			self.session
				.run(ort::inputs![
					"input_ids" => input_ids_tensor,
					"attention_mask" => attention_mask_tensor,
					"token_type_ids" => token_type_ids_tensor,
				])
				.map_err(|e| format!("Reranker inference failed: {e}"))?
		} else {
			self.session
				.run(ort::inputs![
					"input_ids" => input_ids_tensor,
					"attention_mask" => attention_mask_tensor,
				])
				.map_err(|e| format!("Reranker inference failed: {e}"))?
		};

		// Output is `[batch_size, 1]` (or `[batch_size]`) of logits.
		// Extract f32 first, fall back to f16 → f32.
		if let Ok(view) = outputs[0].try_extract_array::<f32>() {
			Ok(extract_logits_f32(&view, batch_len))
		} else if let Ok(view) = outputs[0].try_extract_array::<f16>() {
			Ok(extract_logits_f16(&view, batch_len))
		} else {
			Err("Failed to extract reranker output as f32 or f16".to_string())
		}
	}
}

fn extract_logits_f32(view: &ndarray::ArrayViewD<f32>, batch_len: usize) -> Vec<f32> {
	let shape = view.shape();
	let mut out = Vec::with_capacity(batch_len);
	let flat = view.iter().copied().collect::<Vec<f32>>();
	let stride = if shape.len() >= 2 { shape[1].max(1) } else { 1 };
	for i in 0..batch_len {
		out.push(flat.get(i * stride).copied().unwrap_or(0.0));
	}
	out
}

fn extract_logits_f16(view: &ndarray::ArrayViewD<f16>, batch_len: usize) -> Vec<f32> {
	let shape = view.shape();
	let mut out = Vec::with_capacity(batch_len);
	let flat = view.iter().copied().collect::<Vec<f16>>();
	let stride = if shape.len() >= 2 { shape[1].max(1) } else { 1 };
	for i in 0..batch_len {
		out.push(flat.get(i * stride).map(|x| x.to_f32()).unwrap_or(0.0));
	}
	out
}
