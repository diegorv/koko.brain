/** An individual option for the meta-bind input (stored value + visible label) */
export interface MetaBindOption {
	/** Value stored in the frontmatter (e.g. "1") */
	value: string;
	/** Label displayed to the user (e.g. "very bad") */
	label: string;
}

/** Range of an INPUT field found in a line */
export interface MetaBindInputRange {
	/** Start of the entire `INPUT[...]` (including opening backtick) */
	from: number;
	/** End of the entire `INPUT[...]` (including closing backtick) */
	to: number;
	/** The input type (e.g. "inlineSelect") */
	inputType: string;
	/** Parsed options for the input */
	options: MetaBindOption[];
	/** The frontmatter property name to bind to */
	bindTarget: string;
}

const INPUT_RE = /`INPUT\[([^\]]+)\]`/g;
const OPTION_RE = /option\(([^,]+),\s*([^)]*)\)/g;

/**
 * Finds all meta-bind INPUT fields in a line of text.
 * Parses the input type, options, and bind target from `INPUT[type(args):bindTarget]` syntax.
 */
export function findMetaBindInputRanges(text: string, offset: number): MetaBindInputRange[] {
	const ranges: MetaBindInputRange[] = [];
	INPUT_RE.lastIndex = 0;

	let match: RegExpExecArray | null;
	while ((match = INPUT_RE.exec(text)) !== null) {
		const fullContent = match[1]; // everything inside INPUT[...]

		// Split by the last ':' to separate typeAndArgs from bindTarget
		const lastColonIdx = fullContent.lastIndexOf(':');
		if (lastColonIdx === -1) continue;

		const typeAndArgs = fullContent.slice(0, lastColonIdx);
		const bindTarget = fullContent.slice(lastColonIdx + 1).trim();
		if (!bindTarget) continue;

		// Extract type (before first '(') and args string (between outermost parens)
		const parenIdx = typeAndArgs.indexOf('(');
		if (parenIdx === -1) continue;

		const inputType = typeAndArgs.slice(0, parenIdx).trim();
		if (!inputType) continue;

		// Find matching closing paren (the last one)
		const lastParenIdx = typeAndArgs.lastIndexOf(')');
		if (lastParenIdx === -1 || lastParenIdx <= parenIdx) continue;

		const argsString = typeAndArgs.slice(parenIdx + 1, lastParenIdx);

		// Parse options from args — try option(value, label) syntax first,
		// then fall back to simple comma-separated values
		const options: MetaBindOption[] = [];
		OPTION_RE.lastIndex = 0;
		let optMatch: RegExpExecArray | null;
		while ((optMatch = OPTION_RE.exec(argsString)) !== null) {
			options.push({
				value: optMatch[1].trim(),
				label: optMatch[2].trim(),
			});
		}

		// Fallback: simple comma-separated values (e.g. "todo, doing, done")
		if (options.length === 0) {
			const simpleValues = argsString.split(',').map((v) => v.trim()).filter(Boolean);
			for (const val of simpleValues) {
				options.push({ value: val, label: val });
			}
		}

		if (options.length === 0) continue;

		const start = offset + match.index;
		ranges.push({
			from: start,
			to: start + match[0].length,
			inputType,
			options,
			bindTarget,
		});
	}

	return ranges;
}
