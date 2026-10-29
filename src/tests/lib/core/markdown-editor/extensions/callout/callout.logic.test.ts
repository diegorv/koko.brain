import { describe, it, expect } from 'vitest';
import {
	parseCalloutLine,
	matchCalloutHeader,
	CALLOUT_COLORS,
} from '#lib/core/markdown-editor/extensions/callout/callout.logic.js';

describe('parseCalloutLine', () => {
	it('parses a standard note callout', () => {
		const result = parseCalloutLine('> [!NOTE]');
		expect(result).toEqual({ type: 'note', color: 'var(--callout-note)' });
	});

	it('is case insensitive', () => {
		const result = parseCalloutLine('> [!Warning]');
		expect(result).toEqual({ type: 'warning', color: 'var(--callout-warning)' });
	});

	it('returns default note var for unknown types', () => {
		const result = parseCalloutLine('> [!custom]');
		expect(result).toEqual({ type: 'custom', color: 'var(--callout-note)' });
	});

	it('returns null for regular blockquotes', () => {
		expect(parseCalloutLine('> regular text')).toBeNull();
	});

	it('returns null for plain text', () => {
		expect(parseCalloutLine('Not a callout')).toBeNull();
	});

	it('handles fold marker +', () => {
		const result = parseCalloutLine('> [!NOTE]+');
		expect(result).toEqual({ type: 'note', color: 'var(--callout-note)' });
	});

	it('handles fold marker -', () => {
		const result = parseCalloutLine('> [!TIP]-');
		expect(result).toEqual({ type: 'tip', color: 'var(--callout-tip)' });
	});

	it('maps tip to tip var', () => {
		expect(parseCalloutLine('> [!tip]')?.color).toBe('var(--callout-tip)');
	});

	it('maps caution to caution var', () => {
		expect(parseCalloutLine('> [!caution]')?.color).toBe('var(--callout-caution)');
	});

	it('maps example to important var', () => {
		expect(parseCalloutLine('> [!example]')?.color).toBe('var(--callout-important)');
	});

	it('maps quote to quote var', () => {
		expect(parseCalloutLine('> [!quote]')?.color).toBe('var(--callout-quote)');
	});

	it('handles extra spaces after >', () => {
		const result = parseCalloutLine('>   [!NOTE]');
		expect(result).toEqual({ type: 'note', color: 'var(--callout-note)' });
	});

	it('parses callout types with hyphens', () => {
		const result = parseCalloutLine('> [!my-type]');
		expect(result).not.toBeNull();
		expect(result!.type).toBe('my-type');
		expect(result!.color).toBe('var(--callout-note)');
	});

	it('parses hyphenated callout with fold marker', () => {
		const result = parseCalloutLine('> [!my-custom-type]+');
		expect(result).not.toBeNull();
		expect(result!.type).toBe('my-custom-type');
	});
});

describe('matchCalloutHeader', () => {
	it('matches type, fold marker, raw title and marker length', () => {
		expect(matchCalloutHeader('> [!Tip]+ Pro tip')).toEqual({
			type: 'tip',
			foldable: '+',
			rawTitle: 'Pro tip',
			markerLength: '> [!Tip]+ '.length,
		});
	});

	it('keeps trailing spaces in the raw title so the marker ends before the title', () => {
		const match = matchCalloutHeader('> [!note] Title   ');
		expect(match).not.toBeNull();
		expect(match!.rawTitle).toBe('Title   ');
		expect(match!.markerLength).toBe('> [!note] '.length);
	});

	it('swallows whitespace-only remainder into the marker', () => {
		expect(matchCalloutHeader('> [!note]   ')).toEqual({
			type: 'note',
			foldable: null,
			rawTitle: '',
			markerLength: '> [!note]   '.length,
		});
	});

	it('matches nested headers with several > prefixes', () => {
		expect(matchCalloutHeader('> > [!note] Inner')?.type).toBe('note');
		expect(matchCalloutHeader('>>[!note]')?.type).toBe('note');
	});

	it('returns null for plain blockquotes, plain text and a bare [!type]', () => {
		expect(matchCalloutHeader('> quote')).toBeNull();
		expect(matchCalloutHeader('text')).toBeNull();
		expect(matchCalloutHeader('[!note]')).toBeNull();
		expect(matchCalloutHeader('')).toBeNull();
	});
});

describe('parseCalloutLine on nested headers', () => {
	it('parses a nested `> > [!type]` header like the live-preview parser does', () => {
		expect(parseCalloutLine('> > [!warning] Deep')).toEqual({ type: 'warning', color: 'var(--callout-warning)' });
	});
});

describe('CALLOUT_COLORS', () => {
	it('has all expected callout types', () => {
		const expectedTypes = [
			'note', 'tip', 'important', 'warning', 'caution',
			'abstract', 'summary', 'info', 'todo',
			'success', 'check', 'done',
			'question', 'help', 'faq',
			'failure', 'fail', 'missing', 'danger', 'error', 'bug',
			'example', 'quote', 'cite',
		];
		for (const type of expectedTypes) {
			expect(CALLOUT_COLORS[type]).toBeDefined();
		}
	});

	it('all values are CSS variable references', () => {
		for (const value of Object.values(CALLOUT_COLORS)) {
			expect(value).toMatch(/^var\(--callout-/);
		}
	});
});
