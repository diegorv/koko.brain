import { describe, it, expect } from 'vitest';
import {
	clampFontSize,
	clampLineHeight,
	clampContentWidth,
	clampParagraphSpacing,
	clampTerminalFontSize,
	clampTerminalLineHeight,
	clampHeadingFontSize,
	clampHeadingLineHeight,
	clampHeadingLetterSpacing,
	isValidFolderName,
	SETTINGS_SECTIONS,
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

describe('clampTerminalFontSize', () => {
	it('clamps below minimum to 8', () => {
		expect(clampTerminalFontSize(4)).toBe(8);
	});

	it('clamps above maximum to 24', () => {
		expect(clampTerminalFontSize(30)).toBe(24);
	});

	it('returns value within range', () => {
		expect(clampTerminalFontSize(16)).toBe(16);
	});

	it('clamps boundary values', () => {
		expect(clampTerminalFontSize(8)).toBe(8);
		expect(clampTerminalFontSize(24)).toBe(24);
	});
});

describe('clampTerminalLineHeight', () => {
	it('clamps below minimum to 1.0', () => {
		expect(clampTerminalLineHeight(0.5)).toBe(1.0);
	});

	it('clamps above maximum to 2.0', () => {
		expect(clampTerminalLineHeight(2.5)).toBe(2.0);
	});

	it('returns value within range', () => {
		expect(clampTerminalLineHeight(1.5)).toBe(1.5);
	});

	it('clamps boundary values', () => {
		expect(clampTerminalLineHeight(1.0)).toBe(1.0);
		expect(clampTerminalLineHeight(2.0)).toBe(2.0);
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

describe('isValidFolderName', () => {
	it('rejects empty strings', () => {
		expect(isValidFolderName('')).toBe(false);
	});

	it('rejects whitespace-only strings', () => {
		expect(isValidFolderName('   ')).toBe(false);
	});

	it('rejects absolute paths', () => {
		expect(isValidFolderName('/foo')).toBe(false);
	});

	it('rejects parent traversal', () => {
		expect(isValidFolderName('../foo')).toBe(false);
	});

	it('rejects mid-path traversal', () => {
		expect(isValidFolderName('foo/../bar')).toBe(false);
	});

	it('rejects trailing parent traversal', () => {
		expect(isValidFolderName('foo/..')).toBe(false);
	});

	it('rejects standalone double dots', () => {
		expect(isValidFolderName('..')).toBe(false);
	});

	it('accepts names containing double dots (not traversal)', () => {
		expect(isValidFolderName('my..folder')).toBe(true);
		expect(isValidFolderName('notes...archive')).toBe(true);
	});

	it('accepts simple folder names', () => {
		expect(isValidFolderName('_templates')).toBe(true);
	});

	it('accepts nested paths', () => {
		expect(isValidFolderName('notes/templates')).toBe(true);
	});
});

describe('SETTINGS_SECTION_GROUPS', () => {
	it('contains all expected groups in order', () => {
		const groups = SETTINGS_SECTION_GROUPS.map((g) => g.group);
		expect(groups).toEqual(['General', 'Notes', 'Tools', 'Integrations', 'Advanced']);
	});

	it('contains all expected sections in order', () => {
		const ids = SETTINGS_SECTION_GROUPS.flatMap((g) => g.sections.map((s) => s.id));
		expect(ids).toEqual(['appearance', 'editor', 'sidebar', 'periodic-notes', 'quick-note', 'one-on-one', 'templates', 'search', 'file-history', 'auto-move', 'trash', 'terminal', 'todoist', 'security', 'troubleshooting']);
	});

	it('has labels for every section', () => {
		for (const group of SETTINGS_SECTION_GROUPS) {
			for (const section of group.sections) {
				expect(section.label).toBeTruthy();
			}
		}
	});
});

describe('SETTINGS_SECTIONS', () => {
	it('is a flat list derived from groups', () => {
		const ids = SETTINGS_SECTIONS.map((s) => s.id);
		const groupIds = SETTINGS_SECTION_GROUPS.flatMap((g) => g.sections.map((s) => s.id));
		expect(ids).toEqual(groupIds);
	});
});
