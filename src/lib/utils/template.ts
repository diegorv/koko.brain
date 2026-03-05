import { formatDateWithOffset, formatNow } from '$lib/utils/date';

/**
 * Processes a Templater-compatible template string.
 * Replaces all `<% ... %>` expressions with their evaluated values.
 *
 * Supported expressions:
 * - `tp.file.title` — the note's title
 * - `tp.date.now("format", offset, tp.file.title, "inputFormat")` — date formatting with offset
 * - String concatenation with `+`
 * - String literals `"..."` or `'...'`
 * - Custom variable names (looked up in `customVariables`)
 *
 * @param template - The template string containing `<% ... %>` placeholders
 * @param fileTitle - The note's title used for `tp.file.title` and date reference
 * @param customVariables - Optional key-value pairs for extra variables (e.g. `yesterdayPath`)
 */
export function processTemplate(
	template: string,
	fileTitle: string,
	customVariables?: Record<string, string>,
): string {
	return template.replace(/<%\s*([\s\S]*?)\s*%>/g, (_, expr: string) => {
		return evaluateExpression(expr.trim(), fileTitle, customVariables);
	});
}

/**
 * Evaluates a single Templater expression (the content between `<%` and `%>`).
 * Supports `tp.file.title`, `tp.date.now(...)`, string concatenation, literals,
 * and custom variable lookup.
 */
export function evaluateExpression(
	expr: string,
	fileTitle: string,
	customVariables?: Record<string, string>,
): string {
	const parts = splitOnPlus(expr);
	return parts.map((part) => evaluatePart(part.trim(), fileTitle, customVariables)).join('');
}

/**
 * Evaluates a tp.date.now() call expression.
 * Parses: tp.date.now("outputFormat", offset, tp.file.title, "inputFormat")
 */
function evaluateDateNow(argsStr: string, fileTitle: string): string {
	const args: string[] = [];
	let current = '';
	let inString = false;
	let stringChar = '';
	let depth = 0;

	for (let i = 0; i < argsStr.length; i++) {
		const ch = argsStr[i];
		if (inString) {
			if (ch === '\\' && i + 1 < argsStr.length) {
				current += ch + argsStr[i + 1];
				i++;
				continue;
			}
			current += ch;
			if (ch === stringChar) {
				inString = false;
			}
			continue;
		}

		if (ch === '"' || ch === "'") {
			inString = true;
			stringChar = ch;
			current += ch;
			continue;
		}

		if (ch === '(') {
			depth++;
			current += ch;
			continue;
		}

		if (ch === ')') {
			depth--;
			current += ch;
			continue;
		}

		if (ch === ',' && depth === 0) {
			args.push(current.trim());
			current = '';
			continue;
		}

		current += ch;
	}
	if (current.trim()) {
		args.push(current.trim());
	}

	const outputFormat = stripQuotes(args[0] ?? 'YYYY-MM-DD');
	const offset = parseInt(args[1] ?? '0', 10) || 0;
	const hasReference = args.length >= 3 && args[2] !== undefined;

	if (!hasReference) {
		// No reference date — use current datetime directly
		return formatNow(outputFormat, offset);
	}

	const inputFormat = stripQuotes(args[3] ?? 'YYYY-MM-DD');
	return formatDateWithOffset(fileTitle, inputFormat, outputFormat, offset, true);
}

/** Removes surrounding quotes from a string */
function stripQuotes(s: string): string {
	if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
		return s.slice(1, -1);
	}
	return s;
}

/** Splits an expression on `+` operators, respecting strings and parentheses */
function splitOnPlus(expr: string): string[] {
	const parts: string[] = [];
	let current = '';
	let inString = false;
	let stringChar = '';
	let depth = 0;

	for (let i = 0; i < expr.length; i++) {
		const ch = expr[i];
		if (inString) {
			if (ch === '\\' && i + 1 < expr.length) {
				current += ch + expr[i + 1];
				i++;
				continue;
			}
			current += ch;
			if (ch === stringChar) {
				inString = false;
			}
			continue;
		}

		if (ch === '"' || ch === "'") {
			inString = true;
			stringChar = ch;
			current += ch;
			continue;
		}

		if (ch === '(') {
			depth++;
			current += ch;
			continue;
		}

		if (ch === ')') {
			depth--;
			current += ch;
			continue;
		}

		if (ch === '+' && depth === 0) {
			parts.push(current);
			current = '';
			continue;
		}

		current += ch;
	}
	if (current.trim()) {
		parts.push(current);
	}

	return parts;
}

/** Evaluates a single part of a Templater expression */
function evaluatePart(
	part: string,
	fileTitle: string,
	customVariables?: Record<string, string>,
): string {
	// Custom variable lookup (e.g. <% yesterdayPath %> or <% "prefix" + yesterdayPath %>)
	if (customVariables && part in customVariables) {
		return customVariables[part];
	}

	if (part === 'tp.file.title') {
		return fileTitle;
	}

	if (part.startsWith('tp.date.now(') && part.endsWith(')')) {
		const argsStr = part.slice('tp.date.now('.length, -1);
		return evaluateDateNow(argsStr, fileTitle);
	}

	// String literal
	const unquoted = stripQuotes(part);
	if (unquoted !== part) {
		return unquoted;
	}

	// Return as-is for unknown expressions
	return part;
}
