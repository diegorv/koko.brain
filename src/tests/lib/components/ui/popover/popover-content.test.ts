// @vitest-environment jsdom
// The shadcn popover content, mounted open through a harness with no caller
// classes: its default padding is the one call sites use, so none override it.
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import PopoverHarness from '../../../../fixtures/PopoverHarness.svelte';

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

describe('Popover.Content', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target?.remove();
	});

	async function renderPopover(open: boolean): Promise<HTMLElement | null> {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(PopoverHarness, { target, props: { open } });
		await settle();
		return document.querySelector<HTMLElement>('[data-slot="popover-content"]');
	}

	it('pads its content with p-3 by default', async () => {
		const content = await renderPopover(true);
		expect(content).not.toBeNull();
		expect(content!.textContent).toContain('Harness popover');
		const classes = content!.classList;
		expect(classes.contains('p-3')).toBe(true);
		expect(classes.contains('p-4')).toBe(false);
	});

	it('renders no content while closed', async () => {
		expect(await renderPopover(false)).toBeNull();
	});
});
