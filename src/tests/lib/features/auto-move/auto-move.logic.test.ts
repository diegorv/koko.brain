import { describe, it, expect } from 'vitest';
import {
	findMatchingRule,
	isInExcludedFolder,
	isAlreadyInDestination,
	validateExpression,
	generateRuleId,
	resolveDestination,
} from '$lib/features/auto-move/auto-move.logic';
import { buildNoteRecord } from '$lib/features/collection/collection.logic';
import type { AutoMoveRule } from '$lib/features/auto-move/auto-move.types';
import type { NoteRecord } from '$lib/features/collection/collection.types';

function makeRule(overrides: Partial<AutoMoveRule> = {}): AutoMoveRule {
	return {
		id: overrides.id ?? 'rule-1',
		name: overrides.name ?? 'Test rule',
		expression: overrides.expression ?? "file.hasTag('test')",
		destination: overrides.destination ?? 'Archive',
		enabled: overrides.enabled ?? true,
	};
}

function makeRecord(overrides: Partial<NoteRecord> & { tags?: string[] } = {}): NoteRecord {
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

		const result = findMatchingRule(rules, record);
		expect(result?.id).toBe('r1');
	});

	it('returns null when no rules match', () => {
		const rules = [
			makeRule({ expression: "file.hasTag('nonexistent')" }),
		];
		const record = makeRecord({ tags: ['other'] });

		expect(findMatchingRule(rules, record)).toBeNull();
	});

	it('returns null for empty rules array', () => {
		const record = makeRecord({ tags: ['test'] });
		expect(findMatchingRule([], record)).toBeNull();
	});

	it('skips disabled rules', () => {
		const rules = [
			makeRule({ id: 'r1', expression: "file.hasTag('test')", enabled: false }),
			makeRule({ id: 'r2', expression: "file.hasTag('test')", enabled: true }),
		];
		const record = makeRecord({ tags: ['test'] });

		const result = findMatchingRule(rules, record);
		expect(result?.id).toBe('r2');
	});

	it('skips rules with invalid expressions gracefully', () => {
		const rules = [
			makeRule({ id: 'r1', expression: 'this is !!invalid syntax' }),
			makeRule({ id: 'r2', expression: "file.hasTag('test')" }),
		];
		const record = makeRecord({ tags: ['test'] });

		const result = findMatchingRule(rules, record);
		expect(result?.id).toBe('r2');
	});

	it('first-match wins: returns first matching, not best matching', () => {
		const rules = [
			makeRule({ id: 'r1', expression: "file.hasTag('general')", destination: 'General' }),
			makeRule({ id: 'r2', expression: "file.hasTag('general') && file.hasTag('specific')", destination: 'Specific' }),
		];
		const record = makeRecord({ tags: ['general', 'specific'] });

		const result = findMatchingRule(rules, record);
		expect(result?.id).toBe('r1');
		expect(result?.destination).toBe('General');
	});

	it('supports property-based expressions', () => {
		const record = makeRecord();
		record.properties.set('status', 'done');

		const rules = [
			makeRule({ expression: "status == 'done'" }),
		];

		expect(findMatchingRule(rules, record)).not.toBeNull();
	});

	it('supports complex boolean expressions', () => {
		const record = makeRecord({ tags: ['project'] });
		record.properties.set('status', 'active');

		const rules = [
			makeRule({ expression: "file.hasTag('project') && status == 'active'" }),
		];

		expect(findMatchingRule(rules, record)).not.toBeNull();
	});

	it('handles expression returning falsy but non-null (0, empty string)', () => {
		const record = makeRecord();
		record.properties.set('count', 0);

		const rules = [
			makeRule({ expression: 'count' }), // evaluates to 0, which is falsy
		];

		expect(findMatchingRule(rules, record)).toBeNull();
	});

	describe('onError reporting', () => {
		/** `missing` is null, and `lower` only exists for string receivers. */
		const throwing = "missing.lower() == 'x'";

		it('reports the offending rule and the thrown error', () => {
			const reported: Array<{ id: string; message: string }> = [];
			const rules = [makeRule({ id: 'bad', expression: throwing })];

			expect(
				findMatchingRule(rules, makeRecord(), (rule, err) =>
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

			const result = findMatchingRule(rules, record, (rule) => reported.push(rule.id));

			expect(result?.id).toBe('good');
			expect(reported).toEqual(['bad']);
		});

		it('does not report anything when every rule evaluates cleanly', () => {
			const reported: string[] = [];
			const rules = [makeRule({ id: 'r1', expression: "file.hasTag('test')" })];

			findMatchingRule(rules, makeRecord({ tags: ['test'] }), (rule) => reported.push(rule.id));

			expect(reported).toEqual([]);
		});

		it('still skips a throwing rule when no reporter is supplied', () => {
			const rules = [
				makeRule({ id: 'bad', expression: throwing }),
				makeRule({ id: 'good', expression: "file.hasTag('test')" }),
			];

			expect(findMatchingRule(rules, makeRecord({ tags: ['test'] }))?.id).toBe('good');
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
