import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import {
	filterProblem,
	findMatchingRules,
	findMoveRule,
	ownedProperties,
	propertiesToWrite,
	resolveDestination,
	sanitizeRuleProperties,
} from '#lib/features/auto-organize/auto-organize.logic.js';
import type { AutoOrganizeRule, RuleProperty } from '#lib/features/auto-organize/auto-organize.types.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';

/**
 * Runs the rules shown in the Overview and Examples sections of the Auto
 * Organize help page through the engine, so a copied example does what the
 * page says. The rules are read from the page itself; the sample notes and
 * the expected writes live in the fixture, keyed by rule name.
 */

const PAGE = readFileSync(join(process.cwd(), 'help/documentation/22-auto-organize.md'), 'utf-8');
const VAULT = '/vault';

interface SampleNote {
	/** Vault-relative note path */
	path: string;
	/** Full note text, frontmatter included */
	content: string;
}

interface MatchingNote extends SampleNote {
	/** Expected resolved destination; `{year}` is the current year. Absent when the rule does not move */
	destination?: string;
	/** Expected property writes, in order */
	writes: Pick<RuleProperty, 'key' | 'value'>[];
}

const FIXTURE = JSON.parse(
	readFileSync(join(process.cwd(), 'src/tests/help/auto-organize-doc-examples.fixture.json'), 'utf-8'),
) as Record<string, { matches: MatchingNote[]; misses: SampleNote[] }>;

/** The body of each `## <title>` section, up to the next `## ` heading. */
function section(markdown: string, title: string): string {
	const start = markdown.indexOf(`\n## ${title}\n`);
	if (start === -1) throw new Error(`No "## ${title}" section`);
	const rest = markdown.slice(start + title.length + 5);
	const end = rest.search(/\n## /);
	return end === -1 ? rest : rest.slice(0, end);
}

/** Every ```json block in `markdown`, parsed. */
function jsonBlocks(markdown: string): unknown[] {
	return [...markdown.matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => JSON.parse(m[1]));
}

const RULES = [...jsonBlocks(section(PAGE, 'Overview')), ...jsonBlocks(section(PAGE, 'Examples'))] as AutoOrganizeRule[];

/** Runs `rule` on a sample note the way a save does, without the disk. */
function run(rule: AutoOrganizeRule, note: SampleNote) {
	const filePath = `${VAULT}/${note.path}`;
	const record = buildNoteRecord(filePath, note.content, Date.now(), Date.now());
	const failures: unknown[] = [];
	const matched = findMatchingRules([rule], record, VAULT, (_rule, err) => failures.push(err));
	const mover = findMoveRule(matched);
	return {
		failures,
		matched: matched.length > 0,
		destination: mover ? resolveDestination(mover.destination, record, VAULT) : undefined,
		writes: propertiesToWrite(parseFrontmatterProperties(note.content), ownedProperties(matched)).map(({ key, value }) => ({
			key,
			value,
		})),
	};
}

describe('Auto Organize help page examples', () => {
	it('shows the overview rule and at least five example rules', () => {
		expect(RULES.length).toBeGreaterThanOrEqual(6);
		expect(RULES[0].name).toBe('Finished projects');
	});

	it('has a fixture entry for every rule on the page, and no stale ones', () => {
		expect(Object.keys(FIXTURE).sort()).toEqual(RULES.map((r) => r.name).sort());
	});

	it('has an "any" filter example saved as an or object', () => {
		expect(RULES.some((r) => typeof r.expression === 'object' && Array.isArray(r.expression.or))).toBe(true);
	});

	for (const rule of RULES) {
		describe(rule.name, () => {
			it('is a valid, enabled rule whose properties survive loading', () => {
				expect(rule.enabled).toBe(true);
				expect(filterProblem(rule.expression)).toBeNull();
				expect(sanitizeRuleProperties(rule.properties)).toEqual(rule.properties ?? []);
			});

			for (const note of FIXTURE[rule.name]?.matches ?? []) {
				it(`matches ${note.path} and writes what the page says`, () => {
					const result = run(rule, note);
					expect(result.failures).toEqual([]);
					expect(result.matched).toBe(true);
					const year = String(new Date().getFullYear());
					expect(result.destination).toBe(note.destination?.replace('{year}', year));
					expect(result.writes).toEqual(note.writes);
				});
			}

			for (const note of FIXTURE[rule.name]?.misses ?? []) {
				it(`does not match ${note.path} with other properties`, () => {
					const result = run(rule, note);
					expect(result.failures).toEqual([]);
					expect(result.matched).toBe(false);
					expect(result.writes).toEqual([]);
				});
			}
		});
	}
});
