import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { registerNoteChangeConsumer } from '#lib/core/filesystem/note-change.service.js';
import { isMarkdownFile } from '#lib/core/filesystem/fs.logic.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import type { PeriodType } from '#lib/core/settings/settings.types.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { parseFrontmatterProperties } from '#lib/features/properties/properties.logic.js';
import { openOrCreatePeriodicNoteForDate as openPeriodicNote } from '#lib/plugins/periodic-notes/periodic-notes.service.js';
import { debug, timeSync } from '#lib/utils/debug.js';
import { noteDateKey } from '#lib/utils/note-date.js';
import { calendarStore } from './calendar.store.svelte';
import dayjs from 'dayjs';

/** Tracks the current note date key per file for incremental updates */
let fileDateKeys = new Map<string, string | null>();
/** Disk creation time per file from the last scan, the rule's last source on content edits */
let fileDiskTimes = new Map<string, number | null>();

/**
 * Scans all files in the vault and groups them by note date (`noteDateKey`:
 * frontmatter `date`, else `created`, else the disk creation time).
 * Also populates the per-file maps for incremental updates.
 */
export function scanFilesForCalendar(): void {
	timeSync('CALENDAR', 'scanFilesForCalendar', () => {
		const tree = fsStore.fileTree;
		const propertyIndex = collectionStore.propertyIndex;
		const paths = new Map<string, string[]>();
		fileDateKeys = new Map();
		fileDiskTimes = new Map();

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

				if (!isMarkdownFile(node.name)) continue;

				const properties = propertyIndex.get(node.path)?.properties;
				const diskCreatedAt = node.createdAt ?? null;
				const key = noteDateKey({
					date: properties?.get('date'),
					created: properties?.get('created'),
					diskCreatedAt,
				});

				fileDiskTimes.set(node.path, diskCreatedAt);
				fileDateKeys.set(node.path, key);

				if (key) {
					addToMap(key, node.path);
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
 * Re-applies `noteDateKey` to the new frontmatter `date` / `created` and the
 * disk time remembered from the last scan (content edits do not change it),
 * and moves the file only when its day changed.
 */
export function updateCalendarForFile(filePath: string, content: string): void {
	const properties = parseFrontmatterProperties(content);
	const newKey = noteDateKey({
		date: properties.find((p) => p.key === 'date')?.value,
		created: properties.find((p) => p.key === 'created')?.value,
		diskCreatedAt: fileDiskTimes.get(filePath) ?? null,
	});
	const oldKey = fileDateKeys.get(filePath) ?? null;

	if (oldKey === newKey) return;

	fileDateKeys.set(filePath, newKey);
	calendarStore.updateFileDate(filePath, oldKey, newKey);
}

/**
 * Removes a single file from the calendar index.
 * Drops the tracked date keys so a re-created file at the same path
 * is indexed again from scratch.
 */
export function removeCalendarForFile(filePath: string): void {
	const oldEffective = fileDateKeys.get(filePath) ?? null;

	fileDateKeys.delete(filePath);
	fileDiskTimes.delete(filePath);

	if (oldEffective) {
		calendarStore.updateFileDate(filePath, oldEffective, null);
	}
}

/**
 * Registers the calendar day index as a note-change consumer, so
 * `applyNoteChange` keeps it in sync on every write and eviction. Returns an
 * unregister function.
 */
export function registerCalendarNoteChangeConsumer(): () => void {
	return registerNoteChangeConsumer({
		name: 'calendar',
		upsert: updateCalendarForFile,
		remove: removeCalendarForFile,
	});
}

/**
 * Opens or creates a periodic note of any type for an arbitrary date.
 * Parses the dateKey and delegates to the periodic-notes service.
 */
export async function openOrCreatePeriodicNoteForDate(periodType: PeriodType, dateKey: string): Promise<void> {
	await openPeriodicNote(periodType, dayjs(dateKey, 'YYYY-MM-DD'));
}

/** Resets the calendar store and clears all file date key caches */
export function resetCalendar(): void {
	fileDateKeys = new Map();
	fileDiskTimes = new Map();
	calendarStore.reset();
}
