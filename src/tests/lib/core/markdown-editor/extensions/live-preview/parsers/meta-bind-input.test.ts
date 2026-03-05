import { describe, it, expect } from 'vitest';
import { findMetaBindInputRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input';

describe('findMetaBindInputRanges', () => {
	it('parses single INPUT with inlineSelect and options', () => {
		const text = '`INPUT[inlineSelect(option(1,bad)):mood]`';
		const ranges = findMetaBindInputRanges(text, 0);

		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.inputType).toBe('inlineSelect');
		expect(r.bindTarget).toBe('mood');
		expect(r.options).toEqual([{ value: '1', label: 'bad' }]);
		expect(r.from).toBe(0);
		expect(r.to).toBe(text.length);
	});

	it('parses multiple options', () => {
		const text = '`INPUT[inlineSelect(option(1,very bad), option(2,bad), option(3,ok), option(4,good), option(5,excellent)):mood]`';
		const ranges = findMetaBindInputRanges(text, 0);

		expect(ranges).toHaveLength(1);
		expect(ranges[0].options).toHaveLength(5);
		expect(ranges[0].options[0]).toEqual({ value: '1', label: 'very bad' });
		expect(ranges[0].options[4]).toEqual({ value: '5', label: 'excellent' });
	});

	it('parses multiple INPUTs on the same line', () => {
		const text = '| `INPUT[inlineSelect(option(1,a)):x]` | `INPUT[inlineSelect(option(2,b)):y]` |';
		const ranges = findMetaBindInputRanges(text, 0);

		expect(ranges).toHaveLength(2);
		expect(ranges[0].bindTarget).toBe('x');
		expect(ranges[1].bindTarget).toBe('y');
	});

	it('applies offset correctly', () => {
		const text = '`INPUT[inlineSelect(option(1,bad)):mood]`';
		const ranges = findMetaBindInputRanges(text, 100);

		expect(ranges).toHaveLength(1);
		expect(ranges[0].from).toBe(100);
		expect(ranges[0].to).toBe(100 + text.length);
	});

	it('returns empty array for text without INPUT', () => {
		expect(findMetaBindInputRanges('Hello world', 0)).toHaveLength(0);
	});

	it('returns empty array for inline code without INPUT', () => {
		expect(findMetaBindInputRanges('`const x = 1`', 0)).toHaveLength(0);
	});

	it('returns empty array for INPUT without bind target', () => {
		expect(findMetaBindInputRanges('`INPUT[inlineSelect(option(1,bad))]`', 0)).toHaveLength(0);
	});

	it('returns empty array for INPUT without options', () => {
		expect(findMetaBindInputRanges('`INPUT[inlineSelect():mood]`', 0)).toHaveLength(0);
	});

	it('handles emojis in labels', () => {
		const text = '`INPUT[inlineSelect(option(1,\u{1F61E} very bad), option(2,\u{1F641} bad)):mood]`';
		const ranges = findMetaBindInputRanges(text, 0);

		expect(ranges).toHaveLength(1);
		expect(ranges[0].options[0].label).toBe('\u{1F61E} very bad');
		expect(ranges[0].options[1].label).toBe('\u{1F641} bad');
	});

	it('handles underscores in bindTarget', () => {
		const text = '`INPUT[inlineSelect(option(1,a)):life_track_sleep_quality]`';
		const ranges = findMetaBindInputRanges(text, 0);

		expect(ranges).toHaveLength(1);
		expect(ranges[0].bindTarget).toBe('life_track_sleep_quality');
	});

	it('returns empty array for INPUT without parentheses in type', () => {
		expect(findMetaBindInputRanges('`INPUT[inlineSelect:mood]`', 0)).toHaveLength(0);
	});

	it('parses simple comma-separated values (no option() wrappers)', () => {
		const text = '`INPUT[inlineSelect(todo, doing, done):status]`';
		const ranges = findMetaBindInputRanges(text, 0);

		expect(ranges).toHaveLength(1);
		expect(ranges[0].inputType).toBe('inlineSelect');
		expect(ranges[0].bindTarget).toBe('status');
		expect(ranges[0].options).toEqual([
			{ value: 'todo', label: 'todo' },
			{ value: 'doing', label: 'doing' },
			{ value: 'done', label: 'done' },
		]);
	});

	it('parses simple values with more options', () => {
		const text = '`INPUT[inlineSelect(baixa, media, alta, critica):prioridade]`';
		const ranges = findMetaBindInputRanges(text, 0);

		expect(ranges).toHaveLength(1);
		expect(ranges[0].bindTarget).toBe('prioridade');
		expect(ranges[0].options).toHaveLength(4);
		expect(ranges[0].options[0]).toEqual({ value: 'baixa', label: 'baixa' });
		expect(ranges[0].options[3]).toEqual({ value: 'critica', label: 'critica' });
	});

	it('prefers option() syntax over simple values when both present', () => {
		const text = '`INPUT[inlineSelect(option(1,bad), option(2,good)):mood]`';
		const ranges = findMetaBindInputRanges(text, 0);

		expect(ranges).toHaveLength(1);
		expect(ranges[0].options).toEqual([
			{ value: '1', label: 'bad' },
			{ value: '2', label: 'good' },
		]);
	});
});
