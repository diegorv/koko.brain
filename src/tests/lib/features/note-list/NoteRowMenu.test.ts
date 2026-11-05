// @vitest-environment jsdom
// The shared note row and its context menu, mounted without a list around them,
// as both the classic Types note list and the rail note list use them.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// The icon picker's ScrollArea observes its size; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	getAllIconPacks: vi.fn(() => []),
	getIconsForPack: vi.fn(() => []),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('#lib/core/editor/editor.service.js', () => ({ openFileInEditor: vi.fn() }));
vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	deleteItem: vi.fn(),
	duplicateItem: vi.fn(),
	renameItem: vi.fn(),
	revealInSystemExplorer: vi.fn(),
}));
vi.mock('#lib/features/file-icons/file-icons.service.js', () => ({
	setIconForPath: vi.fn(),
	setIconColors: vi.fn(),
	removeIconForPath: vi.fn(),
	trackRecentIcon: vi.fn(),
}));
vi.mock('#lib/features/properties/lifecycle.service.js', () => ({
	toggleFavoriteForPath: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import NoteRowMenuHarness from '../../../fixtures/NoteRowMenuHarness.svelte';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { setIconColors } from '#lib/features/file-icons/file-icons.service.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { deleteItem, duplicateItem, renameItem, revealInSystemExplorer } from '#lib/core/filesystem/fs.service.js';
import { PreDeleteSaveError } from '#lib/core/filesystem/fs.logic.js';
import { toggleFavoriteForPath } from '#lib/features/properties/lifecycle.service.js';
import { ask } from '@tauri-apps/plugin-dialog';
import { toast } from 'svelte-sonner';
import type { NoteRowNote } from '#lib/features/note-list/note-row.types.js';

const ALPHA = '/vault/notes/alpha.md';
const BETA = '/vault/notes/beta.md';

const makeNote = (overrides: Partial<NoteRowNote>): NoteRowNote => ({
	path: ALPHA,
	title: 'Alpha',
	favorite: false,
	modifiedAt: 0,
	frontmatter: {},
	...overrides,
});

const notes: NoteRowNote[] = [
	makeNote({ path: ALPHA, title: 'Alpha' }),
	makeNote({ path: BETA, title: 'Beta', favorite: true }),
];

const MENU_LABELS = [
	'Open in new tab',
	'Duplicate',
	'Copy path',
	'Change icon',
	'Favorite',
	'Reveal in Finder',
	'Rename',
	'Move to Trash',
];

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

describe('NoteRowMenu', () => {
	let target: HTMLElement;
	let component: { setNotes: (next: NoteRowNote[]) => void } | null = null;
	const writeText = vi.fn();

	function mountHarness(props: Record<string, unknown> = {}) {
		component = mount(NoteRowMenuHarness, { target, props: { notes, ...props } }) as typeof component;
		flushSync();
	}

	function row(title: string): HTMLElement {
		return [...target.querySelectorAll<HTMLElement>('[data-note-row]')].find(
			(el) => el.querySelector('.truncate')?.textContent?.trim() === title,
		)!;
	}

	function menuLabels(): string[] {
		return [...document.querySelectorAll('[role="menuitem"]')].map(
			(el) => el.querySelector('span')?.textContent?.trim() ?? '',
		);
	}

	async function rightClick(el: Element) {
		el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
		await settle();
	}

	/** jsdom never fires the exit animation's end, so a closed menu stays in the DOM with data-state="closed". */
	/** The open menu's entries, separators as `---`. */
	function menuEntries(): string[] {
		const menu = [...document.querySelectorAll('[role="menu"]')].find((m) => m.getAttribute('data-state') === 'open')!;
		return [...menu.children].map((m) =>
			m.getAttribute('data-slot') === 'context-menu-separator' ? '---' : (m.querySelector('span')?.textContent?.trim() ?? ''),
		);
	}

	function menuIsOpen(): boolean {
		return [...document.querySelectorAll('[role="menu"]')].some((el) => el.getAttribute('data-state') === 'open');
	}

	async function clickItem(label: string) {
		const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) =>
			el.textContent?.trim().startsWith(label),
		)!;
		item.click();
		await settle();
	}

	async function chooseMenuItem(title: string, label: string) {
		await rightClick(row(title));
		await clickItem(label);
	}

	beforeEach(() => {
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		fsStore.reset();
		fileIconsStore.reset();
		vi.clearAllMocks();
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
	});

	describe('row', () => {
		it('renders the title, the property pills and the subtitle', () => {
			const note = makeNote({ frontmatter: { status: 'open', tags: ['a', 'b'] } });
			mountHarness({ notes: [note], listProperties: ['status', 'tags'], subtitle: 'Project · 2h ago · Work' });

			const r = row('Alpha');
			expect([...r.querySelectorAll('.flex-wrap span')].map((el) => el.textContent?.trim())).toEqual(['open', 'a', 'b']);
			expect(r.querySelector('[data-note-row-subtitle]')?.textContent).toBe('Project · 2h ago · Work');
		});

		it('renders no date line without a subtitle, even when the note has a modified time', () => {
			const note = makeNote({ modifiedAt: Math.floor(Date.now() / 1000) });
			mountHarness({ notes: [note] });

			const r = row('Alpha');
			expect(r.querySelector('[data-note-row-subtitle]')).toBeNull();
			expect(r.textContent?.trim()).toBe('Alpha');
		});

		it('renders no pills and no date line when the note has neither', () => {
			mountHarness({ notes: [makeNote({})], listProperties: [] });

			const r = row('Alpha');
			expect(r.querySelector('.flex-wrap')).toBeNull();
			expect(r.textContent?.trim()).toBe('Alpha');
		});

		it('sets the title in the row role, the size of the tree rows next to the list', () => {
			mountHarness({ notes: [makeNote({})] });

			const title = row('Alpha').querySelector('[data-note-row-title]')!;
			expect(title.textContent?.trim()).toBe('Alpha');
			expect(title.classList).toContain('text-row');
			expect(title.className).not.toMatch(/text-\[\d+px\]/);
		});

		it('highlights only the active row', () => {
			mountHarness({ activePath: BETA });

			expect(row('Beta').classList.contains('bg-primary/25')).toBe(true);
			expect(row('Alpha').classList.contains('bg-primary/25')).toBe(false);
		});

		it('opens the note on click', () => {
			mountHarness();
			row('Alpha').click();
			expect(openFileInEditor).toHaveBeenCalledWith(ALPHA);
		});

		it('opens a resolved wikilink pill and leaves the row closed', () => {
			const note = makeNote({ frontmatter: { project: '[[Beta]]' } });
			mountHarness({ notes: [note], listProperties: ['project'], allPaths: [ALPHA, BETA] });

			const pill = row('Alpha').querySelector<HTMLElement>('[role="link"]')!;
			pill.click();
			expect(openFileInEditor).toHaveBeenCalledTimes(1);
			expect(openFileInEditor).toHaveBeenCalledWith(BETA);
		});

		it('opens a path-style pill at its vault-relative file before an earlier suffix match', () => {
			const note = makeNote({ frontmatter: { cover: '[[b/foo.png]]' } });
			mountHarness({ notes: [note], listProperties: ['cover'], allPaths: ['/vault/x/b/foo.png', '/vault/b/foo.png'] });

			row('Alpha').querySelector<HTMLElement>('[role="link"]')!.click();
			expect(openFileInEditor).toHaveBeenCalledWith('/vault/b/foo.png');
		});
	});

	describe('menu', () => {
		it('lists every item in order', async () => {
			mountHarness();
			await rightClick(row('Alpha'));
			expect(menuLabels()).toEqual(MENU_LABELS);
			expect(menuIsOpen()).toBe(true);
		});

		it('hints the rename key on Rename, the key the row listens for', async () => {
			mountHarness();
			await rightClick(row('Alpha'));
			const rename = [...document.querySelectorAll('[role="menuitem"]')].find(
				(el) => el.querySelector('span')?.textContent?.trim() === 'Rename',
			)!;
			expect(rename.querySelector('[data-slot="context-menu-shortcut"]')?.textContent).toBe('F2');
		});

		it('labels the item Unfavorite on a favorite note', async () => {
			mountHarness();
			await rightClick(row('Beta'));
			expect(menuLabels()).toContain('Unfavorite');
			expect(menuLabels()).not.toContain('Favorite');
		});

		it('groups the items so no group holds a single item', async () => {
			mountHarness();
			await rightClick(row('Alpha'));
			expect(menuEntries()).toEqual([
				'Open in new tab', 'Duplicate', '---',
				'Copy path', 'Change icon', 'Favorite', 'Reveal in Finder', '---',
				'Rename', 'Move to Trash',
			]);
		});

		it('keeps two items in the middle group of a non-markdown row', async () => {
			const canvas = makeNote({ path: '/vault/notes/Board.canvas', title: 'Board' });
			mountHarness({ notes: [...notes, canvas] });
			await rightClick(row('Board'));
			expect(menuEntries()).toEqual([
				'Open in new tab', 'Duplicate', '---',
				'Copy path', 'Reveal in Finder', '---',
				'Rename', 'Move to Trash',
			]);
		});

		it('offers no Change icon or Favorite on a non-markdown row, which has no frontmatter to write', async () => {
			const canvas = makeNote({ path: '/vault/notes/Board.canvas', title: 'Board' });
			mountHarness({ notes: [...notes, canvas] });
			await rightClick(row('Board'));
			expect(menuLabels()).toEqual(MENU_LABELS.filter((l) => l !== 'Change icon' && l !== 'Favorite'));
			expect(toggleFavoriteForPath).not.toHaveBeenCalled();
		});

		it('offers Convert to view, after Duplicate, only on a .collection row', async () => {
			const collection = makeNote({ path: '/vault/notes/Board.collection', title: 'Board' });
			const view = makeNote({ path: '/vault/notes/Shelf.view', title: 'Shelf' });
			mountHarness({ notes: [...notes, collection, view] });

			await rightClick(row('Board'));
			const labels = menuLabels();
			expect(labels).toContain('Convert to view');
			expect(labels[labels.indexOf('Duplicate') + 1]).toBe('Convert to view');

			for (const title of ['Alpha', 'Shelf']) {
				await rightClick(row(title));
				expect(menuLabels()).not.toContain('Convert to view');
			}
		});

		it('opens no menu on a right-click outside the rows', async () => {
			mountHarness();
			await rightClick(target.querySelector('[data-testid="blank"]')!);
			expect(menuLabels()).toEqual([]);
		});

		it('opens no menu when the list is empty', async () => {
			mountHarness({ notes: [] });
			await rightClick(target.querySelector('[data-testid="blank"]')!);
			expect(target.querySelectorAll('[data-note-row]')).toHaveLength(0);
			expect(menuLabels()).toEqual([]);
		});

		it('opens the note from Open in new tab', async () => {
			mountHarness();
			await chooseMenuItem('Alpha', 'Open in new tab');
			expect(openFileInEditor).toHaveBeenCalledWith(ALPHA);
			expect(menuIsOpen()).toBe(false);
		});

		it('duplicates the note', async () => {
			mountHarness();
			await chooseMenuItem('Alpha', 'Duplicate');
			expect(duplicateItem).toHaveBeenCalledWith(ALPHA, false);
			expect(toast.error).not.toHaveBeenCalled();
		});

		it('toasts when duplicating fails', async () => {
			vi.mocked(duplicateItem).mockRejectedValueOnce('Permission denied (os error 13)');
			mountHarness();
			await chooseMenuItem('Alpha', 'Duplicate');
			expect(toast.error).toHaveBeenCalledWith('Could not duplicate "alpha.md": Permission denied (os error 13)');
		});

		it('copies the absolute and the relative path', async () => {
			/** Opens the Copy path submenu of the Alpha row and clicks `label` in it. */
			async function copyPath(label: string) {
				await chooseMenuItem('Alpha', 'Copy path');
				await clickItem(label);
			}
			mountHarness();

			await copyPath('Copy absolute path');
			expect(writeText).toHaveBeenLastCalledWith(ALPHA);
			expect(menuIsOpen()).toBe(false);

			await copyPath('Copy relative path');
			expect(writeText).toHaveBeenLastCalledWith('notes/alpha.md');
		});

		it('saves a text color picked for a note with no icon, without asking for an icon', async () => {
			mountHarness();
			await chooseMenuItem('Alpha', 'Change icon');

			document.querySelectorAll<HTMLButtonElement>('button[title="Green"]')[1].click();
			await settle();

			expect(setIconColors).toHaveBeenCalledWith(ALPHA, undefined, '#22c55e');
		});

		it('opens the icon picker from Change icon', async () => {
			mountHarness();
			await chooseMenuItem('Alpha', 'Change icon');
			const title = [...document.querySelectorAll('[data-slot="dialog-title"]')].map((el) => el.textContent?.trim());
			expect(title).toContain('Change icon');
		});

		it('favorites a note and unfavorites a favorite one', async () => {
			mountHarness();
			await chooseMenuItem('Alpha', 'Favorite');
			expect(toggleFavoriteForPath).toHaveBeenLastCalledWith(ALPHA, true);
			expect(menuIsOpen()).toBe(false);
			await chooseMenuItem('Beta', 'Unfavorite');
			expect(toggleFavoriteForPath).toHaveBeenLastCalledWith(BETA, false);
		});

		it('reveals the note in Finder', async () => {
			mountHarness();
			await chooseMenuItem('Alpha', 'Reveal in Finder');
			expect(revealInSystemExplorer).toHaveBeenCalledWith(ALPHA);
			expect(menuIsOpen()).toBe(false);
		});

		it('moves the note to the Trash after the confirmation', async () => {
			vi.mocked(ask).mockResolvedValueOnce(true);
			mountHarness();
			await chooseMenuItem('Alpha', 'Move to Trash');
			expect(ask).toHaveBeenCalledWith('Move "Alpha" to trash?', {
				title: 'Move to Trash',
				kind: 'warning',
				okLabel: 'Move to Trash',
				cancelLabel: 'Cancel',
			});
			expect(deleteItem).toHaveBeenCalledWith(ALPHA, false);
		});

		it('keeps the note when the Trash confirmation is declined', async () => {
			vi.mocked(ask).mockResolvedValueOnce(false);
			mountHarness();
			await chooseMenuItem('Alpha', 'Move to Trash');
			expect(deleteItem).not.toHaveBeenCalled();
		});

		it('toasts when moving to the Trash fails', async () => {
			vi.mocked(ask).mockResolvedValueOnce(true);
			vi.mocked(deleteItem).mockRejectedValueOnce(new Error('trash is not writable'));
			mountHarness();
			await chooseMenuItem('Alpha', 'Move to Trash');
			expect(toast.error).toHaveBeenCalledWith('Could not move "alpha.md" to the Trash: trash is not writable');
		});

		it('adds no toast of its own when the pre-delete save failed (the editor already showed one)', async () => {
			vi.mocked(ask).mockResolvedValueOnce(true);
			vi.mocked(deleteItem).mockRejectedValueOnce(new PreDeleteSaveError(ALPHA));
			mountHarness();
			await chooseMenuItem('Alpha', 'Move to Trash');
			await vi.waitFor(() => expect(deleteItem).toHaveBeenCalled());
			await tick();
			expect(toast.error).not.toHaveBeenCalled();
		});
	});

	describe('inline rename', () => {
		function renameInput(): HTMLInputElement | null {
			return target.querySelector('input');
		}

		it('enters rename mode from the menu with the title prefilled', async () => {
			mountHarness();
			await chooseMenuItem('Alpha', 'Rename');

			expect(fsStore.renamingPath).toBe(ALPHA);
			expect(renameInput()?.value).toBe('Alpha');
			// The input keeps the title's size, so the row does not change size while renaming.
			expect(renameInput()?.classList).toContain('text-row');
			expect(row('Alpha')).toBeUndefined();
		});

		it('enters rename mode on F2', async () => {
			mountHarness();
			row('Beta').dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true }));
			await settle();

			expect(fsStore.renamingPath).toBe(BETA);
			expect(renameInput()?.value).toBe('Beta');
		});

		it('renames the note on Enter and leaves rename mode', async () => {
			vi.mocked(renameItem).mockResolvedValueOnce(undefined as never);
			mountHarness();
			await chooseMenuItem('Alpha', 'Rename');
			const input = renameInput()!;
			input.value = 'Gamma';
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
			await settle();

			expect(renameItem).toHaveBeenCalledWith(ALPHA, 'Gamma.md');
			expect(fsStore.renamingPath).toBeNull();
			expect(renameInput()).toBeNull();
		});

		it('cancels on Escape without renaming and shows the row again', async () => {
			mountHarness();
			await chooseMenuItem('Alpha', 'Rename');
			const input = renameInput()!;
			input.value = 'Gamma';
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
			input.dispatchEvent(new FocusEvent('blur'));
			await settle();

			expect(renameItem).not.toHaveBeenCalled();
			expect(fsStore.renamingPath).toBeNull();
			expect(row('Alpha')).toBeDefined();
		});

		it('keeps the typed name when the notes list refreshes mid-rename', async () => {
			mountHarness();
			await chooseMenuItem('Alpha', 'Rename');
			const input = renameInput()!;
			input.value = 'Gamma';
			input.dispatchEvent(new Event('input', { bubbles: true }));
			await settle();

			component!.setNotes(notes.map((n) => ({ ...n })));
			await settle();

			expect(fsStore.renamingPath).toBe(ALPHA);
			expect(renameInput()?.value).toBe('Gamma');
		});

		it('skips the rename when the name is empty', async () => {
			mountHarness();
			await chooseMenuItem('Alpha', 'Rename');
			const input = renameInput()!;
			input.value = '   ';
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
			await settle();

			expect(renameItem).not.toHaveBeenCalled();
			expect(fsStore.renamingPath).toBeNull();
		});

		it('toasts when the new name is taken and keeps the old row', async () => {
			vi.mocked(renameItem).mockRejectedValueOnce(new Error('"beta.md" already exists in this folder'));
			mountHarness();
			await chooseMenuItem('Alpha', 'Rename');
			const input = renameInput()!;
			input.value = 'beta';
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
			await settle();

			expect(toast.error).toHaveBeenCalledWith('Could not rename "alpha.md": "beta.md" already exists in this folder');
			expect(row('Alpha')).toBeDefined();
		});

		it('opens no menu on a right-click on the rename input', async () => {
			mountHarness();
			row('Alpha').dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true }));
			await settle();
			await rightClick(renameInput()!);
			expect(menuLabels()).toEqual([]);
		});
	});
});
