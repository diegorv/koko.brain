// `updateViewQuery` against the real `view-parse-cache` and `yaml-parser`:
// `type-definitions.service.test.ts` mocks both, so it cannot show that the
// cache holds the patched definition after the write.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readDir: vi.fn(),
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { updateViewQuery } from '#lib/features/type-definitions/type-definitions.service.js';
import { clearAllViewParseCache, getCachedViewDefinition } from '#lib/features/type-definitions/view-parse-cache.js';
import { resetHooks } from '#lib/core/editor/editor.hooks.js';

const VIEW = '/vault/Projects.view';

/** In-memory disk behind the plugin-fs mocks. */
const files: Record<string, string> = {};

describe('updateViewQuery parse cache', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetHooks();
		clearAllViewParseCache();
		for (const p of Object.keys(files)) delete files[p];
		files[VIEW] = '_sidebar_label: Projects\nviews:\n  - type: table\n    name: Projects\n';
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			const content = files[String(p)];
			if (content === undefined) throw new Error(`not found: ${String(p)}`);
			return content;
		});
		vi.mocked(writeTextFile).mockImplementation(async (p, content) => {
			files[String(p)] = String(content);
		});
		vi.mocked(exists).mockImplementation(async (p) => files[String(p)] !== undefined);
		vi.mocked(invoke).mockResolvedValue(undefined as never);
	});

	afterEach(() => {
		clearAllViewParseCache();
		resetHooks();
	});

	it('serves the patched definition from the cache with no further disk read', async () => {
		const before = await getCachedViewDefinition(VIEW);
		expect(before.success && before.definition.filters).toBeFalsy();

		await updateViewQuery(VIEW, { filters: "status == 'active'" });
		const readsAfterWrite = vi.mocked(readTextFile).mock.calls.length;

		const after = await getCachedViewDefinition(VIEW);

		expect(vi.mocked(readTextFile).mock.calls.length).toBe(readsAfterWrite);
		expect(after.success).toBe(true);
		expect(after.success && after.definition.filters).toBe("status == 'active'");
	});
});
