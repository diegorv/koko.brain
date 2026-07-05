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
	normalizeSettings,
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

describe('SETTINGS_SECTION_GROUPS', () => {
	it('contains all expected groups in order', () => {
		const groups = SETTINGS_SECTION_GROUPS.map((g) => g.group);
		expect(groups).toEqual(['General', 'Notes', 'Tools', 'Integrations', 'Advanced']);
	});

	it('contains all expected sections in order', () => {
		const ids = SETTINGS_SECTION_GROUPS.flatMap((g) => g.sections.map((s) => s.id));
		expect(ids).toEqual(['appearance', 'editor', 'sidebar', 'keybindings', 'periodic-notes', 'quick-capture', 'one-on-one', 'templates', 'types', 'search', 'file-history', 'auto-move', 'trash', 'queryjs', 'todoist', 'sync', 'troubleshooting', 'update']);
	});

	it('has labels for every section', () => {
		for (const group of SETTINGS_SECTION_GROUPS) {
			for (const section of group.sections) {
				expect(section.label).toBeTruthy();
			}
		}
	});

	it('registers the sync section under Integrations', () => {
		const integrations = SETTINGS_SECTION_GROUPS.find((g) => g.group === 'Integrations');
		expect(integrations?.sections).toContainEqual({ id: 'sync', label: 'Sync' });
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

	it('does not mutate its input', () => {
		const settings = fixture();
		settings.editor.fontSize = 999;

		normalizeSettings(settings);

		expect(settings.editor.fontSize).toBe(999);
	});
});
