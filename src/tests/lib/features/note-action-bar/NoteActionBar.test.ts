// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// `vaultStore.open` persists the recent-vaults list.
setupLocalStorage();

// Only the Tauri boundaries and the toast are mocked: the lifecycle service,
// the frontmatter writer, the editor service and every store are real, so a
// click is checked on the tab, the in-memory disk and the rendered bar.
vi.mock('@tauri-apps/plugin-fs', () => ({
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
import { writeTextFile, exists, rename } from '@tauri-apps/plugin-fs';
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
import { _resetParseFrontmatterCache } from '#lib/features/properties/properties.logic.js';
import { tocStore } from '#lib/plugins/table-of-contents/toc.store.svelte.js';
import { parseDeepLinkUri, resolveFilePath } from '#lib/features/deep-link/deep-link.logic.js';
import { ACTION_SLOT_WIDTH, BAR_RESERVED_WIDTH } from '#lib/features/note-action-bar/note-action-bar.logic.js';

const PATH = '/vault/Projects/Launch plan.md';
const disk = new Map<string, string>();

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

function render(path = PATH) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(NoteActionBar, { target, props: { path } });
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
		expect(organized.title).toBe('Set note as organized (Cmd+E)');

		organized.click();
		await settle();

		expect(disk.get(PATH)).toBe('---\ntitle: Plan\n_organized: true\n---\nBody\n');
		expect(organized.title).toBe('Set note as not organized (Cmd+E)');
		expect(organized.getAttribute('aria-pressed')).toBe('true');

		organized.click();
		await settle();

		expect(disk.get(PATH)).toBe('---\ntitle: Plan\n_organized: false\n---\nBody\n');
		expect(organized.title).toBe('Set note as organized (Cmd+E)');
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

	it('the right-sidebar button toggles the sidebar like Cmd+B', () => {
		openNote('Body\n');
		settingsStore.updateLayout({ rightSidebarVisible: false });
		render();
		const toggle = button(/right sidebar/);
		expect(toggle.title).toBe('Open the right sidebar (Cmd+B)');

		toggle.click();
		flushSync();

		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
		expect(toggle.title).toBe('Close the right sidebar (Cmd+B)');

		toggle.click();
		flushSync();

		expect(settingsStore.layout.rightSidebarVisible).toBe(false);
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

		expect(disk.get(PATH)).toBe('---\n_archived: true\n_organized: true\n---\nBody\n');
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

		expect(disk.has(PATH)).toBe(false);
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

		expect(ask).toHaveBeenCalledWith('Move "Launch plan.md" to trash?', { title: 'Move to Trash', kind: 'warning' });
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

	it('note width switches the one global setting and the button shows the current state', () => {
		openNote('Body\n');
		render();
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

		button(/table of contents/).click();
		flushSync();

		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
		expect(settingsStore.layout.tableOfContentsVisible).toBe(true);
		expect(tocStore.expandedPath).toBe(PATH);
	});

	it('Reveal in Finder reveals the active note', async () => {
		openNote('Body\n');
		render();

		button(/Reveal in Finder/).click();
		await settle();

		expect(revealItemInDir).toHaveBeenCalledWith(PATH);
	});

	it('Reveal in Finder shows an error toast when the reveal fails', async () => {
		openNote('Body\n');
		render();
		vi.mocked(revealItemInDir).mockRejectedValueOnce(new Error('not found'));

		button(/Reveal in Finder/).click();
		await settle();

		expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Could not reveal'));
	});

	it('Copy path copies the absolute path and confirms with a toast', async () => {
		openNote('Body\n');
		render();

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

	it('folds width, TOC and the path actions into More as the bar narrows, and back when space returns', async () => {
		openNote('Body\n');
		render();
		expect(inlineActions()).toEqual(['width', 'toc', 'reveal', 'copy-path']);

		resizeBar(BAR_RESERVED_WIDTH + 2 * ACTION_SLOT_WIDTH);
		expect(inlineActions()).toEqual(['width', 'toc']);
		await moreItem('Copy deeplink');
		expect(menuActions()).toEqual(['reveal', 'copy-path']);
		document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await settle();

		resizeBar(BAR_RESERVED_WIDTH);
		expect(inlineActions()).toEqual([]);

		resizeBar(BAR_RESERVED_WIDTH + 4 * ACTION_SLOT_WIDTH);
		expect(inlineActions()).toEqual(['width', 'toc', 'reveal', 'copy-path']);
	});

	it('a folded action still works from More', async () => {
		openNote('# Heading\n');
		settingsStore.updateLayout({ rightSidebarVisible: false });
		render();
		resizeBar(BAR_RESERVED_WIDTH);

		(await moreItem('Show the table of contents')).click();
		await settle();

		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
		expect(tocStore.expandedPath).toBe(PATH);
	});
});
