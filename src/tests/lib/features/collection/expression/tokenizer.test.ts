import { describe, it, expect } from 'vitest';
import { tokenize } from '$lib/features/collection/expression/tokenizer';

describe('tokenize', () => {
	it('tokenizes numbers', () => {
		expect(tokenize('42')).toEqual([{ type: 'Number', value: '42' }]);
		expect(tokenize('3.14')).toEqual([{ type: 'Number', value: '3.14' }]);
	});

	it('tokenizes single-quoted strings', () => {
		expect(tokenize("'hello'")).toEqual([{ type: 'String', value: 'hello' }]);
	});

	it('tokenizes double-quoted strings', () => {
		expect(tokenize('"world"')).toEqual([{ type: 'String', value: 'world' }]);
	});

	it('handles escaped quotes in strings', () => {
		expect(tokenize("'it\\'s'")).toEqual([{ type: 'String', value: "it's" }]);
		expect(tokenize('"say \\"hi\\""')).toEqual([{ type: 'String', value: 'say "hi"' }]);
	});

	it('tokenizes booleans', () => {
		expect(tokenize('true')).toEqual([{ type: 'Boolean', value: 'true' }]);
		expect(tokenize('false')).toEqual([{ type: 'Boolean', value: 'false' }]);
	});

	it('tokenizes identifiers', () => {
		expect(tokenize('status')).toEqual([{ type: 'Identifier', value: 'status' }]);
		expect(tokenize('my_var')).toEqual([{ type: 'Identifier', value: 'my_var' }]);
	});

	it('tokenizes two-char operators', () => {
		expect(tokenize('==')).toEqual([{ type: 'Operator', value: '==' }]);
		expect(tokenize('!=')).toEqual([{ type: 'Operator', value: '!=' }]);
		expect(tokenize('>=')).toEqual([{ type: 'Operator', value: '>=' }]);
		expect(tokenize('<=')).toEqual([{ type: 'Operator', value: '<=' }]);
		expect(tokenize('&&')).toEqual([{ type: 'Operator', value: '&&' }]);
		expect(tokenize('||')).toEqual([{ type: 'Operator', value: '||' }]);
	});

	it('tokenizes single-char operators', () => {
		expect(tokenize('+')).toEqual([{ type: 'Operator', value: '+' }]);
		expect(tokenize('-')).toEqual([{ type: 'Operator', value: '-' }]);
		expect(tokenize('*')).toEqual([{ type: 'Operator', value: '*' }]);
		expect(tokenize('/')).toEqual([{ type: 'Operator', value: '/' }]);
		expect(tokenize('%')).toEqual([{ type: 'Operator', value: '%' }]);
		expect(tokenize('!')).toEqual([{ type: 'Operator', value: '!' }]);
		expect(tokenize('>')).toEqual([{ type: 'Operator', value: '>' }]);
		expect(tokenize('<')).toEqual([{ type: 'Operator', value: '<' }]);
	});

	it('tokenizes dots, parens, and commas', () => {
		expect(tokenize('.')).toEqual([{ type: 'Dot', value: '.' }]);
		expect(tokenize('(')).toEqual([{ type: 'LeftParen', value: '(' }]);
		expect(tokenize(')')).toEqual([{ type: 'RightParen', value: ')' }]);
		expect(tokenize(',')).toEqual([{ type: 'Comma', value: ',' }]);
	});

	it('skips whitespace', () => {
		const tokens = tokenize('  42  +  3  ');
		expect(tokens).toEqual([
			{ type: 'Number', value: '42' },
			{ type: 'Operator', value: '+' },
			{ type: 'Number', value: '3' },
		]);
	});

	it('tokenizes a complex expression', () => {
		const tokens = tokenize("status == 'active' && priority > 3");
		expect(tokens).toEqual([
			{ type: 'Identifier', value: 'status' },
			{ type: 'Operator', value: '==' },
			{ type: 'String', value: 'active' },
			{ type: 'Operator', value: '&&' },
			{ type: 'Identifier', value: 'priority' },
			{ type: 'Operator', value: '>' },
			{ type: 'Number', value: '3' },
		]);
	});

	it('tokenizes member access', () => {
		const tokens = tokenize('file.name');
		expect(tokens).toEqual([
			{ type: 'Identifier', value: 'file' },
			{ type: 'Dot', value: '.' },
			{ type: 'Identifier', value: 'name' },
		]);
	});

	it('tokenizes function calls', () => {
		const tokens = tokenize("if(x > 0, 'yes', 'no')");
		expect(tokens).toEqual([
			{ type: 'Identifier', value: 'if' },
			{ type: 'LeftParen', value: '(' },
			{ type: 'Identifier', value: 'x' },
			{ type: 'Operator', value: '>' },
			{ type: 'Number', value: '0' },
			{ type: 'Comma', value: ',' },
			{ type: 'String', value: 'yes' },
			{ type: 'Comma', value: ',' },
			{ type: 'String', value: 'no' },
			{ type: 'RightParen', value: ')' },
		]);
	});

	it('tokenizes smart single quotes', () => {
		expect(tokenize('\u2018hello\u2019')).toEqual([{ type: 'String', value: 'hello' }]);
		expect(tokenize('\u2019hello\u2018')).toEqual([{ type: 'String', value: 'hello' }]);
	});

	it('tokenizes smart double quotes', () => {
		expect(tokenize('\u201Chello\u201D')).toEqual([{ type: 'String', value: 'hello' }]);
	});

	it('tokenizes mixed smart and ASCII quotes', () => {
		// Smart opening quote closed by ASCII quote
		expect(tokenize('\u2018hello\'')).toEqual([{ type: 'String', value: 'hello' }]);
		// ASCII quote closed by smart closing quote
		expect(tokenize("'hello\u2019")).toEqual([{ type: 'String', value: 'hello' }]);
	});

	it('tokenizes expression with smart quotes in function call', () => {
		const tokens = tokenize('contains(file.name, \u2018diego\u2019)');
		expect(tokens).toEqual([
			{ type: 'Identifier', value: 'contains' },
			{ type: 'LeftParen', value: '(' },
			{ type: 'Identifier', value: 'file' },
			{ type: 'Dot', value: '.' },
			{ type: 'Identifier', value: 'name' },
			{ type: 'Comma', value: ',' },
			{ type: 'String', value: 'diego' },
			{ type: 'RightParen', value: ')' },
		]);
	});

	it('tokenizes hyphenated identifiers (property names)', () => {
		expect(tokenize('due-date')).toEqual([
			{ type: 'Identifier', value: 'due-date' },
		]);
	});

	it('tokenizes hyphenated identifier in comparison', () => {
		const tokens = tokenize("created-by == 'alice'");
		expect(tokens[0]).toEqual({ type: 'Identifier', value: 'created-by' });
		expect(tokens[1]).toEqual({ type: 'Operator', value: '==' });
		expect(tokens[2]).toEqual({ type: 'String', value: 'alice' });
	});

	it('still tokenizes subtraction with numbers', () => {
		const tokens = tokenize('x - 5');
		expect(tokens).toEqual([
			{ type: 'Identifier', value: 'x' },
			{ type: 'Operator', value: '-' },
			{ type: 'Number', value: '5' },
		]);
	});

	it('still tokenizes subtraction between identifiers with spaces', () => {
		const tokens = tokenize('a - b');
		expect(tokens).toEqual([
			{ type: 'Identifier', value: 'a' },
			{ type: 'Operator', value: '-' },
			{ type: 'Identifier', value: 'b' },
		]);
	});

	it('throws on unterminated single-quoted string', () => {
		expect(() => tokenize("'hello")).toThrow('Unterminated string starting at position 0');
	});

	it('throws on unterminated double-quoted string', () => {
		expect(() => tokenize('"hello')).toThrow('Unterminated string starting at position 0');
	});

	it('throws on unterminated string mid-expression', () => {
		expect(() => tokenize("x == 'active")).toThrow('Unterminated string starting at position 5');
	});

	it('throws on unterminated smart-quoted string', () => {
		expect(() => tokenize('\u2018hello')).toThrow('Unterminated string starting at position 0');
	});

	it('throws on unexpected characters', () => {
		expect(() => tokenize('@')).toThrow("Unexpected character: '@'");
	});
});
