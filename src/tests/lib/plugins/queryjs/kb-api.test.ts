// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KBAPI } from '$lib/plugins/queryjs/kb-api';
import { DataArray } from '$lib/plugins/queryjs/data-array';
import { KBDateTime } from '$lib/plugins/queryjs/kb-datetime';
import type { NoteRecord } from '$lib/features/collection/collection.types';
import type { WikiLink } from '$lib/features/backlinks/backlinks.types';

vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

function makeRecord(path: string, basename: string, props?: Record<string, unknown>): NoteRecord {
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
	records?: NoteRecord[];
	noteContents?: Map<string, string>;
	noteIndex?: Map<string, WikiLink[]>;
	currentFilePath?: string;
}) {
	const records = opts?.records ?? [
		makeRecord('/vault/alpha.md', 'alpha', { status: 'active' }),
		makeRecord('/vault/beta.md', 'beta', { status: 'draft' }),
		makeRecord('/vault/sub/gamma.md', 'gamma'),
	];

	const propertyIndex = new Map<string, NoteRecord>();
	for (const r of records) propertyIndex.set(r.path, r);

	const noteContents = opts?.noteContents ?? new Map<string, string>([
		['/vault/alpha.md', '---\ntags: [journal, type/meeting]\n---\nContent'],
		['/vault/beta.md', '---\ntags: [journal]\n---\nBeta content'],
		['/vault/sub/gamma.md', 'No frontmatter #inline-tag'],
	]);

	const noteIndex = opts?.noteIndex ?? new Map<string, WikiLink[]>();

	const container = document.createElement('div');

	return new KBAPI({
		container,
		propertyIndex,
		noteIndex,
		noteContents,
		currentFilePath: opts?.currentFilePath ?? '/vault/alpha.md',
		vaultPath: '/vault',
		loadScript: vi.fn().mockResolvedValue('dv.paragraph("loaded")'),
	});
}

describe('KBAPI', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('pages', () => {
		it('returns all pages as DataArray', () => {
			const dv = createAPI();
			const pages = dv.pages();
			expect(pages).toBeInstanceOf(DataArray);
			expect(pages.length).toBe(3);
		});

		it('filters by tag', () => {
			const dv = createAPI();
			const pages = dv.pages('#journal');
			expect(pages.length).toBe(2); // alpha and beta
		});

		it('filters by tag with subtag hierarchy', () => {
			const dv = createAPI();
			const pages = dv.pages('#type');
			expect(pages.length).toBe(1); // only alpha has type/meeting
		});

		it('filters by folder', () => {
			const dv = createAPI();
			const pages = dv.pages('"sub"');
			expect(pages.length).toBe(1);
			expect(pages.first()!.file.basename).toBe('gamma');
		});

		it('returns all when source is empty', () => {
			const dv = createAPI();
			expect(dv.pages('').length).toBe(3);
			expect(dv.pages('  ').length).toBe(3);
		});
	});

	describe('pagePaths', () => {
		it('returns paths as DataArray<string>', () => {
			const dv = createAPI();
			const paths = dv.pagePaths();
			expect(paths.length).toBe(3);
			expect(paths.includes('/vault/alpha.md')).toBe(true);
		});
	});

	describe('current', () => {
		it('returns current file page', () => {
			const dv = createAPI({ currentFilePath: '/vault/alpha.md' });
			const page = dv.current();
			expect(page).not.toBeNull();
			expect(page!.file.basename).toBe('alpha');
		});

		it('returns null if file not in index', () => {
			const dv = createAPI({ currentFilePath: '/vault/nonexistent.md' });
			expect(dv.current()).toBeNull();
		});

		it('has frontmatter properties on page root', () => {
			const dv = createAPI({ currentFilePath: '/vault/alpha.md' });
			const page = dv.current()!;
			expect(page.status).toBe('active');
		});

		it('returns same cached object as pages()', () => {
			const dv = createAPI({ currentFilePath: '/vault/alpha.md' });
			const fromPages = dv.pages().find((p) => p.file.path === '/vault/alpha.md');
			const fromCurrent = dv.current();
			expect(fromCurrent).toBe(fromPages);
		});
	});

	describe('page', () => {
		it('returns page for specific path', () => {
			const dv = createAPI();
			const page = dv.page('/vault/beta.md');
			expect(page).toBeDefined();
			expect(page!.file.basename).toBe('beta');
		});

		it('returns undefined for unknown path', () => {
			const dv = createAPI();
			expect(dv.page('/vault/missing.md')).toBeUndefined();
		});

		it('returns same cached object as pages()', () => {
			const dv = createAPI();
			const fromPages = dv.pages().find((p) => p.file.path === '/vault/beta.md');
			const fromPage = dv.page('/vault/beta.md');
			expect(fromPage).toBe(fromPages);
		});
	});

	describe('date', () => {
		it('returns KBDateTime', () => {
			const dv = createAPI();
			const dt = dv.date('2024-06-15');
			expect(dt).toBeInstanceOf(KBDateTime);
			expect(dt.year).toBe(2024);
		});

		it('returns current date with no args', () => {
			const dv = createAPI();
			const dt = dv.date();
			expect(dt.year).toBe(new Date().getFullYear());
		});
	});

	describe('tryDate', () => {
		it('returns KBDateTime for valid string', () => {
			const dv = createAPI();
			const dt = dv.tryDate('2024-06-15');
			expect(dt).toBeInstanceOf(KBDateTime);
			expect(dt!.year).toBe(2024);
		});

		it('returns null for null', () => {
			const dv = createAPI();
			expect(dv.tryDate(null)).toBeNull();
		});

		it('returns null for undefined', () => {
			const dv = createAPI();
			expect(dv.tryDate(undefined)).toBeNull();
		});

		it('returns KBDateTime from { year, month, day } object', () => {
			const dv = createAPI();
			const dt = dv.tryDate({ year: 2024, month: 3, day: 10 });
			expect(dt).toBeInstanceOf(KBDateTime);
			expect(dt!.month).toBe(3);
			expect(dt!.day).toBe(10);
		});

		it('returns null for garbage string', () => {
			const dv = createAPI();
			expect(dv.tryDate('not-a-date')).toBeNull();
		});
	});

	describe('getDaysInRange', () => {
		it('generates inclusive range of days', () => {
			const dv = createAPI();
			const days = dv.getDaysInRange('2024-06-10', '2024-06-13');
			expect(days).toBeInstanceOf(DataArray);
			expect(days.length).toBe(4);
			expect(days.first()!.toISODate()).toBe('2024-06-10');
			expect(days.last()!.toISODate()).toBe('2024-06-13');
		});

		it('returns single day when start equals end', () => {
			const dv = createAPI();
			const days = dv.getDaysInRange('2024-06-15', '2024-06-15');
			expect(days.length).toBe(1);
			expect(days.first()!.toISODate()).toBe('2024-06-15');
		});

		it('returns empty array when start > end', () => {
			const dv = createAPI();
			const days = dv.getDaysInRange('2024-06-15', '2024-06-10');
			expect(days.length).toBe(0);
		});

		it('returns empty array when start is invalid', () => {
			const dv = createAPI();
			expect(dv.getDaysInRange(null, '2024-06-15').length).toBe(0);
		});

		it('returns empty array when end is invalid', () => {
			const dv = createAPI();
			expect(dv.getDaysInRange('2024-06-10', 'garbage').length).toBe(0);
		});

		it('accepts KBDateTime as input', () => {
			const dv = createAPI();
			const start = new KBDateTime('2024-01-01');
			const end = new KBDateTime('2024-01-03');
			const days = dv.getDaysInRange(start, end);
			expect(days.length).toBe(3);
		});

		it('accepts Date objects as input', () => {
			const dv = createAPI();
			const days = dv.getDaysInRange(new Date(2024, 5, 10), new Date(2024, 5, 12));
			expect(days.length).toBe(3);
		});

		it('generates a 7-day week range', () => {
			const dv = createAPI();
			const days = dv.getDaysInRange('2026-02-09', '2026-02-15');
			expect(days.length).toBe(7);
			const isos = days.map((d: KBDateTime) => d.toISODate()).array();
			expect(isos).toEqual([
				'2026-02-09', '2026-02-10', '2026-02-11', '2026-02-12',
				'2026-02-13', '2026-02-14', '2026-02-15',
			]);
		});
	});

	describe('array / isArray', () => {
		it('wraps plain array in DataArray', () => {
			const dv = createAPI();
			const result = dv.array([1, 2, 3]);
			expect(result).toBeInstanceOf(DataArray);
			expect(result.length).toBe(3);
		});

		it('passes through existing DataArray', () => {
			const dv = createAPI();
			const da = new DataArray([1, 2]);
			expect(dv.array(da)).toBe(da);
		});

		it('isArray detects DataArray', () => {
			const dv = createAPI();
			expect(dv.isArray(new DataArray([]))).toBe(true);
			expect(dv.isArray([1, 2])).toBe(true);
			expect(dv.isArray('nope')).toBe(false);
		});
	});

	describe('fileLink', () => {
		it('creates KBLink from path', () => {
			const dv = createAPI();
			const link = dv.fileLink('/vault/test.md');
			expect(link.path).toBe('/vault/test.md');
			expect(link.display).toBe('test');
		});

		it('uses custom display name', () => {
			const dv = createAPI();
			const link = dv.fileLink('/vault/test.md', false, 'My Note');
			expect(link.display).toBe('My Note');
		});
	});

	describe('compare / equal', () => {
		it('compare returns negative/zero/positive', () => {
			const dv = createAPI();
			expect(dv.compare(1, 2)).toBeLessThan(0);
			expect(dv.compare(2, 2)).toBe(0);
			expect(dv.compare(3, 2)).toBeGreaterThan(0);
		});

		it('equal checks equality', () => {
			const dv = createAPI();
			expect(dv.equal(1, 1)).toBe(true);
			expect(dv.equal(1, 2)).toBe(false);
		});
	});

	describe('number', () => {
		it('converts numeric string to number', () => {
			const dv = createAPI();
			expect(dv.number('3')).toBe(3);
		});

		it('passes through actual number unchanged', () => {
			const dv = createAPI();
			expect(dv.number(42)).toBe(42);
		});

		it('returns 0 for non-numeric string', () => {
			const dv = createAPI();
			expect(dv.number('abc')).toBe(0);
		});

		it('returns 0 for null', () => {
			const dv = createAPI();
			expect(dv.number(null)).toBe(0);
		});

		it('returns 0 for undefined', () => {
			const dv = createAPI();
			expect(dv.number(undefined)).toBe(0);
		});

		it('returns 0 for NaN', () => {
			const dv = createAPI();
			expect(dv.number(NaN)).toBe(0);
		});

		it('handles float strings', () => {
			const dv = createAPI();
			expect(dv.number('3.5')).toBe(3.5);
		});

		it('returns 0 for empty string', () => {
			const dv = createAPI();
			expect(dv.number('')).toBe(0);
		});
	});

	describe('progressBar', () => {
		it('returns filled and empty blocks for normal value', () => {
			const dv = createAPI();
			expect(dv.progressBar(3, 5)).toBe('\u2588\u2588\u2588\u2591\u2591');
		});

		it('returns all filled for value equal to max', () => {
			const dv = createAPI();
			expect(dv.progressBar(5, 5)).toBe('\u2588\u2588\u2588\u2588\u2588');
		});

		it('returns all empty for value 0', () => {
			const dv = createAPI();
			expect(dv.progressBar(0, 5)).toBe('\u2591\u2591\u2591\u2591\u2591');
		});

		it('clamps value above max', () => {
			const dv = createAPI();
			expect(dv.progressBar(10, 5)).toBe('\u2588\u2588\u2588\u2588\u2588');
		});

		it('clamps negative value to 0', () => {
			const dv = createAPI();
			expect(dv.progressBar(-3, 5)).toBe('\u2591\u2591\u2591\u2591\u2591');
		});

		it('rounds fractional value', () => {
			const dv = createAPI();
			expect(dv.progressBar(2.7, 5)).toBe('\u2588\u2588\u2588\u2591\u2591');
		});

		it('returns empty string when max is 0', () => {
			const dv = createAPI();
			expect(dv.progressBar(0, 0)).toBe('');
		});
	});

	describe('render methods', () => {
		it('el creates element with text and attributes', () => {
			const dv = createAPI();
			const el = dv.el('div', 'hello', { attr: { style: 'color: red' }, cls: 'my-class' });
			expect(el.tagName).toBe('DIV');
			expect(el.textContent).toBe('hello');
			expect(el.getAttribute('style')).toBe('color: red');
			expect(el.className).toBe('my-class');
			expect(dv.container.contains(el)).toBe(true);
		});

		it('el creates empty element', () => {
			const dv = createAPI();
			const el = dv.el('div', '');
			expect(el.textContent).toBe('');
		});

		it('paragraph creates <p>', () => {
			const dv = createAPI();
			const p = dv.paragraph('test text');
			expect(p.tagName).toBe('P');
			expect(p.textContent).toBe('test text');
		});

		it('header creates correct heading level', () => {
			const dv = createAPI();
			const h2 = dv.header(2, 'Title');
			expect(h2.tagName).toBe('H2');
			expect(h2.textContent).toBe('Title');
		});

		it('span creates <span>', () => {
			const dv = createAPI();
			const s = dv.span('inline');
			expect(s.tagName).toBe('SPAN');
		});

		it('list creates <ul> with items', () => {
			const dv = createAPI();
			const ul = dv.list(new DataArray(['a', 'b', 'c']));
			expect(ul.tagName).toBe('UL');
			expect(ul.children.length).toBe(3);
			expect(ul.children[0].textContent).toBe('a');
		});

		it('list renders KBLink as clickable <a>', () => {
			const dv = createAPI();
			const ul = dv.list(new DataArray([{ path: '/vault/test.md', display: 'test' }]));
			const a = ul.querySelector('a');
			expect(a).not.toBeNull();
			expect(a!.textContent).toBe('test');
			expect(a!.className).toBe('cm-lp-qjs-link');
		});

		it('renders object with non-string path/display as plain text, not link', () => {
			const dv = createAPI();
			const ul = dv.list(new DataArray([{ path: 42, display: true }]));
			const a = ul.querySelector('a');
			expect(a).toBeNull();
			expect(ul.children[0].textContent).not.toBe('');
		});

		it('table creates <table> with headers and rows', () => {
			const dv = createAPI();
			const table = dv.table(['Name', 'Value'], [
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
			const dv = createAPI();
			const ul = dv.taskList([
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
			const loadScript = vi.fn().mockResolvedValue('dv.paragraph("from view")');
			const records = [makeRecord('/vault/test.md', 'test')];
			const propertyIndex = new Map<string, NoteRecord>();
			for (const r of records) propertyIndex.set(r.path, r);
			const container = document.createElement('div');

			const dv = new KBAPI({
				container,
				propertyIndex,
				noteIndex: new Map(),
				noteContents: new Map([['/vault/test.md', '']]),
				currentFilePath: '/vault/test.md',
				vaultPath: '/vault',
				loadScript,
			});

			await dv.view('scripts/my-view');
			expect(loadScript).toHaveBeenCalledWith('/vault/scripts/my-view.js');
			expect(container.querySelector('p')!.textContent).toBe('from view');
		});

		it('shows async script errors inline instead of rejecting', async () => {
			const asyncScript = 'await Promise.resolve(); throw new Error("script failed");';
			const loadScript = vi.fn().mockResolvedValue(asyncScript);
			const records = [makeRecord('/vault/test.md', 'test')];
			const propertyIndex = new Map<string, NoteRecord>();
			for (const r of records) propertyIndex.set(r.path, r);

			const container = document.createElement('div');
			const dv = new KBAPI({
				container,
				propertyIndex,
				noteIndex: new Map(),
				noteContents: new Map([['/vault/test.md', '']]),
				currentFilePath: '/vault/test.md',
				vaultPath: '/vault',
				loadScript,
			});

			await dv.view('scripts/failing');
			const errorEl = container.querySelector('.cm-lp-qjs-error');
			expect(errorEl).not.toBeNull();
			expect(errorEl!.textContent).toContain('script failed');
		});

		it('shows sync script errors inline instead of rejecting', async () => {
			const syncScript = 'throw new Error("sync fail");';
			const loadScript = vi.fn().mockResolvedValue(syncScript);
			const records = [makeRecord('/vault/test.md', 'test')];
			const propertyIndex = new Map<string, NoteRecord>();
			for (const r of records) propertyIndex.set(r.path, r);

			const container = document.createElement('div');
			const dv = new KBAPI({
				container,
				propertyIndex,
				noteIndex: new Map(),
				noteContents: new Map([['/vault/test.md', '']]),
				currentFilePath: '/vault/test.md',
				vaultPath: '/vault',
				loadScript,
			});

			await dv.view('scripts/failing');
			const errorEl = container.querySelector('.cm-lp-qjs-error');
			expect(errorEl).not.toBeNull();
			expect(errorEl!.textContent).toContain('sync fail');
		});

		it('normalizes double slashes in script path', async () => {
			const loadScript = vi.fn().mockResolvedValue('/* noop */');
			const records = [makeRecord('/vault/test.md', 'test')];
			const propertyIndex = new Map<string, NoteRecord>();
			for (const r of records) propertyIndex.set(r.path, r);

			const dv = new KBAPI({
				container: document.createElement('div'),
				propertyIndex,
				noteIndex: new Map(),
				noteContents: new Map([['/vault/test.md', '']]),
				currentFilePath: '/vault/test.md',
				vaultPath: '/vault',
				loadScript,
			});

			await dv.view('/scripts/view');
			// "/vault" + "/scripts/view.js" without double slashes
			expect(loadScript).toHaveBeenCalledWith('/vault/scripts/view.js');
		});

		it('shows path traversal error inline instead of rejecting', async () => {
			const loadScript = vi.fn().mockResolvedValue('/* noop */');
			const records = [makeRecord('/vault/test.md', 'test')];
			const propertyIndex = new Map<string, NoteRecord>();
			for (const r of records) propertyIndex.set(r.path, r);

			const container = document.createElement('div');
			const dv = new KBAPI({
				container,
				propertyIndex,
				noteIndex: new Map(),
				noteContents: new Map([['/vault/test.md', '']]),
				currentFilePath: '/vault/test.md',
				vaultPath: '/vault',
				loadScript,
			});

			await dv.view('../../etc/passwd');
			const errorEl = container.querySelector('.cm-lp-qjs-error');
			expect(errorEl).not.toBeNull();
			expect(errorEl!.textContent).toContain('traversal');
		});
	});

	describe('ui namespace', () => {
		it('dv.ui exposes render helper methods', () => {
			const dv = createAPI();
			expect(dv.ui).toBeDefined();
			expect(typeof dv.ui.cards).toBe('function');
			expect(typeof dv.ui.progressBar).toBe('function');
			expect(typeof dv.ui.heatmap).toBe('function');
			expect(typeof dv.ui.tagCloud).toBe('function');
			expect(typeof dv.ui.statusCards).toBe('function');
			expect(typeof dv.ui.timeline).toBe('function');
			expect(typeof dv.ui.table).toBe('function');
		});

		it('dv.ui.cards renders into the container', () => {
			const dv = createAPI();
			dv.ui.cards([{ label: 'Test', value: 42, color: 'blue' }]);
			expect(dv.container.querySelector('div')).not.toBeNull();
		});

		it('dv.ui returns the same instance on repeated access', () => {
			const dv = createAPI();
			expect(dv.ui).toBe(dv.ui);
		});

		it('dv.ui.table renders KBLink as clickable <a> via renderValue', () => {
			const dv = createAPI();
			dv.ui.table(
				['Note', 'Status'],
				[[{ path: '/vault/alpha.md', display: 'alpha' }, 'active']],
			);
			const a = dv.container.querySelector('a');
			expect(a).not.toBeNull();
			expect(a!.textContent).toBe('alpha');
			expect(a!.className).toBe('cm-lp-qjs-link');
		});

		it('dv.ui.table renders HTMLElement directly in cells via renderValue', () => {
			const dv = createAPI();
			const chips = document.createElement('span');
			chips.className = 'tag-chips';
			const chip1 = document.createElement('span');
			chip1.textContent = 'tag1';
			const chip2 = document.createElement('span');
			chip2.textContent = 'tag2';
			chips.appendChild(chip1);
			chips.appendChild(chip2);

			dv.ui.table(
				['Name', 'Tags'],
				[['note-a', chips]],
			);

			const cell = dv.container.querySelector('.tag-chips');
			expect(cell).not.toBeNull();
			expect(cell!.children.length).toBe(2);
			expect(cell!.children[0].textContent).toBe('tag1');
			expect(cell!.children[1].textContent).toBe('tag2');
		});
	});
});
