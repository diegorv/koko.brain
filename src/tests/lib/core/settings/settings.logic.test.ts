import { describe, it, expect } from 'vitest';
import type { AppSettings, EditorSettings, HeadingLevelSettings } from '#lib/core/settings/settings.types.js';
import { DEFAULT_SETTINGS } from '#lib/core/settings/settings.store.svelte.js';
import {
	clampFontSize,
	clampLineHeight,
	clampContentWidth,
	effectiveContentWidth,
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
	mergeLayout,
	migrateTypeScale,
} from '#lib/core/settings/settings.logic.js';

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

describe('effectiveContentWidth', () => {
	it('returns the configured content width for normal-width notes', () => {
		expect(effectiveContentWidth({ contentWidth: 800, wideNotes: false })).toBe(800);
	});

	it('returns 0 (full width) for wide notes, whatever the configured width', () => {
		expect(effectiveContentWidth({ contentWidth: 800, wideNotes: true })).toBe(0);
	});

	it('returns 0 when no content width is configured', () => {
		expect(effectiveContentWidth({ contentWidth: 0, wideNotes: false })).toBe(0);
		expect(effectiveContentWidth({ contentWidth: 0, wideNotes: true })).toBe(0);
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

describe('mergeLayout', () => {
	const defaults = DEFAULT_SETTINGS.layout;

	it('takes each saved value the defaults know, and fills the rest from the defaults', () => {
		const merged = mergeLayout(defaults, { railItem: 'files', noteListSize: 30, railFolder: null });
		expect(merged).toEqual({ ...defaults, railItem: 'files', noteListSize: 30, railFolder: null });
	});

	it('keeps the rail visibility, order and Inbox badge keys, whose defaults hide nothing and show the badge', () => {
		expect(defaults).toMatchObject({ railHidden: [], railOrder: [], railInboxBadge: true });
		const saved = { railHidden: ['archive'], railOrder: ['files', 'types'], railInboxBadge: false };
		expect(mergeLayout(defaults, saved)).toEqual({ ...defaults, ...saved });
		expect(mergeLayout(defaults, { railItem: 'inbox' }).railInboxBadge).toBe(true);
	});

	it('keeps a saved rail width, and an old file without one gets 192', () => {
		expect(mergeLayout(defaults, { railWidth: 260 }).railWidth).toBe(260);
		expect(mergeLayout(defaults, { railItem: 'inbox' }).railWidth).toBe(192);
	});

	it('drops the classic shell keys and any other key the defaults do not have', () => {
		const merged = mergeLayout(defaults, {
			shell: 'classic',
			railMigrated: true,
			sidebarMode: 'files',
			leftSidebarVisible: false,
			leftPaneSize: 30,
			middlePanelSize: 25,
			railPanelsVisible: false,
		});
		expect(merged).toEqual({ ...defaults, railPanelsVisible: false });
		for (const key of ['shell', 'railMigrated', 'sidebarMode', 'leftSidebarVisible', 'leftPaneSize', 'middlePanelSize']) {
			expect(merged).not.toHaveProperty(key);
		}
	});

	it('returns a copy of the defaults when there is no saved layout, or it is not an object', () => {
		expect(mergeLayout(defaults, undefined)).toEqual(defaults);
		expect(mergeLayout(defaults, null)).toEqual(defaults);
		expect(mergeLayout(defaults, 'classic')).toEqual(defaults);
		expect(mergeLayout(defaults, ['rail'])).toEqual(defaults);
		expect(mergeLayout(defaults, {})).not.toBe(defaults);
	});

	it('gives a 3.0.12 classic layout the rail default pane sizes', () => {
		const merged = mergeLayout(defaults, {
			sidebarMode: 'types',
			leftSidebarVisible: true,
			rightSidebarVisible: true,
			propertiesVisible: true,
			backlinksVisible: false,
			outgoingLinksVisible: true,
			tableOfContentsVisible: true,
			leftPaneSize: 25,
			middlePanelSize: 20,
			rightSidebarSize: 25,
		});
		expect(merged).toEqual({ ...defaults, rightSidebarVisible: true, backlinksVisible: false });
		expect(merged.rightSidebarSize).toBe(20);
	});

	it('resets the stale rail sizes of a classic layout but keeps a right sidebar size the user chose', () => {
		const merged = mergeLayout(defaults, { shell: 'classic', sidebarMode: 'files', navigatorSize: 25, noteListSize: 30, rightSidebarSize: 32 });
		expect(merged.navigatorSize).toBe(defaults.navigatorSize);
		expect(merged.noteListSize).toBe(defaults.noteListSize);
		expect(merged.rightSidebarSize).toBe(32);
	});

	it('keeps the pane sizes of a layout already on the rail', () => {
		const sizes = { navigatorSize: 18, noteListSize: 26, rightSidebarSize: 25 };
		expect(mergeLayout(defaults, { shell: 'rail', railMigrated: true, ...sizes })).toEqual({ ...defaults, ...sizes });
		expect(mergeLayout(defaults, { shell: 'classic', railMigrated: true, sidebarMode: 'files', ...sizes })).toEqual({ ...defaults, ...sizes });
		expect(mergeLayout(defaults, { shell: 'rail', ...sizes })).toEqual({ ...defaults, ...sizes });
	});

	it('keeps the pane sizes of a layout this build wrote back, so the reset runs once', () => {
		const sizes = { navigatorSize: 18, noteListSize: 26, rightSidebarSize: 25 };
		expect(mergeLayout(defaults, { railItem: 'files', ...sizes })).toEqual({ ...defaults, railItem: 'files', ...sizes });
	});

	it('defaults railListPrefs to an empty record', () => {
		expect(defaults.railListPrefs).toEqual({});
	});

	it('keeps a saved railListPrefs record across a load', () => {
		const saved = { 'type:task': { sort: 'modified:desc', properties: ['status', '_belongs_to'] }, folder: { sort: 'title:asc' } };
		expect(mergeLayout(defaults, { railListPrefs: saved }).railListPrefs).toEqual(saved);
	});
});

describe('SETTINGS_SECTION_GROUPS', () => {
	it('contains all expected groups in order', () => {
		const groups = SETTINGS_SECTION_GROUPS.map((g) => g.group);
		expect(groups).toEqual(['General', 'Notes', 'Vault', 'Tools', 'Integrations', 'Advanced', 'Labs']);
	});

	it('contains all expected sections in order', () => {
		const ids = SETTINGS_SECTION_GROUPS.flatMap((g) => g.sections.map((s) => s.id));
		expect(ids).toEqual(['appearance', 'editor', 'layout', 'types', 'periodic-notes', 'quick-capture', 'one-on-one', 'event-calendar', 'files', 'file-history', 'auto-move', 'trash', 'search', 'queryjs', 'todoist', 'sentry', 'troubleshooting', 'update', 'labs']);
	});

	it('keeps Labs last, with the one Labs section', () => {
		expect(SETTINGS_SECTION_GROUPS.at(-1)).toEqual({ group: 'Labs', sections: [{ id: 'labs', label: 'Labs' }] });
	});

	it('lists Layout last in the General group', () => {
		const general = SETTINGS_SECTION_GROUPS.find((g) => g.group === 'General');
		expect(general?.sections.at(-1)).toEqual({ id: 'layout', label: 'Layout' });
	});

	it('lists Files & Folders first in the Vault group', () => {
		const vault = SETTINGS_SECTION_GROUPS.find((g) => g.group === 'Vault');
		expect(vault?.sections[0]).toEqual({ id: 'files', label: 'Files & Folders' });
		expect(vault?.sections.map((s) => s.id)).toEqual(['files', 'file-history', 'auto-move', 'trash']);
	});

	it('keeps Search and QueryJS in Tools', () => {
		const tools = SETTINGS_SECTION_GROUPS.find((g) => g.group === 'Tools');
		expect(tools?.sections.map((s) => s.id)).toEqual(['search', 'queryjs']);
	});

	it('moves Sentry out of Integrations and into Advanced', () => {
		const sections = (name: string) => SETTINGS_SECTION_GROUPS.find((g) => g.group === name)?.sections.map((s) => s.id);
		expect(sections('Integrations')).toEqual(['todoist']);
		expect(sections('Advanced')).toEqual(['sentry', 'troubleshooting', 'update']);
	});

	it('lists Calendar in the Notes group', () => {
		const notes = SETTINGS_SECTION_GROUPS.find((g) => g.group === 'Notes');
		expect(notes?.sections).toContainEqual({ id: 'event-calendar', label: 'Calendar' });
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
		expect(eventCalendar.timeFormat).toBe('24h');
		expect(eventCalendar.defaultView).toBe('week');
		expect(eventCalendar.defaultColor).toBe('blue');
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
			showTasks: false,
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

describe('migrateTypeScale', () => {
	/** H4-H6 as every release before the distinct heading scale saved them */
	const OLD_H4_TO_H6: HeadingLevelSettings = { fontSize: 1.0, lineHeight: 1.6, fontWeight: 'bold', letterSpacing: 0 };

	/** A saved editor block from before the migration */
	function saved(editor: Record<string, unknown>): Partial<EditorSettings> {
		return editor as Partial<EditorSettings>;
	}

	it('scales the saved font size by the removed 1.05 multiplier and rounds it', () => {
		expect(migrateTypeScale(saved({ fontSize: 18 }))?.fontSize).toBe(19);
		expect(migrateTypeScale(saved({ fontSize: 14 }))?.fontSize).toBe(15);
		expect(migrateTypeScale(saved({ fontSize: 20 }))?.fontSize).toBe(21);
	});

	it('marks the block migrated', () => {
		expect(migrateTypeScale(saved({ fontSize: 18 }))?.typeScaleMigrated).toBe(true);
		expect(migrateTypeScale(saved({}))?.typeScaleMigrated).toBe(true);
	});

	it('runs once: a migrated block comes back unchanged', () => {
		const once = migrateTypeScale(saved({ fontSize: 18 }));
		const twice = migrateTypeScale(once);
		expect(twice).toBe(once);
		expect(twice?.fontSize).toBe(19);
	});

	it('leaves a missing editor block and a missing font size alone', () => {
		expect(migrateTypeScale(undefined)).toBeUndefined();
		expect(migrateTypeScale(saved({ lineHeight: 1.8 }))).toEqual({ lineHeight: 1.8, typeScaleMigrated: true });
	});

	it('drops H4-H6 levels still at the old default, so the new defaults fill them', () => {
		const out = migrateTypeScale(saved({
			headingTypography: { h4: OLD_H4_TO_H6, h5: OLD_H4_TO_H6, h6: { fontSize: 1 } },
		}));
		expect(out?.headingTypography).toEqual({});
	});

	it('keeps a customized level and every H1-H3 level', () => {
		const h1 = DEFAULT_SETTINGS.editor.headingTypography.h1;
		const h4 = { ...OLD_H4_TO_H6, fontSize: 1.3 };
		const h6 = { ...OLD_H4_TO_H6, fontWeight: 'normal' };
		const out = migrateTypeScale(saved({ headingTypography: { h1, h4, h5: OLD_H4_TO_H6, h6 } }));
		expect(out?.headingTypography).toEqual({ h1, h4, h6 });
	});

	it('does not change its input', () => {
		const input = saved({ fontSize: 18, headingTypography: { h4: { ...OLD_H4_TO_H6 } } });
		migrateTypeScale(input);
		expect(input).toEqual({ fontSize: 18, headingTypography: { h4: OLD_H4_TO_H6 } });
	});
});
