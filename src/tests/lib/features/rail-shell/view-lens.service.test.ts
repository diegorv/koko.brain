import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn() }));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { readTextFile } from '@tauri-apps/plugin-fs';
import { appendLog } from '#lib/utils/log.service.js';
import { countViewNotes } from '#lib/features/rail-shell/view-lens.service.js';
import { resolveViewLens, queryViewLens, viewLoadFromQuery } from '#lib/features/rail-shell/lens.logic.js';
import { clearAllViewParseCache } from '#lib/features/type-definitions/view-parse-cache.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import { parseCollectionYaml } from '#lib/features/collection/yaml-parser.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import type { LensContext } from '#lib/features/rail-shell/rail-shell.types.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';
import { RECENT_NEWEST_THREE, RECENT_VIEW, RECENT_VIEW_YAML, recentEntries, recentIndex } from '../../../fixtures/recent-view.fixture';

const VAULT = '/vault';
const PROJECTS = `${VAULT}/Projects.view`;
const PEOPLE = `${VAULT}/People.view`;
const BROKEN = `${VAULT}/Broken.view`;
const ALL = `${VAULT}/All.view`;
const BAD_FILTER = `${VAULT}/BadFilter.view`;

const VIEW_FILES: Record<string, string> = {
	[PROJECTS]: "filters: '_type == \"Project\"'\nviews:\n  - type: table\n    name: Projects\n",
	[PEOPLE]: "filters: '_type == \"Person\"'\nviews:\n  - type: table\n    name: People\n",
	[BROKEN]: 'views: [',
	[ALL]: 'views:\n  - type: table\n    name: All\n',
	[BAD_FILTER]: "filters: \"status = 'active'\"\nviews:\n  - type: table\n    name: Bad\n",
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
		expect(counts).toEqual(new Map([[PROJECTS, { count: 2 }], [PEOPLE, { count: 1 }]]));
		const parsed = parseCollectionYaml(VIEW_FILES[PROJECTS]);
		if (!parsed.success) throw new Error('fixture');
		expect(counts.get(PROJECTS)).toEqual({ count: resolveViewLens(PROJECTS, viewLoadFromQuery(queryViewLens(parsed.definition, null, index, PROJECTS, ctx)), ctx).notes.length });
	});

	it('counts the view _rail_view names, not the first view', async () => {
		const RAIL = `${VAULT}/Rail.view`;
		VIEW_FILES[RAIL] = "_rail_view: People\nviews:\n  - type: table\n    name: Projects\n    filters: '_type == \"Project\"'\n  - type: table\n    name: People\n    filters: '_type == \"Person\"'\n";
		try {
			expect(await countViewNotes([RAIL], ctx, index)).toEqual(new Map([[RAIL, { count: 1 }]]));
			VIEW_FILES[RAIL] = VIEW_FILES[RAIL].replace('_rail_view: People', '_rail_view: Nobody');
			expect(await countViewNotes([RAIL], ctx, index)).toEqual(
				new Map([[RAIL, { count: 2, railViewNote: 'Ignored key _rail_view: "Nobody" names no view; the first view runs' }]]),
			);
		} finally {
			delete VIEW_FILES[RAIL];
		}
	});

	it('counts the row set of a limited view: the three newest plain notes, not the first three in the index', async () => {
		VIEW_FILES[RECENT_VIEW] = RECENT_VIEW_YAML;
		try {
			const recent = recentEntries();
			const recentCtx: LensContext = { ...ctx, entries: recent, typeMetadataMap: buildTypeMetadataMap(recent) };
			const counts = await countViewNotes([RECENT_VIEW], recentCtx, recentIndex());
			expect(counts.get(RECENT_VIEW)).toEqual({ count: RECENT_NEWEST_THREE.length });
			const parsed = parseCollectionYaml(RECENT_VIEW_YAML);
			if (!parsed.success) throw new Error('fixture');
			const lens = resolveViewLens(RECENT_VIEW, viewLoadFromQuery(queryViewLens(parsed.definition, null, recentIndex(), RECENT_VIEW, recentCtx)), recentCtx);
			expect(lens.notes.map((n) => n.path)).toEqual(RECENT_NEWEST_THREE);
		} finally {
			delete VIEW_FILES[RECENT_VIEW];
		}
	});

	it('leaves a type definition the filter matches out of the count', async () => {
		const DEF = `${VAULT}/types/Project.md`;
		const withDef = new Map(index);
		withDef.set(DEF, buildNoteRecord(DEF, '---\n_type: Type\n---\n'));
		const defCtx: LensContext = { ...ctx, entries: [...entries, entryV2(DEF, { isA: 'Type' })] };
		// All matches every record: a, b, p and the definition; old is archived.
		expect((await countViewNotes([ALL], defCtx, withDef)).get(ALL)).toEqual({ count: 3 });
	});

	it('re-reads the file, so an edit on disk shows in the count', async () => {
		const original = VIEW_FILES[PROJECTS];
		await countViewNotes([PROJECTS], ctx, index);
		VIEW_FILES[PROJECTS] = VIEW_FILES[PEOPLE];
		try {
			expect((await countViewNotes([PROJECTS], ctx, index)).get(PROJECTS)).toEqual({ count: 1 });
		} finally {
			VIEW_FILES[PROJECTS] = original;
		}
	});

	it("gives the parser's or the read's message for a view that cannot be parsed or read", async () => {
		const counts = await countViewNotes([BROKEN, `${VAULT}/Missing.view`, PEOPLE], ctx, index);
		const parsed = parseCollectionYaml(VIEW_FILES[BROKEN]);
		if (parsed.success) throw new Error('fixture parses');
		expect(counts).toEqual(
			new Map([
				[BROKEN, { error: parsed.error }],
				[`${VAULT}/Missing.view`, { error: 'Could not read the view: not found' }],
				[PEOPLE, { count: 1 }],
			]),
		);
		expect(appendLog).toHaveBeenCalledWith('VIEW-LENS', expect.stringContaining('Missing.view'));
	});

	it('gives the filter error, not a count of 0, for a view whose filter does not parse', async () => {
		const entry = (await countViewNotes([BAD_FILTER], ctx, index)).get(BAD_FILTER);
		expect(entry).toEqual({ error: expect.stringContaining("status = 'active'") });
	});

	it('leaves .view files out of the count of an unfiltered view', async () => {
		// `.view` files are indexed like notes (raw YAML as frontmatter), so an
		// unfiltered query matches them, the counted view itself included.
		const withViews = new Map(index);
		withViews.set(ALL, buildNoteRecord(ALL, `---\n${VIEW_FILES[ALL]}---\n`));
		withViews.set(PROJECTS, buildNoteRecord(PROJECTS, `---\n${VIEW_FILES[PROJECTS]}---\n`));
		const viewEntries = [...entries, entryV2(ALL), entryV2(PROJECTS)];
		const viewCtx: LensContext = { ...ctx, entries: viewEntries, typeMetadataMap: buildTypeMetadataMap(viewEntries) };
		expect((await countViewNotes([ALL], viewCtx, withViews)).get(ALL)).toEqual({ count: 3 });
	});

	describe('the _rail_view note, read from the parsed definition', () => {
		const RAIL = `${VAULT}/Rail.view`;
		const body = (name: string) => `_rail_view: ${name}\nviews:\n  - type: table\n    name: Table\n  - type: table\n    name: Board\n`;
		const NOTE = 'Ignored key _rail_view: "Bord" names no view; the first view runs';

		async function count(yaml: string) {
			VIEW_FILES[RAIL] = yaml;
			try {
				return (await countViewNotes([RAIL], ctx, index)).get(RAIL);
			} finally {
				delete VIEW_FILES[RAIL];
			}
		}

		it('carries nothing for a name one of the views has, or no _rail_view', async () => {
			expect(await count(body('Board'))).toEqual({ count: 3 });
			expect(await count('views:\n  - type: table\n    name: Table\n')).toEqual({ count: 3 });
		});

		it('carries the note with the count for a name no view has, matched exactly', async () => {
			expect(await count(body('Bord'))).toEqual({ count: 3, railViewNote: NOTE });
			expect((await count(body('board')))).toEqual({ count: 3, railViewNote: 'Ignored key _rail_view: "board" names no view; the first view runs' });
		});

		it('carries the note with the error of a filter that does not parse', async () => {
			const yaml = `_rail_view: Bord\nfilters: "status = 'active'"\nviews:\n  - type: table\n    name: Table\n`;
			expect(await count(yaml)).toEqual({ error: expect.stringContaining("status = 'active'"), railViewNote: NOTE });
		});

		it('carries the note for a value the parse refuses and the entry cannot see, such as [[Board]] or 0x10', async () => {
			const note = (got: string) => `Ignored key _rail_view: expected the name of one of its views, got ${got}`;
			expect(await count(body('[[Board]]'))).toEqual({ count: 3, railViewNote: note('[["Board"]]') });
			expect(await count(body('0x10'))).toEqual({ count: 3, railViewNote: note('16') });
		});

		it('carries nothing for a view that cannot be parsed, or a blank name the entry reports', async () => {
			const broken = await count('_rail_view: Bord\nviews: [');
			expect(broken).toEqual({ error: expect.any(String) });
			expect(await count(body('""'))).toEqual({ count: 3 });
		});
	});

	it('is empty without views', async () => {
		expect(await countViewNotes([], ctx, index)).toEqual(new Map());
	});
});
