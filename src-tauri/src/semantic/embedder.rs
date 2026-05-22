use crate::utils::logger::debug_log;
use half::f16;
use ndarray::{Array2, ArrayViewD, Axis};
use ort::session::Session;
use std::path::Path;
use tokenizers::Tokenizer;

/// Embedding model wrapper for ONNX inference.
pub struct Embedder {
	session: Session,
	tokenizer: Tokenizer,
	dimensions: usize,
	/// Whether the model accepts token_type_ids (BERT yes, XLM-RoBERTa no).
	uses_token_type_ids: bool,
}

impl Embedder {
	/// Maximum texts per ONNX inference call.
	/// Raised from 4 → 8: the M-series CPU SIMD path under-utilizes at batch=4
	/// (per-batch dispatch overhead dominates), and the larger batch ~doubles
	/// throughput. Peak RSS bumps proportionally — at seq_len=512 the extra
	/// intermediates are ~800MB, well under the 32GB+ box this runs on.
	const INFERENCE_BATCH_SIZE: usize = 8;

	/// Loads the ONNX model and tokenizer from the given directory.
	///
	/// Expects `model.onnx` and `tokenizer.json` in `model_dir`. `dimensions`
	/// is the expected hidden-state dimensionality of the pooled output —
	/// pinned at construction (from the `ManagedModel` registry) and never
	/// mutated thereafter. `run_inference` aborts the batch with an error
	/// if the model's actual output dim diverges from this value, so a
	/// silently-swapped or corrupted model cannot write incompatible vectors
	/// to the `chunks` table.
	pub fn load(model_dir: &Path, dimensions: usize) -> Result<Self, String> {
		if dimensions == 0 {
			return Err("Embedder dimensions must be non-zero".to_string());
		}

		let model_path = model_dir.join("model.onnx");
		let tokenizer_path = model_dir.join("tokenizer.json");

		if !model_path.exists() {
			return Err(format!("Model not found: {:?}", model_path));
		}
		if !tokenizer_path.exists() {
			return Err(format!("Tokenizer not found: {:?}", tokenizer_path));
		}

		// Raised from min(4) → min(8) to use the M-series performance cores
		// during indexing. Indexing is the only flow that pegs the embedder,
		// and the user doesn't typically interact with the UI while it runs.
		let num_threads = std::thread::available_parallelism()
			.map(|n| n.get().min(8))
			.unwrap_or(4);
		debug_log("EMBEDDER", format!("Using {} intra-op threads", num_threads));

		let session = Session::builder()
			.map_err(|e| format!("Failed to create session builder: {e}"))?
			.with_intra_threads(num_threads)
			.map_err(|e| format!("Failed to set threads: {e}"))?
			.commit_from_file(&model_path)
			.map_err(|e| format!("Failed to load model: {e}"))?;

		// Log model input/output info for diagnostics
		let input_names: Vec<_> = session.inputs().iter().map(|i| format!("{:?}", i.name())).collect();
		debug_log("EMBEDDER", format!("Model inputs: {}", input_names.join(", ")));
		let output_names: Vec<_> = session.outputs().iter().map(|o| format!("{:?}", o.name())).collect();
		debug_log("EMBEDDER", format!("Model outputs: {}", output_names.join(", ")));

		let tokenizer = Tokenizer::from_file(&tokenizer_path)
			.map_err(|e| format!("Failed to load tokenizer: {e}"))?;

		// Detect if the model accepts token_type_ids (BERT does, XLM-RoBERTa doesn't)
		let uses_token_type_ids = session
			.inputs()
			.iter()
			.any(|input| input.name() == "token_type_ids");
		debug_log("EMBEDDER", format!("uses_token_type_ids: {}", uses_token_type_ids));

		debug_log("EMBEDDER", format!("Expected embedding dimensions: {}", dimensions));

		Ok(Self {
			session,
			tokenizer,
			dimensions,
			uses_token_type_ids,
		})
	}

	/// Returns the embedding dimensionality.
	pub fn dimensions(&self) -> usize {
		self.dimensions
	}

	/// Generates an embedding for a single text string.
	///
	/// For E5 models, the caller should prepend "query: " or "passage: " prefix.
	pub fn embed(&mut self, text: &str) -> Result<Vec<f32>, String> {
		let batch = self.embed_batch(&[text])?;
		batch
			.into_iter()
			.next()
			.ok_or_else(|| "Empty embedding result".to_string())
	}

	/// Generates embeddings for multiple texts, automatically batching for inference.
	///
	/// Handles internal batching — callers don't need to pre-batch.
	/// For E5 models, each text should have the appropriate prefix.
	pub fn embed_batch(
		&mut self,
		texts: &[&str],
	) -> Result<Vec<Vec<f32>>, String> {
		let mut all_embeddings = Vec::with_capacity(texts.len());

		for batch in texts.chunks(Self::INFERENCE_BATCH_SIZE) {
			let batch_embeddings = self.run_inference(batch)?;
			all_embeddings.extend(batch_embeddings);
		}

		Ok(all_embeddings)
	}

	/// Runs ONNX inference on a batch of texts.
	fn run_inference(&mut self, texts: &[&str]) -> Result<Vec<Vec<f32>>, String> {
		let encodings = self
			.tokenizer
			.encode_batch(texts.to_vec(), true)
			.map_err(|e| format!("Tokenization failed: {e}"))?;

		let batch_len = encodings.len();
		let max_len = encodings.iter().map(|e| e.get_ids().len()).max().unwrap_or(0);

		// Clamp to max 512 tokens
		let max_len = max_len.min(512);

		// Build input tensors: input_ids, attention_mask (+ token_type_ids if model uses it)
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

		// Keep attention_mask for pooling step, clone for tensor creation
		let attention_mask_for_pooling = attention_mask.clone();

		// Create input tensors
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
				.map_err(|e| format!("Inference failed: {e}"))?
		} else {
			self.session
				.run(ort::inputs![
					"input_ids" => input_ids_tensor,
					"attention_mask" => attention_mask_tensor,
				])
				.map_err(|e| format!("Inference failed: {e}"))?
		};

		// Extract token embeddings — try f32 first, fall back to f16→f32 conversion.
		// The hidden dim is taken from the model's actual output shape and validated
		// against the construction-time `self.dimensions`. A mismatch aborts the batch
		// so corrupted/swapped models cannot write incompatible vectors to the chunks
		// table. Audit 2026-05-22 (#124).
		let expected = self.dimensions;
		let (f32_embeddings, actual_dim): (Vec<Vec<f32>>, usize) =
			if let Ok(view) = outputs[0].try_extract_array::<f32>() {
				let shape = view.shape();
				debug_log("EMBEDDER", format!("Output: f32, shape={:?}", shape));
				let hidden_dim = if shape.len() == 3 { shape[2] } else { expected };
				validate_dimensions(expected, hidden_dim)?;
				(mean_pool_f32(&view, &attention_mask_for_pooling, batch_len, max_len, hidden_dim), hidden_dim)
			} else if let Ok(view) = outputs[0].try_extract_array::<f16>() {
				let shape = view.shape();
				debug_log("EMBEDDER", format!("Output: f16, shape={:?} — converting to f32", shape));
				let hidden_dim = if shape.len() == 3 { shape[2] } else { expected };
				validate_dimensions(expected, hidden_dim)?;
				(mean_pool_f16(&view, &attention_mask_for_pooling, batch_len, max_len, hidden_dim), hidden_dim)
			} else {
				return Err("Failed to extract tensor as f32 or f16".to_string());
			};

		debug_assert_eq!(actual_dim, self.dimensions);

		Ok(f32_embeddings)
	}
}

/// Returns `Ok(())` when `actual` matches the embedder's pinned `expected`
/// dimensionality. Returns an error string otherwise — callers must abort
/// the batch so incompatible vectors never reach the `chunks` table.
pub(crate) fn validate_dimensions(expected: usize, actual: usize) -> Result<(), String> {
	if actual != expected {
		return Err(format!(
			"Embedding dimension mismatch: expected {expected}, model returned {actual}. \
Aborting batch — corrupted or swapped model would produce vectors incompatible with stored embeddings."
		));
	}
	Ok(())
}

/// Mean pooling with attention mask for f32 output.
fn mean_pool_f32(
	token_embs: &ArrayViewD<f32>,
	attention_mask: &Array2<i64>,
	batch_len: usize,
	max_len: usize,
	hidden_dim: usize,
) -> Vec<Vec<f32>> {
	let mut embeddings = Vec::with_capacity(batch_len);
	for i in 0..batch_len {
		let embs = token_embs.index_axis(Axis(0), i);
		let mask = attention_mask.row(i);
		let mut sum = vec![0.0f32; hidden_dim];
		let mut count = 0.0f32;
		for j in 0..max_len {
			if mask[j] == 1 {
				let token = embs.index_axis(Axis(0), j);
				for k in 0..hidden_dim {
					sum[k] += token[k];
				}
				count += 1.0;
			}
		}
		normalize_embedding(&mut sum, count);

		embeddings.push(sum);
	}
	embeddings
}

/// Mean pooling with attention mask for f16 output (converts to f32).
fn mean_pool_f16(
	token_embs: &ArrayViewD<f16>,
	attention_mask: &Array2<i64>,
	batch_len: usize,
	max_len: usize,
	hidden_dim: usize,
) -> Vec<Vec<f32>> {
	let mut embeddings = Vec::with_capacity(batch_len);
	for i in 0..batch_len {
		let embs = token_embs.index_axis(Axis(0), i);
		let mask = attention_mask.row(i);
		let mut sum = vec![0.0f32; hidden_dim];
		let mut count = 0.0f32;
		for j in 0..max_len {
			if mask[j] == 1 {
				let token = embs.index_axis(Axis(0), j);
				for k in 0..hidden_dim {
					sum[k] += token[k].to_f32();
				}
				count += 1.0;
			}
		}
		normalize_embedding(&mut sum, count);

		embeddings.push(sum);
	}
	embeddings
}

/// Averages and L2-normalizes an embedding vector.
fn normalize_embedding(sum: &mut [f32], count: f32) {
	if count > 0.0 {
		for val in sum.iter_mut() {
			*val /= count;
		}
	}
	let norm: f32 = sum.iter().map(|x| x * x).sum::<f32>().sqrt();
	if norm > 0.0 {
		for val in sum.iter_mut() {
			*val /= norm;
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn validate_dimensions_passes_when_equal() {
		assert!(validate_dimensions(1024, 1024).is_ok());
	}

	#[test]
	fn validate_dimensions_errors_when_smaller() {
		let err = validate_dimensions(1024, 768).expect_err("should error");
		assert!(err.contains("expected 1024"), "err must name expected: {err}");
		assert!(err.contains("returned 768"), "err must name actual: {err}");
	}

	#[test]
	fn validate_dimensions_errors_when_larger() {
		let err = validate_dimensions(384, 1024).expect_err("should error");
		assert!(err.contains("Aborting batch"), "err must signal abort: {err}");
	}

	#[test]
	fn validate_dimensions_errors_when_zero() {
		// Zero is a possible mean-pool output for an empty/malformed tensor.
		// Must not be silently accepted even if `expected` were also zero,
		// but the construction-time guard rejects `expected=0` upstream.
		assert!(validate_dimensions(1024, 0).is_err());
	}
}

/// Computes cosine similarity between two vectors.
/// Returns 0.0 if either vector has zero magnitude.
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
	if a.len() != b.len() || a.is_empty() {
		return 0.0;
	}

	let mut dot = 0.0f32;
	let mut norm_a = 0.0f32;
	let mut norm_b = 0.0f32;

	for i in 0..a.len() {
		dot += a[i] * b[i];
		norm_a += a[i] * a[i];
		norm_b += b[i] * b[i];
	}

	let denom = norm_a.sqrt() * norm_b.sqrt();
	if denom == 0.0 {
		0.0
	} else {
		dot / denom
	}
}
