// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Real stores and the real host; only the Tauri file system and the toast are mocked.
const fsFiles = vi.hoisted(() => new Map<string, string>());

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async (path: string) => [...fsFiles.keys()].some((k) => k.startsWith(`${path}/`))),
	readDir: vi.fn(async () => [{ name: 'hello', isDirectory: true, isFile: false, isSymlink: false }]),
	readTextFile: vi.fn(async (path: string) => {
		const text = fsFiles.get(path);
		if (text === undefined) throw new Error(`No such file: ${path}`);
		return text;
	}),
}));

vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

import { mount, unmount, flushSync } from 'svelte';
import { toast } from 'svelte-sonner';

import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import ModActionPicker from '#lib/plugins/mods/ModActionPicker.svelte';
import { modPickerStore } from '#lib/plugins/mods/mod-picker.store.svelte.js';
import { modsEnabledStore } from '#lib/plugins/mods/mods-enabled.store.svelte.js';
import { disableMod, startModsHost, stopModsHost } from '#lib/plugins/mods/mods-host.service.js';
import { modsRunsStore } from '#lib/plugins/mods/mods-runs.store.svelte.js';

// bits-ui's Command scrolls its first item into view; jsdom does not implement it.
Element.prototype.scrollIntoView ??= () => {};

const VAULT = '/vaults/main';
const globals = globalThis as unknown as { __modEvents: string[]; __modRelease: () => void };

describe('ModActionPicker', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	/** Clicks the hello mod's rail button through the registry, as the rail does */
	function clickRailButton() {
		railRegistryStore.actions.find((a) => a.key === 'mod:hello:main')!.run();
		flushSync();
	}

	/** The picker's rows; Command.Dialog renders through a portal into document.body */
	const rows = () => [...document.querySelectorAll<HTMLElement>('[data-mod-action]')];
	const row = (id: string) => document.querySelector<HTMLElement>(`[data-mod-action="${id}"]`)!;
	const runView = () => document.querySelector<HTMLElement>('[data-mod-run]');
	const status = () => runView()?.querySelector('[data-mod-run-status]')?.textContent?.trim();
	const logLines = () => [...(runView()?.querySelectorAll('[data-mod-run-log] > *') ?? [])].map((el) => el.textContent);
	const stopButton = () => runView()?.querySelector<HTMLButtonElement>('[data-mod-run-stop]') ?? null;
	const closeButton = () => runView()?.querySelector<HTMLButtonElement>('[data-mod-run-close]') ?? null;

	beforeEach(async () => {
		vi.clearAllMocks();
		localStorage.clear();
		vaultStore._reset();
		modsEnabledStore._reset();
		railRegistryStore.reset();
		modPickerStore.reset();
		modsRunsStore.reset();
		globals.__modEvents = [];
		vaultStore.open(VAULT);
		modsEnabledStore.setEnabled(true);
		fsFiles.set(`${VAULT}/_system/mods/hello/manifest.json`, JSON.stringify({ id: 'hello', name: 'Hello mod', version: '1.0.0' }));
		fsFiles.set(
			`${VAULT}/_system/mods/hello/main.js`,
			`export default {
	onload(ctx) {
		ctx.addAction({ id: 'hello', title: 'Say hello', description: 'Shows a toast', run: async () => { globalThis.__modEvents.push('hello:run'); } });
		ctx.addAction({ id: 'boom', title: 'Explode', run: () => { throw new Error('kaboom'); } });
		ctx.addAction({ id: 'idea', title: 'New idea note', input: { placeholder: 'Describe the idea' }, run: (text) => { globalThis.__modEvents.push('idea:' + text); } });
		ctx.addAction({ id: 'counted', title: 'Counted job', run: (input, run) => { run.progress(1, 1, 'One of one'); globalThis.__modEvents.push('counted:run'); } });
		ctx.addAction({ id: 'slow', title: 'Slow job', run: async (input, run) => {
			run.log('Reading notes');
			run.progress(1, 4, 'Note 1 of 4');
			await new Promise((resolve, reject) => {
				globalThis.__modRelease = resolve;
				run.signal.addEventListener('abort', () => reject(new Error('stopped')));
			});
			run.log('All done');
		} });
		ctx.addRailButton({ id: 'main', title: 'Hello mod', icon: 'sparkles' });
	},
};`,
		);
		target = document.body.appendChild(document.createElement('div'));
		component = mount(ModActionPicker, { target });
		flushSync();
		await startModsHost(VAULT);
	});

	afterEach(() => {
		stopModsHost();
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('renders nothing until a rail button is clicked', () => {
		expect(rows()).toEqual([]);
	});

	it("lists the button's actions with title and description", () => {
		clickRailButton();

		expect(rows().map((el) => el.dataset.modAction)).toEqual(['hello', 'boom', 'idea', 'counted', 'slow']);
		expect(row('hello').textContent).toContain('Say hello');
		expect(row('hello').textContent).toContain('Shows a toast');
		expect(row('boom').textContent).toContain('Explode');
		// The dialog's accessible title is the button's title.
		const dialog = document.querySelector('[role="dialog"]')!;
		expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Hello mod');
	});

	it('picking an action runs it in the run view, which closes by itself when a quiet run ends', async () => {
		clickRailButton();

		row('hello').click();
		flushSync();
		// The run view shows while the action runs.
		expect(runView()?.textContent).toContain('Say hello');

		await vi.waitFor(() => expect(globals.__modEvents).toEqual(['hello:run']));
		await vi.waitFor(() => expect(modsRunsStore.runFor('mod:hello:main')?.status).toBe('done'));
		flushSync();
		// No log line and no progress: nothing to read, so the picker closes.
		expect(modPickerStore.isOpen).toBe(false);
		expect(runView()).toBeNull();
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('a run that showed progress stays open on Done', async () => {
		clickRailButton();

		row('counted').click();
		flushSync();

		await vi.waitFor(() => expect(modsRunsStore.runFor('mod:hello:main')?.status).toBe('done'));
		flushSync();
		expect(modPickerStore.isOpen).toBe(true);
		expect(status()).toBe('Done');
		expect(stopButton()).toBeNull();
	});

	it('a throwing action shows Failed with its message and stack, and the error toast', async () => {
		clickRailButton();

		row('boom').click();
		flushSync();

		await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Hello mod: Explode failed: kaboom'));
		flushSync();
		expect(status()).toBe('Failed');
		expect(runView()!.querySelector('[data-mod-run-error]')?.textContent).toContain('kaboom');
		expect(runView()!.querySelector('details pre')?.textContent).toContain('kaboom');
	});

	describe('a long run', () => {
		/** Clicks the rail button and picks Slow job */
		function startSlowJob() {
			clickRailButton();
			row('slow').click();
			flushSync();
		}

		it('shows the title, the progress bar and label, the log, and Stop', () => {
			startSlowJob();

			expect(runView()?.textContent).toContain('Slow job');
			expect(status()).toBe('Running');
			const bar = runView()!.querySelector('[role="progressbar"]')!;
			expect(bar.getAttribute('aria-valuenow')).toBe('1');
			expect(bar.getAttribute('aria-valuemax')).toBe('4');
			expect(runView()!.querySelector('[data-mod-run-progress-label]')?.textContent).toBe('Note 1 of 4');
			expect(logLines()).toEqual(['Reading notes']);
			expect(stopButton()).not.toBeNull();
		});

		it('adds log lines as the run goes, and shows Done at the end', async () => {
			startSlowJob();

			globals.__modRelease();
			await vi.waitFor(() => expect(modsRunsStore.runFor('mod:hello:main')?.status).toBe('done'));
			flushSync();

			expect(logLines()).toEqual(['Reading notes', 'All done']);
			expect(status()).toBe('Done');
		});

		it('Stop cancels the run and shows Cancelled, with no error toast', async () => {
			startSlowJob();

			stopButton()!.click();
			flushSync();

			expect(status()).toBe('Cancelled');
			expect(stopButton()).toBeNull();
			await new Promise((resolve) => setTimeout(resolve, 0));
			expect(toast.error).not.toHaveBeenCalled();
		});

		/** Presses a key on `el` the way a browser does: Enter on a button clicks it unless a handler prevented the default */
		function pressKey(el: HTMLElement, key: string) {
			const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
			el.dispatchEvent(event);
			if (key === 'Enter' && el instanceof HTMLButtonElement && !event.defaultPrevented) el.click();
			flushSync();
		}

		it('focuses Stop while the run goes, and Close once it ends', async () => {
			startSlowJob();

			expect(document.activeElement).toBe(stopButton());

			globals.__modRelease();
			await vi.waitFor(() => expect(modsRunsStore.runFor('mod:hello:main')?.status).toBe('done'));
			flushSync();

			expect(document.activeElement).toBe(closeButton());
		});

		it('Enter on Stop cancels the run', () => {
			startSlowJob();

			pressKey(stopButton()!, 'Enter');

			expect(status()).toBe('Cancelled');
			expect(modsRunsStore.runFor('mod:hello:main')?.status).toBe('cancelled');
		});

		it('Enter on Close hides the view', () => {
			startSlowJob();

			pressKey(closeButton()!, 'Enter');

			expect(modPickerStore.isOpen).toBe(false);
			expect(runView()).toBeNull();
		});

		it('Escape in the run view still closes the picker', () => {
			startSlowJob();

			pressKey(stopButton()!, 'Escape');

			expect(modPickerStore.isOpen).toBe(false);
			expect(modsRunsStore.runFor('mod:hello:main')?.status).toBe('running');
		});

		describe('the log box', () => {
			/** Gives the log box a 100px viewport over 500px of content; jsdom lays nothing out */
			function sizeLogBox(): HTMLElement {
				const box = runView()!.querySelector<HTMLElement>('[data-mod-run-log]')!;
				Object.defineProperty(box, 'clientHeight', { configurable: true, value: 100 });
				Object.defineProperty(box, 'scrollHeight', { configurable: true, value: 500 });
				return box;
			}

			it('scrolls to the newest line while it is scrolled to the bottom', async () => {
				startSlowJob();
				const box = sizeLogBox();
				box.scrollTop = 400;
				box.dispatchEvent(new Event('scroll'));

				globals.__modRelease();
				await vi.waitFor(() => expect(logLines()).toEqual(['Reading notes', 'All done']));
				await vi.waitFor(() => expect(box.scrollTop).toBe(500));
			});

			it('stays where the user scrolled up to', async () => {
				startSlowJob();
				const box = sizeLogBox();
				box.scrollTop = 0;
				box.dispatchEvent(new Event('scroll'));

				globals.__modRelease();
				await vi.waitFor(() => expect(logLines()).toEqual(['Reading notes', 'All done']));
				await new Promise((resolve) => setTimeout(resolve, 0));
				expect(box.scrollTop).toBe(0);
			});
		});

		it('Close hides the view and keeps the run going in the store', () => {
			startSlowJob();

			closeButton()!.click();
			flushSync();

			expect(modPickerStore.isOpen).toBe(false);
			expect(runView()).toBeNull();
			expect(modsRunsStore.runFor('mod:hello:main')?.status).toBe('running');
		});

		it('clicking the busy rail button reopens the run view with its log', () => {
			startSlowJob();
			closeButton()!.click();
			flushSync();

			clickRailButton();

			expect(rows()).toEqual([]);
			expect(status()).toBe('Running');
			expect(logLines()).toEqual(['Reading notes']);
		});

		it('says Reload pending while a reload waits for the run', () => {
			startSlowJob();

			modsRunsStore.setReloadPending('hello', true);
			flushSync();

			expect(runView()!.querySelector('[data-mod-reload-pending]')?.textContent).toBe('Reload pending');
		});
	});

	describe('an action with input', () => {
		const field = () => document.querySelector<HTMLInputElement>('[data-mod-input]');

		/** Clicks the rail button, then the idea row, and returns the text field */
		function openInputStep(): HTMLInputElement {
			clickRailButton();
			row('idea').click();
			flushSync();
			return field()!;
		}

		function type(input: HTMLInputElement, text: string) {
			input.value = text;
			input.dispatchEvent(new Event('input', { bubbles: true }));
			flushSync();
		}

		const press = (input: HTMLInputElement, key: string, isComposing = false) => {
			input.dispatchEvent(new KeyboardEvent('keydown', { key, isComposing, bubbles: true, cancelable: true }));
			flushSync();
		};

		it('Enter during IME composition runs nothing and keeps the field open', async () => {
			const input = openInputStep();
			type(input, 'かんじ');

			press(input, 'Enter', true);

			expect(modPickerStore.isOpen).toBe(true);
			expect(field()).not.toBeNull();
			await new Promise((resolve) => setTimeout(resolve, 0));
			expect(globals.__modEvents).toEqual([]);
		});

		it('shows a text field with its placeholder instead of running', () => {
			const input = openInputStep();

			expect(input.placeholder).toBe('Describe the idea');
			expect(rows()).toEqual([]);
			expect(modPickerStore.isOpen).toBe(true);
			expect(globals.__modEvents).toEqual([]);
			const dialog = document.querySelector('[role="dialog"]')!;
			expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('New idea note');
		});

		it('Enter runs the action with the typed text; the quiet run then closes the picker', async () => {
			const input = openInputStep();
			type(input, 'A flying car');

			press(input, 'Enter');

			await vi.waitFor(() => expect(globals.__modEvents).toEqual(['idea:A flying car']));
			await vi.waitFor(() => expect(modsRunsStore.runFor('mod:hello:main')?.status).toBe('done'));
			flushSync();
			expect(field()).toBeNull();
			expect(modPickerStore.isOpen).toBe(false);
		});

		it('Escape closes the picker and runs nothing', async () => {
			const input = openInputStep();
			type(input, 'A flying car');

			press(input, 'Escape');

			expect(modPickerStore.isOpen).toBe(false);
			expect(field()).toBeNull();
			await new Promise((resolve) => setTimeout(resolve, 0));
			expect(globals.__modEvents).toEqual([]);
		});

		it('reopening the picker shows the action list again with an empty field next time', () => {
			type(openInputStep(), 'draft');
			modPickerStore.close();
			flushSync();

			expect(openInputStep().value).toBe('');
		});
	});

	it('unloading the mod while its picker is open closes it', () => {
		clickRailButton();
		expect(rows()).toHaveLength(5);

		disableMod('hello');
		flushSync();

		expect(modPickerStore.isOpen).toBe(false);
		expect(rows()).toEqual([]);
		expect(railRegistryStore.actions).toEqual([]);
	});
});
