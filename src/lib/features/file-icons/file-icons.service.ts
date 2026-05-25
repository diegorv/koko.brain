import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import type { FileIconEntry, IconPackId, RecentIcon } from './file-icons.types';
import { fileIconsStore, type FrontmatterIconRef } from './file-icons.store.svelte';
import {
	setFileIcon,
	removeFileIcon,
	updateFileIconPaths,
	addRecentIcon,
	extractIconFromFrontmatter,
	extractIconColorsFromFrontmatter,
	extractIconFromParsedFrontmatter,
	extractIconColorsFromParsedFrontmatter,
} from './file-icons.logic';
import { preloadPacks } from './file-icons.icon-data';
import { debug, error, timeAsync } from '$lib/utils/debug';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

/** Internal directory inside the vault that stores app metadata */
const KOKOBRAIN_DIR = '.kokobrain';
const ICONS_FILE = 'file-icons.json';
const RECENT_ICONS_FILE = 'recent-icons.json';

/** Resolves the full path to the file icons JSON file */
function getIconsPath(vaultPath: string): string {
	return `${vaultPath}/${KOKOBRAIN_DIR}/${ICONS_FILE}`;
}

/** Resolves the full path to the recently used icons JSON file */
function getRecentIconsPath(vaultPath: string): string {
	return `${vaultPath}/${KOKOBRAIN_DIR}/${RECENT_ICONS_FILE}`;
}

/** Resolves the full path to the internal metadata directory */
function getDirPath(vaultPath: string): string {
	return `${vaultPath}/${KOKOBRAIN_DIR}`;
}

/** Ensures the `.kokobrain` directory exists, creating it if needed */
async function ensureDir(vaultPath: string): Promise<void> {
	const dirPath = getDirPath(vaultPath);
	const dirExists = await exists(dirPath);
	if (!dirExists) {
		await mkdir(dirPath);
	}
}

/** Reads file icons from disk. Falls back to empty array if file is missing or invalid. */
export async function loadFileIcons(vaultPath: string): Promise<void> {
	const filePath = getIconsPath(vaultPath);
	try {
		const fileExists = await exists(filePath);
		if (!fileExists) {
			fileIconsStore.setEntries([]);
			return;
		}
		const content = await readTextFile(filePath);
		const parsed = JSON.parse(content) as FileIconEntry[];
		const entries = Array.isArray(parsed) ? parsed : [];
		fileIconsStore.setEntries(entries);
		// Pre-load icon packs referenced by saved entries so they render synchronously
		const packs = [...new Set(entries.map((e) => e.iconPack))];
		if (packs.length > 0) await preloadPacks(packs);
	} catch (err) {
		error('FILE_ICONS', 'Failed to load file icons:', err);
		fileIconsStore.setEntries([]);
	}
}

/** Reads recently used icons from disk. Falls back to empty array if missing. */
export async function loadRecentIcons(vaultPath: string): Promise<void> {
	const filePath = getRecentIconsPath(vaultPath);
	try {
		const fileExists = await exists(filePath);
		if (!fileExists) {
			fileIconsStore.setRecentIcons([]);
			return;
		}
		const content = await readTextFile(filePath);
		const parsed = JSON.parse(content) as RecentIcon[];
		fileIconsStore.setRecentIcons(Array.isArray(parsed) ? parsed : []);
	} catch (err) {
		error('FILE_ICONS', 'Failed to load recent icons:', err);
		fileIconsStore.setRecentIcons([]);
	}
}

/** Persists the recently used icons to disk */
async function saveRecentIcons(vaultPath: string): Promise<void> {
	const filePath = getRecentIconsPath(vaultPath);
	try {
		await ensureDir(vaultPath);
		const content = JSON.stringify(fileIconsStore.recentIcons, null, 2);
		await writeTextFile(filePath, content);
	} catch (err) {
		error('FILE_ICONS', 'Failed to save recent icons:', err);
	}
}

/** Persists the current file icons to disk, creating the `.kokobrain` dir if needed */
export async function saveFileIcons(vaultPath: string): Promise<void> {
	const filePath = getIconsPath(vaultPath);
	try {
		await ensureDir(vaultPath);
		const content = JSON.stringify(fileIconsStore.entries, null, 2);
		await writeTextFile(filePath, content);
	} catch (err) {
		error('FILE_ICONS', 'Failed to save file icons:', err);
	}
}

/** Tracks an icon as recently used and persists to disk */
export async function trackRecentIcon(vaultPath: string, iconPack: IconPackId, iconName: string): Promise<void> {
	const updated = addRecentIcon(fileIconsStore.recentIcons, iconPack, iconName);
	fileIconsStore.setRecentIcons(updated);
	await saveRecentIcons(vaultPath);
}

const MD_EXT = /\.(?:md|markdown)$/i;

/**
 * Sets a custom icon for a file/folder path.
 * For .md files: writes to frontmatter (_icon, _color, _title_color).
 * For non-.md files: writes to .kokobrain/file-icons.json.
 */
export async function setIconForPath(
	vaultPath: string,
	path: string,
	iconPack: IconPackId,
	iconName: string,
	color?: string,
	textColor?: string,
): Promise<void> {
	if (MD_EXT.test(path)) {
		const { setFrontmatterIcon } = await import('./frontmatter-icon.service');
		await setFrontmatterIcon(path, iconPack, iconName, color, textColor);
		fileIconsStore.updateFrontmatterIcon(path, {
			iconPack, iconName, color, titleColor: textColor,
		});
		return;
	}
	const updated = setFileIcon(fileIconsStore.entries, path, iconPack, iconName, color, textColor);
	fileIconsStore.setEntries(updated);
	await saveFileIcons(vaultPath);
}

/**
 * Removes a custom icon from a file/folder path.
 * For .md files: removes _icon, _color, _title_color from frontmatter.
 * For non-.md files: removes entry from .kokobrain/file-icons.json.
 */
export async function removeIconForPath(vaultPath: string, path: string): Promise<void> {
	if (MD_EXT.test(path)) {
		const { removeFrontmatterIcon } = await import('./frontmatter-icon.service');
		await removeFrontmatterIcon(path);
		fileIconsStore.updateFrontmatterIcon(path, null);
		return;
	}
	const updated = removeFileIcon(fileIconsStore.entries, path);
	fileIconsStore.setEntries(updated);
	await saveFileIcons(vaultPath);
}

/** Updates icon paths after a rename or move and saves to disk */
export async function updateFileIconPathsAfterMove(
	vaultPath: string,
	oldPath: string,
	newPath: string,
): Promise<void> {
	const updated = updateFileIconPaths(fileIconsStore.entries, oldPath, newPath);
	fileIconsStore.setEntries(updated);
	await saveFileIcons(vaultPath);
}

/**
 * Scans all vault notes for the frontmatter `icon` property and
 * populates `fileIconsStore.frontmatterIcons`. Reads pre-parsed
 * frontmatter from the Rust `VaultIndex` via `get_all_vault_entries_v2`
 * — no per-file YAML re-parse on the JS side.
 *
 * Phase 11.5g — replaces the previous noteIndexStore.noteContents
 * iteration. Call after the Rust index is bootstrapped (Phase 3.5b).
 */
export async function buildFrontmatterIconIndex(): Promise<void> {
	await timeAsync('FILE_ICONS', 'buildFrontmatterIconIndex', async () => {
		const entries = await invoke<NoteEntryV2[]>('get_all_vault_entries_v2');
		const index = new Map<string, FrontmatterIconRef>();

		for (const entry of entries) {
			const ref = extractIconFromParsedFrontmatter(entry.frontmatter);
			if (ref) {
				const colors = extractIconColorsFromParsedFrontmatter(entry.frontmatter);
				const full: FrontmatterIconRef = { ...ref, ...colors };
				index.set(entry.path, full);
			}
		}

		fileIconsStore.setFrontmatterIcons(index);
		debug('FILE_ICONS', `Icons: ${index.size} found`);

		// Preload packs referenced by frontmatter icons
		const packs = [...new Set([...index.values()].map((r) => r.iconPack))];
		if (packs.length > 0) preloadPacks(packs);
	});
}

/**
 * Incrementally updates the frontmatter icon for a single file.
 * Skips the update if the icon and colors haven't changed.
 */
export function updateFrontmatterIconForFile(filePath: string, content: string): void {
	const iconRef = extractIconFromFrontmatter(content);
	const colors = extractIconColorsFromFrontmatter(content);
	const oldRef = fileIconsStore.getFrontmatterIcon(filePath);

	const newRef: FrontmatterIconRef | null = iconRef
		? { ...iconRef, ...colors }
		: null;

	// Early skip: both null or identical
	if (!newRef && !oldRef) return;
	if (
		newRef && oldRef &&
		newRef.iconPack === oldRef.iconPack &&
		newRef.iconName === oldRef.iconName &&
		newRef.color === oldRef.color &&
		newRef.titleColor === oldRef.titleColor
	) return;

	fileIconsStore.updateFrontmatterIcon(filePath, newRef);

	// Preload pack if new icon references one
	if (newRef) {
		preloadPacks([newRef.iconPack]);
	}
}

/** Clears file icon state (e.g. when switching vaults) */
export function resetFileIcons(): void {
	fileIconsStore.reset();
}
