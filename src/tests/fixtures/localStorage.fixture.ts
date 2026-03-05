/**
 * localStorage stub for vitest (node env).
 * Required when any test imports vaultStore, which reads localStorage at top-level.
 *
 * Usage: call setupLocalStorage() BEFORE importing modules that use vaultStore.
 * Call clearLocalStorage() in afterEach/beforeEach to reset state between tests.
 */
const storage = new Map<string, string>();

export function setupLocalStorage(): void {
	Object.defineProperty(globalThis, 'localStorage', {
		value: {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
			removeItem: (key: string) => storage.delete(key),
			clear: () => storage.clear(),
		},
		writable: true,
		configurable: true,
	});
}

export function clearLocalStorage(): void {
	storage.clear();
}
