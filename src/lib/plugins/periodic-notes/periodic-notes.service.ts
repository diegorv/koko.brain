import dayjs from 'dayjs';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { pinTabByPath } from '$lib/core/editor/editor.service';
import { openOrCreateNote } from '$lib/core/note-creator/note-creator.service';
import type { PeriodType } from '$lib/core/settings/settings.types';
import {
	buildPeriodicNotePath,
	getFormatForPeriod,
	getTemplatePathForPeriod,
	getDailyInlineTemplate,
	getPeriodicNoteTitle,
	buildPeriodicVariables,
} from './periodic-notes.logic';

/**
 * Opens or creates a periodic note for a specific date.
 * Delegates to the unified `openOrCreateNote()` pipeline.
 * Generates navigation and table variables via `buildPeriodicVariables()`.
 *
 * Used both for today's notes and when clicking a wikilink to a non-existent
 * periodic note (e.g. `[[_notes/2026/02-Feb/_journal-day-14-02-2026|Tomorrow]]`).
 */
export async function openOrCreatePeriodicNoteForDate(
	periodType: PeriodType,
	date: dayjs.Dayjs,
): Promise<void> {
	const vaultPath = vaultStore.path;
	if (!vaultPath) return;

	const settings = settingsStore.periodicNotes;
	const format = getFormatForPeriod(settings, periodType);
	const filePath = buildPeriodicNotePath(vaultPath, settings.folder, format, date);
	const fileTitle = getPeriodicNoteTitle(format, date);
	const templatePath = getTemplatePathForPeriod(settings, periodType);
	const inlineTemplate = periodType === 'daily' ? getDailyInlineTemplate(settings) : undefined;
	const customVariables = buildPeriodicVariables(periodType, date, settings);

	await openOrCreateNote({
		filePath,
		templatePath: templatePath ? `${vaultPath}/${templatePath}` : undefined,
		inlineTemplate,
		title: fileTitle,
		customVariables,
	});
}

/**
 * Opens or creates a periodic note for today (daily, weekly, monthly, or quarterly).
 * Convenience wrapper that passes today's date to `openOrCreatePeriodicNoteForDate()`.
 */
export async function openOrCreatePeriodicNote(periodType: PeriodType): Promise<void> {
	return openOrCreatePeriodicNoteForDate(periodType, dayjs());
}

/**
 * Opens today's daily note, creating it from a template if it doesn't exist.
 * Convenience wrapper around `openOrCreatePeriodicNote('daily')`.
 */
export async function openOrCreateDailyNote(): Promise<void> {
	await openOrCreatePeriodicNote('daily');
}

/**
 * Auto-opens (and optionally pins) today's daily note on vault startup.
 * Reads `autoOpen` and `autoPin` from periodic notes daily settings.
 * Does nothing if `autoOpen` is not enabled.
 */
export async function autoOpenDailyNote(): Promise<void> {
	const { autoOpen, autoPin } = settingsStore.periodicNotes.daily;
	if (!autoOpen) return;

	const vaultPath = vaultStore.path;
	if (!vaultPath) return;

	const date = dayjs();
	const settings = settingsStore.periodicNotes;
	const format = getFormatForPeriod(settings, 'daily');
	const filePath = buildPeriodicNotePath(vaultPath, settings.folder, format, date);

	await openOrCreatePeriodicNoteForDate('daily', date);

	if (autoPin) {
		pinTabByPath(filePath);
	}
}
