import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn().mockResolvedValue(undefined),
}));

import { writeTextFile } from '@tauri-apps/plugin-fs';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { resetEditor, onContentChange, switchTab } from '#lib/core/editor/editor.service.js';
import { propertiesStore } from '#lib/features/properties/properties.store.svelte.js';
import {
	updateProperty,
	upsertProperty,
	renameProperty,
	removePropertyByKey,
	addNewProperty,
	parseAndSetProperties,
	consumeSkipNextParse,
	resetProperties,
} from '#lib/features/properties/properties.service.js';
import { setArchived, setFavorite, setOrganized } from '#lib/features/properties/lifecycle.service.js';

const A = '/vault/19-meta-bind.md';
const B = '/vault/10-tables.md';
const A_TODO = '---\nstatus: todo\nprioridade: media\n---\n# Meta bind\n`INPUT[inlineSelect(todo, doing, done):status]`\n';
const A_DOING = A_TODO.replace('status: todo', 'status: doing');
const B_BODY = '# Tables\n\n| a | b | c |\n|---|---|---|\n| 1 | | 3 |\n';

/**
 * The debounced branch of the PropertiesView.svelte re-parse $effect: on any
 * change of activeTabPath / activeTab.content, clear the old timer and in
 * 300 ms either consume the skip flag or re-parse the active tab's content.
 * The view also parses at once when the active path differs from the store's
 * source path; this helper leaves that out, so the 300 ms window the service
 * guards must cover stays open. The repo has no component-testing library.
 */
let timer: ReturnType<typeof setTimeout> | undefined;
function propertiesViewEffect() {
	clearTimeout(timer);
	const path = editorStore.activeTabPath;
	const content = editorStore.activeTab?.content ?? '';
	timer = setTimeout(() => {
		if (consumeSkipNextParse(path)) return;
		parseAndSetProperties(content, path);
	}, 300);
}

function activate(path: string) {
	switchTab(editorStore.tabs.findIndex((t) => t.path === path));
	propertiesViewEffect();
}

beforeEach(() => {
	vi.useFakeTimers();
	resetEditor();
	resetProperties();
	vi.mocked(writeTextFile).mockClear();
	editorStore.addTab({ path: B, name: '10-tables.md', content: B_BODY, savedContent: B_BODY });
	editorStore.addTab({ path: A, name: '19-meta-bind.md', content: A_TODO, savedContent: A_TODO });
	activate(A);
	vi.advanceTimersByTime(300);
});
afterEach(() => {
	clearTimeout(timer);
	resetEditor();
	vi.useRealTimers();
});

function contentOf(path: string) {
	return editorStore.tabs.find((t) => t.path === path)!.content;
}

/** Asserts B was neither changed in the editor nor written to disk. */
async function expectBUntouched() {
	expect(contentOf(B)).toBe(B_BODY);
	await vi.advanceTimersByTimeAsync(2500);
	expect(vi.mocked(writeTextFile).mock.calls.some(([path]) => path === B)).toBe(false);
}

describe('Properties panel never writes one note into another', () => {
	it('a panel commit within 300 ms of a tab switch leaves B untouched and shows B', async () => {
		// Meta-bind select in A: status todo -> doing
		onContentChange(A_DOING, true);
		propertiesViewEffect();
		vi.advanceTimersByTime(300);
		expect(propertiesStore.sourcePath).toBe(A);

		activate(B);
		// The debounce has not re-parsed yet; a commit in this window:
		updateProperty('status', 'doing');

		expect(propertiesStore.properties).toEqual([]);
		expect(propertiesStore.sourcePath).toBe(B);
		await expectBUntouched();
	});

	it('a panel edit in A followed by a switch within 300 ms does not skip the parse of B', async () => {
		onContentChange(A_DOING, true);
		propertiesViewEffect();
		vi.advanceTimersByTime(300);

		// Panel edit in A (a no-op remove still commits) arms the skip flag
		removePropertyByKey('nonexistent');
		propertiesViewEffect();
		vi.advanceTimersByTime(100);
		activate(B);
		vi.advanceTimersByTime(300);

		// B was parsed: the panel shows B's (empty) properties, not A's
		expect(propertiesStore.properties).toEqual([]);
		expect(propertiesStore.sourcePath).toBe(B);

		// A panel commit now writes B's own properties only
		upsertProperty('status', 'doing');
		expect(contentOf(B)).toBe('---\nstatus: doing\n---\n' + B_BODY);
		await vi.advanceTimersByTimeAsync(600);
		expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(B, '---\nstatus: doing\n---\n' + B_BODY);
	});

	it('the skip flag still suppresses the re-parse of the note the commit wrote', () => {
		updateProperty('status', 'doing');
		expect(consumeSkipNextParse(B)).toBe(false);

		updateProperty('status', 'done');
		expect(consumeSkipNextParse(A)).toBe(true);
		expect(consumeSkipNextParse(A)).toBe(false);
	});

	it.each([
		['updateProperty', () => updateProperty('status', 'doing')],
		['upsertProperty', () => upsertProperty('owner', 'me')],
		['renameProperty', () => renameProperty('status', 'state')],
		['removePropertyByKey', () => removePropertyByKey('status')],
		['addNewProperty', () => addNewProperty('owner')],
		['setOrganized', () => setOrganized(true)],
		['setArchived', () => setArchived(true)],
		['setFavorite', () => setFavorite(true)],
	])('%s with A properties while B is active leaves B untouched', async (_name, commit) => {
		activate(B);
		expect(propertiesStore.sourcePath).toBe(A);

		commit();

		expect(propertiesStore.properties).toEqual([]);
		expect(propertiesStore.sourcePath).toBe(B);
		expect(contentOf(A)).toBe(A_TODO);
		await expectBUntouched();
	});

	it('renameProperty and addNewProperty report a refused commit as false', () => {
		activate(B);
		expect(renameProperty('status', 'state')).toBe(false);
		parseAndSetProperties(A_TODO, A);
		expect(addNewProperty('owner')).toBe(false);
	});
});
