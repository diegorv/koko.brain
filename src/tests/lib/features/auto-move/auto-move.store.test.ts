import { describe, it, expect, beforeEach } from 'vitest';
import { autoMoveStore } from '$lib/features/auto-move/auto-move.store.svelte';
import type { AutoMoveRule } from '$lib/features/auto-move/auto-move.types';

function makeRule(overrides: Partial<AutoMoveRule> = {}): AutoMoveRule {
	return {
		id: overrides.id ?? 'rule-1',
		name: overrides.name ?? 'Test rule',
		expression: overrides.expression ?? "file.hasTag('test')",
		destination: overrides.destination ?? 'Archive',
		enabled: overrides.enabled ?? true,
	};
}

describe('autoMoveStore', () => {
	beforeEach(() => {
		autoMoveStore.reset();
	});

	it('starts with empty state', () => {
		expect(autoMoveStore.rules).toEqual([]);
		expect(autoMoveStore.excludedFolders).toEqual([]);
		expect(autoMoveStore.isConfigLoaded).toBe(false);
	});

	describe('setConfig', () => {
		it('replaces all state and marks as loaded', () => {
			const rules = [makeRule({ id: 'a' }), makeRule({ id: 'b' })];
			autoMoveStore.setConfig({ rules, excludedFolders: ['_templates'] });

			expect(autoMoveStore.rules).toHaveLength(2);
			expect(autoMoveStore.rules[0].id).toBe('a');
			expect(autoMoveStore.rules[1].id).toBe('b');
			expect(autoMoveStore.excludedFolders).toEqual(['_templates']);
			expect(autoMoveStore.isConfigLoaded).toBe(true);
		});

		it('does not share reference with input array', () => {
			const rules = [makeRule()];
			autoMoveStore.setConfig({ rules, excludedFolders: [] });
			rules.push(makeRule({ id: 'extra' }));

			expect(autoMoveStore.rules).toHaveLength(1);
		});
	});

	describe('addRule', () => {
		it('appends a rule to the end', () => {
			autoMoveStore.addRule(makeRule({ id: 'first' }));
			autoMoveStore.addRule(makeRule({ id: 'second' }));

			expect(autoMoveStore.rules).toHaveLength(2);
			expect(autoMoveStore.rules[0].id).toBe('first');
			expect(autoMoveStore.rules[1].id).toBe('second');
		});
	});

	describe('updateRule', () => {
		it('merges partial updates into an existing rule', () => {
			autoMoveStore.addRule(makeRule({ id: 'r1', name: 'Original' }));
			autoMoveStore.updateRule('r1', { name: 'Updated', destination: 'NewFolder' });

			expect(autoMoveStore.rules[0].name).toBe('Updated');
			expect(autoMoveStore.rules[0].destination).toBe('NewFolder');
			expect(autoMoveStore.rules[0].expression).toBe("file.hasTag('test')");
		});

		it('does not modify other rules', () => {
			autoMoveStore.addRule(makeRule({ id: 'r1', name: 'First' }));
			autoMoveStore.addRule(makeRule({ id: 'r2', name: 'Second' }));
			autoMoveStore.updateRule('r1', { name: 'Changed' });

			expect(autoMoveStore.rules[1].name).toBe('Second');
		});

		it('is a no-op if id does not exist', () => {
			autoMoveStore.addRule(makeRule({ id: 'r1' }));
			autoMoveStore.updateRule('nonexistent', { name: 'Ghost' });

			expect(autoMoveStore.rules).toHaveLength(1);
			expect(autoMoveStore.rules[0].name).toBe('Test rule');
		});
	});

	describe('removeRule', () => {
		it('removes a rule by id', () => {
			autoMoveStore.addRule(makeRule({ id: 'r1' }));
			autoMoveStore.addRule(makeRule({ id: 'r2' }));
			autoMoveStore.removeRule('r1');

			expect(autoMoveStore.rules).toHaveLength(1);
			expect(autoMoveStore.rules[0].id).toBe('r2');
		});

		it('is a no-op if id does not exist', () => {
			autoMoveStore.addRule(makeRule({ id: 'r1' }));
			autoMoveStore.removeRule('nonexistent');

			expect(autoMoveStore.rules).toHaveLength(1);
		});
	});

	describe('reorderRules', () => {
		it('replaces the entire rules array', () => {
			autoMoveStore.addRule(makeRule({ id: 'a' }));
			autoMoveStore.addRule(makeRule({ id: 'b' }));
			autoMoveStore.addRule(makeRule({ id: 'c' }));

			autoMoveStore.reorderRules([
				makeRule({ id: 'c' }),
				makeRule({ id: 'a' }),
				makeRule({ id: 'b' }),
			]);

			expect(autoMoveStore.rules.map((r) => r.id)).toEqual(['c', 'a', 'b']);
		});
	});

	describe('enabledRules', () => {
		it('returns only enabled rules preserving order', () => {
			autoMoveStore.addRule(makeRule({ id: 'r1', enabled: true }));
			autoMoveStore.addRule(makeRule({ id: 'r2', enabled: false }));
			autoMoveStore.addRule(makeRule({ id: 'r3', enabled: true }));

			const enabled = autoMoveStore.enabledRules;
			expect(enabled).toHaveLength(2);
			expect(enabled[0].id).toBe('r1');
			expect(enabled[1].id).toBe('r3');
		});

		it('returns empty array when no rules are enabled', () => {
			autoMoveStore.addRule(makeRule({ id: 'r1', enabled: false }));
			expect(autoMoveStore.enabledRules).toEqual([]);
		});

		it('returns empty array when there are no rules', () => {
			expect(autoMoveStore.enabledRules).toEqual([]);
		});
	});

	describe('setExcludedFolders', () => {
		it('replaces the excluded folders list', () => {
			autoMoveStore.setExcludedFolders(['_templates', '_system']);
			expect(autoMoveStore.excludedFolders).toEqual(['_templates', '_system']);

			autoMoveStore.setExcludedFolders(['Archive']);
			expect(autoMoveStore.excludedFolders).toEqual(['Archive']);
		});

		it('does not share reference with input array', () => {
			const folders = ['_templates'];
			autoMoveStore.setExcludedFolders(folders);
			folders.push('extra');

			expect(autoMoveStore.excludedFolders).toHaveLength(1);
		});
	});

	describe('reset', () => {
		it('clears all state', () => {
			autoMoveStore.setConfig({
				rules: [makeRule()],
				excludedFolders: ['_templates'],
			});
			expect(autoMoveStore.isConfigLoaded).toBe(true);

			autoMoveStore.reset();

			expect(autoMoveStore.rules).toEqual([]);
			expect(autoMoveStore.excludedFolders).toEqual([]);
			expect(autoMoveStore.isConfigLoaded).toBe(false);
		});
	});
});
