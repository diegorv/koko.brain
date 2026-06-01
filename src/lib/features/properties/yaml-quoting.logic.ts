/**
 * YAML scalar quoting predicate matching yaml@2.9.0 behavior for the
 * options Kokobrain uses ({ lineWidth: 0, flowCollectionPadding: false }).
 *
 * The actual emission is still done by the `yaml` library inside
 * `serializeProperties`; this predicate documents the contract and
 * powers parity tests so any future `yaml` version bump that changes
 * canonical form is detected immediately. External producers
 * (e.g. the Python generator at koko.brain-os/vault/work/people/
 * _generate.py) consume the rules transcribed here as the source of
 * truth — so any change here must be mirrored on the producer side.
 *
 * See docs/adr/0029-frontmatter-yaml-canonical-form.md for the
 * full rule set and rationale.
 */

/**
 * YAML 1.2 core-schema reserved literals that must always be quoted
 * when written as a string scalar to avoid being re-parsed as
 * boolean / null. Note that `yes`/`no`/`on`/`off` are NOT in this
 * set (YAML 1.2 core schema does not reserve them) and stay bare.
 */
export const RESERVED_LITERALS: ReadonlySet<string> = new Set([
	'true',
	'false',
	'null',
	'Null',
	'NULL',
	'True',
	'False',
	'TRUE',
	'FALSE',
	'~',
]);

/**
 * Leading characters that force quoting when they appear at index 0
 * of a scalar. Mostly YAML flow / block indicators.
 */
export const MUST_QUOTE_LEADING_CHARS: ReadonlySet<string> = new Set([
	'[',
	']',
	'{',
	'}',
	'!',
	'&',
	'*',
	'>',
	'|',
	'@',
	'`',
	"'",
	'"',
	'#',
	'%',
	',',
]);

/**
 * Substrings that, when present anywhere in the scalar, force
 * quoting in mapping-value context. (Flow-sequence context is
 * stricter — see {@link FLOW_ITEM_MUST_QUOTE_SUBSTRINGS}.)
 */
export const SCALAR_MUST_QUOTE_SUBSTRINGS: readonly string[] = [
	': ',
	': \t',
	' #',
	'\t#',
];

/**
 * Additional substrings that quote inside a flow-sequence item. The comma
 * is the flow-sequence separator and `[ ] { }` are flow indicators, so any
 * of them appearing anywhere in the value (not just leading) would malform
 * the flow collection and forces quoting. yaml@2.9.0 quotes `a[b]c` inside
 * a flow sequence but leaves it bare in mapping-value context.
 */
export const FLOW_ITEM_MUST_QUOTE_SUBSTRINGS: readonly string[] = [',', '[', ']', '{', '}'];

/**
 * Matches strings that parse as YAML core-schema numbers, mirroring the
 * exact resolver regexes yaml@2.9.0 uses (`schema/core/int.js` +
 * `schema/core/float.js`) so the predicate cannot diverge from the library:
 * - octal `0o…`, decimal int `[-+]?[0-9]+` (leading-zero runs like `007`
 *   included), hex `0x…`;
 * - special floats: signed `.inf` / `.Inf` / `.INF` and UNSIGNED `.nan` /
 *   `.NaN` / `.NAN` (other casings and signed nan are NOT numbers);
 * - floats with a trailing dot (`1.`), leading dot (`.5`), or exponent.
 * All of these must be quoted when written as a string scalar.
 */
const NUMERIC_LIKE_REGEX =
	/^0o[0-7]+$|^[-+]?[0-9]+$|^0x[0-9a-fA-F]+$|^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$|^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$|^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/;

/**
 * Matches an ISO-style date or date-time that yaml@2.9.0 would
 * otherwise parse back as a Date. Must be quoted when written as
 * a string scalar.
 */
const ISO_DATE_LIKE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * The two contexts in which a YAML scalar can appear in our frontmatter:
 * - `mapping-value`: the right side of `key: …` at top level.
 * - `flow-item`: an element inside a flow sequence like `[a, b]`.
 *   Flow context is stricter because `,` is a separator.
 */
export type ScalarContext = 'mapping-value' | 'flow-item';

/**
 * Returns true when the given string scalar must be double-quoted to
 * round-trip through yaml@2.9.0 with our options.
 *
 * The predicate is intentionally one big disjunction so each clause
 * maps 1:1 to a documented rule in ADR 0029.
 */
export function shouldQuoteScalar(value: string, context: ScalarContext = 'mapping-value'): boolean {
	if (value === '') return true;

	if (RESERVED_LITERALS.has(value)) return true;

	if (NUMERIC_LIKE_REGEX.test(value)) return true;

	if (ISO_DATE_LIKE_REGEX.test(value)) {
		// Bare ISO dates are preserved by yaml as plain scalars — they
		// round-trip to Date objects, but our pipeline stringifies them
		// back. The library emits them bare; replicate that.
		return false;
	}

	const first = value[0];
	if (MUST_QUOTE_LEADING_CHARS.has(first)) return true;
	if ((first === '?' || first === '-') && value.length > 1 && (value[1] === ' ' || value[1] === '\t')) return true;
	// A lone `-` or `?` is a bare block indicator (sequence entry / mapping key)
	// and is quoted by yaml; `~` is the null indicator (handled the same way).
	if (value.length === 1 && (value === '-' || value === '?' || value === '~')) return true;
	if (first === ' ' || first === '\t') return true;

	const last = value[value.length - 1];
	if (last === ' ' || last === '\t' || last === ':') return true;

	for (const sub of SCALAR_MUST_QUOTE_SUBSTRINGS) {
		if (value.includes(sub)) return true;
	}

	if (context === 'flow-item') {
		for (const sub of FLOW_ITEM_MUST_QUOTE_SUBSTRINGS) {
			if (value.includes(sub)) return true;
		}
	}

	if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) return true;

	if (value.includes('\n') || value.includes('\r')) return true;

	return false;
}

/**
 * Returns the canonical emission for a string scalar — either the
 * bare value or its double-quoted form. The escaping mirrors
 * yaml@2.9.0's double-quoted string emission (backslash + double-quote
 * escape only; we intentionally do NOT emit `\n` escapes because the
 * predicate routes multiline scalars to the bare path, which serializeProperties
 * still hands off to yaml.Document for block-scalar emission).
 *
 * Note: yaml@2.9.0 sometimes picks single-quotes (when the value
 * contains a double-quote but no single-quote). This function always
 * emits double-quotes for the quoted case. Both forms are valid YAML
 * and round-trip to the same scalar; the discrepancy only matters for
 * exact byte-identical comparison against yaml's own output on values
 * containing literal `"` (rare in our frontmatter — wikilinks, URNs,
 * and emails do not contain quotes).
 */
export function canonicalizeScalar(value: string, context: ScalarContext = 'mapping-value'): string {
	if (!shouldQuoteScalar(value, context)) return value;
	const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	return `"${escaped}"`;
}
