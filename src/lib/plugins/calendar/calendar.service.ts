import { openFileInEditor } from '$lib/core/editor/editor.service';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import type { FileTreeNode } from '$lib/core/filesystem/fs.types';
import type { PeriodType } from '$lib/core/settings/settings.types';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { parseFrontmatterProperties } from '$lib/features/properties/properties.logic';
import { openOrCreatePeriodicNoteForDate as openPeriodicNote } from '$lib/plugins/periodic-notes/periodic-notes.service';
import { parseDateToKey, timestampToDateKey } from './calendar.logic';
import { debug, timeSync } from '$lib/utils/debug';
import { calendarStore } from './calendar.store.svelte';
import dayjs from 'dayjs';

/** Tracks the current effective date key per file for incremental updates */
let fileDateKeys = new Map<string, string | null>();
/** Tracks the frontmatter-sourced date key per file (null if no frontmatter `created`) */
let fileFrontmatterKeys = new Map<string, string | null>();
/** Tracks the filesystem-sourced date key per file (null if no `createdAt`) */
let fileFilesystemKeys = new Map<string, string | null>();

/**
 * Scans all files in the vault and groups them by date.
 * Uses the frontmatter `created` property as primary source,
 * falling back to the filesystem `createdAt` timestamp.
 * Also populates the fileDateKeys map for incremental updates.
 */
export function scanFilesForCalendar(): void {
	timeSync('CALENDAR', 'scanFilesForCalendar', () => {
		const tree = fsStore.fileTree;
		const propertyIndex = collectionStore.propertyIndex;
		const paths = new Map<string, string[]>();
		fileDateKeys = new Map();
		fileFrontmatterKeys = new Map();
		fileFilesystemKeys = new Map();

		function addToMap(key: string, filePath: string) {
			const existing = paths.get(key);
			if (existing) {
				existing.push(filePath);
			} else {
				paths.set(key, [filePath]);
			}
		}

		function walk(nodes: FileTreeNode[]) {
			for (const node of nodes) {
				if (node.isDirectory) {
					if (node.children) walk(node.children);
					continue;
				}

				// Try frontmatter `created` property first
				let frontmatterKey: string | null = null;
				const record = propertyIndex.get(node.path);
				if (record) {
					const created = record.properties.get('created');
					if (created) {
						frontmatterKey = parseDateToKey(created);
					}
				}

				// Filesystem createdAt as fallback source
				const filesystemKey = node.createdAt ? timestampToDateKey(node.createdAt) : null;
				const effectiveKey = frontmatterKey ?? filesystemKey;

				fileFrontmatterKeys.set(node.path, frontmatterKey);
				fileFilesystemKeys.set(node.path, filesystemKey);
				fileDateKeys.set(node.path, effectiveKey);

				if (effectiveKey) {
					addToMap(effectiveKey, node.path);
				}
			}
		}

		walk(tree);
		calendarStore.setDayPaths(paths);
		debug('CALENDAR', `Calendar: ${paths.size} days`);
	});
}

/**
 * Incrementally updates the calendar for a single file's content change.
 * Only acts if the frontmatter `created` property actually changed.
 * When frontmatter is absent or removed, falls back to the filesystem
 * `createdAt` key (which doesn't change on content edits).
 */
export function updateCalendarForFile(filePath: string, content: string): void {
	const properties = parseFrontmatterProperties(content);
	const createdProp = properties.find((p) => p.key === 'created');
	const newFmKey = createdProp ? parseDateToKey(createdProp.value) : null;
	const oldFmKey = fileFrontmatterKeys.get(filePath) ?? null;

	// Only act if the frontmatter `created` property actually changed
	if (oldFmKey === newFmKey) return;

	fileFrontmatterKeys.set(filePath, newFmKey);

	// Compute new effective key: frontmatter takes priority, fall back to filesystem
	const fsKey = fileFilesystemKeys.get(filePath) ?? null;
	const newEffective = newFmKey ?? fsKey;
	const oldEffective = fileDateKeys.get(filePath) ?? null;

	if (oldEffective === newEffective) return;

	fileDateKeys.set(filePath, newEffective);
	calendarStore.updateFileDate(filePath, oldEffective, newEffective);
}

/**
 * Opens or creates a periodic note of any type for an arbitrary date.
 * Parses the dateKey and delegates to the periodic-notes service.
 */
export async function openOrCreatePeriodicNoteForDate(periodType: PeriodType, dateKey: string): Promise<void> {
	await openPeriodicNote(periodType, dayjs(dateKey, 'YYYY-MM-DD'));
}

/**
 * Opens or creates a daily note for an arbitrary date.
 * Convenience wrapper around `openOrCreatePeriodicNoteForDate('daily', dateKey)`.
 */
export async function openOrCreateDailyNoteForDate(dateKey: string): Promise<void> {
	await openOrCreatePeriodicNoteForDate('daily', dateKey);
}

/**
 * Opens a file in the editor by its full path.
 */
export async function openCalendarFile(filePath: string): Promise<void> {
	await openFileInEditor(filePath);
}

/** Resets the calendar store and clears all file date key caches */
export function resetCalendar(): void {
	fileDateKeys = new Map();
	fileFrontmatterKeys = new Map();
	fileFilesystemKeys = new Map();
	calendarStore.reset();
}
