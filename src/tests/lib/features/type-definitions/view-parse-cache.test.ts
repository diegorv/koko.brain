import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { parseCollectionYaml } from '#lib/features/collection/yaml-parser.js';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
}));

vi.mock('#lib/features/collection/yaml-parser.js', () => ({
	parseCollectionYaml: vi.fn(),
}));

import { refreshViewDefinition, getCachedViewDefinition, getViewContentHash, clearViewParseCache, clearViewParseCacheUnder, clearAllViewParseCache } from '#lib/features/type-definitions/view-parse-cache.js';

const mockReadTextFile = vi.mocked(readTextFile);
const mockParseCollectionYaml = vi.mocked(parseCollectionYaml);

const YAML_CONTENT = 'source: notes\nviews:\n  - name: test';
const PARSED_RESULT = { success: true, definition: { source: 'notes', views: [{ name: 'test' }] } };

/** Makes the next `readTextFile` call wait until the returned `resolve` runs. */
function holdNextRead(): (content: string) => void {
	let resolve!: (content: string) => void;
	mockReadTextFile.mockReturnValueOnce(new Promise<string>((r) => (resolve = r)));
	return resolve;
}

beforeEach(() => {
	vi.clearAllMocks();
	clearAllViewParseCache();
});

describe('refreshViewDefinition', () => {
	it('reads file and parses on first call', async () => {
		mockReadTextFile.mockResolvedValue(YAML_CONTENT);
		mockParseCollectionYaml.mockReturnValue(PARSED_RESULT as any);

		const result = await refreshViewDefinition('/v/test.view');

		expect(mockReadTextFile).toHaveBeenCalledWith('/v/test.view');
		expect(mockParseCollectionYaml).toHaveBeenCalledWith(YAML_CONTENT);
		expect(result).toBe(PARSED_RESULT);
	});

	it('skips parse on second call with same content', async () => {
		mockReadTextFile.mockResolvedValue(YAML_CONTENT);
		mockParseCollectionYaml.mockReturnValue(PARSED_RESULT as any);

		await refreshViewDefinition('/v/test.view');
		const result = await refreshViewDefinition('/v/test.view');

		expect(mockReadTextFile).toHaveBeenCalledTimes(2);
		expect(mockParseCollectionYaml).toHaveBeenCalledTimes(1);
		expect(result).toBe(PARSED_RESULT);
	});

	it('re-parses when file content changes', async () => {
		mockReadTextFile.mockResolvedValue(YAML_CONTENT);
		mockParseCollectionYaml.mockReturnValue(PARSED_RESULT as any);
		await refreshViewDefinition('/v/test.view');

		const newContent = 'source: notes\nviews:\n  - name: updated';
		const newParsed = { success: true, definition: { source: 'notes', views: [{ name: 'updated' }] } };
		mockReadTextFile.mockResolvedValue(newContent);
		mockParseCollectionYaml.mockReturnValue(newParsed as any);

		const result = await refreshViewDefinition('/v/test.view');

		expect(mockParseCollectionYaml).toHaveBeenCalledTimes(2);
		expect(result).toBe(newParsed);
	});
});

describe('getCachedViewDefinition', () => {
	it('returns cached definition without disk I/O', async () => {
		mockReadTextFile.mockResolvedValue(YAML_CONTENT);
		mockParseCollectionYaml.mockReturnValue(PARSED_RESULT as any);

		await refreshViewDefinition('/v/test.view');
		mockReadTextFile.mockClear();

		const result = await getCachedViewDefinition('/v/test.view');

		expect(mockReadTextFile).not.toHaveBeenCalled();
		expect(result).toBe(PARSED_RESULT);
	});

	it('falls back to disk read when not cached', async () => {
		mockReadTextFile.mockResolvedValue(YAML_CONTENT);
		mockParseCollectionYaml.mockReturnValue(PARSED_RESULT as any);

		const result = await getCachedViewDefinition('/v/test.view');

		expect(mockReadTextFile).toHaveBeenCalledWith('/v/test.view');
		expect(result).toBe(PARSED_RESULT);
	});
});

describe('getViewContentHash', () => {
	it('returns undefined for a path that was never cached', () => {
		expect(getViewContentHash('/v/missing.view')).toBeUndefined();
	});

	it('stays stable across two refreshes with identical content', async () => {
		mockReadTextFile.mockResolvedValue(YAML_CONTENT);
		mockParseCollectionYaml.mockReturnValue(PARSED_RESULT as any);

		await refreshViewDefinition('/v/test.view');
		const first = getViewContentHash('/v/test.view');
		await refreshViewDefinition('/v/test.view');

		expect(first).toBeDefined();
		expect(getViewContentHash('/v/test.view')).toBe(first);
	});

	it('changes when the file content changes', async () => {
		mockReadTextFile.mockResolvedValue(YAML_CONTENT);
		mockParseCollectionYaml.mockReturnValue(PARSED_RESULT as any);
		await refreshViewDefinition('/v/test.view');
		const first = getViewContentHash('/v/test.view');

		mockReadTextFile.mockResolvedValue('source: notes\nviews:\n  - name: updated');
		await refreshViewDefinition('/v/test.view');

		expect(getViewContentHash('/v/test.view')).not.toBe(first);
	});

	it('returns undefined again after the entry is cleared', async () => {
		mockReadTextFile.mockResolvedValue(YAML_CONTENT);
		mockParseCollectionYaml.mockReturnValue(PARSED_RESULT as any);

		await refreshViewDefinition('/v/test.view');
		clearViewParseCache('/v/test.view');

		expect(getViewContentHash('/v/test.view')).toBeUndefined();
	});
});

describe('clearViewParseCache', () => {
	it('forces re-read and re-parse after clear', async () => {
		mockReadTextFile.mockResolvedValue(YAML_CONTENT);
		mockParseCollectionYaml.mockReturnValue(PARSED_RESULT as any);

		await refreshViewDefinition('/v/test.view');
		clearViewParseCache('/v/test.view');

		await getCachedViewDefinition('/v/test.view');
		expect(mockReadTextFile).toHaveBeenCalledTimes(2);
		expect(mockParseCollectionYaml).toHaveBeenCalledTimes(2);
	});

	it('leaves other cached paths untouched', async () => {
		mockReadTextFile.mockResolvedValue(YAML_CONTENT);
		mockParseCollectionYaml.mockReturnValue(PARSED_RESULT as any);

		await refreshViewDefinition('/v/a.view');
		await refreshViewDefinition('/v/b.view');
		clearViewParseCache('/v/a.view');

		await getCachedViewDefinition('/v/b.view');
		expect(mockReadTextFile).toHaveBeenCalledTimes(2);
	});
});

describe('clearViewParseCacheUnder', () => {
	beforeEach(() => {
		mockReadTextFile.mockResolvedValue(YAML_CONTENT);
		mockParseCollectionYaml.mockReturnValue(PARSED_RESULT as any);
	});

	it('evicts the path itself', async () => {
		await refreshViewDefinition('/v/a.view');

		clearViewParseCacheUnder('/v/a.view');

		expect(getViewContentHash('/v/a.view')).toBeUndefined();
	});

	it('evicts every entry under a folder, at any depth', async () => {
		await refreshViewDefinition('/v/dir/a.view');
		await refreshViewDefinition('/v/dir/sub/b.view');

		clearViewParseCacheUnder('/v/dir');

		expect(getViewContentHash('/v/dir/a.view')).toBeUndefined();
		expect(getViewContentHash('/v/dir/sub/b.view')).toBeUndefined();
	});

	it('keeps siblings, including one whose name starts with the folder name', async () => {
		await refreshViewDefinition('/v/dir2/c.view');
		await refreshViewDefinition('/v/other.view');

		clearViewParseCacheUnder('/v/dir');

		expect(getViewContentHash('/v/dir2/c.view')).toBeDefined();
		expect(getViewContentHash('/v/other.view')).toBeDefined();
	});

	it('does nothing on an empty cache', () => {
		expect(() => clearViewParseCacheUnder('/v/dir')).not.toThrow();
	});
});

describe('a read in flight across an eviction', () => {
	beforeEach(() => {
		mockParseCollectionYaml.mockImplementation((content: string) => ({ success: true, definition: { source: content } }) as any);
	});

	// `vi.clearAllMocks()` keeps implementations, so this one would leak into later describes.
	afterEach(() => {
		mockParseCollectionYaml.mockReset();
	});

	it('does not re-insert the evicted path when the held read resolves', async () => {
		const resolveRead = holdNextRead();
		const pending = refreshViewDefinition('/v/A.view');

		clearViewParseCacheUnder('/v/A.view');
		resolveRead('old');
		await pending;

		expect(getViewContentHash('/v/A.view')).toBeUndefined();
	});

	it('does not re-insert after clearViewParseCache or clearAllViewParseCache either', async () => {
		const resolveFirst = holdNextRead();
		const first = refreshViewDefinition('/v/A.view');
		clearViewParseCache('/v/A.view');
		resolveFirst('old');
		await first;
		expect(getViewContentHash('/v/A.view')).toBeUndefined();

		const resolveSecond = holdNextRead();
		const second = refreshViewDefinition('/v/A.view');
		clearAllViewParseCache();
		resolveSecond('old');
		await second;

		expect(getViewContentHash('/v/A.view')).toBeUndefined();
	});

	it('still returns what it read to its own caller', async () => {
		const resolveRead = holdNextRead();
		const pending = refreshViewDefinition('/v/A.view');

		clearViewParseCacheUnder('/v/A.view');
		resolveRead('old');

		expect(await pending).toEqual({ success: true, definition: { source: 'old' } });
	});

	it('caches normally for a read that starts after the eviction', async () => {
		mockReadTextFile.mockResolvedValueOnce('old');
		await refreshViewDefinition('/v/A.view');
		clearViewParseCacheUnder('/v/A.view');

		mockReadTextFile.mockResolvedValueOnce('fresh');
		await refreshViewDefinition('/v/A.view');

		expect(getViewContentHash('/v/A.view')).toBeDefined();
		mockReadTextFile.mockClear();
		expect(await getCachedViewDefinition('/v/A.view')).toEqual({ success: true, definition: { source: 'fresh' } });
		expect(mockReadTextFile).not.toHaveBeenCalled();
	});

	it('serves the current definition of A after renaming A -> B -> A', async () => {
		// The debounced recount reads A with the content it had before the renames.
		const resolveStaleRead = holdNextRead();
		const staleRead = refreshViewDefinition('/v/A.view');

		// Rename A -> B: the path-change consumer evicts A.
		clearViewParseCacheUnder('/v/A.view');
		// A filter change on B refreshes only B.
		mockReadTextFile.mockResolvedValueOnce('new');
		await refreshViewDefinition('/v/B.view');
		// Rename B -> A: the consumer evicts B.
		clearViewParseCacheUnder('/v/B.view');

		resolveStaleRead('old');
		await staleRead;

		mockReadTextFile.mockResolvedValueOnce('new');
		expect(await getCachedViewDefinition('/v/A.view')).toEqual({ success: true, definition: { source: 'new' } });
	});
});

describe('an older read of a path resolving after a newer one', () => {
	beforeEach(() => {
		mockParseCollectionYaml.mockImplementation((content: string) => ({ success: true, definition: { source: content } }) as any);
	});

	afterEach(() => {
		mockParseCollectionYaml.mockReset();
	});

	it('keeps the entry the newer read stored', async () => {
		// The debounced recount starts reading A's old bytes.
		const resolveStaleRead = holdNextRead();
		const staleRead = refreshViewDefinition('/v/A.view');

		// updateViewToolbarKey writes A and refreshes the cache with the new bytes.
		mockReadTextFile.mockResolvedValueOnce('new');
		await refreshViewDefinition('/v/A.view');

		resolveStaleRead('old');
		await staleRead;

		mockReadTextFile.mockClear();
		expect(await getCachedViewDefinition('/v/A.view')).toEqual({ success: true, definition: { source: 'new' } });
		expect(mockReadTextFile).not.toHaveBeenCalled();
	});

	it('keeps an entry a newer read confirmed with identical bytes', async () => {
		mockReadTextFile.mockResolvedValueOnce('new');
		await refreshViewDefinition('/v/A.view');

		const resolveStaleRead = holdNextRead();
		const staleRead = refreshViewDefinition('/v/A.view');
		// A newer read finds the bytes the cache already holds.
		mockReadTextFile.mockResolvedValueOnce('new');
		await refreshViewDefinition('/v/A.view');

		resolveStaleRead('old');
		await staleRead;

		mockReadTextFile.mockClear();
		expect(await getCachedViewDefinition('/v/A.view')).toEqual({ success: true, definition: { source: 'new' } });
	});

	it('still returns what it read to its own caller', async () => {
		const resolveStaleRead = holdNextRead();
		const staleRead = refreshViewDefinition('/v/A.view');
		mockReadTextFile.mockResolvedValueOnce('new');
		await refreshViewDefinition('/v/A.view');

		resolveStaleRead('old');

		expect(await staleRead).toEqual({ success: true, definition: { source: 'old' } });
	});

	it('caches every path of a concurrent fan-out, whatever order the reads resolve in', async () => {
		const paths = ['/v/A.view', '/v/B.view', '/v/C.view'];
		const resolvers = paths.map(() => holdNextRead());
		const reads = paths.map((p) => refreshViewDefinition(p));

		[...resolvers].reverse().forEach((resolve, i) => resolve(`content-${paths.length - 1 - i}`));
		await Promise.all(reads);

		mockReadTextFile.mockClear();
		for (const [i, p] of paths.entries()) {
			expect(await getCachedViewDefinition(p)).toEqual({ success: true, definition: { source: `content-${i}` } });
		}
		expect(mockReadTextFile).not.toHaveBeenCalled();
	});
});

describe('clearAllViewParseCache', () => {
	it('clears every cached parse entry', async () => {
		mockReadTextFile.mockResolvedValue(YAML_CONTENT);
		mockParseCollectionYaml.mockReturnValue(PARSED_RESULT as any);

		await refreshViewDefinition('/v/a.view');
		await refreshViewDefinition('/v/b.view');
		clearAllViewParseCache();

		await getCachedViewDefinition('/v/a.view');
		await getCachedViewDefinition('/v/b.view');
		expect(mockReadTextFile).toHaveBeenCalledTimes(4);
	});
});
