import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('$lib/core/settings/theme.service', () => ({
	applyActiveTheme: vi.fn(),
}));

import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { applyActiveTheme } from '$lib/core/settings/theme.service';
import { settingsStore, DEFAULT_SETTINGS } from '$lib/core/settings/settings.store.svelte';
import { loadSettings, saveSettings, resetSettings } from '$lib/core/settings/settings.service';
import { DEFAULT_THEME_NAME, KOKOBRAIN_DEFAULT_THEME } from '$lib/core/settings/theme.logic';

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
			JSON.stringify({ layout: { terminalVisible: true } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.layout.terminalVisible).toBe(true);
		expect(settingsStore.settings.layout.rightSidebarVisible).toBe(DEFAULT_SETTINGS.layout.rightSidebarVisible);
		expect(settingsStore.settings.layout.calendarVisible).toBe(DEFAULT_SETTINGS.layout.calendarVisible);
	});

	it('uses default pane sizes when not present in saved settings', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ layout: { rightSidebarVisible: true } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.layout.leftPaneSize).toBe(25);
		expect(settingsStore.settings.layout.rightSidebarSize).toBe(25);
		expect(settingsStore.settings.layout.terminalPaneSize).toBe(25);
		expect(settingsStore.settings.layout.rightSidebarVisible).toBe(true);
	});

	it('restores saved pane sizes from disk', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({
				layout: {
					leftPaneSize: 30,
					rightSidebarSize: 20,
					terminalPaneSize: 35,
					rightSidebarVisible: true,
				},
			}),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.layout.leftPaneSize).toBe(30);
		expect(settingsStore.settings.layout.rightSidebarSize).toBe(20);
		expect(settingsStore.settings.layout.terminalPaneSize).toBe(35);
	});

	it('merges terminal settings with defaults', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ terminal: { fontSize: 18 } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.terminal.fontSize).toBe(18);
		expect(settingsStore.settings.terminal.fontFamily).toBe(DEFAULT_SETTINGS.terminal.fontFamily);
		expect(settingsStore.settings.terminal.shell).toBe(DEFAULT_SETTINGS.terminal.shell);
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

	it('merges quickNote settings with defaults', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(
			JSON.stringify({ quickNote: { folderFormat: 'YYYY' } }),
		);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await loadSettings('/vault');

		expect(settingsStore.settings.quickNote.folderFormat).toBe('YYYY');
		expect(settingsStore.settings.quickNote.filenameFormat).toBe(DEFAULT_SETTINGS.quickNote.filenameFormat);
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
		// normalizeAppearance should prepend the default theme
		expect(settingsStore.settings.appearance.themes).toHaveLength(2);
		expect(settingsStore.settings.appearance.themes[0].name).toBe(DEFAULT_THEME_NAME);
		expect(settingsStore.settings.appearance.themes[1].name).toBe('Custom');
		// Custom theme colors merged with defaults
		expect(settingsStore.settings.appearance.themes[1].colors.ui.background).toBe('#ff0000');
		expect(settingsStore.settings.appearance.themes[1].colors.ui.foreground).toBe(KOKOBRAIN_DEFAULT_THEME.colors.ui.foreground);
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
