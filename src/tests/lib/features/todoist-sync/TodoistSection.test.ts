// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeTodoist, type FakeTodoist } from '../../../fixtures/todoist-sync.fake';

const { fake } = vi.hoisted(() => ({ fake: { current: null as FakeTodoist | null } }));

// The "Get your token" link opens a browser through Tauri.
vi.mock('@tauri-apps/plugin-opener', () => ({
	openUrl: vi.fn(() => Promise.resolve()),
}));
// "Load projects" runs a projects-only full /sync against the fake Todoist.
vi.mock('@tauri-apps/plugin-http', () => ({
	fetch: (url: string, init?: RequestInit) => fake.current!.fetch(url, init),
}));
vi.mock('#lib/utils/debug.js', () => ({ debug: vi.fn(), error: vi.fn() }));

// jsdom lacks the pointer-capture and scroll APIs the Select calls when it opens.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

import { mount, unmount, flushSync } from 'svelte';
import { error } from '#lib/utils/debug.js';
import TodoistSection from '#lib/features/todoist-sync/TodoistSection.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

describe('TodoistSection', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let server: FakeTodoist;

	function render() {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(TodoistSection, { target });
		flushSync();
	}

	beforeEach(() => {
		vi.clearAllMocks();
		settingsStore.reset();
		server = createFakeTodoist();
		fake.current = server;
		render();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	/** The shadcn inputs, in markup order: API token, default label, sync folder, interval. */
	function fields(): HTMLInputElement[] {
		return [...target.querySelectorAll<HTMLInputElement>('[data-slot="input"]')];
	}

	function row(name: string): HTMLElement {
		const el = target.querySelector<HTMLElement>(`[data-setting="${name}"]`);
		if (!el) throw new Error(`no row ${name}`);
		return el;
	}

	function type(input: HTMLInputElement, value: string) {
		input.value = value;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	function toggle(name: string) {
		row(name).querySelector<HTMLButtonElement>('[role="switch"]')!.click();
		flushSync();
	}

	const trigger = (name: string) => row(name).querySelector<HTMLElement>('[data-slot="select-trigger"]')!;

	function rerender() {
		if (component) unmount(component);
		document.body.innerHTML = '';
		render();
	}

	it('renders the fields as the shadcn Input, keeping their types and placeholders', () => {
		const [token, label, folder, interval] = fields();
		expect(fields()).toHaveLength(4);
		expect(token.type).toBe('password');
		expect(token.placeholder).toBe('Paste your token here');
		expect(label.type).toBe('text');
		expect(label.placeholder).toBe('e.g. inbox');
		expect(folder.type).toBe('text');
		expect(folder.value).toBe('Todoist');
		expect(interval.type).toBe('number');
		expect(interval.value).toBe('5');
	});

	it('typing in the token field stores the API token', () => {
		expect(settingsStore.todoist.apiToken).toBe('');
		type(fields()[0], 'secret-token');
		expect(settingsStore.todoist.apiToken).toBe('secret-token');
	});

	it('says where the token comes from and that it is stored in the vault', () => {
		const text = row('api-token').textContent ?? '';
		expect(text).toContain('Personal API token from Todoist Settings → Integrations → Developer');
		expect(text).toContain("Stored in this vault's .kokobrain folder. Exclude .kokobrain from sync tools.");
	});

	it('says the default label stays out of the note tags and is never removed by the sync', () => {
		const text = row('default-label').textContent ?? '';
		expect(text).toContain('A Todoist label the sync never writes as a tag and never removes from a task. Leave empty for none.');
		expect(text).not.toContain('Added to every task');
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

	it('the sync switch stores syncEnabled', () => {
		expect(settingsStore.todoist.syncEnabled).toBe(false);
		toggle('sync-enabled');
		expect(settingsStore.todoist.syncEnabled).toBe(true);
		toggle('sync-enabled');
		expect(settingsStore.todoist.syncEnabled).toBe(false);
	});

	it('typing a folder stores syncFolder', () => {
		type(fields()[2], 'Projects/Todoist');
		expect(settingsStore.todoist.syncFolder).toBe('Projects/Todoist');
	});

	it('the interval stores whole minutes of at least 1 and ignores an empty field', () => {
		type(fields()[3], '15');
		expect(settingsStore.todoist.syncIntervalMinutes).toBe(15);
		type(fields()[3], '0');
		expect(settingsStore.todoist.syncIntervalMinutes).toBe(1);
		type(fields()[3], '');
		expect(settingsStore.todoist.syncIntervalMinutes).toBe(1);
	});

	it('the Inbox switch stores syncIncludeInbox', () => {
		toggle('sync-include-inbox');
		expect(settingsStore.todoist.syncIncludeInbox).toBe(true);
	});

	it('explains what each vault context does with the webhook', () => {
		const text = row('sync-context').textContent ?? '';
		expect(text).toContain('Vault context');
		expect(text).toContain('A work vault sends new tasks with no context label, so the webhook adds Work.');
		expect(text).toContain('A personal vault sends them with the label personal.');
		expect(trigger('sync-context').textContent).toContain('Work');
	});

	it('shows the stored context', () => {
		settingsStore.updateTodoist({ syncContext: 'personal' });
		flushSync();
		expect(trigger('sync-context').textContent).toContain('Personal');
	});

	it('shows "None" for no root, and the saved id before projects are loaded', () => {
		expect(trigger('sync-root').textContent).toContain('None (sync off)');
		settingsStore.updateTodoist({ syncRootProjectId: 'p-work' });
		flushSync();
		expect(trigger('sync-root').textContent).toContain('p-work');
	});

	it('"Load projects" fetches the tree from Todoist and names the saved root by its path', async () => {
		server.addProject({ id: 'inbox', name: 'Inbox', inbox_project: true });
		server.addProject({ id: 'p-work', name: 'Work' });
		server.addProject({ id: 'p-acme', name: 'Acme', parent_id: 'p-work' });
		settingsStore.updateTodoist({ apiToken: server.token, syncRootProjectId: 'p-acme' });
		flushSync();

		row('sync-root').querySelector<HTMLButtonElement>('[data-load-projects]')!.click();
		await vi.waitFor(() => expect(trigger('sync-root').textContent).toContain('Work / Acme'));

		expect(server.requests).toEqual([{ sync_token: '*', resource_types: ['projects'] }]);
		expect(row('sync-root').querySelector('[data-load-error]')).toBeNull();
	});

	it('"Load projects" without a token shows an inline message and calls nothing', async () => {
		row('sync-root').querySelector<HTMLButtonElement>('[data-load-projects]')!.click();
		await vi.waitFor(() => expect(target.querySelector('[data-load-error]')?.textContent).toBe('Add your API token first.'));
		expect(server.requests).toEqual([]);
	});

	it('"Load projects" with a rejected token shows the fixed message and logs the raw error', async () => {
		settingsStore.updateTodoist({ apiToken: 'wrong' });
		flushSync();

		row('sync-root').querySelector<HTMLButtonElement>('[data-load-projects]')!.click();

		await vi.waitFor(() =>
			expect(target.querySelector('[data-load-error]')?.textContent).toBe('Todoist rejected the API token. Check it in Settings > Todoist.'),
		);
		expect(vi.mocked(error)).toHaveBeenCalledWith('TODOIST', 'loading projects failed:', expect.objectContaining({ httpStatusCode: 401 }));
	});

	/** Opens a row's Select and picks the option labelled `label`. */
	async function choose(name: string, label: string) {
		const el = trigger(name);
		el.focus();
		el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		flushSync();
		const option = await vi.waitFor(() => {
			const found = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((o) => o.textContent?.trim() === label);
			if (!found) throw new Error(`no option ${label}`);
			return found;
		});
		option.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerType: 'mouse' }));
		option.click();
		flushSync();
	}

	it('picking a loaded project stores it as the root, and None clears it', async () => {
		server.addProject({ id: 'p-work', name: 'Work' });
		settingsStore.updateTodoist({ apiToken: server.token });
		flushSync();
		row('sync-root').querySelector<HTMLButtonElement>('[data-load-projects]')!.click();
		await vi.waitFor(() => expect(server.requests).toHaveLength(1));

		await choose('sync-root', 'Work');
		expect(settingsStore.todoist.syncRootProjectId).toBe('p-work');

		await choose('sync-root', 'None (sync off)');
		expect(settingsStore.todoist.syncRootProjectId).toBe('');
	});

	it('picking Personal stores the personal context', async () => {
		await choose('sync-context', 'Personal');
		expect(settingsStore.todoist.syncContext).toBe('personal');
	});

	it('keeps the controls after a remount with stored values', () => {
		settingsStore.updateTodoist({ syncEnabled: true, syncFolder: 'TD', syncIntervalMinutes: 9 });
		rerender();
		expect(row('sync-enabled').querySelector('[role="switch"]')!.getAttribute('aria-checked')).toBe('true');
		expect(fields()[2].value).toBe('TD');
		expect(fields()[3].value).toBe('9');
	});
});
