// @vitest-environment jsdom
// The shadcn dialog content, mounted open through a harness with no caller
// classes: it paints the popover surface at the modal radius.
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import DialogHarness from '../../../../fixtures/DialogHarness.svelte';

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

describe('Dialog.Content', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target?.remove();
	});

	async function renderDialog(open: boolean): Promise<HTMLElement | null> {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(DialogHarness, { target, props: { open } });
		await settle();
		return document.querySelector<HTMLElement>('[data-slot="dialog-content"]');
	}

	it('sits on the popover surface with the modal radius', async () => {
		const content = await renderDialog(true);
		expect(content).not.toBeNull();
		expect(content!.textContent).toContain('Harness dialog');
		const classes = content!.classList;
		expect(classes.contains('bg-popover')).toBe(true);
		expect(classes.contains('text-popover-foreground')).toBe(true);
		expect(classes.contains('rounded-xl')).toBe(true);
		expect(classes.contains('bg-background')).toBe(false);
		expect(classes.contains('rounded-lg')).toBe(false);
	});

	it('caps its height below the viewport and scrolls its own overflow', async () => {
		const content = await renderDialog(true);
		expect(content).not.toBeNull();
		const classes = content!.classList;
		expect(classes.contains('max-h-[calc(100dvh-4rem)]')).toBe(true);
		expect(classes.contains('overflow-y-auto')).toBe(true);
	});

	it('renders no content while closed', async () => {
		expect(await renderDialog(false)).toBeNull();
	});
});
