import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { debug } from '#lib/utils/debug.js';
import { parseThemeCatalog, type CatalogEntry } from './theme-package.logic';

/**
 * The catalog index: every published theme package in one file. The Tauri
 * capability `http:allow-fetch*` is scoped to this repo's raw URLs.
 */
export const THEME_CATALOG_URL = 'https://raw.githubusercontent.com/diegorv/koko.brain-themes/main/index.json';

/** How long the whole catalog request, body included, may take before it is aborted. */
export const THEME_CATALOG_TIMEOUT_MS = 15_000;

/**
 * Fetches and validates the online theme catalog through the Tauri HTTP plugin
 * (the webview CSP does not allow the request). Entries that fail validation
 * are skipped and logged. Rejects on a network error, an HTTP error status, an
 * index that is not a valid catalog, or after `THEME_CATALOG_TIMEOUT_MS`.
 */
export async function fetchThemeCatalog(): Promise<CatalogEntry[]> {
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	// Raced as well as aborted: the abort only asks Rust to cancel, and a
	// stalled connection must still reach the error state.
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			controller.abort();
			reject(new Error('Theme catalog request timed out'));
		}, THEME_CATALOG_TIMEOUT_MS);
	});
	try {
		return await Promise.race([readCatalog(controller.signal), timeout]);
	} finally {
		clearTimeout(timer);
	}
}

async function readCatalog(signal: AbortSignal): Promise<CatalogEntry[]> {
	const response = await tauriFetch(THEME_CATALOG_URL, { signal });
	if (!response.ok) throw new Error(`Theme catalog request failed: HTTP ${response.status}`);
	const result = parseThemeCatalog(await response.text());
	if (!result.ok) throw new Error(result.error);
	for (const reason of result.skipped) debug('THEME-CATALOG', `skipped catalog entry: ${reason}`);
	return result.entries;
}
