import { describe, it, expect } from 'vitest';
import {
	parseCalloutHeader,
	findAllCallouts,
} from '$lib/core/markdown-editor/extensions/live-preview/parsers/callout';
import { createMarkdownState } from '../../../test-helpers';

describe('parseCalloutHeader', () => {
	it('detects > [!note] callout', () => {
		const result = parseCalloutHeader('> [!note]', 0);
		expect(result).not.toBeNull();
		expect(result!.type).toBe('note');
		expect(result!.color).toBe('var(--callout-note)');
		expect(result!.foldable).toBeNull();
		expect(result!.title).toBe('');
	});

	it('detects > [!warning] with custom title', () => {
		const result = parseCalloutHeader('> [!warning] Be careful!', 0);
		expect(result).not.toBeNull();
		expect(result!.type).toBe('warning');
		expect(result!.color).toBe('var(--callout-warning)');
		expect(result!.title).toBe('Be careful!');
	});

	it('detects > [!tip]+ foldable open', () => {
		const result = parseCalloutHeader('> [!tip]+', 0);
		expect(result).not.toBeNull();
		expect(result!.type).toBe('tip');
		expect(result!.foldable).toBe('+');
	});

	it('detects > [!tip]- foldable closed', () => {
		const result = parseCalloutHeader('> [!tip]-', 0);
		expect(result).not.toBeNull();
		expect(result!.type).toBe('tip');
		expect(result!.foldable).toBe('-');
	});

	it('detects > [!tip]+ with title', () => {
		const result = parseCalloutHeader('> [!tip]+ Pro tip', 0);
		expect(result).not.toBeNull();
		expect(result!.type).toBe('tip');
		expect(result!.foldable).toBe('+');
		expect(result!.title).toBe('Pro tip');
	});

	it('returns null for plain blockquote', () => {
		expect(parseCalloutHeader('> just text', 0)).toBeNull();
	});

	it('returns null for plain text', () => {
		expect(parseCalloutHeader('regular text', 0)).toBeNull();
	});

	it('applies offset correctly', () => {
		const result = parseCalloutHeader('> [!note]', 100);
		expect(result).not.toBeNull();
		expect(result!.markerFrom).toBe(100);
	});

	it('detects case-insensitive callout types', () => {
		const result = parseCalloutHeader('> [!NOTE]', 0);
		expect(result).not.toBeNull();
		expect(result!.type).toBe('note');
	});

	it('uses default color for unknown type', () => {
		const result = parseCalloutHeader('> [!custom]', 0);
		expect(result).not.toBeNull();
		expect(result!.type).toBe('custom');
		expect(result!.color).toBe('#60a5fa');
	});

	it('detects hyphenated callout types', () => {
		const result = parseCalloutHeader('> [!check-mark]', 0);
		expect(result).not.toBeNull();
		expect(result!.type).toBe('check-mark');
	});

	it('detects hyphenated type with title', () => {
		const result = parseCalloutHeader('> [!to-do] My tasks', 0);
		expect(result).not.toBeNull();
		expect(result!.type).toBe('to-do');
		expect(result!.title).toBe('My tasks');
	});

	it('detects hyphenated type with foldable', () => {
		const result = parseCalloutHeader('> [!check-mark]+ Title', 0);
		expect(result).not.toBeNull();
		expect(result!.type).toBe('check-mark');
		expect(result!.foldable).toBe('+');
		expect(result!.title).toBe('Title');
	});

	it('detects nested callout with double > prefix', () => {
		const result = parseCalloutHeader('> > [!tip] Nested', 0);
		expect(result).not.toBeNull();
		expect(result!.type).toBe('tip');
		expect(result!.title).toBe('Nested');
	});

	it('detects deeply nested callout with triple > prefix', () => {
		const result = parseCalloutHeader('> > > [!warning] Deep', 0);
		expect(result).not.toBeNull();
		expect(result!.type).toBe('warning');
		expect(result!.title).toBe('Deep');
	});

	it('detects all standard callout types', () => {
		const types = ['note', 'tip', 'important', 'warning', 'caution', 'abstract', 'info', 'todo',
			'success', 'check', 'done', 'question', 'help', 'faq', 'failure', 'fail', 'missing',
			'danger', 'error', 'bug', 'example', 'quote', 'cite'];

		for (const type of types) {
			const result = parseCalloutHeader(`> [!${type}]`, 0);
			expect(result).not.toBeNull();
			expect(result!.type).toBe(type);
		}
	});
});

describe('findAllCallouts', () => {
	it('detects single-line callout (header only)', () => {
		const state = createMarkdownState('> [!note]');
		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);
		expect(callouts[0].startLine).toBe(1);
		expect(callouts[0].endLine).toBe(1);
		expect(callouts[0].header.type).toBe('note');
	});

	it('detects callout with content lines', () => {
		const state = createMarkdownState('> [!note]\n> Content line 1\n> Content line 2');
		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);
		expect(callouts[0].startLine).toBe(1);
		expect(callouts[0].endLine).toBe(3);
	});

	it('stops at non-blockquote line', () => {
		const state = createMarkdownState('> [!note]\n> Content\n\nPlain text');
		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);
		expect(callouts[0].endLine).toBe(2);
	});

	it('returns empty for plain blockquote', () => {
		const state = createMarkdownState('> Just a blockquote');
		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(0);
	});

	it('returns empty for plain text', () => {
		const state = createMarkdownState('regular text');
		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(0);
	});

	it('detects callout after other content', () => {
		const state = createMarkdownState('some text\n\n> [!warning] Watch out\n> Details here');
		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);
		expect(callouts[0].header.type).toBe('warning');
		expect(callouts[0].header.title).toBe('Watch out');
	});

	it('detects callout with title and foldable', () => {
		const state = createMarkdownState('> [!tip]+ Pro tip\n> Some advice');
		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);
		expect(callouts[0].header.foldable).toBe('+');
		expect(callouts[0].header.title).toBe('Pro tip');
		expect(callouts[0].endLine).toBe(2);
	});

	it('provides correct position info', () => {
		const doc = '# Title\n\n> [!note]\n> Content';
		const state = createMarkdownState(doc);
		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);
		expect(callouts[0].from).toBe(doc.indexOf('> [!note]'));
	});

	it('returns empty for empty input', () => {
		const state = createMarkdownState('');
		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(0);
	});

	it('detects multiple callouts', () => {
		const state = createMarkdownState('> [!note] First\n> Content\n\n> [!warning] Second');
		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(2);
		expect(callouts[0].header.type).toBe('note');
		expect(callouts[1].header.type).toBe('warning');
	});
});
