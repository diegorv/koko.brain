// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

import { mount, unmount, flushSync } from 'svelte';

import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import type { ModContextV1, ModRunV1 } from '#lib/plugins/mods/contract/mod-api.v1.js';
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

	describe('pick', () => {
		it('Esc cancels and the next queued pick starts with a fresh search', async () => {
			const items = [{ id: 'a', title: 'Alpha' }, { id: 'b', title: 'Beta' }];
			const first = show(() => ctx.ui.pick({ title: 'First', items }));
			type('Alpha');
			const second = show(() => ctx.ui.pick({ title: 'Second', items }));
			expect(field()!.value).toBe('Alpha');
			pressKey(field()!, 'Escape');
			expect(await first).toBeNull();
			expect(title()).toBe('Second');
			expect(field()!.value).toBe('');
			expect(field()!.placeholder).toBe('Search items...');
			expect(shown()!.querySelectorAll('[role="option"]')).toHaveLength(2);
			button('cancel')!.click();
			flushSync();
			expect(await second).toBeNull();
			expect(shown()).toBeNull();
		});

		it('supports arrow keys and Enter, and does not submit during composition', async () => {
			const items = [{ id: 'a', title: 'Alpha' }, { id: 'b', title: 'Beta' }];
			const result = show(() => ctx.ui.pick({ title: 'Choose', items }));
			await vi.waitFor(() => expect(shown()!.querySelector('[aria-selected="true"]')?.textContent).toContain('Alpha'));
			pressKey(field()!, 'ArrowDown');
			expect(shown()!.querySelector('[aria-selected="true"]')?.textContent).toContain('Beta');
			pressKey(field()!, 'Enter', { isComposing: true });
			expect(await settled(result)).toBe('pending');
			pressKey(field()!, 'Enter');
			expect(await result).toBe(items[1]);
		});

		it('shows an empty state for no items or no matches, without selecting on Enter', async () => {
			const empty = show(() => ctx.ui.pick({ title: 'Empty', items: [] }));
			expect(shown()!.textContent).toContain('No items found.');
			pressKey(field()!, 'Enter');
			expect(await settled(empty)).toBe('pending');
			pressKey(field()!, 'Escape');
			expect(await empty).toBeNull();

			const result = show(() => ctx.ui.pick({ title: 'Choose', items: [{ id: 'a', title: 'Alpha' }] }));
			type('zzzz');
			expect(shown()!.querySelectorAll('[role="option"]')).toHaveLength(0);
			expect(shown()!.textContent).toContain('No items found.');
			pressKey(field()!, 'Enter');
			expect(await settled(result)).toBe('pending');
			pressKey(field()!, 'Escape');
			expect(await result).toBeNull();
		});

		it('searches descriptions without running mod getters again while typing or selecting', async () => {
			let reads = 0;
			const item = {
				get id() { reads++; return 'a'; },
				get title() { reads++; return 'Alpha'; },
				get description() { reads++; return 'Project folder'; },
				path: 'projects/',
			};
			const result = show(() => ctx.ui.pick({ title: 'Choose', items: [item, { id: 'b', title: 'Beta' }] }));
			const initialReads = reads;
			expect(initialReads).toBeGreaterThan(0);
			type('Prj');
			type('Prjfld');
			expect(shown()!.querySelectorAll('[role="option"]')).toHaveLength(1);
			expect(shown()!.textContent).toContain('Project folder');
			shown()!.querySelector<HTMLElement>('[role="option"]')!.click();
			flushSync();
			expect(await result).toBe(item);
			expect(reads).toBe(initialReads);
		});

		it('renders at most 100 of 1000 items, searches beyond the cap, and returns the clicked original', async () => {
			const items = Array.from({ length: 1000 }, (_, i) => ({ id: `item-${i}`, title: `Item ${i}`, path: `notes/${i}.md` }));
			const result = show(() => ctx.ui.pick({ title: 'Choose a note', placeholder: 'Find a note', items }));

			expect(title()).toBe('Choose a note');
			expect(caption()).toBe('Hello mod');
			expect(field()!.placeholder).toBe('Find a note');
			expect(document.activeElement).toBe(field());
			expect(shown()!.querySelectorAll('[role="option"]')).toHaveLength(100);
			expect(shown()!.textContent).not.toContain('Item 900');
			type('It900');
			expect(shown()!.querySelectorAll('[role="option"]')).toHaveLength(1);
			expect(shown()!.textContent).toContain('Item 900');
			shown()!.querySelector<HTMLElement>('[role="option"]')!.click();
			flushSync();

			expect(await result).toBe(items[900]);
			expect(shown()).toBeNull();
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
			// The log line keeps the run view open after the run ends (a quiet run closes it by itself).
			run: async (_input: string, run: { log: (text: string) => void }) => {
				answer = await ctx.ui.confirm({ title: 'Archive 12 notes?' });
				run.log(answer ? 'archived' : 'kept');
			},
		});
		// A second action keeps the button on its picker list (a single-action button runs it at once).
		ctx.addAction({ id: 'noop', title: 'Noop', run: () => {} });
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
	describe('run.ui', () => {
		let other: ModContextV1;

		beforeEach(() => {
			other = createModContext({ id: 'other', name: 'Other mod', version: '1.0.0' }, VAULT, {
				controller: new AbortController(),
				disposers: [],
				runs: new Set(),
				unloaded: false,
			});
		});

		/** Starts action `id` from its own one-action rail button and returns the run it receives; the run never ends by itself */
		function startRun(id = 'job'): ModRunV1 {
			let received: ModRunV1 | undefined;
			ctx.addAction({ id, title: id, run: (_input: string, run: ModRunV1) => {
				received = run;
				return new Promise(() => {});
			} });
			ctx.addRailButton({ id: `button-${id}`, title: id, icon: 'sparkles', actions: [id] });
			railRegistryStore.actions.find((a) => a.key === `mod:hello:button-${id}`)!.run();
			return received!;
		}

		const stop = (id = 'job') => modsRunsStore.runFor(`mod:hello:action:${id}`)!.stop();

		/** Resolves to the rejection of `promise`, or fails when it fulfils */
		async function rejection(promise: Promise<unknown>): Promise<unknown> {
			return promise.then((value) => { throw new Error(`expected a rejection, got ${String(value)}`); }, (err: unknown) => err);
		}

		function expectAbortError(err: unknown) {
			expect(err).toBeInstanceOf(DOMException);
			expect((err as DOMException).name).toBe('AbortError');
		}

		it.each([
			['alert', (run: ModRunV1) => run.ui.alert({ title: 'Run dialog' })],
			['confirm', (run: ModRunV1) => run.ui.confirm({ title: 'Run dialog' })],
			['prompt', (run: ModRunV1) => run.ui.prompt({ title: 'Run dialog' })],
			['pick', (run: ModRunV1) => run.ui.pick({ title: 'Run dialog', items: [{ id: 'a', title: 'A' }] })],
		] as const)('Stop closes an open %s, rejects it with an AbortError and shows the next queued dialog at once', async (kind, open) => {
			const run = startRun();
			const result = show(() => open(run) as Promise<unknown>);
			const next = show(() => other.ui.alert({ title: 'Next in line' }));
			expect(shown()!.getAttribute('data-mod-dialog')).toBe(kind);
			expect(title()).toBe('Run dialog');

			stop();
			flushSync();

			expectAbortError(await rejection(result));
			expect(title()).toBe('Next in line');
			expect(caption()).toBe('Other mod');
			expect(modDialogsStore.dialogs.map((d) => d.modId)).toEqual(['other']);
			expect(await settled(next)).toBe('pending');
		});

		it('Stop removes a queued run dialog without ever opening it', async () => {
			const run = startRun();
			const first = show(() => other.ui.alert({ title: 'First' }));
			const queued = show(() => run.ui.confirm({ title: 'Queued' }));
			expect(modDialogsStore.dialogs).toHaveLength(2);

			stop();
			flushSync();

			expectAbortError(await rejection(queued));
			expect(modDialogsStore.dialogs.map((d) => d.modId)).toEqual(['other']);
			expect(title()).toBe('First');
			button('ok')!.click();
			flushSync();
			await first;
			expect(shown()).toBeNull();
		});

		it('a run.ui call after Stop rejects with an AbortError at once and queues nothing', async () => {
			const run = startRun();
			stop();

			for (const call of [
				() => run.ui.alert({ title: 'x' }),
				() => run.ui.confirm({ title: 'x' }),
				() => run.ui.prompt({ title: 'x' }),
				() => run.ui.pick({ title: 'x', items: [] }),
				() => run.ui.loading('x', () => new Promise(() => {})),
			]) {
				expectAbortError(await rejection(call() as Promise<unknown>));
			}
			// Invalid arguments too: the abort is checked first.
			expectAbortError(await rejection(run.ui.alert(null as never)));
			flushSync();
			expect(modDialogsStore.dialogs).toEqual([]);
			expect(shown()).toBeNull();
		});

		it('Stop aborts the signal of a loading task, closes its dialog and rejects without waiting for the task', async () => {
			const run = startRun();
			let signal!: AbortSignal;
			const result = show(() => run.ui.loading('Working', (s) => {
				signal = s;
				return new Promise<string>(() => {});
			}));
			expect(title()).toBe('Working');

			stop();
			flushSync();

			expect(signal.aborted).toBe(true);
			expectAbortError(await rejection(result));
			expect(shown()).toBeNull();
		});

		it('Stop leaves the dialogs of another run of the same mod and its ctx.ui dialogs open', async () => {
			const job = startRun('job');
			const second = startRun('second');
			const stopped = show(() => job.ui.prompt({ title: 'Stopped run' }));
			const otherRun = show(() => second.ui.confirm({ title: 'Other run' }));
			const modScoped = show(() => ctx.ui.alert({ title: 'Mod scoped' }));

			stop('job');
			flushSync();

			expectAbortError(await rejection(stopped));
			expect(title()).toBe('Other run');
			expect(modDialogsStore.dialogs.map((d) => [d.modId, 'title' in d ? d.title : ''])).toEqual([
				['hello', 'Other run'], ['hello', 'Mod scoped'],
			]);
			button('confirm')!.click();
			flushSync();
			expect(await otherRun).toBe(true);
			expect(title()).toBe('Mod scoped');
			expect(await settled(modScoped)).toBe('pending');
		});

		describe('user cancellation still resolves with the cancel value', () => {
			it('Esc on an alert resolves undefined and Cancel on a confirm resolves false', async () => {
				const run = startRun();
				const alert = show(() => run.ui.alert({ title: 'Done' }));
				pressKey(shown()!, 'Escape');
				expect(await alert).toBeUndefined();

				const confirm = show(() => run.ui.confirm({ title: 'Sure?' }));
				button('cancel')!.click();
				flushSync();
				expect(await confirm).toBe(false);
			});

			it('Esc and Cancel on a prompt resolve null', async () => {
				const run = startRun();
				const escaped = show(() => run.ui.prompt({ title: 'Name' }));
				pressKey(field()!, 'Escape');
				expect(await escaped).toBeNull();

				const cancelled = show(() => run.ui.prompt({ title: 'Name' }));
				button('cancel')!.click();
				flushSync();
				expect(await cancelled).toBeNull();
			});

			it('closing a pick with its close button resolves null', async () => {
				const run = startRun();
				const result = show(() => run.ui.pick({ title: 'Choose', items: [{ id: 'a', title: 'A' }] }));
				// The close button and an outside click both close through the dialog's onOpenChange(false).
				shown()!.querySelector<HTMLElement>('.sr-only')!.closest('button')!.click();
				flushSync();
				expect(await result).toBeNull();
				expect(shown()).toBeNull();
			});

			it("Cancel on a cancellable loading aborts only its task's signal, not the run", async () => {
				const run = startRun();
				let signal!: AbortSignal;
				const result = show(() => run.ui.loading('Working', (s) => new Promise<string>((resolve) => {
					signal = s;
					s.addEventListener('abort', () => resolve('cancelled'));
				}), { cancellable: true }));

				button('cancel')!.click();
				flushSync();

				expect(await result).toBe('cancelled');
				expect(signal.aborted).toBe(true);
				expect(run.signal.aborted).toBe(false);
				expect(modsRunsStore.runFor('mod:hello:action:job')?.status).toBe('running');
				expect(shown()).toBeNull();
			});
		});
	});
});
