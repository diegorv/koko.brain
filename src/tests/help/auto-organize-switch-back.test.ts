import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import {
	filterProblem,
	findMatchingRules,
	ownedProperties,
	propertiesToWrite,
	sanitizeRuleProperties,
} from '#lib/features/auto-organize/auto-organize.logic.js';
import type { AutoOrganizeRule, RuleProperty } from '#lib/features/auto-organize/auto-organize.types.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';

/**
 * Runs the rule pairs of the "Switching a value back" section of the Auto
 * Organize help page. Rules never revert their writes (PRD Decision 7), so the
 * page shows one rule for a state and one for its opposite. Each pair runs as
 * one rule list, the way a save sees it, so the test also checks on each
 * sample note that only one rule of the pair matches.
 */

const PAGE = readFileSync(join(process.cwd(), 'help/documentation/22-auto-organize.md'), 'utf-8');
const VAULT = '/vault';
const TITLE = 'Switching a value back';

interface SampleNote {
	/** Vault-relative note path */
	path: string;
	/** Full note text, frontmatter included */
	content: string;
	/** Names of the pair's rules that match the note, in list order */
	matched: string[];
	/** Expected property writes, in order */
	writes: Pick<RuleProperty, 'key' | 'value' | 'mode'>[];
}

const FIXTURE = JSON.parse(
	readFileSync(join(process.cwd(), 'src/tests/help/auto-organize-switch-back.fixture.json'), 'utf-8'),
) as { pairs: { rules: AutoOrganizeRule[]; notes: SampleNote[] }[] };

/** The body of the `## <title>` section, up to the next `## ` heading. */
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

/** Runs `rules` on a sample note the way a save does, without the disk. */
function run(rules: AutoOrganizeRule[], note: SampleNote) {
	const filePath = `${VAULT}/${note.path}`;
	const record = buildNoteRecord(filePath, note.content, Date.now(), Date.now());
	const failures: unknown[] = [];
	const matched = findMatchingRules(rules, record, VAULT, (_rule, err) => failures.push(err));
	return {
		failures,
		matched: matched.map((r) => r.name),
		writes: propertiesToWrite(parseFrontmatterProperties(note.content), ownedProperties(matched)).map(
			({ key, value, mode }) => (value === undefined ? { key, mode } : { key, value, mode }),
		),
	};
}

describe('Auto Organize help page: switching a value back', () => {
	it('shows every fixture rule on the page, in order', () => {
		expect(jsonBlocks(section(PAGE, TITLE))).toEqual(FIXTURE.pairs.flatMap((p) => p.rules));
	});

	it('has a pair that removes the value and a pair that sets a default', () => {
		const modes = FIXTURE.pairs.map((p) => p.rules[1].properties?.[0].mode);
		expect(modes).toEqual(['remove', 'always']);
	});

	for (const pair of FIXTURE.pairs) {
		const [state, opposite] = pair.rules;
		describe(`${state.name} / ${opposite.name}`, () => {
			for (const rule of pair.rules) {
				it(`${rule.name} is a valid, enabled rule whose properties survive loading`, () => {
					expect(rule.enabled).toBe(true);
					expect(filterProblem(rule.expression)).toBeNull();
					expect(sanitizeRuleProperties(rule.properties)).toEqual(rule.properties);
				});
			}

			for (const note of pair.notes) {
				it(`on ${note.path} with ${JSON.stringify(note.content)} writes what the page says`, () => {
					const result = run(pair.rules, note);
					expect(result.failures).toEqual([]);
					expect(result.matched).toEqual(note.matched);
					expect(result.writes).toEqual(note.writes);
				});
			}
		});
	}
});
