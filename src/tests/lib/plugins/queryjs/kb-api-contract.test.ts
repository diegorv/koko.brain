// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { KBAPI } from '#lib/plugins/queryjs/kb-api.js';
import { KBUI } from '#lib/plugins/queryjs/kb-ui.js';
import { DataArray } from '#lib/plugins/queryjs/data-array.js';
import { KBDateTime } from '#lib/plugins/queryjs/kb-datetime.js';
import { buildKBPage } from '#lib/plugins/queryjs/queryjs.logic.js';
import type {
	DataArrayV1,
	KBApiV1,
	KBDateTimeV1,
	KBUIV1,
} from '#lib/plugins/queryjs/contract/kb-api.v1.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
}));

/**
 * Freezes the script-visible surface of the QueryJS API (contract v1, see
 * `contract/kb-api.v1.ts`). A failure here means user scripts see a different
 * API: either restore the member, or follow the version policy in
 * help/documentation/13-queryjs.md ("API version and compatibility").
 *
 * Each `*_PUBLIC` object is checked against its contract interface with
 * `satisfies Record<keyof X, true>`, so `pnpm check` fails when the list and
 * the contract drift; the runtime assertions fail when the class drifts.
 */

const PATH = '/vault/notes/alpha.md';

function makeAPI(): KBAPI {
	const record = buildNoteRecord(PATH, '# Alpha\n', 1700000000000, 1690000000000, 10);
	return new KBAPI({
		container: document.createElement('div'),
		propertyIndex: new Map<string, PropertyIndexRecord>([[PATH, record]]),
		entries: [entryV2(PATH)],
		propertyIndexVersion: 0,
		currentFilePath: PATH,
		vaultPath: '/vault',
		systemFolder: '_system',
		loadScript: vi.fn().mockResolvedValue(''),
	});
}

/** Prototype member names (getters included) plus the instance's own keys, sorted. */
function surface(instance: object): string[] {
	const proto = Object.getPrototypeOf(instance) as object;
	const names = [...Reflect.ownKeys(proto), ...Reflect.ownKeys(instance)]
		.filter((k) => k !== 'constructor')
		.map(String);
	return [...new Set(names)].sort();
}

function expected(publicMembers: object, internal: string[]): string[] {
	return [...Reflect.ownKeys(publicMembers).map(String), ...internal].sort();
}

const KBAPI_PUBLIC = {
	version: true,
	container: true,
	ui: true,
	pages: true,
	pagePaths: true,
	current: true,
	page: true,
	date: true,
	tryDate: true,
	getDaysInRange: true,
	array: true,
	isArray: true,
	fileLink: true,
	compare: true,
	equal: true,
	number: true,
	progressBar: true,
	el: true,
	paragraph: true,
	header: true,
	span: true,
	list: true,
	table: true,
	taskList: true,
	view: true,
} satisfies Record<keyof KBApiV1, true>;

/** Called by the queryjs widget, or TS-private; not part of the contract. */
const KBAPI_INTERNAL = [
	'awaitAllPending',
	'runView',
	'ensureCache',
	'renderValue',
	'resolveScriptPath',
	'propertyIndex',
	'entries',
	'propertyIndexVersion',
	'currentFilePath',
	'vaultPath',
	'systemFolder',
	'loadScript',
	'_ui',
	'_pageSet',
	'_pendingViews',
];

const KBUI_PUBLIC = {
	cards: true,
	progressBar: true,
	heatmap: true,
	tagCloud: true,
	tags: true,
	statusCards: true,
	timeline: true,
	table: true,
	chart: true,
	heatmapCalendar: true,
	yearlyCalendar: true,
} satisfies Record<keyof KBUIV1, true>;

const KBUI_INTERNAL = ['container', 'renderValue', 'resolveCardColor'];

const DATA_ARRAY_PUBLIC = {
	where: true,
	filter: true,
	whereTag: true,
	whereDate: true,
	byDate: true,
	map: true,
	flatMap: true,
	sort: true,
	sortBy: true,
	groupBy: true,
	distinct: true,
	limit: true,
	slice: true,
	concat: true,
	mutate: true,
	find: true,
	findIndex: true,
	indexOf: true,
	includes: true,
	some: true,
	every: true,
	none: true,
	first: true,
	last: true,
	to: true,
	into: true,
	values: true,
	array: true,
	length: true,
	forEach: true,
	sum: true,
	avg: true,
	min: true,
	max: true,
	stats: true,
	countBy: true,
	reduce: true,
	join: true,
	toString: true,
	[Symbol.iterator]: true,
} satisfies Record<keyof DataArrayV1<unknown>, true>;

const DATA_ARRAY_INTERNAL = ['_values'];

const KB_DATETIME_PUBLIC = {
	year: true,
	month: true,
	day: true,
	hour: true,
	minute: true,
	ts: true,
	quarter: true,
	weekNumber: true,
	plus: true,
	minus: true,
	toISODate: true,
	toFormat: true,
	hasSame: true,
	startOf: true,
	endOf: true,
	valueOf: true,
	toString: true,
	toJSDate: true,
} satisfies Record<keyof KBDateTimeV1, true>;

const KB_DATETIME_INTERNAL = ['_date'];

describe('KBAPI v1 contract', () => {
	describe('version', () => {
		it('is the integer major 1 on both kb and dv', () => {
			const api = makeAPI();
			const fn = new Function('kb', 'dv', 'return [kb.version, dv.version];');
			expect(fn(api, api)).toEqual([1, 1]);
		});
	});

	describe('surface snapshot', () => {
		it('KBAPI exposes exactly the frozen members', () => {
			expect(surface(makeAPI())).toEqual(expected(KBAPI_PUBLIC, KBAPI_INTERNAL));
		});

		it('KBUI exposes exactly the frozen members', () => {
			const ui = makeAPI().ui;
			expect(ui).toBeInstanceOf(KBUI);
			expect(surface(ui)).toEqual(expected(KBUI_PUBLIC, KBUI_INTERNAL));
		});

		it('DataArray exposes exactly the frozen members', () => {
			expect(surface(new DataArray([1]))).toEqual(
				expected(DATA_ARRAY_PUBLIC, DATA_ARRAY_INTERNAL),
			);
		});

		it('KBDateTime exposes exactly the frozen members', () => {
			expect(surface(new KBDateTime('2026-02-13'))).toEqual(
				expected(KB_DATETIME_PUBLIC, KB_DATETIME_INTERNAL),
			);
		});
	});

	describe('KBPage shape', () => {
		/**
		 * Key -> `typeof value`, with arrays as `'array'`, so a renamed key or a
		 * changed value type (array <-> object included) both fail.
		 */
		function shape(obj: object): Record<string, string> {
			return Object.fromEntries(
				Object.entries(obj)
					.map(([k, v]) => [k, Array.isArray(v) ? 'array' : typeof v] as const)
					.sort(([a], [b]) => a.localeCompare(b)),
			);
		}

		/** A note with no frontmatter: only the keys every page carries. */
		function fixturePage() {
			const record = buildNoteRecord(PATH, '# Alpha\n', 1700000000000, 1690000000000, 10);
			return buildKBPage(record, entryV2(PATH), [PATH]);
		}

		it('freezes the root keys and value types', () => {
			expect(shape(fixturePage())).toEqual({
				archived: 'boolean',
				favorite: 'boolean',
				file: 'object',
				organized: 'boolean',
				tags: 'array',
			});
		});

		it('freezes the file keys and value types', () => {
			expect(shape(fixturePage().file)).toEqual({
				basename: 'string',
				ctime: 'number',
				folder: 'string',
				inlinks: 'array',
				link: 'object',
				mtime: 'number',
				name: 'string',
				outlinks: 'array',
				path: 'string',
				size: 'number',
				tags: 'array',
				tasks: 'array',
			});
		});

		it('keeps file paths absolute and name with its extension', () => {
			const page = fixturePage();
			expect(page.file.path).toBe(PATH);
			expect(page.file.folder).toBe('/vault/notes');
			expect(page.file.name).toBe('alpha.md');
			expect(page.file.basename).toBe('alpha');
		});
	});
});
