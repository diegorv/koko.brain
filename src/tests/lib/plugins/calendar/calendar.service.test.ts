import { describe, it, expect, vi, beforeEach } from 'vitest';
import dayjs from 'dayjs';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Mock only side-effect services
vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

vi.mock('$lib/core/note-creator/note-creator.service', () => ({
	openOrCreateNote: vi.fn(),
}));

import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { openOrCreateNote } from '$lib/core/note-creator/note-creator.service';
import { calendarStore } from '$lib/plugins/calendar/calendar.store.svelte';
import {
	scanFilesForCalendar,
	updateCalendarForFile,
	openOrCreateDailyNoteForDate,
	openOrCreatePeriodicNoteForDate,
	openCalendarFile,
	resetCalendar,
} from '$lib/plugins/calendar/calendar.service';

describe('scanFilesForCalendar', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		resetCalendar();
		fsStore.reset();
		collectionStore.reset();
	});

	it('scans file tree and populates dayPaths', () => {
		const ts = 1705276800000;
		const expectedKey = dayjs(ts).format('YYYY-MM-DD');
		fsStore.setFileTree([
			{ name: 'note1.md', path: '/vault/note1.md', isDirectory: false, createdAt: ts, children: [] },
			{ name: 'note2.md', path: '/vault/note2.md', isDirectory: false, createdAt: ts, children: [] },
		]);

		scanFilesForCalendar();

		expect(calendarStore.dayPaths.size).toBeGreaterThan(0);
		const paths = calendarStore.dayPaths.get(expectedKey);
		expect(paths).toBeDefined();
		expect(paths).toContain('/vault/note1.md');
		expect(paths).toContain('/vault/note2.md');
	});

	it('uses frontmatter created property over createdAt', () => {
		const ts = 1705276800000;
		fsStore.setFileTree([
			{ name: 'note.md', path: '/vault/note.md', isDirectory: false, createdAt: ts, children: [] },
		]);
		collectionStore.setPropertyIndex(new Map([
			['/vault/note.md', { properties: new Map([['created', '2025-06-15']]) }],
		]) as any);

		scanFilesForCalendar();

		expect(calendarStore.dayPaths.has('2025-06-15')).toBe(true);
		expect(calendarStore.dayPaths.get('2025-06-15')).toContain('/vault/note.md');
	});

	it('walks directory children recursively', () => {
		const ts = 1705276800000;
		const expectedKey = dayjs(ts).format('YYYY-MM-DD');
		fsStore.setFileTree([
			{
				name: 'folder',
				path: '/vault/folder',
				isDirectory: true,
				children: [
					{ name: 'note.md', path: '/vault/folder/note.md', isDirectory: false, createdAt: ts, children: [] },
				],
			},
		]);

		scanFilesForCalendar();

		expect(calendarStore.dayPaths.size).toBeGreaterThan(0);
		expect(calendarStore.dayPaths.get(expectedKey)).toContain('/vault/folder/note.md');
	});

	it('handles empty file tree', () => {
		fsStore.setFileTree([]);

		scanFilesForCalendar();

		expect(calendarStore.dayPaths.size).toBe(0);
	});

	it('excludes non-markdown files from calendar', () => {
		const ts = 1705276800000;
		fsStore.setFileTree([
			{ name: 'note.md', path: '/vault/note.md', isDirectory: false, createdAt: ts, children: [] },
			{ name: 'image.webp', path: '/vault/image.webp', isDirectory: false, createdAt: ts, children: [] },
			{ name: 'data.json', path: '/vault/data.json', isDirectory: false, createdAt: ts, children: [] },
			{ name: 'doc.markdown', path: '/vault/doc.markdown', isDirectory: false, createdAt: ts, children: [] },
		]);

		scanFilesForCalendar();

		const expectedKey = dayjs(ts).format('YYYY-MM-DD');
		const paths = calendarStore.dayPaths.get(expectedKey) ?? [];
		expect(paths).toContain('/vault/note.md');
		expect(paths).toContain('/vault/doc.markdown');
		expect(paths).not.toContain('/vault/image.webp');
		expect(paths).not.toContain('/vault/data.json');
	});
});

describe('updateCalendarForFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		resetCalendar();
		fsStore.reset();
		collectionStore.reset();
		// Run a full scan first to populate fileDateKeys
		const ts = 1705276800000;
		fsStore.setFileTree([
			{ name: 'note.md', path: '/vault/note.md', isDirectory: false, createdAt: ts, children: [] },
		]);
		scanFilesForCalendar();
	});

	it('skips update when date key has not changed', () => {
		fsStore.setFileTree([
			{ name: 'dated.md', path: '/vault/dated.md', isDirectory: false, createdAt: null as any, children: [] },
		]);
		collectionStore.setPropertyIndex(new Map([
			['/vault/dated.md', { properties: new Map([['created', '2025-06-15']]) }],
		]) as any);
		scanFilesForCalendar();
		const pathsBefore = new Map(calendarStore.dayPaths);

		updateCalendarForFile('/vault/dated.md', '---\ncreated: 2025-06-15\n---\nContent');

		// dayPaths should be unchanged because the date key didn't change
		expect(calendarStore.dayPaths.get('2025-06-15')).toEqual(pathsBefore.get('2025-06-15'));
	});

	it('updates calendar when created property is added', () => {
		const ts = 1705276800000;
		const oldKey = dayjs(ts).format('YYYY-MM-DD');

		updateCalendarForFile('/vault/note.md', '---\ncreated: 2025-12-25\n---\nContent');

		// The file should now be under the new date key
		expect(calendarStore.dayPaths.get('2025-12-25')).toContain('/vault/note.md');
		// And removed from the old key (if the old key only had this file)
		const oldPaths = calendarStore.dayPaths.get(oldKey) ?? [];
		expect(oldPaths).not.toContain('/vault/note.md');
	});

	it('updates calendar when created property is removed', () => {
		fsStore.setFileTree([
			{ name: 'dated.md', path: '/vault/dated.md', isDirectory: false, createdAt: null as any, children: [] },
		]);
		collectionStore.setPropertyIndex(new Map([
			['/vault/dated.md', { properties: new Map([['created', '2025-06-15']]) }],
		]) as any);
		scanFilesForCalendar();
		expect(calendarStore.dayPaths.get('2025-06-15')).toContain('/vault/dated.md');

		updateCalendarForFile('/vault/dated.md', '---\ntitle: No date\n---\nContent');

		const paths = calendarStore.dayPaths.get('2025-06-15') ?? [];
		expect(paths).not.toContain('/vault/dated.md');
	});

	it('handles file not in fileDateKeys (new file)', () => {
		updateCalendarForFile('/vault/brand-new.md', '---\ncreated: 2025-03-01\n---\nNew note');

		expect(calendarStore.dayPaths.get('2025-03-01')).toContain('/vault/brand-new.md');
	});

	it('does not remove filesystem-only file from calendar on content edit', () => {
		// Setup: file with no frontmatter, only filesystem createdAt
		const ts = 1718409600000; // 2024-06-15
		const fsKey = dayjs(ts).format('YYYY-MM-DD');
		fsStore.setFileTree([
			{ name: 'fs-only.md', path: '/vault/fs-only.md', isDirectory: false, createdAt: ts, children: [] },
		]);
		collectionStore.setPropertyIndex(new Map() as any);
		scanFilesForCalendar();
		expect(calendarStore.dayPaths.get(fsKey)).toContain('/vault/fs-only.md');

		// Edit content without adding a `created` property
		updateCalendarForFile('/vault/fs-only.md', '# Just body text\nNo frontmatter here');

		// File should remain under the filesystem date key
		expect(calendarStore.dayPaths.get(fsKey)).toContain('/vault/fs-only.md');
	});

	it('falls back to filesystem key when frontmatter created is removed', () => {
		// Setup: file with frontmatter `created` AND a filesystem createdAt
		const ts = 1718409600000; // 2024-06-15
		const fsKey = dayjs(ts).format('YYYY-MM-DD');
		fsStore.setFileTree([
			{ name: 'both.md', path: '/vault/both.md', isDirectory: false, createdAt: ts, children: [] },
		]);
		collectionStore.setPropertyIndex(new Map([
			['/vault/both.md', { properties: new Map([['created', '2025-12-25']]) }],
		]) as any);
		scanFilesForCalendar();
		expect(calendarStore.dayPaths.get('2025-12-25')).toContain('/vault/both.md');

		// Remove the `created` property from frontmatter
		updateCalendarForFile('/vault/both.md', '---\ntitle: No date\n---\nContent');

		// File should fall back to the filesystem date key
		expect(calendarStore.dayPaths.get(fsKey)).toContain('/vault/both.md');
		// And be removed from the old frontmatter key
		const oldPaths = calendarStore.dayPaths.get('2025-12-25') ?? [];
		expect(oldPaths).not.toContain('/vault/both.md');
	});
});

describe('openOrCreatePeriodicNoteForDate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		vaultStore.open('/vault');
		// Override periodic notes with simple formats for test assertions
		settingsStore.setSettings({
			...settingsStore.settings,
			periodicNotes: {
				folder: '',
				daily: { format: 'YYYY-MM-DD', template: '', templatePath: '' },
				weekly: { format: 'YYYY/[W]WW', templatePath: '' },
				monthly: { format: 'YYYY/MM-MMM', templatePath: '' },
				quarterly: { format: 'YYYY/[Q]Q', templatePath: '' },
				yearly: { format: 'YYYY/YYYY', templatePath: '' },
			},
		});
	});

	it('does nothing if no vault is open', async () => {
		vaultStore.close();

		await openOrCreatePeriodicNoteForDate('daily', '2026-03-15');

		expect(openOrCreateNote).not.toHaveBeenCalled();
	});

	it('creates daily note with correct options', async () => {
		await openOrCreatePeriodicNoteForDate('daily', '2026-03-15');

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				filePath: '/vault/2026-03-15.md',
				templatePath: undefined,
				inlineTemplate: '',
				title: '2026-03-15',
				customVariables: expect.objectContaining({ year: '2026', month: '03' }),
			}),
		);
	});

	it('creates weekly note using weekly format', async () => {
		await openOrCreatePeriodicNoteForDate('weekly', '2026-03-09');

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				filePath: '/vault/2026/W11.md',
				inlineTemplate: undefined,
				customVariables: expect.objectContaining({ year: '2026', month: '03' }),
			}),
		);
	});

	it('passes full templatePath when configured', async () => {
		settingsStore.setSettings({
			...settingsStore.settings,
			periodicNotes: {
				...settingsStore.settings.periodicNotes,
				daily: { format: 'YYYY-MM-DD', template: '', templatePath: '_templates/daily.md' },
			},
		});

		await openOrCreatePeriodicNoteForDate('daily', '2026-03-15');

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				templatePath: '/vault/_templates/daily.md',
			}),
		);
	});

	it('only passes inline template for daily type', async () => {
		settingsStore.setSettings({
			...settingsStore.settings,
			periodicNotes: {
				...settingsStore.settings.periodicNotes,
				daily: { format: 'YYYY-MM-DD', template: '# Daily', templatePath: '' },
			},
		});

		await openOrCreatePeriodicNoteForDate('daily', '2026-03-15');
		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({ inlineTemplate: '# Daily' }),
		);

		vi.clearAllMocks();

		await openOrCreatePeriodicNoteForDate('weekly', '2026-03-09');
		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({ inlineTemplate: undefined }),
		);
	});
});

describe('openOrCreateDailyNoteForDate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		vaultStore.open('/vault');
		settingsStore.setSettings({
			...settingsStore.settings,
			periodicNotes: {
				folder: '',
				daily: { format: 'YYYY-MM-DD', template: '', templatePath: '' },
				weekly: { format: 'YYYY/[W]WW', templatePath: '' },
				monthly: { format: 'YYYY/MM-MMM', templatePath: '' },
				quarterly: { format: 'YYYY/[Q]Q', templatePath: '' },
				yearly: { format: 'YYYY/YYYY', templatePath: '' },
			},
		});
	});

	it('delegates to openOrCreatePeriodicNoteForDate with daily type', async () => {
		await openOrCreateDailyNoteForDate('2026-03-15');

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				filePath: '/vault/2026-03-15.md',
				customVariables: expect.objectContaining({ year: '2026', month: '03' }),
			}),
		);
	});
});

describe('openCalendarFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
	});

	// Thin orchestrator: the only effect is delegating to the (mocked)
	// side-effect service, so verifying the forwarded argument is the contract.
	it('delegates to openFileInEditor with the file path', async () => {
		await openCalendarFile('/vault/notes/2026-03-15.md');

		expect(openFileInEditor).toHaveBeenCalledTimes(1);
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/notes/2026-03-15.md');
	});

	it('forwards an empty path unchanged (no validation layer)', async () => {
		await openCalendarFile('');

		expect(openFileInEditor).toHaveBeenCalledWith('');
	});

	it('propagates the exact rejection from openFileInEditor', async () => {
		const failure = new Error('file not found');
		vi.mocked(openFileInEditor).mockRejectedValueOnce(failure);

		await expect(openCalendarFile('/vault/missing.md')).rejects.toBe(failure);
	});
});

describe('resetCalendar', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		fsStore.reset();
		collectionStore.reset();
	});

	it('clears dayPaths and fileDateKeys', () => {
		const ts = 1705276800000;
		fsStore.setFileTree([
			{ name: 'note.md', path: '/vault/note.md', isDirectory: false, createdAt: ts, children: [] },
		]);
		scanFilesForCalendar();
		expect(calendarStore.dayPaths.size).toBeGreaterThan(0);

		resetCalendar();

		expect(calendarStore.dayPaths.size).toBe(0);
	});
});
