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
import {
	updateProperty,
	removePropertyByKey,
	parseAndSetProperties,
	consumeSkipNextParse,
	resetProperties,
} from '#lib/features/properties/properties.service.js';

const A = '/vault/19-meta-bind.md';
const B = '/vault/10-tables.md';
const A_TODO = '---\nstatus: todo\nprioridade: media\n---\n# Meta bind\n`INPUT[inlineSelect(todo, doing, done):status]`\n';
const A_DOING = A_TODO.replace('status: todo', 'status: doing');
const B_BODY = '# Tables\n\n| a | b | c |\n|---|---|---|\n| 1 | | 3 |\n';

/**
 * Faithful copy of the PropertiesView.svelte re-parse $effect (L99-110): on any
 * change of activeTabPath / activeTab.content, clear the old timer and in 300 ms
 * either consume the skip flag or re-parse the active tab's content.
 */
let timer: ReturnType<typeof setTimeout> | undefined;
function propertiesViewEffect() {
	clearTimeout(timer);
	const content = editorStore.activeTab?.content ?? '';
	timer = setTimeout(() => {
		if (consumeSkipNextParse()) return;
		parseAndSetProperties(content);
	}, 300);
}

beforeEach(() => {
	vi.useFakeTimers();
	resetEditor();
	resetProperties();
	vi.mocked(writeTextFile).mockClear();
	editorStore.addTab({ path: B, name: '10-tables.md', content: B_BODY, savedContent: B_BODY });
	editorStore.addTab({ path: A, name: '19-meta-bind.md', content: A_TODO, savedContent: A_TODO });
	switchTab(editorStore.tabs.findIndex((t) => t.path === A));
	propertiesViewEffect();
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

describe('cross-note frontmatter write via stale propertiesStore', () => {
	it('window: panel edit within 300 ms of a tab switch writes A frontmatter into B', async () => {
		// Meta-bind select in A: status todo -> doing (CM update listener -> onContentChange)
		onContentChange(A_DOING, true);
		propertiesViewEffect();
		vi.advanceTimersByTime(300); // panel now holds A's {status: doing, prioridade: media}

		switchTab(editorStore.tabs.findIndex((t) => t.path === B));
		propertiesViewEffect();
		// Panel still shows A's properties for 300 ms; any commit in that window:
		updateProperty('status', 'doing');

		expect(contentOf(B)).toBe('---\nstatus: doing\nprioridade: media\n---\n' + B_BODY);
		await vi.advanceTimersByTimeAsync(600);
		expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(B, '---\nstatus: doing\nprioridade: media\n---\n' + B_BODY);
	});

	it('sticky: a panel edit in A followed by a switch within 300 ms leaves A props in the panel indefinitely', async () => {
		onContentChange(A_DOING, true);
		propertiesViewEffect();
		vi.advanceTimersByTime(300);

		// Panel edit in A (e.g. add then remove an empty property) sets skipNextParse
		removePropertyByKey('nonexistent');
		propertiesViewEffect(); // content changed -> effect re-arms
		// Switch to B before the 300 ms timer consumed the flag
		vi.advanceTimersByTime(100);
		switchTab(editorStore.tabs.findIndex((t) => t.path === B));
		propertiesViewEffect();
		vi.advanceTimersByTime(10_000); // B's parse is SKIPPED: flag consumed on B

		// Much later, any no-op-looking panel action in B:
		updateProperty('status', 'doing');
		expect(contentOf(B)).toBe('---\nstatus: doing\nprioridade: media\n---\n' + B_BODY);
		await vi.advanceTimersByTimeAsync(600);
		expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(B, '---\nstatus: doing\nprioridade: media\n---\n' + B_BODY);
	});
});
