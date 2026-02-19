import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import type { AppSettings } from './settings.types';
import { settingsStore, DEFAULT_SETTINGS } from './settings.store.svelte';
import { normalizeAppearance } from './theme.logic';
import { headingTypographyToCssVars } from './heading-typography.logic';
import { debug, error } from '$lib/utils/debug';
import { applyActiveTheme } from './theme.service';

/** Internal directory inside the vault that stores app metadata */
const SETTINGS_DIR = '.kokobrain';
const SETTINGS_FILE = 'settings.json';

/** Resolves the full path to the settings JSON file */
function getSettingsPath(vaultPath: string): string {
	return `${vaultPath}/${SETTINGS_DIR}/${SETTINGS_FILE}`;
}

/** Resolves the full path to the internal metadata directory */
function getDirPath(vaultPath: string): string {
	return `${vaultPath}/${SETTINGS_DIR}`;
}

/**
 * Reads settings from disk and merges them with defaults.
 * If the file doesn't exist or fails to parse, falls back to DEFAULT_SETTINGS.
 * After merging, persists the result so new default keys are written to disk.
 */
export async function loadSettings(vaultPath: string): Promise<void> {
	debug('SETTINGS', `loadSettings() called at ${Date.now()}`);
	const filePath = getSettingsPath(vaultPath);
	try {
		const fileExists = await exists(filePath);
		if (!fileExists) {
			settingsStore.setSettings(structuredClone(DEFAULT_SETTINGS));
			await saveSettings(vaultPath);
			applyActiveTheme();
			applyHeadingTypography();
			return;
		}
		const content = await readTextFile(filePath);
		if (!content.trim()) {
			settingsStore.setSettings(structuredClone(DEFAULT_SETTINGS));
			await saveSettings(vaultPath);
			applyActiveTheme();
			applyHeadingTypography();
			return;
		}
		const parsed = JSON.parse(content) as Partial<AppSettings>;
		const merged: AppSettings = {
			periodicNotes: {
				folder: parsed.periodicNotes?.folder ?? DEFAULT_SETTINGS.periodicNotes.folder,
				daily: {
					...DEFAULT_SETTINGS.periodicNotes.daily,
					...parsed.periodicNotes?.daily,
				},
				weekly: {
					...DEFAULT_SETTINGS.periodicNotes.weekly,
					...parsed.periodicNotes?.weekly,
				},
				monthly: {
					...DEFAULT_SETTINGS.periodicNotes.monthly,
					...parsed.periodicNotes?.monthly,
				},
				quarterly: {
					...DEFAULT_SETTINGS.periodicNotes.quarterly,
					...parsed.periodicNotes?.quarterly,
				},
				yearly: {
					...DEFAULT_SETTINGS.periodicNotes.yearly,
					...parsed.periodicNotes?.yearly,
				},
			},
			layout: {
				...DEFAULT_SETTINGS.layout,
				...parsed.layout,
			},
			folderNotes: {
				...DEFAULT_SETTINGS.folderNotes,
				...parsed.folderNotes,
			},
			editor: {
				...DEFAULT_SETTINGS.editor,
				...parsed.editor,
				headingTypography: {
					h1: { ...DEFAULT_SETTINGS.editor.headingTypography.h1, ...(parsed.editor?.headingTypography?.h1 ?? {}) },
					h2: { ...DEFAULT_SETTINGS.editor.headingTypography.h2, ...(parsed.editor?.headingTypography?.h2 ?? {}) },
					h3: { ...DEFAULT_SETTINGS.editor.headingTypography.h3, ...(parsed.editor?.headingTypography?.h3 ?? {}) },
					h4: { ...DEFAULT_SETTINGS.editor.headingTypography.h4, ...(parsed.editor?.headingTypography?.h4 ?? {}) },
					h5: { ...DEFAULT_SETTINGS.editor.headingTypography.h5, ...(parsed.editor?.headingTypography?.h5 ?? {}) },
					h6: { ...DEFAULT_SETTINGS.editor.headingTypography.h6, ...(parsed.editor?.headingTypography?.h6 ?? {}) },
				},
			},
			quickNote: {
				...DEFAULT_SETTINGS.quickNote,
				...parsed.quickNote,
			},
			oneOnOne: {
				...DEFAULT_SETTINGS.oneOnOne,
				...parsed.oneOnOne,
			},
			templates: {
				...DEFAULT_SETTINGS.templates,
				...parsed.templates,
			},
			appearance: normalizeAppearance(parsed.appearance ?? {}),
			terminal: {
				...DEFAULT_SETTINGS.terminal,
				...parsed.terminal,
			},
			history: {
				...DEFAULT_SETTINGS.history,
				...parsed.history,
			},
			search: {
				...DEFAULT_SETTINGS.search,
				...parsed.search,
			},
			autoMove: {
				...DEFAULT_SETTINGS.autoMove,
				...parsed.autoMove,
			},
			todoist: {
				...DEFAULT_SETTINGS.todoist,
				...parsed.todoist,
			},
			sync: {
				...DEFAULT_SETTINGS.sync,
				...parsed.sync,
			},
			debugMode: parsed.debugMode ?? DEFAULT_SETTINGS.debugMode,
			debugModeTauri: parsed.debugModeTauri ?? DEFAULT_SETTINGS.debugModeTauri,
			debugLogToFile: parsed.debugLogToFile ?? DEFAULT_SETTINGS.debugLogToFile,
			debugTauriLogToFile: parsed.debugTauriLogToFile ?? DEFAULT_SETTINGS.debugTauriLogToFile,
			tagColors: {
				...DEFAULT_SETTINGS.tagColors,
				...parsed.tagColors,
			},
		};
		settingsStore.setSettings(merged);
		await saveSettings(vaultPath);
		applyActiveTheme();
		applyHeadingTypography();
	} catch (err) {
		error('SETTINGS', 'Failed to load settings:', err);
		settingsStore.setSettings(structuredClone(DEFAULT_SETTINGS));
		try {
			await saveSettings(vaultPath);
		} catch (saveErr) {
			error('SETTINGS', 'Also failed to save default settings:', saveErr);
		}
		applyActiveTheme();
		applyHeadingTypography();
	}
}

/** Persists the current settings to disk, creating the `.kokobrain` dir if needed */
export async function saveSettings(vaultPath: string): Promise<void> {
	debug('SETTINGS', `saveSettings() called at ${Date.now()}`);
	const dirPath = getDirPath(vaultPath);
	const filePath = getSettingsPath(vaultPath);
	try {
		const dirExists = await exists(dirPath);
		if (!dirExists) {
			await mkdir(dirPath);
		}
		const content = JSON.stringify(settingsStore.settings, null, 2);
		await writeTextFile(filePath, content);
	} catch (err) {
		error('SETTINGS', 'Failed to save settings:', err);
		throw err;
	}
}

/** Applies heading typography CSS variables to the document root */
export function applyHeadingTypography(): void {
	if (typeof document === 'undefined') return;
	const vars = headingTypographyToCssVars(settingsStore.editor.headingTypography);
	const el = document.documentElement;
	for (const [name, value] of Object.entries(vars)) {
		el.style.setProperty(name, value);
	}
}

/** Restores settings to their defaults (does not write to disk) */
export function resetSettings() {
	settingsStore.reset();
}
