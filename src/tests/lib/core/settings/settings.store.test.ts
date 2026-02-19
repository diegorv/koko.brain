import { describe, it, expect, beforeEach } from 'vitest';

import { settingsStore, DEFAULT_SETTINGS } from '$lib/core/settings/settings.store.svelte';

describe('settingsStore', () => {
	beforeEach(() => {
		settingsStore.reset();
	});

	it('starts with default settings', () => {
		expect(settingsStore.settings).toEqual(DEFAULT_SETTINGS);
	});

	describe('setSettings', () => {
		it('replaces entire settings object', () => {
			const custom = { ...structuredClone(DEFAULT_SETTINGS), periodicNotes: { ...DEFAULT_SETTINGS.periodicNotes, folder: '_custom' } };
			settingsStore.setSettings(custom);

			expect(settingsStore.periodicNotes.folder).toBe('_custom');
		});
	});

	describe('partial update methods', () => {
		it('updatePeriodicNotes merges with existing', () => {
			settingsStore.updatePeriodicNotes({ folder: '_changed' });
			expect(settingsStore.periodicNotes.folder).toBe('_changed');
			// Existing fields preserved
			expect(settingsStore.periodicNotes.daily).toBeDefined();
		});

		it('updatePeriodicNotes deep-merges nested period objects', () => {
			const originalTemplate = DEFAULT_SETTINGS.periodicNotes.daily.templatePath;
			settingsStore.updatePeriodicNotes({ daily: { format: 'YYYY-MM-DD' } });
			expect(settingsStore.periodicNotes.daily.format).toBe('YYYY-MM-DD');
			// Other daily fields preserved
			expect(settingsStore.periodicNotes.daily.templatePath).toBe(originalTemplate);
			expect(settingsStore.periodicNotes.daily.template).toBe(DEFAULT_SETTINGS.periodicNotes.daily.template);
		});

		it('updatePeriodicNotes preserves other periods when updating one', () => {
			const originalWeekly = { ...DEFAULT_SETTINGS.periodicNotes.weekly };
			settingsStore.updatePeriodicNotes({ daily: { format: 'YYYY' } });
			expect(settingsStore.periodicNotes.weekly).toEqual(originalWeekly);
		});

		it('updateQuickNote merges with existing', () => {
			settingsStore.updateQuickNote({ folderFormat: 'YYYY' });
			expect(settingsStore.quickNote.folderFormat).toBe('YYYY');
			expect(settingsStore.quickNote.filenameFormat).toBe(DEFAULT_SETTINGS.quickNote.filenameFormat);
		});

		it('updateOneOnOne merges with existing', () => {
			settingsStore.updateOneOnOne({ peopleFolder: '_team' });
			expect(settingsStore.oneOnOne.peopleFolder).toBe('_team');
		});

		it('updateLayout merges with existing', () => {
			settingsStore.updateLayout({ terminalVisible: true });
			expect(settingsStore.layout.terminalVisible).toBe(true);
			expect(settingsStore.layout.rightSidebarVisible).toBe(DEFAULT_SETTINGS.layout.rightSidebarVisible);
		});

		it('includes default pane sizes', () => {
			expect(settingsStore.layout.leftPaneSize).toBe(25);
			expect(settingsStore.layout.rightSidebarSize).toBe(25);
			expect(settingsStore.layout.terminalPaneSize).toBe(25);
		});

		it('updateLayout updates leftPaneSize', () => {
			settingsStore.updateLayout({ leftPaneSize: 30 });
			expect(settingsStore.layout.leftPaneSize).toBe(30);
			expect(settingsStore.layout.rightSidebarSize).toBe(DEFAULT_SETTINGS.layout.rightSidebarSize);
			expect(settingsStore.layout.terminalPaneSize).toBe(DEFAULT_SETTINGS.layout.terminalPaneSize);
		});

		it('updateLayout updates rightSidebarSize', () => {
			settingsStore.updateLayout({ rightSidebarSize: 20 });
			expect(settingsStore.layout.rightSidebarSize).toBe(20);
			expect(settingsStore.layout.leftPaneSize).toBe(DEFAULT_SETTINGS.layout.leftPaneSize);
		});

		it('updateLayout updates terminalPaneSize', () => {
			settingsStore.updateLayout({ terminalPaneSize: 35 });
			expect(settingsStore.layout.terminalPaneSize).toBe(35);
		});

		it('updateLayout preserves visibility flags when updating sizes', () => {
			settingsStore.updateLayout({ terminalVisible: true });
			settingsStore.updateLayout({ leftPaneSize: 20 });
			expect(settingsStore.layout.terminalVisible).toBe(true);
			expect(settingsStore.layout.leftPaneSize).toBe(20);
		});

		it('updateLayout preserves sizes when updating visibility', () => {
			settingsStore.updateLayout({ leftPaneSize: 35 });
			settingsStore.updateLayout({ rightSidebarVisible: true });
			expect(settingsStore.layout.leftPaneSize).toBe(35);
			expect(settingsStore.layout.rightSidebarVisible).toBe(true);
		});

		it('updateFolderNotes merges with existing', () => {
			settingsStore.updateFolderNotes({ enabled: false });
			expect(settingsStore.folderNotes.enabled).toBe(false);
		});

		it('updateEditor merges with existing', () => {
			settingsStore.updateEditor({ fontSize: 18 });
			expect(settingsStore.editor.fontSize).toBe(18);
			expect(settingsStore.editor.fontFamily).toBe(DEFAULT_SETTINGS.editor.fontFamily);
			expect(settingsStore.editor.contentWidth).toBe(DEFAULT_SETTINGS.editor.contentWidth);
			expect(settingsStore.editor.paragraphSpacing).toBe(DEFAULT_SETTINGS.editor.paragraphSpacing);
		});

		it('updateEditor merges contentWidth and paragraphSpacing independently', () => {
			settingsStore.updateEditor({ contentWidth: 900 });
			expect(settingsStore.editor.contentWidth).toBe(900);
			expect(settingsStore.editor.paragraphSpacing).toBe(DEFAULT_SETTINGS.editor.paragraphSpacing);

			settingsStore.updateEditor({ paragraphSpacing: 0.5 });
			expect(settingsStore.editor.paragraphSpacing).toBe(0.5);
			expect(settingsStore.editor.contentWidth).toBe(900);
		});

		it('updateTemplates merges with existing', () => {
			settingsStore.updateTemplates({ folder: '_my-templates' });
			expect(settingsStore.templates.folder).toBe('_my-templates');
		});

		it('updateAppearance merges with existing', () => {
			settingsStore.updateAppearance({ activeTheme: 'Custom' } as any);
			expect(settingsStore.appearance.activeTheme).toBe('Custom');
		});

		it('updateTerminal merges with existing', () => {
			settingsStore.updateTerminal({ fontSize: 20 });
			expect(settingsStore.terminal.fontSize).toBe(20);
			expect(settingsStore.terminal.fontFamily).toBe(DEFAULT_SETTINGS.terminal.fontFamily);
		});

		it('updateHistory merges with existing', () => {
			settingsStore.updateHistory({ retentionDays: 30 });
			expect(settingsStore.history.retentionDays).toBe(30);
			expect(settingsStore.history.enabled).toBe(DEFAULT_SETTINGS.history.enabled);
			expect(settingsStore.history.snapshotBackupEnabled).toBe(DEFAULT_SETTINGS.history.snapshotBackupEnabled);
		});

		it('updateSearch merges with existing', () => {
			settingsStore.updateSearch({ semanticSearchEnabled: true });
			expect(settingsStore.search.semanticSearchEnabled).toBe(true);
		});

		it('updateAutoMove merges with existing', () => {
			settingsStore.updateAutoMove({ enabled: true });
			expect(settingsStore.autoMove.enabled).toBe(true);
			expect(settingsStore.autoMove.debounceMs).toBe(DEFAULT_SETTINGS.autoMove.debounceMs);
		});

		it('updateTodoist merges with existing', () => {
			settingsStore.updateTodoist({ apiToken: 'abc123' });
			expect(settingsStore.todoist.apiToken).toBe('abc123');
		});

		it('updateSync merges with existing', () => {
			settingsStore.updateSync({ enabled: true });
			expect(settingsStore.sync.enabled).toBe(true);
			expect(settingsStore.sync.port).toBe(DEFAULT_SETTINGS.sync.port);
			expect(settingsStore.sync.intervalMinutes).toBe(DEFAULT_SETTINGS.sync.intervalMinutes);
		});

		it('updateSync updates port', () => {
			settingsStore.updateSync({ port: 40000 });
			expect(settingsStore.sync.port).toBe(40000);
			expect(settingsStore.sync.enabled).toBe(DEFAULT_SETTINGS.sync.enabled);
		});

		it('updateSync updates intervalMinutes', () => {
			settingsStore.updateSync({ intervalMinutes: 10 });
			expect(settingsStore.sync.intervalMinutes).toBe(10);
		});

		it('updateDebugMode sets the flag', () => {
			expect(settingsStore.debugMode).toBe(false);
			settingsStore.updateDebugMode(true);
			expect(settingsStore.debugMode).toBe(true);
			settingsStore.updateDebugMode(false);
			expect(settingsStore.debugMode).toBe(false);
		});

		it('updateDebugModeTauri sets the flag', () => {
			expect(settingsStore.debugModeTauri).toBe(false);
			settingsStore.updateDebugModeTauri(true);
			expect(settingsStore.debugModeTauri).toBe(true);
			settingsStore.updateDebugModeTauri(false);
			expect(settingsStore.debugModeTauri).toBe(false);
		});

		it('updateDebugLogToFile sets the flag', () => {
			expect(settingsStore.debugLogToFile).toBe(false);
			settingsStore.updateDebugLogToFile(true);
			expect(settingsStore.debugLogToFile).toBe(true);
			settingsStore.updateDebugLogToFile(false);
			expect(settingsStore.debugLogToFile).toBe(false);
		});

		it('updateDebugTauriLogToFile sets the flag', () => {
			expect(settingsStore.debugTauriLogToFile).toBe(false);
			settingsStore.updateDebugTauriLogToFile(true);
			expect(settingsStore.debugTauriLogToFile).toBe(true);
			settingsStore.updateDebugTauriLogToFile(false);
			expect(settingsStore.debugTauriLogToFile).toBe(false);
		});

		it('tagColors starts with empty colors map', () => {
			expect(settingsStore.tagColors).toEqual({ colors: {} });
		});

		it('updateTagColors sets the colors map', () => {
			settingsStore.updateTagColors({ colors: { work: '#fb464c' } });
			expect(settingsStore.tagColors.colors).toEqual({ work: '#fb464c' });
		});

		it('updateTagColors merges with existing tagColors', () => {
			settingsStore.updateTagColors({ colors: { work: '#fb464c' } });
			settingsStore.updateTagColors({ colors: { personal: '#44cf6e' } });
			// Second call replaces colors entirely (shallow merge of TagColorSettings)
			expect(settingsStore.tagColors.colors).toEqual({ personal: '#44cf6e' });
		});
	});

	describe('reset', () => {
		it('restores all settings to defaults', () => {
			settingsStore.updateLayout({ terminalVisible: true });
			settingsStore.updateEditor({ fontSize: 24 });

			settingsStore.reset();

			expect(settingsStore.settings).toEqual(DEFAULT_SETTINGS);
		});
	});
});
