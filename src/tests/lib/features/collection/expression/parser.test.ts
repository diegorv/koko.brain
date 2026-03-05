import { describe, it, expect } from 'vitest';
import { parse } from '$lib/features/collection/expression/parser';

describe('parse', () => {
	it('parses number literals', () => {
		expect(parse('42')).toEqual({ type: 'number', value: 42 });
		expect(parse('3.14')).toEqual({ type: 'number', value: 3.14 });
	});

	it('parses string literals', () => {
		expect(parse("'hello'")).toEqual({ type: 'string', value: 'hello' });
		expect(parse('"world"')).toEqual({ type: 'string', value: 'world' });
	});

	it('parses boolean literals', () => {
		expect(parse('true')).toEqual({ type: 'boolean', value: true });
		expect(parse('false')).toEqual({ type: 'boolean', value: false });
	});

	it('parses identifiers', () => {
		expect(parse('status')).toEqual({ type: 'identifier', name: 'status' });
	});

	it('parses member access', () => {
		expect(parse('file.name')).toEqual({
			type: 'member',
			object: { type: 'identifier', name: 'file' },
			property: 'name',
		});
	});

	it('parses chained member access', () => {
		expect(parse('a.b.c')).toEqual({
			type: 'member',
			object: {
				type: 'member',
				object: { type: 'identifier', name: 'a' },
				property: 'b',
			},
			property: 'c',
		});
	});

	it('parses function calls with no args', () => {
		expect(parse('now()')).toEqual({
			type: 'call',
			callee: 'now',
			args: [],
		});
	});

	it('parses function calls with args', () => {
		const ast = parse("date('2024-01-01')");
		expect(ast).toEqual({
			type: 'call',
			callee: 'date',
			args: [{ type: 'string', value: '2024-01-01' }],
		});
	});

	it('parses function calls with multiple args', () => {
		const ast = parse("if(x > 0, 'yes', 'no')");
		expect(ast.type).toBe('call');
		if (ast.type !== 'call') return;
		expect(ast.callee).toBe('if');
		expect(ast.args).toHaveLength(3);
	});

	it('parses arithmetic with correct precedence', () => {
		// 1 + 2 * 3 should parse as 1 + (2 * 3)
		const ast = parse('1 + 2 * 3');
		expect(ast).toEqual({
			type: 'binary',
			op: '+',
			left: { type: 'number', value: 1 },
			right: {
				type: 'binary',
				op: '*',
				left: { type: 'number', value: 2 },
				right: { type: 'number', value: 3 },
			},
		});
	});

	it('parses comparison operators', () => {
		const ast = parse('x > 5');
		expect(ast).toEqual({
			type: 'binary',
			op: '>',
			left: { type: 'identifier', name: 'x' },
			right: { type: 'number', value: 5 },
		});
	});

	it('parses logical AND', () => {
		const ast = parse('a && b');
		expect(ast).toEqual({
			type: 'binary',
			op: '&&',
			left: { type: 'identifier', name: 'a' },
			right: { type: 'identifier', name: 'b' },
		});
	});

	it('parses logical OR', () => {
		const ast = parse('a || b');
		expect(ast).toEqual({
			type: 'binary',
			op: '||',
			left: { type: 'identifier', name: 'a' },
			right: { type: 'identifier', name: 'b' },
		});
	});

	it('parses unary NOT', () => {
		const ast = parse('!x');
		expect(ast).toEqual({
			type: 'unary',
			op: '!',
			operand: { type: 'identifier', name: 'x' },
		});
	});

	it('parses unary minus on number', () => {
		const ast = parse('-5');
		expect(ast).toEqual({
			type: 'unary',
			op: '-',
			operand: { type: 'number', value: 5 },
		});
	});

	it('parses unary minus on grouped expression', () => {
		const ast = parse('-(x + 1)');
		expect(ast).toEqual({
			type: 'unary',
			op: '-',
			operand: {
				type: 'binary',
				op: '+',
				left: { type: 'identifier', name: 'x' },
				right: { type: 'number', value: 1 },
			},
		});
	});

	it('parses unary minus on identifier', () => {
		const ast = parse('-priority');
		expect(ast).toEqual({
			type: 'unary',
			op: '-',
			operand: { type: 'identifier', name: 'priority' },
		});
	});

	it('parses double unary minus', () => {
		const ast = parse('--5');
		expect(ast).toEqual({
			type: 'unary',
			op: '-',
			operand: {
				type: 'unary',
				op: '-',
				operand: { type: 'number', value: 5 },
			},
		});
	});

	it('parses grouped expressions', () => {
		// (1 + 2) * 3 should parse as (1 + 2) * 3
		const ast = parse('(1 + 2) * 3');
		expect(ast).toEqual({
			type: 'binary',
			op: '*',
			left: {
				type: 'binary',
				op: '+',
				left: { type: 'number', value: 1 },
				right: { type: 'number', value: 2 },
			},
			right: { type: 'number', value: 3 },
		});
	});

	it('respects && having higher precedence than ||', () => {
		// a || b && c should parse as a || (b && c)
		const ast = parse('a || b && c');
		expect(ast).toEqual({
			type: 'binary',
			op: '||',
			left: { type: 'identifier', name: 'a' },
			right: {
				type: 'binary',
				op: '&&',
				left: { type: 'identifier', name: 'b' },
				right: { type: 'identifier', name: 'c' },
			},
		});
	});

	it('parses nested function calls', () => {
		const ast = parse('number(date(file.ctime))');
		expect(ast.type).toBe('call');
		if (ast.type !== 'call') return;
		expect(ast.callee).toBe('number');
		expect(ast.args[0].type).toBe('call');
	});

	it('parses complex expression', () => {
		const ast = parse("status == 'active' && priority > 3");
		expect(ast.type).toBe('binary');
		if (ast.type !== 'binary') return;
		expect(ast.op).toBe('&&');
		expect(ast.left.type).toBe('binary');
		expect(ast.right.type).toBe('binary');
	});

	it('throws on unexpected end of expression', () => {
		expect(() => parse('1 +')).toThrow();
	});

	it('throws on unexpected token', () => {
		expect(() => parse('1 2')).toThrow();
	});
});
