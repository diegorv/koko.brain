import type { ASTNode } from './expression.types';
import { tokenize, type Token } from './tokenizer';

/**
 * Parses an expression string into an AST using recursive descent.
 * Operator precedence (low to high): ||, &&, comparison, additive, multiplicative, unary, member/call, primary
 */
export function parse(expression: string): ASTNode {
	const tokens = tokenize(expression);
	let pos = 0;

	function peek(): Token | undefined {
		return tokens[pos];
	}

	function advance(): Token {
		return tokens[pos++];
	}

	function expect(type: string, value?: string): Token {
		const t = peek();
		if (!t) throw new Error(`Expected ${type} but reached end of expression`);
		if (t.type !== type || (value !== undefined && t.value !== value)) {
			throw new Error(`Expected ${type}${value ? ` '${value}'` : ''} but got ${t.type} '${t.value}'`);
		}
		return advance();
	}

	// Expression entry point
	function parseExpression(): ASTNode {
		return parseOr();
	}

	// ||
	function parseOr(): ASTNode {
		let left = parseAnd();
		while (peek()?.type === 'Operator' && peek()!.value === '||') {
			advance();
			const right = parseAnd();
			left = { type: 'binary', op: '||', left, right };
		}
		return left;
	}

	// &&
	function parseAnd(): ASTNode {
		let left = parseComparison();
		while (peek()?.type === 'Operator' && peek()!.value === '&&') {
			advance();
			const right = parseComparison();
			left = { type: 'binary', op: '&&', left, right };
		}
		return left;
	}

	// ==, !=, >, <, >=, <=
	function parseComparison(): ASTNode {
		let left = parseAdditive();
		const compOps = new Set(['==', '!=', '>', '<', '>=', '<=']);
		while (peek()?.type === 'Operator' && compOps.has(peek()!.value)) {
			const op = advance().value;
			const right = parseAdditive();
			left = { type: 'binary', op, left, right };
		}
		return left;
	}

	// +, -
	function parseAdditive(): ASTNode {
		let left = parseMultiplicative();
		while (peek()?.type === 'Operator' && (peek()!.value === '+' || peek()!.value === '-')) {
			const op = advance().value;
			const right = parseMultiplicative();
			left = { type: 'binary', op, left, right };
		}
		return left;
	}

	// *, /, %
	function parseMultiplicative(): ASTNode {
		let left = parseUnary();
		while (
			peek()?.type === 'Operator' &&
			(peek()!.value === '*' || peek()!.value === '/' || peek()!.value === '%')
		) {
			const op = advance().value;
			const right = parseUnary();
			left = { type: 'binary', op, left, right };
		}
		return left;
	}

	// !, unary -
	function parseUnary(): ASTNode {
		if (peek()?.type === 'Operator' && peek()!.value === '!') {
			advance();
			const operand = parseUnary();
			return { type: 'unary', op: '!', operand };
		}
		if (peek()?.type === 'Operator' && peek()!.value === '-') {
			advance();
			const operand = parseUnary();
			return { type: 'unary', op: '-', operand };
		}
		return parsePostfix();
	}

	// Member access (.) and function calls ()
	function parsePostfix(): ASTNode {
		let node = parsePrimary();

		while (true) {
			if (peek()?.type === 'Dot') {
				advance();
				const prop = expect('Identifier');
				node = { type: 'member', object: node, property: prop.value };
			} else if (peek()?.type === 'LeftParen' && node.type === 'identifier') {
				// Function call
				advance(); // skip (
				const args: ASTNode[] = [];
				if (peek()?.type !== 'RightParen') {
					args.push(parseExpression());
					while (peek()?.type === 'Comma') {
						advance();
						args.push(parseExpression());
					}
				}
				expect('RightParen');
				node = { type: 'call', callee: node.name, args };
			} else if (peek()?.type === 'LeftParen' && node.type === 'member') {
				// Method-style call: file.something() — treat as call with callee being the full path
				const callee = flattenMemberToString(node);
				advance(); // skip (
				const args: ASTNode[] = [];
				if (peek()?.type !== 'RightParen') {
					args.push(parseExpression());
					while (peek()?.type === 'Comma') {
						advance();
						args.push(parseExpression());
					}
				}
				expect('RightParen');
				node = { type: 'call', callee, args };
			} else {
				break;
			}
		}

		return node;
	}

	// Literals, identifiers, grouping
	function parsePrimary(): ASTNode {
		const t = peek();
		if (!t) throw new Error('Unexpected end of expression');

		switch (t.type) {
			case 'Number': {
				advance();
				return { type: 'number', value: Number(t.value) };
			}
			case 'String': {
				advance();
				return { type: 'string', value: t.value };
			}
			case 'Boolean': {
				advance();
				return { type: 'boolean', value: t.value === 'true' };
			}
			case 'Identifier': {
				advance();
				return { type: 'identifier', name: t.value };
			}
			case 'LeftParen': {
				advance(); // skip (
				const expr = parseExpression();
				expect('RightParen');
				return expr;
			}
			case 'LeftBracket': {
				advance(); // skip [
				const elements: ASTNode[] = [];
				if (peek()?.type !== 'RightBracket') {
					elements.push(parseExpression());
					while (peek()?.type === 'Comma') {
						advance();
						elements.push(parseExpression());
					}
				}
				expect('RightBracket');
				return { type: 'array', elements };
			}
			default:
				throw new Error(`Unexpected token: ${t.type} '${t.value}'`);
		}
	}

	const result = parseExpression();
	if (pos < tokens.length) {
		throw new Error(`Unexpected token after expression: '${tokens[pos].value}'`);
	}
	return result;
}

/** Flattens a member expression chain into a dotted string (e.g. "file.name") */
function flattenMemberToString(node: ASTNode): string {
	if (node.type === 'identifier') return node.name;
	if (node.type === 'member') {
		return flattenMemberToString(node.object) + '.' + node.property;
	}
	return '';
}
