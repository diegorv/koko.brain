// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// bits-ui Popover positions via @floating-ui/dom, which needs ResizeObserver.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// openFileInEditor hits Tauri IPC — legitimately mocked. Stores stay real
// (CLAUDE.md rule 1): the view is driven through the real collectionStore
// and the rendered DOM, with the harness round-tripping onYamlChange.
vi.mock('#lib/core/editor/editor.service.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/core/editor/editor.service.js')>()),
	openFileInEditor: vi.fn(),
}));

// The `.view` row-set case registers the app ports and counts the view
// through `countViewNotes`, which reads the `.view` from disk: Tauri IPC and
// the disk are mocked, the stores stay real.
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())), emit: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn(), writeTextFile: vi.fn() }));

import { mount, unmount, flushSync } from 'svelte';
import CollectionViewHarness from '../../../fixtures/CollectionViewHarness.svelte';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { executeQuery } from '#lib/features/collection/collection.logic.js';
import { parseCollectionYaml } from '#lib/features/collection/yaml-parser.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { registerAppPorts, unregisterAppPorts } from '#lib/app/boot.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import { clearAllViewParseCache } from '#lib/features/type-definitions/view-parse-cache.js';
import { countViewNotes } from '#lib/features/rail-shell/view-lens.service.js';
import {
	RECENT_NEWEST_THREE,
	RECENT_VAULT,
	RECENT_VIEW,
	RECENT_VIEW_YAML,
	recentEntries,
	recentIndex,
} from '../../../fixtures/recent-view.fixture';

const YAML = `filters: 'status == "open"'
views:
  - type: table
    name: "All"
`;

interface HarnessApi {
	setYaml: (yaml: string) => void;
	getYaml: () => string;
}

describe('CollectionView — selfUpdate latch', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let api: HarnessApi | undefined;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		collectionStore.reset();
		collectionStore.setPropertyIndex(new Map()); // index ready, empty vault
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		api = undefined;
		document.body.innerHTML = '';
	});

	function mountView(yaml = YAML): void {
		component = mount(CollectionViewHarness, {
			target,
			props: { initialYaml: yaml, register: (a: HarnessApi) => { api = a; } },
		});
		flushSync();
	}

	/** Opens the Filter popover via its toolbar trigger (ListFilter icon). */
	function openFilterPanel(): void {
		const icon = document.querySelector('svg.lucide-list-filter');
		const trigger = icon?.closest('button');
		if (!trigger) throw new Error('filter toolbar button not found');
		trigger.click();
		flushSync();
	}

	/** The structured filter row's value input (renders in the popover portal). */
	function valueInput(): HTMLInputElement {
		const input = document.querySelector<HTMLInputElement>('input[placeholder="Value..."]');
		if (!input) throw new Error('filter value input not found — row did not render');
		return input;
	}

	it('keeps the filter row input mounted and focused across a per-keystroke self-persist', () => {
		mountView();
		openFilterPanel();

		const input = valueInput();
		expect(input.value).toBe('open');
		input.focus();
		expect(document.activeElement).toBe(input);

		// One keystroke: FilterRow fires onUpdate per input event → CollectionView
		// persistState → onYamlChange → the harness round-trips the new yaml back
		// down as a prop change. The selfUpdate latch must swallow exactly this
		// round-trip; if the guard re-runs into the reset branch, the seeding
		// effect regenerates row uids and the keyed each replaces this input.
		input.value = 'opened';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		expect(api?.getYaml()).toContain('opened'); // the persist itself happened
		expect(input.isConnected).toBe(true);
		expect(document.activeElement).toBe(input);
	});

	it('does not wipe an in-progress (editing) formula entry when another persist fires', () => {
		mountView();
		openFilterPanel();

		// Two consecutive keystrokes: the second runs against the re-seeded state
		// if the latch is broken, so its target element differs and the typed
		// value of the first edit is what survives in the yaml.
		const input = valueInput();
		input.value = 'a';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		const after = document.querySelector<HTMLInputElement>('input[placeholder="Value..."]');
		expect(after).toBe(input);
	});

	it('still re-seeds local state when the yaml changes externally', () => {
		mountView();
		openFilterPanel();
		const input = valueInput();

		// External change (vault sync, another tab): NOT routed through
		// onYamlChange, so the reset branch MUST run and re-seed the rows.
		api?.setYaml(`filters: 'status == "closed"'
views:
  - type: table
    name: "All"
`);
		flushSync();

		const reseeded = valueInput();
		expect(reseeded).not.toBe(input);
		expect(reseeded.value).toBe('closed');
	});
});

function makeRecord(path: string, props: Record<string, unknown>): PropertyIndexRecord {
	const name = path.split('/').pop() ?? path;
	return {
		path,
		name,
		basename: name.replace(/\.md$/, ''),
		folder: path.substring(0, path.lastIndexOf('/')),
		ext: '.md',
		mtime: 0,
		ctime: 0,
		size: 0,
		properties: new Map(Object.entries(props)),
	};
}

describe('CollectionView — first render', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		clearLocalStorage();
		collectionStore.reset();
		const index = new Map<string, PropertyIndexRecord>();
		for (let i = 0; i < 200; i++) {
			const path = `/vault/note-${i}.md`;
			index.set(path, makeRecord(path, { status: i < 3 ? 'open' : 'closed' }));
		}
		collectionStore.setPropertyIndex(index);
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('applies the yaml filters before the first render, so no unfiltered rows are built and torn down', () => {
		const observer = new MutationObserver(() => {});
		observer.observe(target, { childList: true, subtree: true });

		component = mount(CollectionViewHarness, { target, props: { initialYaml: YAML } });
		flushSync();

		const removedRows = observer
			.takeRecords()
			.flatMap((m) => [...m.removedNodes])
			.filter((n) => n.nodeName === 'TR');
		observer.disconnect();

		expect(removedRows).toHaveLength(0);
		expect(target.querySelectorAll('tbody tr')).toHaveLength(3);
	});

	it('runs the query once on mount: the reset effect does not undo the mount-time seed', () => {
		// A filtered-out record is read only by the query's filter (it renders no
		// row), so its property reads count the queries that ran. If the reset
		// effect's first run cleared `initialized`, the view would re-seed and run
		// a second whole-vault query; the keyed rows hide that from the DOM.
		let reads = 0;
		const probe = makeRecord('/vault/probe.md', { status: 'closed' });
		const properties = probe.properties;
		probe.properties = new Proxy(properties, {
			get(map, key) {
				if (key === 'get') {
					return (k: string) => {
						reads++;
						return map.get(k);
					};
				}
				const value = Reflect.get(map, key, map);
				return typeof value === 'function' ? value.bind(map) : value;
			},
		});
		const index = new Map(collectionStore.propertyIndex);
		index.set(probe.path, probe);
		collectionStore.setPropertyIndex(index);

		component = mount(CollectionViewHarness, { target, props: { initialYaml: YAML } });
		flushSync();

		expect(target.querySelectorAll('tbody tr')).toHaveLength(3);
		expect(reads).toBe(1);
	});
});

describe('CollectionView — row cap across view tabs', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		clearLocalStorage();
		collectionStore.reset();
		const index = new Map<string, PropertyIndexRecord>();
		for (let i = 0; i < 450; i++) {
			const path = `/vault/note-${i}.md`;
			index.set(path, makeRecord(path, {}));
		}
		collectionStore.setPropertyIndex(index);
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function button(label: string): HTMLButtonElement {
		const found = [...target.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
		if (!found) throw new Error(`button "${label}" not found`);
		return found;
	}

	it('starts a newly selected table tab at the row cap, not at the previous tab\'s expanded count', () => {
		component = mount(CollectionViewHarness, {
			target,
			props: {
				initialYaml: `views:
  - type: table
    name: "First"
  - type: table
    name: "Second"
`,
			},
		});
		flushSync();
		expect(target.querySelectorAll('tbody tr')).toHaveLength(200);

		button('Show more').click();
		flushSync();
		expect(target.querySelectorAll('tbody tr')).toHaveLength(400);

		button('Second').click();
		flushSync();
		expect(target.querySelectorAll('tbody tr')).toHaveLength(200);
		expect(target.textContent).toContain('Showing 200 of 450');
	});
});

describe('CollectionView — remembered view index', () => {
	const PATH = '/vault/two-views.collection';
	const TWO_VIEWS = `views:
  - type: table
    name: "First"
  - type: table
    name: "Second"
`;
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		clearLocalStorage();
		collectionStore.reset();
		collectionStore.setPropertyIndex(new Map());
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function activeViewName(): string | undefined {
		return [...target.querySelectorAll('button.font-medium')].map((b) => b.textContent?.trim())[0];
	}

	it('clamps a remembered index larger than the file\'s view count', () => {
		collectionStore.setViewIndex(PATH, 5);

		component = mount(CollectionViewHarness, { target, props: { initialYaml: TWO_VIEWS, path: PATH } });
		flushSync();

		expect(activeViewName()).toBe('Second');
		expect(collectionStore.getViewIndex(PATH)).toBe(1);
	});

	it('keeps the remembered index when the YAML does not parse', () => {
		collectionStore.setViewIndex(PATH, 1);

		component = mount(CollectionViewHarness, { target, props: { initialYaml: 'views: [unclosed', path: PATH } });
		flushSync();

		expect(collectionStore.getViewIndex(PATH)).toBe(1);
	});

	it('opens on the first view when nothing is remembered, and remembers a tab switch', () => {
		component = mount(CollectionViewHarness, { target, props: { initialYaml: TWO_VIEWS, path: PATH } });
		flushSync();
		expect(activeViewName()).toBe('First');

		[...target.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Second')!.click();
		flushSync();

		expect(collectionStore.getViewIndex(PATH)).toBe(1);
	});
});

describe('CollectionView — nested filter objects', () => {
	// A nested object in the global filters (next to a visual row) and one alone
	// in the view's `and:` list, which must not collapse to a plain string.
	const NESTED = `filters:
  and:
    - "status == 'open'"
    - or:
        - "priority > 3"
        - "file.name == 'note-1.md'"
views:
  - type: table
    name: "All"
    order:
      - file.name
      - status
      - priority
    filters:
      and:
        - not:
            - "archived == true"
`;
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let api: HarnessApi | undefined;

	beforeEach(() => {
		clearLocalStorage();
		collectionStore.reset();
		const index = new Map<string, PropertyIndexRecord>();
		for (let i = 0; i < 12; i++) {
			const path = `/vault/note-${i}.md`;
			index.set(path, makeRecord(path, {
				status: i % 3 === 2 ? 'closed' : 'open',
				priority: i % 6,
				archived: i % 4 === 0,
			}));
		}
		collectionStore.setPropertyIndex(index);
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		api = undefined;
		document.body.innerHTML = '';
	});

	/** The definition as written in the YAML, parsed without the toolbar round-trip. */
	function rawDefinition(yaml: string) {
		const parsed = parseCollectionYaml(yaml);
		if (!parsed.success) throw new Error('fixture yaml does not parse');
		return parsed.definition;
	}

	/** The file names in the rendered table's first column (file.name). */
	function renderedNames(): string[] {
		return [...target.querySelectorAll('tbody tr')].map((tr) => tr.querySelector('td')?.textContent?.trim() ?? '');
	}

	/** Clicks the toolbar button holding the given lucide icon (opens its popover). */
	function openPopover(icon: string): void {
		const trigger = document.querySelector(`svg.lucide-${icon}`)?.closest('button');
		if (!trigger) throw new Error(`${icon} toolbar button not found`);
		trigger.click();
		flushSync();
	}

	it('renders the same rows as executeQuery on the raw definition', () => {
		const def = rawDefinition(NESTED);
		const expected = executeQuery(def, def.views[0], collectionStore.propertyIndex).records.map((r) => r.name);
		expect(expected.length).toBeGreaterThan(0);

		component = mount(CollectionViewHarness, { target, props: { initialYaml: NESTED } });
		flushSync();

		expect(renderedNames()).toEqual(expected);
	});

	it('keeps both nested objects in the YAML across a sort, a filter edit and a column change', () => {
		const original = rawDefinition(NESTED);
		component = mount(CollectionViewHarness, {
			target,
			props: { initialYaml: NESTED, register: (a: HarnessApi) => { api = a; } },
		});
		flushSync();

		// Sort: click the status header.
		const statusHeader = [...target.querySelectorAll('th')].find((th) => th.textContent?.trim() === 'status');
		if (!statusHeader) throw new Error('status header not found');
		statusHeader.click();
		flushSync();
		expect(api?.getYaml()).toContain('sort:');

		// Filter: edit the visual row next to the nested object, then restore it.
		openPopover('list-filter');
		const value = document.querySelector<HTMLInputElement>('input[placeholder="Value..."]');
		if (!value) throw new Error('filter value input not found');
		value.value = 'opened';
		value.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		expect(api?.getYaml()).toContain('opened'); // the edit reached the YAML
		const edited = document.querySelector<HTMLInputElement>('input[placeholder="Value..."]')!;
		edited.value = 'open';
		edited.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		// Columns: hide the priority column.
		openPopover('columns-3');
		const priority = [...document.querySelectorAll('label')].find((l) => l.textContent?.trim() === 'priority');
		const checkbox = priority?.querySelector<HTMLInputElement>('input[type="checkbox"]');
		if (!checkbox) throw new Error('priority column checkbox not found');
		checkbox.click();
		flushSync();

		const saved = rawDefinition(api!.getYaml());
		expect(saved.views[0].order).toEqual(['file.name', 'status']);
		expect(saved.views[0].sort).toEqual([{ column: 'status', direction: 'ASC' }]);
		expect(saved.filters).toEqual(original.filters);
		expect(saved.views[0].filters).toEqual(original.views[0].filters);
	});
});

describe('CollectionView — a filter that does not parse', () => {
	const BAD = `filters: "status = 'open'"
views:
  - type: table
    name: "All"
    order:
      - file.name
`;
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		clearLocalStorage();
		collectionStore.reset();
		collectionStore.setPropertyIndex(new Map([
			['/vault/a.md', makeRecord('/vault/a.md', { status: 'open' })],
			['/vault/b.md', makeRecord('/vault/b.md', { status: 'closed' })],
		]));
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function mountView(yaml: string): void {
		component = mount(CollectionViewHarness, { target, props: { initialYaml: yaml } });
		flushSync();
	}

	it('shows the error naming the expression in place of the view body and keeps the toolbar', () => {
		mountView(BAD);

		const error = target.querySelector('[role="alert"]');
		expect(error?.textContent).toContain("status = 'open'");
		expect(target.querySelector('table')).toBeNull();
		expect(target.querySelector('svg.lucide-list-filter')?.closest('button')).not.toBeNull();
		expect(target.textContent).not.toContain('Parse Error');
	});

	it('shows the rows again once the filter is fixed in the toolbar', () => {
		mountView(BAD);
		document.querySelector('svg.lucide-list-filter')!.closest('button')!.click();
		flushSync();

		const input = document.querySelector<HTMLInputElement>('input[placeholder="Expression..."]');
		if (!input) throw new Error('raw filter input not found');
		input.value = "status == 'open'";
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		expect(target.querySelector('[role="alert"]')).toBeNull();
		expect([...target.querySelectorAll('tbody tr')].map((tr) => tr.textContent?.trim())).toEqual(['a.md']);
	});

	it('shows the error over a calendar view too', () => {
		mountView(`filters: "foo(1) == 2"
views:
  - type: calendar
    name: "Cal"
    dateProperty: due
`);

		expect(target.querySelector('[role="alert"]')?.textContent).toContain('foo');
	});
});

describe('CollectionView - a .view lists its row set', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		clearLocalStorage();
		clearAllViewParseCache();
		collectionStore.reset();
		collectionStore.setPropertyIndex(recentIndex());
		typeDefinitionsStore.setEntries(recentEntries());
		vaultStore.open(RECENT_VAULT);
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			if (String(p) === RECENT_VIEW) return RECENT_VIEW_YAML;
			throw new Error(`No such file: ${String(p)}`);
		});
		// As the app shell does it: once, synchronously.
		registerAppPorts();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		unregisterAppPorts();
		typeDefinitionsStore.reset();
		vaultStore.close();
		document.body.innerHTML = '';
	});

	function mountAt(path: string, yaml: string): void {
		component = mount(CollectionViewHarness, { target, props: { initialYaml: yaml, path } });
		flushSync();
	}

	/** The paths of the rendered rows, matched by file name against the index. */
	function renderedPaths(): string[] {
		const byName = new Map([...collectionStore.propertyIndex.values()].map((r) => [r.name, r.path]));
		return [...target.querySelectorAll('tbody tr')].map((tr) => {
			const name = [...tr.querySelectorAll('td')].map((td) => td.textContent?.trim() ?? '').find((t) => byName.has(t));
			return name ? byName.get(name)! : '';
		});
	}

	function resultsText(): string | undefined {
		return [...target.querySelectorAll('span')].map((s) => s.textContent?.trim()).find((t) => t?.endsWith('results'));
	}

	function openSortPanel(): void {
		const trigger = document.querySelector('svg.lucide-arrow-up-down')?.closest('button');
		if (!trigger) throw new Error('sort toolbar button not found');
		trigger.click();
		flushSync();
	}

	it('renders "3 results", the three newest plain notes, the count countViewNotes gives the path', async () => {
		mountAt(RECENT_VIEW, RECENT_VIEW_YAML);

		expect(resultsText()).toBe('3 results');
		expect(renderedPaths()).toEqual(RECENT_NEWEST_THREE);
		const entries = typeDefinitionsStore.entries;
		const counts = await countViewNotes([RECENT_VIEW], {
			entries,
			vaultPath: vaultStore.path,
			systemFolder: settingsStore.templates.systemFolder,
			typeMetadataMap: buildTypeMetadataMap(entries),
			fileTree: [],
		}, collectionStore.propertyIndex);
		expect(counts.get(RECENT_VIEW)).toEqual({ count: 3 });
	});

	it('keeps the plain query for a .collection: an archived note still shows and limit slices the query order', () => {
		mountAt(`${RECENT_VAULT}/Recent.collection`, RECENT_VIEW_YAML);

		expect(resultsText()).toBe('3 results');
		expect(renderedPaths()).toEqual(
			executeQuery({ views: [{ type: 'table', name: 'Recent', limit: 3 }] }, { type: 'table', name: 'Recent', limit: 3 }, recentIndex()).records.map((r) => r.path),
		);
		expect(renderedPaths()).toContain(`${RECENT_VAULT}/old.md`);
	});

	it('keeps the plain query for a .view when no port is registered', () => {
		unregisterAppPorts();
		mountAt(RECENT_VIEW, RECENT_VIEW_YAML);

		expect(renderedPaths()).toContain(`${RECENT_VAULT}/old.md`);
	});

	it("shows the effective sort in the Sort panel of a .view that has no sort of its own", () => {
		mountAt(RECENT_VIEW, RECENT_VIEW_YAML);
		openSortPanel();

		expect(document.body.textContent).toContain('Sorted by the default: modified, newest first');
		expect(document.body.textContent).not.toContain('No sorts applied');
	});

	it("names the .view's _sort in the Sort panel", () => {
		typeDefinitionsStore.setEntries(recentEntries().map((e) => (e.path === RECENT_VIEW ? { ...e, frontmatter: { _sort: 'title' } } : e)));
		mountAt(RECENT_VIEW, RECENT_VIEW_YAML);
		openSortPanel();

		expect(document.body.textContent).toContain('Sorted by _sort: title');
	});

	it('still says "No sorts applied" in the Sort panel of a .collection', () => {
		mountAt(`${RECENT_VAULT}/Recent.collection`, RECENT_VIEW_YAML);
		openSortPanel();

		expect(document.body.textContent).toContain('No sorts applied');
		expect(document.body.textContent).not.toContain('Sorted by');
	});
});

describe('CollectionView — view tab menu', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		clearLocalStorage();
		collectionStore.reset();
		collectionStore.setPropertyIndex(new Map());
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('lists Rename, Change type and Delete view as one group', async () => {
		component = mount(CollectionViewHarness, {
			target,
			props: { initialYaml: 'views:\n  - type: table\n    name: "First"\n  - type: table\n    name: "Second"\n' },
		});
		flushSync();

		const tab = [...target.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'First')!;
		tab.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 1, clientY: 1 }));
		for (let i = 0; i < 5; i++) await Promise.resolve();
		flushSync();

		const menu = [...document.querySelectorAll('[role="menu"]')].find((m) => m.getAttribute('data-state') === 'open')!;
		const entries = [...menu.children].map((m) =>
			m.getAttribute('data-slot') === 'context-menu-separator' ? '---' : (m.textContent?.trim() ?? ''),
		);
		expect(entries).toEqual(['Rename', 'Change type', 'Delete view']);
	});
});
