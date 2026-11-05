// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { mount, unmount, flushSync } from 'svelte';
import FilesSection from '#lib/core/settings/sections/FilesSection.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

describe('FilesSection', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		settingsStore.reset();
		target = document.body.appendChild(document.createElement('div'));
		component = mount(FilesSection, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	/** The setting row whose label is `label`. */
	function row(label: string): HTMLElement {
		const found = [...target.querySelectorAll<HTMLElement>('.bg-setting-item-bg')].find((el) => el.querySelector('span')?.textContent === label);
		if (!found) throw new Error(`no row "${label}"`);
		return found;
	}

	function type(input: HTMLInputElement, value: string) {
		input.value = value;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	it('titles the page Files & Folders', () => {
		expect(target.querySelector('h2')?.textContent).toBe('Files & Folders');
	});

	it('writes the templates folder to the store', () => {
		type(row('Templates folder').querySelector('input')!, 'my-templates');
		expect(settingsStore.templates.folder).toBe('my-templates');
	});

	it('writes the system folder to the store, and accepts empty to disable it', () => {
		const input = row('System folder').querySelector('input')!;
		type(input, '_meta');
		expect(settingsStore.templates.systemFolder).toBe('_meta');
		type(input, '');
		expect(settingsStore.templates.systemFolder).toBe('');
	});

	it('turns folder notes off and on', () => {
		const control = row('Folder notes').querySelector<HTMLButtonElement>('[role="switch"]')!;
		const before = settingsStore.folderNotes.enabled;

		control.click();
		flushSync();
		expect(settingsStore.folderNotes.enabled).toBe(!before);

		control.click();
		flushSync();
		expect(settingsStore.folderNotes.enabled).toBe(before);
	});
});
