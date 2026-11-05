// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// `vaultStore.open` persists the recent-vaults list.
setupLocalStorage();

// Only the Tauri boundaries and the toast are mocked: the lifecycle service,
// the frontmatter writer, the editor service and every store are real, so a
// click is checked on the tab, the in-memory disk and the rendered bar.
vi.mock('@tauri-apps/plugin-fs', () => ({
	readDir: vi.fn(),
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
	mkdir: vi.fn(),
	rename: vi.fn(),
	remove: vi.fn(),
}));
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(),
}));
vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('@tauri-apps/plugin-opener', () => ({
	revealItemInDir: vi.fn(() => Promise.resolve()),
}));

// The system clipboard is a side-effect boundary.
const writeText = vi.fn((_text: string) => Promise.resolve());
Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

// jsdom has no layout: `bind:clientWidth` needs a ResizeObserver, and the
// bar's clientWidth is read from `barWidth`. `resizeBar` reports a new width
// the way the browser would.
let barWidth = 0;
const observers: { cb: ResizeObserverCallback; targets: Element[] }[] = [];
class ResizeObserverStub {
	private entry: { cb: ResizeObserverCallback; targets: Element[] };
	constructor(cb: ResizeObserverCallback) {
		this.entry = { cb, targets: [] };
		observers.push(this.entry);
	}
	observe(el: Element) { this.entry.targets.push(el); }
	unobserve(el: Element) { this.entry.targets = this.entry.targets.filter((t) => t !== el); }
	disconnect() { this.entry.targets = []; }
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
	configurable: true,
	get(this: HTMLElement) { return this.dataset.testid === 'note-action-bar' ? barWidth : 0; },
});
function resizeBar(width: number) {
	barWidth = width;
	for (const o of observers) {
		const entries = o.targets.map((target) => ({ target }) as unknown as ResizeObserverEntry);
		if (entries.length) o.cb(entries, {} as ResizeObserver);
	}
	flushSync();
}

import { mount, unmount, flushSync } from 'svelte';
import { writeTextFile, exists, rename, readDir, readTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { ask } from '@tauri-apps/plugin-dialog';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import NoteActionBar from '#lib/features/note-action-bar/NoteActionBar.svelte';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { resetEditor } from '#lib/core/editor/editor.service.js';
import { resetHooks } from '#lib/core/editor/editor.hooks.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { trashStore } from '#lib/core/trash/trash.store.svelte.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { _resetParseFrontmatterCache } from '#lib/core/frontmatter/properties.logic.js';
import { tocStore } from '#lib/plugins/table-of-contents/toc.store.svelte.js';
import { showTableOfContents } from '#lib/plugins/table-of-contents/toc.service.js';
import { parseDeepLinkUri, resolveFilePath } from '#lib/features/deep-link/deep-link.logic.js';
import {
	ACTION_SLOT_WIDTH,
	BAR_RESERVED_WIDTH,
	HUB_ACTION_WIDTH,
	type NoteHubAction,
} from '#lib/features/note-action-bar/note-action-bar.logic.js';
import { noteActionBarActionsStore } from '#lib/features/note-action-bar/note-action-bar-actions.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { extractTypeMetadata } from '#lib/features/type-definitions/type-definitions.logic.js';
import { registerOneOnOneActionBarAction } from '#lib/plugins/one-on-one/one-on-one.service.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';
import { neighbourhoodStore } from '#lib/features/rail-shell/neighbourhood.store.svelte.js';
import { NEIGHBOURHOOD_LENS_KIND, NEIGHBOURHOOD_RAIL_ITEM, restoreRailItem } from '#lib/features/rail-shell/lens.logic.js';

const PATH = '/vault/Projects/Launch plan.md';
const disk = new Map<string, string>();

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

function render(path = PATH) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(NoteActionBar, { target, props: { path, onShowTableOfContents: showTableOfContents } });
	flushSync();
}

function openNote(content: string, path = PATH) {
	disk.set(path, content);
	editorStore.addTab({ path, name: path.split('/').pop() ?? path, content, savedContent: content });
}

function button(label: RegExp): HTMLButtonElement {
	const found = [...target.querySelectorAll('button')].find((b) => label.test(b.getAttribute('aria-label') ?? ''));
	if (!found) throw new Error(`No button labelled ${label}`);
	return found;
}

/** Lets the frontmatter write (save) settle and Svelte re-render. */
async function settle(): Promise<void> {
	for (let i = 0; i < 10; i++) await Promise.resolve();
	flushSync();
}

describe('NoteActionBar', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		disk.clear();
		barWidth = 0;
		tocStore.setExpandedPath(null);
		editorStore.reset();
		settingsStore.reset();
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });
		neighbourhoodStore.reset();
		trashStore.setItems([]);
		vaultStore._reset();
		vaultStore.open('/vault');
		resetHooks();
		clearAllIndexed();
		_resetParseFrontmatterCache();
		vi.mocked(invoke).mockResolvedValue(undefined);
		vi.mocked(writeTextFile).mockImplementation(async (p, data) => {
			disk.set(String(p), String(data));
		});
		vi.mocked(exists).mockImplementation(async (p) => disk.has(String(p)));
		vi.mocked(rename).mockImplementation(async (from, to) => {
			disk.set(String(to), disk.get(String(from)) ?? '');
			disk.delete(String(from));
		});
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target?.remove();
		resetEditor();
		vaultStore._reset();
		resetHooks();
	});

	it("shows the note's type and file name", () => {
		openNote('---\n_type: project\n---\nBody\n');
		render();

		expect(target.querySelector('[data-testid="note-action-bar-type"]')?.textContent).toBe('Project');
		expect(target.querySelector('[data-testid="note-action-bar-file"]')?.textContent).toBe('Launch plan.md');
	});

	it('shows "Note" for an untyped note and for an empty one', () => {
		openNote('');
		render();

		expect(target.querySelector('[data-testid="note-action-bar-type"]')?.textContent).toBe('Note');
	});

	it('Favorite writes _favorite: true and the button turns filled with the remove label', async () => {
		openNote('---\ntitle: Plan\n---\nBody\n');
		render();
		const favorite = button(/favorites/);
		expect(favorite.title).toBe('Add to favorites (Cmd+D)');
		expect(favorite.getAttribute('aria-pressed')).toBe('false');

		favorite.click();
		await settle();

		expect(disk.get(PATH)).toBe('---\ntitle: Plan\n_favorite: true\n---\nBody\n');
		expect(favorite.getAttribute('aria-pressed')).toBe('true');
		expect(favorite.title).toBe('Remove from favorites (Cmd+D)');
		expect(favorite.querySelector('svg')?.getAttribute('fill')).toBe('currentColor');
	});

	it('Organized toggles _organized and its tooltip reads "Set note as organized" / "Set note as not organized"', async () => {
		openNote('---\ntitle: Plan\n---\nBody\n');
		render();
		const organized = button(/organized/);
		// A missing _organized reads as organized, as in the Rust index, so the toggle starts pressed.
		expect(organized.title).toBe('Set note as not organized (Cmd+E)');
		expect(organized.getAttribute('aria-pressed')).toBe('true');

		organized.click();
		await settle();

		expect(disk.get(PATH)).toBe('---\ntitle: Plan\n_organized: false\n---\nBody\n');
		expect(organized.title).toBe('Set note as organized (Cmd+E)');
		expect(organized.getAttribute('aria-pressed')).toBe('false');

		organized.click();
		await settle();

		expect(disk.get(PATH)).toBe('---\ntitle: Plan\n_organized: true\n---\nBody\n');
		expect(organized.title).toBe('Set note as not organized (Cmd+E)');
		expect(organized.getAttribute('aria-pressed')).toBe('true');
	});

	it('reflects a flag set in the editor without any click', () => {
		openNote('Body\n');
		render();
		expect(button(/favorites/).getAttribute('aria-pressed')).toBe('false');

		editorStore.updateContent('---\n_favorite: true\n---\nBody\n');
		flushSync();

		expect(button(/favorites/).getAttribute('aria-pressed')).toBe('true');
	});

	it('shows the frontmatter error toast when the note cannot be rewritten', async () => {
		const lossy = '---\ntitle: Plan # comment\n---\nBody\n';
		openNote(lossy);
		render();

		button(/favorites/).click();
		await settle();

		expect(toast.error).toHaveBeenCalledWith(
			"Launch plan.md: The note's frontmatter has comments; it cannot be rewritten without losing them",
		);
		expect(disk.get(PATH)).toBe(lossy);
		expect(button(/favorites/).getAttribute('aria-pressed')).toBe('false');
	});

	it('has no right-sidebar toggle of its own: the tab band has the only one', () => {
		openNote('Body\n');
		for (const visible of [false, true]) {
			settingsStore.updateLayout({ rightSidebarVisible: visible });
			render();
			expect([...target.querySelectorAll('button')].filter((b) => /sidebar/i.test(b.title + (b.getAttribute('aria-label') ?? '')))).toEqual([]);
			if (component) unmount(component);
			component = null;
			target.remove();
		}
	});

	it('separates Favorite and Organized, the Raw group and More with a thin divider each', () => {
		openNote('Body\n');
		render();

		const bar = target.querySelector<HTMLElement>('[data-testid="note-action-bar"]')!;
		const sequence = [...bar.children].flatMap((el) => {
			if (el.hasAttribute('data-bar-divider')) return ['|'];
			const label = el.getAttribute('aria-label');
			return el.tagName === 'BUTTON' && label ? [label] : [];
		});
		expect(sequence).toEqual([
			'Add to favorites',
			'Set note as not organized',
			'|',
			'Show raw Markdown',
			'|',
			'More note actions',
		]);
	});

	it('is a pane toolbar, like the Properties header, with no height of its own', () => {
		openNote('Body\n');
		render();

		const bar = target.querySelector<HTMLElement>('[data-testid="note-action-bar"]')!;
		expect(bar.classList).toContain('pane-toolbar');
		expect([...bar.classList].filter((c) => /^h-/.test(c))).toEqual([]);
	});

	/** Opens the More menu from the keyboard and returns its item labelled `label`. */
	async function moreItem(label: string): Promise<HTMLElement> {
		const trigger = button(/More note actions/);
		trigger.focus();
		trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		await settle();
		const item = [...document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]')].find(
			(el) => el.textContent?.trim() === label,
		);
		if (!item) throw new Error(`No More menu item "${label}"`);
		return item;
	}

	it('More > Archive this note sets _archived and the item turns into Restore', async () => {
		openNote('---\n_organized: true\n---\nBody\n');
		render();

		(await moreItem('Archive this note')).click();
		await settle();

		expect(disk.get(PATH)).toBe('---\n_organized: true\n_archived: true\n---\nBody\n');
		(await moreItem('Restore this archived note')).click();
		await settle();

		expect(disk.get(PATH)).toBe('---\n_organized: true\n_archived: false\n---\nBody\n');
	});

	it('Organized on an archived note keeps it archived', async () => {
		openNote('---\n_archived: true\n---\nBody\n');
		render();

		button(/organized/).click();
		await settle();

		// A missing _organized reads as organized, as in the Rust index, so the click turns it off.
		expect(disk.get(PATH)).toBe('---\n_archived: true\n_organized: false\n---\nBody\n');
		expect(await moreItem('Restore this archived note')).toBeTruthy();
	});

	it('More > Delete this note, confirmed, moves the note to the trash and closes its tab', async () => {
		vi.mocked(ask).mockResolvedValue(true);
		// The tree refresh after the delete rescans the vault.
		vi.mocked(invoke).mockImplementation(async (cmd: string) => (cmd === 'scan_vault' ? [] : undefined));
		openNote('Body\n');
		render();

		(await moreItem('Delete this note')).click();
		await vi.waitFor(() => expect(editorStore.tabs).toEqual([]));
		// applyPathChange closes the tab before its disk op awaits the Trash move.
		await vi.waitFor(() => expect(disk.has(PATH)).toBe(false));

		expect(trashStore.items.map((i) => i.originalPath)).toEqual(['Projects/Launch plan.md']);
		expect([...disk.keys()].some((k) => k.startsWith('/vault/.kokobrain/trash/') && k.endsWith('/Launch plan.md'))).toBe(true);
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('More > Delete this note asks for confirmation and keeps the note when declined', async () => {
		vi.mocked(ask).mockResolvedValue(false);
		openNote('Body\n');
		render();

		(await moreItem('Delete this note')).click();
		await settle();

		expect(ask).toHaveBeenCalledWith('Move "Launch plan.md" to trash?', {
			title: 'Move to Trash',
			kind: 'warning',
			okLabel: 'Move to Trash',
			cancelLabel: 'Cancel',
		});
		expect(editorStore.tabs.map((t) => t.path)).toEqual([PATH]);
		expect(disk.has(PATH)).toBe(true);
	});

	it('Raw toggles source mode and the button shows the current mode', () => {
		openNote('Body\n');
		render();
		const rawButton = button(/raw Markdown|live preview/);
		expect(rawButton.title).toBe('Show raw Markdown (Cmd+\\)');
		expect(rawButton.getAttribute('aria-pressed')).toBe('false');

		rawButton.click();
		flushSync();

		expect(editorStore.isLivePreview).toBe(false);
		expect(rawButton.getAttribute('aria-pressed')).toBe('true');
		expect(rawButton.title).toBe('Back to live preview (Cmd+\\)');

		rawButton.click();
		flushSync();

		expect(editorStore.isLivePreview).toBe(true);
	});

	/** A bar wide enough to show every foldable action inline. */
	const WIDE = BAR_RESERVED_WIDTH + 5 * ACTION_SLOT_WIDTH;

	it('note width switches the one global setting and the button shows the current state', () => {
		openNote('Body\n');
		render();
		resizeBar(WIDE);
		const widthButton = button(/note width/);
		expect(widthButton.getAttribute('aria-label')).toBe('Use the full note width');
		expect(widthButton.getAttribute('aria-pressed')).toBe('false');

		widthButton.click();
		flushSync();

		expect(settingsStore.editor.wideNotes).toBe(true);
		expect(widthButton.getAttribute('aria-label')).toBe('Use the normal note width');
		expect(widthButton.getAttribute('aria-pressed')).toBe('true');

		widthButton.click();
		flushSync();

		expect(settingsStore.editor.wideNotes).toBe(false);
	});

	it('TOC shows the right sidebar with the Table of contents section open on this note', () => {
		openNote('# Heading\n');
		settingsStore.updateLayout({ rightSidebarVisible: false });
		render();
		resizeBar(WIDE);

		button(/table of contents/).click();
		flushSync();

		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
		expect(settingsStore.layout.tableOfContentsVisible).toBe(true);
		expect(tocStore.expandedPath).toBe(PATH);
	});

	it('Reveal in Finder reveals the active note', async () => {
		openNote('Body\n');
		render();
		resizeBar(WIDE);

		button(/Reveal in Finder/).click();
		await settle();

		expect(revealItemInDir).toHaveBeenCalledWith(PATH);
	});

	it('Reveal in Finder shows an error toast when the reveal fails', async () => {
		openNote('Body\n');
		render();
		resizeBar(WIDE);
		vi.mocked(revealItemInDir).mockRejectedValueOnce(new Error('not found'));

		button(/Reveal in Finder/).click();
		await settle();

		expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Could not reveal'));
	});

	it('Copy path copies the absolute path and confirms with a toast', async () => {
		openNote('Body\n');
		render();
		resizeBar(WIDE);

		button(/Copy path/).click();
		await settle();

		expect(writeText).toHaveBeenCalledWith(PATH);
		expect(toast.success).toHaveBeenCalledWith('Path copied');
	});

	it('More > Copy deeplink copies a kokobrain://open link for this note', async () => {
		openNote('Body\n');
		render();

		(await moreItem('Copy deeplink')).click();
		await settle();

		const link = writeText.mock.calls[0][0];
		const parsed = parseDeepLinkUri(link);
		if (!parsed.ok || parsed.action.type !== 'open') throw new Error(`not an open link: ${link}`);
		expect(resolveFilePath('/vault', parsed.action.file!)).toBe(PATH);
		expect(toast.success).toHaveBeenCalledWith('Deeplink copied');
	});

	/** The foldable actions shown in the bar itself, in order. */
	function inlineActions(): string[] {
		return [...target.querySelectorAll<HTMLElement>('button[data-action]')].map((b) => b.dataset.action ?? '');
	}

	/** The foldable actions listed in the open More menu, in order. */
	function menuActions(): string[] {
		return [...document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"][data-action]')].map(
			(el) => el.dataset.action ?? '',
		);
	}

	it('starts with every foldable action in More, before and after a typical-width measure', async () => {
		openNote('Body\n');
		render();
		expect(inlineActions()).toEqual([]);

		resizeBar(700);
		expect(inlineActions()).toEqual([]);
		await moreItem('Copy deeplink');
		expect(menuActions()).toEqual(['neighbourhood', 'width', 'toc', 'reveal', 'copy-path']);
	});

	it('brings the actions inline on a wide bar and folds width, TOC and the path actions back as it narrows', async () => {
		openNote('Body\n');
		render();
		resizeBar(WIDE);
		expect(inlineActions()).toEqual(['neighbourhood', 'width', 'toc', 'reveal', 'copy-path']);

		resizeBar(BAR_RESERVED_WIDTH + 3 * ACTION_SLOT_WIDTH);
		expect(inlineActions()).toEqual(['neighbourhood', 'width', 'toc']);
		await moreItem('Copy deeplink');
		expect(menuActions()).toEqual(['reveal', 'copy-path']);
		document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await settle();

		resizeBar(BAR_RESERVED_WIDTH);
		expect(inlineActions()).toEqual([]);

		resizeBar(BAR_RESERVED_WIDTH + 5 * ACTION_SLOT_WIDTH);
		expect(inlineActions()).toEqual(['neighbourhood', 'width', 'toc', 'reveal', 'copy-path']);
	});

	/** The open More menu's entries: a foldable by its action, the rest by label, separators as `---`. */
	async function moreEntries(): Promise<string[]> {
		const content = (await moreItem('Copy deeplink')).parentElement!;
		return [...content.children].map((el) =>
			el.getAttribute('data-slot') === 'dropdown-menu-separator'
				? '---'
				: ((el as HTMLElement).dataset.action ?? el.textContent?.trim() ?? ''),
		);
	}

	it('groups More as the folded actions with Copy deeplink, then the lifecycle actions', async () => {
		openNote('Body\n');
		render();
		resizeBar(BAR_RESERVED_WIDTH + 3 * ACTION_SLOT_WIDTH);

		expect(await moreEntries()).toEqual(['reveal', 'copy-path', 'Copy deeplink', '---', 'Archive this note', 'Delete this note']);
	});

	it('draws no separator in More when nothing is folded, which would leave Copy deeplink alone', async () => {
		openNote('Body\n');
		render();
		resizeBar(WIDE);

		expect(await moreEntries()).toEqual(['Copy deeplink', 'Archive this note', 'Delete this note']);
	});

	it('a folded action still works from More', async () => {
		openNote('# Heading\n');
		settingsStore.updateLayout({ rightSidebarVisible: false });
		render();

		(await moreItem('Show the table of contents')).click();
		await settle();

		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
		expect(tocStore.expandedPath).toBe(PATH);
	});

	describe('Neighbourhood', () => {
		const neighbourhoodButton = () => target.querySelector<HTMLButtonElement>('button[data-action="neighbourhood"]');

		it('shows before Raw on a wide bar and fills the note list with this note\'s neighbourhood', () => {
			settingsStore.updateLayout({ railItem: 'inbox', railPanelsVisible: false });
			openNote('Body\n');
			render();
			resizeBar(WIDE);

			const btn = neighbourhoodButton()!;
			expect(btn.getAttribute('aria-label')).toBe("Show this note's neighbourhood in the note list");
			expect(btn.className).not.toMatch(/#[0-9a-f]{3,6}|rgb\(/i);
			expect(inlineActions()).toEqual(['neighbourhood', 'width', 'toc', 'reveal', 'copy-path']);
			const raw = button(/Show raw Markdown/);
			expect(btn.compareDocumentPosition(raw) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

			btn.click();
			flushSync();
			expect(neighbourhoodStore.notePath).toBe(PATH);
			expect(settingsStore.layout.railItem).toBe(NEIGHBOURHOOD_RAIL_ITEM);
			expect(settingsStore.layout.railPanelsVisible).toBe(true);
			expect(restoreRailItem(settingsStore.layout.railItem, [], neighbourhoodStore.notePath).lens).toEqual({
				kind: NEIGHBOURHOOD_LENS_KIND,
				target: PATH,
			});
		});

		it('folds into More last when the bar is narrow, and still works from there', async () => {
			settingsStore.updateLayout({ railItem: 'inbox' });
			openNote('Body\n');
			render();

			resizeBar(BAR_RESERVED_WIDTH + ACTION_SLOT_WIDTH);
			expect(inlineActions()).toEqual(['neighbourhood']);
			resizeBar(BAR_RESERVED_WIDTH);
			expect(inlineActions()).toEqual([]);

			const item = await moreItem("Show this note's neighbourhood in the note list");
			expect(menuActions()).toEqual(['neighbourhood', 'width', 'toc', 'reveal', 'copy-path']);
			item.click();
			await settle();
			expect(neighbourhoodStore.notePath).toBe(PATH);
			expect(settingsStore.layout.railItem).toBe(NEIGHBOURHOOD_RAIL_ITEM);
		});
	});

	describe('hub actions', () => {
		const PERSON = '/vault/People/Alice.md';
		const HUB = '/vault/Projects/Launch plan.md';

		/** Sets the type map from type definitions with the given frontmatter. */
		function types(defs: Record<string, Record<string, unknown>>) {
			typeDefinitionsStore.setTypeMetadataMap(
				new Map(
					Object.entries(defs).map(([name, fm]) => [
						name,
						extractTypeMetadata(entryV2(`/vault/${name}.md`, { title: name, isA: 'Type', frontmatter: fm as never })),
					]),
				),
			);
		}

		function hubButtons(): HTMLButtonElement[] {
			return [...target.querySelectorAll<HTMLButtonElement>('button[data-hub-action]')];
		}

		/** The `create_note` calls made, as path and content. */
		function created(): { path: string; content: string }[] {
			return vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'create_note').map(([, args]) => args as { path: string; content: string });
		}

		let unregister: (() => void) | null = null;

		beforeEach(() => {
			typeDefinitionsStore.reset();
			noteActionBarActionsStore.reset();
			unregister = registerOneOnOneActionBarAction();
			vi.mocked(readDir).mockResolvedValue([]);
			vi.mocked(readTextFile).mockImplementation(async (p) => {
				const content = disk.get(String(p));
				if (content === undefined) throw new Error(`ENOENT ${String(p)}`);
				return content;
			});
			vi.mocked(invoke).mockImplementation(async (cmd, args) => {
				const a = args as { path?: string; content?: string } | undefined;
				if (cmd === 'create_note' && a?.path) disk.set(a.path, a.content ?? '');
				if (cmd === 'scan_vault') return [];
				return undefined;
			});
		});

		afterEach(() => {
			unregister?.();
			typeDefinitionsStore.reset();
			noteActionBarActionsStore.reset();
		});

		it('New 1:1 on a Person note creates and opens a 1:1 linked to the person', async () => {
			openNote('---\n_type: Person\n---\n', PERSON);
			render(PERSON);
			expect(hubButtons().map((b) => b.textContent?.trim())).toEqual(['New 1:1']);

			hubButtons()[0].click();
			await vi.waitFor(() => expect(editorStore.activeTab?.path).not.toBe(PERSON));

			const [note] = created();
			expect(note.content).toBe('---\n_related_to: "[[Alice]]"\n---\n');
			expect(editorStore.activeTab?.path).toBe(note.path);
			expect(editorStore.activeTab?.content).toBe(note.content);
			expect(toast.error).not.toHaveBeenCalled();
		});

		it('New 1:1 keeps a template that already writes the link to one entry', async () => {
			settingsStore.updateOneOnOne({ templatePath: '_templates/1on1.md' });
			disk.set('/vault/_templates/1on1.md', '---\n_related_to: "[[<% person %>]]"\n---\n# Notes\n');
			openNote('---\n_type: Person\n---\n', PERSON);
			render(PERSON);

			hubButtons()[0].click();
			await vi.waitFor(() => expect(created()).toHaveLength(1));

			expect(created()[0].content).toBe('---\n_related_to: "[[Alice]]"\n---\n# Notes\n');
		});

		it('New 1:1 shows a toast and leaves no file when the creation fails', async () => {
			vi.mocked(invoke).mockImplementation(async (cmd) => {
				if (cmd === 'create_note') throw new Error('disk full');
				return undefined;
			});
			openNote('---\n_type: Person\n---\n', PERSON);
			render(PERSON);

			hubButtons()[0].click();
			await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to create 1:1 note.'));

			expect([...disk.keys()]).toEqual([PERSON]);
			expect(editorStore.activeTab?.path).toBe(PERSON);
		});

		it('New linked note on a hub note creates and opens a note in its folder that belongs to it', async () => {
			types({ Project: { _hub: true } });
			openNote('---\n_type: Project\n---\n', HUB);
			render(HUB);
			expect(hubButtons().map((b) => b.textContent?.trim())).toEqual(['New linked note']);

			hubButtons()[0].click();
			await vi.waitFor(() => expect(editorStore.activeTab?.path).toBe('/vault/Projects/Untitled.md'));

			expect(created()).toEqual([{ path: '/vault/Projects/Untitled.md', content: '---\n_belongs_to: "[[Launch plan]]"\n---\n' }]);
			expect(editorStore.activeTab?.content).toBe('---\n_belongs_to: "[[Launch plan]]"\n---\n');
		});

		it('New linked note shows a toast and leaves no file when the creation fails', async () => {
			types({ Project: { _hub: true } });
			vi.mocked(invoke).mockImplementation(async (cmd) => {
				if (cmd === 'create_note') throw new Error('disk full');
				return undefined;
			});
			openNote('---\n_type: Project\n---\n', HUB);
			render(HUB);

			hubButtons()[0].click();
			await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not create a note linked to "Launch plan".'));

			expect([...disk.keys()]).toEqual([HUB]);
			expect(editorStore.activeTab?.path).toBe(HUB);
		});

		it('shows neither button on untyped notes, non-hub types, or Person without the plugin', () => {
			types({ Project: { _hub: false }, Topic: {} });
			for (const content of ['', 'Body\n', '---\n_type: Project\n---\n', '---\n_type: Topic\n---\n']) {
				editorStore.reset();
				openNote(content);
				render();
				expect(hubButtons()).toEqual([]);
				if (component) unmount(component);
				component = null;
				target.remove();
			}

			unregister?.();
			unregister = null;
			editorStore.reset();
			openNote('---\n_type: Person\n---\n', PERSON);
			render(PERSON);
			expect(hubButtons()).toEqual([]);
		});

		it('follows registrations made after it mounted', () => {
			unregister?.();
			unregister = null;
			openNote('---\n_type: Person\n---\n', PERSON);
			render(PERSON);
			expect(hubButtons()).toEqual([]);

			const action: NoteHubAction = { id: 'x', label: 'New 1:1', typeName: 'Person', run: async () => {} };
			const off = noteActionBarActionsStore.register(action);
			flushSync();
			expect(hubButtons().map((b) => b.dataset.hubAction)).toEqual(['x']);

			off();
			flushSync();
			expect(hubButtons()).toEqual([]);
		});

		it('leaves room for the hub button when folding', () => {
			types({ Project: { _hub: true } });
			openNote('---\n_type: Project\n---\n', HUB);
			render(HUB);

			resizeBar(BAR_RESERVED_WIDTH + 5 * ACTION_SLOT_WIDTH);
			expect(inlineActions()).toEqual([]);
			resizeBar(BAR_RESERVED_WIDTH + HUB_ACTION_WIDTH + 5 * ACTION_SLOT_WIDTH);
			expect(inlineActions()).toEqual(['neighbourhood', 'width', 'toc', 'reveal', 'copy-path']);
		});
	});
});
