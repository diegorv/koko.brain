import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readDir: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('$lib/core/note-creator/note-creator.service', () => ({
	openOrCreateNote: vi.fn(),
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
}));

import dayjs from 'dayjs';
import { readDir, exists } from '@tauri-apps/plugin-fs';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { openOrCreateNote } from '$lib/core/note-creator/note-creator.service';
import { oneOnOneStore } from '$lib/plugins/one-on-one/one-on-one.store.svelte';
import {
	buildOneOnOnePath,
	buildOneOnOneVariables,
} from '$lib/plugins/one-on-one/one-on-one.logic';
import {
	loadPeople,
	createOneOnOneNote,
	openOneOnOnePicker,
	resetOneOnOne,
} from '$lib/plugins/one-on-one/one-on-one.service';

describe('loadPeople', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		oneOnOneStore.reset();
		vaultStore.open('/vault');
		settingsStore.updateOneOnOne({
			peopleFolder: '_people',
			workPeopleFolder: '_people-work',
			folderFormat: 'YYYY/MM-MMM',
			filenameFormat: '[-1on1-]{person}[-]DD-MM-YYYY',
			templatePath: '_templates/One on One.md',
		});
	});

	it('loads work and personal people, work first', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readDir)
			.mockResolvedValueOnce([
				{ name: 'Bob.md', isFile: true, isDirectory: false },
			] as any) // work folder
			.mockResolvedValueOnce([
				{ name: 'Alice.md', isFile: true, isDirectory: false },
			] as any); // personal folder

		await loadPeople();

		expect(oneOnOneStore.people).toHaveLength(2);
		expect(oneOnOneStore.people[0].name).toBe('Bob');
		expect(oneOnOneStore.people[0].context).toBe('work');
		expect(oneOnOneStore.people[1].name).toBe('Alice');
		expect(oneOnOneStore.people[1].context).toBe('personal');
	});

	it('loads only personal people when work folder does not exist', async () => {
		vi.mocked(exists)
			.mockResolvedValueOnce(false) // work folder missing
			.mockResolvedValueOnce(true);  // personal folder exists
		vi.mocked(readDir).mockResolvedValueOnce([
			{ name: 'Alice.md', isFile: true, isDirectory: false },
		] as any);

		await loadPeople();

		expect(oneOnOneStore.people).toHaveLength(1);
		expect(oneOnOneStore.people[0].name).toBe('Alice');
		expect(oneOnOneStore.people[0].context).toBe('personal');
	});

	it('loads only work people when personal folder does not exist', async () => {
		vi.mocked(exists)
			.mockResolvedValueOnce(true)  // work folder exists
			.mockResolvedValueOnce(false); // personal folder missing
		vi.mocked(readDir).mockResolvedValueOnce([
			{ name: 'Bob.md', isFile: true, isDirectory: false },
		] as any);

		await loadPeople();

		expect(oneOnOneStore.people).toHaveLength(1);
		expect(oneOnOneStore.people[0].name).toBe('Bob');
		expect(oneOnOneStore.people[0].context).toBe('work');
	});

	it('sets empty list when both folders do not exist', async () => {
		vi.mocked(exists).mockResolvedValue(false);

		await loadPeople();

		expect(readDir).not.toHaveBeenCalled();
		expect(oneOnOneStore.people).toEqual([]);
	});

	it('sets empty list and logs error on failure', async () => {
		vi.mocked(exists).mockRejectedValue(new Error('access denied'));

		await loadPeople();

		expect(oneOnOneStore.people).toEqual([]);
	});

	it('returns early when vaultPath is null', async () => {
		vaultStore.close();

		await loadPeople();

		expect(exists).not.toHaveBeenCalled();
		expect(vaultStore.path).toBe(null);
	});

	it('sorts each group alphabetically', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readDir)
			.mockResolvedValueOnce([
				{ name: 'Zara.md', isFile: true, isDirectory: false },
				{ name: 'Anna.md', isFile: true, isDirectory: false },
			] as any) // work folder
			.mockResolvedValueOnce([
				{ name: 'Mike.md', isFile: true, isDirectory: false },
				{ name: 'Carlos.md', isFile: true, isDirectory: false },
			] as any); // personal folder

		await loadPeople();

		expect(oneOnOneStore.people).toHaveLength(4);
		expect(oneOnOneStore.people[0].name).toBe('Anna');
		expect(oneOnOneStore.people[1].name).toBe('Zara');
		expect(oneOnOneStore.people[2].name).toBe('Carlos');
		expect(oneOnOneStore.people[3].name).toBe('Mike');
	});
});

describe('createOneOnOneNote', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		oneOnOneStore.reset();
		vaultStore.open('/vault');
		settingsStore.updatePeriodicNotes({ folder: '_notes' });
		settingsStore.updateOneOnOne({
			peopleFolder: '_people',
			workPeopleFolder: '_people-work',
			folderFormat: 'YYYY/MM-MMM',
			filenameFormat: '[-1on1-]{person}[-]DD-MM-YYYY',
			templatePath: '_templates/One on One.md',
		});
		// Freeze time to avoid timing mismatches in date formatting
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-18T10:00:00.000'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('builds path and variables and calls openOrCreateNote', async () => {
		await createOneOnOneNote('Alice');

		const now = dayjs();
		const oneOnOneSettings = settingsStore.oneOnOne;
		const periodicNotes = settingsStore.periodicNotes;

		const expectedPath = buildOneOnOnePath(
			'/vault',
			periodicNotes.folder,
			oneOnOneSettings.folderFormat,
			oneOnOneSettings.filenameFormat,
			'Alice',
			now,
		);
		const expectedVars = buildOneOnOneVariables(now, 'Alice', periodicNotes);
		const expectedTitle = now.format(oneOnOneSettings.filenameFormat.replace('{person}', '[Alice]'));

		expect(openOrCreateNote).toHaveBeenCalledWith({
			filePath: expectedPath,
			templatePath: '/vault/_templates/One on One.md',
			title: expectedTitle,
			customVariables: expectedVars,
		});
	});

	it('returns early when vaultPath is null', async () => {
		vaultStore.close();

		await createOneOnOneNote('Alice');

		expect(openOrCreateNote).not.toHaveBeenCalled();
		expect(vaultStore.path).toBe(null);
	});

	it('propagates error when openOrCreateNote rejects', async () => {
		vi.mocked(openOrCreateNote).mockRejectedValueOnce(new Error('write failed'));

		await expect(createOneOnOneNote('Alice')).rejects.toThrow('write failed');
	});
});

describe('openOneOnOnePicker', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		oneOnOneStore.reset();
		vaultStore.open('/vault');
		settingsStore.updateOneOnOne({ peopleFolder: '_people', workPeopleFolder: '_people-work' });
	});

	it('loads people then opens the dialog', async () => {
		vi.mocked(exists).mockResolvedValue(false);

		expect(oneOnOneStore.isOpen).toBe(false);

		await openOneOnOnePicker();

		// Verify real store state
		expect(oneOnOneStore.people).toEqual([]);
		expect(oneOnOneStore.isOpen).toBe(true);
	});

	it('loads people from folder then opens the dialog', async () => {
		vi.mocked(exists)
			.mockResolvedValueOnce(false) // work folder missing
			.mockResolvedValueOnce(true);  // personal folder exists
		vi.mocked(readDir).mockResolvedValueOnce([
			{ name: 'Charlie.md', isFile: true, isDirectory: false },
		] as any);

		await openOneOnOnePicker();

		expect(oneOnOneStore.people).toHaveLength(1);
		expect(oneOnOneStore.people[0].name).toBe('Charlie');
		expect(oneOnOneStore.isOpen).toBe(true);
	});
});

describe('resetOneOnOne', () => {
	beforeEach(() => {
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		oneOnOneStore.reset();
	});

	it('resets the store to initial state', () => {
		// Set some state first
		oneOnOneStore.setPeople([{ name: 'Alice', path: '/vault/_people/Alice.md', context: 'personal' }]);
		oneOnOneStore.open();
		expect(oneOnOneStore.isOpen).toBe(true);
		expect(oneOnOneStore.people).toHaveLength(1);

		resetOneOnOne();

		expect(oneOnOneStore.isOpen).toBe(false);
		expect(oneOnOneStore.people).toEqual([]);
	});
});
