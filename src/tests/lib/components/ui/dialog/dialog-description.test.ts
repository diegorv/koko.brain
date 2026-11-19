// @vitest-environment jsdom
// The shadcn dialog description, mounted open through a harness with no caller classes.
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import DialogHarness from '../../../../fixtures/DialogHarness.svelte';

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

describe('Dialog.Description', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target?.remove();
	});

	it('can be selected, against the body-wide user-select: none', async () => {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(DialogHarness, { target, props: { open: true } });
		await settle();

		const description = document.querySelector<HTMLElement>('[data-slot="dialog-description"]');
		expect(description).not.toBeNull();
		expect(description!.textContent).toBe('Harness description');
		expect(description!.classList.contains('select-text')).toBe(true);
		expect(description!.classList.contains('text-muted-foreground')).toBe(true);
	});
});
