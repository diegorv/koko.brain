import { describe, it, expect } from 'vitest';
import type { AppSettings } from '$lib/core/settings/settings.types';
import { DEFAULT_SETTINGS } from '$lib/core/settings/settings.store.svelte';
import {
	clampFontSize,
	clampLineHeight,
	clampContentWidth,
	clampParagraphSpacing,
	clampHeadingFontSize,
	clampHeadingLineHeight,
	clampHeadingLetterSpacing,
	clampDayStartHour,
	clampEventDuration,
	normalizeEventTypeName,
	normalizeSettings,
	EVENT_CALENDAR_COLORS,
	EVENT_CALENDAR_VIEW_MODES,
	SETTINGS_SECTION_GROUPS,
} from '$lib/core/settings/settings.logic';

describe('clampFontSize', () => {
	it('clamps below minimum to 8', () => {
		expect(clampFontSize(4)).toBe(8);
	});

	it('clamps above maximum to 32', () => {
		expect(clampFontSize(48)).toBe(32);
	});

	it('returns value within range', () => {
		expect(clampFontSize(14)).toBe(14);
	});

	it('clamps boundary values', () => {
		expect(clampFontSize(8)).toBe(8);
		expect(clampFontSize(32)).toBe(32);
	});
});

describe('clampLineHeight', () => {
	it('clamps below minimum to 1.0', () => {
		expect(clampLineHeight(0.5)).toBe(1.0);
	});

	it('clamps above maximum to 3.0', () => {
		expect(clampLineHeight(4.0)).toBe(3.0);
	});

	it('returns value within range', () => {
		expect(clampLineHeight(1.6)).toBe(1.6);
	});
});

describe('clampContentWidth', () => {
	it('returns 0 for zero (no limit)', () => {
		expect(clampContentWidth(0)).toBe(0);
	});

	it('returns 0 for negative values', () => {
		expect(clampContentWidth(-100)).toBe(0);
	});

	it('clamps below minimum to 400', () => {
		expect(clampContentWidth(200)).toBe(400);
	});

	it('clamps above maximum to 2000', () => {
		expect(clampContentWidth(3000)).toBe(2000);
	});

	it('returns value within range', () => {
		expect(clampContentWidth(800)).toBe(800);
	});

	it('clamps boundary values', () => {
		expect(clampContentWidth(400)).toBe(400);
		expect(clampContentWidth(2000)).toBe(2000);
	});
});

describe('clampParagraphSpacing', () => {
	it('clamps below minimum to 0', () => {
		expect(clampParagraphSpacing(-1)).toBe(0);
	});

	it('clamps above maximum to 2.0', () => {
		expect(clampParagraphSpacing(3)).toBe(2.0);
	});

	it('returns value within range', () => {
		expect(clampParagraphSpacing(0.5)).toBe(0.5);
	});

	it('clamps boundary values', () => {
		expect(clampParagraphSpacing(0)).toBe(0);
		expect(clampParagraphSpacing(2.0)).toBe(2.0);
	});
});

describe('clampHeadingFontSize', () => {
	it('clamps below minimum to 0.5', () => {
		expect(clampHeadingFontSize(0.2)).toBe(0.5);
	});

	it('clamps above maximum to 5.0', () => {
		expect(clampHeadingFontSize(6)).toBe(5.0);
	});

	it('returns value within range', () => {
		expect(clampHeadingFontSize(2.058)).toBe(2.058);
	});

	it('clamps boundary values', () => {
		expect(clampHeadingFontSize(0.5)).toBe(0.5);
		expect(clampHeadingFontSize(5.0)).toBe(5.0);
	});
});

describe('clampHeadingLineHeight', () => {
	it('clamps below minimum to 1.0', () => {
		expect(clampHeadingLineHeight(0.5)).toBe(1.0);
	});

	it('clamps above maximum to 3.0', () => {
		expect(clampHeadingLineHeight(4.0)).toBe(3.0);
	});

	it('returns value within range', () => {
		expect(clampHeadingLineHeight(1.4)).toBe(1.4);
	});

	it('clamps boundary values', () => {
		expect(clampHeadingLineHeight(1.0)).toBe(1.0);
		expect(clampHeadingLineHeight(3.0)).toBe(3.0);
	});
});

describe('clampHeadingLetterSpacing', () => {
	it('clamps below minimum to -0.1', () => {
		expect(clampHeadingLetterSpacing(-0.2)).toBe(-0.1);
	});

	it('clamps above maximum to 0.1', () => {
		expect(clampHeadingLetterSpacing(0.2)).toBe(0.1);
	});

	it('returns value within range', () => {
		expect(clampHeadingLetterSpacing(-0.02)).toBe(-0.02);
	});

	it('returns zero for zero input', () => {
		expect(clampHeadingLetterSpacing(0)).toBe(0);
	});

	it('clamps boundary values', () => {
		expect(clampHeadingLetterSpacing(-0.1)).toBe(-0.1);
		expect(clampHeadingLetterSpacing(0.1)).toBe(0.1);
	});
});

describe('EVENT_CALENDAR_COLORS', () => {
	it('lists the six event colors in order', () => {
		expect(EVENT_CALENDAR_COLORS).toEqual(['green', 'purple', 'cyan', 'orange', 'pink', 'blue']);
	});
});

describe('EVENT_CALENDAR_VIEW_MODES', () => {
	it('lists the three view modes in order', () => {
		expect(EVENT_CALENDAR_VIEW_MODES).toEqual(['day', 'week', 'month']);
	});
});

describe('clampDayStartHour', () => {
	it('clamps below 0 to 0', () => {
		expect(clampDayStartHour(-3)).toBe(0);
	});

	it('clamps above 12 to 12', () => {
		expect(clampDayStartHour(20)).toBe(12);
	});

	it('rounds a fractional hour to an integer', () => {
		expect(clampDayStartHour(7.4)).toBe(7);
		expect(clampDayStartHour(7.6)).toBe(8);
	});

	it('keeps boundary and in-range values', () => {
		expect(clampDayStartHour(0)).toBe(0);
		expect(clampDayStartHour(7)).toBe(7);
		expect(clampDayStartHour(12)).toBe(12);
	});

	it('turns a non-finite value into 0', () => {
		expect(clampDayStartHour(Number.NaN)).toBe(0);
	});
});

describe('clampEventDuration', () => {
	it('clamps below 15 to 15', () => {
		expect(clampEventDuration(0)).toBe(15);
		expect(clampEventDuration(-60)).toBe(15);
	});

	it('clamps above 480 to 480', () => {
		expect(clampEventDuration(600)).toBe(480);
	});

	it('rounds to the nearest multiple of 15', () => {
		expect(clampEventDuration(50)).toBe(45);
		expect(clampEventDuration(53)).toBe(60);
	});

	it('keeps boundary and in-range multiples of 15', () => {
		expect(clampEventDuration(15)).toBe(15);
		expect(clampEventDuration(60)).toBe(60);
		expect(clampEventDuration(480)).toBe(480);
	});

	it('turns a non-finite value into 15', () => {
		expect(clampEventDuration(Number.NaN)).toBe(15);
	});
});

describe('normalizeEventTypeName', () => {
	it('trims surrounding whitespace', () => {
		expect(normalizeEventTypeName(' Meeting ')).toBe('Meeting');
	});

	it('turns an empty or blank value into Event', () => {
		expect(normalizeEventTypeName('')).toBe('Event');
		expect(normalizeEventTypeName('  ')).toBe('Event');
	});

	it('turns Type in any case into Event', () => {
		expect(normalizeEventTypeName('type')).toBe('Event');
		expect(normalizeEventTypeName('Type')).toBe('Event');
		expect(normalizeEventTypeName(' TYPE ')).toBe('Event');
	});

	it('turns a non-string into Event', () => {
		expect(normalizeEventTypeName(42)).toBe('Event');
		expect(normalizeEventTypeName(null)).toBe('Event');
		expect(normalizeEventTypeName(undefined)).toBe('Event');
	});

	it('keeps a valid name', () => {
		expect(normalizeEventTypeName('Event')).toBe('Event');
	});
});

describe('SETTINGS_SECTION_GROUPS', () => {
	it('contains all expected groups in order', () => {
		const groups = SETTINGS_SECTION_GROUPS.map((g) => g.group);
		expect(groups).toEqual(['General', 'Notes', 'Tools', 'Integrations', 'Advanced']);
	});

	it('contains all expected sections in order', () => {
		const ids = SETTINGS_SECTION_GROUPS.flatMap((g) => g.sections.map((s) => s.id));
		expect(ids).toEqual(['appearance', 'editor', 'sidebar', 'keybindings', 'periodic-notes', 'quick-capture', 'one-on-one', 'templates', 'types', 'search', 'file-history', 'auto-move', 'trash', 'queryjs', 'todoist', 'sentry', 'troubleshooting', 'update']);
	});

	it('has labels for every section', () => {
		for (const group of SETTINGS_SECTION_GROUPS) {
			for (const section of group.sections) {
				expect(section.label).toBeTruthy();
			}
		}
	});
});

describe('normalizeSettings', () => {
	/** A fresh, fully in-range AppSettings for a case to push out of range */
	function fixture(): AppSettings {
		return structuredClone(DEFAULT_SETTINGS);
	}

	it('clamps every out-of-range editor value', () => {
		const settings = fixture();
		settings.editor.fontSize = 999;
		settings.editor.lineHeight = 9;
		settings.editor.contentWidth = 50;
		settings.editor.paragraphSpacing = 9;

		const normalized = normalizeSettings(settings);

		expect(normalized.editor.fontSize).toBe(32);
		expect(normalized.editor.lineHeight).toBe(3);
		expect(normalized.editor.contentWidth).toBe(400);
		expect(normalized.editor.paragraphSpacing).toBe(2);
	});

	it('keeps a content width of 0 as the "no limit" sentinel', () => {
		const settings = fixture();
		settings.editor.contentWidth = 0;

		expect(normalizeSettings(settings).editor.contentWidth).toBe(0);
	});

	it('clamps out-of-range heading typography on any level', () => {
		const settings = fixture();
		settings.editor.headingTypography.h1.fontSize = 99;
		settings.editor.headingTypography.h3.letterSpacing = 5;
		settings.editor.headingTypography.h6.lineHeight = 0.1;

		const normalized = normalizeSettings(settings);

		expect(normalized.editor.headingTypography.h1.fontSize).toBe(5);
		expect(normalized.editor.headingTypography.h3.letterSpacing).toBe(0.1);
		expect(normalized.editor.headingTypography.h6.lineHeight).toBe(1);
	});

	it('leaves non-numeric heading fields alone', () => {
		const settings = fixture();
		settings.editor.headingTypography.h2.fontWeight = 'normal';

		expect(normalizeSettings(settings).editor.headingTypography.h2.fontWeight).toBe('normal');
	});

	it('returns in-range settings unchanged, down to the serialized bytes', () => {
		const settings = fixture();

		expect(JSON.stringify(normalizeSettings(settings), null, 2)).toBe(
			JSON.stringify(settings, null, 2),
		);
	});

	it('carries unrelated branches through by reference instead of rebuilding them', () => {
		const settings = fixture();

		const normalized = normalizeSettings(settings);

		expect(normalized.appearance).toBe(settings.appearance);
		expect(normalized.tagColors).toBe(settings.tagColors);
		expect(normalized.disabledDecorators).toBe(settings.disabledDecorators);
	});

	it('replaces an eventCalendar weekStartsOn other than 0 or 1 with 1', () => {
		const settings = fixture();
		(settings.eventCalendar as { weekStartsOn: number }).weekStartsOn = 3;

		expect(normalizeSettings(settings).eventCalendar.weekStartsOn).toBe(1);
	});

	it('keeps an eventCalendar weekStartsOn of 0', () => {
		const settings = fixture();
		settings.eventCalendar.weekStartsOn = 0;

		expect(normalizeSettings(settings).eventCalendar.weekStartsOn).toBe(0);
	});

	it('replaces an unknown eventCalendar timeFormat, defaultView and defaultColor with valid values', () => {
		const settings = fixture();
		(settings.eventCalendar as { timeFormat: string }).timeFormat = '36h';
		(settings.eventCalendar as { defaultView: string }).defaultView = 'year';
		(settings.eventCalendar as { defaultColor: string }).defaultColor = 'red';

		const { eventCalendar } = normalizeSettings(settings);

		expect(['24h', '12h']).toContain(eventCalendar.timeFormat);
		expect(EVENT_CALENDAR_VIEW_MODES).toContain(eventCalendar.defaultView);
		expect(EVENT_CALENDAR_COLORS).toContain(eventCalendar.defaultColor);
	});

	it('runs eventCalendar numbers and the type name through their helpers', () => {
		const settings = fixture();
		settings.eventCalendar.dayStartHour = 20;
		settings.eventCalendar.defaultDurationMinutes = 53;
		settings.eventCalendar.eventTypeName = 'type';

		const { eventCalendar } = normalizeSettings(settings);

		expect(eventCalendar.dayStartHour).toBe(12);
		expect(eventCalendar.defaultDurationMinutes).toBe(60);
		expect(eventCalendar.eventTypeName).toBe('Event');
	});

	it('keeps a valid eventCalendar branch by reference', () => {
		const settings = fixture();
		settings.eventCalendar = {
			weekStartsOn: 0,
			timeFormat: '12h',
			dayStartHour: 6,
			showWeekends: false,
			defaultView: 'month',
			defaultDurationMinutes: 30,
			defaultColor: 'pink',
			eventTypeName: 'Meeting',
		};

		expect(normalizeSettings(settings).eventCalendar).toBe(settings.eventCalendar);
	});

	it('rebuilds an invalid eventCalendar branch without mutating its input', () => {
		const settings = fixture();
		settings.eventCalendar.dayStartHour = 20;

		const normalized = normalizeSettings(settings);

		expect(normalized.eventCalendar).not.toBe(settings.eventCalendar);
		expect(settings.eventCalendar.dayStartHour).toBe(20);
		expect(normalized.eventCalendar.showWeekends).toBe(settings.eventCalendar.showWeekends);
	});

	it('does not mutate its input', () => {
		const settings = fixture();
		settings.editor.fontSize = 999;

		normalizeSettings(settings);

		expect(settings.editor.fontSize).toBe(999);
	});
});
