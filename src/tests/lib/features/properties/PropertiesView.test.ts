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

import { mount, unmount, flushSync, tick } from 'svelte';
import PropertiesView from '#lib/features/properties/PropertiesView.svelte';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { resetProperties } from '#lib/features/properties/properties.service.js';
import { registerTypeIconLookup } from '#lib/features/file-icons/icon-resolver.js';
import { getIconSync } from '#lib/features/file-icons/file-icons.icon-data.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

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

describe('PropertiesView type selector', () => {
	const DEFINITION = '/vault/_system/types/Podcast.md';
	const OTHER_DEFINITION = '/vault/_system/types/Meeting.md';
	let component: ReturnType<typeof mount> | null = null;
	let target: HTMLElement;
	let unregisterLookup: () => void;

	beforeEach(() => {
		clearLocalStorage();
		vi.clearAllMocks();
		unregisterLookup = registerTypeIconLookup({
			typeOf: (path) => typeDefinitionsStore.getEntryByPath(path)?.isA,
			definitionPathOf: (typeName) => typeDefinitionsStore.getTypeDefinitionPath(typeName),
		});
		vaultStore._reset();
		vaultStore.open('/vault');
		fsStore.reset();
		resetProperties();
		editorStore.reset();
		fileIconsStore.reset();
		const entries = [entryV2(DEFINITION, { isA: 'Type' }), entryV2(OTHER_DEFINITION, { isA: 'Type' })];
		typeDefinitionsStore.setEntries(entries);
		typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap(entries));
		fileIconsStore.setFrontmatterIcons(new Map([[DEFINITION, { iconPack: 'lucide', iconName: 'alarm-clock' }]]));
		vi.mocked(getIconSync).mockReturnValue({ name: 'alarm-clock', pack: 'lucide', svgContent: '<path/>', viewBox: '0 0 24 24', keywords: [] });
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
		editorStore.reset();
		fsStore.reset();
		fileIconsStore.reset();
		typeDefinitionsStore.reset();
		vaultStore._reset();
		unregisterLookup();
	});

	function mountNote(typeValue: string): void {
		const body = `---\ntype: ${typeValue}\n---\n# Note\n`;
		editorStore.addTab({ path: NOTE, name: 'note.md', content: body, savedContent: body });
		component = mount(PropertiesView, { target });
		flushSync();
	}

	const trigger = () => target.querySelector<HTMLButtonElement>('[data-dropdown-menu-trigger]')!;

	async function openMenu(): Promise<void> {
		trigger().dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
		for (let i = 0; i < 4; i++) {
			await tick();
			flushSync();
		}
	}

	function menuItem(name: string): HTMLElement {
		return [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) => el.textContent?.includes(name))!;
	}

	it('matches a lowercase value to its type: name, icon and check mark', async () => {
		mountNote('podcast');

		expect(trigger().textContent?.trim()).toBe('Podcast');
		expect(trigger().querySelector('svg[viewBox="0 0 24 24"] path')).not.toBeNull();

		await openMenu();
		expect(menuItem('Podcast').textContent).toContain('\u2713');
		expect(menuItem('Meeting').textContent).not.toContain('\u2713');
	});

	it('leaves the casing in the file alone', () => {
		mountNote('podcast');

		expect(editorStore.tabs[0].content).toContain('type: podcast');
	});

	it('shows a value with no definition, with no icon', () => {
		vi.mocked(getIconSync).mockReturnValue(undefined);
		mountNote('unknown');

		expect(trigger().textContent?.trim()).toBe('Unknown');
	});

	it('shows the empty placeholder for an empty value', () => {
		mountNote('""');

		expect(trigger().textContent?.trim()).toBe('--');
	});
});
