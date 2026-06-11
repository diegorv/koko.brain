import { describe, it, expect, beforeEach } from 'vitest';

import { settingsStore, DEFAULT_SETTINGS } from '$lib/core/settings/settings.store.svelte';

describe('settingsStore', () => {
	beforeEach(() => {
		settingsStore.reset();
	});

	it('starts with default settings', () => {
		expect(settingsStore.settings).toEqual(DEFAULT_SETTINGS);
	});

	describe('dockBadgeInboxCount', () => {
		it('defaults to true', () => {
			expect(settingsStore.dockBadgeInboxCount).toBe(true);
		});

		it('getter reflects setSettings', () => {
			settingsStore.setSettings({ ...structuredClone(DEFAULT_SETTINGS), dockBadgeInboxCount: false });
			expect(settingsStore.dockBadgeInboxCount).toBe(false);
		});
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

		it('quickCapture default templates point at the dedicated per-kind templates', () => {
			expect(settingsStore.quickCapture.templates.note).toBe('_system/templates/quick-capture/Composer-Note.md');
			expect(settingsStore.quickCapture.templates.clip).toBe('_system/templates/quick-capture/Clip-Note.md');
			expect(settingsStore.quickCapture.templates.link).toBe('_system/templates/quick-capture/Link-Note.md');
			expect(settingsStore.quickCapture.templates.shot).toBe('_system/templates/quick-capture/Shot-Note.md');
			expect(settingsStore.quickCapture.templates.file).toBe('_system/templates/quick-capture/File-Note.md');
		});

		it('updateQuickCapture merges folder/filename without touching templates', () => {
			settingsStore.updateQuickCapture({ folderFormat: 'YYYY' });
			expect(settingsStore.quickCapture.folderFormat).toBe('YYYY');
			expect(settingsStore.quickCapture.filenameFormat).toBe(
				DEFAULT_SETTINGS.quickCapture.filenameFormat,
			);
			expect(settingsStore.quickCapture.templates).toEqual(
				DEFAULT_SETTINGS.quickCapture.templates,
			);
		});

		it('updateQuickCapture templates merges by kind without wiping other kinds', () => {
			settingsStore.updateQuickCapture({
				templates: { note: '_system/templates/Custom.md' },
			});
			expect(settingsStore.quickCapture.templates.note).toBe('_system/templates/Custom.md');
			expect(settingsStore.quickCapture.templates.clip).toBe(
				DEFAULT_SETTINGS.quickCapture.templates.clip,
			);
			expect(settingsStore.quickCapture.templates.link).toBe(
				DEFAULT_SETTINGS.quickCapture.templates.link,
			);
		});

		it('updateOneOnOne merges with existing', () => {
			settingsStore.updateOneOnOne({ peopleFolder: '_team' });
			expect(settingsStore.oneOnOne.peopleFolder).toBe('_team');
		});

		it('updateLayout merges with existing', () => {
			settingsStore.updateLayout({ rightSidebarVisible: true });
			expect(settingsStore.layout.rightSidebarVisible).toBe(true);
			expect(settingsStore.layout.leftPaneSize).toBe(DEFAULT_SETTINGS.layout.leftPaneSize);
		});

		it('includes default pane sizes', () => {
			expect(settingsStore.layout.leftPaneSize).toBe(25);
			expect(settingsStore.layout.rightSidebarSize).toBe(25);
		});

		it('updateLayout updates leftPaneSize', () => {
			settingsStore.updateLayout({ leftPaneSize: 30 });
			expect(settingsStore.layout.leftPaneSize).toBe(30);
			expect(settingsStore.layout.rightSidebarSize).toBe(DEFAULT_SETTINGS.layout.rightSidebarSize);
		});

		it('updateLayout updates rightSidebarSize', () => {
			settingsStore.updateLayout({ rightSidebarSize: 20 });
			expect(settingsStore.layout.rightSidebarSize).toBe(20);
			expect(settingsStore.layout.leftPaneSize).toBe(DEFAULT_SETTINGS.layout.leftPaneSize);
		});

		it('updateLayout preserves visibility flags when updating sizes', () => {
			settingsStore.updateLayout({ rightSidebarVisible: true });
			settingsStore.updateLayout({ leftPaneSize: 20 });
			expect(settingsStore.layout.rightSidebarVisible).toBe(true);
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

		it('queryjs defaults to autoRunQueries=first-open', () => {
			expect(settingsStore.queryjs).toEqual({ autoRunQueries: 'first-open' });
		});

		it('updateQueryjs cycles through all 3 policy values', () => {
			settingsStore.updateQueryjs({ autoRunQueries: 'always' });
			expect(settingsStore.queryjs.autoRunQueries).toBe('always');
			settingsStore.updateQueryjs({ autoRunQueries: 'manual' });
			expect(settingsStore.queryjs.autoRunQueries).toBe('manual');
			settingsStore.updateQueryjs({ autoRunQueries: 'first-open' });
			expect(settingsStore.queryjs.autoRunQueries).toBe('first-open');
		});

		it('updates defaults to stable channel with autoCheck off and no last check', () => {
			expect(settingsStore.updates).toEqual({ channel: 'stable', autoCheck: false, lastCheckedAt: null });
		});

		it('updateUpdates switches channel to nightly', () => {
			settingsStore.updateUpdates({ channel: 'nightly' });
			expect(settingsStore.updates.channel).toBe('nightly');
		});

		it('updateUpdates preserves other fields when updating one', () => {
			settingsStore.updateUpdates({ autoCheck: true });
			settingsStore.updateUpdates({ lastCheckedAt: 1700000000000 });
			expect(settingsStore.updates.autoCheck).toBe(true);
			expect(settingsStore.updates.lastCheckedAt).toBe(1700000000000);
			expect(settingsStore.updates.channel).toBe('stable');
		});

		it('updateUpdates switches channel back to stable', () => {
			settingsStore.updateUpdates({ channel: 'nightly' });
			settingsStore.updateUpdates({ channel: 'stable' });
			expect(settingsStore.updates.channel).toBe('stable');
		});

		it('keybindings default the cycle-sidebar shortcut to Cmd+Shift+E', () => {
			expect(settingsStore.keybindings.cycleSidebarView).toEqual({
				key: 'e',
				meta: true,
				shift: true,
				alt: false,
				ctrl: false,
			});
		});

		it('updateKeybindings replaces the cycle-sidebar shortcut', () => {
			settingsStore.updateKeybindings({
				cycleSidebarView: { key: 'l', meta: true, shift: false, alt: true, ctrl: false },
			});
			expect(settingsStore.keybindings.cycleSidebarView).toEqual({
				key: 'l',
				meta: true,
				shift: false,
				alt: true,
				ctrl: false,
			});
		});

	});

	describe('reset', () => {
		it('restores all settings to defaults', () => {
			settingsStore.updateLayout({ rightSidebarVisible: true });
			settingsStore.updateEditor({ fontSize: 24 });

			settingsStore.reset();

			expect(settingsStore.settings).toEqual(DEFAULT_SETTINGS);
		});
	});
});
