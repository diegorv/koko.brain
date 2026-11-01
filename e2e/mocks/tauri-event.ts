import type { EventMap } from '../../src/lib/contracts/events';

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

/**
 * Control API exposed on `window.__e2e.events`: delivers a Rust-emitted event
 * to every `listen` handler. Typed against `EventMap`, so a mock emit with the
 * wrong payload shape fails `pnpm check`.
 */
const eventsAPI = {
	emit<K extends keyof EventMap>(event: K, payload: EventMap[K]) {
		const handlers = listeners.get(event) || [];
		for (const handler of handlers) {
			handler({ payload });
		}
	},
};

export type UnlistenFn = () => void;

/** Type of `window.__e2e.events`, for mocks that emit through the bus. */
export type E2eEventBus = typeof eventsAPI;

// Guard for SSR
if (typeof window !== 'undefined') {
	(window as any).__e2e = (window as any).__e2e || {};
	(window as any).__e2e.events = eventsAPI;
}
