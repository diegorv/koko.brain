/** E2E mock for @tauri-apps/plugin-deep-link */

type Handler = (urls: string[]) => void;

const handlers = new Set<Handler>();

export async function onOpenUrl(handler: Handler): Promise<() => void> {
	handlers.add(handler);
	return () => {
		handlers.delete(handler);
	};
}

/** No cold-start URL: specs deliver URLs while the app runs, through `window.__e2e.deepLink`. */
export async function getCurrent(): Promise<string[] | null> {
	return null;
}

/**
 * Control API exposed on `window.__e2e.deepLink`: delivers `urls` to every
 * `onOpenUrl` handler, the way the OS hands a `kokobrain://` URL to the
 * running app. Throws when no handler is registered, so a spec fails at the
 * delivery instead of timing out on an assertion when the app's listener is
 * not wired.
 */
const deepLinkAPI = {
	open(urls: string[]) {
		if (handlers.size === 0) throw new Error('[e2e mock] No deep-link onOpenUrl handler registered');
		for (const handler of handlers) handler(urls);
	},
};

/** Type of `window.__e2e.deepLink`. */
export type E2eDeepLink = typeof deepLinkAPI;

// Guard for SSR
if (typeof window !== 'undefined') {
	(window as any).__e2e = (window as any).__e2e || {};
	(window as any).__e2e.deepLink = deepLinkAPI;
}
