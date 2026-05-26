import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { parseCollectionYaml } from '$lib/features/collection/yaml-parser';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
}));

vi.mock('$lib/features/collection/yaml-parser', () => ({
	parseCollectionYaml: vi.fn(),
}));

import { refreshViewDefinition, getCachedViewDefinition, setViewQueryResult, getViewQueryResult, clearViewParseCache, clearAllViewParseCache } from '$lib/features/type-definitions/view-parse-cache';

const mockReadTextFile = vi.mocked(readTextFile);
const mockParseCollectionYaml = vi.mocked(parseCollectionYaml);

const YAML_CONTENT = 'source: notes\nviews:\n  - name: test';
const PARSED_RESULT = { success: true, definition: { source: 'notes', views: [{ name: 'test' }] } };

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

describe('query result cache', () => {
	it('stores and retrieves query results', () => {
		const paths = new Set(['/v/a.md', '/v/b.md']);
		setViewQueryResult('/v/test.view', paths);
		expect(getViewQueryResult('/v/test.view')).toBe(paths);
	});

	it('returns undefined for uncached paths', () => {
		expect(getViewQueryResult('/v/missing.view')).toBeUndefined();
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

	it('clears query result cache too', () => {
		setViewQueryResult('/v/test.view', new Set(['/v/a.md']));
		clearViewParseCache('/v/test.view');
		expect(getViewQueryResult('/v/test.view')).toBeUndefined();
	});
});

describe('clearAllViewParseCache', () => {
	it('clears all parse and query caches', async () => {
		mockReadTextFile.mockResolvedValue(YAML_CONTENT);
		mockParseCollectionYaml.mockReturnValue(PARSED_RESULT as any);

		await refreshViewDefinition('/v/a.view');
		setViewQueryResult('/v/a.view', new Set(['/v/x.md']));
		clearAllViewParseCache();

		expect(getViewQueryResult('/v/a.view')).toBeUndefined();
		await getCachedViewDefinition('/v/a.view');
		expect(mockReadTextFile).toHaveBeenCalledTimes(2);
	});
});
