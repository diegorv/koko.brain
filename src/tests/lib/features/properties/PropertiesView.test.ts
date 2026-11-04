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

describe('PropertiesView text roles', () => {
	let component: ReturnType<typeof mount> | null = null;
	let target: HTMLElement;

	beforeEach(() => {
		clearLocalStorage();
		vi.clearAllMocks();
		vaultStore._reset();
		vaultStore.open('/vault');
		fsStore.reset();
		resetProperties();
		editorStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
		editorStore.reset();
		fsStore.reset();
		vaultStore._reset();
	});

	function mountView(): void {
		component = mount(PropertiesView, { target });
		flushSync();
	}

	const titles = () => [...target.querySelectorAll('h2')];

	it('renders the empty message with the meta role', () => {
		mountView();

		const empty = [...target.querySelectorAll('p')].find((p) => p.textContent === 'No file open')!;
		expect(empty.classList).toContain('text-meta');
	});

	it('titles Properties and Relationships in sentence case with the title role', () => {
		editorStore.addTab({ path: NOTE, name: 'note.md', content: NOTE_BODY, savedContent: NOTE_BODY });
		mountView();

		expect(titles().map((h) => h.textContent?.trim())).toEqual(['Properties', 'Relationships']);
		for (const title of titles()) {
			expect(title.classList).toContain('text-title');
			expect(title.classList).not.toContain('uppercase');
		}
	});

	it('labels each relationship kind with the section-label style', () => {
		editorStore.addTab({ path: NOTE, name: 'note.md', content: NOTE_BODY, savedContent: NOTE_BODY });
		mountView();

		const labels = [...target.querySelectorAll('span')].filter((s) =>
			['Belongs To', 'Related To', 'Has Many'].includes(s.textContent ?? ''),
		);
		expect(labels).toHaveLength(3);
		for (const label of labels) expect(label.classList).toContain('section-label');
	});
});
