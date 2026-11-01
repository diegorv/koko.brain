// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { setupLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(() => Promise.resolve(vi.fn())),
	emit: vi.fn(),
}));

// Icon packs load lazily from bundled data; the lookup is stubbed so the
// test controls which icon a type resolves to.
vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));

import { getIconSync } from '#lib/features/file-icons/file-icons.icon-data.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { TAGS_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import EditorView from '#lib/app/EditorView.svelte';
import { entryV2 } from '../../fixtures/vault-entries.fixture';

const ROCKET_PATH = 'M1 2L3 4';

describe('EditorView tab icons', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		editorStore.reset();
		fileIconsStore.reset();
		typeDefinitionsStore.reset();
		vi.mocked(getIconSync).mockReturnValue({
			name: 'rocket',
			pack: 'lucide',
			svgContent: `<path d="${ROCKET_PATH}"/>`,
			viewBox: '0 0 24 24',
			keywords: [],
		});
		// A Project type whose definition note carries a rocket icon and a title color.
		typeDefinitionsStore.setEntries([
			entryV2('/vault/Project.md', { title: 'Project', isA: 'Type' }),
			entryV2('/vault/my-project.md', { title: 'my-project', isA: 'Project' }),
		]);
		fileIconsStore.setFrontmatterIcons(
			new Map([['/vault/Project.md', { iconPack: 'lucide', iconName: 'rocket', titleColor: '#ff8800' }]]),
		);
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	/** Mounts EditorView with a typed note tab and an active Tags tab; returns the tab elements. */
	function render(): HTMLElement[] {
		editorStore.addTab({ path: '/vault/my-project.md', name: 'my-project', content: '', savedContent: '' });
		editorStore.addTab({ path: TAGS_VIRTUAL_PATH, name: 'Tags', content: '', savedContent: '', fileType: 'tags' });
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(EditorView, { target });
		flushSync();
		return [...target.querySelectorAll<HTMLElement>('[role="tab"]')];
	}

	it("shows a note tab with its type's icon and title color", () => {
		const [noteTab] = render();

		expect(noteTab.textContent).toContain('my-project');
		expect(noteTab.querySelector(`svg path[d="${ROCKET_PATH}"]`)).not.toBeNull();
		// jsdom normalizes the hex to rgb()
		expect(noteTab.querySelector<HTMLElement>('span.truncate')!.style.color).toBe('rgb(255, 136, 0)');
	});

	it('shows a virtual tab with its fixed icon, not a resolved one', () => {
		const [, tagsTab] = render();

		expect(tagsTab.textContent).toContain('Tags');
		expect(tagsTab.querySelector(`svg path[d="${ROCKET_PATH}"]`)).toBeNull();
		expect(tagsTab.querySelector('svg')).not.toBeNull();
	});
});
