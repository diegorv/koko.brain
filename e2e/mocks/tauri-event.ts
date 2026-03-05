type Handler = (event: { payload: unknown }) => void;

const listeners = new Map<string, Handler[]>();

export async function listen(event: string, handler: Handler): Promise<() => void> {
	const handlers = listeners.get(event) || [];
	handlers.push(handler);
	listeners.set(event, handlers);

	return () => {
		const current = listeners.get(event);
		if (current) {
			listeners.set(event, current.filter((h) => h !== handler));
		}
	};
}

export async function emit(_event: string, _payload?: unknown): Promise<void> {
	// no-op
}

// Expose control API on window for Playwright
const eventsAPI = {
	emit(event: string, payload?: unknown) {
		const handlers = listeners.get(event) || [];
		for (const handler of handlers) {
			handler({ payload });
		}
	},
};

export type UnlistenFn = () => void;

// Guard for SSR
if (typeof window !== 'undefined') {
	(window as any).__e2e = (window as any).__e2e || {};
	(window as any).__e2e.events = eventsAPI;
}
