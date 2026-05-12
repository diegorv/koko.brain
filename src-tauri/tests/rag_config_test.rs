use kokobrain_lib::rag::config::{self, ClaudeConfig, LlmConfig, ProviderKind, RagConfig};
use tempfile::TempDir;

fn make_vault_with_config(toml: &str) -> TempDir {
	let tmp = TempDir::new().unwrap();
	let dir = tmp.path().join(".kokobrain");
	std::fs::create_dir_all(&dir).unwrap();
	std::fs::write(dir.join("rag.toml"), toml).unwrap();
	tmp
}

#[test]
fn load_errors_when_config_missing() {
	let tmp = TempDir::new().unwrap();
	let result = config::load(tmp.path());
	assert!(result.is_err());
	let msg = result.err().unwrap();
	assert!(
		msg.contains("not found"),
		"error should explain config is missing, got: {msg}"
	);
}

#[test]
fn load_parses_full_config() {
	let toml = r#"
		[llm]
		provider = "openai_compat"
		endpoint = "https://api.moonshot.ai/v1"
		model = "kimi-k2.6"
		api_key_env = "MOONSHOT_API_KEY"
		api_key_keyring_service = "kokobrain-rag-moonshot"

		[retrieval]
		vector_top_k = 30
		final_top_k = 5
	"#;
	let tmp = make_vault_with_config(toml);
	let cfg: RagConfig = config::load(tmp.path()).unwrap();
	assert_eq!(cfg.llm.endpoint, "https://api.moonshot.ai/v1");
	assert_eq!(cfg.llm.model, "kimi-k2.6");
	assert_eq!(cfg.llm.api_key_env, "MOONSHOT_API_KEY");
	assert_eq!(cfg.llm.api_key_keyring_service, "kokobrain-rag-moonshot");
	assert_eq!(cfg.retrieval.vector_top_k, 30);
	assert_eq!(cfg.retrieval.final_top_k, 5);
}

#[test]
fn load_applies_retrieval_defaults_when_section_missing() {
	let toml = r#"
		[llm]
		endpoint = "http://localhost:11434/v1"
		model = "qwen2.5:14b"
		api_key_env = ""
		api_key_keyring_service = ""
	"#;
	let tmp = make_vault_with_config(toml);
	let cfg = config::load(tmp.path()).unwrap();
	assert_eq!(cfg.retrieval.vector_top_k, 30, "default vector_top_k");
	assert_eq!(cfg.retrieval.final_top_k, 5, "default final_top_k");
	assert_eq!(cfg.llm.provider, "openai_compat", "default provider");
}

#[test]
fn load_rejects_malformed_toml() {
	let tmp = make_vault_with_config("this is not = valid [toml");
	let result = config::load(tmp.path());
	assert!(result.is_err());
	let msg = result.err().unwrap();
	assert!(
		msg.contains("Failed to parse"),
		"error should mention parse failure, got: {msg}"
	);
}

#[test]
fn resolve_api_key_errors_when_neither_source_set() {
	let cfg = LlmConfig {
		provider: "openai_compat".into(),
		endpoint: "https://example.com/v1".into(),
		model: "test".into(),
		api_key_env: "".into(),
		api_key_keyring_service: "".into(),
		claude: ClaudeConfig::default(),
	};
	let result = config::resolve_api_key(&cfg);
	assert!(result.is_err());
	let msg = result.err().unwrap();
	assert!(msg.contains("No API key"), "error should explain missing key, got: {msg}");
}

#[test]
fn resolve_api_key_reads_env_var_when_keyring_unset() {
	// Use a unique env var name to avoid clobbering anything real.
	let var_name = "KOKOBRAIN_TEST_RAG_KEY_8723";
	std::env::set_var(var_name, "test-key-value");
	let cfg = LlmConfig {
		provider: "openai_compat".into(),
		endpoint: "https://example.com/v1".into(),
		model: "test".into(),
		api_key_env: var_name.into(),
		api_key_keyring_service: "".into(),
		claude: ClaudeConfig::default(),
	};
	let key = config::resolve_api_key(&cfg).unwrap();
	assert_eq!(key, "test-key-value");
	std::env::remove_var(var_name);
}

#[test]
fn provider_kind_parses_known_values() {
	let mut cfg = LlmConfig {
		provider: "openai_compat".into(),
		endpoint: "https://example.com/v1".into(),
		model: "m".into(),
		api_key_env: "".into(),
		api_key_keyring_service: "".into(),
		claude: ClaudeConfig::default(),
	};
	assert_eq!(cfg.provider_kind().unwrap(), ProviderKind::OpenAICompat);
	cfg.provider = "claude_agent_sdk".into();
	assert_eq!(cfg.provider_kind().unwrap(), ProviderKind::ClaudeAgentSdk);
}

#[test]
fn provider_kind_rejects_unknown_value() {
	let cfg = LlmConfig {
		provider: "anthropic_direct".into(),
		endpoint: "".into(),
		model: "m".into(),
		api_key_env: "".into(),
		api_key_keyring_service: "".into(),
		claude: ClaudeConfig::default(),
	};
	let err = cfg.provider_kind().expect_err("unknown provider should error");
	assert!(
		err.contains("anthropic_direct") && err.contains("openai_compat"),
		"error should name the bad value and list valid options, got: {err}"
	);
}

#[test]
fn load_parses_claude_agent_sdk_config() {
	let toml = r#"
		[llm]
		provider = "claude_agent_sdk"
		model = "sonnet"

		[llm.claude]
		binary_path = "/usr/local/bin/claude"
		effort = "low"
	"#;
	let tmp = make_vault_with_config(toml);
	let cfg = config::load(tmp.path()).unwrap();
	assert_eq!(cfg.llm.provider, "claude_agent_sdk");
	assert_eq!(cfg.llm.provider_kind().unwrap(), ProviderKind::ClaudeAgentSdk);
	assert_eq!(cfg.llm.model, "sonnet");
	assert_eq!(cfg.llm.endpoint, "", "endpoint defaults to empty for claude");
	assert_eq!(cfg.llm.claude.binary_path.as_deref(), Some("/usr/local/bin/claude"));
	assert_eq!(cfg.llm.claude.effort.as_deref(), Some("low"));
}

#[test]
fn load_parses_claude_agent_sdk_without_optional_section() {
	let toml = r#"
		[llm]
		provider = "claude_agent_sdk"
		model = "haiku"
	"#;
	let tmp = make_vault_with_config(toml);
	let cfg = config::load(tmp.path()).unwrap();
	assert_eq!(cfg.llm.model, "haiku");
	assert!(cfg.llm.claude.binary_path.is_none());
	assert!(cfg.llm.claude.effort.is_none());
}

#[test]
fn config_path_is_under_kokobrain() {
	let tmp = TempDir::new().unwrap();
	let path = config::config_path(tmp.path());
	assert!(path.ends_with(".kokobrain/rag.toml"));
}
