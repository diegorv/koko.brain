import { describe, it, expect } from 'vitest';
import {
	formulasToEntries,
	entriesToFormulas,
	createEmptyFormulaEntry,
	addFormulaEntry,
	removeFormulaEntry,
	updateFormulaEntry,
	validateFormulaExpression,
	validateFormulaName,
	setFormulaEditing,
	finishAllEditing,
} from '$lib/features/collection/toolbar/formula.logic';
import type { FormulaEntry } from '$lib/features/collection/toolbar/toolbar.types';

describe('formulasToEntries', () => {
	it('returns empty array for undefined', () => {
		expect(formulasToEntries(undefined)).toEqual([]);
	});

	it('returns empty array for empty object', () => {
		expect(formulasToEntries({})).toEqual([]);
	});

	it('converts a single formula to an entry', () => {
		const result = formulasToEntries({ age: 'priority * 2' });
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('age');
		expect(result[0].expression).toBe('priority * 2');
	});

	it('converts multiple formulas to entries', () => {
		const result = formulasToEntries({
			age: 'priority * 2',
			score: 'priority + 10',
		});
		expect(result).toHaveLength(2);
		expect(result[0].name).toBe('age');
		expect(result[1].name).toBe('score');
	});

	it('all entries have editing: false by default', () => {
		const result = formulasToEntries({ a: '1', b: '2' });
		expect(result.every((e) => e.editing === false)).toBe(true);
	});

	it('each entry has a unique id', () => {
		const result = formulasToEntries({ a: '1', b: '2', c: '3' });
		const ids = new Set(result.map((e) => e.id));
		expect(ids.size).toBe(3);
	});
});

describe('entriesToFormulas', () => {
	it('returns undefined for empty entries array', () => {
		expect(entriesToFormulas([])).toBeUndefined();
	});

	it('converts entries back to record', () => {
		const entries: FormulaEntry[] = [
			{ id: '1', name: 'age', expression: 'priority * 2', editing: false },
			{ id: '2', name: 'score', expression: 'priority + 10', editing: false },
		];
		expect(entriesToFormulas(entries)).toEqual({
			age: 'priority * 2',
			score: 'priority + 10',
		});
	});

	it('skips entries with empty names', () => {
		const entries: FormulaEntry[] = [
			{ id: '1', name: '', expression: 'priority * 2', editing: true },
			{ id: '2', name: 'score', expression: 'priority + 10', editing: false },
		];
		expect(entriesToFormulas(entries)).toEqual({ score: 'priority + 10' });
	});

	it('trims whitespace from names', () => {
		const entries: FormulaEntry[] = [
			{ id: '1', name: '  age  ', expression: 'priority * 2', editing: false },
		];
		expect(entriesToFormulas(entries)).toEqual({ age: 'priority * 2' });
	});

	it('returns undefined when all names are empty', () => {
		const entries: FormulaEntry[] = [
			{ id: '1', name: '', expression: 'priority * 2', editing: true },
			{ id: '2', name: '   ', expression: 'x + 1', editing: true },
		];
		expect(entriesToFormulas(entries)).toBeUndefined();
	});
});

describe('createEmptyFormulaEntry', () => {
	it('returns entry with empty name and expression', () => {
		const entry = createEmptyFormulaEntry();
		expect(entry.name).toBe('');
		expect(entry.expression).toBe('');
	});

	it('has editing: true', () => {
		const entry = createEmptyFormulaEntry();
		expect(entry.editing).toBe(true);
	});

	it('has a unique id', () => {
		const a = createEmptyFormulaEntry();
		const b = createEmptyFormulaEntry();
		expect(a.id).not.toBe(b.id);
	});
});

describe('addFormulaEntry', () => {
	it('appends to empty list', () => {
		const result = addFormulaEntry([]);
		expect(result).toHaveLength(1);
		expect(result[0].editing).toBe(true);
	});

	it('appends to existing list', () => {
		const existing: FormulaEntry[] = [
			{ id: '1', name: 'age', expression: 'x', editing: false },
		];
		const result = addFormulaEntry(existing);
		expect(result).toHaveLength(2);
		expect(result[0].name).toBe('age');
		expect(result[1].editing).toBe(true);
	});

	it('does not mutate original array', () => {
		const original: FormulaEntry[] = [
			{ id: '1', name: 'age', expression: 'x', editing: false },
		];
		addFormulaEntry(original);
		expect(original).toHaveLength(1);
	});
});

describe('removeFormulaEntry', () => {
	it('removes entry by id', () => {
		const entries: FormulaEntry[] = [
			{ id: '1', name: 'a', expression: 'x', editing: false },
			{ id: '2', name: 'b', expression: 'y', editing: false },
		];
		const result = removeFormulaEntry(entries, '1');
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('b');
	});

	it('returns unchanged array when id not found', () => {
		const entries: FormulaEntry[] = [
			{ id: '1', name: 'a', expression: 'x', editing: false },
		];
		const result = removeFormulaEntry(entries, 'nonexistent');
		expect(result).toHaveLength(1);
	});

	it('does not mutate original array', () => {
		const entries: FormulaEntry[] = [
			{ id: '1', name: 'a', expression: 'x', editing: false },
			{ id: '2', name: 'b', expression: 'y', editing: false },
		];
		removeFormulaEntry(entries, '1');
		expect(entries).toHaveLength(2);
	});
});

describe('updateFormulaEntry', () => {
	const entries: FormulaEntry[] = [
		{ id: '1', name: 'age', expression: 'priority * 2', editing: false },
		{ id: '2', name: 'score', expression: 'priority + 10', editing: false },
	];

	it('updates name of matching entry', () => {
		const result = updateFormulaEntry(entries, '1', { name: 'new_age' });
		expect(result[0].name).toBe('new_age');
		expect(result[1].name).toBe('score');
	});

	it('updates expression of matching entry', () => {
		const result = updateFormulaEntry(entries, '1', { expression: 'priority * 3' });
		expect(result[0].expression).toBe('priority * 3');
	});

	it('sets error for invalid expression', () => {
		const result = updateFormulaEntry(entries, '1', { expression: 'priority *' });
		expect(result[0].error).toBeDefined();
		expect(typeof result[0].error).toBe('string');
	});

	it('clears error for valid expression', () => {
		const result = updateFormulaEntry(entries, '1', { expression: 'priority * 3' });
		expect(result[0].error).toBeUndefined();
	});

	it('does not modify other entries', () => {
		const result = updateFormulaEntry(entries, '1', { name: 'changed' });
		expect(result[1]).toEqual(entries[1]);
	});

	it('updates editing state', () => {
		const result = updateFormulaEntry(entries, '1', { editing: true });
		expect(result[0].editing).toBe(true);
		expect(result[1].editing).toBe(false);
	});
});

describe('validateFormulaExpression', () => {
	it('returns undefined for valid expression', () => {
		expect(validateFormulaExpression('priority * 2')).toBeUndefined();
	});

	it('returns undefined for empty string', () => {
		expect(validateFormulaExpression('')).toBeUndefined();
	});

	it('returns undefined for whitespace-only string', () => {
		expect(validateFormulaExpression('   ')).toBeUndefined();
	});

	it('returns error string for invalid expression', () => {
		const result = validateFormulaExpression('priority *');
		expect(result).toBeDefined();
		expect(typeof result).toBe('string');
	});

	it('returns undefined for complex valid expressions', () => {
		expect(validateFormulaExpression("if(status == 'active', 1, 0)")).toBeUndefined();
	});

	it('returns undefined for function calls', () => {
		expect(validateFormulaExpression('number(file.size)')).toBeUndefined();
	});
});

describe('validateFormulaName', () => {
	const entries: FormulaEntry[] = [
		{ id: '1', name: 'age', expression: 'x', editing: false },
		{ id: '2', name: 'score', expression: 'y', editing: false },
	];

	it('returns undefined for valid name', () => {
		expect(validateFormulaName('my_formula', entries, '3')).toBeUndefined();
	});

	it('returns error for empty name', () => {
		expect(validateFormulaName('', entries, '3')).toBe('Name is required');
	});

	it('returns error for whitespace-only name', () => {
		expect(validateFormulaName('   ', entries, '3')).toBe('Name is required');
	});

	it('returns error for name with spaces', () => {
		expect(validateFormulaName('my formula', entries, '3')).toBe('Name cannot contain spaces');
	});

	it('returns error for name with dots', () => {
		expect(validateFormulaName('my.formula', entries, '3')).toBe(
			'Name cannot contain dots or parentheses',
		);
	});

	it('returns error for name with parentheses', () => {
		expect(validateFormulaName('my(formula)', entries, '3')).toBe(
			'Name cannot contain dots or parentheses',
		);
	});

	it('returns error for duplicate name (case-insensitive)', () => {
		expect(validateFormulaName('AGE', entries, '3')).toBe(
			'A formula with this name already exists',
		);
	});

	it('does not flag the entry itself as duplicate', () => {
		expect(validateFormulaName('age', entries, '1')).toBeUndefined();
	});
});

describe('setFormulaEditing', () => {
	it('sets target entry to editing: true', () => {
		const entries: FormulaEntry[] = [
			{ id: '1', name: 'a', expression: 'x', editing: false },
			{ id: '2', name: 'b', expression: 'y', editing: false },
		];
		const result = setFormulaEditing(entries, '2');
		expect(result[1].editing).toBe(true);
	});

	it('sets all other entries to editing: false', () => {
		const entries: FormulaEntry[] = [
			{ id: '1', name: 'a', expression: 'x', editing: true },
			{ id: '2', name: 'b', expression: 'y', editing: false },
		];
		const result = setFormulaEditing(entries, '2');
		expect(result[0].editing).toBe(false);
		expect(result[1].editing).toBe(true);
	});
});

describe('finishAllEditing', () => {
	it('sets all entries to editing: false', () => {
		const entries: FormulaEntry[] = [
			{ id: '1', name: 'a', expression: 'x', editing: true },
			{ id: '2', name: 'b', expression: 'y', editing: true },
		];
		const result = finishAllEditing(entries);
		expect(result.every((e) => e.editing === false)).toBe(true);
	});
});
