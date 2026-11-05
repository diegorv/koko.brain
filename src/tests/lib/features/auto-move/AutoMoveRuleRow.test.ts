// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import AutoMoveRuleRow from '#lib/features/auto-move/AutoMoveRuleRow.svelte';
import type { AutoMoveRule } from '#lib/features/auto-move/auto-move.types.js';

// The icon grid's bits-ui ScrollArea observes its size; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

function dialogContent(): HTMLElement | null {
	return document.querySelector<HTMLElement>('[data-slot="dialog-content"]');
}

const RULE: AutoMoveRule = {
	id: 'r1',
	name: 'Archive',
	expression: '',
	destination: 'Archive',
	enabled: true,
	icon: { iconPack: 'lucide', iconName: 'star', color: '#ef4444' },
};

describe('AutoMoveRuleRow icon picker', () => {
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	async function openPicker() {
		const onupdate = vi.fn();
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(AutoMoveRuleRow, {
			target,
			props: { rule: RULE, isFirst: true, isLast: true, onupdate, onremove: () => {}, onmoveup: () => {}, onmovedown: () => {} },
		});
		await settle();
		document.querySelector<HTMLButtonElement>('button[title="Icon: lucide:star"]')!.click();
		await settle();
		expect(dialogContent()!.textContent).toContain('Change icon');
		return onupdate;
	}

	it('saves a text color on the rule and keeps the picker open', async () => {
		const onupdate = await openPicker();

		document.querySelectorAll<HTMLButtonElement>('button[title="Green"]')[1].click();
		await settle();

		expect(onupdate).toHaveBeenCalledWith('r1', {
			icon: { iconPack: 'lucide', iconName: 'star', color: '#ef4444', textColor: '#22c55e' },
		});
		expect(dialogContent()?.dataset.state).toBe('open');
	});
});
