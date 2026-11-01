import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn() }));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { readTextFile } from '@tauri-apps/plugin-fs';
import { appendLog } from '#lib/utils/log.service.js';
import { countViewNotes } from '#lib/features/rail-shell/view-lens.service.js';
import { resolveViewLens, queryViewLens } from '#lib/features/rail-shell/lens.logic.js';
import { clearAllViewParseCache } from '#lib/features/type-definitions/view-parse-cache.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import { parseCollectionYaml } from '#lib/features/collection/yaml-parser.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import type { LensContext } from '#lib/features/rail-shell/rail-shell.types.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const VAULT = '/vault';
const PROJECTS = `${VAULT}/Projects.view`;
const PEOPLE = `${VAULT}/People.view`;
const BROKEN = `${VAULT}/Broken.view`;

const VIEW_FILES: Record<string, string> = {
	[PROJECTS]: "filters: '_type == \"Project\"'\nviews:\n  - type: table\n    name: Projects\n",
	[PEOPLE]: "filters: '_type == \"Person\"'\nviews:\n  - type: table\n    name: People\n",
	[BROKEN]: 'views: [',
};

const NOTES: Record<string, string> = {
	[`${VAULT}/a.md`]: '---\n_type: Project\n---\n',
	[`${VAULT}/b.md`]: '---\n_type: Project\n---\n',
	[`${VAULT}/old.md`]: '---\n_type: Project\n_archived: true\n---\n',
	[`${VAULT}/p.md`]: '---\n_type: Person\n---\n',
};
const index = new Map<string, PropertyIndexRecord>(Object.entries(NOTES).map(([p, c]) => [p, buildNoteRecord(p, c)]));
const entries = [
	entryV2(`${VAULT}/a.md`, { isA: 'Project' }),
	entryV2(`${VAULT}/b.md`, { isA: 'Project' }),
	entryV2(`${VAULT}/old.md`, { isA: 'Project', archived: true }),
	entryV2(`${VAULT}/p.md`, { isA: 'Person' }),
];
const ctx: LensContext = { entries, vaultPath: VAULT, systemFolder: '_system', typeMetadataMap: buildTypeMetadataMap(entries), fileTree: [] };

describe('countViewNotes', () => {
	beforeEach(() => {
		clearAllViewParseCache();
		vi.mocked(readTextFile).mockReset();
		vi.mocked(readTextFile).mockImplementation(async (path) => {
			const content = VIEW_FILES[String(path)];
			if (content === undefined) throw new Error('not found');
			return content;
		});
	});

	it('counts each view the way its list resolves it', async () => {
		const counts = await countViewNotes([PROJECTS, PEOPLE], ctx, index);
		expect(counts).toEqual(new Map([[PROJECTS, 2], [PEOPLE, 1]]));
		const parsed = parseCollectionYaml(VIEW_FILES[PROJECTS]);
		if (!parsed.success) throw new Error('fixture');
		expect(counts.get(PROJECTS)).toBe(resolveViewLens(PROJECTS, queryViewLens(parsed.definition, null, index), ctx).notes.length);
	});

	it('re-reads the file, so an edit on disk shows in the count', async () => {
		const original = VIEW_FILES[PROJECTS];
		await countViewNotes([PROJECTS], ctx, index);
		VIEW_FILES[PROJECTS] = VIEW_FILES[PEOPLE];
		try {
			expect((await countViewNotes([PROJECTS], ctx, index)).get(PROJECTS)).toBe(1);
		} finally {
			VIEW_FILES[PROJECTS] = original;
		}
	});

	it('leaves out a view that cannot be read or parsed', async () => {
		const counts = await countViewNotes([BROKEN, `${VAULT}/Missing.view`, PEOPLE], ctx, index);
		expect(counts).toEqual(new Map([[PEOPLE, 1]]));
		expect(appendLog).toHaveBeenCalledWith('VIEW-LENS', expect.stringContaining('Missing.view'));
	});

	it('is empty without views', async () => {
		expect(await countViewNotes([], ctx, index)).toEqual(new Map());
	});
});
