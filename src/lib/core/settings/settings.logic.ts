import { clamp } from '#lib/utils/clamp.js';
import type { AppSettings, EditorSettings, EventCalendarSettings, HeadingLevelSettings, HeadingTypography, LayoutSettings, SettingsSection, TodoistSettings } from './settings.types';

/**
 * Merges the `layout` read from settings.json over `defaults`, key by key. Only the keys
 * `defaults` has are kept, so keys the app no longer has (the classic shell's `shell`,
 * `sidebarMode`, `leftSidebarVisible`, `leftPaneSize`, `middlePanelSize`, `railMigrated`)
 * are dropped and not written back. A saved layout that is not an object yields the defaults.
 *
 * A layout still on the classic shell (it has a classic key, no `railMigrated: true` and a
 * `shell` other than `rail`, as every 3.0.12 file does) gets the rail default `navigatorSize`
 * and `noteListSize`, and the default `rightSidebarSize` when it is the old default 25: the
 * 3.0.12 `loadSettings` wrote its defaults back, so those are sizes the user never chose, and
 * they leave the rail editor too narrow (ADR 0033). The classic keys are dropped on write-back,
 * so this runs once.
 */
export function mergeLayout(defaults: LayoutSettings, savedLayout: unknown): LayoutSettings {
	const saved = typeof savedLayout === 'object' && savedLayout !== null && !Array.isArray(savedLayout) ? (savedLayout as Record<string, unknown>) : {};
	const merged: Record<string, unknown> = { ...defaults };
	for (const key of Object.keys(defaults)) {
		if (Object.hasOwn(saved, key)) merged[key] = saved[key];
	}
	const classicKeys = ['shell', 'sidebarMode', 'leftSidebarVisible', 'leftPaneSize', 'middlePanelSize'];
	const onClassic = classicKeys.some((key) => Object.hasOwn(saved, key)) && saved.railMigrated !== true && saved.shell !== 'rail';
	if (onClassic) {
		merged.navigatorSize = defaults.navigatorSize;
		merged.noteListSize = defaults.noteListSize;
		if (merged.rightSidebarSize === 25) merged.rightSidebarSize = defaults.rightSidebarSize;
	}
	return merged as unknown as LayoutSettings;
}

/** H4-H6 as every release before the distinct heading scale saved them */
const OLD_H4_TO_H6_DEFAULT: HeadingLevelSettings = { fontSize: 1.0, lineHeight: 1.6, fontWeight: 'bold', letterSpacing: 0 };

/** The body multiplier the editor applied on top of the font size setting before it was removed */
const OLD_BODY_MULTIPLIER = 1.05;

/**
 * Moves an editor block saved before the current type scale onto it, once:
 * the font size becomes the size the body rendered at (`round(size x 1.05)`),
 * and an H4-H6 level still at the old default is dropped so the load merge
 * fills it with the new default; a level the user changed stays. The result
 * carries `typeScaleMigrated: true`, and a block that already has it is
 * returned as is, so the size does not grow on every load. Run it on the
 * parsed file before merging defaults, which would supply the flag.
 */
export function migrateTypeScale(saved: Partial<EditorSettings> | undefined): Partial<EditorSettings> | undefined {
	if (!saved || saved.typeScaleMigrated === true) return saved;
	const out: Partial<EditorSettings> = { ...saved, typeScaleMigrated: true };
	if (typeof saved.fontSize === 'number') out.fontSize = Math.round(saved.fontSize * OLD_BODY_MULTIPLIER);
	if (saved.headingTypography) {
		const headings: Partial<Record<keyof HeadingTypography, Partial<HeadingLevelSettings>>> = { ...saved.headingTypography };
		for (const level of ['h4', 'h5', 'h6'] as const) {
			const merged: HeadingLevelSettings = { ...OLD_H4_TO_H6_DEFAULT, ...headings[level] };
			const atOldDefault = (Object.keys(OLD_H4_TO_H6_DEFAULT) as (keyof HeadingLevelSettings)[]).every(
				(key) => merged[key] === OLD_H4_TO_H6_DEFAULT[key],
			);
			if (headings[level] && atOldDefault) delete headings[level];
		}
		out.headingTypography = headings as HeadingTypography;
	}
	return out;
}

/** Clamps a font size to the valid range (8–32 px) */
export function clampFontSize(size: number): number {
	return clamp(size, 8, 32);
}

/** Clamps a line height to the valid range (1.0–3.0) */
export function clampLineHeight(height: number): number {
	return clamp(height, 1.0, 3.0);
}

/** Clamps a content width to the valid range (0 = no limit, or 400–2000 px) */
export function clampContentWidth(width: number): number {
	if (width <= 0) return 0;
	return clamp(width, 400, 2000);
}

/** The max width notes are laid out at: 0 (full width) for wide notes, else the configured `contentWidth` */
export function effectiveContentWidth(editor: Pick<EditorSettings, 'contentWidth' | 'wideNotes'>): number {
	return editor.wideNotes ? 0 : editor.contentWidth;
}

/** Clamps a paragraph spacing to the valid range (0–2.0 em) */
export function clampParagraphSpacing(spacing: number): number {
	return clamp(spacing, 0, 2.0);
}

/** Clamps a heading font size to the valid range (0.5–5.0 em) */
export function clampHeadingFontSize(size: number): number {
	return clamp(size, 0.5, 5.0);
}

/** Clamps a heading line height to the valid range (1.0–3.0) */
export function clampHeadingLineHeight(height: number): number {
	return clamp(height, 1.0, 3.0);
}

/** Clamps a heading letter spacing to the valid range (-0.1 to 0.1 em) */
export function clampHeadingLetterSpacing(spacing: number): number {
	return clamp(spacing, -0.1, 0.1);
}

/** Event colors the calendar offers; the only runtime copy of this list */
export const EVENT_CALENDAR_COLORS = ['green', 'purple', 'cyan', 'orange', 'pink', 'blue'] as const;

/** Calendar view modes; the only runtime copy of this list */
export const EVENT_CALENDAR_VIEW_MODES = ['day', 'week', 'month'] as const;

/** Clamps the calendar's first visible hour to an integer within 0–12 (a non-finite value becomes 0) */
export function clampDayStartHour(hour: number): number {
	const rounded = Math.round(hour);
	if (!Number.isFinite(rounded)) return 0;
	return clamp(rounded, 0, 12);
}

/** Rounds a default event duration to a multiple of 15 within 15–480 minutes (a non-finite value becomes 15) */
export function clampEventDuration(minutes: number): number {
	const rounded = Math.round(minutes / 15) * 15;
	if (!Number.isFinite(rounded)) return 15;
	return clamp(rounded, 15, 480);
}

/**
 * Trims the type name event notes carry. An empty value, a non-string, or
 * `Type` in any case (the type-definition type itself) becomes `Event`.
 */
export function normalizeEventTypeName(name: unknown): string {
	if (typeof name !== 'string') return 'Event';
	const trimmed = name.trim();
	if (trimmed === '' || trimmed.toLowerCase() === 'type') return 'Event';
	return trimmed;
}

/**
 * Forces every event-calendar field back to a valid value. Returns the input
 * object itself when every field is already valid, so the branch keeps its
 * identity like the other untouched branches of `normalizeSettings`.
 */
function normalizeEventCalendar(calendar: EventCalendarSettings): EventCalendarSettings {
	const normalized: EventCalendarSettings = {
		...calendar,
		weekStartsOn: calendar.weekStartsOn === 0 || calendar.weekStartsOn === 1 ? calendar.weekStartsOn : 1,
		timeFormat: calendar.timeFormat === '24h' || calendar.timeFormat === '12h' ? calendar.timeFormat : '24h',
		dayStartHour: clampDayStartHour(calendar.dayStartHour),
		defaultView: (EVENT_CALENDAR_VIEW_MODES as readonly string[]).includes(calendar.defaultView) ? calendar.defaultView : 'week',
		defaultDurationMinutes: clampEventDuration(calendar.defaultDurationMinutes),
		defaultColor: (EVENT_CALENDAR_COLORS as readonly string[]).includes(calendar.defaultColor) ? calendar.defaultColor : 'blue',
		eventTypeName: normalizeEventTypeName(calendar.eventTypeName),
	};
	const unchanged = (Object.keys(normalized) as (keyof EventCalendarSettings)[]).every(
		(key) => normalized[key] === calendar[key],
	);
	return unchanged ? calendar : normalized;
}

/** Vault contexts of the Todoist sync (design rule 8b); the only runtime copy of this list */
export const TODOIST_SYNC_CONTEXTS = ['work', 'personal'] as const;

/**
 * Rounds the Todoist sync interval to whole minutes, at least 1. A value that
 * is not a finite number (`null` or a string from a hand-edited settings.json,
 * NaN) becomes 5: `Math.round(null)` is 0, which would clamp to 1.
 */
export function clampSyncIntervalMinutes(minutes: number): number {
	if (typeof minutes !== 'number') return 5;
	const rounded = Math.round(minutes);
	if (!Number.isFinite(rounded)) return 5;
	return Math.max(1, rounded);
}

/**
 * Forces every Todoist sync field back to a valid value, keeping the input
 * object when every field already is (same identity rule as
 * `normalizeEventCalendar`). `apiToken` and `defaultLabel` pass through.
 */
function normalizeTodoist(todoist: TodoistSettings): TodoistSettings {
	const folder = typeof todoist.syncFolder === 'string' ? todoist.syncFolder.trim() : '';
	const normalized: TodoistSettings = {
		...todoist,
		syncEnabled: todoist.syncEnabled === true,
		syncFolder: folder === '' ? 'Todoist' : folder,
		syncIntervalMinutes: clampSyncIntervalMinutes(todoist.syncIntervalMinutes),
		syncContext: (TODOIST_SYNC_CONTEXTS as readonly string[]).includes(todoist.syncContext) ? todoist.syncContext : 'work',
		syncRootProjectId: typeof todoist.syncRootProjectId === 'string' ? todoist.syncRootProjectId : '',
		syncIncludeInbox: todoist.syncIncludeInbox === true,
	};
	const unchanged = (Object.keys(normalized) as (keyof TodoistSettings)[]).every(
		(key) => normalized[key] === todoist[key],
	);
	return unchanged ? todoist : normalized;
}

/** Clamps the three numeric fields of one heading level, keeping the rest as-is */
function normalizeHeadingLevel(level: HeadingLevelSettings): HeadingLevelSettings {
	return {
		...level,
		fontSize: clampHeadingFontSize(level.fontSize),
		lineHeight: clampHeadingLineHeight(level.lineHeight),
		letterSpacing: clampHeadingLetterSpacing(level.letterSpacing),
	};
}

/**
 * Returns a copy of `settings` with every clamped numeric field forced back
 * into its valid range. Applied when settings are read from disk and again
 * before they are written, so a hand-edited file and a value still sitting
 * uncommitted in an input both end up sane on disk.
 *
 * Only the clamped fields are rewritten: every other branch is carried through
 * by spread, so unrelated user data (themes, tag colors, disabled decorators)
 * keeps its identity and its key order.
 */
export function normalizeSettings(settings: AppSettings): AppSettings {
	const { editor } = settings;
	const headings = editor.headingTypography;
	return {
		...settings,
		editor: {
			...editor,
			fontSize: clampFontSize(editor.fontSize),
			lineHeight: clampLineHeight(editor.lineHeight),
			contentWidth: clampContentWidth(editor.contentWidth),
			paragraphSpacing: clampParagraphSpacing(editor.paragraphSpacing),
			headingTypography: {
				h1: normalizeHeadingLevel(headings.h1),
				h2: normalizeHeadingLevel(headings.h2),
				h3: normalizeHeadingLevel(headings.h3),
				h4: normalizeHeadingLevel(headings.h4),
				h5: normalizeHeadingLevel(headings.h5),
				h6: normalizeHeadingLevel(headings.h6),
			},
		},
		eventCalendar: normalizeEventCalendar(settings.eventCalendar),
		todoist: normalizeTodoist(settings.todoist),
	};
}

/** A single navigation item in the settings sidebar */
export interface SettingsSectionItem {
	id: SettingsSection;
	label: string;
}

/** A group of settings sections with an optional header */
export interface SettingsSectionGroup {
	group: string;
	sections: SettingsSectionItem[];
}

/** Navigation items for the settings sidebar, organized by group */
export const SETTINGS_SECTION_GROUPS: readonly SettingsSectionGroup[] = [
	{
		group: 'General',
		sections: [
			{ id: 'appearance', label: 'Appearance' },
			{ id: 'editor', label: 'Editor' },
			{ id: 'layout', label: 'Layout' },
		],
	},
	{
		group: 'Notes',
		sections: [
			{ id: 'types', label: 'Types' },
			{ id: 'periodic-notes', label: 'Periodic Notes' },
			{ id: 'quick-capture', label: 'Quick Capture' },
			{ id: 'one-on-one', label: '1:1 Notes' },
			{ id: 'event-calendar', label: 'Calendar' },
		],
	},
	{
		group: 'Vault',
		sections: [
			{ id: 'files', label: 'Files & Folders' },
			{ id: 'file-history', label: 'File History' },
			{ id: 'auto-move', label: 'Auto Move' },
			{ id: 'trash', label: 'Trash' },
		],
	},
	{
		group: 'Tools',
		sections: [
			{ id: 'search', label: 'Search' },
			{ id: 'queryjs', label: 'QueryJS' },
		],
	},
	{
		group: 'Integrations',
		sections: [{ id: 'todoist', label: 'Todoist' }],
	},
	{
		group: 'Advanced',
		sections: [
			{ id: 'labs', label: 'Labs' },
			{ id: 'sentry', label: 'Sentry' },
			{ id: 'troubleshooting', label: 'Troubleshooting' },
			{ id: 'update', label: 'Update' },
		],
	},
] as const;
