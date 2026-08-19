import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import type { IconPackId, RecentIcon } from './file-icons.types';
import { fileIconsStore, type FrontmatterIconRef } from './file-icons.store.svelte';
import {
	addRecentIcon,
	extractIconFromFrontmatter,
	extractIconColorsFromFrontmatter,
	extractIconFromParsedFrontmatter,
	extractIconColorsFromParsedFrontmatter,
} from './file-icons.logic';
import { preloadPacks, setOnPacksLoaded } from './file-icons.icon-data';

setOnPacksLoaded(() => fileIconsStore.bumpPackVersion());
import { debug, error, timeAsync } from '$lib/utils/debug';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

/** Internal directory inside the vault that stores app metadata */
const KOKOBRAIN_DIR = '.kokobrain';
const RECENT_ICONS_FILE = 'recent-icons.json';

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

/** Tracks an icon as recently used and persists to disk */
export async function trackRecentIcon(vaultPath: string, iconPack: IconPackId, iconName: string): Promise<void> {
	const updated = addRecentIcon(fileIconsStore.recentIcons, iconPack, iconName);
	fileIconsStore.setRecentIcons(updated);
	await saveRecentIcons(vaultPath);
}

const MD_EXT = /\.(?:md|markdown)$/i;

function isMarkdown(path: string): boolean {
	return MD_EXT.test(path);
}

function getFolderNotePath(dirPath: string): string {
	const name = dirPath.split('/').filter(Boolean).pop() ?? '';
	return `${dirPath}/${name}.md`;
}

/**
 * Resolves the folder note path for a directory, creating it if needed.
 * Returns the path to the folder note.
 */
async function ensureFolderNote(dirPath: string): Promise<string> {
	const notePath = getFolderNotePath(dirPath);
	const noteExists = await exists(notePath);
	if (!noteExists) {
		await writeTextFile(notePath, '---\n---\n');
	}
	return notePath;
}

/**
 * Sets a custom icon for a file/folder path.
 * - .md files: writes to frontmatter (_icon, _color, _title_color).
 * - Directories (isDirectory=true): writes to folder note frontmatter (auto-creates if needed).
 */
export async function setIconForPath(
	vaultPath: string,
	path: string,
	iconPack: IconPackId,
	iconName: string,
	color?: string,
	textColor?: string,
	isDirectory = false,
): Promise<void> {
	if (isMarkdown(path)) {
		const { setFrontmatterIcon } = await import('./frontmatter-icon.service');
		await setFrontmatterIcon(path, iconPack, iconName, color, textColor);
		fileIconsStore.updateFrontmatterIcon(path, {
			iconPack, iconName, color, titleColor: textColor,
		});
		return;
	}

	if (isDirectory) {
		const notePath = await ensureFolderNote(path);
		const { setFrontmatterIcon } = await import('./frontmatter-icon.service');
		await setFrontmatterIcon(notePath, iconPack, iconName, color, textColor);
		const ref: FrontmatterIconRef = { iconPack, iconName, color, titleColor: textColor };
		fileIconsStore.updateFrontmatterIcon(notePath, ref);
		fileIconsStore.updateFrontmatterIcon(path, ref);
		return;
	}
}

/**
 * Removes a custom icon from a file/folder path.
 * - .md files: removes _icon, _color, _title_color from frontmatter.
 * - Directories (isDirectory=true): removes icon from folder note frontmatter.
 */
export async function removeIconForPath(vaultPath: string, path: string, isDirectory = false): Promise<void> {
	if (isMarkdown(path)) {
		const { removeFrontmatterIcon } = await import('./frontmatter-icon.service');
		await removeFrontmatterIcon(path);
		fileIconsStore.updateFrontmatterIcon(path, null);
		return;
	}

	if (isDirectory) {
		const notePath = getFolderNotePath(path);
		const noteExists = await exists(notePath);
		if (noteExists) {
			const { removeFrontmatterIcon } = await import('./frontmatter-icon.service');
			await removeFrontmatterIcon(notePath);
			fileIconsStore.updateFrontmatterIcon(notePath, null);
		}
		fileIconsStore.updateFrontmatterIcon(path, null);
		return;
	}
}

/**
 * Scans all vault notes for the frontmatter `icon` property and
 * populates `fileIconsStore.frontmatterIcons`. Reads pre-parsed
 * frontmatter from the Rust `VaultIndex` via `get_all_vault_entries_v2`
 * - no per-file YAML re-parse on the JS side.
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

				// Folder notes: if X/X.md has an icon, index under directory X/ too
				const parts = entry.path.split('/');
				const fileName = parts[parts.length - 1];
				const parentDir = parts.slice(0, -1).join('/');
				const parentName = parts[parts.length - 2];
				if (parentName && fileName === `${parentName}.md`) {
					index.set(parentDir, full);
				}
			}
		}

		fileIconsStore.setFrontmatterIcons(index);
		debug('FILE_ICONS', `Icons: ${index.size} found`);

		// Preload packs referenced by frontmatter icons
		const packs = [...new Set([...index.values()].map((r) => r.iconPack))];
		if (packs.length > 0) await preloadPacks(packs);
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

	// Folder notes: also index under parent directory path
	const parts = filePath.split('/');
	const fileName = parts[parts.length - 1];
	const parentDir = parts.slice(0, -1).join('/');
	const parentName = parts[parts.length - 2];
	if (parentName && fileName === `${parentName}.md`) {
		fileIconsStore.updateFrontmatterIcon(parentDir, newRef);
	}

	// Preload pack if new icon references one
	if (newRef) {
		preloadPacks([newRef.iconPack]);
	}
}

/**
 * Removes the frontmatter icon entry for a single file.
 * Mirrors `updateFrontmatterIconForFile`, including the folder-note
 * parent-directory key that `X/X.md` also indexes under.
 */
export function removeFrontmatterIconForFile(filePath: string): void {
	if (!fileIconsStore.getFrontmatterIcon(filePath)) return;

	fileIconsStore.updateFrontmatterIcon(filePath, null);

	// Folder notes: the parent directory path carries the same icon
	const parts = filePath.split('/');
	const fileName = parts[parts.length - 1];
	const parentDir = parts.slice(0, -1).join('/');
	const parentName = parts[parts.length - 2];
	if (parentName && fileName === `${parentName}.md`) {
		fileIconsStore.updateFrontmatterIcon(parentDir, null);
	}
}

/** Clears file icon state (e.g. when switching vaults) */
export function resetFileIcons(): void {
	fileIconsStore.reset();
}
