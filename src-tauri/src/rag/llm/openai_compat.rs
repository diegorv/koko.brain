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

const SYSTEM_PROMPT: &str = "You are an assistant answering questions based ONLY on the user's personal notes provided as context. Follow these rules strictly:

1. Use ONLY the information in the provided context. If the context does not contain the answer, say so explicitly. Do not use outside knowledge.
2. Cite sources inline using the format [path/to/note.md] after each statement that uses information from a specific note. Use the exact path shown in the context block.
3. If the answer requires combining information from multiple notes, do so but cite each source.
4. Respond in the same language as the question (Portuguese by default).
5. Be concise. Do not pad the answer with restating the question or boilerplate.";

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

/// Renders the retrieved chunks as the context block of the user message.
/// Path + heading are exposed so the model can cite them verbatim.
fn build_context_block(chunks: &[RetrievedChunk]) -> String {
	let mut out = String::new();
	out.push_str("Context (your notes):\n\n");
	for (i, chunk) in chunks.iter().enumerate() {
		out.push_str("---\n");
		out.push_str(&format!("[{}] Note: {}\n", i + 1, chunk.path));
		if let Some(h) = chunk.heading_path.first() {
			if !h.is_empty() {
				out.push_str(&format!("(section: {})\n", h));
			}
		}
		out.push_str(&chunk.text);
		out.push_str("\n");
	}
	out.push_str("---\n");
	out
}

fn build_user_message(query: &str, chunks: &[RetrievedChunk]) -> String {
	format!("{}\nQuestion: {}", build_context_block(chunks), query)
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

#[cfg(test)]
mod tests {
	use super::*;

	fn chunk(path: &str, heading: Option<&str>, text: &str) -> RetrievedChunk {
		RetrievedChunk {
			path: path.to_string(),
			heading_path: heading.map(|h| vec![h.to_string()]).unwrap_or_default(),
			text: text.to_string(),
			score: 0.0,
			line_start: 1,
			line_end: 1,
		}
	}

	#[test]
	fn context_block_numbers_chunks_and_includes_path() {
		let chunks = vec![
			chunk("notes/a.md", Some("Intro"), "first chunk"),
			chunk("notes/b.md", None, "second chunk"),
		];
		let block = build_context_block(&chunks);
		assert!(block.contains("[1] Note: notes/a.md"));
		assert!(block.contains("(section: Intro)"));
		assert!(block.contains("[2] Note: notes/b.md"));
		assert!(block.contains("first chunk"));
		assert!(block.contains("second chunk"));
		// No section line when heading is absent.
		let between_b = &block[block.find("[2] Note: notes/b.md").unwrap()..];
		assert!(!between_b.contains("(section:"));
	}

	#[test]
	fn user_message_appends_question_after_context() {
		let chunks = vec![chunk("a.md", None, "alpha")];
		let msg = build_user_message("What is alpha?", &chunks);
		let q_pos = msg.find("Question:").expect("Question marker present");
		let ctx_pos = msg.find("Context").expect("Context marker present");
		assert!(ctx_pos < q_pos, "context must precede question");
		assert!(msg.ends_with("Question: What is alpha?"));
	}

	#[test]
	fn context_block_handles_empty_chunks() {
		let block = build_context_block(&[]);
		// Header + closing separator, no body.
		assert!(block.starts_with("Context"));
		assert!(block.ends_with("---\n"));
	}
}

