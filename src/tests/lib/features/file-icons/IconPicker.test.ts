// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import IconPicker from '#lib/features/file-icons/IconPicker.svelte';

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

describe('IconPicker', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('widens the dialog to 550px from the sm breakpoint, replacing the default width', async () => {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(IconPicker, {
			target,
			props: { open: true, onSelect: () => {}, onRemove: () => {}, onClose: () => {} },
		});
		await settle();

		const content = document.querySelector<HTMLElement>('[data-slot="dialog-content"]');
		expect(content).not.toBeNull();
		expect(content!.textContent).toContain('Change icon');
		const classes = content!.classList;
		expect(classes.contains('sm:max-w-[550px]')).toBe(true);
		expect(classes.contains('sm:max-w-lg')).toBe(false);
		expect(classes.contains('max-w-[550px]')).toBe(false);
	});
});
