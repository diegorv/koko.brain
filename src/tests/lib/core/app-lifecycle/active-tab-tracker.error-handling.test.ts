import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Tauri core API — needed because backlinks.service imports invoke
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/features/backlinks/backlinks.service', () => ({
	updateBacklinksForFile: vi.fn(),
}));

vi.mock('$lib/features/backlinks/note-index.store.svelte', () => ({
	noteIndexStore: {
		get noteContents() { return new Map(); },
		reset: vi.fn(),
	},
}));

vi.mock('$lib/features/backlinks/backlinks.logic', () => ({
	buildResolutionCache: vi.fn(() => new Map()),
}));

vi.mock('$lib/features/outgoing-links/outgoing-links.service', () => ({
	updateOutgoingLinksForFile: vi.fn(),
}));

vi.mock('$lib/utils/debug', () => ({
	error: vi.fn(),
	perfStart: vi.fn(() => 0),
	perfEnd: vi.fn(),
}));

import { updateBacklinksForFile } from '$lib/features/backlinks/backlinks.service';
import { updateOutgoingLinksForFile } from '$lib/features/outgoing-links/outgoing-links.service';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';
import { updateActiveTabLinks } from '$lib/core/app-lifecycle/active-tab-tracker.service';

describe('updateActiveTabLinks — error handling', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		backlinksStore.reset();
		outgoingLinksStore.reset();
	});

	it('catches error when updateBacklinksForFile throws (does not propagate)', () => {
		vi.mocked(updateBacklinksForFile).mockImplementation(() => {
			throw new Error('backlinks computation failed');
		});

		expect(() => updateActiveTabLinks('/vault/note.md')).not.toThrow();
	});

	it('still calls updateOutgoingLinksForFile when updateBacklinksForFile throws', () => {
		vi.mocked(updateBacklinksForFile).mockImplementation(() => {
			throw new Error('backlinks error');
		});

		updateActiveTabLinks('/vault/note.md');

		expect(updateOutgoingLinksForFile).toHaveBeenCalledWith('/vault/note.md', expect.any(Array), expect.any(Map));
	});

	it('catches error when updateOutgoingLinksForFile throws (does not propagate)', () => {
		vi.mocked(updateOutgoingLinksForFile).mockImplementation(() => {
			throw new Error('outgoing links failed');
		});

		expect(() => updateActiveTabLinks('/vault/note.md')).not.toThrow();
	});

	it('calls updateBacklinksForFile even when updateOutgoingLinksForFile throws', () => {
		vi.mocked(updateOutgoingLinksForFile).mockImplementation(() => {
			throw new Error('outgoing links failed');
		});

		updateActiveTabLinks('/vault/note.md');

		// Backlinks should have been updated even though outgoing links threw
		expect(updateBacklinksForFile).toHaveBeenCalledWith('/vault/note.md', expect.any(Array), expect.any(Map));
	});

	it('clears stores without error when path is null (no service calls)', () => {
		// Pre-populate stores
		backlinksStore.setLinkedMentions([
			{ sourcePath: '/vault/x.md', sourceName: 'x', snippets: [] },
		]);
		outgoingLinksStore.setOutgoingLinks([
			{ target: 'y', alias: null, heading: null, resolvedPath: null, position: 0 },
		]);

		updateActiveTabLinks(null);

		expect(updateBacklinksForFile).not.toHaveBeenCalled();
		expect(updateOutgoingLinksForFile).not.toHaveBeenCalled();
		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(outgoingLinksStore.outgoingLinks).toEqual([]);
	});
});
