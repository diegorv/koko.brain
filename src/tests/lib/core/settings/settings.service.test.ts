// @vitest-environment jsdom
// jsdom needed so applyHeadingTypography can write CSS variables onto
// document.documentElement (the function no-ops without a document).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	exists: vi.fn(),
	copyFile: vi.fn(),
}));

vi.mock('#lib/core/settings/theme.service.js', () => ({
	applyActiveTheme: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

import { readTextFile, writeTextFile, mkdir, exists, copyFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { applyActiveTheme } from '#lib/core/settings/theme.service.js';
import { settingsStore, DEFAULT_SETTINGS } from '#lib/core/settings/settings.store.svelte.js';
import { loadSettings, saveSettings, writeSettingsFile, resetSettings, applyHeadingTypography } from '#lib/core/settings/settings.service.js';
import { FAVORITES_LENS, TODAY_LENS, parseExpandedFolders, parseTypesPick, pickedFolderLens, restoreRailItem } from '#lib/features/rail-shell/lens.logic.js';
import { pickedDayLens } from '#lib/plugins/calendar/day-lens.logic.js';
import { parseRailHidden, parseRailInboxBadge, parseRailOrder } from '#lib/features/rail-shell/rail-items.logic.js';
import { DEFAULT_THEME_NAME, KOKOBRAIN_DEFAULT_THEME, BUILTIN_THEMES, mergeThemeWithDefaults, themeColorsToCssVars } from '#lib/core/settings/theme.logic.js';
import type { Theme } from '#lib/core/settings/theme.types.js';
import { FONT_WEIGHT_MAP } from '#lib/core/settings/heading-typography.logic.js';
import { contrastRatio } from '#lib/utils/color.js';
import { setRemoteBrowser } from '#lib/core/platform/capabilities.js';
import { coreFromColors } from '#lib/core/settings/theme-builder.logic.js';
import {
	buildThemeFromPackage,
	installThemePackage,
	isInstalledTheme,
	packageFromColors,
	uninstallTheme,
	type ThemePackage,
} from '#lib/core/settings/theme-package.logic.js';
import legacyFixture from '../../../fixtures/legacy-builtin-themes.fixture.json';

describe('loadSettings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		settingsStore.reset();
		vi.mocked(copyFile).mockResolvedValue(undefined);
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

	it.each([undefined, null, false, 'true', 'false', 1, {}, []].map((value) => [value]))('does not opt into raw mod messages from stored value %j', async (value) => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ debugModRunMessages: value }));
		await loadSettings('/vault');
		expect(settingsStore.debugModRunMessages).toBe(false);
		expect(JSON.parse(vi.mocked(writeTextFile).mock.calls.at(-1)![1] as string).debugModRunMessages).toBe(false);
	});

	it('round-trips explicit raw message consent and turning it off', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		for (const enabled of [true, false]) {
			settingsStore.setSettings({ ...settingsStore.settings, debugModRunMessages: enabled });
			await saveSettings('/vault');
			const saved = vi.mocked(writeTextFile).mock.calls.at(-1)![1] as string;
			expect(JSON.parse(saved).debugModRunMessages).toBe(enabled);
			settingsStore.reset();
			vi.mocked(readTextFile).mockResolvedValue(saved);
			await loadSettings('/vault');
			expect(settingsStore.debugModRunMessages).toBe(enabled);
		}
	});

	it('ignores a legacy autoMove key: no fallback to the old settings name', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ autoMove: { enabled: true, debounceMs: 500 } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.autoOrganize.enabled).toBe(false);
		expect(settingsStore.autoOrganize.debounceMs).toBe(DEFAULT_SETTINGS.autoOrganize.debounceMs);
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
			JSON.stringify({ editor: { fontSize: 18, typeScaleMigrated: true } }),
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

	it('defaults explicitOrganization to true when absent from the saved file', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ editor: { fontSize: 18 } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.explicitOrganization).toBe(true);
	});

	it('respects a saved explicitOrganization of false', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ explicitOrganization: false }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.explicitOrganization).toBe(false);
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

		expect(settingsStore.remoteServer).toEqual({ enabled: false, port: 4747, tailnetHost: '', ownerLogin: '' });
	});

	it('loads a persisted browser access toggle and port', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ remoteServer: { enabled: true, port: 5123, tailnetHost: 'Mac.ts.net', ownerLogin: 'me@x.com' } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.remoteServer).toEqual({ enabled: true, port: 5123, tailnetHost: 'mac.ts.net', ownerLogin: 'me@x.com' });
	});

	it('does not turn browser access on from a non-boolean value and clamps a bad port', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ remoteServer: { enabled: 'yes', port: 80, tailnetHost: 7, ownerLogin: ['x'] } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.remoteServer).toEqual({ enabled: false, port: 1024, tailnetHost: '', ownerLogin: '' });
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

	it('applies theme even when the default write-back fails after a parse failure', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue('not json');
		vi.mocked(writeTextFile).mockRejectedValue(new Error('write error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await loadSettings('/vault');

		expect(copyFile).toHaveBeenCalledTimes(1);
		expect(settingsStore.settings).toEqual(DEFAULT_SETTINGS);
		expect(applyActiveTheme).toHaveBeenCalled();
		const messages = consoleSpy.mock.calls.map((call) => call.join(' '));
		expect(messages.some((m) => m.includes('Also failed to save default settings'))).toBe(true);
		consoleSpy.mockRestore();
	});

	describe('tasksView', () => {
		/** The settings handed to the load write-back */
		const writeBack = () => JSON.parse(vi.mocked(writeTextFile).mock.calls.at(-1)![1] as string);

		beforeEach(() => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(writeTextFile).mockResolvedValue(undefined);
			vi.mocked(mkdir).mockResolvedValue(undefined);
		});

		it('stays absent when the file has none', async () => {
			vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ debugMode: true }));

			await loadSettings('/vault');

			expect('tasksView' in settingsStore.settings).toBe(false);
			expect(writeTextFile).toHaveBeenCalledTimes(1);
			expect('tasksView' in writeBack()).toBe(false);
		});

		it.each([
			[{ version: 1, sectionTag: '#a', extra: { x: 1 } }],
			[42],
			[null],
		])('passes %j through verbatim, in the store and the write-back', async (value) => {
			vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ tasksView: value }));

			await loadSettings('/vault');

			expect(settingsStore.tasksView).toEqual(value);
			expect(writeTextFile).toHaveBeenCalledTimes(1);
			expect(writeBack().tasksView).toEqual(value);
		});
	});

	describe('broken settings.json', () => {
		const BACKUP_RE = /^\/vault\/\.kokobrain\/settings\.broken-\d{8}-\d{6}\.json$/;
		let consoleSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			vi.useFakeTimers({ toFake: ['Date'] });
			// Local time, so the stamp is the same in every time zone.
			vi.setSystemTime(new Date(2026, 10, 4, 9, 5, 7));
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(writeTextFile).mockResolvedValue(undefined);
			vi.mocked(mkdir).mockResolvedValue(undefined);
			consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		});

		afterEach(() => {
			vi.useRealTimers();
			consoleSpy.mockRestore();
		});

		/** Calls to `writeTextFile` that target settings.json. */
		function settingsWrites() {
			return vi.mocked(writeTextFile).mock.calls.filter(([path]) => path === '/vault/.kokobrain/settings.json');
		}

		it('copies a syntax-error file to a timestamped backup before writing settings.json', async () => {
			vi.mocked(readTextFile).mockResolvedValue('{"periodicNotes": ');

			await loadSettings('/vault');

			expect(copyFile).toHaveBeenCalledTimes(1);
			const [src, dest] = vi.mocked(copyFile).mock.calls[0];
			expect(src).toBe('/vault/.kokobrain/settings.json');
			expect(dest).toMatch(BACKUP_RE);
			expect(dest).toBe('/vault/.kokobrain/settings.broken-20261104-090507.json');
			const copyOrder = vi.mocked(copyFile).mock.invocationCallOrder[0];
			const writeOrders = vi.mocked(writeTextFile).mock.invocationCallOrder;
			expect(writeOrders.length).toBeGreaterThan(0);
			for (const order of writeOrders) expect(order).toBeGreaterThan(copyOrder);
		});

		it('runs on the defaults, writes them back once and names the backup in a toast', async () => {
			vi.mocked(readTextFile).mockResolvedValue('{"periodicNotes": ');

			const outcome = await loadSettings('/vault');

			// The bytes are safe in the backup, so later changes may be written.
			expect(outcome).toBe('defaults');
			expect(settingsStore.settings).toEqual(DEFAULT_SETTINGS);
			const writes = settingsWrites();
			expect(writes).toHaveLength(1);
			expect(JSON.parse(writes[0][1] as string)).toEqual(DEFAULT_SETTINGS);
			expect(toast.error).toHaveBeenCalledTimes(1);
			const message = vi.mocked(toast.error).mock.calls[0][0] as string;
			expect(message).toContain('settings.broken-20261104-090507.json');
			expect(message).toMatch(/reset/i);
			expect(vi.mocked(toast.error).mock.calls[0][1]).toEqual({ duration: Infinity, closeButton: true });
			expect(applyActiveTheme).toHaveBeenCalled();
		});

		it('treats a top-level null as a parse failure', async () => {
			vi.mocked(readTextFile).mockResolvedValue('null');

			await loadSettings('/vault');

			expect(copyFile).toHaveBeenCalledWith('/vault/.kokobrain/settings.json', '/vault/.kokobrain/settings.broken-20261104-090507.json');
			expect(settingsStore.settings).toEqual(DEFAULT_SETTINGS);
			expect(settingsWrites()).toHaveLength(1);
			expect(toast.error).toHaveBeenCalledTimes(1);
		});

		it('treats a top-level array as a parse failure', async () => {
			vi.mocked(readTextFile).mockResolvedValue('[]');

			await loadSettings('/vault');

			expect(copyFile).toHaveBeenCalledTimes(1);
			expect(toast.error).toHaveBeenCalledTimes(1);
		});

		it('leaves settings.json unchanged and says so when the backup fails', async () => {
			vi.mocked(readTextFile).mockResolvedValue('{"periodicNotes": ');
			vi.mocked(copyFile).mockRejectedValue(new Error('copy failed'));

			const outcome = await loadSettings('/vault');

			expect(outcome).toBe('file-protected');
			expect(settingsStore.settings).toEqual(DEFAULT_SETTINGS);
			expect(writeTextFile).not.toHaveBeenCalled();
			expect(toast.error).toHaveBeenCalledTimes(1);
			const message = vi.mocked(toast.error).mock.calls[0][0] as string;
			expect(message).toMatch(/could not back up/i);
			expect(message).toMatch(/left unchanged/i);
			expect(message).toMatch(/changes made until the vault is reopened will not be saved/i);
			expect(vi.mocked(toast.error).mock.calls[0][1]).toEqual({ duration: Infinity, closeButton: true });
			expect(applyActiveTheme).toHaveBeenCalled();
		});
	});

	describe('unreadable settings.json', () => {
		let consoleSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			vi.mocked(writeTextFile).mockResolvedValue(undefined);
			vi.mocked(mkdir).mockResolvedValue(undefined);
			consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		});

		afterEach(() => {
			consoleSpy.mockRestore();
		});

		it('keeps the defaults in memory without writing or backing up when readTextFile rejects', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockRejectedValue(new Error('read error'));

			const outcome = await loadSettings('/vault');

			expect(outcome).toBe('file-protected');
			expect(settingsStore.settings).toEqual(DEFAULT_SETTINGS);
			expect(writeTextFile).not.toHaveBeenCalled();
			expect(copyFile).not.toHaveBeenCalled();
			expect(applyActiveTheme).toHaveBeenCalled();
			expect(toast.error).toHaveBeenCalledTimes(1);
			const message = vi.mocked(toast.error).mock.calls[0][0] as string;
			expect(message).toMatch(/could not read/i);
			expect(message).toMatch(/left unchanged/i);
			expect(message).toMatch(/changes made until the vault is reopened will not be saved/i);
		});

		it('takes the same branch when exists() rejects', async () => {
			vi.mocked(exists).mockRejectedValue(new Error('exists error'));

			await expect(loadSettings('/vault')).resolves.toBe('file-protected');

			expect(settingsStore.settings).toEqual(DEFAULT_SETTINGS);
			expect(readTextFile).not.toHaveBeenCalled();
			expect(writeTextFile).not.toHaveBeenCalled();
			expect(copyFile).not.toHaveBeenCalled();
			expect(applyActiveTheme).toHaveBeenCalled();
			expect(toast.error).toHaveBeenCalledTimes(1);
		});
	});

	it('keeps the parsed settings when the write-back fails after a valid read', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ history: { retentionDays: 365 } }));
		vi.mocked(writeTextFile).mockRejectedValue(new Error('write error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// The file was read, so the session may keep trying to write it.
		await expect(loadSettings('/vault')).resolves.toBe('loaded');

		expect(settingsStore.settings.history.retentionDays).toBe(365);
		// The one write attempt carried the parsed settings, not the defaults.
		expect(writeTextFile).toHaveBeenCalledTimes(1);
		expect(JSON.parse(vi.mocked(writeTextFile).mock.calls[0][1] as string).history.retentionDays).toBe(365);
		expect(copyFile).not.toHaveBeenCalled();
		expect(applyActiveTheme).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('makes no backup and raises no toast for a missing or whitespace-only file', async () => {
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(mkdir).mockResolvedValue(undefined);

		vi.mocked(exists).mockResolvedValue(false);
		await expect(loadSettings('/vault')).resolves.toBe('defaults');
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue('  \n ');
		await expect(loadSettings('/vault')).resolves.toBe('defaults');

		expect(writeTextFile).toHaveBeenCalledTimes(2);
		expect(copyFile).not.toHaveBeenCalled();
		expect(toast.error).not.toHaveBeenCalled();
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

		expect(settingsStore.settings.layout.noteListSize).toBe(3);
		expect(settingsStore.settings.layout.rightSidebarSize).toBe(3);
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

		await expect(loadSettings('/vault')).resolves.toBe('loaded');

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
		expect(settingsStore.settings.layout.railHidden).toEqual([]);
		expect(settingsStore.settings.layout.railOrder).toEqual([]);
		expect(settingsStore.settings.layout.railInboxBadge).toBe(true);
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

	it('round-trips the hidden rail items, their order and the Inbox badge switch through a save and a reload', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		settingsStore.updateLayout({ railHidden: ['archive', 'calendar'], railOrder: ['files', 'types'], railInboxBadge: false });

		await saveSettings('/vault');
		const written = vi.mocked(writeTextFile).mock.calls[0][1];
		settingsStore.reset();
		expect(settingsStore.settings.layout).toMatchObject({ railHidden: [], railOrder: [], railInboxBadge: true });

		vi.mocked(readTextFile).mockResolvedValue(written);
		await loadSettings('/vault');

		expect(parseRailHidden(settingsStore.settings.layout.railHidden)).toEqual(['archive', 'calendar']);
		expect(parseRailOrder(settingsStore.settings.layout.railOrder)).toEqual(['files', 'types']);
		expect(parseRailInboxBadge(settingsStore.settings.layout.railInboxBadge)).toBe(false);
	});

	it('loads hand-edited rail hide, order and badge values as nothing hidden, the default order and the badge on', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ layout: { railHidden: 'archive', railOrder: [3, 'files'], railInboxBadge: 'no' } }));
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await expect(loadSettings('/vault')).resolves.not.toThrow();
		expect(parseRailHidden(settingsStore.settings.layout.railHidden)).toEqual([]);
		expect(parseRailOrder(settingsStore.settings.layout.railOrder)).toEqual(['files']);
		expect(parseRailInboxBadge(settingsStore.settings.layout.railInboxBadge)).toBe(true);
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
			vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ editor: { fontSize: 20, typeScaleMigrated: true } }));
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
		expect(settingsStore.settings.todoist.syncFolder).toBe('Todoist');
		expect(settingsStore.settings.todoist.syncIntervalMinutes).toBe(5);
	});

	it('normalizes a hand-edited todoist sync interval and context on load', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ todoist: { syncIntervalMinutes: 0, syncContext: 'office', syncRootProjectId: 'p1' } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.todoist.syncIntervalMinutes).toBe(1);
		expect(settingsStore.settings.todoist.syncContext).toBe('work');
		expect(settingsStore.settings.todoist.syncRootProjectId).toBe('p1');
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
			JSON.stringify({ editor: { fontSize: 20, typeScaleMigrated: true } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.editor.fontSize).toBe(20);
		expect(settingsStore.settings.editor.headingTypography).toEqual(
			DEFAULT_SETTINGS.editor.headingTypography,
		);
	});

	describe('type scale migration', () => {
		const OLD_H4_TO_H6 = { fontSize: 1.0, lineHeight: 1.6, fontWeight: 'bold', letterSpacing: 0 };

		it('moves a file saved before it to the real body size and the new H4-H6 defaults, once', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({
				editor: {
					fontSize: 18,
					headingTypography: { h4: OLD_H4_TO_H6, h5: OLD_H4_TO_H6, h6: { ...OLD_H4_TO_H6, lineHeight: 2 } },
				},
			}));
			vi.mocked(writeTextFile).mockResolvedValue(undefined);

			await loadSettings('/vault');

			const ht = settingsStore.settings.editor.headingTypography;
			expect(settingsStore.settings.editor.fontSize).toBe(19);
			expect(ht.h4).toEqual(DEFAULT_SETTINGS.editor.headingTypography.h4);
			expect(ht.h5).toEqual(DEFAULT_SETTINGS.editor.headingTypography.h5);
			// A customized level is the user's: left as saved.
			expect(ht.h6).toEqual({ ...OLD_H4_TO_H6, lineHeight: 2 });

			const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
			expect(JSON.parse(written).editor.typeScaleMigrated).toBe(true);

			// The next start reads the written file: nothing grows again.
			vi.mocked(writeTextFile).mockClear();
			vi.mocked(readTextFile).mockResolvedValue(written);
			await loadSettings('/vault');
			expect(settingsStore.settings.editor.fontSize).toBe(19);
			expect(settingsStore.settings.editor.headingTypography.h6).toEqual({ ...OLD_H4_TO_H6, lineHeight: 2 });
		});

		it('saves a fresh vault already migrated, at the default 19', async () => {
			vi.mocked(exists).mockResolvedValue(false);
			vi.mocked(writeTextFile).mockResolvedValue(undefined);
			vi.mocked(mkdir).mockResolvedValue(undefined);

			await loadSettings('/vault');

			const written = JSON.parse(vi.mocked(writeTextFile).mock.calls[0][1] as string);
			expect(written.editor.fontSize).toBe(19);
			expect(written.editor.typeScaleMigrated).toBe(true);
		});
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

	describe('installed catalog themes', () => {
		const pkg: ThemePackage = {
			schemaVersion: 1,
			id: 'ocean-breeze',
			name: 'Ocean Breeze',
			version: '1.0.0',
			author: 'someone',
			palette: { ...coreFromColors(KOKOBRAIN_DEFAULT_THEME.colors), primary: '#1188cc' },
		};

		/** Saves the store with `writeTextFile` captured, then loads that file back. */
		async function saveAndReload(): Promise<void> {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(writeTextFile).mockResolvedValue(undefined);
			await saveSettings('/vault');
			const written = vi.mocked(writeTextFile).mock.calls.at(-1)![1] as string;
			settingsStore.reset();
			vi.mocked(readTextFile).mockResolvedValue(written);
			await loadSettings('/vault');
		}

		it('keeps an installed theme, as its package, across a reload', async () => {
			const result = installThemePackage(settingsStore.appearance, pkg);
			if (!result.ok) throw new Error(result.error);
			settingsStore.updateAppearance({ ...result.appearance, activeTheme: pkg.name });

			await saveAndReload();

			const appearance = settingsStore.settings.appearance;
			expect(appearance.installed).toEqual([pkg]);
			expect(appearance.activeTheme).toBe(pkg.name);
			expect(appearance.themes.filter((t) => t.name === pkg.name)).toEqual([buildThemeFromPackage(pkg)]);
			expect(isInstalledTheme(appearance, pkg.name)).toBe(true);
		});

		it('builds the installed theme from its package, not from the colors saved in the list', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(writeTextFile).mockResolvedValue(undefined);
			const stale = { name: pkg.name, colors: { ui: { primary: '#ff0000' } } };
			vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ appearance: { activeTheme: pkg.name, themes: [stale], installed: [pkg] } }));

			await loadSettings('/vault');

			const theme = settingsStore.settings.appearance.themes.find((t) => t.name === pkg.name)!;
			expect(theme.colors.ui.primary).toBe(buildThemeFromPackage(pkg).colors.ui.primary);
		});

		it('installs an active ex-built-in from its saved colors on the first load, once', async () => {
			const sepia = (legacyFixture as unknown as Theme[]).find((t) => t.name === 'Sepia')!;
			const saved = { activeTheme: 'Sepia', builtinsFromCode: true, themes: [KOKOBRAIN_DEFAULT_THEME, ...(legacyFixture as unknown as Theme[])] };
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(writeTextFile).mockResolvedValue(undefined);
			vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ appearance: saved }));

			await loadSettings('/vault');

			const first = settingsStore.settings.appearance;
			expect(first.activeTheme).toBe('Sepia');
			expect(first.installed?.map((p) => p.id)).toEqual(['sepia']);
			expect(first.themes.map((t) => t.name)).toEqual([DEFAULT_THEME_NAME, 'Sepia', 'Lavender Haze']);
			// `--success` postdates the saved fixture and is derived on load; the retired frontmatter colors are dropped.
			const { '--lp-frontmatter-bg': _bg, '--lp-frontmatter-border': _border, ...savedVars } = themeColorsToCssVars(sepia.colors);
			expect(themeColorsToCssVars(first.themes[1].colors)).toEqual({ ...savedVars, '--success': expect.stringMatching(/^#[0-9a-f]{6}$/i) });

			await saveAndReload();

			const written = JSON.parse(vi.mocked(writeTextFile).mock.calls.at(-1)![1] as string);
			expect(written.appearance.exBuiltinsMigrated).toBe(true);
			expect(settingsStore.settings.appearance).toEqual(first);
		});

		it.each([
			['no settings file', () => vi.mocked(exists).mockResolvedValue(false)],
			['an empty settings file', () => vi.mocked(readTextFile).mockResolvedValue('  ')],
			['an unreadable settings file', () => vi.mocked(readTextFile).mockRejectedValue(new Error('boom'))],
		])('keeps one copy of an ex-built-in installed in a vault that started with %s', async (_label, arrange) => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(writeTextFile).mockResolvedValue(undefined);
			vi.mocked(mkdir).mockResolvedValue(undefined);
			arrange();
			await loadSettings('/vault');

			const sakura = (legacyFixture as unknown as Theme[]).find((t) => t.name === 'Sakura')!;
			const sakuraPkg = { ...packageFromColors('sakura', 'Sakura', mergeThemeWithDefaults(sakura.colors)), version: '1.0.3' };
			const result = installThemePackage(settingsStore.appearance, sakuraPkg);
			if (!result.ok) throw new Error(result.error);
			settingsStore.updateAppearance({ ...result.appearance, activeTheme: 'Sakura' });

			await saveAndReload();

			const appearance = settingsStore.settings.appearance;
			expect(appearance.installed).toEqual([sakuraPkg]);
			expect(appearance.activeTheme).toBe('Sakura');
			expect(appearance.themes.filter((t) => t.name === 'Sakura')).toEqual([buildThemeFromPackage(sakuraPkg)]);
		});

		it('forgets an uninstalled theme across a reload and falls back to the default', async () => {
			const installed = installThemePackage(settingsStore.appearance, pkg);
			if (!installed.ok) throw new Error(installed.error);
			settingsStore.updateAppearance({ ...installed.appearance, activeTheme: pkg.name });
			settingsStore.updateAppearance(uninstallTheme(settingsStore.appearance, pkg.name));

			await saveAndReload();

			const appearance = settingsStore.settings.appearance;
			expect(appearance.installed).toEqual([]);
			expect(appearance.activeTheme).toBe(DEFAULT_THEME_NAME);
			expect(appearance.themes.some((t) => t.name === pkg.name)).toBe(false);
		});
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
			JSON.stringify({ queryjs: { autoRunQueries: 'always' }, editor: { fontSize: 19, typeScaleMigrated: true } }),
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
