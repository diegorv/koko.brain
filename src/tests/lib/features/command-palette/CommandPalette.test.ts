// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// Must set up localStorage BEFORE any store imports (stores read localStorage at top-level)
setupLocalStorage();

// Mock side-effect services (Tauri API calls, etc.) — OK per CLAUDE.md
vi.mock('#lib/core/editor/editor.service.js', () => ({
	saveCurrentFile: vi.fn(),
	closeActiveTab: vi.fn(),
	switchToNextTab: vi.fn(),
	switchToPreviousTab: vi.fn(),
	togglePinActiveTab: vi.fn(),
}));

vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	createFile: vi.fn(),
	createFolder: vi.fn(),
}));

vi.mock('#lib/plugins/graph-view/graph-view.service.js', () => ({
	toggleGraphTab: vi.fn(),
}));

vi.mock('#lib/features/tasks/tasks.service.js', () => ({
	toggleTasksTab: vi.fn(),
}));

vi.mock('#lib/plugins/periodic-notes/periodic-notes.service.js', () => ({
	openOrCreateDailyNote: vi.fn(),
}));

vi.mock('#lib/plugins/templates/templates.service.js', () => ({
	openTemplatePicker: vi.fn(),
}));

vi.mock('#lib/features/copy-block-link/copy-block-link.service.js', () => ({
	copyBlockLinkToClipboard: vi.fn(),
	copyBlockEmbedToClipboard: vi.fn(),
}));

vi.mock('#lib/plugins/quick-capture/note-composer.service.js', () => ({
	createNoteComposer: vi.fn(),
}));

vi.mock('#lib/plugins/one-on-one/one-on-one.service.js', () => ({
	openOneOnOnePicker: vi.fn(),
}));

vi.mock('#lib/features/canvas/canvas.service.js', () => ({
	createCanvasFile: vi.fn(),
}));

vi.mock('#lib/features/file-history/file-history.service.js', () => ({
	openFileHistory: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

// No mocks for stores or logic files — use real implementations per CLAUDE.md

import { mount, unmount, flushSync } from 'svelte';
import CommandPalette from '#lib/features/command-palette/CommandPalette.svelte';
import { getBuiltInCommands } from '#lib/app/commands.js';
import { commandPaletteStore } from '#lib/features/command-palette/command-palette.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

function shortcutTexts(): string[] {
	return Array.from(document.querySelectorAll('[data-slot="command-shortcut"]')).map(
		(el) => el.textContent ?? '',
	);
}

/** Texts of the palette's group headings, in order. */
function headingTexts(): string[] {
	return [...document.querySelectorAll('[data-command-group-heading]')].map((el) => el.textContent?.trim() ?? '');
}

/** The palette's search input. */
function paletteInput(): HTMLInputElement {
	return document.querySelector<HTMLInputElement>('[data-slot="command-input"]')!;
}

/** Label of the highlighted row. */
function selectedLabel(): string | undefined {
	return document.querySelector('[data-slot="command-item"][aria-selected="true"] span')?.textContent ?? undefined;
}

describe('CommandPalette - rows and hints', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		clearLocalStorage();
		commandPaletteStore.reset();
		settingsStore.reset();
		// jsdom has no scrollIntoView; the command list calls it on the highlighted item.
		Element.prototype.scrollIntoView = vi.fn();
		target = document.body.appendChild(document.createElement('div'));
		component = mount(CommandPalette, { target, props: { commands: getBuiltInCommands() } });
		flushSync();
		commandPaletteStore.open();
		flushSync();
	});

	afterEach(() => {
		commandPaletteStore.close();
		flushSync();
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	it('lists no Cycle Sidebar View command and no ⌘⇧E hint', () => {
		expect(shortcutTexts().length).toBeGreaterThan(0);
		expect(shortcutTexts()).toContain('⌘⇧B');
		expect(shortcutTexts()).not.toContain('⌘⇧E');
		expect(document.body.textContent).toContain('Toggle Rail Panels');
		expect(document.body.textContent).not.toContain('Cycle Sidebar View');
	});

	it('shows each command on one line: label, then the muted category, then the shortcut', () => {
		const shortcut = [...document.querySelectorAll('[data-slot="command-shortcut"]')].find(
			(el) => el.textContent === '⌘⇧B',
		)!;
		const row = shortcut.closest<HTMLElement>('[data-slot="command-item"]')!;
		expect(row.querySelector('.flex-col')).toBeNull();
		const parts = [...row.querySelectorAll('span')];
		expect(parts.map((el) => el.textContent)).toEqual(['Toggle Rail Panels', 'Layout', '⌘⇧B']);
		expect(parts[1].classList.contains('text-muted-foreground')).toBe(true);
		expect(row.classList.contains('min-h-9')).toBe(true);
	});

	it('caps the list at min(60vh, 400px)', () => {
		const list = document.querySelector('[data-slot="command-list"]')!;
		expect(list.classList.contains('max-h-[min(60vh,400px)]')).toBe(true);
	});

	it('shows the Enter, arrows and Esc hints in the footer', () => {
		const footer = document.querySelector('[data-slot="command-dialog-footer"]')!;
		expect(footer).not.toBeNull();
		expect([...footer.querySelectorAll('kbd')].map((k) => k.textContent)).toEqual(['↵', '↑↓', 'Esc']);
		expect(footer.textContent).toContain('Run');
		expect(footer.textContent).toContain('Navigate');
		expect(footer.textContent).toContain('Close');
	});
});

describe('CommandPalette - Recent and All commands groups', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	/** Mounts the palette with `recentIds` stored (newest first) and opens it. */
	function openWith(recentIds: string[]) {
		for (const id of [...recentIds].reverse()) commandPaletteStore.addRecentCommand(id);
		component = mount(CommandPalette, { target, props: { commands: getBuiltInCommands() } });
		flushSync();
		commandPaletteStore.open();
		flushSync();
	}

	beforeEach(() => {
		clearLocalStorage();
		commandPaletteStore.reset();
		settingsStore.reset();
		Element.prototype.scrollIntoView = vi.fn();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		commandPaletteStore.close();
		flushSync();
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		commandPaletteStore.reset();
		settingsStore.reset();
	});

	it('shows the recents under "Recent" and the rest under "All commands" on an empty query', () => {
		openWith(['layout:toggle-left-sidebar', 'editor:save-file']);

		expect(headingTexts()).toEqual(['Recent', 'All commands']);
		const [recent, all] = [...document.querySelectorAll('[data-slot="command-group"]')];
		const labels = (group: Element) =>
			[...group.querySelectorAll('[data-slot="command-item"]')].map((row) => row.querySelector('span')?.textContent);
		expect(labels(recent)).toEqual(['Toggle Rail Panels', 'Save File']);
		expect(labels(all)).not.toContain('Save File');
		expect(labels(all)).toEqual([...labels(all)].sort((a, b) => a!.localeCompare(b!)));
	});

	it('shows no headings without recents', () => {
		openWith([]);

		expect(headingTexts()).toEqual([]);
		expect(document.querySelectorAll('[data-slot="command-item"]').length).toBeGreaterThan(0);
	});

	it('shows one flat list without headings once a query is typed', () => {
		openWith(['editor:save-file']);
		const input = paletteInput();
		input.value = 'save';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		expect(headingTexts()).toEqual([]);
		expect(document.querySelectorAll('[data-slot="command-group"]')).toHaveLength(1);
		expect(document.body.textContent).toContain('Save File');
	});

	it('moves the highlight from the last Recent row into All commands with ArrowDown', async () => {
		openWith(['editor:save-file']);
		await vi.waitFor(() => expect(selectedLabel()).toBe('Save File'));
		const firstOfAll = document
			.querySelectorAll('[data-slot="command-group"]')[1]
			.querySelector('[data-slot="command-item"] span')!.textContent;

		paletteInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
		flushSync();
		expect(selectedLabel()).toBe(firstOfAll);

		paletteInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
		flushSync();
		expect(selectedLabel()).toBe('Save File');
	});
});
