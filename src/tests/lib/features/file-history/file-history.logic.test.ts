import { describe, it, expect, vi, afterEach } from 'vitest';
import {
	formatSnapshotTime,
	formatFileSize,
	groupSnapshotsByDay,
	getRelativePath,
	getSnapshotBackupDir,
	getSnapshotBackupPath,
	hasBackupForTimestamp,
	findBackupTimestamp,
	formatSnapshotDateTime,
	formatSnapshotLabel,
} from '$lib/features/file-history/file-history.logic';
import type { SnapshotInfo } from '$lib/features/file-history/file-history.types';

describe('formatSnapshotTime', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns "Just now" for timestamps less than 1 minute ago', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
		expect(formatSnapshotTime(1_000_000)).toBe('Just now');
		expect(formatSnapshotTime(1_000_000 - 30_000)).toBe('Just now'); // 30s ago
	});

	it('returns "X min ago" for timestamps 1-59 minutes ago', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1_000_000_000);
		expect(formatSnapshotTime(1_000_000_000 - 60_000)).toBe('1 min ago');
		expect(formatSnapshotTime(1_000_000_000 - 5 * 60_000)).toBe('5 min ago');
		expect(formatSnapshotTime(1_000_000_000 - 59 * 60_000)).toBe('59 min ago');
	});

	it('returns "Xh ago" for timestamps 1-23 hours ago', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1_000_000_000);
		expect(formatSnapshotTime(1_000_000_000 - 3_600_000)).toBe('1h ago');
		expect(formatSnapshotTime(1_000_000_000 - 12 * 3_600_000)).toBe('12h ago');
		expect(formatSnapshotTime(1_000_000_000 - 23 * 3_600_000)).toBe('23h ago');
	});

	it('returns HH:MM for timestamps older than 24 hours', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1_000_000_000);
		const result = formatSnapshotTime(1_000_000_000 - 25 * 3_600_000);
		// Should contain a colon (HH:MM format)
		expect(result).toMatch(/\d{1,2}:\d{2}/);
	});
});

describe('formatSnapshotDateTime', () => {
	it('returns HH:MM for today timestamps', () => {
		const now = new Date();
		// Set to 14:30 today
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 30, 0);
		const result = formatSnapshotDateTime(today.getTime());
		expect(result).toMatch(/\d{1,2}:\d{2}/);
		// Should NOT contain a month name (since it's today)
		expect(result).not.toMatch(/[A-Z][a-z]{2}/);
	});

	it('returns "MMM D, HH:MM" for older timestamps', () => {
		// Use a fixed date in the past (Jan 15, 2024 at 09:45)
		const pastDate = new Date(2024, 0, 15, 9, 45, 0);
		const result = formatSnapshotDateTime(pastDate.getTime());
		// Should contain both a date part and a time part
		expect(result).toMatch(/\d{1,2}:\d{2}/);
		expect(result).toContain(',');
	});

	it('returns date+time for yesterday', () => {
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		yesterday.setHours(10, 0, 0, 0);
		const result = formatSnapshotDateTime(yesterday.getTime());
		// Should include date since it's not today
		expect(result).toContain(',');
	});
});

describe('formatSnapshotLabel', () => {
	it('returns "Current" for index 0', () => {
		expect(formatSnapshotLabel(0)).toBe('Current');
	});

	it('returns singular form for index 1', () => {
		expect(formatSnapshotLabel(1)).toBe('1 version before current');
	});

	it('returns plural form for index 2+', () => {
		expect(formatSnapshotLabel(2)).toBe('2 versions before current');
		expect(formatSnapshotLabel(5)).toBe('5 versions before current');
		expect(formatSnapshotLabel(10)).toBe('10 versions before current');
	});
});

describe('formatFileSize', () => {
	it('returns "0 B" for zero', () => {
		expect(formatFileSize(0)).toBe('0 B');
	});

	it('returns bytes for small values', () => {
		expect(formatFileSize(512)).toBe('512 B');
		expect(formatFileSize(1023)).toBe('1023 B');
	});

	it('returns KB for kilobyte values', () => {
		expect(formatFileSize(1024)).toBe('1.0 KB');
		expect(formatFileSize(1536)).toBe('1.5 KB');
	});

	it('returns MB for megabyte values', () => {
		expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
		expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
	});
});

describe('groupSnapshotsByDay', () => {
	const makeSnapshot = (id: number, timestamp: number, size = 100): SnapshotInfo => ({
		id,
		timestamp,
		size,
	});

	it('returns empty array for empty input', () => {
		expect(groupSnapshotsByDay([])).toEqual([]);
	});

	it('single snapshot returns single group', () => {
		const now = Date.now();
		const groups = groupSnapshotsByDay([makeSnapshot(1, now)]);
		expect(groups).toHaveLength(1);
		expect(groups[0].label).toBe('Today');
		expect(groups[0].snapshots).toHaveLength(1);
	});

	it('labels "Today" and "Yesterday" correctly', () => {
		const now = Date.now();
		const yesterday = now - 24 * 3_600_000;
		const groups = groupSnapshotsByDay([
			makeSnapshot(1, now),
			makeSnapshot(2, yesterday),
		]);
		expect(groups).toHaveLength(2);
		const labels = groups.map((g) => g.label);
		expect(labels).toContain('Today');
		expect(labels).toContain('Yesterday');
	});

	it('groups multiple snapshots by day', () => {
		const now = Date.now();
		const groups = groupSnapshotsByDay([
			makeSnapshot(1, now - 1000),
			makeSnapshot(2, now - 2000),
			makeSnapshot(3, now - 3000),
		]);
		expect(groups).toHaveLength(1);
		expect(groups[0].snapshots).toHaveLength(3);
	});

	it('returns groups sorted newest first', () => {
		const now = Date.now();
		const twoDaysAgo = now - 2 * 24 * 3_600_000;
		const groups = groupSnapshotsByDay([
			makeSnapshot(1, twoDaysAgo),
			makeSnapshot(2, now),
		]);
		expect(groups).toHaveLength(2);
		expect(groups[0].label).toBe('Today');
	});

	it('sorts snapshots within each group newest first', () => {
		const now = Date.now();
		const groups = groupSnapshotsByDay([
			makeSnapshot(1, now - 5000),
			makeSnapshot(2, now - 1000),
			makeSnapshot(3, now - 3000),
		]);
		expect(groups[0].snapshots[0].id).toBe(2);
		expect(groups[0].snapshots[1].id).toBe(3);
		expect(groups[0].snapshots[2].id).toBe(1);
	});
});

describe('getRelativePath', () => {
	it('strips vault path prefix correctly', () => {
		expect(getRelativePath('/Users/me/vault', '/Users/me/vault/note.md')).toBe('note.md');
	});

	it('handles nested paths', () => {
		expect(getRelativePath('/vault', '/vault/notes/subfolder/file.md')).toBe('notes/subfolder/file.md');
	});

	it('returns original path if not inside vault', () => {
		expect(getRelativePath('/vault', '/other/path/file.md')).toBe('/other/path/file.md');
	});

	it('handles vault path without trailing slash', () => {
		expect(getRelativePath('/vault', '/vault/file.md')).toBe('file.md');
	});
});

describe('getSnapshotBackupDir', () => {
	it('computes backup directory from vault and file paths', () => {
		expect(getSnapshotBackupDir('/Users/me/vault', '/Users/me/vault/notes/meeting.md'))
			.toBe('/Users/me/vault/.kokobrain/snapshots-backup/notes/meeting.md');
	});

	it('handles files at vault root', () => {
		expect(getSnapshotBackupDir('/vault', '/vault/readme.md'))
			.toBe('/vault/.kokobrain/snapshots-backup/readme.md');
	});

	it('handles deeply nested paths', () => {
		expect(getSnapshotBackupDir('/v', '/v/a/b/c/d.md'))
			.toBe('/v/.kokobrain/snapshots-backup/a/b/c/d.md');
	});
});

describe('getSnapshotBackupPath', () => {
	it('appends timestamp with .md extension', () => {
		expect(getSnapshotBackupPath('/vault', '/vault/notes/file.md', 1708185600000))
			.toBe('/vault/.kokobrain/snapshots-backup/notes/file.md/1708185600000.md');
	});

	it('works for root-level files', () => {
		expect(getSnapshotBackupPath('/vault', '/vault/todo.md', 1000))
			.toBe('/vault/.kokobrain/snapshots-backup/todo.md/1000.md');
	});
});

describe('hasBackupForTimestamp', () => {
	it('returns true for exact match', () => {
		const timestamps = new Set([1000, 2000, 3000]);
		expect(hasBackupForTimestamp(2000, timestamps)).toBe(true);
	});

	it('returns true for match within tolerance', () => {
		const timestamps = new Set([1000]);
		expect(hasBackupForTimestamp(1050, timestamps, 100)).toBe(true);
		expect(hasBackupForTimestamp(950, timestamps, 100)).toBe(true);
	});

	it('returns false when no match within tolerance', () => {
		const timestamps = new Set([1000]);
		expect(hasBackupForTimestamp(2000, timestamps, 100)).toBe(false);
	});

	it('returns false for empty set', () => {
		expect(hasBackupForTimestamp(1000, new Set())).toBe(false);
	});

	it('uses default 10s tolerance', () => {
		const timestamps = new Set([1_000_000]);
		expect(hasBackupForTimestamp(1_005_000, timestamps)).toBe(true);
		expect(hasBackupForTimestamp(1_011_000, timestamps)).toBe(false);
	});
});

describe('findBackupTimestamp', () => {
	it('returns exact timestamp on exact match', () => {
		const timestamps = new Set([1000, 2000, 3000]);
		expect(findBackupTimestamp(2000, timestamps)).toBe(2000);
	});

	it('returns matching backup timestamp within tolerance', () => {
		const timestamps = new Set([1000]);
		expect(findBackupTimestamp(1050, timestamps, 100)).toBe(1000);
		expect(findBackupTimestamp(950, timestamps, 100)).toBe(1000);
	});

	it('returns null when no match within tolerance', () => {
		const timestamps = new Set([1000]);
		expect(findBackupTimestamp(2000, timestamps, 100)).toBeNull();
	});

	it('returns null for empty set', () => {
		expect(findBackupTimestamp(1000, new Set())).toBeNull();
	});

	it('uses default 10s tolerance', () => {
		const timestamps = new Set([1_000_000]);
		expect(findBackupTimestamp(1_005_000, timestamps)).toBe(1_000_000);
		expect(findBackupTimestamp(1_011_000, timestamps)).toBeNull();
	});
});
