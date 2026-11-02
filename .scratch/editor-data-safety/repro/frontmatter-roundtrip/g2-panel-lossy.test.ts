import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// G2 (and the panel leg of F103): a Properties panel edit rewrites the whole
// block with only an isFrontmatterUnparseable guard. Real editor store,
// properties store, properties service and properties.logic; only Tauri is mocked.
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn().mockResolvedValue(undefined),
}));

import { writeTextFile } from '@tauri-apps/plugin-fs';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { resetEditor } from '#lib/core/editor/editor.service.js';
import {
	updateProperty,
	parseAndSetProperties,
	resetProperties,
} from '#lib/features/properties/properties.service.js';
import { _resetParseFrontmatterCache, detectLossyFrontmatter } from '#lib/core/frontmatter/properties.logic.js';

const PATH = '/vault/trip.md';

function open(content: string) {
	editorStore.addTab({ path: PATH, name: 'trip.md', content, savedContent: content });
	parseAndSetProperties(content, PATH);
}

function content(): string {
	return editorStore.tabs.find((t) => t.path === PATH)!.content;
}

beforeEach(() => {
	vi.useFakeTimers();
	resetEditor();
	resetProperties();
	_resetParseFrontmatterCache();
});
afterEach(() => {
	resetEditor();
	vi.useRealTimers();
});

describe('G2: Properties panel edit on lossy-but-parseable frontmatter', () => {
	const DOC =
		'---\ntitle: Trip\nlocation:\n  lat: 1.5\n  lng: 2.5\n# booking ref ABC123\nbase: &b x\ncopy: *b\ntags: [a]\n---\n\nbody\n';

	it('precondition: the shared detector classifies the block as lossy', () => {
		expect(detectLossyFrontmatter(DOC)).toBe('nested');
	});

	it('typing in the title field keeps the nested map, or refuses the edit', () => {
		open(DOC);
		updateProperty('title', 'Trip2');
		if (content() !== DOC) expect(content()).toContain('location:\n  lat: 1.5\n  lng: 2.5');
	});

	it('typing in the title field keeps the comment, or refuses the edit', () => {
		open(DOC);
		updateProperty('title', 'Trip2');
		if (content() !== DOC) expect(content()).toContain('# booking ref ABC123');
	});

	it('the 500 ms frontmatter autosave does not write a block without the nested map', async () => {
		vi.mocked(writeTextFile).mockClear();
		open(DOC);
		updateProperty('title', 'Trip2');
		await vi.advanceTimersByTimeAsync(600);
		for (const call of vi.mocked(writeTextFile).mock.calls) {
			expect(call[1] as string).toContain('location:');
		}
	});

	it('keeps the first of two duplicate keys, or refuses the edit', () => {
		const DUP = '---\ntitle: Trip\nnote: first\nnote: second\n---\n\nbody\n';
		open(DUP);
		updateProperty('title', 'Trip2');
		if (content() !== DUP) expect(content()).toContain('note: first');
	});
});

describe('F103 (panel leg): unsafe integer rewritten by a panel edit', () => {
	it('keeps tweet_id digits, or refuses the edit', () => {
		const DOC = '---\ntitle: T\ntweet_id: 1234567890123456789\n---\n\nbody\n';
		open(DOC);
		updateProperty('title', 'T2');
		if (content() !== DOC) {
			expect(content().split('\n').find((l) => l.startsWith('tweet_id:'))).toBe('tweet_id: 1234567890123456789');
		}
	});
});
