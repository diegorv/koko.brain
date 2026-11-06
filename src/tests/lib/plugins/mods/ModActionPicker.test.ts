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

// bits-ui's Command scrolls its first item into view; jsdom does not implement it.
Element.prototype.scrollIntoView ??= () => {};

const VAULT = '/vaults/main';
const globals = globalThis as unknown as { __modEvents: string[] };

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

	beforeEach(async () => {
		vi.clearAllMocks();
		localStorage.clear();
		vaultStore._reset();
		modsEnabledStore._reset();
		railRegistryStore.reset();
		modPickerStore.reset();
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

		expect(rows().map((el) => el.dataset.modAction)).toEqual(['hello', 'boom', 'idea']);
		expect(row('hello').textContent).toContain('Say hello');
		expect(row('hello').textContent).toContain('Shows a toast');
		expect(row('boom').textContent).toContain('Explode');
		// The dialog's accessible title is the button's title.
		const dialog = document.querySelector('[role="dialog"]')!;
		expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Hello mod');
	});

	it('picking an action closes the picker and runs it', async () => {
		clickRailButton();

		row('hello').click();
		flushSync();

		expect(modPickerStore.isOpen).toBe(false);
		await vi.waitFor(() => expect(globals.__modEvents).toEqual(['hello:run']));
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('a throwing action shows the error toast', async () => {
		clickRailButton();

		row('boom').click();
		flushSync();

		await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Hello mod: Explode failed: kaboom'));
		expect(modPickerStore.isOpen).toBe(false);
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

		it('Enter runs the action with the typed text and closes the picker', async () => {
			const input = openInputStep();
			type(input, 'A flying car');

			press(input, 'Enter');

			expect(modPickerStore.isOpen).toBe(false);
			await vi.waitFor(() => expect(globals.__modEvents).toEqual(['idea:A flying car']));
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
		expect(rows()).toHaveLength(3);

		disableMod('hello');
		flushSync();

		expect(modPickerStore.isOpen).toBe(false);
		expect(rows()).toEqual([]);
		expect(railRegistryStore.actions).toEqual([]);
	});
});
