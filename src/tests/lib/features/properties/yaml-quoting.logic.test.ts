import { describe, it, expect } from 'vitest';
import { Document, stringify, type YAMLSeq } from 'yaml';
import {
	shouldQuoteScalar,
	canonicalizeScalar,
	RESERVED_LITERALS,
	MUST_QUOTE_LEADING_CHARS,
} from '$lib/features/properties/yaml-quoting.logic';

/**
 * Strips the `k: ` prefix yaml.stringify emits for a single-key
 * mapping, returning just the scalar form (possibly empty for an
 * empty string emitted as `""`).
 */
function emitMappingValue(value: string): string {
	const out = stringify({ k: value }, { lineWidth: 0, flowCollectionPadding: false }).trimEnd();
	return out.startsWith('k: ') ? out.slice(3) : out.slice(out.indexOf(': ') + 2);
}

/**
 * Emits a single flow-sequence item as yaml@2.9.0 would, by building
 * a one-item flow sequence and extracting the slot between `[` and `]`.
 */
function emitFlowItem(value: string): string {
	const doc = new Document({});
	const seq = doc.createNode([value]);
	(seq as YAMLSeq).flow = true;
	doc.set('k', seq);
	const out = doc.toString({ lineWidth: 0, flowCollectionPadding: false }).trimEnd();
	const open = out.indexOf('[');
	const close = out.lastIndexOf(']');
	return out.slice(open + 1, close);
}

describe('shouldQuoteScalar (mapping-value context)', () => {
	it('quotes the empty string', () => {
		expect(shouldQuoteScalar('')).toBe(true);
	});

	it('leaves a plain identifier bare', () => {
		expect(shouldQuoteScalar('foo')).toBe(false);
	});

	it('leaves a bare word with a space bare', () => {
		expect(shouldQuoteScalar('foo bar')).toBe(false);
	});

	it('leaves emails bare (mid-string @)', () => {
		expect(shouldQuoteScalar('foo@bar.com')).toBe(false);
		expect(shouldQuoteScalar('jane.doe@example.com')).toBe(false);
	});

	it('quotes strings with a leading @', () => {
		expect(shouldQuoteScalar('@foo')).toBe(true);
	});

	it('leaves URN-style values bare (colon without trailing space)', () => {
		expect(shouldQuoteScalar('urn:example:identity:uuid:abc')).toBe(false);
	});

	it('quotes strings with ": " (colon + space)', () => {
		expect(shouldQuoteScalar('foo: bar')).toBe(true);
	});

	it('quotes strings ending in colon', () => {
		expect(shouldQuoteScalar('foo:')).toBe(true);
	});

	it('leaves "foo,bar" bare in mapping context', () => {
		expect(shouldQuoteScalar('foo,bar')).toBe(false);
	});

	it('leaves "foo, bar" bare in mapping context', () => {
		expect(shouldQuoteScalar('foo, bar')).toBe(false);
	});

	it('quotes strings with " #" (space + hash)', () => {
		expect(shouldQuoteScalar('foo #x')).toBe(true);
	});

	it('quotes wikilinks (leading [)', () => {
		expect(shouldQuoteScalar('[[Foo-Bar]]')).toBe(true);
	});

	it.each([...MUST_QUOTE_LEADING_CHARS])('quotes string starting with %j', (ch) => {
		expect(shouldQuoteScalar(`${ch}rest`)).toBe(true);
	});

	it('leaves ~tilde mid/start bare (only lone ~ is quoted)', () => {
		expect(shouldQuoteScalar('~tilde')).toBe(false);
	});

	it('quotes lone ~', () => {
		expect(shouldQuoteScalar('~')).toBe(true);
	});

	it('quotes "? " and "- " (indicator + space)', () => {
		expect(shouldQuoteScalar('? key')).toBe(true);
		expect(shouldQuoteScalar('- item')).toBe(true);
	});

	it('leaves "?nospace" and "-nospace" bare', () => {
		expect(shouldQuoteScalar('?nospace')).toBe(false);
		expect(shouldQuoteScalar('-nospace')).toBe(false);
	});

	it.each([...RESERVED_LITERALS])('quotes the reserved literal %j', (literal) => {
		expect(shouldQuoteScalar(literal)).toBe(true);
	});

	it('leaves yes/no/on/off bare (not reserved in YAML 1.2 core)', () => {
		expect(shouldQuoteScalar('yes')).toBe(false);
		expect(shouldQuoteScalar('no')).toBe(false);
		expect(shouldQuoteScalar('on')).toBe(false);
		expect(shouldQuoteScalar('off')).toBe(false);
		expect(shouldQuoteScalar('Yes')).toBe(false);
		expect(shouldQuoteScalar('No')).toBe(false);
	});

	it('quotes number-looking strings', () => {
		expect(shouldQuoteScalar('42')).toBe(true);
		expect(shouldQuoteScalar('-7')).toBe(true);
		expect(shouldQuoteScalar('3.14')).toBe(true);
		expect(shouldQuoteScalar('1e10')).toBe(true);
		expect(shouldQuoteScalar('.inf')).toBe(true);
		expect(shouldQuoteScalar('-.inf')).toBe(true);
		expect(shouldQuoteScalar('.nan')).toBe(true);
	});

	it('leaves ISO date-like strings bare', () => {
		expect(shouldQuoteScalar('2026-05-31')).toBe(false);
		expect(shouldQuoteScalar('2026-05-31T12:00:00')).toBe(false);
	});

	it('quotes strings with leading or trailing whitespace', () => {
		expect(shouldQuoteScalar(' leading')).toBe(true);
		expect(shouldQuoteScalar('trailing ')).toBe(true);
		expect(shouldQuoteScalar('\tleading-tab')).toBe(true);
	});

	it('leaves mid-string tabs bare', () => {
		expect(shouldQuoteScalar('mid\tspace')).toBe(false);
	});

	it('quotes strings containing newlines', () => {
		expect(shouldQuoteScalar('line\nbreak')).toBe(true);
	});

	it('leaves "100%" and "foo%bar" bare (only leading % quotes)', () => {
		expect(shouldQuoteScalar('100%')).toBe(false);
		expect(shouldQuoteScalar('foo%bar')).toBe(false);
	});

	it('leaves "foo@" bare (trailing @ does not quote)', () => {
		expect(shouldQuoteScalar('foo@')).toBe(false);
	});
});

describe('shouldQuoteScalar (flow-item context)', () => {
	it('quotes "foo,bar" because comma is the flow separator', () => {
		expect(shouldQuoteScalar('foo,bar', 'flow-item')).toBe(true);
	});

	it('quotes "foo, bar" in flow context', () => {
		expect(shouldQuoteScalar('foo, bar', 'flow-item')).toBe(true);
	});

	it('still leaves emails and URNs bare in flow context', () => {
		expect(shouldQuoteScalar('foo@bar.com', 'flow-item')).toBe(false);
		expect(shouldQuoteScalar('nurn:x:y', 'flow-item')).toBe(false);
	});

	it('still quotes wikilinks in flow context', () => {
		expect(shouldQuoteScalar('[[Foo]]', 'flow-item')).toBe(true);
	});
});

describe('canonicalizeScalar', () => {
	it('returns the bare value when no quoting is needed', () => {
		expect(canonicalizeScalar('foo@bar.com')).toBe('foo@bar.com');
		expect(canonicalizeScalar('nurn:x:y')).toBe('nurn:x:y');
	});

	it('wraps with double quotes when quoting is needed', () => {
		expect(canonicalizeScalar('[[Foo]]')).toBe('"[[Foo]]"');
		expect(canonicalizeScalar('')).toBe('""');
		expect(canonicalizeScalar('42')).toBe('"42"');
	});

	it('escapes inner double quotes', () => {
		expect(canonicalizeScalar('foo "bar" baz: ok')).toBe('"foo \\"bar\\" baz: ok"');
	});

	it('leaves a plain mid-string backslash bare', () => {
		// "a\b" has no triggers — yaml@2.9.0 also emits it bare.
		expect(canonicalizeScalar('a\\b')).toBe('a\\b');
	});
});

/**
 * Parity test: for every case in this table, our predicate must agree
 * with yaml@2.9.0's actual emission. If yaml's quoting policy ever
 * shifts (e.g. via an intentional version bump), this suite breaks
 * loudly so we can update the predicate (and the Python generator)
 * in lock-step.
 *
 * "Agree" means: shouldQuoteScalar returns true iff yaml's emitted
 * scalar starts with `"` (double quote). Block scalars (`|-`) and
 * single-quote emission are not used by yaml@2.9.0 with our options
 * for any of these inputs, so the comparison is unambiguous.
 */
const PARITY_CASES_MAPPING: readonly string[] = [
	'',
	'foo',
	'foo bar',
	'foo@bar.com',
	'@foo',
	'urn:example:identity:uuid:abc',
	'foo: bar',
	'foo:bar',
	':foo',
	'foo:',
	'foo,bar',
	'foo, bar',
	'foo #x',
	'[[Foo]]',
	'{a}',
	'!tag',
	'&anchor',
	'*ref',
	'>fold',
	'|literal',
	'`code`',
	"'single'",
	'"double"',
	'#hash',
	'%pct',
	'~tilde',
	'? key',
	'- list',
	'?nospace',
	'-nospace',
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
	'yes',
	'no',
	'on',
	'off',
	'Yes',
	'No',
	'42',
	'-7',
	'3.14',
	'1e10',
	'.inf',
	'-.inf',
	'.nan',
	'2026-05-31',
	'2026-05-31T12:00:00',
	' leading',
	'trailing ',
	'mid\tspace',
	'100%',
	'foo%bar',
	'foo@',
];

describe('parity with yaml@2.9.0 — mapping-value', () => {
	it.each(PARITY_CASES_MAPPING)('predicate matches yaml.stringify for %j', (value) => {
		const emitted = emitMappingValue(value);
		// yaml@2.9.0 sometimes picks single-quotes (e.g. when the value
		// contains a double-quote but no single-quote) — treat any quoted
		// form as "needs quoting" for parity purposes.
		const yamlQuotes = emitted.startsWith('"') || emitted.startsWith("'");
		expect(shouldQuoteScalar(value, 'mapping-value')).toBe(yamlQuotes);
	});
});

const PARITY_CASES_FLOW: readonly string[] = [
	'foo@bar.com',
	'nurn:x:y',
	'foo,bar',
	'foo, bar',
	'[[Foo]]',
	'true',
	'42',
	'yes',
	'plain',
	'#hash',
	'@start',
];

describe('parity with yaml@2.9.0 — flow-item', () => {
	it.each(PARITY_CASES_FLOW)('predicate matches yaml flow-seq emission for %j', (value) => {
		const emitted = emitFlowItem(value);
		// yaml@2.9.0 sometimes picks single-quotes (e.g. when the value
		// contains a double-quote but no single-quote) — treat any quoted
		// form as "needs quoting" for parity purposes.
		const yamlQuotes = emitted.startsWith('"') || emitted.startsWith("'");
		expect(shouldQuoteScalar(value, 'flow-item')).toBe(yamlQuotes);
	});
});
