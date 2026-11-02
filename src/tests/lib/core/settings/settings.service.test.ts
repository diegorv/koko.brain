// @vitest-environment jsdom
// jsdom needed so applyHeadingTypography can write CSS variables onto
// document.documentElement (the function no-ops without a document).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('#lib/core/settings/theme.service.js', () => ({
	applyActiveTheme: vi.fn(),
}));

import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { applyActiveTheme } from '#lib/core/settings/theme.service.js';
import { settingsStore, DEFAULT_SETTINGS } from '#lib/core/settings/settings.store.svelte.js';
import { loadSettings, saveSettings, writeSettingsFile, resetSettings, applyHeadingTypography } from '#lib/core/settings/settings.service.js';
import { FAVORITES_LENS, TODAY_LENS, parseExpandedFolders, parseTypesPick, pickedFolderLens, restoreRailItem } from '#lib/features/rail-shell/lens.logic.js';
import { pickedDayLens } from '#lib/plugins/calendar/day-lens.logic.js';
import { DEFAULT_THEME_NAME, KOKOBRAIN_DEFAULT_THEME, BUILTIN_THEMES } from '#lib/core/settings/theme.logic.js';
import { FONT_WEIGHT_MAP } from '#lib/core/settings/heading-typography.logic.js';
import { contrastRatio } from '#lib/utils/color.js';
import { setRemoteBrowser } from '#lib/core/platform/capabilities.js';

describe('loadSettings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		settingsStore.reset();
	});

	it('uses default settings if file does not exist', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(mkdir).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.periodicNotes.folder).toBe(DEFAULT_SETTINGS.periodicNotes.folder);
		expect(settingsStore.settings.editor.fontSize).toBe(DEFAULT_SETTINGS.editor.fontSize);
		expect(settingsStore.settings.layout.rightSidebarVisible).toBe(DEFAULT_SETTINGS.layout.rightSidebarVisible);
		expect(readTextFile).not.toHaveBeenCalled();
		expect(writeTextFile).toHaveBeenCalled();
	});

	it('loads and merges periodic notes settings with defaults', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({
				periodicNotes: {
					folder: '_notes-custom',
					daily: { format: 'YYYY-MM-DD' },
				},
			}),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(readTextFile).toHaveBeenCalledWith('/vault/.kokobrain/settings.json');
		expect(settingsStore.settings.periodicNotes.folder).toBe('_notes-custom');
		expect(settingsStore.settings.periodicNotes.daily.format).toBe('YYYY-MM-DD');
		// Defaults preserved for unset fields
		expect(settingsStore.settings.periodicNotes.daily.template).toBe('');
		expect(settingsStore.settings.periodicNotes.daily.templatePath).toBe(DEFAULT_SETTINGS.periodicNotes.daily.templatePath);
		expect(settingsStore.settings.periodicNotes.weekly.format).toBe(DEFAULT_SETTINGS.periodicNotes.weekly.format);
	});

	it('merges editor settings with defaults', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ editor: { fontSize: 18 } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.editor.fontSize).toBe(18);
		expect(settingsStore.settings.editor.fontFamily).toBe(DEFAULT_SETTINGS.editor.fontFamily);
		expect(settingsStore.settings.editor.lineHeight).toBe(DEFAULT_SETTINGS.editor.lineHeight);
	});

	it('defaults wideNotes to false when absent from the saved file', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ editor: { fontSize: 18 } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.editor.wideNotes).toBe(false);
	});

	it('restores wideNotes from the saved file', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ editor: { contentWidth: 800, wideNotes: true } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.editor.wideNotes).toBe(true);
		expect(settingsStore.editor.contentWidth).toBe(800);
	});

	it('clamps out-of-range values coming from a hand-edited settings.json', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({
				editor: {
					fontSize: 999,
					contentWidth: 50,
					headingTypography: { h1: { fontSize: 99 } },
				},
			}),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.editor.fontSize).toBe(32);
		expect(settingsStore.settings.editor.contentWidth).toBe(400);
		expect(settingsStore.settings.editor.headingTypography.h1.fontSize).toBe(5);
		// The write-back that follows the merge repairs the file on disk too.
		const written = JSON.parse(vi.mocked(writeTextFile).mock.calls[0][1] as string);
		expect(written.editor.fontSize).toBe(32);
		expect(written.editor.contentWidth).toBe(400);
	});

	it('defaults dockBadgeInboxCount to true when absent from the saved file', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ editor: { fontSize: 18 } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.dockBadgeInboxCount).toBe(true);
	});

	it('respects a saved dockBadgeInboxCount of false', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ dockBadgeInboxCount: false }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.dockBadgeInboxCount).toBe(false);
	});

	it('defaults typesBaseFolder to an empty string when absent from the saved file', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ editor: { fontSize: 18 } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.typesBaseFolder).toBe('');
	});

	it('respects a saved typesBaseFolder', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ typesBaseFolder: 'Notes' }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.typesBaseFolder).toBe('Notes');
	});

	it('keeps Sentry explicitly disabled when a saved file has no Sentry configuration', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ editor: { fontSize: 18 } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.sentry).toEqual({ enabled: false, dsn: '' });
	});

	it('loads a valid persisted Sentry opt-in and DSN', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({
			sentry: { enabled: true, dsn: 'https://key@o1.ingest.sentry.io/2' },
		}));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.sentry).toEqual({
			enabled: true,
			dsn: 'https://key@o1.ingest.sentry.io/2',
		});
	});

	it('does not treat a non-boolean saved Sentry opt-in as consent', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({
			sentry: { enabled: 'true', dsn: 'https://key@o1.ingest.sentry.io/2' },
		}));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.sentry).toEqual({
			enabled: false,
			dsn: 'https://key@o1.ingest.sentry.io/2',
		});
	});

	it('keeps browser access off when a saved file has no remoteServer entry', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ editor: { fontSize: 18 } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.remoteServer).toEqual({ enabled: false, port: 4747 });
	});

	it('loads a persisted browser access toggle and port', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ remoteServer: { enabled: true, port: 5123 } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.remoteServer).toEqual({ enabled: true, port: 5123 });
	});

	it('does not turn browser access on from a non-boolean value and clamps a bad port', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ remoteServer: { enabled: 'yes', port: 80 } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.remoteServer).toEqual({ enabled: false, port: 1024 });
	});

	it('merges templates settings with defaults', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ templates: { folder: 'my-templates' } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.templates.folder).toBe('my-templates');
	});

	it('uses defaults on parse error', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue('invalid json');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await loadSettings('/vault');

		expect(settingsStore.settings.periodicNotes.folder).toBe(DEFAULT_SETTINGS.periodicNotes.folder);
		expect(settingsStore.settings.editor.fontSize).toBe(DEFAULT_SETTINGS.editor.fontSize);
		consoleSpy.mockRestore();
	});

	it('uses defaults on read error', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockRejectedValue(new Error('read error'));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await loadSettings('/vault');

		expect(settingsStore.settings.periodicNotes.folder).toBe(DEFAULT_SETTINGS.periodicNotes.folder);
		consoleSpy.mockRestore();
	});

	it('uses defaults when file content is empty', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue('   ');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings).toEqual(DEFAULT_SETTINGS);
		expect(writeTextFile).toHaveBeenCalled();
	});

	it('calls applyActiveTheme after loading', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(mkdir).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(applyActiveTheme).toHaveBeenCalled();
		expect(settingsStore.settings).toEqual(DEFAULT_SETTINGS);
	});

	it('calls applyActiveTheme on parse error', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue('not json');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await loadSettings('/vault');

		expect(applyActiveTheme).toHaveBeenCalled();
		expect(settingsStore.settings).toEqual(DEFAULT_SETTINGS);
		consoleSpy.mockRestore();
	});

	it('applies theme even when saveSettings fails in catch block', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockRejectedValue(new Error('read error'));
		vi.mocked(writeTextFile).mockRejectedValue(new Error('write error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await loadSettings('/vault');

		expect(settingsStore.settings).toEqual(DEFAULT_SETTINGS);
		expect(applyActiveTheme).toHaveBeenCalled();
		// Should log: (1) load error, (2) save internal error, (3) "Also failed" error
		expect(consoleSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
		consoleSpy.mockRestore();
	});

	it('merges layout settings with defaults', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ layout: { rightSidebarVisible: true } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.layout.rightSidebarVisible).toBe(true);
		expect(settingsStore.settings.layout.noteListSize).toBe(DEFAULT_SETTINGS.layout.noteListSize);
	});

	it('uses default pane sizes when not present in saved settings', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ layout: { rightSidebarVisible: true } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.layout.noteListSize).toBe(20);
		expect(settingsStore.settings.layout.rightSidebarSize).toBe(20);
		expect(settingsStore.settings.layout.rightSidebarVisible).toBe(true);
	});

	it('restores saved pane sizes from disk', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({
				layout: {
					noteListSize: 30,
					rightSidebarSize: 28,
					rightSidebarVisible: true,
				},
			}),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.layout.noteListSize).toBe(30);
		expect(settingsStore.settings.layout.rightSidebarSize).toBe(28);
	});

	it('drops the classic shell keys from an old settings file and does not write them back', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({
				layout: {
					shell: 'classic',
					railMigrated: true,
					sidebarMode: 'types',
					leftSidebarVisible: false,
					leftPaneSize: 30,
					middlePanelSize: 25,
					railItem: 'files',
					noteListSize: 30,
				},
				keybindings: { cycleSidebarView: { key: 'l', meta: true, shift: false, alt: true, ctrl: false } },
			}),
		);

		await expect(loadSettings('/vault')).resolves.toBeUndefined();

		const layout = settingsStore.settings.layout;
		expect(layout.railItem).toBe('files');
		expect(layout.noteListSize).toBe(30);
		expect(settingsStore.settings).not.toHaveProperty('keybindings');
		const written = JSON.parse(vi.mocked(writeTextFile).mock.calls[0][1]);
		expect(written).not.toHaveProperty('keybindings');
		for (const key of ['shell', 'railMigrated', 'sidebarMode', 'leftSidebarVisible', 'leftPaneSize', 'middlePanelSize']) {
			expect(layout).not.toHaveProperty(key);
			expect(written.layout).not.toHaveProperty(key);
		}
		expect(written.layout).toMatchObject({ railItem: 'files', noteListSize: 30 });
	});

	it('writes a new install with no classic shell keys', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(mkdir).mockResolvedValue(undefined);

		await loadSettings('/vault');

		const written = JSON.parse(vi.mocked(writeTextFile).mock.calls[0][1]);
		expect(written).not.toHaveProperty('keybindings');
		expect(written.layout).toEqual(DEFAULT_SETTINGS.layout);
		expect(written.layout).not.toHaveProperty('shell');
		expect(written.layout).not.toHaveProperty('sidebarMode');
	});

	it('fills the rail defaults for a saved layout that has none of the rail keys', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ layout: { rightSidebarVisible: true } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.layout.noteListSize).toBe(DEFAULT_SETTINGS.layout.noteListSize);
		expect(settingsStore.settings.layout.railPanelsVisible).toBe(true);
		expect(settingsStore.settings.layout.railItem).toBe('today');
		expect(settingsStore.settings.layout.railTypesLens).toBeNull();
		expect(settingsStore.settings.layout.navigatorSize).toBe(DEFAULT_SETTINGS.layout.navigatorSize);
		expect(settingsStore.settings.layout.railFolder).toBeNull();
		expect(settingsStore.settings.layout.railExpandedFolders).toEqual([]);
		expect(settingsStore.settings.layout.railDay).toBeNull();
	});

	it('loads a saved layout that is not an object as the default layout', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ layout: 'classic' }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.layout).toEqual(DEFAULT_SETTINGS.layout);
	});

	it('round-trips the Calendar navigator day through a save and a reload', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		settingsStore.updateLayout({ railItem: 'calendar', railDay: '2026-10-27' });

		await saveSettings('/vault');
		const written = vi.mocked(writeTextFile).mock.calls[0][1];
		settingsStore.reset();
		expect(settingsStore.settings.layout.railDay).toBeNull();

		vi.mocked(readTextFile).mockResolvedValue(written);
		await loadSettings('/vault');

		expect(settingsStore.settings.layout.railItem).toBe('calendar');
		expect(pickedDayLens(settingsStore.settings.layout.railDay, '2026-11-01')).toEqual({ kind: 'day', target: '2026-10-27' });
	});

	it('loads a hand-edited Calendar day as today', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ layout: { railDay: 'last tuesday' } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await expect(loadSettings('/vault')).resolves.not.toThrow();
		expect(pickedDayLens(settingsStore.settings.layout.railDay, '2026-11-01')).toEqual({ kind: 'day', target: '2026-11-01' });
	});

	it('round-trips the Files navigator pick and its expanded folders through a save and a reload', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		settingsStore.updateLayout({ railItem: 'files', railFolder: '/vault/Work', railExpandedFolders: ['/vault/Work'] });

		await saveSettings('/vault');
		const written = vi.mocked(writeTextFile).mock.calls[0][1];
		settingsStore.reset();
		expect(settingsStore.settings.layout.railFolder).toBeNull();

		vi.mocked(readTextFile).mockResolvedValue(written);
		await loadSettings('/vault');

		expect(settingsStore.settings.layout.railItem).toBe('files');
		expect(pickedFolderLens(settingsStore.settings.layout.railFolder)).toEqual({ kind: 'folder', target: '/vault/Work' });
		expect(parseExpandedFolders(settingsStore.settings.layout.railExpandedFolders)).toEqual(['/vault/Work']);
	});

	it('loads a hand-edited Files pick and expanded list as the vault root and no folders', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ layout: { railFolder: 7, railExpandedFolders: 'Work' } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await expect(loadSettings('/vault')).resolves.not.toThrow();
		expect(pickedFolderLens(settingsStore.settings.layout.railFolder)).toEqual({ kind: 'folder' });
		expect(parseExpandedFolders(settingsStore.settings.layout.railExpandedFolders)).toEqual([]);
	});

	it('round-trips the Types navigator pick and its pane size through a save and a reload', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		settingsStore.updateLayout({ railItem: 'types', railTypesLens: { kind: 'type', target: 'Project' }, navigatorSize: 21 });

		await saveSettings('/vault');
		const written = vi.mocked(writeTextFile).mock.calls[0][1];
		settingsStore.reset();
		expect(settingsStore.settings.layout.railTypesLens).toBeNull();

		vi.mocked(readTextFile).mockResolvedValue(written);
		await loadSettings('/vault');

		expect(settingsStore.settings.layout.railItem).toBe('types');
		expect(parseTypesPick(settingsStore.settings.layout.railTypesLens)).toEqual({ kind: 'type', target: 'Project' });
		expect(settingsStore.settings.layout.navigatorSize).toBe(21);
	});

	it('loads a hand-edited Types pick, which reads as no pick', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ layout: { railTypesLens: 'Project' } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await expect(loadSettings('/vault')).resolves.not.toThrow();
		expect(parseTypesPick(settingsStore.settings.layout.railTypesLens)).toBeNull();
	});

	it('round-trips the saved rail item through a save and a reload', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		settingsStore.updateLayout({ railItem: 'favorites' });

		await saveSettings('/vault');
		const written = vi.mocked(writeTextFile).mock.calls[0][1];
		settingsStore.reset();
		expect(settingsStore.settings.layout.railItem).toBe('today');

		vi.mocked(readTextFile).mockResolvedValue(written);
		await loadSettings('/vault');

		expect(settingsStore.settings.layout.railItem).toBe('favorites');
		expect(restoreRailItem(settingsStore.settings.layout.railItem)).toEqual({ item: 'favorites', lens: FAVORITES_LENS });
	});

	it('loads a saved rail item the rail does not know, and the rail falls back to Today', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ layout: { railItem: 42 } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await expect(loadSettings('/vault')).resolves.not.toThrow();

		expect(restoreRailItem(settingsStore.settings.layout.railItem)).toEqual({ item: 'today', lens: TODAY_LENS });
	});

	it('restores hidden rail panels across a restart', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ layout: { railPanelsVisible: false } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.layout.railPanelsVisible).toBe(false);
	});

	it('restores the saved note list size', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ layout: { noteListSize: 30 } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.layout.noteListSize).toBe(30);
	});

	it('merges history settings with defaults', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ history: { retentionDays: 30 } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.history.retentionDays).toBe(30);
		expect(settingsStore.settings.history.enabled).toBe(DEFAULT_SETTINGS.history.enabled);
	});

	describe('eventCalendar', () => {
		it('fills a missing eventCalendar block with the defaults', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ editor: { fontSize: 20 } }));
			vi.mocked(writeTextFile).mockResolvedValue(undefined);

			await loadSettings('/vault');

			// A non-default value proves the merge path ran, not the catch fallback to DEFAULT_SETTINGS.
			expect(settingsStore.settings.editor.fontSize).toBe(20);
			expect(settingsStore.eventCalendar).toEqual({
				weekStartsOn: 1,
				timeFormat: '24h',
				dayStartHour: 7,
				showWeekends: true,
				showTasks: true,
				defaultView: 'week',
				defaultDurationMinutes: 60,
				defaultColor: 'blue',
				eventTypeName: 'Event',
			});
		});

		it('merges a partial eventCalendar block with the defaults', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue(
				JSON.stringify({ eventCalendar: { timeFormat: '12h', dayStartHour: 9 } }),
			);
			vi.mocked(writeTextFile).mockResolvedValue(undefined);

			await loadSettings('/vault');

			expect(settingsStore.eventCalendar).toEqual({
				...DEFAULT_SETTINGS.eventCalendar,
				timeFormat: '12h',
				dayStartHour: 9,
			});
		});

		it('keeps a full, valid eventCalendar block from disk', async () => {
			const saved = {
				weekStartsOn: 0,
				timeFormat: '12h',
				dayStartHour: 6,
				showWeekends: false,
				showTasks: false,
				defaultView: 'month',
				defaultDurationMinutes: 30,
				defaultColor: 'pink',
				eventTypeName: 'Meeting',
			};
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ eventCalendar: saved }));
			vi.mocked(writeTextFile).mockResolvedValue(undefined);

			await loadSettings('/vault');

			expect(settingsStore.eventCalendar).toEqual(saved);
		});

		it('normalizes invalid eventCalendar values from a hand-edited file and writes them back', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue(
				JSON.stringify({ eventCalendar: { weekStartsOn: 3, dayStartHour: 20, defaultColor: 'red', eventTypeName: 'type' } }),
			);
			vi.mocked(writeTextFile).mockResolvedValue(undefined);

			await loadSettings('/vault');

			expect(settingsStore.eventCalendar.weekStartsOn).toBe(1);
			expect(settingsStore.eventCalendar.dayStartHour).toBe(12);
			expect(settingsStore.eventCalendar.defaultColor).toBe('blue');
			expect(settingsStore.eventCalendar.eventTypeName).toBe('Event');
			const written = JSON.parse(vi.mocked(writeTextFile).mock.calls[0][1] as string);
			expect(written.eventCalendar.dayStartHour).toBe(12);
		});
	});

	it('merges search settings with defaults', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ search: { semanticSearchEnabled: true } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.search.semanticSearchEnabled).toBe(true);
	});

	it('merges tagColors settings with defaults', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ tagColors: { colors: { dev: '#a882ff' } } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.tagColors.colors).toEqual({ dev: '#a882ff' });
	});

	it('uses default empty tagColors when not present in saved settings', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ editor: { fontSize: 20 } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.tagColors).toEqual({ colors: {} });
	});

	it('merges todoist settings with defaults', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ todoist: { apiToken: 'token123' } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.todoist.apiToken).toBe('token123');
	});

	it('merges quickCapture settings with defaults', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ quickCapture: { folderFormat: 'YYYY' } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.quickCapture.folderFormat).toBe('YYYY');
		expect(settingsStore.settings.quickCapture.filenameFormat).toBe(
			DEFAULT_SETTINGS.quickCapture.filenameFormat,
		);
		expect(settingsStore.settings.quickCapture.templates).toEqual(
			DEFAULT_SETTINGS.quickCapture.templates,
		);
	});

	it('merges oneOnOne settings with defaults', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ oneOnOne: { peopleFolder: '_team' } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.oneOnOne.peopleFolder).toBe('_team');
		expect(settingsStore.settings.oneOnOne.folderFormat).toBe(DEFAULT_SETTINGS.oneOnOne.folderFormat);
		// A settings file written before the due threshold existed gets the default.
		expect(settingsStore.settings.oneOnOne.dueAfterDays).toBe(14);
	});

	it('deep-merges heading typography with defaults', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({
				editor: {
					headingTypography: {
						h1: { fontSize: 3.0 },
						h3: { fontWeight: 'semibold', letterSpacing: -0.05 },
					},
				},
			}),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		const ht = settingsStore.settings.editor.headingTypography;
		// h1: fontSize overridden, rest from defaults
		expect(ht.h1.fontSize).toBe(3.0);
		expect(ht.h1.lineHeight).toBe(DEFAULT_SETTINGS.editor.headingTypography.h1.lineHeight);
		expect(ht.h1.fontWeight).toBe(DEFAULT_SETTINGS.editor.headingTypography.h1.fontWeight);
		expect(ht.h1.letterSpacing).toBe(DEFAULT_SETTINGS.editor.headingTypography.h1.letterSpacing);
		// h2: entirely from defaults (not present in saved)
		expect(ht.h2).toEqual(DEFAULT_SETTINGS.editor.headingTypography.h2);
		// h3: partial override
		expect(ht.h3.fontWeight).toBe('semibold');
		expect(ht.h3.letterSpacing).toBe(-0.05);
		expect(ht.h3.fontSize).toBe(DEFAULT_SETTINGS.editor.headingTypography.h3.fontSize);
		// h4-h6: entirely from defaults
		expect(ht.h4).toEqual(DEFAULT_SETTINGS.editor.headingTypography.h4);
		expect(ht.h5).toEqual(DEFAULT_SETTINGS.editor.headingTypography.h5);
		expect(ht.h6).toEqual(DEFAULT_SETTINGS.editor.headingTypography.h6);
	});

	it('uses default heading typography when not present in saved settings', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ editor: { fontSize: 20 } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.editor.fontSize).toBe(20);
		expect(settingsStore.settings.editor.headingTypography).toEqual(
			DEFAULT_SETTINGS.editor.headingTypography,
		);
	});

	describe('updates.channel', () => {
		afterEach(() => {
			// Clean up the global override so other tests see the default
			// (the typeof guard in getBuildChannel falls back to 'stable').
			delete (globalThis as Record<string, unknown>).__APP_CHANNEL__;
		});

		it('defaults updates.channel to "stable" on fresh install (no __APP_CHANNEL__ define)', async () => {
			vi.mocked(exists).mockResolvedValue(false);
			vi.mocked(writeTextFile).mockResolvedValue(undefined);
			vi.mocked(mkdir).mockResolvedValue(undefined);

			await loadSettings('/vault');

			expect(settingsStore.settings.updates.channel).toBe('stable');
		});

		it('defaults updates.channel to "nightly" on a nightly build (fresh install)', async () => {
			(globalThis as Record<string, unknown>).__APP_CHANNEL__ = 'nightly';
			vi.mocked(exists).mockResolvedValue(false);
			vi.mocked(writeTextFile).mockResolvedValue(undefined);
			vi.mocked(mkdir).mockResolvedValue(undefined);

			await loadSettings('/vault');

			expect(settingsStore.settings.updates.channel).toBe('nightly');
		});

		it('respects an explicit channel from a saved settings file', async () => {
			(globalThis as Record<string, unknown>).__APP_CHANNEL__ = 'nightly';
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue(
				JSON.stringify({ updates: { channel: 'stable' } }),
			);
			vi.mocked(writeTextFile).mockResolvedValue(undefined);

			await loadSettings('/vault');

			// User explicitly picked stable on a nightly build — keep it.
			expect(settingsStore.settings.updates.channel).toBe('stable');
		});

		it('falls back to the build channel when saved settings omit the updates block', async () => {
			(globalThis as Record<string, unknown>).__APP_CHANNEL__ = 'nightly';
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue(
				JSON.stringify({ editor: { fontSize: 18 } }),
			);
			vi.mocked(writeTextFile).mockResolvedValue(undefined);

			await loadSettings('/vault');

			// Pre-existing settings file from before the channel feature → use build channel.
			expect(settingsStore.settings.updates.channel).toBe('nightly');
		});

		it('falls back to the build channel on parse error', async () => {
			(globalThis as Record<string, unknown>).__APP_CHANNEL__ = 'nightly';
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue('not json');
			vi.mocked(writeTextFile).mockResolvedValue(undefined);
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			await loadSettings('/vault');

			expect(settingsStore.settings.updates.channel).toBe('nightly');
			consoleSpy.mockRestore();
		});
	});

	it('normalizes appearance settings on load', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({
				appearance: {
					activeTheme: 'Custom',
					themes: [{ name: 'Custom', colors: { ui: { background: '#ff0000' } } }],
				},
			}),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.appearance.activeTheme).toBe('Custom');
		// normalizeAppearance keeps user theme + ensures all built-in themes present
		const themes = settingsStore.settings.appearance.themes;
		expect(themes).toHaveLength(BUILTIN_THEMES.length + 1); // 1 custom + every built-in
		expect(themes[0].name).toBe('Custom');
		// Saved colors are kept; missing ones are derived from the theme and kept readable on it
		expect(themes[0].colors.ui.background).toBe('#ff0000');
		expect(contrastRatio(themes[0].colors.ui.foreground, '#ff0000')!).toBeGreaterThanOrEqual(4.5);
		// All built-in themes appended
		expect(themes.some((t) => t.name === DEFAULT_THEME_NAME)).toBe(true);
	});
});

describe('saveSettings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		settingsStore.reset();
	});

	it('creates .kokobrain dir if it does not exist', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(mkdir).mockResolvedValue(undefined);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await saveSettings('/vault');

		expect(mkdir).toHaveBeenCalledWith('/vault/.kokobrain');
		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/.kokobrain/settings.json',
			JSON.stringify(settingsStore.settings, null, 2),
		);
	});

	it('skips mkdir if dir already exists', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await saveSettings('/vault');

		expect(mkdir).not.toHaveBeenCalled();
		expect(writeTextFile).toHaveBeenCalled();
	});

	it('writes current store state to disk', async () => {
		settingsStore.updateEditor({ fontSize: 20 });
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await saveSettings('/vault');

		const writtenContent = vi.mocked(writeTextFile).mock.calls[0][1];
		const parsed = JSON.parse(writtenContent);
		expect(parsed.editor.fontSize).toBe(20);
	});

	it('logs and re-throws on write error', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockRejectedValue(new Error('write error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(saveSettings('/vault')).rejects.toThrow('write error');

		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('logs and re-throws on exists() error', async () => {
		vi.mocked(exists).mockRejectedValue(new Error('permission denied'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(saveSettings('/vault')).rejects.toThrow('permission denied');

		expect(consoleSpy).toHaveBeenCalled();
		expect(writeTextFile).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});

describe('writeSettingsFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		settingsStore.reset();
	});

	it('writes the content it is given verbatim, not a re-serialized store', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await writeSettingsFile('/vault', '{"handed":"in"}');

		expect(writeTextFile).toHaveBeenCalledWith('/vault/.kokobrain/settings.json', '{"handed":"in"}');
	});

	it('logs and re-throws on write error, so the caller can react', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockRejectedValue(new Error('write error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(writeSettingsFile('/vault', '{}')).rejects.toThrow('write error');

		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});

describe('applyHeadingTypography', () => {
	const HEADING_LEVELS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

	/** Removes every heading CSS var set on the document root. */
	function clearHeadingVars() {
		const el = document.documentElement;
		for (const level of HEADING_LEVELS) {
			el.style.removeProperty(`--heading-${level}-font-size`);
			el.style.removeProperty(`--heading-${level}-line-height`);
			el.style.removeProperty(`--heading-${level}-font-weight`);
			el.style.removeProperty(`--heading-${level}-letter-spacing`);
		}
	}

	beforeEach(() => {
		vi.clearAllMocks();
		settingsStore.reset();
		clearHeadingVars();
	});

	afterEach(() => {
		clearHeadingVars();
	});

	it('applies the default heading typography as CSS variables on the document root', () => {
		applyHeadingTypography();

		const style = document.documentElement.style;
		for (const level of HEADING_LEVELS) {
			const defaults = DEFAULT_SETTINGS.editor.headingTypography[level];
			expect(style.getPropertyValue(`--heading-${level}-font-size`)).toBe(`${defaults.fontSize}em`);
			expect(style.getPropertyValue(`--heading-${level}-line-height`)).toBe(`${defaults.lineHeight}`);
			expect(style.getPropertyValue(`--heading-${level}-font-weight`)).toBe(FONT_WEIGHT_MAP[defaults.fontWeight]);
			expect(style.getPropertyValue(`--heading-${level}-letter-spacing`)).toBe(`${defaults.letterSpacing}em`);
		}
	});

	it('reflects custom typography from the store', () => {
		const typography = structuredClone(DEFAULT_SETTINGS.editor.headingTypography);
		typography.h1 = { fontSize: 3.0, lineHeight: 1.2, fontWeight: 'semibold', letterSpacing: -0.05 };
		settingsStore.updateEditor({ headingTypography: typography });

		applyHeadingTypography();

		const style = document.documentElement.style;
		expect(style.getPropertyValue('--heading-h1-font-size')).toBe('3em');
		expect(style.getPropertyValue('--heading-h1-line-height')).toBe('1.2');
		expect(style.getPropertyValue('--heading-h1-font-weight')).toBe('600');
		expect(style.getPropertyValue('--heading-h1-letter-spacing')).toBe('-0.05em');
		// Untouched levels keep their defaults.
		const h2 = DEFAULT_SETTINGS.editor.headingTypography.h2;
		expect(style.getPropertyValue('--heading-h2-font-size')).toBe(`${h2.fontSize}em`);
	});

	it('loadSettings applies the loaded heading typography to the document root', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ editor: { headingTypography: { h1: { fontSize: 2.5 } } } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		const style = document.documentElement.style;
		expect(style.getPropertyValue('--heading-h1-font-size')).toBe('2.5em');
		// Merged defaults applied for the rest of h1.
		const h1 = DEFAULT_SETTINGS.editor.headingTypography.h1;
		expect(style.getPropertyValue('--heading-h1-line-height')).toBe(`${h1.lineHeight}`);
	});

	it('loadSettings applies default typography vars on the fallback (read error) path', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockRejectedValue(new Error('read error'));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await loadSettings('/vault');

		const h1 = DEFAULT_SETTINGS.editor.headingTypography.h1;
		expect(document.documentElement.style.getPropertyValue('--heading-h1-font-size')).toBe(`${h1.fontSize}em`);
		consoleSpy.mockRestore();
	});
});

describe('resetSettings', () => {
	beforeEach(() => {
		settingsStore.reset();
	});

	it('restores settings to defaults', () => {
		settingsStore.updateEditor({ fontSize: 24 });
		expect(settingsStore.settings.editor.fontSize).toBe(24);

		resetSettings();

		expect(settingsStore.settings.editor.fontSize).toBe(DEFAULT_SETTINGS.editor.fontSize);
		expect(settingsStore.settings.periodicNotes.folder).toBe(DEFAULT_SETTINGS.periodicNotes.folder);
	});
});

describe('loadSettings in the browser served by the Mac', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		settingsStore.reset();
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
	});

	afterEach(() => {
		setRemoteBrowser(false);
	});

	it('keeps the vault settings but runs queryjs blocks only on demand', async () => {
		setRemoteBrowser(true);
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ queryjs: { autoRunQueries: 'always' }, editor: { fontSize: 19 } }),
		);

		await loadSettings('/vault');

		expect(settingsStore.queryjs.autoRunQueries).toBe('manual');
		expect(settingsStore.settings.editor.fontSize).toBe(19);
	});

	it('uses manual for a vault with no settings file too', async () => {
		setRemoteBrowser(true);
		vi.mocked(exists).mockResolvedValue(false);

		await loadSettings('/vault');

		expect(settingsStore.queryjs.autoRunQueries).toBe('manual');
	});

	it('leaves the desktop on the vault value', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ queryjs: { autoRunQueries: 'always' } }));

		await loadSettings('/vault');

		expect(settingsStore.queryjs.autoRunQueries).toBe('always');
	});

	it('uses manual on a read failure as well', async () => {
		setRemoteBrowser(true);
		vi.mocked(exists).mockRejectedValue(new Error('Connection to the Kokobrain desktop app was lost'));

		await loadSettings('/vault');

		expect(settingsStore.queryjs.autoRunQueries).toBe('manual');
	});
});
