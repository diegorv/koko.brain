// `updateViewToolbarKey` against the real `view-parse-cache`, `yaml-parser`
// and `.view` writer: only the disk and IPC are mocked.
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
import { updateViewToolbarKey, ViewWriteConflict } from '#lib/features/type-definitions/type-definitions.service.js';
import { canonicalToolbarValue } from '#lib/features/type-definitions/type-note-list.logic.js';
import { clearAllViewParseCache, getCachedViewDefinition } from '#lib/features/type-definitions/view-parse-cache.js';
import { parseCollectionYaml } from '#lib/features/collection/yaml-parser.js';
import { resetHooks } from '#lib/core/editor/editor.hooks.js';

const VIEW = '/vault/Projects.view';
const ORIGINAL = "_sidebar_label: Projects\nfilters:\n  and:\n    - status == 'open'\nviews:\n  - type: table\n    name: Projects\n";

/** In-memory disk behind the plugin-fs mocks. */
const files: Record<string, string> = {};

describe('updateViewToolbarKey', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetHooks();
		clearAllViewParseCache();
		for (const p of Object.keys(files)) delete files[p];
		files[VIEW] = ORIGINAL;
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

	it('writes only its key and resolves to the definition the cache now serves, with no further read', async () => {
		await getCachedViewDefinition(VIEW);
		const sort = [{ column: 'due', direction: 'ASC' as const }];

		const definition = await updateViewToolbarKey(VIEW, 'sort', sort, canonicalToolbarValue('sort', []));
		const readsAfterWrite = vi.mocked(readTextFile).mock.calls.length;
		const cached = await getCachedViewDefinition(VIEW);

		expect(definition.views[0].sort).toEqual(sort);
		expect(definition.filters).toEqual({ and: ["status == 'open'"] });
		expect(vi.mocked(readTextFile).mock.calls.length).toBe(readsAfterWrite);
		expect(cached.success && cached.definition).toEqual(definition);
		expect(parseCollectionYaml(files[VIEW])).toEqual({ success: true, definition });
	});

	it('rejects with ViewWriteConflict and writes nothing when its key is no longer the base', async () => {
		const staleBase = canonicalToolbarValue('filters', "status == 'done'");

		const write = updateViewToolbarKey(VIEW, 'filters', "status == 'blocked'", staleBase);

		await expect(write).rejects.toBeInstanceOf(ViewWriteConflict);
		await expect(write).rejects.toMatchObject({ path: VIEW, key: 'filters' });
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(files[VIEW]).toBe(ORIGINAL);
	});

	it('rejects, writing nothing, when the file does not parse as a .view', async () => {
		files[VIEW] = 'views: [';

		await expect(updateViewToolbarKey(VIEW, 'sort', [], canonicalToolbarValue('sort', []))).rejects.toThrow(/Invalid YAML/);
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(files[VIEW]).toBe('views: [');
	});
});
