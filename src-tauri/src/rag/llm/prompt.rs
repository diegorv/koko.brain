//! Shared prompt construction for every LLM provider.
//!
//! Keeping `SYSTEM_PROMPT` and the context-block format in one place ensures
//! the user gets identical citation behavior whether they're routed through
//! the OpenAI-compatible HTTP client or the Claude CLI subprocess.

use crate::rag::retrieval::RetrievedChunk;

pub const SYSTEM_PROMPT: &str = "You are an assistant answering questions based ONLY on the user's personal notes provided as context. Follow these rules strictly:

1. Use ONLY the information in the provided context. If the context does not contain the answer, say so explicitly. Do not use outside knowledge.
2. Cite sources inline using the format [path/to/note.md] after each statement that uses information from a specific note. Use the exact path shown in the context block.
3. If the answer requires combining information from multiple notes, do so but cite each source.
4. Respond in the same language as the question (Portuguese by default).
5. Be concise. Do not pad the answer with restating the question or boilerplate.";

/// Renders the retrieved chunks as the context block of the user message.
/// Path + heading are exposed so the model can cite them verbatim.
pub fn build_context_block(chunks: &[RetrievedChunk]) -> String {
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

pub fn build_user_message(query: &str, chunks: &[RetrievedChunk]) -> String {
	format!("{}\nQuestion: {}", build_context_block(chunks), query)
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
		assert!(block.starts_with("Context"));
		assert!(block.ends_with("---\n"));
	}
}
