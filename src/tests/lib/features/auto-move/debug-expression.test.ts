import { describe, it, expect } from 'vitest';
import { evaluateExpression, type EvalContext } from '$lib/features/collection/expression/evaluator';
import type { NoteRecord } from '$lib/features/collection/collection.types';

describe('debug: lifecycle expression evaluation', () => {
	const record: NoteRecord = {
		path: '/vault/work/teste.md',
		name: 'teste.md',
		basename: 'teste',
		folder: '/vault/work',
		ext: '.md',
		mtime: Date.now(),
		ctime: Date.now(),
		size: 100,
		properties: new Map<string, unknown>([
			['type', 'Project'],
			['_archived', true],
		]),
	};
	const ctx: EvalContext = { record, formulas: {} };

	it('_archived == true', () => {
		expect(evaluateExpression('_archived == true', ctx)).toBe(true);
	});

	it('type == "Project"', () => {
		expect(evaluateExpression('type == "Project"', ctx)).toBe(true);
	});

	it('type.lower() == "project"', () => {
		expect(evaluateExpression('type.lower() == "project"', ctx)).toBe(true);
	});

	it('full lifecycle expression', () => {
		expect(evaluateExpression('type.lower() == "project" && _archived == true', ctx)).toBe(true);
	});
});
