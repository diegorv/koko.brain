// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// createFileFromTemplate hits Tauri IPC via openOrCreateNote — legitimately
// mocked. Stores stay real (CLAUDE.md rule 1): the picker is driven through
// the real templatesStore and the rendered DOM.
vi.mock('$lib/plugins/templates/templates.service', () => ({
	createFileFromTemplate: vi.fn(() => Promise.resolve()),
}));

import { mount, unmount, flushSync } from 'svelte';
import TemplatePicker from '$lib/plugins/templates/TemplatePicker.svelte';
import { createFileFromTemplate } from '$lib/plugins/templates/templates.service';
import { templatesStore } from '$lib/plugins/templates/templates.store.svelte';

describe('TemplatePicker — confirmCreate', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
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
});
