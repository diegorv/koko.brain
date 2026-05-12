pub mod openai_compat;

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
/// Concrete implementations live in submodules. v0.1 ships only
/// `OpenAICompatProvider`, which covers Kimi, DeepSeek, Ollama, OpenAI, and
/// OpenRouter via a single endpoint+model pair.
#[async_trait]
pub trait LlmProvider: Send + Sync {
	async fn chat_stream(
		&self,
		query: &str,
		chunks: &[RetrievedChunk],
	) -> Result<TokenStream, String>;
}
