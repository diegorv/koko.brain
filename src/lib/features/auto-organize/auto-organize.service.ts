import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { addAfterSaveObserver } from '#lib/core/editor/editor.hooks.js';
import { isViewFile } from '#lib/core/filesystem/fs.logic.js';
import { moveItem } from '#lib/core/filesystem/fs.service.js';
import { setIconForPath } from '#lib/features/file-icons/file-icons.service.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import { detectLossyFrontmatter, parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import { updateNoteFrontmatter } from '#lib/core/frontmatter/frontmatter-write.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { autoOrganizeStore } from './auto-organize.store.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import {
	applyPropertyWrites,
	findMatchingRules,
	findMoveRule,
	isInExcludedFolder,
	isAlreadyInDestination,
	ownedProperties,
	propertiesToWrite,
	propertyWriteSkipReason,
	resolveDestination,
	sanitizeRuleProperties,
	type OwnedProperty,
} from './auto-organize.logic';
import type { AutoOrganizeConfig, AutoOrganizeRule } from './auto-organize.types';
import { generateLifecycleRules } from './type-lifecycle-rules';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { debug, error } from '#lib/utils/debug.js';

/** Internal directory inside the vault for metadata */
const SETTINGS_DIR = '.kokobrain';
const CONFIG_FILE = 'auto-organize-rules.json';

/** Per-file debounce timers for auto-organize evaluation */
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Current unsubscribe function for the after-save hook (null if not registered) */
let currentUnsubscribe: (() => void) | null = null;

/**
 * Target paths of runs in their write phase. The after-saves fired by a run's
 * own writes (legacy icon and properties) must not schedule a new evaluation:
 * that is the whole chaining and loop protection.
 */
const writingPaths = new Set<string>();

/** Rule ids whose property write failure was already logged this session. */
const reportedWriteFailures = new Set<string>();

/** Default empty config */
const DEFAULT_CONFIG: AutoOrganizeConfig = {
	rules: [],
	excludedFolders: [],
};

/** Resolves the full path to the auto-organize config file */
function getConfigPath(vaultPath: string): string {
	return `${vaultPath}/${SETTINGS_DIR}/${CONFIG_FILE}`;
}

/**
 * Loads auto-organize config from .kokobrain/auto-organize-rules.json.
 * If the file doesn't exist, initializes with empty defaults.
 */
export async function loadAutoOrganizeConfig(vaultPath: string): Promise<void> {
	const filePath = getConfigPath(vaultPath);
	try {
		const fileExists = await exists(filePath);
		if (!fileExists) {
			autoOrganizeStore.setConfig({ ...DEFAULT_CONFIG });
			return;
		}
		const content = await readTextFile(filePath);
		if (!content.trim()) {
			autoOrganizeStore.setConfig({ ...DEFAULT_CONFIG });
			return;
		}
		const parsed = JSON.parse(content) as Partial<AutoOrganizeConfig>;
		autoOrganizeStore.setConfig({
			rules: Array.isArray(parsed.rules) ? parsed.rules.map(withValidProperties) : [],
			excludedFolders: Array.isArray(parsed.excludedFolders) ? parsed.excludedFolders : [],
		});
		debug('AUTO-ORGANIZE', `Loaded config: ${autoOrganizeStore.rules.length} rules, ${autoOrganizeStore.excludedFolders.length} excluded folders`);
	} catch (err) {
		error('AUTO-ORGANIZE', 'Failed to load config:', err);
		autoOrganizeStore.setConfig({ ...DEFAULT_CONFIG });
	}
}

/** A loaded rule with its invalid property entries dropped; a non-array `properties` is removed. */
function withValidProperties(rule: AutoOrganizeRule): AutoOrganizeRule {
	if (rule === null || typeof rule !== 'object' || !('properties' in rule)) return rule;
	const { properties, ...rest } = rule;
	return Array.isArray(properties) ? { ...rest, properties: sanitizeRuleProperties(properties) } : rest;
}

/**
 * Saves current auto-organize config to disk.
 */
export async function saveAutoOrganizeConfig(vaultPath: string): Promise<void> {
	const dirPath = `${vaultPath}/${SETTINGS_DIR}`;
	const filePath = getConfigPath(vaultPath);
	try {
		const dirExists = await exists(dirPath);
		if (!dirExists) {
			await mkdir(dirPath);
		}
		const config: AutoOrganizeConfig = {
			rules: autoOrganizeStore.rules,
			excludedFolders: autoOrganizeStore.excludedFolders,
		};
		await writeTextFile(filePath, JSON.stringify(config, null, 2));
		debug('AUTO-ORGANIZE', 'Config saved');
	} catch (err) {
		error('AUTO-ORGANIZE', 'Failed to save config:', err);
		throw err;
	}
}

/**
 * Registers the after-save observer that triggers debounced rule evaluation.
 * Returns an unsubscribe function.
 */
export function registerAutoOrganizeHook(): () => void {
	debug('AUTO-ORGANIZE', 'Registering after-save hook');
	return addAfterSaveObserver((filePath) => {
		if (writingPaths.has(filePath)) return;
		if (isViewFile(filePath)) return;
		if (!settingsStore.autoOrganize.enabled) return;

		const hasUserRules = autoOrganizeStore.enabledRules.length > 0;
		const hasLifecycleRules = typeDefinitionsStore.typeMetadataMap.size > 0;
		if (!hasUserRules && !hasLifecycleRules) return;

		const vaultPath = vaultStore.path;
		if (!vaultPath) return;

		if (isInExcludedFolder(filePath, vaultPath, autoOrganizeStore.excludedFolders)) {
			debug('AUTO-ORGANIZE', 'Skipping excluded folder:', filePath);
			return;
		}

		// Clear existing timer for this file
		const existing = debounceTimers.get(filePath);
		if (existing) clearTimeout(existing);

		const timer = setTimeout(async () => {
			debounceTimers.delete(filePath);
			if (!settingsStore.autoOrganize.enabled) return;
			try {
				const content = await readCurrentContent(filePath);
				if (content === null) return;
				await evaluateAndMove(filePath, content, vaultPath);
			} catch (err) {
				error('AUTO-ORGANIZE', 'Failed to evaluate/move:', err);
			}
		}, settingsStore.autoOrganize.debounceMs);

		debounceTimers.set(filePath, timer);
	});
}

/**
 * Dynamically enables or disables the auto-organize after-save hook.
 * Called from the Settings UI when the user toggles auto-organize on/off.
 * Returns the current unsubscribe function (or null if disabled).
 */
export function toggleAutoOrganizeHook(enabled: boolean): (() => void) | null {
	if (enabled && !currentUnsubscribe) {
		debug('AUTO-ORGANIZE', 'Dynamically registering after-save hook');
		currentUnsubscribe = registerAutoOrganizeHook();
		return currentUnsubscribe;
	}
	if (!enabled && currentUnsubscribe) {
		debug('AUTO-ORGANIZE', 'Dynamically unregistering after-save hook');
		currentUnsubscribe();
		currentUnsubscribe = null;
	}
	return currentUnsubscribe;
}

/**
 * The note as it is now: the open tab's content, else the file on disk.
 * Null when the note vanished since the save.
 */
async function readCurrentContent(filePath: string): Promise<string | null> {
	const tab = editorStore.tabs.find((t) => t.path === filePath);
	if (tab) return tab.content;
	try {
		return await readTextFile(filePath);
	} catch (err) {
		if (!(await exists(filePath).catch(() => true))) {
			debug('AUTO-ORGANIZE', 'Note vanished before evaluation:', filePath);
			return null;
		}
		throw err;
	}
}

/**
 * Evaluates rules against a note's current content: the first matching rule
 * with a destination moves it, then, at the new path, the moving rule's legacy
 * icon and every matching rule's properties are written.
 */
async function evaluateAndMove(filePath: string, content: string, vaultPath: string): Promise<void> {
	const record = buildNoteRecord(filePath, content, Date.now(), Date.now());

	const lifecycleRules = generateLifecycleRules(typeDefinitionsStore.typeMetadataMap);
	const allRules = [...autoOrganizeStore.enabledRules, ...lifecycleRules];

	const matched = findMatchingRules(allRules, record, vaultPath, (failed, err) =>
		error('AUTO-ORGANIZE', `Rule "${failed.name}" failed to evaluate on ${filePath}:`, err),
	);
	if (matched.length === 0) {
		debug('AUTO-ORGANIZE', 'No matching rule for:', filePath);
		return;
	}

	const rule = findMoveRule(matched);
	let targetPath = filePath;

	if (rule) {
		const resolvedDest = resolveDestination(rule.destination, record, vaultPath);
		if (isAlreadyInDestination(filePath, vaultPath, resolvedDest)) {
			debug('AUTO-ORGANIZE', 'Already in destination, skipping move:', filePath);
		} else {
			// Ensure destination folder exists
			const destPath = `${vaultPath}/${resolvedDest}`;
			try {
				const destExists = await exists(destPath);
				if (!destExists) {
					await mkdir(destPath, { recursive: true });
					debug('AUTO-ORGANIZE', 'Created destination folder:', destPath);
				}
			} catch (err) {
				error('AUTO-ORGANIZE', 'Failed to create destination folder:', err);
				return;
			}

			debug('AUTO-ORGANIZE', `Moving "${filePath}" to "${destPath}" (rule: ${rule.name})`);
			let newPath: string | null;
			try {
				newPath = await moveItem(filePath, destPath);
			} catch {
				// `moveItem` already logged the cause.
				return;
			}
			if (!newPath) return;
			targetPath = newPath;
		}
	}

	const owned = ownedProperties(matched);
	if (!rule?.icon && owned.length === 0) return;

	writingPaths.add(targetPath);
	try {
		// The legacy icon goes first, so an explicit `_color` property beats
		// its color removal (`frontmatter-icon.service.ts::withIconColors`).
		const iconWritten = rule?.icon ? await applyLegacyIcon(rule, content, vaultPath, targetPath) : false;
		if (owned.length > 0) {
			await writeRuleProperties(targetPath, iconWritten ? null : content, vaultPath, owned);
		}
	} finally {
		writingPaths.delete(targetPath);
	}
}

/**
 * Applies the moving rule's legacy `icon` field. Returns true when it wrote,
 * so the property write re-reads the note.
 */
async function applyLegacyIcon(rule: AutoOrganizeRule, content: string, vaultPath: string, targetPath: string): Promise<boolean> {
	const icon = rule.icon!;
	// The icon write would refuse this frontmatter and toast on every autosave;
	// skip it quietly instead.
	const lossy = detectLossyFrontmatter(content);
	if (lossy !== null) {
		debug('AUTO-ORGANIZE', `Skipped icon for ${targetPath}: frontmatter is ${lossy}`);
		return false;
	}
	try {
		await setIconForPath(vaultPath, targetPath, icon.iconPack, icon.iconName, icon.color, icon.textColor);
		debug('AUTO-ORGANIZE', `Applied icon "${icon.iconPack}:${icon.iconName}" to ${targetPath}`);
	} catch (err) {
		error('AUTO-ORGANIZE', 'Failed to apply icon:', err);
	}
	return true;
}

/**
 * Writes the owned properties that change the note, in one frontmatter write.
 * A note the rules leave unchanged is never rewritten.
 * @param content - the note's current content, or null to read it again
 */
async function writeRuleProperties(
	targetPath: string,
	content: string | null,
	vaultPath: string,
	owned: OwnedProperty[],
): Promise<void> {
	let involved = owned;
	try {
		const current = content ?? (await readCurrentContent(targetPath));
		if (current === null) return;
		const skip = propertyWriteSkipReason(targetPath, current, vaultPath, [
			settingsStore.templates.systemFolder,
			settingsStore.templates.folder,
		]);
		if (skip !== null) {
			debug('AUTO-ORGANIZE', `Skipped properties for ${targetPath}: ${skip}`);
			return;
		}
		const writes = propertiesToWrite(parseFrontmatterProperties(current), owned);
		if (writes.length === 0) return;
		involved = writes;
		await updateNoteFrontmatter(targetPath, (props) => applyPropertyWrites(props, propertiesToWrite(props, owned)));
		debug('AUTO-ORGANIZE', `Set properties on ${targetPath}`);
	} catch (err) {
		reportWriteFailure(targetPath, involved, err);
	}
}

/** Logs a failed property write once per rule per session, naming the rules not yet reported. */
function reportWriteFailure(targetPath: string, involved: OwnedProperty[], err: unknown): void {
	const fresh = [...new Set(involved.map((p) => p.rule))].filter((r) => !reportedWriteFailures.has(r.id));
	if (fresh.length === 0) {
		debug('AUTO-ORGANIZE', `Property write failed again on ${targetPath}:`, err);
		return;
	}
	for (const r of fresh) reportedWriteFailures.add(r.id);
	const names = fresh.map((r) => `"${r.name}"`).join(', ');
	error('AUTO-ORGANIZE', `Rule ${names} failed to set properties on ${targetPath}:`, err);
}

/** Resets all auto-organize state (called during vault teardown) */
export function resetAutoOrganize(): void {
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
	writingPaths.clear();
	reportedWriteFailures.clear();
	autoOrganizeStore.reset();
	debug('AUTO-ORGANIZE', 'Reset complete');
}
