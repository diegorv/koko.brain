import type { RetrievedChunk } from './rag.types';

/** Currently streaming answer text — accumulates `rag-chat-token` deltas. */
let response = $state('');
/** Sources surfaced by the most recent `rag_chat` call. Empty until `rag-chat-sources` fires. */
let sources = $state<RetrievedChunk[]>([]);
/** Whether a `rag_chat` request is in flight. Drives the spinner + disables the input. */
let streaming = $state(false);
/** Last error message, if any. Cleared on each new chat. */
let error = $state<string | null>(null);

export const ragStore = {
	get response() { return response; },
	get sources() { return sources; },
	get streaming() { return streaming; },
	get error() { return error; },

	/** Resets streaming state in preparation for a new chat. */
	startNewChat() {
		response = '';
		sources = [];
		error = null;
		streaming = true;
	},

	appendToken(text: string) {
		response += text;
	},

	setSources(next: RetrievedChunk[]) {
		sources = next;
	},

	finish() {
		streaming = false;
	},

	fail(message: string) {
		error = message;
		streaming = false;
	},

	reset() {
		response = '';
		sources = [];
		error = null;
		streaming = false;
	},
};
