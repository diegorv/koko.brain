import { describe, it, expect } from 'vitest';
import { parse } from 'yaml';
import { serializeProperties } from '#lib/features/properties/properties.logic.js';
import type { Property } from '#lib/features/properties/properties.types.js';
import { canonicalizeKey } from '#lib/utils/frontmatter-aliases.js';
import fixture from '../../../fixtures/frontmatter-parity.fixture.json';

/** One case of the shared TS/Rust frontmatter parity fixture. */
interface ParityCase {
	name: string;
	yaml: string;
	expected: unknown;
	properties?: Property[];
	rustExpected?: unknown;
	tsExpected?: unknown;
	tsThrows?: boolean;
	rustOnly?: boolean;
}

/** The fixture's stand-in for a non-finite number, which JSON cannot hold. */
const INFINITY_SENTINEL = '__INFINITY__';

const cases = fixture.cases as ParityCase[];

/**
 * Projects a parsed YAML value the way the Rust index stores it: maps nested
 * at any depth become `null`, non-finite numbers become the fixture sentinel.
 */
function projectValue(value: unknown): unknown {
	if (value === null || value === undefined) return null;
	if (typeof value === 'number') return Number.isFinite(value) ? value : INFINITY_SENTINEL;
	if (typeof value === 'boolean' || typeof value === 'string') return value;
	if (Array.isArray(value)) return value.map(projectValue);
	return null;
}

/** Projects the top-level document: keys through `canonicalizeKey`, values through `projectValue`. */
function projectDocument(parsed: unknown): Record<string, unknown> {
	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
		result[canonicalizeKey(key)] = projectValue(value);
	}
	return result;
}

describe('frontmatter parity fixture', () => {
	it('has cases', () => {
		expect(cases.length).toBeGreaterThan(0);
	});

	describe('serializeProperties emits the fixture bytes', () => {
		const withProperties = cases.filter((c) => c.properties);
		it.each(withProperties.map((c) => [c.name, c] as const))('%s', (_name, c) => {
			expect(serializeProperties(c.properties!)).toBe(c.yaml);
		});
	});

	describe('yaml.parse reads the fixture bytes as the expected value', () => {
		const tsCases = cases.filter((c) => !c.rustOnly);
		it.each(tsCases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
			if (c.tsThrows) {
				expect(() => parse(c.yaml, { uniqueKeys: false })).toThrow();
				return;
			}
			const projected = projectDocument(parse(c.yaml, { uniqueKeys: false }));
			expect(projected).toEqual(c.tsExpected ?? c.expected);
		});
	});
});
