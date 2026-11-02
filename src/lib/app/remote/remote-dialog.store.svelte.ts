/** One message dialog the app asked for while running in the browser. */
export interface RemoteDialogRequest {
	/** Dialog title, `null` for none. */
	title: string | null;
	/** The message text. */
	message: string;
	/** `info` / `warning` / `error`, `null` for none. */
	kind: string | null;
	/** Button labels, in order; the last one is the answer on dismiss. */
	buttons: string[];
}

interface Pending extends RemoteDialogRequest {
	resolve: (label: string) => void;
}

/** Requests waiting to be shown, the first one on screen. */
let queue = $state.raw<Pending[]>([]);

/**
 * In-app replacement for the Mac's native message dialogs in the browser
 * (`RemoteDialog.svelte` shows the head of the queue).
 */
export const remoteDialogStore = {
	/** The request on screen, `null` when none. */
	get current(): RemoteDialogRequest | null {
		return queue[0] ?? null;
	},

	/** Queues `request`; resolves with the label of the button picked. */
	open(request: RemoteDialogRequest): Promise<string> {
		return new Promise((resolve) => {
			queue = [...queue, { ...request, resolve }];
		});
	},

	/** Answers the request on screen with `label` and shows the next one. */
	answer(label: string) {
		const [head, ...rest] = queue;
		if (!head) return;
		queue = rest;
		head.resolve(label);
	},

	/** Drops every request unanswered (tests). */
	reset() {
		queue = [];
	},
};
