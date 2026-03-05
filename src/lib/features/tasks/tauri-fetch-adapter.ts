import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import type { CustomFetch, CustomFetchResponse } from '@doist/todoist-api-typescript';

/**
 * Creates a CustomFetch adapter for Tauri's HTTP plugin.
 *
 * Bridges Tauri's `fetch` (which bypasses CORS) to the standard
 * CustomFetch interface expected by the Todoist API SDK.
 * This is the Tauri equivalent of the Obsidian adapter in the SDK.
 */
export function createTauriFetchAdapter(): CustomFetch {
	return async (
		url: string,
		options?: RequestInit & { timeout?: number },
	): Promise<CustomFetchResponse> => {
		const response = await tauriFetch(url, options);
		return {
			ok: response.ok,
			status: response.status,
			statusText: response.statusText,
			headers: Object.fromEntries(response.headers.entries()),
			text: () => response.text(),
			json: () => response.json(),
		};
	};
}
