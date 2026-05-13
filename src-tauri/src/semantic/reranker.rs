use crate::utils::logger::debug_log;
use half::f16;
use ndarray::Array2;
use ort::session::Session;
use ort::session::builder::GraphOptimizationLevel;
use std::path::Path;
use tokenizers::{EncodeInput, Tokenizer, TruncationParams};

/// Cross-encoder reranker wrapping a BGE-reranker-v2-m3 ONNX session.
///
/// Reranks a candidate list against a query by running joint (query, document)
/// inference through a sequence-classification head. Output is a single logit
/// per pair; higher = more relevant. Sigmoid is NOT applied — ranking is
/// monotonic in the logit, so the extra op would only change calibration, not
/// order. Callers that need [0,1] scores can sigmoid in-place.
pub struct Reranker {
	session: Session,
	tokenizer: Tokenizer,
	batch_size: usize,
}

impl Reranker {
	/// Default texts-per-inference batch. 8 is the sweet spot on M-series CPU:
	/// large enough to amortize per-call overhead, small enough to keep peak
	/// RSS under 1GB during a 50-pair rerank.
	pub const DEFAULT_BATCH_SIZE: usize = 8;

	/// Max joint-encoded sequence length. BGE-reranker-v2-m3 was trained at 512
	/// tokens for the (query + doc) pair — that's the cap; going higher
	/// degrades quality and is wasted compute since the encoder folds
	/// everything into a single relevance logit.
	pub const DEFAULT_MAX_SEQ_LEN: usize = 512;

	/// Loads the ONNX model + tokenizer from a directory containing `model.onnx`
	/// and `tokenizer.json`. Applies `Level1` optimization (semantics-preserving
	/// rewrites only) so any future FP16 swap won't trip ORT's
	/// `SimplifiedLayerNormFusion` bug. Tokenizer truncation is configured
	/// up-front so `encode_batch` returns at most `max_seq_len` tokens.
	pub fn load(model_dir: &Path) -> Result<Self, String> {
		let model_path = model_dir.join("model.onnx");
		let tokenizer_path = model_dir.join("tokenizer.json");

		if !model_path.exists() {
			return Err(format!("Reranker model not found: {:?}", model_path));
		}
		if !tokenizer_path.exists() {
			return Err(format!("Reranker tokenizer not found: {:?}", tokenizer_path));
		}

		// Same cap as the embedder (min(8)) — uses the M-series performance
		// cores during interactive query rerank.
		let num_threads = std::thread::available_parallelism()
			.map(|n| n.get().min(8))
			.unwrap_or(4);
		debug_log("RERANKER", format!("Using {} intra-op threads", num_threads));

		let session = Session::builder()
			.map_err(|e| format!("Failed to create session builder: {e}"))?
			.with_intra_threads(num_threads)
			.map_err(|e| format!("Failed to set threads: {e}"))?
			.with_optimization_level(GraphOptimizationLevel::Level1)
			.map_err(|e| format!("Failed to set optimization level: {e}"))?
			.commit_from_file(&model_path)
			.map_err(|e| format!("Failed to load reranker model: {e}"))?;

		let input_names: Vec<_> = session.inputs().iter().map(|i| format!("{:?}", i.name())).collect();
		debug_log("RERANKER", format!("Model inputs: {}", input_names.join(", ")));
		let output_names: Vec<_> = session.outputs().iter().map(|o| format!("{:?}", o.name())).collect();
		debug_log("RERANKER", format!("Model outputs: {}", output_names.join(", ")));

		let mut tokenizer = Tokenizer::from_file(&tokenizer_path)
			.map_err(|e| format!("Failed to load reranker tokenizer: {e}"))?;

		let max_seq_len = Self::DEFAULT_MAX_SEQ_LEN;
		tokenizer
			.with_truncation(Some(TruncationParams {
				max_length: max_seq_len,
				..Default::default()
			}))
			.map_err(|e| format!("Failed to set truncation: {e}"))?;

		let _ = max_seq_len; // kept for clarity in the truncation setup above
		Ok(Self {
			session,
			tokenizer,
			batch_size: Self::DEFAULT_BATCH_SIZE,
		})
	}

	/// Override the inference batch size.
	pub fn with_batch_size(mut self, batch_size: usize) -> Self {
		self.batch_size = batch_size.max(1);
		self
	}

	/// Returns a logit per `(query, doc)` pair. Higher = more relevant.
	///
	/// Order of the returned scores matches the order of `documents`.
	/// The query is broadcast against each document (XLM-RoBERTa pair encoding
	/// inserts `</s></s>` between the two).
	pub fn rerank(&mut self, query: &str, documents: &[&str]) -> Result<Vec<f32>, String> {
		if documents.is_empty() {
			return Ok(Vec::new());
		}

		let mut all_scores: Vec<f32> = Vec::with_capacity(documents.len());

		for batch in documents.chunks(self.batch_size) {
			let pairs: Vec<EncodeInput> = batch
				.iter()
				.map(|doc| EncodeInput::Dual((*query).into(), (*doc).into()))
				.collect();
			let batch_scores = self.run_inference(pairs)?;
			all_scores.extend(batch_scores);
		}

		Ok(all_scores)
	}

	fn run_inference(&mut self, pairs: Vec<EncodeInput>) -> Result<Vec<f32>, String> {
		let encodings = self
			.tokenizer
			.encode_batch(pairs, true)
			.map_err(|e| format!("Pair tokenization failed: {e}"))?;

		let batch_len = encodings.len();
		// Tokenizer truncation guarantees each encoding length <= max_seq_len.
		let max_len = encodings.iter().map(|e| e.get_ids().len()).max().unwrap_or(0);

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

		let outputs = self
			.session
			.run(ort::inputs![
				"input_ids" => input_ids_tensor,
				"attention_mask" => attention_mask_tensor,
			])
			.map_err(|e| format!("Reranker inference failed: {e}"))?;

		// Sequence-classification head emits one logit per pair. Shape is
		// typically [batch, 1] (binary classifier with single output). A
		// rare model variant flattens to [batch] — handle both. Try f32 first,
		// fall back to f16→f32 if the model was emitted in half-precision.
		if let Ok(view) = outputs[0].try_extract_array::<f32>() {
			Ok(view.iter().copied().take(batch_len).collect())
		} else if let Ok(view) = outputs[0].try_extract_array::<f16>() {
			Ok(view.iter().map(|x| x.to_f32()).take(batch_len).collect())
		} else {
			Err("Failed to extract reranker logits as f32 or f16".to_string())
		}
	}
}
