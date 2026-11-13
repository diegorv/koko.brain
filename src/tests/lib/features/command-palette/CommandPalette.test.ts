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

describe('CommandPalette - shortcut hints', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		clearLocalStorage();
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
});
