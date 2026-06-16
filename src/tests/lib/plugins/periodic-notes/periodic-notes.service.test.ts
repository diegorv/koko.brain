import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
	pinTabByPath: vi.fn(),
	unpinTabByPath: vi.fn(),
}));

vi.mock('$lib/core/note-creator/note-creator.service', () => ({
	openOrCreateNote: vi.fn(),
}));

import dayjs from 'dayjs';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { pinTabByPath, unpinTabByPath } from '$lib/core/editor/editor.service';
import { openOrCreateNote } from '$lib/core/note-creator/note-creator.service';
import {
	buildPeriodicNotePath,
	buildPeriodicVariables,
	getFormatForPeriod,
	getTemplatePathForPeriod,
	getDailyInlineTemplate,
	getPeriodicNoteTitle,
} from '$lib/plugins/periodic-notes/periodic-notes.logic';
import {
	openOrCreateDailyNote,
	openOrCreatePeriodicNote,
	openOrCreatePeriodicNoteForDate,
	autoOpenDailyNote,
	refreshDailyNoteIfDateChanged,
	resetPeriodicNotes,
	_getLastAutoOpenedDate,
} from '$lib/plugins/periodic-notes/periodic-notes.service';

describe('openOrCreateDailyNote', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		vaultStore.open('/vault');
		settingsStore.updatePeriodicNotes({
			folder: '',
			daily: {
				format: 'DD-MM-YYYY',
				template: '',
				templatePath: undefined,
			},
			weekly: { format: 'YYYY/[W]WW' },
			monthly: { format: 'YYYY/MM-MMM' },
			quarterly: { format: 'YYYY/[Q]Q' },
		});
	});

	it('does nothing if no vault is open', async () => {
		vaultStore.close();

		await openOrCreateDailyNote();

		expect(openOrCreateNote).not.toHaveBeenCalled();
		expect(vaultStore.path).toBe(null);
	});

	it('calls openOrCreateNote with correct options computed from real logic', async () => {
		await openOrCreateDailyNote();

		const settings = settingsStore.periodicNotes;
		const format = getFormatForPeriod(settings, 'daily');
		const now = dayjs();
		const expectedPath = buildPeriodicNotePath('/vault', '', format, now);
		const expectedTitle = getPeriodicNoteTitle(format, now);
		const expectedVars = buildPeriodicVariables('daily', now, settings);

		expect(openOrCreateNote).toHaveBeenCalledWith({
			filePath: expectedPath,
			templatePath: undefined,
			inlineTemplate: '',
			title: expectedTitle,
			customVariables: expectedVars,
			contextDate: expect.anything(),
		});
	});

	it('passes full templatePath when configured', async () => {
		settingsStore.updatePeriodicNotes({
			daily: { templatePath: '_templates/daily.md' },
		});

		await openOrCreateDailyNote();

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				templatePath: '/vault/_templates/daily.md',
			}),
		);
	});

	it('passes inline template when configured', async () => {
		settingsStore.updatePeriodicNotes({
			daily: { template: '# <% tp.file.title %>' },
		});

		await openOrCreateDailyNote();

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				inlineTemplate: '# <% tp.file.title %>',
			}),
		);
	});

	it('uses custom folder in path building', async () => {
		settingsStore.updatePeriodicNotes({ folder: '_notes' });

		await openOrCreateDailyNote();

		const settings = settingsStore.periodicNotes;
		const format = getFormatForPeriod(settings, 'daily');
		const now = dayjs();
		const expectedPath = buildPeriodicNotePath('/vault', '_notes', format, now);

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				filePath: expectedPath,
			}),
		);
	});

	it('propagates error when openOrCreateNote rejects', async () => {
		vi.mocked(openOrCreateNote).mockRejectedValueOnce(new Error('write failed'));

		await expect(openOrCreateDailyNote()).rejects.toThrow('write failed');
	});
});

describe('openOrCreatePeriodicNote', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		vaultStore.open('/vault');
		settingsStore.updatePeriodicNotes({
			folder: '',
			daily: {
				format: 'DD-MM-YYYY',
				template: '# daily',
				templatePath: undefined,
			},
			weekly: { format: 'YYYY/[W]WW', templatePath: '_templates/Weekly.md' },
			monthly: { format: 'YYYY/MM-MMM' },
			quarterly: { format: 'YYYY/[Q]Q' },
		});
	});

	it('does nothing if no vault is open', async () => {
		vaultStore.close();

		await openOrCreatePeriodicNote('weekly');

		expect(openOrCreateNote).not.toHaveBeenCalled();
		expect(vaultStore.path).toBe(null);
	});

	it('uses weekly format for weekly notes', async () => {
		await openOrCreatePeriodicNote('weekly');

		const settings = settingsStore.periodicNotes;
		const format = getFormatForPeriod(settings, 'weekly');
		const now = dayjs();
		const expectedPath = buildPeriodicNotePath('/vault', '', format, now);

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				filePath: expectedPath,
			}),
		);
	});

	it('passes templatePath for weekly notes', async () => {
		await openOrCreatePeriodicNote('weekly');

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				templatePath: '/vault/_templates/Weekly.md',
			}),
		);
	});

	it('does not pass inline template for non-daily types', async () => {
		await openOrCreatePeriodicNote('weekly');

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				inlineTemplate: undefined,
			}),
		);
	});

	it('passes inline template only for daily type', async () => {
		await openOrCreatePeriodicNote('daily');

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				inlineTemplate: '# daily',
			}),
		);
	});

	it('passes customVariables from buildPeriodicVariables', async () => {
		await openOrCreatePeriodicNote('weekly');

		const settings = settingsStore.periodicNotes;
		const now = dayjs();
		const expectedVars = buildPeriodicVariables('weekly', now, settings);

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				customVariables: expectedVars,
			}),
		);
	});

	it('propagates error when openOrCreateNote rejects', async () => {
		vi.mocked(openOrCreateNote).mockRejectedValueOnce(new Error('disk full'));

		await expect(openOrCreatePeriodicNote('monthly')).rejects.toThrow('disk full');
	});
});

describe('openOrCreatePeriodicNoteForDate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		vaultStore.open('/vault');
		settingsStore.updatePeriodicNotes({
			folder: '_notes',
			daily: {
				format: 'DD-MM-YYYY',
				template: '# daily',
				templatePath: '_templates/Daily.md',
			},
			weekly: { format: 'YYYY/[W]WW', templatePath: '_templates/Weekly.md' },
			monthly: { format: 'YYYY/MM-MMM' },
			quarterly: { format: 'YYYY/[Q]Q' },
		});
	});

	it('does nothing if no vault is open', async () => {
		vaultStore.close();
		const date = dayjs('2026-02-14');

		await openOrCreatePeriodicNoteForDate('daily', date);

		expect(openOrCreateNote).not.toHaveBeenCalled();
		expect(vaultStore.path).toBe(null);
	});

	it('calls openOrCreateNote with the given date for daily notes', async () => {
		const date = dayjs('2026-02-14');
		const settings = settingsStore.periodicNotes;
		const format = getFormatForPeriod(settings, 'daily');
		const expectedPath = buildPeriodicNotePath('/vault', '_notes', format, date);
		const expectedTitle = getPeriodicNoteTitle(format, date);
		const expectedVars = buildPeriodicVariables('daily', date, settings);

		await openOrCreatePeriodicNoteForDate('daily', date);

		expect(openOrCreateNote).toHaveBeenCalledWith({
			filePath: expectedPath,
			templatePath: '/vault/_templates/Daily.md',
			inlineTemplate: '# daily',
			title: expectedTitle,
			customVariables: expectedVars,
			contextDate: date,
		});
	});

	it('passes the target date as contextDate so tp.date.now() resolves to it', async () => {
		const date = dayjs('2026-02-14');

		await openOrCreatePeriodicNoteForDate('daily', date);

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({ contextDate: date }),
		);
	});

	it('calls openOrCreateNote for weekly notes without inline template', async () => {
		const date = dayjs('2026-02-09');
		const settings = settingsStore.periodicNotes;
		const format = getFormatForPeriod(settings, 'weekly');
		const expectedPath = buildPeriodicNotePath('/vault', '_notes', format, date);

		await openOrCreatePeriodicNoteForDate('weekly', date);

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				filePath: expectedPath,
				templatePath: '/vault/_templates/Weekly.md',
				inlineTemplate: undefined,
			}),
		);
	});

	it('propagates error when openOrCreateNote rejects', async () => {
		const date = dayjs('2026-02-14');
		vi.mocked(openOrCreateNote).mockRejectedValueOnce(new Error('permission denied'));

		await expect(openOrCreatePeriodicNoteForDate('daily', date)).rejects.toThrow('permission denied');
	});
});

describe('autoOpenDailyNote', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		vaultStore.open('/vault');
		settingsStore.updatePeriodicNotes({
			folder: '',
			daily: {
				format: 'DD-MM-YYYY',
				template: '',
				templatePath: undefined,
				autoOpen: false,
				autoPin: false,
			},
			weekly: { format: 'YYYY/[W]WW' },
			monthly: { format: 'YYYY/MM-MMM' },
			quarterly: { format: 'YYYY/[Q]Q' },
		});
	});

	it('does nothing when autoOpen is false', async () => {
		await autoOpenDailyNote();

		expect(openOrCreateNote).not.toHaveBeenCalled();
		expect(settingsStore.periodicNotes.daily.autoOpen).toBe(false);
	});

	it('does nothing when autoOpen is undefined', async () => {
		settingsStore.updatePeriodicNotes({
			daily: { autoOpen: undefined },
		});

		await autoOpenDailyNote();

		expect(openOrCreateNote).not.toHaveBeenCalled();
	});

	it('opens daily note when autoOpen is true', async () => {
		settingsStore.updatePeriodicNotes({
			daily: { autoOpen: true },
		});

		await autoOpenDailyNote();

		expect(openOrCreateNote).toHaveBeenCalled();
		// Verify it was called with the correct filePath based on real logic
		const settings = settingsStore.periodicNotes;
		const format = getFormatForPeriod(settings, 'daily');
		const now = dayjs();
		const expectedPath = buildPeriodicNotePath('/vault', '', format, now);
		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				filePath: expectedPath,
			}),
		);
	});

	it('pins daily note tab when autoPin is true', async () => {
		settingsStore.updatePeriodicNotes({
			daily: { autoOpen: true, autoPin: true },
		});

		await autoOpenDailyNote();

		const settings = settingsStore.periodicNotes;
		const format = getFormatForPeriod(settings, 'daily');
		const now = dayjs();
		const expectedPath = buildPeriodicNotePath('/vault', '', format, now);

		expect(openOrCreateNote).toHaveBeenCalled();
		expect(pinTabByPath).toHaveBeenCalledWith(expectedPath);
	});

	it('does not pin when autoOpen is true but autoPin is false', async () => {
		settingsStore.updatePeriodicNotes({
			daily: { autoOpen: true, autoPin: false },
		});

		await autoOpenDailyNote();

		expect(openOrCreateNote).toHaveBeenCalled();
		expect(pinTabByPath).not.toHaveBeenCalled();
	});

	it('does nothing when no vault is open', async () => {
		settingsStore.updatePeriodicNotes({
			daily: { autoOpen: true },
		});
		vaultStore.close();

		await autoOpenDailyNote();

		expect(openOrCreateNote).not.toHaveBeenCalled();
		expect(vaultStore.path).toBe(null);
	});

	it('propagates error when openOrCreatePeriodicNoteForDate rejects', async () => {
		settingsStore.updatePeriodicNotes({
			daily: { autoOpen: true },
		});
		vi.mocked(openOrCreateNote).mockRejectedValueOnce(new Error('auto-open failed'));

		await expect(autoOpenDailyNote()).rejects.toThrow('auto-open failed');
	});

	it('sets lastAutoOpenedDate after opening daily note', async () => {
		settingsStore.updatePeriodicNotes({
			daily: { autoOpen: true },
		});

		await autoOpenDailyNote();

		expect(_getLastAutoOpenedDate()).toBe(dayjs().format('YYYY-MM-DD'));
	});
});

describe('refreshDailyNoteIfDateChanged', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		resetPeriodicNotes();
		vaultStore.open('/vault');
		settingsStore.updatePeriodicNotes({
			folder: '',
			daily: {
				format: 'DD-MM-YYYY',
				template: '',
				templatePath: undefined,
				autoOpen: true,
				autoPin: true,
			},
			weekly: { format: 'YYYY/[W]WW' },
			monthly: { format: 'YYYY/MM-MMM' },
			quarterly: { format: 'YYYY/[Q]Q' },
		});
	});

	it('does nothing when autoOpen is false', async () => {
		settingsStore.updatePeriodicNotes({
			daily: { autoOpen: false },
		});

		await refreshDailyNoteIfDateChanged();

		expect(openOrCreateNote).not.toHaveBeenCalled();
	});

	it('does nothing when no vault is open', async () => {
		vaultStore.close();

		await refreshDailyNoteIfDateChanged();

		expect(openOrCreateNote).not.toHaveBeenCalled();
	});

	it('does nothing when lastAutoOpenedDate is null (auto-open never ran)', async () => {
		await refreshDailyNoteIfDateChanged();

		expect(openOrCreateNote).not.toHaveBeenCalled();
	});

	it('does nothing when date has not changed', async () => {
		// First, trigger autoOpenDailyNote to set lastAutoOpenedDate to today
		await autoOpenDailyNote();
		vi.mocked(openOrCreateNote).mockClear();

		await refreshDailyNoteIfDateChanged();

		expect(openOrCreateNote).not.toHaveBeenCalled();
	});

	it('opens today\'s note when date has changed', async () => {
		// Simulate: autoOpen ran yesterday
		await autoOpenDailyNote();
		vi.mocked(openOrCreateNote).mockClear();
		vi.mocked(pinTabByPath).mockClear();

		// Advance date by 1 day using fake timers
		const now = new Date();
		const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0, 0);
		vi.useFakeTimers({ now: tomorrowDate });

		await refreshDailyNoteIfDateChanged();

		expect(openOrCreateNote).toHaveBeenCalled();
		const tomorrowDayjs = dayjs(tomorrowDate);
		const settings = settingsStore.periodicNotes;
		const format = getFormatForPeriod(settings, 'daily');
		const expectedPath = buildPeriodicNotePath('/vault', '', format, tomorrowDayjs);
		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				filePath: expectedPath,
			}),
		);

		vi.useRealTimers();
	});

	it('unpins yesterday\'s note when autoPin is true and date changed', async () => {
		await autoOpenDailyNote();
		vi.mocked(unpinTabByPath).mockClear();

		const now = new Date();
		const todayPath = buildPeriodicNotePath(
			'/vault', '',
			getFormatForPeriod(settingsStore.periodicNotes, 'daily'),
			dayjs(),
		);

		const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0, 0);
		vi.useFakeTimers({ now: tomorrowDate });

		await refreshDailyNoteIfDateChanged();

		expect(unpinTabByPath).toHaveBeenCalledWith(todayPath);

		vi.useRealTimers();
	});

	it('does not unpin when autoPin is false', async () => {
		settingsStore.updatePeriodicNotes({
			daily: { autoPin: false },
		});

		await autoOpenDailyNote();
		vi.mocked(unpinTabByPath).mockClear();

		const now = new Date();
		const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0, 0);
		vi.useFakeTimers({ now: tomorrowDate });

		await refreshDailyNoteIfDateChanged();

		expect(unpinTabByPath).not.toHaveBeenCalled();
		expect(pinTabByPath).not.toHaveBeenCalled();

		vi.useRealTimers();
	});

	it('pins today\'s note when autoPin is true and date changed', async () => {
		await autoOpenDailyNote();
		vi.mocked(pinTabByPath).mockClear();

		const now = new Date();
		const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0, 0);
		vi.useFakeTimers({ now: tomorrowDate });

		await refreshDailyNoteIfDateChanged();

		const tomorrowDayjs = dayjs(tomorrowDate);
		const expectedPath = buildPeriodicNotePath(
			'/vault', '',
			getFormatForPeriod(settingsStore.periodicNotes, 'daily'),
			tomorrowDayjs,
		);
		expect(pinTabByPath).toHaveBeenCalledWith(expectedPath);

		vi.useRealTimers();
	});

	it('updates lastAutoOpenedDate after refresh', async () => {
		await autoOpenDailyNote();
		const beforeDate = _getLastAutoOpenedDate();

		const now = new Date();
		const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0, 0);
		vi.useFakeTimers({ now: tomorrowDate });

		await refreshDailyNoteIfDateChanged();

		const afterDate = _getLastAutoOpenedDate();
		expect(afterDate).not.toBe(beforeDate);
		expect(afterDate).toBe(dayjs(tomorrowDate).format('YYYY-MM-DD'));

		vi.useRealTimers();
	});
});

describe('resetPeriodicNotes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		resetPeriodicNotes();
		vaultStore.open('/vault');
		settingsStore.updatePeriodicNotes({
			folder: '',
			daily: {
				format: 'DD-MM-YYYY',
				template: '',
				templatePath: undefined,
				autoOpen: true,
				autoPin: false,
			},
			weekly: { format: 'YYYY/[W]WW' },
			monthly: { format: 'YYYY/MM-MMM' },
			quarterly: { format: 'YYYY/[Q]Q' },
		});
	});

	it('clears lastAutoOpenedDate', async () => {
		await autoOpenDailyNote();
		expect(_getLastAutoOpenedDate()).not.toBeNull();

		resetPeriodicNotes();

		expect(_getLastAutoOpenedDate()).toBeNull();
	});
});
