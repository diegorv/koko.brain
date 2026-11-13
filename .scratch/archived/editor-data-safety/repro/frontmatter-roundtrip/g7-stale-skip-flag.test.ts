// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { setupLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

// G7: mounts the real PropertiesView (its re-parse $effect is the code under
// test) on real stores and the real properties service. Only Tauri is mocked.
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn().mockResolvedValue(undefined),
	exists: vi.fn().mockResolvedValue(true),
}));
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn().mockResolvedValue(undefined),
}));

import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { resetEditor, onContentChange } from '#lib/core/editor/editor.service.js';
import { propertiesStore } from '#lib/features/properties/properties.store.svelte.js';
import { resetProperties } from '#lib/features/properties/properties.service.js';
import { _resetParseFrontmatterCache } from '#lib/core/frontmatter/properties.logic.js';
import PropertiesView from '#lib/features/properties/PropertiesView.svelte';

const PATH = '/vault/note.md';
const START = '---\nrating: 5\n---\n\nbody\n';
const TYPED = '---\nrating: 5\nstatus: draft\n---\n\nbody\n';

let component: ReturnType<typeof mount> | null = null;

function ratingInput(): HTMLInputElement {
	const input = document.querySelector<HTMLInputElement>('input[type="number"]');
	if (!input) throw new Error('rating number input not rendered');
	return input;
}

function typeInPanel(value: string) {
	const input = ratingInput();
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function content() {
	return editorStore.tabs.find((t) => t.path === PATH)!.content;
}

beforeEach(() => {
	vi.useFakeTimers();
	resetEditor();
	resetProperties();
	_resetParseFrontmatterCache();
	editorStore.addTab({ path: PATH, name: 'note.md', content: START, savedContent: START });
	component = mount(PropertiesView, { target: document.body.appendChild(document.createElement('div')) });
	flushSync();
	vi.advanceTimersByTime(300);
	flushSync();
});
afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
	resetEditor();
	vi.useRealTimers();
});

describe('G7: a no-op panel commit leaves the skip flag armed', () => {
	it('precondition: the panel shows rating', () => {
		expect(propertiesStore.properties.map((p) => p.key)).toEqual(['rating']);
		expect(ratingInput().value).toBe('5');
	});

	it('control: without the no-op commit, a later panel edit keeps YAML typed in the editor', () => {
		onContentChange(TYPED, true);
		flushSync();
		vi.advanceTimersByTime(300);
		flushSync();
		typeInPanel('6');
		expect(content()).toContain('status: draft');
		expect(content()).toContain('rating: 6');
	});

	it('after retyping the same number, YAML typed in the editor survives the next panel edit', () => {
		// The user retypes the value the field already holds: Number('5') === 5.
		typeInPanel('5');
		expect(content()).toBe(START);
		vi.advanceTimersByTime(300);
		flushSync();

		// One editor burst adds a key to the frontmatter.
		onContentChange(TYPED, true);
		flushSync();
		vi.advanceTimersByTime(300);
		flushSync();
		// The panel should have picked up the new key.
		expect(propertiesStore.properties.map((p) => p.key)).toContain('status');

		typeInPanel('6');
		expect(content()).toContain('status: draft');
	});

	it('the final panel edit does not erase status: draft (store-level check skipped)', () => {
		typeInPanel('5');
		vi.advanceTimersByTime(300);
		flushSync();
		onContentChange(TYPED, true);
		flushSync();
		vi.advanceTimersByTime(300);
		flushSync();
		typeInPanel('6');
		expect(content()).toContain('rating: 6');
		expect(content()).toContain('status: draft');
	});
});
