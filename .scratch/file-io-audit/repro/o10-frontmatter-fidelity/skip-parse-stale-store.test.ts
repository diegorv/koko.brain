import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const disk = new Map<string, string>();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async (p: string) => disk.get(p) ?? ''),
	writeTextFile: vi.fn(async (p: string, c: string) => {
		disk.set(p, c);
	}),
	exists: vi.fn(async (p: string) => disk.has(p)),
}));
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async () => undefined),
}));

import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { onContentChange, resetEditor } from '#lib/core/editor/editor.service.js';
import { propertiesStore } from '#lib/features/properties/properties.store.svelte.js';
import {
	updateProperty,
	parseAndSetProperties,
	consumeSkipNextParse,
	syncPropertiesFromActiveTab,
	resetProperties,
} from '#lib/features/properties/properties.service.js';

const NOTE = '/vault/task.md';
const START = '---\ndone: false\npriority: low\n---\n# Task\n';

/**
 * PropertiesView.svelte's re-parse $effect, copied line for line: on every
 * change of activeTabPath / activeTab.content the previous 300 ms timer is
 * cleared and a new one either consumes the skip flag or re-parses. The repo
 * has no component-testing library (same approach as
 * properties-cross-note.test.ts).
 */
let timer: ReturnType<typeof setTimeout> | undefined;
function propertiesViewEffect() {
	clearTimeout(timer);
	const path = editorStore.activeTabPath;
	const content = editorStore.activeTab?.content ?? '';
	if (syncPropertiesFromActiveTab(path, content)) return;
	timer = setTimeout(() => {
		if (consumeSkipNextParse(path)) return;
		parseAndSetProperties(content, path);
	}, 300);
}

function content() {
	return editorStore.tabs.find((t) => t.path === NOTE)!.content;
}

describe('repro o10 fidelity-9: a frontmatter edit inside the 300 ms skip window is not reverted by the next panel edit', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		disk.clear();
		resetEditor();
		resetProperties();
		disk.set(NOTE, START);
		editorStore.addTab({ path: NOTE, name: 'task.md', content: START, savedContent: START });
		propertiesViewEffect();
	});
	afterEach(() => {
		clearTimeout(timer);
		resetEditor();
		vi.useRealTimers();
	});

	it('panel click, then a frontmatter edit 150 ms later, then another panel edit', async () => {
		// 1. Panel checkbox: done -> true. Arms the skip flag; the content change re-runs the effect.
		updateProperty('done', true, 'boolean');
		propertiesViewEffect();

		// 2. 150 ms later the user edits the frontmatter in the editor (a typed
		//    line, or a meta-bind toggle): the effect clears the pending timer.
		await vi.advanceTimersByTimeAsync(150);
		onContentChange(content().replace('priority: low\n', 'priority: low\nstatus: done\n'), true);
		propertiesViewEffect();
		expect(content()).toContain('status: done');

		// 3. The debounce fires once, for the content that holds `status: done`.
		await vi.advanceTimersByTimeAsync(300);
		// Correct: the store now reflects the editor's frontmatter.
		expect.soft(propertiesStore.properties.map((p) => p.key)).toContain('status');

		// 4. Any later panel edit must keep the user's line.
		updateProperty('priority', 'high');
		propertiesViewEffect();
		await vi.advanceTimersByTimeAsync(800);
		expect(disk.get(NOTE), disk.get(NOTE)).toContain('status: done');
	});
});
