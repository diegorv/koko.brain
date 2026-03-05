import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('$lib/core/note-creator/note-creator.service', () => ({
	openOrCreateNote: vi.fn(),
}));

import dayjs from 'dayjs';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { openOrCreateNote } from '$lib/core/note-creator/note-creator.service';
import {
	buildQuickNotePath,
	getQuickNoteTitle,
	buildQuickNoteVariables,
} from '$lib/plugins/quick-note/quick-note.logic';
import { createQuickNote } from '$lib/plugins/quick-note/quick-note.service';

describe('createQuickNote', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		vaultStore.open('/vault');
		settingsStore.updatePeriodicNotes({ folder: '_notes' });
		settingsStore.updateQuickNote({
			folderFormat: 'YYYY/MM-MMM',
			filenameFormat: '[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS',
			templatePath: '_templates/Quick Note.md',
		});
		// Freeze time so millisecond-precision formats match between service and test
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-18T10:00:00.000'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('builds path, title, variables and calls openOrCreateNote', async () => {
		await createQuickNote();

		const now = dayjs();
		const quickNote = settingsStore.quickNote;
		const periodicNotes = settingsStore.periodicNotes;

		const expectedPath = buildQuickNotePath(
			'/vault',
			periodicNotes.folder,
			quickNote.folderFormat,
			quickNote.filenameFormat,
			now,
		);
		const expectedTitle = getQuickNoteTitle(quickNote.filenameFormat, now);
		const expectedVars = buildQuickNoteVariables(now, periodicNotes);

		expect(openOrCreateNote).toHaveBeenCalledWith({
			filePath: expectedPath,
			title: expectedTitle,
			templatePath: '/vault/_templates/Quick Note.md',
			customVariables: expectedVars,
		});
	});

	it('returns early when vaultPath is null', async () => {
		vaultStore.close();

		await createQuickNote();

		expect(openOrCreateNote).not.toHaveBeenCalled();
		expect(vaultStore.path).toBe(null);
	});

	it('omits templatePath when setting is empty', async () => {
		settingsStore.updateQuickNote({ templatePath: '' });

		await createQuickNote();

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({ templatePath: undefined }),
		);
	});

	it('propagates error when openOrCreateNote rejects', async () => {
		vi.mocked(openOrCreateNote).mockRejectedValueOnce(new Error('write failed'));

		await expect(createQuickNote()).rejects.toThrow('write failed');
	});
});
