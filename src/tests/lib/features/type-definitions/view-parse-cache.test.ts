import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { parseCollectionYaml } from '$lib/features/collection/yaml-parser';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
}));

vi.mock('$lib/features/collection/yaml-parser', () => ({
	parseCollectionYaml: vi.fn(),
}));

import { refreshViewDefinition, getCachedViewDefinition, getViewContentHash, clearViewParseCache, clearAllViewParseCache } from '$lib/features/type-definitions/view-parse-cache';

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
