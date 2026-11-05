import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { call } from '#lib/contracts/ipc.js';
import { applyNoteChange, registerNoteChangeConsumer } from '#lib/core/filesystem/note-change.service.js';
import { isViewFile } from '#lib/core/filesystem/fs.logic.js';
import type { IconPackId, RecentIcon } from './file-icons.types';
import { fileIconsStore, type FrontmatterIconRef } from './file-icons.store.svelte';
import {
	addRecentIcon,
	extractIconFromFrontmatter,
	extractIconColorsFromFrontmatter,
	extractIconFromParsedFrontmatter,
	extractIconColorsFromParsedFrontmatter,
	extractViewIcon,
	mergeIconRef,
} from './file-icons.logic';
import { preloadPacks, setOnPacksLoaded } from './file-icons.icon-data';

setOnPacksLoaded(() => fileIconsStore.bumpPackVersion());
import { debug, error, timeAsync } from '#lib/utils/debug.js';

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
		const placeholder = '---\n---\n';
		await writeTextFile(notePath, placeholder);
		// The placeholder is a brand new note nothing else knows about; route it
		// through the owner so a later failure of the icon write cannot leave it
		// invisible to the indexes until the watcher debounce.
		void applyNoteChange({ kind: 'upsert', source: 'save', path: notePath, content: placeholder });
	}
	return notePath;
}

/**
 * Sets a custom icon for a file/folder path.
 * - .md files: writes to frontmatter (_icon, _color, _title_color).
 * - Directories (isDirectory=true): writes to folder note frontmatter (auto-creates if needed).
 * A refused frontmatter write (already toasted) leaves the icon store untouched.
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
		if (!(await setFrontmatterIcon(path, iconPack, iconName, color, textColor))) return;
		fileIconsStore.updateFrontmatterIcon(path, {
			iconPack, iconName, color, titleColor: textColor,
		});
		return;
	}

	if (isDirectory) {
		const notePath = await ensureFolderNote(path);
		const { setFrontmatterIcon } = await import('./frontmatter-icon.service');
		if (!(await setFrontmatterIcon(notePath, iconPack, iconName, color, textColor))) return;
		const ref: FrontmatterIconRef = { iconPack, iconName, color, titleColor: textColor };
		fileIconsStore.updateFrontmatterIcon(notePath, ref);
		fileIconsStore.updateFrontmatterIcon(path, ref);
		return;
	}
}

/**
 * Saves the colors of a file/folder that has no icon, leaving any `_icon` key
 * alone. A directory saves to its folder note, created only to hold a color;
 * any other file that is not Markdown has no frontmatter to save to.
 * A refused frontmatter write (already toasted) leaves the icon store untouched.
 */
export async function setIconColors(path: string, color?: string, textColor?: string, isDirectory = false): Promise<void> {
	const isNote = isMarkdown(path);
	if (!isNote && !isDirectory) return;
	if (!isNote && !color && !textColor && !(await exists(getFolderNotePath(path)))) return;

	const notePath = isNote ? path : await ensureFolderNote(path);
	const { setFrontmatterIconColors } = await import('./frontmatter-icon.service');
	if (!(await setFrontmatterIconColors(notePath, color, textColor))) return;

	const ref: FrontmatterIconRef = { ...fileIconsStore.getFrontmatterIcon(notePath), color, titleColor: textColor };
	const next = ref.iconPack || color || textColor ? ref : null;
	fileIconsStore.updateFrontmatterIcon(notePath, next);
	if (!isNote) fileIconsStore.updateFrontmatterIcon(path, next);
}

/**
 * Removes a custom icon from a file/folder path.
 * - .md files: removes _icon, _color, _title_color from frontmatter.
 * - Directories (isDirectory=true): removes icon from folder note frontmatter.
 * A refused frontmatter write (already toasted) leaves the icon store untouched.
 */
export async function removeIconForPath(vaultPath: string, path: string, isDirectory = false): Promise<void> {
	if (isMarkdown(path)) {
		const { removeFrontmatterIcon } = await import('./frontmatter-icon.service');
		if (!(await removeFrontmatterIcon(path))) return;
		fileIconsStore.updateFrontmatterIcon(path, null);
		return;
	}

	if (isDirectory) {
		const notePath = getFolderNotePath(path);
		const noteExists = await exists(notePath);
		if (noteExists) {
			const { removeFrontmatterIcon } = await import('./frontmatter-icon.service');
			if (!(await removeFrontmatterIcon(notePath))) return;
			fileIconsStore.updateFrontmatterIcon(notePath, null);
		}
		fileIconsStore.updateFrontmatterIcon(path, null);
		return;
	}
}

/**
 * Scans all vault notes for the frontmatter icon and colors and
 * populates `fileIconsStore.frontmatterIcons`. Reads pre-parsed
 * frontmatter from the Rust `VaultIndex` via `get_all_vault_entries_v2`
 * - no per-file YAML re-parse on the JS side.
 */
export async function buildFrontmatterIconIndex(): Promise<void> {
	await timeAsync('FILE_ICONS', 'buildFrontmatterIconIndex', async () => {
		const entries = await call('get_all_vault_entries_v2');
		const index = new Map<string, FrontmatterIconRef>();

		for (const entry of entries) {
			const full = mergeIconRef(
				extractIconFromParsedFrontmatter(entry.frontmatter),
				extractIconColorsFromParsedFrontmatter(entry.frontmatter),
			);
			if (full) {
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
		const packs = [...new Set([...index.values()].flatMap((r) => (r.iconPack ? [r.iconPack] : [])))];
		if (packs.length > 0) await preloadPacks(packs);
	});
}

/**
 * Incrementally updates the frontmatter icon for a single file.
 * Skips the update if the icon and colors haven't changed. A `.view` body is
 * bare YAML, so its icon is read from the whole body instead of from
 * `---` fenced frontmatter.
 */
export function updateFrontmatterIconForFile(filePath: string, content: string): void {
	const oldRef = fileIconsStore.getFrontmatterIcon(filePath);

	const newRef: FrontmatterIconRef | null = isViewFile(filePath)
		? extractViewIcon(content)
		: mergeIconRef(extractIconFromFrontmatter(content), extractIconColorsFromFrontmatter(content));

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
	if (newRef?.iconPack) {
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

/**
 * Registers the frontmatter icon index as a note-change consumer, so
 * `applyNoteChange` keeps it in sync on every write and eviction. Returns an
 * unregister function.
 */
export function registerFileIconsNoteChangeConsumer(): () => void {
	return registerNoteChangeConsumer({
		name: 'file-icons',
		upsert: updateFrontmatterIconForFile,
		remove: removeFrontmatterIconForFile,
	});
}

/** Clears file icon state (e.g. when switching vaults) */
export function resetFileIcons(): void {
	fileIconsStore.reset();
}
