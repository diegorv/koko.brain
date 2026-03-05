import { describe, it, expect } from 'vitest';
import { parseDuration, isDurationString } from '$lib/features/collection/expression/duration.logic';
import { evaluateExpression, type EvalContext } from '$lib/features/collection/expression/evaluator';
import type { NoteRecord } from '$lib/features/collection/collection.types';

function makeRecord(overrides: Partial<NoteRecord> = {}): NoteRecord {
	return {
		path: '/vault/test.md',
		name: 'test.md',
		basename: 'test',
		folder: '/vault',
		ext: '.md',
		mtime: 1700000000000,
		ctime: 1690000000000,
		size: 1024,
		properties: new Map(),
		...overrides,
	};
}

function makeCtx(
	props: Record<string, unknown> = {},
	formulas: Record<string, string> = {},
	recordOverrides: Partial<NoteRecord> = {},
): EvalContext {
	const properties = new Map(Object.entries(props));
	return {
		record: makeRecord({ properties, ...recordOverrides }),
		formulas,
	};
}

describe('parseDuration', () => {
	it('parses "1d" as 86400000ms', () => {
		expect(parseDuration('1d')?.milliseconds).toBe(86400000);
	});

	it('parses "2 weeks" as 1209600000ms', () => {
		expect(parseDuration('2 weeks')?.milliseconds).toBe(1209600000);
	});

	it('parses compound "1h 30m"', () => {
		expect(parseDuration('1h 30m')?.milliseconds).toBe(5400000);
	});

	it('parses "3M" as ~7776000000ms (3 months)', () => {
		expect(parseDuration('3M')?.milliseconds).toBe(3 * 2592000000);
	});

	it('returns null for invalid input', () => {
		expect(parseDuration('invalid')).toBeNull();
	});

	it('returns null for empty string', () => {
		expect(parseDuration('')).toBeNull();
	});

	it('parses various unit formats', () => {
		expect(parseDuration('1s')?.milliseconds).toBe(1000);
		expect(parseDuration('1 second')?.milliseconds).toBe(1000);
		expect(parseDuration('2 minutes')?.milliseconds).toBe(120000);
		expect(parseDuration('1h')?.milliseconds).toBe(3600000);
		expect(parseDuration('1 hour')?.milliseconds).toBe(3600000);
		expect(parseDuration('1w')?.milliseconds).toBe(604800000);
		expect(parseDuration('1y')?.milliseconds).toBe(31536000000);
	});
});

describe('isDurationString', () => {
	it('returns true for valid duration strings', () => {
		expect(isDurationString('1d')).toBe(true);
		expect(isDurationString('2 weeks')).toBe(true);
		expect(isDurationString('1h 30m')).toBe(true);
	});

	it('returns false for non-duration values', () => {
		expect(isDurationString('hello')).toBe(false);
		expect(isDurationString(42)).toBe(false);
		expect(isDurationString(null)).toBe(false);
	});
});

describe('date arithmetic in evaluator', () => {
	it('now() + "1 day" returns Date ~24h in the future', () => {
		const result = evaluateExpression('now() + "1 day"', makeCtx()) as Date;
		expect(result).toBeInstanceOf(Date);
		const expected = Date.now() + 86400000;
		expect(Math.abs(result.getTime() - expected)).toBeLessThan(1000);
	});

	it('file.mtime - "1 week" returns Date 1 week before', () => {
		const mtime = 1700000000000;
		const ctx = makeCtx({}, {}, { mtime });
		const result = evaluateExpression('file.mtime - "1 week"', ctx) as Date;
		expect(result).toBeInstanceOf(Date);
		expect(result.getTime()).toBe(mtime - 604800000);
	});

	it('file.mtime - file.ctime returns difference in ms', () => {
		const ctx = makeCtx({}, {}, { mtime: 1700000000000, ctime: 1690000000000 });
		const result = evaluateExpression('file.mtime - file.ctime', ctx);
		expect(result).toBe(10000000000);
	});

	it('duration("1d") returns 86400000', () => {
		expect(evaluateExpression('duration("1d")', makeCtx())).toBe(86400000);
	});

	it('duration("1h 30m") returns 5400000', () => {
		expect(evaluateExpression('duration("1h 30m")', makeCtx())).toBe(5400000);
	});
});
