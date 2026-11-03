import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const { mockFetch } = vi.hoisted(() => ({
	mockFetch: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-http', () => ({
	fetch: mockFetch,
}));

vi.mock('#lib/core/settings/sentry.service.js', () => ({
	captureSentryException: vi.fn(),
}));

import { fetchThemeCatalog, THEME_CATALOG_TIMEOUT_MS, THEME_CATALOG_URL } from '#lib/core/settings/theme-catalog.service.js';
import { coreFromColors } from '#lib/core/settings/theme-builder.logic.js';
import { KOKOBRAIN_DEFAULT_THEME } from '#lib/core/settings/theme.logic.js';
import type { ThemePackage } from '#lib/core/settings/theme-package.logic.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { captureSentryException } from '#lib/core/settings/sentry.service.js';

const pkg: ThemePackage = {
	schemaVersion: 1,
	id: 'ocean-breeze',
	name: 'Ocean Breeze',
	version: '1.0.0',
	author: 'someone',
	palette: coreFromColors(KOKOBRAIN_DEFAULT_THEME.colors),
};

/** Makes the HTTP plugin answer with `body` and `status`. */
function respond(body: string, status = 200) {
	mockFetch.mockResolvedValue({ ok: status >= 200 && status < 300, status, text: () => Promise.resolve(body) });
}

describe('fetchThemeCatalog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches the index from the themes repo and returns its entries', async () => {
		respond(JSON.stringify({ schemaVersion: 1, themes: [pkg] }));

		const entries = await fetchThemeCatalog();

		expect(mockFetch).toHaveBeenCalledWith(
			'https://raw.githubusercontent.com/diegorv/koko.brain-themes/main/index.json',
			{ signal: expect.any(AbortSignal) },
		);
		expect(THEME_CATALOG_URL).toBe('https://raw.githubusercontent.com/diegorv/koko.brain-themes/main/index.json');
		expect(entries).toEqual([{ kind: 'package', pkg }]);
	});

	it('rejects when the request fails', async () => {
		mockFetch.mockRejectedValue(new Error('error sending request'));
		await expect(fetchThemeCatalog()).rejects.toThrow('error sending request');
	});

	it('rejects and aborts the request when it stalls past the timeout', async () => {
		vi.useFakeTimers();
		try {
			let signal: AbortSignal | undefined;
			mockFetch.mockImplementation((_url: string, init: { signal: AbortSignal }) => {
				signal = init.signal;
				return new Promise(() => {});
			});

			const result = fetchThemeCatalog();
			const assertion = expect(result).rejects.toThrow('Theme catalog request timed out');
			await vi.advanceTimersByTimeAsync(THEME_CATALOG_TIMEOUT_MS);

			await assertion;
			expect(signal?.aborted).toBe(true);
		} finally {
			vi.useRealTimers();
		}
	});

	it('times out a response body that stalls after the headers', async () => {
		vi.useFakeTimers();
		try {
			mockFetch.mockResolvedValue({ ok: true, status: 200, text: () => new Promise(() => {}) });

			const result = fetchThemeCatalog();
			const assertion = expect(result).rejects.toThrow('timed out');
			await vi.advanceTimersByTimeAsync(THEME_CATALOG_TIMEOUT_MS);

			await assertion;
		} finally {
			vi.useRealTimers();
		}
	});

	it('rejects on an HTTP error status', async () => {
		respond('Not Found', 404);
		await expect(fetchThemeCatalog()).rejects.toThrow('HTTP 404');
	});

	it('rejects an index that is not JSON', async () => {
		respond('<html>oops</html>');
		await expect(fetchThemeCatalog()).rejects.toThrow('not valid JSON');
	});

	it('skips an invalid entry, returns the rest, and logs it as debug without reporting to Sentry', async () => {
		settingsStore.reset();
		settingsStore.updateDebugMode(true);
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const evil = { ...pkg, id: 'evil', name: 'Evil', palette: { ...pkg.palette, editorBg: 'url(https://x.test/p)' } };
		respond(JSON.stringify({ schemaVersion: 1, themes: [evil, pkg] }));

		const entries = await fetchThemeCatalog();

		expect(entries).toEqual([{ kind: 'package', pkg }]);
		expect(logSpy).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('evil: palette.editorBg'));
		expect(errorSpy).not.toHaveBeenCalled();
		expect(captureSentryException).not.toHaveBeenCalled();
		logSpy.mockRestore();
		errorSpy.mockRestore();
		settingsStore.reset();
	});

	it('returns an entry with a newer schemaVersion as too new', async () => {
		respond(JSON.stringify({ schemaVersion: 1, themes: [{ schemaVersion: 2, id: 'future', name: 'Future', version: '1.0.0', author: 'a' }] }));

		const entries = await fetchThemeCatalog();

		expect(entries).toEqual([
			{ kind: 'too-new', info: { schemaVersion: 2, id: 'future', name: 'Future', version: '1.0.0', author: 'a' } },
		]);
	});
});

describe('HTTP capability', () => {
	const THEMES_SCOPE = 'https://raw.githubusercontent.com/diegorv/koko.brain-themes/**';

	it('lets the HTTP plugin reach the catalog repo and no other raw.githubusercontent.com path', () => {
		const capability = JSON.parse(readFileSync(join(process.cwd(), 'src-tauri/capabilities/default.json'), 'utf8'));
		const http = (capability.permissions as unknown[]).filter(
			(p): p is { identifier: string; allow: { url: string }[] } =>
				typeof p === 'object' && p !== null && String((p as { identifier: string }).identifier).startsWith('http:'),
		);
		const fetchPermission = http.find((p) => p.identifier === 'http:allow-fetch');
		expect(fetchPermission?.allow.map((a) => a.url)).toContain(THEMES_SCOPE);
		for (const permission of http) {
			const raw = permission.allow.map((a) => a.url).filter((url) => new URL(url).hostname === 'raw.githubusercontent.com');
			expect(raw, permission.identifier).toEqual([THEMES_SCOPE]);
		}
		expect(THEME_CATALOG_URL.startsWith(THEMES_SCOPE.slice(0, -2))).toBe(true);
	});
});
