import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { addAfterSaveObserver } from '$lib/core/editor/editor.hooks';
import { moveItem } from '$lib/core/filesystem/fs.service';
import { setIconForPath } from '$lib/features/file-icons/file-icons.service';
import { buildNoteRecord } from '$lib/features/collection/collection.logic';
import { autoMoveStore } from './auto-move.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { findMatchingRule, isInExcludedFolder, isAlreadyInDestination } from './auto-move.logic';
import type { AutoMoveConfig } from './auto-move.types';
import { debug, error } from '$lib/utils/debug';

/** Internal directory inside the vault for metadata */
const SETTINGS_DIR = '.kokobrain';
const CONFIG_FILE = 'auto-move-rules.json';

/** Per-file debounce timers for auto-move evaluation */
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Current unsubscribe function for the after-save hook (null if not registered) */
let currentUnsubscribe: (() => void) | null = null;

/** Default empty config */
const DEFAULT_CONFIG: AutoMoveConfig = {
	rules: [],
	excludedFolders: [],
};

/** Resolves the full path to the auto-move config file */
function getConfigPath(vaultPath: string): string {
	return `${vaultPath}/${SETTINGS_DIR}/${CONFIG_FILE}`;
}

/**
 * Loads auto-move config from .kokobrain/auto-move-rules.json.
 * If the file doesn't exist, initializes with empty defaults.
 */
export async function loadAutoMoveConfig(vaultPath: string): Promise<void> {
	const filePath = getConfigPath(vaultPath);
	try {
		const fileExists = await exists(filePath);
		if (!fileExists) {
			autoMoveStore.setConfig({ ...DEFAULT_CONFIG });
			return;
		}
		const content = await readTextFile(filePath);
		if (!content.trim()) {
			autoMoveStore.setConfig({ ...DEFAULT_CONFIG });
			return;
		}
		const parsed = JSON.parse(content) as Partial<AutoMoveConfig>;
		autoMoveStore.setConfig({
			rules: Array.isArray(parsed.rules) ? parsed.rules : [],
			excludedFolders: Array.isArray(parsed.excludedFolders) ? parsed.excludedFolders : [],
		});
		debug('AUTO-MOVE', `Loaded config: ${autoMoveStore.rules.length} rules, ${autoMoveStore.excludedFolders.length} excluded folders`);
	} catch (err) {
		error('AUTO-MOVE', 'Failed to load config:', err);
		autoMoveStore.setConfig({ ...DEFAULT_CONFIG });
	}
}

/**
 * Saves current auto-move config to disk.
 */
export async function saveAutoMoveConfig(vaultPath: string): Promise<void> {
	const dirPath = `${vaultPath}/${SETTINGS_DIR}`;
	const filePath = getConfigPath(vaultPath);
	try {
		const dirExists = await exists(dirPath);
		if (!dirExists) {
			await mkdir(dirPath);
		}
		const config: AutoMoveConfig = {
			rules: autoMoveStore.rules,
			excludedFolders: autoMoveStore.excludedFolders,
		};
		await writeTextFile(filePath, JSON.stringify(config, null, 2));
		debug('AUTO-MOVE', 'Config saved');
	} catch (err) {
		error('AUTO-MOVE', 'Failed to save config:', err);
		throw err;
	}
}

/**
 * Registers the after-save observer that triggers debounced rule evaluation.
 * Returns an unsubscribe function.
 */
export function registerAutoMoveHook(): () => void {
	debug('AUTO-MOVE', 'Registering after-save hook');
	return addAfterSaveObserver((filePath, content) => {
		if (!settingsStore.autoMove.enabled) return;

		const enabledRules = autoMoveStore.enabledRules;
		if (enabledRules.length === 0) return;

		const vaultPath = vaultStore.path;
		if (!vaultPath) return;

		if (isInExcludedFolder(filePath, vaultPath, autoMoveStore.excludedFolders)) {
			debug('AUTO-MOVE', 'Skipping excluded folder:', filePath);
			return;
		}

		// Clear existing timer for this file
		const existing = debounceTimers.get(filePath);
		if (existing) clearTimeout(existing);

		const timer = setTimeout(async () => {
			debounceTimers.delete(filePath);
			try {
				await evaluateAndMove(filePath, content, vaultPath);
			} catch (err) {
				error('AUTO-MOVE', 'Failed to evaluate/move:', err);
			}
		}, settingsStore.autoMove.debounceMs);

		debounceTimers.set(filePath, timer);
	});
}

/**
 * Dynamically enables or disables the auto-move after-save hook.
 * Called from the Settings UI when the user toggles auto-move on/off.
 * Returns the current unsubscribe function (or null if disabled).
 */
export function toggleAutoMoveHook(enabled: boolean): (() => void) | null {
	if (enabled && !currentUnsubscribe) {
		debug('AUTO-MOVE', 'Dynamically registering after-save hook');
		currentUnsubscribe = registerAutoMoveHook();
		return currentUnsubscribe;
	}
	if (!enabled && currentUnsubscribe) {
		debug('AUTO-MOVE', 'Dynamically unregistering after-save hook');
		currentUnsubscribe();
		currentUnsubscribe = null;
	}
	return currentUnsubscribe;
}

/**
 * Evaluates rules against a saved file and moves it if a rule matches.
 * Uses buildNoteRecord directly from the saved content for freshness.
 */
async function evaluateAndMove(filePath: string, content: string, vaultPath: string): Promise<void> {
	// Build a fresh NoteRecord from the saved content
	const record = buildNoteRecord(filePath, content, Date.now(), Date.now());

	const rule = findMatchingRule(autoMoveStore.enabledRules, record);
	if (!rule) {
		debug('AUTO-MOVE', 'No matching rule for:', filePath);
		return;
	}

	const alreadyInDest = isAlreadyInDestination(filePath, vaultPath, rule.destination);
	let targetPath = filePath;

	if (alreadyInDest) {
		debug('AUTO-MOVE', 'Already in destination, skipping move:', filePath);
	} else {
		// Ensure destination folder exists
		const destPath = `${vaultPath}/${rule.destination}`;
		try {
			const destExists = await exists(destPath);
			if (!destExists) {
				await mkdir(destPath, { recursive: true });
				debug('AUTO-MOVE', 'Created destination folder:', destPath);
			}
		} catch (err) {
			error('AUTO-MOVE', 'Failed to create destination folder:', err);
			return;
		}

		debug('AUTO-MOVE', `Moving "${filePath}" to "${destPath}" (rule: ${rule.name})`);
		const newPath = await moveItem(filePath, destPath);
		if (!newPath) return;
		targetPath = newPath;
	}

	// Apply icon to the file if the rule has one configured (even if already in destination)
	if (rule.icon) {
		try {
			await setIconForPath(vaultPath, targetPath, rule.icon.iconPack, rule.icon.iconName, rule.icon.color, rule.icon.textColor);
			debug('AUTO-MOVE', `Applied icon "${rule.icon.iconPack}:${rule.icon.iconName}" to ${targetPath}`);
		} catch (err) {
			error('AUTO-MOVE', 'Failed to apply icon:', err);
		}
	}
}

/** Resets all auto-move state (called during vault teardown) */
export function resetAutoMove(): void {
	// Unsubscribe hook if active
	if (currentUnsubscribe) {
		currentUnsubscribe();
		currentUnsubscribe = null;
	}
	// Clear all pending timers
	for (const timer of debounceTimers.values()) {
		clearTimeout(timer);
	}
	debounceTimers.clear();
	autoMoveStore.reset();
	debug('AUTO-MOVE', 'Reset complete');
}
