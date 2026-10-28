import { clamp } from '$lib/utils/clamp';
import type { AppSettings, EventCalendarSettings, HeadingLevelSettings, SettingsSection } from './settings.types';

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
			{ id: 'sidebar', label: 'Sidebar' },
			{ id: 'keybindings', label: 'Keybindings' },
		],
	},
	{
		group: 'Notes',
		sections: [
			{ id: 'periodic-notes', label: 'Periodic Notes' },
			{ id: 'quick-capture', label: 'Quick Capture' },
			{ id: 'one-on-one', label: '1:1 Notes' },
			{ id: 'templates', label: 'Templates' },
			{ id: 'types', label: 'Types' },
			{ id: 'event-calendar', label: 'Calendar' },
		],
	},
	{
		group: 'Tools',
		sections: [
			{ id: 'search', label: 'Search' },
			{ id: 'file-history', label: 'File History' },
			{ id: 'auto-move', label: 'Auto Move' },
			{ id: 'trash', label: 'Trash' },
			{ id: 'queryjs', label: 'QueryJS' },
		],
	},
	{
		group: 'Integrations',
		sections: [
			{ id: 'todoist', label: 'Todoist' },
			{ id: 'sentry', label: 'Sentry' },
		],
	},
	{
		group: 'Advanced',
		sections: [
			{ id: 'troubleshooting', label: 'Troubleshooting' },
			{ id: 'update', label: 'Update' },
		],
	},
] as const;
