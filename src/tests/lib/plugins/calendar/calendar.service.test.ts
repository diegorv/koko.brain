import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Mock only side-effect services
vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
}));

vi.mock('#lib/core/note-creator/note-creator.service.js', () => ({
	openOrCreateNote: vi.fn(),
}));

import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { openOrCreateNote } from '#lib/core/note-creator/note-creator.service.js';
import { calendarStore } from '#lib/plugins/calendar/calendar.store.svelte.js';
import {
	openOrCreatePeriodicNoteForDate,
	resetCalendar,
} from '#lib/plugins/calendar/calendar.service.js';

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

describe('resetCalendar', () => {
	it('shows the current month again', () => {
		calendarStore.showMonth(2000, 0);

		resetCalendar();

		const now = new Date();
		expect(calendarStore.currentYear).toBe(now.getFullYear());
		expect(calendarStore.currentMonth).toBe(now.getMonth());
	});
});
