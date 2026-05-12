use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Top-level RAG configuration loaded from `{vault}/.kokobrain/rag.toml`.
///
/// The retrieval section defaults if omitted; the LLM section is required
/// because the API endpoint and model identifier have no sensible default
/// (the user must explicitly choose a provider).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RagConfig {
	pub llm: LlmConfig,
	#[serde(default)]
	pub retrieval: RetrievalConfig,
}

/// LLM provider configuration. Targets any OpenAI-compatible chat completions
/// endpoint (Kimi, DeepSeek, OpenAI, Ollama, OpenRouter, …) — the choice of
/// provider is encoded entirely in `endpoint` + `model`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmConfig {
	/// Provider tag for logging and future-proofing. Currently only
	/// "openai_compat" is supported.
	#[serde(default = "default_provider")]
	pub provider: String,

	/// Base URL of the chat completions endpoint, including any version
	/// segment (e.g. `https://api.moonshot.ai/v1`,
	/// `http://localhost:11434/v1`).
	pub endpoint: String,

	/// Model identifier accepted by the endpoint (e.g. `kimi-k2.6`,
	/// `deepseek-chat`, `qwen2.5:14b`).
	pub model: String,

	/// Environment variable name that holds the API key. Read as the
	/// secondary source after the keyring.
	#[serde(default)]
	pub api_key_env: String,

	/// OS keyring service name to look up the API key. When set, the
	/// keyring is tried first; the env var is a fallback. Leave empty
	/// to skip the keyring entirely (useful on headless Linux without
	/// Secret Service running).
	#[serde(default)]
	pub api_key_keyring_service: String,
}

/// Retrieval pipeline tuning.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetrievalConfig {
	/// First-stage candidates retrieved by cosine vector search before
	/// reranking. 30 is a reasonable balance between recall and reranker
	/// cost; raise for higher recall at ~linear rerank cost.
	#[serde(default = "default_vector_top_k")]
	pub vector_top_k: usize,

	/// Final candidates surfaced to the LLM after reranking. 5 typically
	/// fits comfortably in a Kimi/DeepSeek context with room for the
	/// system prompt + user question.
	#[serde(default = "default_final_top_k")]
	pub final_top_k: usize,
}

impl Default for RetrievalConfig {
	fn default() -> Self {
		Self {
			vector_top_k: default_vector_top_k(),
			final_top_k: default_final_top_k(),
		}
	}
}

fn default_provider() -> String {
	"openai_compat".to_string()
}

fn default_vector_top_k() -> usize {
	30
}

fn default_final_top_k() -> usize {
	5
}

/// Returns the canonical config path: `{vault}/.kokobrain/rag.toml`.
pub fn config_path(vault_path: &Path) -> PathBuf {
	vault_path.join(".kokobrain").join("rag.toml")
}

/// Loads and parses the RAG config from the vault. Returns a clear error
/// when the file is missing — the frontend should treat that as "RAG not
/// yet configured" and surface a setup prompt.
pub fn load(vault_path: &Path) -> Result<RagConfig, String> {
	let path = config_path(vault_path);
	if !path.exists() {
		return Err(format!(
			"RAG config not found at {}. Create the file from the sample at \
			 docs/rag.toml.example to enable chat.",
			path.display()
		));
	}

	let text = std::fs::read_to_string(&path)
		.map_err(|e| format!("Failed to read {}: {e}", path.display()))?;

	toml::from_str::<RagConfig>(&text)
		.map_err(|e| format!("Failed to parse {}: {e}", path.display()))
}

/// Resolves the API key for the configured LLM provider. The lookup order is:
/// 1. OS keyring entry `(api_key_keyring_service, "default")` if the service
///    name is non-empty.
/// 2. Environment variable named by `api_key_env` if non-empty.
/// 3. Error.
///
/// Returning the key by-value (rather than borrowing) keeps the secret out
/// of the config struct; only the resolution path is durable, not the secret.
pub fn resolve_api_key(cfg: &LlmConfig) -> Result<String, String> {
	if !cfg.api_key_keyring_service.is_empty() {
		match keyring::Entry::new(&cfg.api_key_keyring_service, "default") {
			Ok(entry) => match entry.get_password() {
				Ok(secret) if !secret.is_empty() => return Ok(secret),
				Ok(_) => {
					// Empty stored secret — fall through to env.
				}
				Err(keyring::Error::NoEntry) => {
					// Not set in keyring — fall through to env.
				}
				Err(e) => {
					return Err(format!(
						"Keyring access failed for service {:?}: {e}. \
						 On Linux, ensure Secret Service (gnome-keyring \
						 or KWallet) is running, or use the env-var \
						 fallback instead.",
						cfg.api_key_keyring_service
					));
				}
			},
			Err(e) => {
				return Err(format!(
					"Failed to construct keyring entry for {:?}: {e}",
					cfg.api_key_keyring_service
				));
			}
		}
	}

	if !cfg.api_key_env.is_empty() {
		match std::env::var(&cfg.api_key_env) {
			Ok(v) if !v.is_empty() => return Ok(v),
			_ => {}
		}
	}

	Err(format!(
		"No API key found. Tried keyring service {:?} and env var {:?}. \
		 Either set the key via `keyring` or export the env var before \
		 launching the app.",
		cfg.api_key_keyring_service, cfg.api_key_env
	))
}
