/**
 * E2E mock for `@tauri-apps/api/path`. The real module resolves every
 * directory through `plugin:path|resolve_directory`, which the core mock does
 * not serve; these fixed paths keep the log session and the mobile vault
 * (`documentDir()/kokobrain-vaults/Notes`) on the virtual filesystem.
 */

/** Documents directory: on iOS this is the app container's `Documents/`. */
export const E2E_DOCUMENT_DIR = '/e2e/Documents';

export async function documentDir(): Promise<string> {
	return E2E_DOCUMENT_DIR;
}

export async function appLogDir(): Promise<string> {
	return '/e2e/Logs';
}

export const BaseDirectory = {};
