/** Token types produced by the tokenizer */
export type TokenType =
	| 'Number'
	| 'String'
	| 'Boolean'
	| 'Identifier'
	| 'Operator'
	| 'Dot'
	| 'LeftParen'
	| 'RightParen'
	| 'Comma'
	| 'LeftBracket'
	| 'RightBracket';

/** A single token from the expression string */
export interface Token {
	type: TokenType;
	value: string;
}

const OPERATORS = new Set(['+', '-', '*', '/', '%', '==', '!=', '>', '<', '>=', '<=', '&&', '||', '!']);
const TWO_CHAR_OPS = new Set(['==', '!=', '>=', '<=', '&&', '||']);

/**
 * Tokenizes an expression string into an array of tokens.
 * Supports numbers, strings (single/double quotes), booleans, identifiers, and operators.
 */
export function tokenize(input: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;

	while (i < input.length) {
		const ch = input[i];

		// Skip whitespace
		if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
			i++;
			continue;
		}

		// Numbers
		if (ch >= '0' && ch <= '9') {
			let num = '';
			while (i < input.length && ((input[i] >= '0' && input[i] <= '9') || input[i] === '.')) {
				num += input[i];
				i++;
			}
			tokens.push({ type: 'Number', value: num });
			continue;
		}

		// Strings (single or double quotes, including smart/typographic quotes)
		if (ch === "'" || ch === '"' || ch === '\u2018' || ch === '\u2019' || ch === '\u201C' || ch === '\u201D') {
			const startPos = i;
			const quote = ch;
			let str = '';
			i++; // skip opening quote
			while (i < input.length && !isMatchingQuote(input[i], quote)) {
				if (input[i] === '\\' && i + 1 < input.length) {
					str += input[i + 1];
					i += 2;
				} else {
					str += input[i];
					i++;
				}
			}
			if (i >= input.length) {
				throw new Error(`Unterminated string starting at position ${startPos}`);
			}
			i++; // skip closing quote
			tokens.push({ type: 'String', value: str });
			continue;
		}

		// Dot
		if (ch === '.') {
			tokens.push({ type: 'Dot', value: '.' });
			i++;
			continue;
		}

		// Parentheses
		if (ch === '(') {
			tokens.push({ type: 'LeftParen', value: '(' });
			i++;
			continue;
		}
		if (ch === ')') {
			tokens.push({ type: 'RightParen', value: ')' });
			i++;
			continue;
		}

		// Brackets
		if (ch === '[') {
			tokens.push({ type: 'LeftBracket', value: '[' });
			i++;
			continue;
		}
		if (ch === ']') {
			tokens.push({ type: 'RightBracket', value: ']' });
			i++;
			continue;
		}

		// Comma
		if (ch === ',') {
			tokens.push({ type: 'Comma', value: ',' });
			i++;
			continue;
		}

		// Two-char operators
		if (i + 1 < input.length) {
			const twoChar = ch + input[i + 1];
			if (TWO_CHAR_OPS.has(twoChar)) {
				tokens.push({ type: 'Operator', value: twoChar });
				i += 2;
				continue;
			}
		}

		// Single-char operators
		if (OPERATORS.has(ch)) {
			tokens.push({ type: 'Operator', value: ch });
			i++;
			continue;
		}

		// Identifiers and booleans
		if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
			let ident = '';
			while (i < input.length) {
				const c = input[i];
				if (
					(c >= 'a' && c <= 'z') ||
					(c >= 'A' && c <= 'Z') ||
					(c >= '0' && c <= '9') ||
					c === '_'
				) {
					ident += c;
					i++;
				} else if (
					c === '-' &&
					i + 1 < input.length &&
					((input[i + 1] >= 'a' && input[i + 1] <= 'z') ||
						(input[i + 1] >= 'A' && input[i + 1] <= 'Z'))
				) {
					// Hyphen followed by a letter continues the identifier (e.g. due-date)
					ident += c;
					i++;
				} else {
					break;
				}
			}

			if (ident === 'true' || ident === 'false') {
				tokens.push({ type: 'Boolean', value: ident });
			} else {
				tokens.push({ type: 'Identifier', value: ident });
			}
			continue;
		}

		throw new Error(`Unexpected character: '${ch}' at position ${i}`);
	}

	return tokens;
}

/** Checks if a character is a matching closing quote for the given opening quote */
function isMatchingQuote(ch: string, opening: string): boolean {
	if (ch === opening) return true;
	// Smart single quotes: ' (U+2018) and ' (U+2019) match each other and ASCII '
	if ((opening === "'" || opening === '\u2018' || opening === '\u2019') &&
		(ch === "'" || ch === '\u2018' || ch === '\u2019')) return true;
	// Smart double quotes: " (U+201C) and " (U+201D) match each other and ASCII "
	if ((opening === '"' || opening === '\u201C' || opening === '\u201D') &&
		(ch === '"' || ch === '\u201C' || ch === '\u201D')) return true;
	return false;
}
