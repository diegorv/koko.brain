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

/// Starts an ONNX session builder pinned to the CPU execution provider.
///
/// `ort` rc.15 defaults every builder to `AutoDevicePolicy::MaxEfficiency`,
/// which on macOS always registers the CoreML EP. With the dynamic batch
/// shapes the embedder produces, CoreML pushed the process to a 30 GB
/// footprint and 20-190 s per [8,512] batch; CPU-only peaks at ~1.6 GB and
/// ~2 s (measured with `examples/embedder_memory_probe.rs`, 2026-10-27).
/// Every session must start here so the policy cannot drift per call site.
pub fn session_builder(num_threads: usize) -> Result<ort::session::builder::SessionBuilder, String> {
	ort::session::Session::builder(ort_environment()?)
		.map_err(|e| format!("Failed to create session builder: {e}"))?
		.with_auto_device(ort::session::builder::AutoDevicePolicy::PreferCPU)
		.map_err(|e| format!("Failed to set CPU device policy: {e}"))?
		.with_intra_threads(num_threads)
		.map_err(|e| format!("Failed to set threads: {e}"))
}
