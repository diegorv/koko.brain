// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The "Get your token" link opens a browser through Tauri, the only side effect here.
vi.mock('@tauri-apps/plugin-opener', () => ({
	openUrl: vi.fn(() => Promise.resolve()),
}));

import { mount, unmount, flushSync } from 'svelte';
import TodoistSection from '#lib/core/settings/sections/TodoistSection.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

describe('TodoistSection', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		settingsStore.reset();
		target = document.body.appendChild(document.createElement('div'));
		component = mount(TodoistSection, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	/** The shadcn inputs, in markup order: API token, default label. */
	function fields(): HTMLInputElement[] {
		return [...target.querySelectorAll<HTMLInputElement>('[data-slot="input"]')];
	}

	function type(input: HTMLInputElement, value: string) {
		input.value = value;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	it('renders both fields as the shadcn Input, keeping their types and placeholders', () => {
		const [token, label] = fields();
		expect(fields()).toHaveLength(2);
		expect(token.type).toBe('password');
		expect(token.placeholder).toBe('Paste your token here');
		expect(label.type).toBe('text');
		expect(label.placeholder).toBe('e.g. inbox');
	});

	it('typing in the token field stores the API token', () => {
		expect(settingsStore.todoist.apiToken).toBe('');
		type(fields()[0], 'secret-token');
		expect(settingsStore.todoist.apiToken).toBe('secret-token');
	});

	it('typing in the label field stores the default label', () => {
		expect(settingsStore.todoist.defaultLabel).toBe('');
		type(fields()[1], 'inbox');
		expect(settingsStore.todoist.defaultLabel).toBe('inbox');
	});

	it('clearing a field stores an empty value', () => {
		type(fields()[1], 'inbox');
		type(fields()[1], '');
		expect(settingsStore.todoist.defaultLabel).toBe('');
	});
});
