pub mod claude_agent_sdk;
pub mod openai_compat;
pub mod prompt;

use crate::rag::retrieval::RetrievedChunk;
use async_trait::async_trait;
use futures_util::Stream;
use std::pin::Pin;

/// Stream of model output tokens. Each item is either a chunk of generated
/// text or a propagated error from the upstream provider.
pub type TokenStream = Pin<Box<dyn Stream<Item = Result<String, String>> + Send>>;

/// Trait implemented by any LLM client that can take a question plus a list
/// of retrieved note chunks and stream a cited answer back.
///
/// Two concrete implementations ship:
/// - `OpenAICompatProvider` covers Kimi, DeepSeek, OpenAI, Ollama, OpenRouter
///   via a single endpoint+model pair (charged to the user's API key).
/// - `ClaudeAgentSdkProvider` shells out to the local `claude` CLI, which
///   carries the user's Pro/Max subscription auth — no API key required.
#[async_trait]
pub trait LlmProvider: Send + Sync {
	async fn chat_stream(
		&self,
		query: &str,
		chunks: &[RetrievedChunk],
	) -> Result<TokenStream, String>;
}
