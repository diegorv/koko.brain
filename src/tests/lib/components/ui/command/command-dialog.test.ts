// @vitest-environment jsdom
// The shared command dialog behind the palette, the quick switcher and the
// pickers: anchored near the top, no close X, dense rows and a taller list.
// The same primitives outside it keep the shadcn defaults.
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import CommandDialogHarness from '../../../../fixtures/CommandDialogHarness.svelte';
import CommandRootHarness from '../../../../fixtures/CommandRootHarness.svelte';

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);

describe('Command.Dialog', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		// bits-ui's Command scrolls its first item into view; jsdom does not implement it.
		Element.prototype.scrollIntoView ??= () => {};
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target?.remove();
		document.body.innerHTML = '';
	});

	async function renderDialog(hints?: { keys: string; label: string }[]) {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(CommandDialogHarness, { target, props: { open: true, hints } });
		await settle();
	}

	it('anchors its content at 18vh instead of the vertical centre', async () => {
		await renderDialog();
		const content = slot('dialog-content');
		expect(content).not.toBeNull();
		const classes = content!.classList;
		expect(classes.contains('top-[18vh]')).toBe(true);
		expect(classes.contains('translate-y-0')).toBe(true);
		expect(classes.contains('top-[50%]')).toBe(false);
		expect(classes.contains('translate-y-[-50%]')).toBe(false);
	});

	it('caps its height to the viewport below the 18vh anchor', async () => {
		await renderDialog();
		const classes = slot('dialog-content')!.classList;
		expect(classes.contains('max-h-[calc(82dvh-1rem)]')).toBe(true);
		expect(classes.contains('max-h-[calc(100dvh-4rem)]')).toBe(false);
	});

	it('renders no close button', async () => {
		await renderDialog();
		const content = slot('dialog-content')!;
		const buttons = [...content.querySelectorAll('button')].map((b) => b.textContent?.trim());
		expect(buttons).not.toContain('Close');
	});

	it('gives the input no close-button allowance and each row a minimum height', async () => {
		await renderDialog();
		const wrapper = slot('command-input-wrapper')!;
		expect(wrapper.classList.contains('pe-8')).toBe(false);
		const item = slot('command-item')!;
		expect(item.textContent).toBe('One');
		expect(item.classList.contains('min-h-9')).toBe(true);
		expect(item.classList.contains('h-9')).toBe(false);
	});

	it('caps the list at min(60vh, 400px)', async () => {
		await renderDialog();
		const list = slot('command-list')!;
		expect(list.classList.contains('max-h-[min(60vh,400px)]')).toBe(true);
		expect(list.classList.contains('max-h-[300px]')).toBe(false);
	});

	it('renders the caller hints in a one-line footer', async () => {
		await renderDialog([
			{ keys: '↵', label: 'Run' },
			{ keys: 'Esc', label: 'Close' },
		]);
		const footer = slot('command-dialog-footer');
		expect(footer).not.toBeNull();
		const hints = [...footer!.querySelectorAll('kbd')].map((k) => k.textContent);
		expect(hints).toEqual(['↵', 'Esc']);
		expect(footer!.textContent).toContain('Run');
		expect(footer!.textContent).toContain('Close');
	});

	it('renders no footer when the caller passes no hints', async () => {
		await renderDialog();
		expect(slot('dialog-content')).not.toBeNull();
		expect(slot('command-dialog-footer')).toBeNull();
	});
});

describe('command primitives outside Command.Dialog', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target?.remove();
	});

	it('keep the 300px list, the pe-8 input and the default row', async () => {
		Element.prototype.scrollIntoView ??= () => {};
		target = document.body.appendChild(document.createElement('div'));
		component = mount(CommandRootHarness, { target });
		await settle();
		expect(slot('command-list')!.classList.contains('max-h-[300px]')).toBe(true);
		expect(slot('command-input-wrapper')!.classList.contains('pe-8')).toBe(true);
		expect(slot('command-item')!.classList.contains('min-h-9')).toBe(false);
	});
});
