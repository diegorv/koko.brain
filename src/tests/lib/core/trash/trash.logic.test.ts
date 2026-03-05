import { describe, it, expect, vi, afterEach } from 'vitest';
import {
	getTrashDir,
	getTrashItemsDir,
	getTrashManifestPath,
	getTrashItemPath,
	getTrashItemDir,
	createTrashItem,
	parseTrashManifest,
	serializeTrashManifest,
	formatTrashedDate,
} from '$lib/core/trash/trash.logic';
import type { TrashItem } from '$lib/core/trash/trash.types';

const VAULT = '/Users/me/vault';

describe('getTrashDir', () => {
	it('returns the trash root directory path', () => {
		expect(getTrashDir(VAULT)).toBe('/Users/me/vault/.kokobrain/trash');
	});
});

describe('getTrashItemsDir', () => {
	it('returns the items subdirectory path', () => {
		expect(getTrashItemsDir(VAULT)).toBe('/Users/me/vault/.kokobrain/trash/items');
	});
});

describe('getTrashManifestPath', () => {
	it('returns the manifest JSON file path', () => {
		expect(getTrashManifestPath(VAULT)).toBe('/Users/me/vault/.kokobrain/trash/trash-manifest.json');
	});
});

describe('getTrashItemPath', () => {
	it('returns the path to a trashed file inside its timestamped folder', () => {
		expect(getTrashItemPath(VAULT, '1708185600000', 'meeting.md'))
			.toBe('/Users/me/vault/.kokobrain/trash/items/1708185600000/meeting.md');
	});

	it('works with directory names', () => {
		expect(getTrashItemPath(VAULT, '1708185600000', 'projects'))
			.toBe('/Users/me/vault/.kokobrain/trash/items/1708185600000/projects');
	});
});

describe('getTrashItemDir', () => {
	it('returns the container directory for a trashed item', () => {
		expect(getTrashItemDir(VAULT, '1708185600000'))
			.toBe('/Users/me/vault/.kokobrain/trash/items/1708185600000');
	});
});

describe('createTrashItem', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('creates a TrashItem for a file', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1708185600000);
		const item = createTrashItem('notes/meeting.md', false);

		expect(item.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
		expect(item.originalPath).toBe('notes/meeting.md');
		expect(item.fileName).toBe('meeting.md');
		expect(item.isDirectory).toBe(false);
		expect(item.trashedAt).toBe(1708185600000);
	});

	it('creates a TrashItem for a directory', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1708185700000);
		const item = createTrashItem('projects/archive', true);

		expect(item.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
		expect(item.originalPath).toBe('projects/archive');
		expect(item.fileName).toBe('archive');
		expect(item.isDirectory).toBe(true);
		expect(item.trashedAt).toBe(1708185700000);
	});

	it('handles root-level files (no slash in path)', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1708185800000);
		const item = createTrashItem('README.md', false);

		expect(item.fileName).toBe('README.md');
		expect(item.originalPath).toBe('README.md');
	});

	it('handles deeply nested paths', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1708185900000);
		const item = createTrashItem('a/b/c/d/deep-file.md', false);

		expect(item.fileName).toBe('deep-file.md');
		expect(item.originalPath).toBe('a/b/c/d/deep-file.md');
	});

	it('generates unique IDs even when called in the same millisecond', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1708185600000);
		const item1 = createTrashItem('a.md', false);
		const item2 = createTrashItem('b.md', false);

		expect(item1.id).not.toBe(item2.id);
		expect(item1.trashedAt).toBe(item2.trashedAt);
	});
});

describe('parseTrashManifest', () => {
	it('parses a valid manifest JSON', () => {
		const items: TrashItem[] = [
			{ id: '1', originalPath: 'notes/a.md', fileName: 'a.md', isDirectory: false, trashedAt: 1000 },
			{ id: '2', originalPath: 'folder', fileName: 'folder', isDirectory: true, trashedAt: 2000 },
		];
		const result = parseTrashManifest(JSON.stringify(items));
		expect(result).toEqual(items);
	});

	it('returns empty array for invalid JSON', () => {
		expect(parseTrashManifest('not json')).toEqual([]);
	});

	it('returns empty array for empty string', () => {
		expect(parseTrashManifest('')).toEqual([]);
	});

	it('returns empty array for non-array JSON', () => {
		expect(parseTrashManifest('{"key": "value"}')).toEqual([]);
		expect(parseTrashManifest('"string"')).toEqual([]);
		expect(parseTrashManifest('42')).toEqual([]);
	});

	it('filters out invalid items from the array', () => {
		const json = JSON.stringify([
			{ id: '1', originalPath: 'a.md', fileName: 'a.md', isDirectory: false, trashedAt: 1000 },
			{ id: '2', originalPath: 'b.md' }, // missing fields
			null,
			'not an object',
			{ id: '3', originalPath: 'c.md', fileName: 'c.md', isDirectory: false, trashedAt: 3000 },
		]);
		const result = parseTrashManifest(json);
		expect(result).toHaveLength(2);
		expect(result[0].id).toBe('1');
		expect(result[1].id).toBe('3');
	});

	it('rejects items with wrong field types', () => {
		const json = JSON.stringify([
			{ id: 123, originalPath: 'a.md', fileName: 'a.md', isDirectory: false, trashedAt: 1000 }, // id should be string
			{ id: '2', originalPath: 'b.md', fileName: 'b.md', isDirectory: 'yes', trashedAt: 2000 }, // isDirectory should be boolean
		]);
		const result = parseTrashManifest(json);
		expect(result).toHaveLength(0);
	});
});

describe('serializeTrashManifest', () => {
	it('serializes items to formatted JSON', () => {
		const items: TrashItem[] = [
			{ id: '1', originalPath: 'a.md', fileName: 'a.md', isDirectory: false, trashedAt: 1000 },
		];
		const json = serializeTrashManifest(items);
		expect(JSON.parse(json)).toEqual(items);
		// Should be pretty-printed
		expect(json).toContain('\n');
	});

	it('serializes empty array', () => {
		expect(serializeTrashManifest([])).toBe('[]');
	});
});

describe('formatTrashedDate', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns "Just now" for timestamps less than 1 minute ago', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
		expect(formatTrashedDate(1_000_000)).toBe('Just now');
		expect(formatTrashedDate(1_000_000 - 30_000)).toBe('Just now');
	});

	it('returns "X min ago" for timestamps 1-59 minutes ago', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1_000_000_000);
		expect(formatTrashedDate(1_000_000_000 - 60_000)).toBe('1 min ago');
		expect(formatTrashedDate(1_000_000_000 - 5 * 60_000)).toBe('5 min ago');
		expect(formatTrashedDate(1_000_000_000 - 59 * 60_000)).toBe('59 min ago');
	});

	it('returns "Xh ago" for timestamps 1-23 hours ago', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1_000_000_000);
		expect(formatTrashedDate(1_000_000_000 - 3_600_000)).toBe('1h ago');
		expect(formatTrashedDate(1_000_000_000 - 12 * 3_600_000)).toBe('12h ago');
		expect(formatTrashedDate(1_000_000_000 - 23 * 3_600_000)).toBe('23h ago');
	});

	it('returns "Xd ago" for timestamps 1-29 days ago', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1_000_000_000);
		expect(formatTrashedDate(1_000_000_000 - 86_400_000)).toBe('1d ago');
		expect(formatTrashedDate(1_000_000_000 - 7 * 86_400_000)).toBe('7d ago');
		expect(formatTrashedDate(1_000_000_000 - 29 * 86_400_000)).toBe('29d ago');
	});

	it('returns locale date string for timestamps 30+ days ago', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1_000_000_000);
		const result = formatTrashedDate(1_000_000_000 - 31 * 86_400_000);
		// Should contain a date-like format (varies by locale)
		expect(result).toBeTruthy();
		expect(result).not.toBe('Just now');
		expect(result).not.toContain('ago');
	});
});
