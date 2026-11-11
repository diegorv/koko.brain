import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ruleActionsStore } from '#lib/core/rule-actions/rule-actions.store.svelte.js';

const action = (id = 'mod:hello:action:greet') => ({ id, label: 'Hello: Greet', run: vi.fn(async () => {}) });

describe('ruleActionsStore', () => {
	beforeEach(() => ruleActionsStore.reset());

	it('starts empty, and get finds nothing', () => {
		expect(ruleActionsStore.list).toEqual([]);
		expect(ruleActionsStore.get('mod:hello:action:greet')).toBeUndefined();
	});

	it('lists a registered action in registration order and finds it by id', async () => {
		const first = action('mod:a:action:one');
		const second = action('mod:b:action:two');
		ruleActionsStore.register(first);
		ruleActionsStore.register(second);

		expect(ruleActionsStore.list.map((a) => a.id)).toEqual(['mod:a:action:one', 'mod:b:action:two']);
		await ruleActionsStore.get('mod:b:action:two')!.run({ on: 'note', path: 'notes/a.md' }, '');
		expect(second.run).toHaveBeenCalledWith({ on: 'note', path: 'notes/a.md' }, '');
		expect(first.run).not.toHaveBeenCalled();
	});

	it('keeps the input a registered action asks for, and hands run the rule\'s text', async () => {
		const tag = { ...action('mod:a:action:tag'), input: { placeholder: 'Tag name' } };
		ruleActionsStore.register(tag);

		const found = ruleActionsStore.get('mod:a:action:tag')!;
		expect(found.input).toEqual({ placeholder: 'Tag name' });
		expect(ruleActionsStore.list[0].input).toEqual({ placeholder: 'Tag name' });
		await found.run({ on: 'note', path: 'notes/a.md' }, 'meeting-notes');
		expect(tag.run).toHaveBeenCalledWith({ on: 'note', path: 'notes/a.md' }, 'meeting-notes');
	});

	it('a registration replaces one with the same id, and an old cleanup leaves the replacement', () => {
		const old = ruleActionsStore.register(action());
		const replacement = action();
		const remove = ruleActionsStore.register(replacement);

		old();
		expect(ruleActionsStore.list).toHaveLength(1);
		expect(ruleActionsStore.get(replacement.id)?.run).toBe(replacement.run);

		remove();
		remove();
		expect(ruleActionsStore.list).toEqual([]);
	});

	it('reset drops every registration', () => {
		ruleActionsStore.register(action('mod:a:action:one'));
		ruleActionsStore.register(action('mod:b:action:two'));
		ruleActionsStore.reset();
		expect(ruleActionsStore.list).toEqual([]);
	});
});
