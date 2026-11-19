// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// createFileFromTemplate hits Tauri IPC via openOrCreateNote — legitimately
// mocked. Stores stay real (CLAUDE.md rule 1): the picker is driven through
// the real templatesStore and the rendered DOM.
vi.mock('#lib/plugins/templates/templates.service.js', () => ({
	createFileFromTemplate: vi.fn(() => Promise.resolve()),
}));

import { mount, unmount, flushSync } from 'svelte';
import TemplatePicker from '#lib/plugins/templates/TemplatePicker.svelte';
import { createFileFromTemplate } from '#lib/plugins/templates/templates.service.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { templatesStore } from '#lib/plugins/templates/templates.store.svelte.js';

// bits-ui's Command scrolls its first item into view; jsdom does not implement it.
Element.prototype.scrollIntoView ??= () => {};

describe('TemplatePicker — confirmCreate', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		templatesStore.reset();
		templatesStore.setTemplates([
			{ name: 'Daily', path: '/vault/_templates/Daily.md' },
		]);
		target = document.body.appendChild(document.createElement('div'));
		component = mount(TemplatePicker, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	/** Opens the dialog, selects the only template, and returns the filename input. */
	function reachNamingStep(): HTMLInputElement {
		templatesStore.open();
		flushSync();
		// Command.Dialog renders via portal to document.body.
		const item = [...document.querySelectorAll<HTMLElement>('[data-command-item], [role="option"]')]
			.find((el) => el.textContent?.includes('Daily'));
		if (!item) throw new Error('template Command.Item not found in the dialog');
		item.click();
		flushSync();
		const input = document.querySelector<HTMLInputElement>('input[placeholder="File name..."]');
		if (!input) throw new Error('filename input not found — naming step did not render');
		return input;
	}

	function typeName(input: HTMLInputElement, name: string) {
		input.value = name;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	function pressEnter(input: HTMLInputElement) {
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		flushSync();
	}

	function pressBackspace(input: HTMLInputElement, repeat = false) {
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', repeat, bubbles: true, cancelable: true }));
		flushSync();
	}

	/** The dialog's rendered text (Command.Dialog portals to document.body). */
	function dialogText(): string {
		return document.querySelector('[role="dialog"]')?.textContent ?? '';
	}

	it('creates the file from the selected template with the typed name', async () => {
		const input = reachNamingStep();
		typeName(input, 'My Note');
		pressEnter(input);
		await Promise.resolve();

		expect(createFileFromTemplate).toHaveBeenCalledTimes(1);
		expect(createFileFromTemplate).toHaveBeenCalledWith('/vault/_templates/Daily.md', 'My Note');
	});

	it('trims surrounding whitespace from the typed name', async () => {
		const input = reachNamingStep();
		typeName(input, '  Weekly Review  ');
		pressEnter(input);
		await Promise.resolve();

		expect(createFileFromTemplate).toHaveBeenCalledWith('/vault/_templates/Daily.md', 'Weekly Review');
	});

	it('closes the dialog after confirming', async () => {
		const input = reachNamingStep();
		typeName(input, 'My Note');
		pressEnter(input);
		await Promise.resolve();

		expect(templatesStore.isOpen).toBe(false);
	});

	it('does not create anything when Enter is pressed with an empty name', () => {
		const input = reachNamingStep();
		pressEnter(input);

		expect(createFileFromTemplate).not.toHaveBeenCalled();
		// Still on the naming step — the dialog stays open.
		expect(templatesStore.isOpen).toBe(true);
	});

	it('names the chosen template and where the new note goes', () => {
		const input = reachNamingStep();
		typeName(input, 'Standup');

		const text = dialogText();
		expect(text).toContain('Daily');
		expect(text).toContain('Creates Standup.md in the vault root');
	});

	it('shows the typed folder when the name has a slash', () => {
		const input = reachNamingStep();
		typeName(input, 'Projects/Standup');

		expect(dialogText()).toContain('Creates Projects/Standup.md in the vault');
		expect(dialogText()).not.toContain('vault root');
	});

	it('keeps the empty-name text', () => {
		reachNamingStep();

		expect(dialogText()).toContain('Type a name for the new file');
	});

	it('refuses a name that climbs out of the vault, and Enter creates nothing', async () => {
		const input = reachNamingStep();
		typeName(input, '../Outside');

		expect(dialogText()).toContain('Must stay inside the vault');
		expect(dialogText()).not.toContain('Creates ../Outside.md in the vault');

		pressEnter(input);
		await Promise.resolve();
		expect(createFileFromTemplate).not.toHaveBeenCalled();
		expect(templatesStore.isOpen).toBe(true);
	});

	it('still offers a .. that stays inside the vault', () => {
		const input = reachNamingStep();
		typeName(input, 'Folder/../Name');

		expect(dialogText()).not.toContain('Must stay inside the vault');
		expect(dialogText()).toContain('Creates');
	});

	it('says Enter opens the existing note when the name matches one, ignoring case', async () => {
		fsStore.setFileTree([{ name: 'Standup.md', path: '/vault/Standup.md', isDirectory: false }]);
		const input = reachNamingStep();
		typeName(input, 'standup');

		expect(dialogText()).toContain('Enter opens the existing note');
		expect(dialogText()).not.toContain('Creates');

		pressEnter(input);
		await Promise.resolve();
		expect(createFileFromTemplate).toHaveBeenCalledTimes(1);
		expect(createFileFromTemplate).toHaveBeenCalledWith('/vault/_templates/Daily.md', 'standup');
	});

	it('never claims an existing note with an empty tree', () => {
		const input = reachNamingStep();
		typeName(input, 'Standup');

		expect(dialogText()).not.toContain('opens the existing note');
	});

	it('Backspace on the empty name returns to the template list without creating', async () => {
		const input = reachNamingStep();
		pressBackspace(input);

		expect(document.querySelector('input[placeholder="File name..."]')).toBeNull();
		const search = document.querySelector('input[placeholder="Search templates..."]');
		expect(search).not.toBeNull();
		// bits-ui's Command.Input autofocus fires after a short timer.
		await vi.waitFor(() => expect(document.activeElement).toBe(search));
		expect(dialogText()).toContain('Daily');
		expect(templatesStore.isOpen).toBe(true);
		expect(createFileFromTemplate).not.toHaveBeenCalled();
	});

	it('a held (auto-repeated) Backspace on the empty name stays on the naming step', () => {
		const input = reachNamingStep();
		pressBackspace(input, true);

		expect(document.querySelector('input[placeholder="File name..."]')).not.toBeNull();
		expect(dialogText()).toContain('Daily');
	});

	it('Backspace with a typed name stays on the naming step', () => {
		const input = reachNamingStep();
		typeName(input, 'Standup');
		pressBackspace(input);

		expect(document.querySelector('input[placeholder="File name..."]')).not.toBeNull();
	});
});
