import { describe, it, expect, beforeEach } from 'vitest';
import { autoOrganizeStore } from '#lib/features/auto-organize/auto-organize.store.svelte.js';
import type { AutoOrganizeRule } from '#lib/features/auto-organize/auto-organize.types.js';

function makeRule(overrides: Partial<AutoOrganizeRule> = {}): AutoOrganizeRule {
	return {
		id: overrides.id ?? 'rule-1',
		name: overrides.name ?? 'Test rule',
		expression: overrides.expression ?? "file.hasTag('test')",
		destination: overrides.destination ?? 'Archive',
		enabled: overrides.enabled ?? true,
	};
}

describe('autoOrganizeStore', () => {
	beforeEach(() => {
		autoOrganizeStore.reset();
	});

	it('starts with empty state', () => {
		expect(autoOrganizeStore.rules).toEqual([]);
		expect(autoOrganizeStore.excludedFolders).toEqual([]);
		expect(autoOrganizeStore.isConfigLoaded).toBe(false);
	});

	describe('setConfig', () => {
		it('replaces all state and marks as loaded', () => {
			const rules = [makeRule({ id: 'a' }), makeRule({ id: 'b' })];
			autoOrganizeStore.setConfig({ rules, excludedFolders: ['_templates'] });

			expect(autoOrganizeStore.rules).toHaveLength(2);
			expect(autoOrganizeStore.rules[0].id).toBe('a');
			expect(autoOrganizeStore.rules[1].id).toBe('b');
			expect(autoOrganizeStore.excludedFolders).toEqual(['_templates']);
			expect(autoOrganizeStore.isConfigLoaded).toBe(true);
		});

		it('does not share reference with input array', () => {
			const rules = [makeRule()];
			autoOrganizeStore.setConfig({ rules, excludedFolders: [] });
			rules.push(makeRule({ id: 'extra' }));

			expect(autoOrganizeStore.rules).toHaveLength(1);
		});
	});

	describe('addRule', () => {
		it('appends a rule to the end', () => {
			autoOrganizeStore.addRule(makeRule({ id: 'first' }));
			autoOrganizeStore.addRule(makeRule({ id: 'second' }));

			expect(autoOrganizeStore.rules).toHaveLength(2);
			expect(autoOrganizeStore.rules[0].id).toBe('first');
			expect(autoOrganizeStore.rules[1].id).toBe('second');
		});
	});

	describe('updateRule', () => {
		it('merges partial updates into an existing rule', () => {
			autoOrganizeStore.addRule(makeRule({ id: 'r1', name: 'Original' }));
			autoOrganizeStore.updateRule('r1', { name: 'Updated', destination: 'NewFolder' });

			expect(autoOrganizeStore.rules[0].name).toBe('Updated');
			expect(autoOrganizeStore.rules[0].destination).toBe('NewFolder');
			expect(autoOrganizeStore.rules[0].expression).toBe("file.hasTag('test')");
		});

		it('does not modify other rules', () => {
			autoOrganizeStore.addRule(makeRule({ id: 'r1', name: 'First' }));
			autoOrganizeStore.addRule(makeRule({ id: 'r2', name: 'Second' }));
			autoOrganizeStore.updateRule('r1', { name: 'Changed' });

			expect(autoOrganizeStore.rules[1].name).toBe('Second');
		});

		it('is a no-op if id does not exist', () => {
			autoOrganizeStore.addRule(makeRule({ id: 'r1' }));
			autoOrganizeStore.updateRule('nonexistent', { name: 'Ghost' });

			expect(autoOrganizeStore.rules).toHaveLength(1);
			expect(autoOrganizeStore.rules[0].name).toBe('Test rule');
		});
	});

	describe('removeRule', () => {
		it('removes a rule by id', () => {
			autoOrganizeStore.addRule(makeRule({ id: 'r1' }));
			autoOrganizeStore.addRule(makeRule({ id: 'r2' }));
			autoOrganizeStore.removeRule('r1');

			expect(autoOrganizeStore.rules).toHaveLength(1);
			expect(autoOrganizeStore.rules[0].id).toBe('r2');
		});

		it('is a no-op if id does not exist', () => {
			autoOrganizeStore.addRule(makeRule({ id: 'r1' }));
			autoOrganizeStore.removeRule('nonexistent');

			expect(autoOrganizeStore.rules).toHaveLength(1);
		});
	});

	describe('reorderRules', () => {
		it('replaces the entire rules array', () => {
			autoOrganizeStore.addRule(makeRule({ id: 'a' }));
			autoOrganizeStore.addRule(makeRule({ id: 'b' }));
			autoOrganizeStore.addRule(makeRule({ id: 'c' }));

			autoOrganizeStore.reorderRules([
				makeRule({ id: 'c' }),
				makeRule({ id: 'a' }),
				makeRule({ id: 'b' }),
			]);

			expect(autoOrganizeStore.rules.map((r) => r.id)).toEqual(['c', 'a', 'b']);
		});
	});

	describe('enabledRules', () => {
		it('returns only enabled rules preserving order', () => {
			autoOrganizeStore.addRule(makeRule({ id: 'r1', enabled: true }));
			autoOrganizeStore.addRule(makeRule({ id: 'r2', enabled: false }));
			autoOrganizeStore.addRule(makeRule({ id: 'r3', enabled: true }));

			const enabled = autoOrganizeStore.enabledRules;
			expect(enabled).toHaveLength(2);
			expect(enabled[0].id).toBe('r1');
			expect(enabled[1].id).toBe('r3');
		});

		it('returns empty array when no rules are enabled', () => {
			autoOrganizeStore.addRule(makeRule({ id: 'r1', enabled: false }));
			expect(autoOrganizeStore.enabledRules).toEqual([]);
		});

		it('returns empty array when there are no rules', () => {
			expect(autoOrganizeStore.enabledRules).toEqual([]);
		});
	});

	describe('setExcludedFolders', () => {
		it('replaces the excluded folders list', () => {
			autoOrganizeStore.setExcludedFolders(['_templates', '_system']);
			expect(autoOrganizeStore.excludedFolders).toEqual(['_templates', '_system']);

			autoOrganizeStore.setExcludedFolders(['Archive']);
			expect(autoOrganizeStore.excludedFolders).toEqual(['Archive']);
		});

		it('does not share reference with input array', () => {
			const folders = ['_templates'];
			autoOrganizeStore.setExcludedFolders(folders);
			folders.push('extra');

			expect(autoOrganizeStore.excludedFolders).toHaveLength(1);
		});
	});

	describe('reset', () => {
		it('clears all state', () => {
			autoOrganizeStore.setConfig({
				rules: [makeRule()],
				excludedFolders: ['_templates'],
			});
			expect(autoOrganizeStore.isConfigLoaded).toBe(true);

			autoOrganizeStore.reset();

			expect(autoOrganizeStore.rules).toEqual([]);
			expect(autoOrganizeStore.excludedFolders).toEqual([]);
			expect(autoOrganizeStore.isConfigLoaded).toBe(false);
		});
	});
});
