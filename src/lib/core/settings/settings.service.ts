import { toast } from 'svelte-sonner';
import { readTextFile, writeTextFile, mkdir, exists, copyFile } from '@tauri-apps/plugin-fs';
import type { AppSettings } from './settings.types';
import { settingsStore, DEFAULT_SETTINGS } from './settings.store.svelte';
import { loadAppearance } from './theme-package.logic';
import { mergeLayout, migrateTypeScale, normalizeSettings } from './settings.logic';
import { headingTypographyToCssVars } from './heading-typography.logic';
import { debug, error } from '#lib/utils/debug.js';
import { getBuildChannel } from '#lib/utils/app-channel.js';
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
 * Reads settings from disk and merges them with defaults, then persists the
 * result so new default keys are written to disk.
 *
 * A missing or blank file loads the defaults. An unreadable file (`exists` or
 * `readTextFile` throws) loads the defaults in memory only and is never written
 * here. A file that does not parse to a JSON object is copied byte for byte to
 * `settings.broken-<YYYYMMDD-HHmmss>.json` before the defaults overwrite it; if
 * that copy fails, `settings.json` is left as it is. The last two raise a toast.
 */
export async function loadSettings(vaultPath: string): Promise<void> {
	debug('SETTINGS', `loadSettings() called at ${Date.now()}`);
	const filePath = getSettingsPath(vaultPath);
	let content: string | null;
	try {
		content = (await exists(filePath)) ? await readTextFile(filePath) : null;
	} catch (err) {
		error('SETTINGS', 'Failed to read settings:', err);
		useDefaultSettings();
		toast.error(`Could not read ${SETTINGS_DIR}/${SETTINGS_FILE}. Default settings are in use and the file was left unchanged.`);
		applyLoadedSettings();
		return;
	}
	if (content === null || !content.trim()) {
		useDefaultSettings();
		try {
			await saveSettings(vaultPath);
		} catch (err) {
			error('SETTINGS', 'Failed to save default settings:', err);
		}
		applyLoadedSettings();
		return;
	}
	let loaded: AppSettings;
	try {
		loaded = parseSettings(content);
	} catch (err) {
		error('SETTINGS', 'Failed to parse settings:', err);
		await resetBrokenSettingsFile(vaultPath);
		applyLoadedSettings();
		return;
	}
	settingsStore.setSettings(loaded);
	try {
		await saveSettings(vaultPath);
	} catch (err) {
		// The parsed settings stay in the store: a failed write-back is not a reason to drop them.
		error('SETTINGS', 'Failed to write back loaded settings:', err);
	}
	applyLoadedSettings();
}

/**
 * Parses settings.json content and merges it over the defaults.
 * Throws when the content is not JSON, is not a JSON object, or cannot be merged.
 */
function parseSettings(content: string): AppSettings {
	const raw: unknown = JSON.parse(content);
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		throw new Error(`${SETTINGS_FILE} is not a JSON object`);
	}
	const parsed = raw as Partial<AppSettings>;
	const savedEditor = migrateTypeScale(parsed.editor);
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
		layout: mergeLayout(DEFAULT_SETTINGS.layout, parsed.layout),
		folderNotes: {
			...DEFAULT_SETTINGS.folderNotes,
			...parsed.folderNotes,
		},
		editor: {
			...DEFAULT_SETTINGS.editor,
			...savedEditor,
			headingTypography: {
				h1: { ...DEFAULT_SETTINGS.editor.headingTypography.h1, ...(savedEditor?.headingTypography?.h1 ?? {}) },
				h2: { ...DEFAULT_SETTINGS.editor.headingTypography.h2, ...(savedEditor?.headingTypography?.h2 ?? {}) },
				h3: { ...DEFAULT_SETTINGS.editor.headingTypography.h3, ...(savedEditor?.headingTypography?.h3 ?? {}) },
				h4: { ...DEFAULT_SETTINGS.editor.headingTypography.h4, ...(savedEditor?.headingTypography?.h4 ?? {}) },
				h5: { ...DEFAULT_SETTINGS.editor.headingTypography.h5, ...(savedEditor?.headingTypography?.h5 ?? {}) },
				h6: { ...DEFAULT_SETTINGS.editor.headingTypography.h6, ...(savedEditor?.headingTypography?.h6 ?? {}) },
			},
		},
		quickCapture: {
			...DEFAULT_SETTINGS.quickCapture,
			...parsed.quickCapture,
			templates: {
				...DEFAULT_SETTINGS.quickCapture.templates,
				...(parsed.quickCapture?.templates ?? {}),
			},
		},
		oneOnOne: {
			...DEFAULT_SETTINGS.oneOnOne,
			...parsed.oneOnOne,
		},
		templates: {
			...DEFAULT_SETTINGS.templates,
			...parsed.templates,
		},
		appearance: loadAppearance(parsed.appearance ?? {}),
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
		eventCalendar: { ...DEFAULT_SETTINGS.eventCalendar, ...parsed.eventCalendar },
		todoist: {
			...DEFAULT_SETTINGS.todoist,
			...parsed.todoist,
		},
		sentry: {
			enabled: parsed.sentry?.enabled === true,
			dsn: typeof parsed.sentry?.dsn === 'string' ? parsed.sentry.dsn : DEFAULT_SETTINGS.sentry.dsn,
		},
		debugMode: parsed.debugMode ?? DEFAULT_SETTINGS.debugMode,
		debugModeTauri: parsed.debugModeTauri ?? DEFAULT_SETTINGS.debugModeTauri,
		debugLogToFile: parsed.debugLogToFile ?? DEFAULT_SETTINGS.debugLogToFile,
		debugModRunMessages: parsed.debugModRunMessages === true,
		debugTauriLogToFile: parsed.debugTauriLogToFile ?? DEFAULT_SETTINGS.debugTauriLogToFile,
		debugHeartbeat: parsed.debugHeartbeat ?? DEFAULT_SETTINGS.debugHeartbeat,
		livePreviewProfiling: parsed.livePreviewProfiling ?? DEFAULT_SETTINGS.livePreviewProfiling,
		disabledDecorators: {
			...DEFAULT_SETTINGS.disabledDecorators,
			...parsed.disabledDecorators,
		},
		tagColors: {
			...DEFAULT_SETTINGS.tagColors,
			...parsed.tagColors,
		},
		queryjs: {
			...DEFAULT_SETTINGS.queryjs,
			...parsed.queryjs,
		},
		updates: {
			channel: parsed.updates?.channel ?? getBuildChannel(),
			autoCheck: parsed.updates?.autoCheck ?? DEFAULT_SETTINGS.updates.autoCheck,
			lastCheckedAt: parsed.updates?.lastCheckedAt ?? DEFAULT_SETTINGS.updates.lastCheckedAt,
		},
		explicitOrganization: parsed.explicitOrganization ?? DEFAULT_SETTINGS.explicitOrganization,
		showUntypedNotes: parsed.showUntypedNotes ?? DEFAULT_SETTINGS.showUntypedNotes,
		typesBaseFolder: parsed.typesBaseFolder ?? DEFAULT_SETTINGS.typesBaseFolder,
		dockBadgeInboxCount: parsed.dockBadgeInboxCount ?? DEFAULT_SETTINGS.dockBadgeInboxCount,
	};
	return normalizeSettings(merged);
}

/**
 * The broken-file toasts stay until dismissed: they are the only on-screen place
 * the backup is named, and they appear while the vault is still opening.
 */
const BROKEN_FILE_TOAST = { duration: Infinity, closeButton: true };

/**
 * Backs up a settings.json that does not parse, then resets to the defaults.
 * The defaults are written only after the byte copy succeeded.
 */
async function resetBrokenSettingsFile(vaultPath: string): Promise<void> {
	useDefaultSettings();
	const backupName = `settings.broken-${formatBackupStamp(new Date())}.json`;
	try {
		await copyFile(getSettingsPath(vaultPath), `${getDirPath(vaultPath)}/${backupName}`);
	} catch (err) {
		error('SETTINGS', 'Failed to back up broken settings:', err);
		toast.error(`Could not back up ${SETTINGS_DIR}/${SETTINGS_FILE}, which is not a valid settings file. Default settings are in use and ${SETTINGS_FILE} was left unchanged.`, BROKEN_FILE_TOAST);
		return;
	}
	toast.error(`${SETTINGS_DIR}/${SETTINGS_FILE} is not a valid settings file, so the settings were reset to defaults. The old file was saved as ${SETTINGS_DIR}/${backupName}.`, BROKEN_FILE_TOAST);
	try {
		await saveSettings(vaultPath);
	} catch (saveErr) {
		error('SETTINGS', 'Also failed to save default settings:', saveErr);
	}
}

/** Local time as `YYYYMMDD-HHmmss`, the suffix of a broken-settings backup. */
function formatBackupStamp(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/** Puts the defaults in the store, with the update channel of this build. */
function useDefaultSettings(): void {
	const fresh = structuredClone(DEFAULT_SETTINGS);
	fresh.updates.channel = getBuildChannel();
	settingsStore.setSettings(fresh);
}

/** Applies the settings that reach the DOM directly: the active theme and heading typography. */
function applyLoadedSettings(): void {
	applyActiveTheme();
	applyHeadingTypography();
}

/**
 * Writes already-serialized settings JSON to the vault, creating the
 * `.kokobrain` dir if needed. The single write site for settings.
 */
export async function writeSettingsFile(vaultPath: string, content: string): Promise<void> {
	const dirPath = getDirPath(vaultPath);
	const filePath = getSettingsPath(vaultPath);
	try {
		const dirExists = await exists(dirPath);
		if (!dirExists) {
			await mkdir(dirPath);
		}
		await writeTextFile(filePath, content);
	} catch (err) {
		error('SETTINGS', 'Failed to save settings:', err);
		throw err;
	}
}

/**
 * Persists the current settings to disk, creating the `.kokobrain` dir if needed.
 * Normalized on the way out so no store-to-disk path can carry an out-of-range value.
 */
export async function saveSettings(vaultPath: string): Promise<void> {
	debug('SETTINGS', `saveSettings() called at ${Date.now()}`);
	const content = JSON.stringify(normalizeSettings(settingsStore.settings), null, 2);
	await writeSettingsFile(vaultPath, content);
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
