/**
 * One chunk surfaced by the retrieval pipeline. Mirrors the Rust
 * `RetrievedChunk` struct (camelCase JSON).
 */
export interface RetrievedChunk {
	path: string;
	headingPath: string[];
	text: string;
	score: number;
	lineStart: number;
	lineEnd: number;
}

/**
 * Health-check payload returned by `rag_config_status`. The chat panel
 * uses these flags to decide between the setup CTA and the chat input.
 */
export interface RagConfigStatus {
	configExists: boolean;
	configValid: boolean;
	apiKeyResolved: boolean;
	error: string | null;
}

/**
 * Payload of the terminal `rag-chat-done` event.
 */
export interface RagChatDone {
	tokensEmitted: number;
	sourcesCount: number;
}

/**
 * Payload of the reranker download progress event.
 */
export interface RerankerProgress {
	phase: string;
	current: number;
	total: number;
	message: string;
}
