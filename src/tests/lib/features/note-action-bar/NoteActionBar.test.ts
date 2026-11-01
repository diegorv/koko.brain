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

import { mount, unmount, flushSync } from 'svelte';
import { writeTextFile, exists, rename } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { ask } from '@tauri-apps/plugin-dialog';
import NoteActionBar from '#lib/features/note-action-bar/NoteActionBar.svelte';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { resetEditor } from '#lib/core/editor/editor.service.js';
import { resetHooks } from '#lib/core/editor/editor.hooks.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { trashStore } from '#lib/core/trash/trash.store.svelte.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { _resetParseFrontmatterCache } from '#lib/features/properties/properties.logic.js';

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
});
