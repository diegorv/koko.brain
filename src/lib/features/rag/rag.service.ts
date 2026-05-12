import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { ragStore } from './rag.store.svelte';
import type { RagChatDone, RagConfigStatus, RetrievedChunk } from './rag.types';

/**
 * Fetches the RAG configuration health-check used by the chat panel to
 * branch between setup CTA and chat input. Never throws — config errors
 * are surfaced via the returned struct.
 */
export async function fetchRagConfigStatus(vaultPath: string): Promise<RagConfigStatus> {
	return invoke<RagConfigStatus>('rag_config_status', { vaultPath });
}

/**
 * Runs retrieval only (no LLM). Useful for source preview.
 */
export async function ragSearch(vaultPath: string, query: string): Promise<RetrievedChunk[]> {
	return invoke<RetrievedChunk[]>('rag_search', { vaultPath, query });
}

/**
 * Starts a full `rag_chat`. Wires up the four streaming event listeners
 * (sources, token, done, error) onto `ragStore`, kicks off the invoke,
 * and returns a cleanup function that unlistens all four. The caller
 * should call cleanup when the panel unmounts or before starting another
 * chat to avoid duplicate listeners.
 */
export async function startRagChat(
	vaultPath: string,
	query: string,
): Promise<UnlistenFn> {
	ragStore.startNewChat();

	const unlisteners: UnlistenFn[] = [];

	unlisteners.push(
		await listen<RetrievedChunk[]>('rag-chat-sources', (event) => {
			ragStore.setSources(event.payload);
		}),
	);
	unlisteners.push(
		await listen<string>('rag-chat-token', (event) => {
			ragStore.appendToken(event.payload);
		}),
	);
	unlisteners.push(
		await listen<RagChatDone>('rag-chat-done', () => {
			ragStore.finish();
		}),
	);
	unlisteners.push(
		await listen<string>('rag-chat-error', (event) => {
			ragStore.fail(event.payload);
		}),
	);

	// Fire-and-forget the invoke. Errors are propagated via the
	// `rag-chat-error` event AND the Promise rejection; mirror both into
	// the store so the UI always reflects them.
	invoke('rag_chat', { vaultPath, query }).catch((err: unknown) => {
		const message = err instanceof Error ? err.message : String(err);
		ragStore.fail(message);
	});

	return async () => {
		await Promise.all(unlisteners.map((u) => u()));
	};
}
