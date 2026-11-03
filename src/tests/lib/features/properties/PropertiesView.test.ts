// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

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
vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
	syncExternalContentToEditor: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync } from 'svelte';
import PropertiesView from '#lib/features/properties/PropertiesView.svelte';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { resetProperties } from '#lib/features/properties/properties.service.js';

const NOTE = '/vault/note.md';
const NOTE_BODY = '---\n_belongs_to: "[[b/foo.png]]"\n---\n# Note\n';

describe('PropertiesView relationship links', () => {
	let component: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		clearLocalStorage();
		vi.clearAllMocks();
		vaultStore._reset();
		vaultStore.open('/vault');
		fsStore.reset();
		resetProperties();
		editorStore.reset();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
		editorStore.reset();
		fsStore.reset();
		vaultStore._reset();
	});

	it('opens a path-style link at its vault-relative file before an earlier suffix match', () => {
		fsStore.setFileTree([
			{ name: 'foo.png', path: '/vault/x/b/foo.png', isDirectory: false },
			{ name: 'foo.png', path: '/vault/b/foo.png', isDirectory: false },
			{ name: 'note.md', path: NOTE, isDirectory: false },
		]);
		editorStore.addTab({ path: NOTE, name: 'note.md', content: NOTE_BODY, savedContent: NOTE_BODY });

		const target = document.body.appendChild(document.createElement('div'));
		component = mount(PropertiesView, { target });
		flushSync();

		const link = [...target.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'b/foo.png');
		expect(link).toBeDefined();
		link!.click();
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/b/foo.png');
	});
});
