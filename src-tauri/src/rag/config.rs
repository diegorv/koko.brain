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

/// LLM provider configuration. Supports two backends:
/// - `openai_compat`: any OpenAI-compatible chat completions endpoint
///   (Kimi, DeepSeek, OpenAI, Ollama, OpenRouter, …).
/// - `claude_agent_sdk`: subprocess to the local `claude` CLI, authenticated
///   via the user's Pro/Max subscription. Endpoint and api-key fields are
///   ignored in this mode.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmConfig {
	/// Provider tag. `"openai_compat"` (default) or `"claude_agent_sdk"`.
	#[serde(default = "default_provider")]
	pub provider: String,

	/// Base URL of the chat completions endpoint, including any version
	/// segment (e.g. `https://api.moonshot.ai/v1`,
	/// `http://localhost:11434/v1`). Required for `openai_compat`;
	/// ignored for `claude_agent_sdk`.
	#[serde(default)]
	pub endpoint: String,

	/// Model identifier. For `openai_compat`: the model name accepted by
	/// the endpoint (e.g. `kimi-k2.6`, `deepseek-chat`). For
	/// `claude_agent_sdk`: an alias (`sonnet`, `opus`, `haiku`) or a full
	/// model id (`claude-sonnet-4-6`).
	pub model: String,

	/// Environment variable name that holds the API key. Read as the
	/// secondary source after the keyring. Ignored for `claude_agent_sdk`.
	#[serde(default)]
	pub api_key_env: String,

	/// OS keyring service name to look up the API key. When set, the
	/// keyring is tried first; the env var is a fallback. Leave empty
	/// to skip the keyring entirely (useful on headless Linux without
	/// Secret Service running). Ignored for `claude_agent_sdk`.
	#[serde(default)]
	pub api_key_keyring_service: String,

	/// Provider-specific tuning for `claude_agent_sdk`. Optional; sensible
	/// defaults apply when omitted.
	#[serde(default)]
	pub claude: ClaudeConfig,
}

/// Tuning for the `claude_agent_sdk` provider. All fields are optional.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ClaudeConfig {
	/// Path to the `claude` CLI binary. Defaults to `"claude"` (looked up
	/// on `$PATH`). Set explicitly when the binary lives outside `$PATH`
	/// or you want to pin a specific version.
	#[serde(default)]
	pub binary_path: Option<String>,

	/// Effort level passed via `--effort` (`low`, `medium`, `high`,
	/// `xhigh`, `max`). Lowering the effort reduces the thinking budget,
	/// which both speeds up first-token latency and trims subscription
	/// quota consumption. Leave unset to use the CLI default.
	#[serde(default)]
	pub effort: Option<String>,
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

/// Strongly-typed view of `LlmConfig::provider`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProviderKind {
	OpenAICompat,
	ClaudeAgentSdk,
}

impl LlmConfig {
	/// Parses `provider` into a typed enum. Returns an actionable error
	/// listing the supported values when the user picked an unknown one.
	pub fn provider_kind(&self) -> Result<ProviderKind, String> {
		match self.provider.as_str() {
			"openai_compat" => Ok(ProviderKind::OpenAICompat),
			"claude_agent_sdk" => Ok(ProviderKind::ClaudeAgentSdk),
			other => Err(format!(
				"Unknown LLM provider {other:?}. Expected \"openai_compat\" \
				 or \"claude_agent_sdk\"."
			)),
		}
	}
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
