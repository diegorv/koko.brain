import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	findMatchingRule,
	isInExcludedFolder,
	isAlreadyInDestination,
	validateExpression,
	generateRuleId,
	resolveDestination,
	findMatchingRules,
	findMoveRule,
	sanitizeRuleProperties,
	ownedProperties,
	propertiesToWrite,
	applyPropertyWrites,
	propertyWriteSkipReason,
	countMatchingNotes,
	isBooleanOnlyKey,
	isRefusedKey,
	ruleValueEditor,
	parseRuleItems,
	filterProblem,
	hasBlankValue,
	volatileInputs,
	exprProblem,
	computeRuleValue,
	resolveComputedProperties,
	ruleRecordStats,
	type OwnedProperty,
} from '#lib/features/auto-organize/auto-organize.logic.js';
import type { FilterRow } from '#lib/features/collection/toolbar/toolbar.types.js';
import type { Property } from '#lib/core/frontmatter/properties.types.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import type { AutoOrganizeRule, RuleProperty } from '#lib/features/auto-organize/auto-organize.types.js';
import type { FilterItem, PropertyIndexRecord } from '#lib/features/collection/collection.types.js';

function makeRule(overrides: Partial<AutoOrganizeRule> = {}): AutoOrganizeRule {
	return {
		id: overrides.id ?? 'rule-1',
		name: overrides.name ?? 'Test rule',
		expression: overrides.expression ?? "file.hasTag('test')",
		destination: overrides.destination ?? 'Archive',
		enabled: overrides.enabled ?? true,
		...(overrides.properties ? { properties: overrides.properties } : {}),
	};
}

function makeRecord(overrides: Partial<PropertyIndexRecord> & { tags?: string[] } = {}): PropertyIndexRecord {
	const props = new Map<string, unknown>();
	if (overrides.tags) props.set('tags', overrides.tags);
	if (overrides.properties) {
		for (const [k, v] of overrides.properties) {
			props.set(k, v);
		}
	}
	return {
		path: overrides.path ?? '/vault/notes/test.md',
		name: overrides.name ?? 'test.md',
		basename: overrides.basename ?? 'test',
		folder: overrides.folder ?? '/vault/notes',
		ext: overrides.ext ?? '.md',
		mtime: overrides.mtime ?? Date.now(),
		ctime: overrides.ctime ?? Date.now(),
		size: overrides.size ?? 100,
		properties: props,
	};
}

describe('findMatchingRule', () => {
	it('returns the first matching rule', () => {
		const rules = [
			makeRule({ id: 'r1', expression: "file.hasTag('archive')" }),
			makeRule({ id: 'r2', expression: "file.hasTag('test')" }),
		];
		const record = makeRecord({ tags: ['test', 'archive'] });

		const result = findMatchingRule(rules, record, '/vault');
		expect(result?.id).toBe('r1');
	});

	it('resolves a relative file.inFolder against the vault path', () => {
		const rules = [makeRule({ id: 'inbox', expression: 'file.inFolder("Inbox")' })];
		const inInbox = makeRecord({ path: '/vault/Inbox/sub/n.md', folder: '/vault/Inbox/sub' });
		const sibling = makeRecord({ path: '/vault/Inboxes/n.md', folder: '/vault/Inboxes' });

		expect(findMatchingRule(rules, inInbox, '/vault')?.id).toBe('inbox');
		expect(findMatchingRule(rules, sibling, '/vault')).toBeNull();
		expect(findMatchingRule(rules, inInbox, '/other-vault')).toBeNull();
	});

	it('returns null when no rules match', () => {
		const rules = [
			makeRule({ expression: "file.hasTag('nonexistent')" }),
		];
		const record = makeRecord({ tags: ['other'] });

		expect(findMatchingRule(rules, record, '/vault')).toBeNull();
	});

	it('returns null for empty rules array', () => {
		const record = makeRecord({ tags: ['test'] });
		expect(findMatchingRule([], record, '/vault')).toBeNull();
	});

	it('skips disabled rules', () => {
		const rules = [
			makeRule({ id: 'r1', expression: "file.hasTag('test')", enabled: false }),
			makeRule({ id: 'r2', expression: "file.hasTag('test')", enabled: true }),
		];
		const record = makeRecord({ tags: ['test'] });

		const result = findMatchingRule(rules, record, '/vault');
		expect(result?.id).toBe('r2');
	});

	it('skips rules with invalid expressions gracefully', () => {
		const rules = [
			makeRule({ id: 'r1', expression: 'this is !!invalid syntax' }),
			makeRule({ id: 'r2', expression: "file.hasTag('test')" }),
		];
		const record = makeRecord({ tags: ['test'] });

		const result = findMatchingRule(rules, record, '/vault');
		expect(result?.id).toBe('r2');
	});

	it('first-match wins: returns first matching, not best matching', () => {
		const rules = [
			makeRule({ id: 'r1', expression: "file.hasTag('general')", destination: 'General' }),
			makeRule({ id: 'r2', expression: "file.hasTag('general') && file.hasTag('specific')", destination: 'Specific' }),
		];
		const record = makeRecord({ tags: ['general', 'specific'] });

		const result = findMatchingRule(rules, record, '/vault');
		expect(result?.id).toBe('r1');
		expect(result?.destination).toBe('General');
	});

	it('supports property-based expressions', () => {
		const record = makeRecord();
		record.properties.set('status', 'done');

		const rules = [
			makeRule({ expression: "status == 'done'" }),
		];

		expect(findMatchingRule(rules, record, '/vault')).not.toBeNull();
	});

	it('supports complex boolean expressions', () => {
		const record = makeRecord({ tags: ['project'] });
		record.properties.set('status', 'active');

		const rules = [
			makeRule({ expression: "file.hasTag('project') && status == 'active'" }),
		];

		expect(findMatchingRule(rules, record, '/vault')).not.toBeNull();
	});

	it('handles expression returning falsy but non-null (0, empty string)', () => {
		const record = makeRecord();
		record.properties.set('count', 0);

		const rules = [
			makeRule({ expression: 'count' }), // evaluates to 0, which is falsy
		];

		expect(findMatchingRule(rules, record, '/vault')).toBeNull();
	});

	describe('onError reporting', () => {
		/** `missing` is null, and `lower` only exists for string receivers. */
		const throwing = "missing.lower() == 'x'";

		it('reports the offending rule and the thrown error', () => {
			const reported: Array<{ id: string; message: string }> = [];
			const rules = [makeRule({ id: 'bad', expression: throwing })];

			expect(
				findMatchingRule(rules, makeRecord(), '/vault', (rule, err) =>
					reported.push({ id: rule.id, message: (err as Error).message }),
				),
			).toBeNull();

			expect(reported).toEqual([{ id: 'bad', message: 'Unknown method: lower' }]);
		});

		it('keeps evaluating later rules after one throws', () => {
			const reported: string[] = [];
			const rules = [
				makeRule({ id: 'bad', expression: throwing }),
				makeRule({ id: 'good', expression: "file.hasTag('test')" }),
			];
			const record = makeRecord({ tags: ['test'] });

			const result = findMatchingRule(rules, record, '/vault', (rule) => reported.push(rule.id));

			expect(result?.id).toBe('good');
			expect(reported).toEqual(['bad']);
		});

		it('does not report anything when every rule evaluates cleanly', () => {
			const reported: string[] = [];
			const rules = [makeRule({ id: 'r1', expression: "file.hasTag('test')" })];

			findMatchingRule(rules, makeRecord({ tags: ['test'] }), '/vault', (rule) => reported.push(rule.id));

			expect(reported).toEqual([]);
		});

		it('still skips a throwing rule when no reporter is supplied', () => {
			const rules = [
				makeRule({ id: 'bad', expression: throwing }),
				makeRule({ id: 'good', expression: "file.hasTag('test')" }),
			];

			expect(findMatchingRule(rules, makeRecord({ tags: ['test'] }), '/vault')?.id).toBe('good');
		});
	});
});

describe('isInExcludedFolder', () => {
	const vaultPath = '/Users/me/vault';

	it('returns true when file is in an excluded folder', () => {
		expect(
			isInExcludedFolder('/Users/me/vault/_templates/note.md', vaultPath, ['_templates']),
		).toBe(true);
	});

	it('returns true for nested files in excluded folder', () => {
		expect(
			isInExcludedFolder('/Users/me/vault/_templates/sub/note.md', vaultPath, ['_templates']),
		).toBe(true);
	});

	it('returns false when file is not in any excluded folder', () => {
		expect(
			isInExcludedFolder('/Users/me/vault/notes/note.md', vaultPath, ['_templates']),
		).toBe(false);
	});

	it('returns false for empty excluded folders list', () => {
		expect(
			isInExcludedFolder('/Users/me/vault/_templates/note.md', vaultPath, []),
		).toBe(false);
	});

	it('is case-insensitive', () => {
		expect(
			isInExcludedFolder('/Users/me/vault/Templates/note.md', vaultPath, ['templates']),
		).toBe(true);
	});

	it('does not match partial folder names', () => {
		expect(
			isInExcludedFolder('/Users/me/vault/_templates-old/note.md', vaultPath, ['_templates']),
		).toBe(false);
	});

	it('handles file at vault root', () => {
		expect(
			isInExcludedFolder('/Users/me/vault/note.md', vaultPath, ['_templates']),
		).toBe(false);
	});
});

describe('isAlreadyInDestination', () => {
	const vaultPath = '/Users/me/vault';

	it('returns true when file is already in destination', () => {
		expect(
			isAlreadyInDestination('/Users/me/vault/Archive/note.md', vaultPath, 'Archive'),
		).toBe(true);
	});

	it('returns false when file is in a different folder', () => {
		expect(
			isAlreadyInDestination('/Users/me/vault/notes/note.md', vaultPath, 'Archive'),
		).toBe(false);
	});

	it('is case-insensitive', () => {
		expect(
			isAlreadyInDestination('/Users/me/vault/archive/note.md', vaultPath, 'Archive'),
		).toBe(true);
	});

	it('does not match nested subfolders', () => {
		expect(
			isAlreadyInDestination('/Users/me/vault/Archive/sub/note.md', vaultPath, 'Archive'),
		).toBe(false);
	});

	it('handles file at vault root with empty destination', () => {
		expect(
			isAlreadyInDestination('/Users/me/vault/note.md', vaultPath, ''),
		).toBe(true);
	});
});

describe('validateExpression', () => {
	it('returns null for valid expressions', () => {
		expect(validateExpression("file.hasTag('test')")).toBeNull();
		expect(validateExpression("status == 'done'")).toBeNull();
		expect(validateExpression("file.hasTag('a') && status == 'b'")).toBeNull();
		expect(validateExpression("file.name.startsWith('daily')")).toBeNull();
	});

	it('returns error message for invalid expressions', () => {
		const result = validateExpression('this is !!invalid');
		expect(result).toBeTruthy();
		expect(typeof result).toBe('string');
	});

	it('returns error for empty expression', () => {
		expect(validateExpression('')).toBe('Expression cannot be empty');
		expect(validateExpression('   ')).toBe('Expression cannot be empty');
	});

	it('returns error for unclosed strings', () => {
		const result = validateExpression("file.hasTag('test");
		expect(result).toBeTruthy();
	});
});

describe('resolveDestination', () => {
	const vaultPath = '/Users/me/vault';

	it('resolves {folder} to vault-relative folder', () => {
		const record = makeRecord({ folder: '/Users/me/vault/work/squad-payments' });
		expect(resolveDestination('{folder}/_archive', record, vaultPath)).toBe('work/squad-payments/_archive');
	});

	it('resolves {basename}', () => {
		const record = makeRecord({ basename: 'Migrate-Gateway' });
		expect(resolveDestination('archive/{basename}', record, vaultPath)).toBe('archive/Migrate-Gateway');
	});

	it('resolves {type} and {status} from properties', () => {
		// `{type}` reads the canonical `_type` key (frontmatter `type:` is
		// aliased to `_type` at parse time); `status` is a plain user key.
		const record = makeRecord();
		record.properties.set('_type', 'project');
		record.properties.set('status', 'done');
		expect(resolveDestination('archive/{type}/{status}', record, vaultPath)).toBe('archive/project/done');
	});

	it('resolves {type} through the real buildNoteRecord parse path', () => {
		// Regression guard: buildNoteRecord canonicalises the bare `type:`
		// frontmatter key to `_type`, so resolveDestination must read `_type`.
		// A hand-set `type` key would mask the alias mismatch and pass even
		// when the real flow resolves `{type}` to an empty string.
		const record = buildNoteRecord('/Users/me/vault/inbox/note.md', '---\ntype: Project\n---\n');
		expect(resolveDestination('archive/{type}', record, vaultPath)).toBe('archive/Project');
	});

	it('resolves {type} to the casing-normalized type', () => {
		const record = buildNoteRecord('/Users/me/vault/inbox/note.md', '---\ntype: project\n---\n');
		expect(resolveDestination('archive/{type}', record, vaultPath)).toBe('archive/Project');
	});

	it('resolves {year} and {month}', () => {
		const record = makeRecord();
		const result = resolveDestination('{year}/{month}', record, vaultPath);
		const now = new Date();
		expect(result).toBe(`${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`);
	});

	it('leaves unknown variables as-is', () => {
		const record = makeRecord();
		expect(resolveDestination('{unknown}/path', record, vaultPath)).toBe('{unknown}/path');
	});

	it('returns static destination unchanged', () => {
		const record = makeRecord();
		expect(resolveDestination('Archive/done', record, vaultPath)).toBe('Archive/done');
	});

	it('handles file at vault root (empty folder)', () => {
		const record = makeRecord({ folder: '/Users/me/vault' });
		expect(resolveDestination('{folder}/_archive', record, vaultPath)).toBe('_archive');
	});

	it('handles missing properties gracefully', () => {
		const record = makeRecord();
		expect(resolveDestination('{type}/{status}', record, vaultPath)).toBe('');
	});

	it('resolves {parent} to parent of current folder', () => {
		const record = makeRecord({ folder: '/Users/me/vault/work/squad-payments/_archive' });
		expect(resolveDestination('{parent}', record, vaultPath)).toBe('work/squad-payments');
	});

	it('{parent} at one level deep returns empty string', () => {
		const record = makeRecord({ folder: '/Users/me/vault/work' });
		expect(resolveDestination('{parent}', record, vaultPath)).toBe('');
	});

	it('resolves multiple variables in one template', () => {
		const record = makeRecord({ folder: '/Users/me/vault/work', basename: 'My-Note' });
		record.properties.set('_type', 'task');
		expect(resolveDestination('{folder}/_archive/{type}/{basename}', record, vaultPath)).toBe('work/_archive/task/My-Note');
	});
});

describe('generateRuleId', () => {
	it('returns a string starting with "rule-"', () => {
		const id = generateRuleId();
		expect(id).toMatch(/^rule-/);
	});

	it('generates unique ids', () => {
		const ids = new Set(Array.from({ length: 10 }, () => generateRuleId()));
		expect(ids.size).toBe(10);
	});
});

describe('findMatchingRules', () => {
	it('returns every enabled matching rule in list order', () => {
		const rules = [
			makeRule({ id: 'r1', expression: "file.hasTag('test')" }),
			makeRule({ id: 'r2', expression: "file.hasTag('other')" }),
			makeRule({ id: 'r3', expression: "file.hasTag('test')", enabled: false }),
			makeRule({ id: 'r4', expression: 'true' }),
		];
		expect(findMatchingRules(rules, makeRecord({ tags: ['test'] }), '/vault').map((r) => r.id)).toEqual(['r1', 'r4']);
	});

	it('returns [] for no rules', () => {
		expect(findMatchingRules([], makeRecord(), '/vault')).toEqual([]);
	});

	it('skips a rule whose expression throws and reports it', () => {
		const reported: string[] = [];
		const rules = [makeRule({ id: 'bad', expression: '((' }), makeRule({ id: 'good', expression: 'true' })];
		expect(findMatchingRules(rules, makeRecord(), '/vault', (rule) => reported.push(rule.id)).map((r) => r.id)).toEqual(['good']);
		expect(reported).toEqual(['bad']);
	});

	it('resolves a relative file.inFolder against the vault path', () => {
		const rules = [makeRule({ id: 'aws', expression: 'file.inFolder("work/topics/AWS")', destination: '' })];
		const inside = makeRecord({ path: '/vault/work/topics/AWS/n.md', folder: '/vault/work/topics/AWS' });
		const sibling = makeRecord({ path: '/vault/work/topics/AWSX/n.md', folder: '/vault/work/topics/AWSX' });
		expect(findMatchingRules(rules, inside, '/vault').map((r) => r.id)).toEqual(['aws']);
		expect(findMatchingRules(rules, sibling, '/vault')).toEqual([]);
		expect(findMatchingRules(rules, inside, '/other-vault')).toEqual([]);
	});
});

describe('object filters', () => {
	const VAULT = '/vault';
	const note = (status: string) => makeRecord({ tags: ['test'], properties: new Map([['status', status]]) });
	const matches = (expression: FilterItem, record: PropertyIndexRecord) =>
		findMatchingRule([makeRule({ expression })], record, VAULT) !== null;

	it('or: matches when at least one item is true', () => {
		const filter = { or: ["status == 'done'", "status == 'dropped'"] };
		expect(matches(filter, note('dropped'))).toBe(true);
		expect(matches(filter, note('active'))).toBe(false);
	});

	it('and: matches when every item is true', () => {
		const filter = { and: ["status == 'done'", "file.hasTag('test')"] };
		expect(matches(filter, note('done'))).toBe(true);
		expect(matches(filter, makeRecord({ properties: new Map([['status', 'done']]) }))).toBe(false);
	});

	it('not: matches when no item is true', () => {
		const filter = { not: ["status == 'done'", "status == 'dropped'"] };
		expect(matches(filter, note('active'))).toBe(true);
		expect(matches(filter, note('dropped'))).toBe(false);
	});

	it('combines groups by AND and allows nesting', () => {
		const filter = { and: [{ or: ["status == 'done'", "status == 'dropped'"] }], not: ["file.hasTag('keep')"] };
		expect(matches(filter, note('done'))).toBe(true);
		expect(matches(filter, makeRecord({ tags: ['keep'], properties: new Map([['status', 'done']]) }))).toBe(false);
		expect(matches(filter, note('active'))).toBe(false);
	});

	it('findMatchingRules takes object filters and strings in one list', () => {
		const rules = [
			makeRule({ id: 'obj', expression: { or: ["status == 'done'", "status == 'dropped'"] } }),
			makeRule({ id: 'str', expression: "status == 'dropped'" }),
		];
		expect(findMatchingRules(rules, note('dropped'), VAULT).map((r) => r.id)).toEqual(['obj', 'str']);
	});

	it('a string rule still matches as before, and one that throws is still reported', () => {
		const reported: string[] = [];
		const rules = [
			makeRule({ id: 'bad', expression: "missing.lower() == 'x'" }),
			makeRule({ id: 'good', expression: "status == 'done'" }),
		];
		expect(findMatchingRules(rules, note('done'), VAULT, (rule) => reported.push(rule.id)).map((r) => r.id)).toEqual(['good']);
		expect(reported).toEqual(['bad']);
	});

	describe('a leaf that throws when evaluated skips the rule for that note and is reported', () => {
		const findWithReports = (expression: FilterItem, record: PropertyIndexRecord) => {
			const reported: Array<{ id: string; err: unknown }> = [];
			const matched = findMatchingRules([makeRule({ id: 'leaf', expression })], record, VAULT, (rule, err) =>
				reported.push({ id: rule.id, err }),
			);
			return { matched, reported };
		};

		it.each<[string, FilterItem]>([
			['an unknown method inside not', { not: ['status.nosuch()'] }],
			['a method on a missing property inside not', { not: ["status.lower() == 'x'"] }],
			['a nested failing leaf', { and: [{ not: ["status.lower() == 'x'"] }] }],
			['a failing leaf inside or', { or: ["status.lower() == 'x'", 'true'] }],
		])('%s', (_label, expression) => {
			const { matched, reported } = findWithReports(expression, makeRecord());
			expect(matched).toEqual([]);
			expect(reported).toHaveLength(1);
			expect(reported[0].id).toBe('leaf');
			expect(reported[0].err).toBeInstanceOf(Error);
		});

		it('still matches a note the leaf does not throw on: the rule is not marked broken', () => {
			const expression = { not: ["status.lower() == 'x'"] };
			expect(findWithReports(expression, makeRecord()).matched).toEqual([]);
			const { matched, reported } = findWithReports(expression, note('y'));
			expect(matched.map((r) => r.id)).toEqual(['leaf']);
			expect(reported).toEqual([]);
		});

		it('findMatchingRule reports it too', () => {
			const reported: string[] = [];
			const rule = makeRule({ id: 'leaf', expression: { not: ['status.nosuch()'] } });
			expect(findMatchingRule([rule], makeRecord(), VAULT, (r) => reported.push(r.id))).toBeNull();
			expect(reported).toEqual(['leaf']);
		});
	});

	describe('a broken or empty object filter matches no note and is reported', () => {
		const cases: Array<[string, FilterItem]> = [
			['an unparsable not leaf', { not: ['status =='] }],
			['a not leaf with a blank value', { not: ["file.name == ''"] }],
			['an empty object', {}],
			['an empty and', { and: [] }],
			['an unknown function', { or: ['nope(status)'] }],
			['a blank leaf', { or: ['  '] }],
			['a broken nested leaf', { and: [{ or: ['status =='] }] }],
			['a null item', { and: [null as unknown as string] }],
			['a non-list group', { or: "status == 'done'" as unknown as string[] }],
		];

		it.each(cases)('%s', (_label, expression) => {
			const reported: Array<{ id: string; message: string }> = [];
			const rules = [makeRule({ id: 'broken', expression })];
			for (const record of [note('done'), note('active'), makeRecord()]) {
				expect(findMatchingRules(rules, record, VAULT, (rule, err) => reported.push({ id: rule.id, message: (err as Error).message }))).toEqual([]);
			}
			expect(reported).toHaveLength(3);
			expect(reported[0].id).toBe('broken');
			expect(reported[0].message).toBe(filterProblem(expression));
		});

		it('findMatchingRule reports it too', () => {
			const reported: string[] = [];
			expect(findMatchingRule([makeRule({ id: 'empty', expression: {} })], note('done'), VAULT, (rule) => reported.push(rule.id))).toBeNull();
			expect(reported).toEqual(['empty']);
		});

		it('a JSON value that is no filter at all is reported, not thrown', () => {
			const reported: string[] = [];
			const rules = [makeRule({ id: 'num', expression: 42 as unknown as string })];
			expect(findMatchingRules(rules, note('done'), VAULT, (rule) => reported.push(rule.id))).toEqual([]);
			expect(reported).toEqual(['num']);
		});
	});
});

describe('filterProblem', () => {
	it('is null for a valid object filter', () => {
		expect(filterProblem({ or: ["status == 'done'", 'isEmpty(status)'], not: [{ and: ['priority > 3'] }] })).toBeNull();
	});

	it('is null for a valid string, unary operators included', () => {
		expect(filterProblem("status == 'done'")).toBeNull();
		expect(filterProblem('isEmpty(status)')).toBeNull();
		expect(filterProblem('archived == true')).toBeNull();
	});

	it('names a filter with no conditions', () => {
		expect(filterProblem({})).toBe('Filter has no conditions');
		expect(filterProblem({ and: [], or: [] })).toBe('Filter has no conditions');
		expect(filterProblem({ and: [{}] })).toBe('Filter has no conditions');
		// A nested empty object is true for every note, so `or` would match them all.
		expect(filterProblem({ or: ["status == 'x'", {}] })).toBe('Filter has no conditions');
	});

	it('names a row with a blank value', () => {
		expect(filterProblem({ not: ["file.name == ''"] })).toBe('Every filter needs a value');
		expect(filterProblem("status != ''")).toBe('Every filter needs a value');
		expect(filterProblem({ or: ["contains(tags, ' ')"] })).toBe('Every filter needs a value');
	});

	it('gives the parse error of a broken leaf', () => {
		expect(filterProblem({ not: ['status =='] })).toBe(validateExpression('status =='));
		expect(filterProblem({ or: ['nope(status)'] })).toBe('Unknown function: nope');
		expect(filterProblem({ or: [''] })).toBe('Expression cannot be empty');
	});

	it('names a value that is not a filter', () => {
		expect(filterProblem({ and: [null as unknown as string] })).toBe('Filter is not a list of conditions');
		expect(filterProblem({ or: 'x' as unknown as string[] })).toBe('Filter is not a list of conditions');
		expect(filterProblem(null as unknown as string)).toBe('Filter is not a list of conditions');
		expect(filterProblem(["status == 'done'"] as unknown as string)).toBe('Filter is not a list of conditions');
	});
});

describe('hasBlankValue', () => {
	const row = (overrides: Partial<FilterRow>): FilterRow => ({ id: 'r', property: 'status', operator: 'is', value: '', ...overrides });

	it('is true for a valued operator with a blank value', () => {
		expect(hasBlankValue(row({ value: '  ' }))).toBe(true);
	});

	it('is false once the row has a value', () => {
		expect(hasBlankValue(row({ value: 'done' }))).toBe(false);
	});

	it('is false for an operator that takes no value and for an expression row', () => {
		expect(hasBlankValue(row({ operator: 'is_empty' }))).toBe(false);
		expect(hasBlankValue(row({ raw: '' }))).toBe(false);
	});
});

describe('findMoveRule', () => {
	it('returns the first rule with a non-blank destination', () => {
		const rules = [
			makeRule({ id: 'r1', destination: '' }),
			makeRule({ id: 'r2', destination: '   ' }),
			makeRule({ id: 'r3', destination: 'Archive' }),
			makeRule({ id: 'r4', destination: 'Other' }),
		];
		expect(findMoveRule(rules)?.id).toBe('r3');
	});

	it('returns null when no rule has a destination, or for no rules', () => {
		expect(findMoveRule([makeRule({ destination: '' })])).toBeNull();
		expect(findMoveRule([])).toBeNull();
	});

	it('keeps a template that resolves to the vault root as a move', () => {
		expect(findMoveRule([makeRule({ destination: '{parent}' })])?.destination).toBe('{parent}');
	});
});

describe('sanitizeRuleProperties', () => {
	it('keeps valid entries of every value type', () => {
		const valid = [
			{ key: '_belongs_to', value: '[[AWS]]', mode: 'if-missing' },
			{ key: 'priority', value: 2, mode: 'always' },
			{ key: '_organized', value: true, mode: 'if-missing' },
			{ key: 'tags', value: ['a', 'b'], mode: 'always' },
		];
		expect(sanitizeRuleProperties(valid)).toEqual(valid);
	});

	it('returns [] for a missing, null or non-array value', () => {
		expect(sanitizeRuleProperties(undefined)).toEqual([]);
		expect(sanitizeRuleProperties(null)).toEqual([]);
		expect(sanitizeRuleProperties({ key: 'x' })).toEqual([]);
	});

	it('drops a blank key, a missing or unknown mode, and a value of another type', () => {
		expect(sanitizeRuleProperties([
			null,
			'x',
			{ key: '  ', value: 'a', mode: 'always' },
			{ key: 'a', value: 'a' },
			{ key: 'a', value: 'a', mode: 'sometimes' },
			{ key: 'a', value: { nested: true }, mode: 'always' },
			{ key: 'a', value: null, mode: 'always' },
			{ key: 'a', value: [1, 2], mode: 'always' },
		])).toEqual([]);
	});

	it('drops todoist_project and a non-boolean lifecycle value, by canonical key', () => {
		expect(sanitizeRuleProperties([
			{ key: 'todoist_project', value: 'Work', mode: 'always' },
			{ key: '_archived', value: 'true', mode: 'always' },
			{ key: 'organized', value: 'false', mode: 'if-missing' },
			{ key: 'favorite', value: 1, mode: 'always' },
			{ key: 'archived', value: false, mode: 'always' },
		])).toEqual([{ key: 'archived', value: false, mode: 'always' }]);
	});

	it('keeps a remove without a value, on any key but todoist_project, and strips a stray value', () => {
		expect(sanitizeRuleProperties([
			{ key: 'status', mode: 'remove' },
			{ key: 'tags', value: 'draft', mode: 'remove' },
			{ key: '_archived', mode: 'remove' },
			{ key: 'favorite', value: 'yes', mode: 'remove' },
			{ key: 'todoist_project', mode: 'remove' },
			{ key: ' ', mode: 'remove' },
		])).toEqual([
			{ key: 'status', mode: 'remove' },
			{ key: 'tags', mode: 'remove' },
			{ key: '_archived', mode: 'remove' },
			{ key: 'favorite', mode: 'remove' },
		]);
	});

	it('keeps an add with text or a list of text holding a non-blank item', () => {
		const valid = [
			{ key: 'tags', value: 'work', mode: 'add' },
			{ key: 'projects', value: ['[[A]]', ' '], mode: 'add' },
		];
		expect(sanitizeRuleProperties(valid)).toEqual(valid);
	});

	it('drops an add with no item left, or a value that is not text', () => {
		expect(sanitizeRuleProperties([
			{ key: 'tags', value: true, mode: 'add' },
			{ key: 'tags', value: 3, mode: 'add' },
			{ key: 'tags', value: '  ', mode: 'add' },
			{ key: 'tags', value: [], mode: 'add' },
			{ key: 'tags', value: ['', ' '], mode: 'add' },
			{ key: 'tags', value: '#', mode: 'add' },
			{ key: 'tags', mode: 'add' },
			{ key: 'todoist_project', value: 'Work', mode: 'add' },
			{ key: '_archived', value: 'x', mode: 'add' },
		])).toEqual([]);
	});

	it('still requires a value for if-missing and always', () => {
		expect(sanitizeRuleProperties([
			{ key: 'status', mode: 'always' },
			{ key: 'status', mode: 'if-missing' },
		])).toEqual([]);
	});

	it('keeps an entry with exactly one of value and a non-blank expr', () => {
		const valid = [
			{ key: 'title', expr: 'file.basename', mode: 'always' },
			{ key: 'tags', expr: 'file.folder', mode: 'add' },
			{ key: '_archived', expr: 'status == "done"', mode: 'if-missing' },
		];
		expect(sanitizeRuleProperties(valid)).toEqual(valid);
		expect(sanitizeRuleProperties([
			{ key: 'a', value: 'x', expr: 'file.basename', mode: 'always' },
			{ key: 'a', expr: '', mode: 'always' },
			{ key: 'a', expr: 3, mode: 'always' },
			{ key: 'a', expr: 'file.basename', mode: 'sometimes' },
			{ key: '_archived', expr: 'true', mode: 'add' },
			{ key: 'todoist_project', expr: 'file.basename', mode: 'always' },
		])).toEqual([]);
	});

	it('strips the expr of a remove', () => {
		expect(sanitizeRuleProperties([{ key: 'a', expr: 'file.basename', mode: 'remove' }])).toEqual([{ key: 'a', mode: 'remove' }]);
	});

	it('drops a volatile expr with always or add and reports it, keeps it with if-missing', () => {
		const refused: string[] = [];
		expect(sanitizeRuleProperties([
			{ key: 'a', expr: 'now()', mode: 'always' },
			{ key: 'b', expr: 'file.size', mode: 'add' },
			{ key: 'c', expr: 'file.ctime', mode: 'if-missing' },
			{ key: 'd', expr: '', mode: 'always' },
		], (key, reason) => refused.push(`${key}: ${reason}`))).toEqual([{ key: 'c', expr: 'file.ctime', mode: 'if-missing' }]);
		expect(refused).toEqual([
			'a: now() changes on every save, so it works only with "if missing"',
			'b: file.size changes on every save, so it works only with "if missing"',
		]);
	});
});

describe('ownedProperties', () => {
	it('gives each canonical key to the first rule that names it', () => {
		const r1 = makeRule({ id: 'r1', properties: [{ key: 'icon', value: 'lucide:star', mode: 'if-missing' }] });
		const r2 = makeRule({ id: 'r2', properties: [
			{ key: '_icon', value: 'lucide:cloud', mode: 'always' },
			{ key: 'status', value: 'active', mode: 'always' },
		] });
		const owned = ownedProperties([r1, r2]);
		expect(owned.map((p) => [p.key, p.value, p.rule.id])).toEqual([
			['_icon', 'lucide:star', 'r1'],
			['status', 'active', 'r2'],
		]);
	});

	it('returns [] for rules without properties, or no rules', () => {
		expect(ownedProperties([makeRule(), makeRule({ properties: [] })])).toEqual([]);
		expect(ownedProperties([])).toEqual([]);
	});

	it('ignores entries the loader would drop, such as an unfinished Settings row', () => {
		const rule = makeRule({ properties: [
			{ key: '', value: 'x', mode: 'always' },
			{ key: 'todoist_project', value: 'Work', mode: 'always' },
			{ key: '_archived', value: 'yes', mode: 'always' },
			{ key: 'status', value: 'done', mode: 'always' },
		] });
		expect(ownedProperties([rule]).map((p) => p.key)).toEqual(['status']);
	});
});

describe('isBooleanOnlyKey', () => {
	it('is true for the lifecycle keys and their aliases', () => {
		for (const key of ['_organized', '_archived', '_favorite', 'organized', 'archived', 'favorite']) {
			expect(isBooleanOnlyKey(key)).toBe(true);
		}
	});

	it('is false for other keys and the empty key', () => {
		expect(isBooleanOnlyKey('status')).toBe(false);
		expect(isBooleanOnlyKey('')).toBe(false);
	});
});

describe('isRefusedKey', () => {
	it('is true for todoist_project', () => {
		expect(isRefusedKey('todoist_project')).toBe(true);
	});

	it('is false for other keys and the empty key', () => {
		expect(isRefusedKey('status')).toBe(false);
		expect(isRefusedKey('')).toBe(false);
	});
});

describe('ruleValueEditor', () => {
	it('picks a yes/no switch for a boolean-only key or a boolean value', () => {
		expect(ruleValueEditor('_archived', false, 'always')).toBe('boolean');
		expect(ruleValueEditor('archived', 'x', 'always')).toBe('boolean');
		expect(ruleValueEditor('pinned', true, 'always')).toBe('boolean');
	});

	it('picks the icon picker for _icon and its alias', () => {
		expect(ruleValueEditor('_icon', 'lucide:star', 'always')).toBe('icon');
		expect(ruleValueEditor('icon', '', 'always')).toBe('icon');
	});

	it('picks the color controls for _color and _title_color', () => {
		expect(ruleValueEditor('_color', '#ef4444', 'always')).toBe('color');
		expect(ruleValueEditor('title_color', '', 'always')).toBe('color');
	});

	it('leaves numbers and lists to the JSON', () => {
		expect(ruleValueEditor('priority', 2, 'always')).toBe('json');
		expect(ruleValueEditor('tags', ['a'], 'always')).toBe('json');
	});

	it('uses text for any other key, including an empty one', () => {
		expect(ruleValueEditor('status', 'done', 'always')).toBe('text');
		expect(ruleValueEditor('', '', 'always')).toBe('text');
	});

	it('shows no value for remove and the items field for add, whatever the key', () => {
		expect(ruleValueEditor('_archived', undefined, 'remove')).toBe('none');
		expect(ruleValueEditor('status', 'x', 'remove')).toBe('none');
		expect(ruleValueEditor('tags', ['a'], 'add')).toBe('items');
		expect(ruleValueEditor('_icon', '', 'add')).toBe('items');
	});
});

describe('parseRuleItems', () => {
	it('splits on commas, trims, and leaves out blank items', () => {
		expect(parseRuleItems('a, , b ,c')).toEqual(['a', 'b', 'c']);
		expect(parseRuleItems('[[A]]')).toEqual(['[[A]]']);
	});

	it('is [] for an empty or blank field', () => {
		expect(parseRuleItems('')).toEqual([]);
		expect(parseRuleItems(' , ')).toEqual([]);
	});
});

describe('countMatchingNotes', () => {
	const VAULT = '/vault';
	function index(...records: PropertyIndexRecord[]): Map<string, PropertyIndexRecord> {
		return new Map(records.map((r) => [r.path, r]));
	}
	const done = makeRecord({ path: '/vault/a.md', properties: new Map([['status', 'done']]) });
	const open = makeRecord({ path: '/vault/b.md', properties: new Map([['status', 'open']]) });

	it('counts the index records the filter matches', () => {
		expect(countMatchingNotes("status == 'done'", index(done, open), VAULT)).toBe(1);
		expect(countMatchingNotes('stauts == null', index(done, open), VAULT)).toBe(2);
	});

	it('is 0 for an empty or blank filter', () => {
		expect(countMatchingNotes('', index(done, open), VAULT)).toBe(0);
		expect(countMatchingNotes('   ', index(done, open), VAULT)).toBe(0);
	});

	it('is 0 for an empty index', () => {
		expect(countMatchingNotes("status == 'done'", new Map(), VAULT)).toBe(0);
	});

	it('is null for a filter that does not parse', () => {
		expect(countMatchingNotes("status == 'done", index(done), VAULT)).toBeNull();
	});

	it('leaves out .view records, which are not notes', () => {
		const view = makeRecord({ path: '/vault/v.view', ext: '.view', properties: new Map([['status', 'done']]) });
		expect(countMatchingNotes("status == 'done'", index(done, view), VAULT)).toBe(1);
	});

	it('resolves a relative file.inFolder against the vault path, like the save path', () => {
		const inbox = makeRecord({ path: '/vault/Inbox/n.md', folder: '/vault/Inbox' });
		expect(countMatchingNotes("file.inFolder('Inbox')", index(inbox, done), VAULT)).toBe(1);
	});

	it('counts an object filter', () => {
		const dropped = makeRecord({ path: '/vault/c.md', properties: new Map([['status', 'dropped']]) });
		expect(countMatchingNotes({ or: ["status == 'done'", "status == 'dropped'"] }, index(done, open, dropped), VAULT)).toBe(2);
		expect(countMatchingNotes({ not: ["status == 'done'"] }, index(done, open, dropped), VAULT)).toBe(2);
	});

	it('is null for a broken or empty object filter', () => {
		expect(countMatchingNotes({ not: ["file.name == ''"] }, index(done, open), VAULT)).toBeNull();
		expect(countMatchingNotes({}, index(done, open), VAULT)).toBeNull();
	});

	it('does not count a note an object filter leaf throws on', () => {
		const bare = makeRecord({ path: '/vault/c.md' });
		expect(countMatchingNotes({ not: ["status.lower() == 'x'"] }, index(done, open, bare), VAULT)).toBe(2);
		expect(countMatchingNotes({ not: ['status.nosuch()'] }, index(done, open, bare), VAULT)).toBe(0);
	});
});

describe('propertiesToWrite', () => {
	const prop = (key: string, value: Property['value'], type: Property['type'] = 'text'): Property => ({ key, value, type });
	const own = (key: string, value: Property['value'], mode: 'if-missing' | 'always') =>
		ownedProperties([makeRule({ properties: [{ key, value, mode }] })]);

	it('if-missing writes an absent, empty or empty-list key', () => {
		expect(propertiesToWrite([], own('x', 'v', 'if-missing'))).toHaveLength(1);
		expect(propertiesToWrite([prop('x', '')], own('x', 'v', 'if-missing'))).toHaveLength(1);
		expect(propertiesToWrite([prop('x', [], 'list')], own('x', 'v', 'if-missing'))).toHaveLength(1);
		expect(propertiesToWrite([prop('x', null as unknown as string)], own('x', 'v', 'if-missing'))).toHaveLength(1);
	});

	it('if-missing leaves a present value, false and 0 included', () => {
		expect(propertiesToWrite([prop('x', 'other')], own('x', 'v', 'if-missing'))).toEqual([]);
		expect(propertiesToWrite([prop('x', false, 'boolean')], own('x', true, 'if-missing'))).toEqual([]);
		expect(propertiesToWrite([prop('x', 0, 'number')], own('x', 1, 'if-missing'))).toEqual([]);
	});

	it('always writes a differing value and skips an equal one', () => {
		expect(propertiesToWrite([prop('x', 'paused')], own('x', 'active', 'always'))).toHaveLength(1);
		expect(propertiesToWrite([prop('x', 'active')], own('x', 'active', 'always'))).toEqual([]);
		expect(propertiesToWrite([prop('x', '1')], own('x', 1, 'always'))).toHaveLength(1);
	});

	it('always compares lists item by item', () => {
		expect(propertiesToWrite([prop('x', ['a', 'b'], 'list')], own('x', ['a', 'b'], 'always'))).toEqual([]);
		expect(propertiesToWrite([prop('x', ['b', 'a'], 'list')], own('x', ['a', 'b'], 'always'))).toHaveLength(1);
		expect(propertiesToWrite([prop('x', 'a')], own('x', ['a'], 'always'))).toHaveLength(1);
	});

	it('matches an aliased current key by its canonical form', () => {
		expect(propertiesToWrite([prop('icon', 'lucide:book')], own('_icon', 'lucide:cloud', 'if-missing'))).toEqual([]);
	});

	it('returns [] when nothing is owned', () => {
		expect(propertiesToWrite([prop('x', 'a')], [])).toEqual([]);
	});

	describe('remove', () => {
		const remove = (key: string) => ownedProperties([makeRule({ properties: [{ key, mode: 'remove' }] })]);

		it('writes when the key is there, empty value included', () => {
			expect(propertiesToWrite([prop('x', 'a')], remove('x'))).toHaveLength(1);
			expect(propertiesToWrite([prop('x', '')], remove('x'))).toHaveLength(1);
			expect(propertiesToWrite([prop('_archived', false, 'boolean')], remove('archived'))).toHaveLength(1);
		});

		it('writes nothing when the key is absent', () => {
			expect(propertiesToWrite([prop('y', 'a')], remove('x'))).toEqual([]);
			expect(propertiesToWrite([], remove('x'))).toEqual([]);
		});
	});

	describe('add', () => {
		const add = (key: string, value: string | string[]) => ownedProperties([makeRule({ properties: [{ key, value, mode: 'add' }] })]);

		it('writes when an item is missing, and not when every item is there', () => {
			expect(propertiesToWrite([prop('x', ['a'], 'list')], add('x', 'b'))).toHaveLength(1);
			expect(propertiesToWrite([prop('x', ['a', 'b'], 'list')], add('x', ['b', 'a']))).toEqual([]);
			expect(propertiesToWrite([prop('x', 'a')], add('x', 'a'))).toEqual([]);
		});

		it('writes on an absent or empty key', () => {
			expect(propertiesToWrite([], add('x', 'a'))).toHaveLength(1);
			expect(propertiesToWrite([prop('x', '')], add('x', 'a'))).toHaveLength(1);
			expect(propertiesToWrite([prop('x', [], 'list')], add('x', 'a'))).toHaveLength(1);
		});

		it('compares items as exact strings, tags without a leading #', () => {
			expect(propertiesToWrite([prop('x', ['A'], 'list')], add('x', 'a'))).toHaveLength(1);
			expect(propertiesToWrite([prop('x', ['#a'], 'list')], add('x', 'a'))).toHaveLength(1);
			expect(propertiesToWrite([prop('tags', ['#a'], 'list')], add('tags', 'a'))).toEqual([]);
			expect(propertiesToWrite([prop('tags', ['a'], 'list')], add('tags', '#a'))).toEqual([]);
		});

		it('skips a number or a boolean value and reports it', () => {
			const skipped: string[] = [];
			const onSkip = (p: { key: string }) => skipped.push(p.key);
			expect(propertiesToWrite([prop('n', 3, 'number')], add('n', 'a'), onSkip)).toEqual([]);
			expect(propertiesToWrite([prop('b', true, 'boolean')], add('b', 'a'), onSkip)).toEqual([]);
			expect(skipped).toEqual(['n', 'b']);
		});

		it('does not report a list or text value', () => {
			const skipped: string[] = [];
			propertiesToWrite([prop('x', 'a'), prop('y', ['a'], 'list')], [...add('x', 'b'), ...add('y', 'b')], (p) => skipped.push(p.key));
			expect(skipped).toEqual([]);
		});
	});
});

describe('applyPropertyWrites', () => {
	it('replaces an existing key in place and appends a new one, typed by the value', () => {
		const writes = ownedProperties([makeRule({ properties: [
			{ key: 'status', value: 'active', mode: 'always' },
			{ key: 'done', value: true, mode: 'always' },
			{ key: 'n', value: 3, mode: 'always' },
			{ key: 'tags', value: ['a'], mode: 'always' },
		] })]);
		const current: Property[] = [
			{ key: 'status', value: 'paused', type: 'text' },
			{ key: 'other', value: 'kept', type: 'text' },
		];
		expect(applyPropertyWrites(current, writes)).toEqual([
			{ key: 'status', value: 'active', type: 'text' },
			{ key: 'other', value: 'kept', type: 'text' },
			{ key: 'done', value: true, type: 'boolean' },
			{ key: 'n', value: 3, type: 'number' },
			{ key: 'tags', value: ['a'], type: 'list' },
		]);
		expect(current[0].value).toBe('paused');
	});

	it('returns the input for no writes', () => {
		const current: Property[] = [{ key: 'x', value: 'a', type: 'text' }];
		expect(applyPropertyWrites(current, [])).toBe(current);
	});

	it('removes a key, matched by its canonical form', () => {
		const writes = ownedProperties([makeRule({ properties: [{ key: 'archived', mode: 'remove' }] })]);
		const current: Property[] = [
			{ key: '_archived', value: true, type: 'boolean' },
			{ key: 'other', value: 'kept', type: 'text' },
		];
		expect(applyPropertyWrites(current, writes)).toEqual([{ key: 'other', value: 'kept', type: 'text' }]);
	});

	it('adds trimmed, missing items in order and keeps the existing order', () => {
		const writes = ownedProperties([makeRule({ properties: [{ key: 'x', value: [' c ', 'a', '', 'd', 'c'], mode: 'add' }] })]);
		expect(applyPropertyWrites([{ key: 'x', value: ['b', 'a'], type: 'list' }], writes)).toEqual([
			{ key: 'x', value: ['b', 'a', 'c', 'd'], type: 'list' },
		]);
	});

	it('adds to a single string, an empty value and an absent key', () => {
		const writes = (key: string) => ownedProperties([makeRule({ properties: [{ key, value: 'new', mode: 'add' }] })]);
		expect(applyPropertyWrites([{ key: 'x', value: 'old', type: 'text' }], writes('x'))).toEqual([
			{ key: 'x', value: ['old', 'new'], type: 'list' },
		]);
		expect(applyPropertyWrites([{ key: 'x', value: '', type: 'text' }], writes('x'))).toEqual([
			{ key: 'x', value: ['new'], type: 'list' },
		]);
		expect(applyPropertyWrites([], writes('x'))).toEqual([{ key: 'x', value: ['new'], type: 'list' }]);
	});

	it('adds a tag without its leading #', () => {
		const writes = ownedProperties([makeRule({ properties: [{ key: 'tags', value: ['#work', '#a'], mode: 'add' }] })]);
		expect(applyPropertyWrites([{ key: 'tags', value: ['a'], type: 'list' }], writes)).toEqual([
			{ key: 'tags', value: ['a', 'work'], type: 'list' },
		]);
	});
});

describe('propertyWriteSkipReason', () => {
	const folders = ['_system', 'Templates'];

	it('allows a plain note, a note without frontmatter, and an empty note', () => {
		expect(propertyWriteSkipReason('/vault/a.md', '---\nx: 1\n---\nbody', '/vault', folders)).toBeNull();
		expect(propertyWriteSkipReason('/vault/a.md', '# body', '/vault', folders)).toBeNull();
		expect(propertyWriteSkipReason('/vault/a.md', '', '/vault', folders)).toBeNull();
	});

	it('refuses non-Markdown files', () => {
		expect(propertyWriteSkipReason('/vault/b.canvas', '{}', '/vault', folders)).toBe('not Markdown');
		expect(propertyWriteSkipReason('/vault/b.kanban', '', '/vault', folders)).toBe('not Markdown');
	});

	it('refuses notes inside a protected folder, matched as a folder prefix', () => {
		expect(propertyWriteSkipReason('/vault/_system/t.md', '', '/vault', folders)).toBe('inside _system/');
		expect(propertyWriteSkipReason('/vault/Templates/deep/t.md', '', '/vault', ['/Templates/'])).toBe('inside Templates/');
		expect(propertyWriteSkipReason('/vault/_system2/t.md', '', '/vault', folders)).toBeNull();
		expect(propertyWriteSkipReason('/vault/t.md', '', '/vault', ['', '  '])).toBeNull();
	});

	it('matches a protected folder case-insensitively', () => {
		expect(propertyWriteSkipReason('/vault/_system/t.md', '', '/vault', ['_System'])).toBe('inside _System/');
		expect(propertyWriteSkipReason('/vault/templates/t.md', '', '/vault', ['Templates'])).toBe('inside Templates/');
	});

	it('refuses lossy frontmatter and a --- start with no readable block', () => {
		expect(propertyWriteSkipReason('/vault/a.md', '---\n# c\nx: 1\n---\n', '/vault', folders)).toBe('frontmatter is comments');
		expect(propertyWriteSkipReason('/vault/a.md', '---\n---\nbody', '/vault', folders)).toBe('frontmatter block is unreadable');
		expect(propertyWriteSkipReason('/vault/a.md', '---\nx: 1\nbody', '/vault', folders)).toBe('frontmatter block is unreadable');
	});

	it('refuses a type definition, by canonical key', () => {
		expect(propertyWriteSkipReason('/vault/P.md', '---\ntype: Type\n---\n', '/vault', folders)).toBe('type definition');
		expect(propertyWriteSkipReason('/vault/P.md', '---\n_type: Project\n---\n', '/vault', folders)).toBeNull();
	});

	it('refuses a type definition whose _type is lowercase, as the app normalizes its casing', () => {
		expect(propertyWriteSkipReason('/vault/P.md', '---\n_type: type\n---\n', '/vault', folders)).toBe('type definition');
	});
});

describe('volatileInputs', () => {
	it.each([
		['now()', ['now()']],
		['now().format("YYYY")', ['now()']],
		['file.mtime', ['file.mtime']],
		['file.mtime.format("YYYY")', ['file.mtime']],
		['file.size * 2', ['file.size']],
		['if(status == "x", file.ctime, today())', ['file.ctime']],
		['[file.basename, now()]', ['now()']],
		['file.basename', []],
		['today() + "7d"', []],
		['status ==', []],
	])('%s reads %j', (expr, inputs) => {
		expect(volatileInputs(expr)).toEqual(inputs);
	});
});

describe('exprProblem', () => {
	it('accepts a valid expression', () => {
		expect(exprProblem('file.basename', 'always')).toBeNull();
	});

	it('refuses a blank expression', () => {
		expect(exprProblem('  ', 'if-missing')).toBe('Expression cannot be empty');
	});

	it('reports the validator error for a parse error or an unknown function', () => {
		expect(exprProblem('status ==', 'if-missing')).not.toBeNull();
		expect(exprProblem('nope(1)', 'if-missing')).toBe('Unknown function: nope');
	});

	it('refuses a volatile input with always or add, and accepts it with if-missing', () => {
		expect(exprProblem('now()', 'always')).toBe('now() changes on every save, so it works only with "if missing"');
		expect(exprProblem('file.size', 'add')).toBe('file.size changes on every save, so it works only with "if missing"');
		expect(exprProblem('file.ctime', 'if-missing')).toBeNull();
	});
});

describe('computeRuleValue', () => {
	const record = buildNoteRecord('/vault/projects/Alpha/note.md', '---\nstatus: done\ntags: [a, b]\n---\n', 1, 1, 10);
	const ctx = { record, formulas: {}, vaultPath: '/vault' };
	const compute = (expr: string, key = 'x', mode: RuleProperty['mode'] = 'always') => computeRuleValue({ key, expr, mode }, ctx);

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 5, 10, 15, 4, 5));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns text, a number, a boolean and a list of text as they are', () => {
		expect(compute('file.basename')).toEqual({ value: 'note' });
		expect(compute('1 + 2')).toEqual({ value: 3 });
		expect(compute('status == "done"')).toEqual({ value: true });
		expect(compute('tags')).toEqual({ value: ['a', 'b'] });
	});

	it('writes a date as the local day, and with now() as the local date and time', () => {
		expect(compute('today() + "7d"', 'x', 'if-missing')).toEqual({ value: '2026-06-17' });
		expect(compute('date("2026-01-05")', 'x', 'if-missing')).toEqual({ value: '2026-01-05' });
		expect(compute('now()', 'x', 'if-missing')).toEqual({ value: '2026-06-10T15:04:05' });
	});

	it.each([
		['a throw', 'file.folder.split("/").last()'],
		['null', 'missing_key'],
		['NaN', '"a" + "b"'],
		['an invalid date', 'date("junk")'],
		['a list holding a number', '[1, "a"]'],
	])('fails on %s', (_case, expr) => {
		expect(compute(expr)).toHaveProperty('failure');
	});

	it('accepts only a boolean on a lifecycle key', () => {
		expect(compute('true', '_archived')).toEqual({ value: true });
		expect(compute('status', 'archived')).toEqual({ failure: '_archived accepts only true or false' });
	});

	it('accepts only text or a list of text for add', () => {
		expect(compute('file.basename', 'tags', 'add')).toEqual({ value: 'note' });
		expect(compute('1 + 1', 'tags', 'add')).toEqual({ failure: 'add needs text or a list of text' });
	});
});

describe('resolveComputedProperties', () => {
	const rule = makeRule({ id: 'r1' });
	const record = buildNoteRecord('/vault/note.md', '', 1, 1, 0);
	const ctx = { record, formulas: {}, vaultPath: '/vault' };
	const owned = (property: RuleProperty): OwnedProperty => ({ ...property, rule });

	it('replaces an expr with its value and keeps a literal as it is', () => {
		const literal = owned({ key: 'status', value: 'open', mode: 'always' });
		expect(resolveComputedProperties([], [literal, owned({ key: 'title', expr: 'file.basename', mode: 'always' })], ctx)).toEqual([
			literal,
			{ key: 'title', value: 'note', mode: 'always', rule },
		]);
	});

	it('leaves out a failing expr and reports it', () => {
		const failing = owned({ key: 'title', expr: 'missing_key', mode: 'always' });
		const failures: string[] = [];
		expect(resolveComputedProperties([], [failing], ctx, (p, reason) => failures.push(`${p.key}: ${reason}`))).toEqual([]);
		expect(failures).toEqual(['title: the expression has no value']);
	});

	it('does not evaluate an if-missing whose key the note holds', () => {
		const onFail = vi.fn();
		const present: Property[] = [{ key: 'title', value: 'kept', type: 'text' }];
		expect(resolveComputedProperties(present, [owned({ key: 'title', expr: 'missing_key', mode: 'if-missing' })], ctx, onFail)).toEqual([]);
		expect(onFail).not.toHaveBeenCalled();
	});

	it('returns an empty list for no owned properties', () => {
		expect(resolveComputedProperties([], [], ctx)).toEqual([]);
	});
});

describe('ruleRecordStats', () => {
	const indexed = (mtime: number, ctime: number, size: number) => buildNoteRecord('/vault/n.md', '', mtime, ctime, size);

	it('takes the index record\'s stats when both times are above 0', () => {
		expect(ruleRecordStats(indexed(20, 10, 512), 'abc', 99)).toEqual([20, 10, 512]);
	});

	it('falls back to now and the UTF-8 length without a record, or with a zero time', () => {
		expect(ruleRecordStats(undefined, 'abc', 99)).toEqual([99, 99, 3]);
		expect(ruleRecordStats(indexed(20, 0, 512), 'é', 99)).toEqual([99, 99, 2]);
		expect(ruleRecordStats(indexed(0, 10, 512), '', 99)).toEqual([99, 99, 0]);
	});
});
