// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KBAPI, runQueryjsBlock } from '#lib/plugins/queryjs/kb-api.js';
import { DataArray } from '#lib/plugins/queryjs/data-array.js';
import { KBDateTime } from '#lib/plugins/queryjs/kb-datetime.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import type { KBPage } from '#lib/plugins/queryjs/queryjs.types.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { appendLog } from '#lib/utils/log.service.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
}));

vi.mock('#lib/utils/log.service.js', () => ({
	appendLog: vi.fn(),
}));

const platform = vi.hoisted(() => ({ mac: false }));

vi.mock('#lib/utils/platform.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('#lib/utils/platform.js')>();
	return {
		...actual,
		get IS_MAC() {
			return platform.mac;
		},
	};
});

function makeRecord(path: string, basename: string, props?: Record<string, unknown>): PropertyIndexRecord {
	const properties = new Map<string, unknown>(Object.entries(props ?? {}));
	return {
		path,
		name: `${basename}.md`,
		basename,
		folder: path.substring(0, path.lastIndexOf('/')),
		ext: 'md',
		mtime: 1700000000000,
		ctime: 1690000000000,
		size: 100,
		properties,
	};
}

function createAPI(opts?: {
	records?: PropertyIndexRecord[];
	entries?: NoteEntryV2[];
	currentFilePath?: string;
	propertyIndexVersion?: number;
	systemFolder?: string;
}) {
	const records = opts?.records ?? [
		makeRecord('/vault/alpha.md', 'alpha', { status: 'active' }),
		makeRecord('/vault/beta.md', 'beta', { status: 'draft' }),
		makeRecord('/vault/sub/gamma.md', 'gamma'),
	];

	const propertyIndex = new Map<string, PropertyIndexRecord>();
	for (const r of records) propertyIndex.set(r.path, r);

	const entries = opts?.entries ?? [
		entryV2('/vault/alpha.md', { tags: ['journal', 'type/meeting'] }),
		entryV2('/vault/beta.md', { tags: ['journal'] }),
		entryV2('/vault/sub/gamma.md', { tags: ['inline-tag'] }),
	];

	const container = document.createElement('div');

	return new KBAPI({
		container,
		propertyIndex,
		entries,
		currentFilePath: opts?.currentFilePath ?? '/vault/alpha.md',
		propertyIndexVersion: opts?.propertyIndexVersion ?? 0,
		vaultPath: '/vault',
		systemFolder: opts?.systemFolder ?? '_system',
		loadScript: vi.fn().mockResolvedValue('kb.paragraph("loaded")'),
	});
}

function defaultEntries(): NoteEntryV2[] {
	return [
		entryV2('/vault/alpha.md', { tags: ['journal', 'type/meeting'] }),
		entryV2('/vault/beta.md', { tags: ['journal'] }),
		entryV2('/vault/sub/gamma.md', { tags: ['inline-tag'] }),
	];
}

function pageBuilds(): number {
	return vi.mocked(appendLog).mock.calls.filter(([tag, msg]) => tag === 'QJS-PROFILE' && String(msg).startsWith('ensureCache')).length;
}

describe('KBAPI', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('pages', () => {
		it('logs the page-cache build once, with the page count and time', () => {
			const api = createAPI();

			expect(api.pages().length).toBe(3);
			expect(api.pages().length).toBe(3);

			const lines = vi.mocked(appendLog).mock.calls.filter(([tag]) => tag === 'QJS-PROFILE');
			expect(lines).toHaveLength(1);
			expect(lines[0][1]).toMatch(/^ensureCache N=3 \d+\.\dms$/);
		});

		it('two blocks at the same entries snapshot and index version build the pages once', () => {
			const entries = defaultEntries();
			const a = createAPI({ entries, propertyIndexVersion: 7 });
			const b = createAPI({ entries, propertyIndexVersion: 7, currentFilePath: '/vault/beta.md' });

			expect(a.pages().length).toBe(3);
			expect(b.pages().length).toBe(3);
			expect(b.current()?.file.path).toBe('/vault/beta.md');
			expect(b.page('/vault/alpha.md')).toBe(a.page('/vault/alpha.md'));
			expect(pageBuilds()).toBe(1);
		});

		it('rebuilds the pages for a new entries snapshot at the same index version', () => {
			const a = createAPI({ entries: defaultEntries(), propertyIndexVersion: 7 });
			a.pages();
			const b = createAPI({
				entries: [entryV2('/vault/alpha.md', { tags: ['renamed'] }), ...defaultEntries().slice(1)],
				propertyIndexVersion: 7,
			});

			expect(b.page('/vault/alpha.md')?.file.tags).toEqual(['renamed']);
			expect(pageBuilds()).toBe(2);
		});

		it('rebuilds the pages after a property index version bump with the same entries', () => {
			const entries = defaultEntries();
			const a = createAPI({ entries, propertyIndexVersion: 7 });
			a.pages();
			const b = createAPI({
				entries,
				propertyIndexVersion: 8,
				records: [
					makeRecord('/vault/alpha.md', 'alpha', { status: 'done' }),
					makeRecord('/vault/beta.md', 'beta', { status: 'draft' }),
					makeRecord('/vault/sub/gamma.md', 'gamma'),
				],
			});

			expect(b.page('/vault/alpha.md')?.status).toBe('done');
			expect(pageBuilds()).toBe(2);
		});

		it("one block's sort or mutate on its pages() list leaves another block's list order and length alone", () => {
			const entries = defaultEntries();
			const a = createAPI({ entries, propertyIndexVersion: 7 });
			const b = createAPI({ entries, propertyIndexVersion: 7 });
			const listA = a.pages();
			const orderA = listA.map((p) => p.file.path).array();

			const listB = b.pages();
			listB.sort((p) => p.file.basename, 'desc');
			listB.mutate((p) => {
				(p as KBPage & { computed?: number }).computed = 1;
			});
			(listB._values as unknown[]).reverse();
			(listB._values as unknown[]).push({ file: { path: '/vault/extra.md' } });

			expect(listA.map((p) => p.file.path).array()).toEqual(orderA);
			expect(listA.length).toBe(3);
			expect(a.pages().map((p) => p.file.path).array()).toEqual(orderA);
			expect(b.pages().length).toBe(3);
			expect((a.page('/vault/alpha.md') as KBPage & { computed?: number }).computed).toBe(1);
			expect(pageBuilds()).toBe(1);
		});

		it('a block keeps the page set it first got when a block at a newer index state runs in between', () => {
			const a = createAPI({ entries: defaultEntries(), propertyIndexVersion: 7 });
			const alphaBefore = a.page('/vault/alpha.md') as KBPage & { computed?: number };
			alphaBefore.computed = 42;

			const b = createAPI({ entries: defaultEntries(), propertyIndexVersion: 8 });
			b.pages();

			expect(a.page('/vault/alpha.md')).toBe(alphaBefore);
			expect(a.pages().array().find((p) => p.file.path === '/vault/alpha.md')).toBe(alphaBefore);
			expect(alphaBefore.computed).toBe(42);
			expect(b.page('/vault/alpha.md')).not.toBe(alphaBefore);
			expect(pageBuilds()).toBe(2);
		});

		it('resolves a path-style outlink under the vault path before an earlier suffix match', () => {
			const kb = createAPI({
				records: [makeRecord('/vault/alpha.md', 'alpha'), makeRecord('/vault/x/b/foo.md', 'foo'), makeRecord('/vault/b/foo.md', 'foo')],
				entries: [entryV2('/vault/alpha.md', { outgoingLinks: [{ target: 'b/foo.md', alias: null, heading: null, position: 0 }] })],
			});

			expect(kb.page('/vault/alpha.md')?.file.outlinks.map((l) => l.path)).toEqual(['/vault/b/foo.md']);
		});

		it('returns all pages as DataArray', () => {
			const kb = createAPI();
			const pages = kb.pages();
			expect(pages).toBeInstanceOf(DataArray);
			expect(pages.length).toBe(3);
		});

		it('filters by tag', () => {
			const kb = createAPI();
			const pages = kb.pages('#journal');
			expect(pages.length).toBe(2); // alpha and beta
		});

		it('filters by tag with subtag hierarchy', () => {
			const kb = createAPI();
			const pages = kb.pages('#type');
			expect(pages.length).toBe(1); // only alpha has type/meeting
		});

		it('filters by folder', () => {
			const kb = createAPI();
			const pages = kb.pages('"sub"');
			expect(pages.length).toBe(1);
			expect(pages.first()!.file.basename).toBe('gamma');
		});

		it('scopes a folder source to the vault, not to any folder whose path contains it', () => {
			const paths = ['/vault/sub/gamma.md', '/vault/old/sub/delta.md', '/vault/subway/eps.md'];
			const kb = createAPI({
				records: paths.map((p) => makeRecord(p, p.slice(p.lastIndexOf('/') + 1, -3))),
				entries: paths.map((p) => entryV2(p)),
			});
			expect(kb.pagePaths('"sub"').array()).toEqual(['/vault/sub/gamma.md']);
			expect(kb.pagePaths('"vault"').array()).toEqual([]);
		});

		it('returns all when source is empty', () => {
			const kb = createAPI();
			expect(kb.pages('').length).toBe(3);
			expect(kb.pages('  ').length).toBe(3);
		});
	});

	describe('pagePaths', () => {
		it('returns paths as DataArray<string>', () => {
			const kb = createAPI();
			const paths = kb.pagePaths();
			expect(paths.length).toBe(3);
			expect(paths.includes('/vault/alpha.md')).toBe(true);
		});
	});

	describe('current', () => {
		it('returns current file page', () => {
			const kb = createAPI({ currentFilePath: '/vault/alpha.md' });
			const page = kb.current();
			expect(page).not.toBeNull();
			expect(page!.file.basename).toBe('alpha');
		});

		it('returns null if file not in index', () => {
			const kb = createAPI({ currentFilePath: '/vault/nonexistent.md' });
			expect(kb.current()).toBeNull();
		});

		it('has frontmatter properties on page root', () => {
			const kb = createAPI({ currentFilePath: '/vault/alpha.md' });
			const page = kb.current()!;
			expect(page.status).toBe('active');
		});

		it('returns same cached object as pages()', () => {
			const kb = createAPI({ currentFilePath: '/vault/alpha.md' });
			const fromPages = kb.pages().find((p) => p.file.path === '/vault/alpha.md');
			const fromCurrent = kb.current();
			expect(fromCurrent).toBe(fromPages);
		});
	});

	describe('page', () => {
		it('returns page for specific path', () => {
			const kb = createAPI();
			const page = kb.page('/vault/beta.md');
			expect(page).toBeDefined();
			expect(page!.file.basename).toBe('beta');
		});

		it('returns undefined for unknown path', () => {
			const kb = createAPI();
			expect(kb.page('/vault/missing.md')).toBeUndefined();
		});

		it('returns same cached object as pages()', () => {
			const kb = createAPI();
			const fromPages = kb.pages().find((p) => p.file.path === '/vault/beta.md');
			const fromPage = kb.page('/vault/beta.md');
			expect(fromPage).toBe(fromPages);
		});
	});

	describe('which files are pages', () => {
		const VIEW = '/vault/x.view';
		const DEF = '/vault/Project.md';
		const TEMPLATE = '/vault/_system/template.md';
		const NOTE = '/vault/note.md';
		const ARCHIVED = '/vault/old.md';
		function vault(opts: { systemFolder?: string; entries?: NoteEntryV2[]; currentFilePath?: string } = {}) {
			return createAPI({
				records: [
					makeRecord(VIEW, 'x', { _sidebar_label: 'X' }),
					makeRecord(DEF, 'Project', { _type: 'Type' }),
					makeRecord(TEMPLATE, 'template'),
					makeRecord(NOTE, 'note'),
					makeRecord(ARCHIVED, 'old', { _archived: true, archived: true }),
				],
				entries: opts.entries ?? [
					entryV2(VIEW, { tags: ['t'] }),
					entryV2(DEF, { tags: ['t'], isA: 'Type' }),
					entryV2(TEMPLATE, { tags: ['t'] }),
					entryV2(NOTE, { tags: ['t'] }),
					entryV2(ARCHIVED, { tags: ['t'], archived: true }),
				],
				systemFolder: opts.systemFolder,
				currentFilePath: opts.currentFilePath,
			});
		}

		it('leaves .view files, type definitions and the system folder out of pages() and pagePaths()', () => {
			const kb = vault();
			expect(kb.pagePaths().array()).toEqual([NOTE, ARCHIVED]);
			expect(kb.pages().map((p) => p.file.path).array()).toEqual([NOTE, ARCHIVED]);
		});

		it('leaves them out of a tag or folder source too', () => {
			const kb = vault();
			expect(kb.pagePaths('#t').array()).toEqual([NOTE, ARCHIVED]);
			expect(kb.pagePaths('"_system"').array()).toEqual([]);
		});

		it('keeps archived notes', () => {
			const archived = vault().pages().where((p) => p.archived === true);
			expect(archived.map((p) => p.file.path).array()).toEqual([ARCHIVED]);
		});

		it('keeps the system folder notes when the setting is blank, still without .view files', () => {
			expect(vault({ systemFolder: '' }).pagePaths().array()).toEqual([TEMPLATE, NOTE, ARCHIVED]);
			expect(vault({ systemFolder: '  ' }).pagePaths().array()).toEqual([TEMPLATE, NOTE, ARCHIVED]);
		});

		it('leaves out a .view path that has no entry, by its extension', () => {
			expect(vault({ entries: [] }).pagePaths().array()).toEqual([DEF, NOTE, ARCHIVED]);
		});

		it('honours another system folder over the same entries snapshot and index version', () => {
			const entries = [entryV2(TEMPLATE), entryV2(NOTE), entryV2(ARCHIVED, { archived: true })];
			expect(vault({ entries }).pagePaths().array()).toEqual([DEF, NOTE, ARCHIVED]);
			expect(vault({ entries, systemFolder: 'elsewhere' }).pagePaths().array()).toEqual([DEF, TEMPLATE, NOTE, ARCHIVED]);
		});

		it('page() still finds a .view, a type definition and a system-folder note by path', () => {
			const kb = vault();
			expect(kb.page(VIEW)?.file.path).toBe(VIEW);
			expect(kb.page(DEF)?.file.path).toBe(DEF);
			expect(kb.page(TEMPLATE)?.file.path).toBe(TEMPLATE);
		});

		it('current() still returns a page under the system folder', () => {
			expect(vault({ currentFilePath: TEMPLATE }).current()?.file.path).toBe(TEMPLATE);
		});

		it('still resolves links to and from a left-out file', () => {
			const entries = [
				entryV2(NOTE, { outgoingLinks: [{ target: 'Project', alias: null, heading: null, position: 0 }] }),
				entryV2(DEF, { isA: 'Type' }),
			];
			const kb = vault({ entries });
			expect(kb.page(NOTE)?.file.outlinks.map((l) => l.path)).toEqual([DEF]);
			expect(kb.page(DEF)?.file.inlinks.map((l) => l.path)).toEqual([NOTE]);
		});
	});

	describe('date', () => {
		it('returns KBDateTime', () => {
			const kb = createAPI();
			const dt = kb.date('2024-06-15');
			expect(dt).toBeInstanceOf(KBDateTime);
			expect(dt.year).toBe(2024);
		});

		it('returns current date with no args', () => {
			const kb = createAPI();
			const dt = kb.date();
			expect(dt.year).toBe(new Date().getFullYear());
		});
	});

	describe('tryDate', () => {
		it('returns KBDateTime for valid string', () => {
			const kb = createAPI();
			const dt = kb.tryDate('2024-06-15');
			expect(dt).toBeInstanceOf(KBDateTime);
			expect(dt!.year).toBe(2024);
		});

		it('returns null for null', () => {
			const kb = createAPI();
			expect(kb.tryDate(null)).toBeNull();
		});

		it('returns null for undefined', () => {
			const kb = createAPI();
			expect(kb.tryDate(undefined)).toBeNull();
		});

		it('returns KBDateTime from { year, month, day } object', () => {
			const kb = createAPI();
			const dt = kb.tryDate({ year: 2024, month: 3, day: 10 });
			expect(dt).toBeInstanceOf(KBDateTime);
			expect(dt!.month).toBe(3);
			expect(dt!.day).toBe(10);
		});

		it('returns null for garbage string', () => {
			const kb = createAPI();
			expect(kb.tryDate('not-a-date')).toBeNull();
		});
	});

	describe('getDaysInRange', () => {
		it('generates inclusive range of days', () => {
			const kb = createAPI();
			const days = kb.getDaysInRange('2024-06-10', '2024-06-13');
			expect(days).toBeInstanceOf(DataArray);
			expect(days.length).toBe(4);
			expect(days.first()!.toISODate()).toBe('2024-06-10');
			expect(days.last()!.toISODate()).toBe('2024-06-13');
		});

		it('returns single day when start equals end', () => {
			const kb = createAPI();
			const days = kb.getDaysInRange('2024-06-15', '2024-06-15');
			expect(days.length).toBe(1);
			expect(days.first()!.toISODate()).toBe('2024-06-15');
		});

		it('returns empty array when start > end', () => {
			const kb = createAPI();
			const days = kb.getDaysInRange('2024-06-15', '2024-06-10');
			expect(days.length).toBe(0);
		});

		it('returns empty array when start is invalid', () => {
			const kb = createAPI();
			expect(kb.getDaysInRange(null, '2024-06-15').length).toBe(0);
		});

		it('returns empty array when end is invalid', () => {
			const kb = createAPI();
			expect(kb.getDaysInRange('2024-06-10', 'garbage').length).toBe(0);
		});

		it('accepts KBDateTime as input', () => {
			const kb = createAPI();
			const start = new KBDateTime('2024-01-01');
			const end = new KBDateTime('2024-01-03');
			const days = kb.getDaysInRange(start, end);
			expect(days.length).toBe(3);
		});

		it('accepts Date objects as input', () => {
			const kb = createAPI();
			const days = kb.getDaysInRange(new Date(2024, 5, 10), new Date(2024, 5, 12));
			expect(days.length).toBe(3);
		});

		it('generates a 7-day week range', () => {
			const kb = createAPI();
			const days = kb.getDaysInRange('2026-02-09', '2026-02-15');
			expect(days.length).toBe(7);
			const isos = days.map((d) => d.toISODate()).array();
			expect(isos).toEqual([
				'2026-02-09', '2026-02-10', '2026-02-11', '2026-02-12',
				'2026-02-13', '2026-02-14', '2026-02-15',
			]);
		});
	});

	describe('array / isArray', () => {
		it('wraps plain array in DataArray', () => {
			const kb = createAPI();
			const result = kb.array([1, 2, 3]);
			expect(result).toBeInstanceOf(DataArray);
			expect(result.length).toBe(3);
		});

		it('passes through existing DataArray', () => {
			const kb = createAPI();
			const da = new DataArray([1, 2]);
			expect(kb.array(da)).toBe(da);
		});

		it('isArray detects DataArray', () => {
			const kb = createAPI();
			expect(kb.isArray(new DataArray([]))).toBe(true);
			expect(kb.isArray([1, 2])).toBe(true);
			expect(kb.isArray('nope')).toBe(false);
		});
	});

	describe('fileLink', () => {
		it('creates KBLink from path', () => {
			const kb = createAPI();
			const link = kb.fileLink('/vault/test.md');
			expect(link.path).toBe('/vault/test.md');
			expect(link.display).toBe('test');
		});

		it('uses custom display name', () => {
			const kb = createAPI();
			const link = kb.fileLink('/vault/test.md', false, 'My Note');
			expect(link.display).toBe('My Note');
		});
	});

	describe('compare / equal', () => {
		it('compare returns negative/zero/positive', () => {
			const kb = createAPI();
			expect(kb.compare(1, 2)).toBeLessThan(0);
			expect(kb.compare(2, 2)).toBe(0);
			expect(kb.compare(3, 2)).toBeGreaterThan(0);
		});

		it('equal checks equality', () => {
			const kb = createAPI();
			expect(kb.equal(1, 1)).toBe(true);
			expect(kb.equal(1, 2)).toBe(false);
		});
	});

	describe('number', () => {
		it('converts numeric string to number', () => {
			const kb = createAPI();
			expect(kb.number('3')).toBe(3);
		});

		it('passes through actual number unchanged', () => {
			const kb = createAPI();
			expect(kb.number(42)).toBe(42);
		});

		it('returns 0 for non-numeric string', () => {
			const kb = createAPI();
			expect(kb.number('abc')).toBe(0);
		});

		it('returns 0 for null', () => {
			const kb = createAPI();
			expect(kb.number(null)).toBe(0);
		});

		it('returns 0 for undefined', () => {
			const kb = createAPI();
			expect(kb.number(undefined)).toBe(0);
		});

		it('returns 0 for NaN', () => {
			const kb = createAPI();
			expect(kb.number(NaN)).toBe(0);
		});

		it('handles float strings', () => {
			const kb = createAPI();
			expect(kb.number('3.5')).toBe(3.5);
		});

		it('returns 0 for empty string', () => {
			const kb = createAPI();
			expect(kb.number('')).toBe(0);
		});
	});

	describe('progressBar', () => {
		it('returns filled and empty blocks for normal value', () => {
			const kb = createAPI();
			expect(kb.progressBar(3, 5)).toBe('\u2588\u2588\u2588\u2591\u2591');
		});

		it('returns all filled for value equal to max', () => {
			const kb = createAPI();
			expect(kb.progressBar(5, 5)).toBe('\u2588\u2588\u2588\u2588\u2588');
		});

		it('returns all empty for value 0', () => {
			const kb = createAPI();
			expect(kb.progressBar(0, 5)).toBe('\u2591\u2591\u2591\u2591\u2591');
		});

		it('clamps value above max', () => {
			const kb = createAPI();
			expect(kb.progressBar(10, 5)).toBe('\u2588\u2588\u2588\u2588\u2588');
		});

		it('clamps negative value to 0', () => {
			const kb = createAPI();
			expect(kb.progressBar(-3, 5)).toBe('\u2591\u2591\u2591\u2591\u2591');
		});

		it('rounds fractional value', () => {
			const kb = createAPI();
			expect(kb.progressBar(2.7, 5)).toBe('\u2588\u2588\u2588\u2591\u2591');
		});

		it('returns empty string when max is 0', () => {
			const kb = createAPI();
			expect(kb.progressBar(0, 0)).toBe('');
		});
	});

	describe('render methods', () => {
		it('el creates element with text and attributes', () => {
			const kb = createAPI();
			const el = kb.el('div', 'hello', { attr: { style: 'color: red' }, cls: 'my-class' });
			expect(el.tagName).toBe('DIV');
			expect(el.textContent).toBe('hello');
			expect(el.getAttribute('style')).toBe('color: red');
			expect(el.className).toBe('my-class');
			expect(kb.container.contains(el)).toBe(true);
		});

		it('el creates empty element', () => {
			const kb = createAPI();
			const el = kb.el('div', '');
			expect(el.textContent).toBe('');
		});

		it('paragraph creates <p>', () => {
			const kb = createAPI();
			const p = kb.paragraph('test text');
			expect(p.tagName).toBe('P');
			expect(p.textContent).toBe('test text');
		});

		it('header creates correct heading level', () => {
			const kb = createAPI();
			const h2 = kb.header(2, 'Title');
			expect(h2.tagName).toBe('H2');
			expect(h2.textContent).toBe('Title');
		});

		it('header renders KBLink as clickable <a>', () => {
			const kb = createAPI();
			const h5 = kb.header(5, { path: '/vault/test.md', display: 'test' });
			expect(h5.tagName).toBe('H5');
			const a = h5.querySelector(':scope > a.cm-lp-qjs-link');
			expect(a).not.toBeNull();
			expect(a!.textContent).toBe('test');
		});

		it('span creates <span>', () => {
			const kb = createAPI();
			const s = kb.span('inline');
			expect(s.tagName).toBe('SPAN');
		});

		it('list creates <ul> with items', () => {
			const kb = createAPI();
			const ul = kb.list(new DataArray(['a', 'b', 'c']));
			expect(ul.tagName).toBe('UL');
			expect(ul.children.length).toBe(3);
			expect(ul.children[0].textContent).toBe('a');
		});

		it('list renders KBLink as clickable <a>', () => {
			const kb = createAPI();
			const ul = kb.list(new DataArray([{ path: '/vault/test.md', display: 'test' }]));
			const a = ul.querySelector('a');
			expect(a).not.toBeNull();
			expect(a!.textContent).toBe('test');
			expect(a!.className).toBe('cm-lp-qjs-link');
		});

		it('KBLink: only a primary click without macOS Ctrl opens the file', () => {
			const kb = createAPI();
			const a = kb.list(new DataArray([{ path: '/vault/test.md', display: 'test' }])).querySelector('a')!;
			const press = (init: MouseEventInit) => {
				const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, ...init });
				a.dispatchEvent(e);
				return e;
			};
			vi.mocked(openFileInEditor).mockClear();

			platform.mac = true;
			expect(press({ ctrlKey: true }).defaultPrevented).toBe(false);
			expect(press({ button: 2 }).defaultPrevented).toBe(false);
			expect(openFileInEditor).not.toHaveBeenCalled();

			platform.mac = false;
			expect(press({ button: 2 }).defaultPrevented).toBe(false);
			expect(openFileInEditor).not.toHaveBeenCalled();
			expect(press({}).defaultPrevented).toBe(true);
			expect(openFileInEditor).toHaveBeenCalledWith('/vault/test.md');
		});

		it('renders object with non-string path/display as plain text, not link', () => {
			const kb = createAPI();
			const ul = kb.list(new DataArray([{ path: 42, display: true }]));
			const a = ul.querySelector('a');
			expect(a).toBeNull();
			expect(ul.children[0].textContent).not.toBe('');
		});

		it('table creates <table> with headers and rows', () => {
			const kb = createAPI();
			const table = kb.table(['Name', 'Value'], [
				['alpha', '1'],
				['beta', '2'],
			]);
			expect(table.tagName).toBe('TABLE');
			const ths = table.querySelectorAll('th');
			expect(ths.length).toBe(2);
			expect(ths[0].textContent).toBe('Name');
			const tds = table.querySelectorAll('td');
			expect(tds.length).toBe(4);
		});

		it('taskList creates checkbox list', () => {
			const kb = createAPI();
			const ul = kb.taskList([
				{ text: 'todo', completed: false },
				{ text: 'done', completed: true },
			]);
			expect(ul.tagName).toBe('UL');
			const checkboxes = ul.querySelectorAll('input[type="checkbox"]');
			expect(checkboxes.length).toBe(2);
			expect((checkboxes[0] as HTMLInputElement).checked).toBe(false);
			expect((checkboxes[1] as HTMLInputElement).checked).toBe(true);
		});
	});

	describe('view', () => {
		it('loads and executes external script', async () => {
			const loadScript = vi.fn().mockResolvedValue('kb.paragraph("from view")');
			const records = [makeRecord('/vault/test.md', 'test')];
			const propertyIndex = new Map<string, PropertyIndexRecord>();
			for (const r of records) propertyIndex.set(r.path, r);
			const container = document.createElement('div');

			const kb = new KBAPI({
				container,
				propertyIndex,
				entries: [entryV2('/vault/test.md')],
				propertyIndexVersion: 0,
				currentFilePath: '/vault/test.md',
				vaultPath: '/vault',
				systemFolder: '_system',
				loadScript,
			});

			await kb.view('scripts/my-view');
			expect(loadScript).toHaveBeenCalledWith('/vault/scripts/my-view.js');
			expect(container.querySelector('p')!.textContent).toBe('from view');
		});

		it('shows async script errors inline instead of rejecting', async () => {
			const asyncScript = 'await Promise.resolve(); throw new Error("script failed");';
			const loadScript = vi.fn().mockResolvedValue(asyncScript);
			const records = [makeRecord('/vault/test.md', 'test')];
			const propertyIndex = new Map<string, PropertyIndexRecord>();
			for (const r of records) propertyIndex.set(r.path, r);

			const container = document.createElement('div');
			const kb = new KBAPI({
				container,
				propertyIndex,
				entries: [entryV2('/vault/test.md')],
				propertyIndexVersion: 0,
				currentFilePath: '/vault/test.md',
				vaultPath: '/vault',
				systemFolder: '_system',
				loadScript,
			});

			await kb.view('scripts/failing');
			const errorEl = container.querySelector('.cm-lp-qjs-error');
			expect(errorEl).not.toBeNull();
			expect(errorEl!.textContent).toContain('script failed');
		});

		it('shows sync script errors inline instead of rejecting', async () => {
			const syncScript = 'throw new Error("sync fail");';
			const loadScript = vi.fn().mockResolvedValue(syncScript);
			const records = [makeRecord('/vault/test.md', 'test')];
			const propertyIndex = new Map<string, PropertyIndexRecord>();
			for (const r of records) propertyIndex.set(r.path, r);

			const container = document.createElement('div');
			const kb = new KBAPI({
				container,
				propertyIndex,
				entries: [entryV2('/vault/test.md')],
				propertyIndexVersion: 0,
				currentFilePath: '/vault/test.md',
				vaultPath: '/vault',
				systemFolder: '_system',
				loadScript,
			});

			await kb.view('scripts/failing');
			const errorEl = container.querySelector('.cm-lp-qjs-error');
			expect(errorEl).not.toBeNull();
			expect(errorEl!.textContent).toContain('sync fail');
		});

		it('normalizes double slashes in script path', async () => {
			const loadScript = vi.fn().mockResolvedValue('/* noop */');
			const records = [makeRecord('/vault/test.md', 'test')];
			const propertyIndex = new Map<string, PropertyIndexRecord>();
			for (const r of records) propertyIndex.set(r.path, r);

			const kb = new KBAPI({
				container: document.createElement('div'),
				propertyIndex,
				entries: [entryV2('/vault/test.md')],
				propertyIndexVersion: 0,
				currentFilePath: '/vault/test.md',
				vaultPath: '/vault',
				systemFolder: '_system',
				loadScript,
			});

			await kb.view('/scripts/view');
			// "/vault" + "/scripts/view.js" without double slashes
			expect(loadScript).toHaveBeenCalledWith('/vault/scripts/view.js');
		});

		it('shows path traversal error inline instead of rejecting', async () => {
			const loadScript = vi.fn().mockResolvedValue('/* noop */');
			const records = [makeRecord('/vault/test.md', 'test')];
			const propertyIndex = new Map<string, PropertyIndexRecord>();
			for (const r of records) propertyIndex.set(r.path, r);

			const container = document.createElement('div');
			const kb = new KBAPI({
				container,
				propertyIndex,
				entries: [entryV2('/vault/test.md')],
				propertyIndexVersion: 0,
				currentFilePath: '/vault/test.md',
				vaultPath: '/vault',
				systemFolder: '_system',
				loadScript,
			});

			await kb.view('../../etc/passwd');
			const errorEl = container.querySelector('.cm-lp-qjs-error');
			expect(errorEl).not.toBeNull();
			expect(errorEl!.textContent).toContain('traversal');
		});
	});

	describe('ui namespace', () => {
		it('kb.ui exposes render helper methods', () => {
			const kb = createAPI();
			expect(kb.ui).toBeDefined();
			expect(typeof kb.ui.cards).toBe('function');
			expect(typeof kb.ui.progressBar).toBe('function');
			expect(typeof kb.ui.heatmap).toBe('function');
			expect(typeof kb.ui.tagCloud).toBe('function');
			expect(typeof kb.ui.statusCards).toBe('function');
			expect(typeof kb.ui.timeline).toBe('function');
			expect(typeof kb.ui.table).toBe('function');
		});

		it('kb.ui.cards renders into the container', () => {
			const kb = createAPI();
			kb.ui.cards([{ label: 'Test', value: 42, color: 'blue' }]);
			expect(kb.container.querySelector('div')).not.toBeNull();
		});

		it('kb.ui returns the same instance on repeated access', () => {
			const kb = createAPI();
			expect(kb.ui).toBe(kb.ui);
		});

		it('kb.ui.table renders KBLink as clickable <a> via renderValue', () => {
			const kb = createAPI();
			kb.ui.table(
				['Note', 'Status'],
				[[{ path: '/vault/alpha.md', display: 'alpha' }, 'active']],
			);
			const a = kb.container.querySelector('a');
			expect(a).not.toBeNull();
			expect(a!.textContent).toBe('alpha');
			expect(a!.className).toBe('cm-lp-qjs-link');
		});

		it('kb.ui.table renders HTMLElement directly in cells via renderValue', () => {
			const kb = createAPI();
			const chips = document.createElement('span');
			chips.className = 'tag-chips';
			const chip1 = document.createElement('span');
			chip1.textContent = 'tag1';
			const chip2 = document.createElement('span');
			chip2.textContent = 'tag2';
			chips.appendChild(chip1);
			chips.appendChild(chip2);

			kb.ui.table(
				['Name', 'Tags'],
				[['note-a', chips]],
			);

			const cell = kb.container.querySelector('.tag-chips');
			expect(cell).not.toBeNull();
			expect(cell!.children.length).toBe(2);
			expect(cell!.children[0].textContent).toBe('tag1');
			expect(cell!.children[1].textContent).toBe('tag2');
		});
	});
});

describe('runQueryjsBlock', () => {
	it('runs the block with kb and dv bound to the api', async () => {
		const kb = createAPI();
		await runQueryjsBlock(kb, 'kb.paragraph("one"); dv.paragraph(String(kb === dv));');
		expect(kb.container.textContent).toBe('onetrue');
	});

	it('waits for a kb.view() written without await before resolving', async () => {
		const kb = createAPI();
		await runQueryjsBlock(kb, 'kb.view("scripts/demo")');
		expect(kb.container.querySelector('p')?.textContent).toBe('loaded');
	});

	it('lets the block use await at the top level', async () => {
		const kb = createAPI();
		await runQueryjsBlock(kb, 'const n = await Promise.resolve(2); kb.paragraph(String(n));');
		expect(kb.container.textContent).toBe('2');
	});

	it('rejects with the error the block throws', async () => {
		const kb = createAPI();
		await expect(runQueryjsBlock(kb, 'throw new Error("block failed")')).rejects.toThrow('block failed');
	});

	it('gives the block no input parameter', async () => {
		const kb = createAPI();
		await runQueryjsBlock(kb, 'kb.paragraph(typeof input);');
		expect(kb.container.textContent).toBe('undefined');
	});

	it('renders nothing for an empty block', async () => {
		const kb = createAPI();
		await runQueryjsBlock(kb, '');
		expect(kb.container.childNodes.length).toBe(0);
	});
});
