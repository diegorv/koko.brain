// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

import { mount, unmount, flushSync } from 'svelte';

import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import type { ModContextV1 } from '#lib/plugins/mods/contract/mod-api.v1.js';
import ModActionPicker from '#lib/plugins/mods/ModActionPicker.svelte';
import ModDialogHost from '#lib/plugins/mods/ModDialogHost.svelte';
import { modDialogsStore } from '#lib/plugins/mods/mod-dialogs.store.svelte.js';
import { modPickerStore } from '#lib/plugins/mods/mod-picker.store.svelte.js';
import { createModContext } from '#lib/plugins/mods/mods-host.service.js';
import { modsRunsStore } from '#lib/plugins/mods/mods-runs.store.svelte.js';

// bits-ui's Command scrolls its first item into view; jsdom does not implement it.
Element.prototype.scrollIntoView ??= () => {};

const VAULT = '/vaults/main';

/** Resolves to the settled value, or to 'pending' when the promise has not settled after a tick */
async function settled<T>(promise: Promise<T>): Promise<T | 'pending'> {
	return Promise.race([promise, new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), 0))]);
}

const shown = () => document.querySelector<HTMLElement>('[data-mod-dialog]');
const caption = () => shown()?.querySelector('[data-mod-dialog-caption]')?.textContent?.trim();
const title = () => {
	const dialog = shown();
	return dialog ? document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent?.trim() : undefined;
};
const button = (name: 'ok' | 'cancel' | 'confirm') => shown()?.querySelector<HTMLButtonElement>(`[data-mod-dialog-${name}]`) ?? null;
const field = () => shown()?.querySelector<HTMLInputElement | HTMLTextAreaElement>('[data-mod-dialog-field]') ?? null;

/** Presses a key on `el` the way a browser does: Enter on a button clicks it unless a handler prevented the default */
function pressKey(el: Element, key: string, init: KeyboardEventInit = {}) {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
	el.dispatchEvent(event);
	if (key === 'Enter' && el instanceof HTMLButtonElement && !event.defaultPrevented) el.click();
	flushSync();
}

/** Types into the prompt's field */
function type(text: string) {
	const el = field()!;
	el.value = text;
	el.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

describe('ModDialogHost', () => {
	let components: Record<string, unknown>[] = [];
	let ctx: ModContextV1;

	beforeEach(() => {
		vi.clearAllMocks();
		vaultStore._reset();
		railRegistryStore.reset();
		modPickerStore.reset();
		modsRunsStore.reset();
		modDialogsStore.reset();
		vaultStore.open(VAULT);
		ctx = createModContext({ id: 'hello', name: 'Hello mod', version: '1.0.0' }, VAULT, {
			controller: new AbortController(),
			disposers: [],
			runs: new Set(),
			unloaded: false,
		});
		const target = document.body.appendChild(document.createElement('div'));
		components = [mount(ModDialogHost, { target })];
		flushSync();
	});

	afterEach(() => {
		modDialogsStore.reset();
		flushSync();
		for (const component of components) unmount(component);
		components = [];
		document.body.innerHTML = '';
	});

	/** Calls `open` and lets the dialog render */
	function show<T>(open: () => Promise<T>): Promise<T> {
		const result = open();
		flushSync();
		return result;
	}

	it('renders nothing while no mod opened a dialog', () => {
		expect(shown()).toBeNull();
	});

	it("shows the mod's name as a caption above the title", () => {
		void show(() => ctx.ui.alert({ title: 'Done', message: '12 notes archived' }));

		expect(caption()).toBe('Hello mod');
		expect(title()).toBe('Done');
		expect(shown()!.textContent).toContain('12 notes archived');
		const text = shown()!.textContent!;
		expect(text.indexOf('Hello mod')).toBeLessThan(text.indexOf('Done'));
	});

	describe('alert', () => {
		it('OK dismisses it and resolves', async () => {
			const result = show(() => ctx.ui.alert({ title: 'Done', kind: 'success' }));
			expect(shown()!.querySelector('[data-mod-alert-kind]')?.getAttribute('data-mod-alert-kind')).toBe('success');

			button('ok')!.click();
			flushSync();

			expect(await result).toBeUndefined();
			expect(shown()).toBeNull();
		});

		it('Esc dismisses it and resolves', async () => {
			const result = show(() => ctx.ui.alert({ title: 'Done' }));

			pressKey(button('ok')!, 'Escape');

			expect(await result).toBeUndefined();
			expect(shown()).toBeNull();
		});
	});

	describe('confirm', () => {
		it('shows the labels and focuses the confirm button', () => {
			void show(() => ctx.ui.confirm({ title: 'Archive 12 notes?', confirmLabel: 'Archive', cancelLabel: 'Keep' }));

			expect(button('confirm')!.textContent?.trim()).toBe('Archive');
			expect(button('cancel')!.textContent?.trim()).toBe('Keep');
			expect(document.activeElement).toBe(button('confirm'));
		});

		it('Enter confirms', async () => {
			const result = show(() => ctx.ui.confirm({ title: 'Sure?' }));

			pressKey(button('confirm')!, 'Enter');

			expect(await result).toBe(true);
			expect(shown()).toBeNull();
		});

		it('Enter in the dialog body confirms too, but not during IME composition', async () => {
			const result = show(() => ctx.ui.confirm({ title: 'Sure?' }));

			pressKey(shown()!, 'Enter', { isComposing: true });
			expect(await settled(result)).toBe('pending');

			pressKey(shown()!, 'Enter');
			expect(await result).toBe(true);
		});

		it('Enter on Cancel cancels', async () => {
			const result = show(() => ctx.ui.confirm({ title: 'Sure?' }));

			pressKey(button('cancel')!, 'Enter');

			expect(await result).toBe(false);
		});

		it('Esc cancels', async () => {
			const result = show(() => ctx.ui.confirm({ title: 'Sure?' }));

			pressKey(button('confirm')!, 'Escape');

			expect(await result).toBe(false);
			expect(shown()).toBeNull();
		});

		it('the buttons answer', async () => {
			const yes = show(() => ctx.ui.confirm({ title: 'First?' }));
			button('confirm')!.click();
			flushSync();
			expect(await yes).toBe(true);

			const no = show(() => ctx.ui.confirm({ title: 'Second?' }));
			button('cancel')!.click();
			flushSync();
			expect(await no).toBe(false);
		});

		it('destructive styles the confirm button as destructive', () => {
			void show(() => ctx.ui.confirm({ title: 'Delete?', destructive: true }));
			expect(button('confirm')!.className).toContain('bg-destructive');
		});

		it('without destructive the confirm button is the default style', () => {
			void show(() => ctx.ui.confirm({ title: 'Archive?' }));
			expect(button('confirm')!.className).not.toContain('bg-destructive');
			expect(button('confirm')!.className).toContain('bg-primary');
		});
	});

	describe('prompt', () => {
		it('shows the label, placeholder and value, and Enter submits the text', async () => {
			const result = show(() => ctx.ui.prompt({ title: 'New project', label: 'Name', placeholder: 'Project name', value: 'Draft' }));

			expect(field()!.tagName).toBe('INPUT');
			expect(field()!.placeholder).toBe('Project name');
			expect(field()!.value).toBe('Draft');
			expect(shown()!.querySelector('label')?.textContent).toBe('Name');
			expect(document.activeElement).toBe(field());
			type('Project X');
			pressKey(field()!, 'Enter');

			expect(await result).toBe('Project X');
			expect(shown()).toBeNull();
		});

		it('Esc gives null', async () => {
			const result = show(() => ctx.ui.prompt({ title: 'New project' }));
			type('ignored');

			pressKey(field()!, 'Escape');

			expect(await result).toBeNull();
		});

		it('Cancel gives null, OK gives the text', async () => {
			const cancelled = show(() => ctx.ui.prompt({ title: 'First' }));
			button('cancel')!.click();
			flushSync();
			expect(await cancelled).toBeNull();

			const ok = show(() => ctx.ui.prompt({ title: 'Second' }));
			type('typed');
			button('confirm')!.click();
			flushSync();
			expect(await ok).toBe('typed');
		});

		it('Enter during IME composition does not submit', async () => {
			const result = show(() => ctx.ui.prompt({ title: 'Name' }));
			type('かな');

			pressKey(field()!, 'Enter', { isComposing: true });

			expect(await settled(result)).toBe('pending');
			expect(shown()).not.toBeNull();
		});

		it('multiline: a textarea where Enter adds a line and Cmd+Enter submits', async () => {
			const result = show(() => ctx.ui.prompt({ title: 'Notes', multiline: true }));
			expect(field()!.tagName).toBe('TEXTAREA');
			type('line 1\nline 2');

			pressKey(field()!, 'Enter');
			expect(await settled(result)).toBe('pending');

			pressKey(field()!, 'Enter', { metaKey: true, isComposing: true });
			expect(await settled(result)).toBe('pending');

			pressKey(field()!, 'Enter', { metaKey: true });
			expect(await result).toBe('line 1\nline 2');
		});

		it('a second prompt starts from its own value, not the text typed in the first', async () => {
			const first = show(() => ctx.ui.prompt({ title: 'First' }));
			const second = ctx.ui.prompt({ title: 'Second', value: 'fresh' });
			type('typed in first');
			pressKey(field()!, 'Enter');
			expect(await first).toBe('typed in first');

			expect(title()).toBe('Second');
			expect(field()!.value).toBe('fresh');
			button('cancel')!.click();
			flushSync();
			expect(await second).toBeNull();
		});
	});

	describe('loading', () => {
		it('shows the label and a spinner, has no close button, and ignores Esc', async () => {
			let release!: () => void;
			const result = show(() => ctx.ui.loading('Archiving...', () => new Promise<void>((resolve) => (release = resolve))));

			expect(title()).toBe('Archiving...');
			expect(shown()!.querySelector('.animate-spin')).not.toBeNull();
			expect(button('cancel')).toBeNull();
			expect(shown()!.querySelector('[data-slot="dialog-close"], .sr-only')).toBeNull();
			pressKey(shown()!, 'Escape');
			expect(shown()).not.toBeNull();

			release();
			await result;
			flushSync();
			expect(shown()).toBeNull();
		});

		it('closes when the task rejects', async () => {
			let fail!: (err: Error) => void;
			const result = show(() => ctx.ui.loading('Working', () => new Promise<void>((_resolve, reject) => (fail = reject))));

			fail(new Error('disk full'));
			await expect(result).rejects.toThrow('disk full');
			flushSync();

			expect(shown()).toBeNull();
		});

		it('cancellable: Cancel aborts the signal and closes the dialog', async () => {
			let signal!: AbortSignal;
			const result = show(() =>
				ctx.ui.loading(
					'Working',
					(s) =>
						new Promise<string>((resolve) => {
							signal = s;
							s.addEventListener('abort', () => resolve('cancelled'));
						}),
					{ cancellable: true },
				),
			);

			button('cancel')!.click();
			flushSync();

			expect(await result).toBe('cancelled');
			expect(signal.aborted).toBe(true);
			expect(shown()).toBeNull();
		});
	});

	it('shows one dialog at a time; the next one shows once the first is answered', async () => {
		const first = show(() => ctx.ui.confirm({ title: 'First?' }));
		const second = show(() => ctx.ui.alert({ title: 'Second' }));

		expect(document.querySelectorAll('[data-mod-dialog]')).toHaveLength(1);
		expect(title()).toBe('First?');

		button('confirm')!.click();
		flushSync();
		expect(await first).toBe(true);
		expect(title()).toBe('Second');

		button('ok')!.click();
		flushSync();
		await second;
		expect(shown()).toBeNull();
	});

	it("a dialog opened during a run shows above the picker's run view and returns to it when closed", async () => {
		const target = document.body.insertBefore(document.createElement('div'), document.body.firstChild);
		components.push(mount(ModActionPicker, { target }));
		flushSync();
		let answer: boolean | undefined;
		ctx.addAction({
			id: 'archive',
			title: 'Archive',
			run: async () => {
				answer = await ctx.ui.confirm({ title: 'Archive 12 notes?' });
			},
		});
		ctx.addRailButton({ id: 'main', title: 'Hello mod', icon: 'sparkles' });
		railRegistryStore.actions[0].run();
		flushSync();
		document.querySelector<HTMLElement>('[data-mod-action="archive"]')!.click();
		flushSync();

		expect(document.querySelector('[data-mod-run]')).not.toBeNull();
		expect(title()).toBe('Archive 12 notes?');
		const dialogs = [...document.querySelectorAll('[role="dialog"]')];
		expect(dialogs.indexOf(shown()!)).toBeGreaterThan(dialogs.indexOf(document.querySelector('[data-mod-run]')!.closest('[role="dialog"]')!));

		pressKey(button('confirm')!, 'Escape');
		await vi.waitFor(() => expect(answer).toBe(false));
		flushSync();

		expect(shown()).toBeNull();
		expect(modPickerStore.isOpen).toBe(true);
		expect(document.querySelector('[data-mod-run]')).not.toBeNull();
	});
});
