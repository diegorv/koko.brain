use crate::rag::llm::prompt::{build_user_message, SYSTEM_PROMPT};
use crate::rag::llm::{LlmProvider, TokenStream};
use crate::rag::retrieval::RetrievedChunk;
use async_openai::{
	config::OpenAIConfig,
	types::{
		ChatCompletionRequestSystemMessageArgs, ChatCompletionRequestUserMessageArgs,
		CreateChatCompletionRequestArgs,
	},
	Client,
};
use async_trait::async_trait;
use futures_util::StreamExt;

/// OpenAI-compatible chat completion provider. The same client speaks to
/// Kimi (Moonshot), DeepSeek, OpenAI, Ollama, and OpenRouter — the choice
/// is entirely in `endpoint` + `model`.
pub struct OpenAICompatProvider {
	client: Client<OpenAIConfig>,
	model: String,
}

impl OpenAICompatProvider {
	pub fn new(endpoint: &str, api_key: &str, model: &str) -> Self {
		let config = OpenAIConfig::new()
			.with_api_base(endpoint)
			.with_api_key(api_key);
		let client = Client::with_config(config);
		Self {
			client,
			model: model.to_string(),
		}
	}
}

#[async_trait]
impl LlmProvider for OpenAICompatProvider {
	async fn chat_stream(
		&self,
		query: &str,
		chunks: &[RetrievedChunk],
	) -> Result<TokenStream, String> {
		let system_msg = ChatCompletionRequestSystemMessageArgs::default()
			.content(SYSTEM_PROMPT)
			.build()
			.map_err(|e| format!("Failed to build system message: {e}"))?
			.into();

		let user_text = build_user_message(query, chunks);
		let user_msg = ChatCompletionRequestUserMessageArgs::default()
			.content(user_text)
			.build()
			.map_err(|e| format!("Failed to build user message: {e}"))?
			.into();

		let request = CreateChatCompletionRequestArgs::default()
			.model(&self.model)
			.messages(vec![system_msg, user_msg])
			.stream(true)
			.build()
			.map_err(|e| format!("Failed to build chat request: {e}"))?;

		let stream = self
			.client
			.chat()
			.create_stream(request)
			.await
			.map_err(|e| format!("Chat stream open failed: {e}"))?;

		// Map provider errors and per-chunk choices to our `Result<String, String>`.
		let mapped = stream.map(|item| match item {
			Ok(response) => {
				let mut text = String::new();
				for choice in response.choices {
					if let Some(delta) = choice.delta.content {
						text.push_str(&delta);
					}
				}
				Ok(text)
			}
			Err(e) => Err(format!("Chat stream error: {e}")),
		});

		Ok(Box::pin(mapped))
	}
}
