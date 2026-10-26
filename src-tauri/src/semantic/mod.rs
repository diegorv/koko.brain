pub mod cache_stats;
pub mod chunker;
pub mod embedder;
pub mod filtering;
pub mod model;
pub mod quantize;
pub mod reranker;
pub mod types;

/// Process-wide ONNX Runtime environment shared by the embedder and the reranker.
/// `ort` rc.15 requires one for `Session::builder` and only keeps a weak
/// reference globally, so a strong handle must live for the whole process.
pub(crate) fn ort_environment() -> Result<&'static ort::environment::Environment, String> {
	static ENV: std::sync::OnceLock<ort::environment::Environment> = std::sync::OnceLock::new();
	if let Some(env) = ENV.get() {
		return Ok(env);
	}
	let env = ort::init()
		.build()
		.map_err(|e| format!("Failed to create ONNX environment: {e}"))?;
	Ok(ENV.get_or_init(|| env))
}
