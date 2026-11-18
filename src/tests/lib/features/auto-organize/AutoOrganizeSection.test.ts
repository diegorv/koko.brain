// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

import { toast } from 'svelte-sonner';
import { exists, writeTextFile } from '@tauri-apps/plugin-fs';
import AutoOrganizeSection from '#lib/features/auto-organize/AutoOrganizeSection.svelte';
import { autoOrganizeStore } from '#lib/features/auto-organize/auto-organize.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { getTypeMetadataFallback } from '#lib/features/type-definitions/type-definitions.logic.js';
import type { AutoOrganizeRule } from '#lib/features/auto-organize/auto-organize.types.js';

describe('AutoOrganizeSection', () => {
	let component: Record<string, unknown> | null = null;

	/** Mounts the section; the stores are set before it, so the first render reads them. */
	function render() {
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(AutoOrganizeSection, { target });
		flushSync();
	}

	function resetStores() {
		autoOrganizeStore.reset();
		settingsStore.reset();
		typeDefinitionsStore.reset();
		fsStore.reset();
		vaultStore._reset();
	}

	beforeEach(() => {
		vi.clearAllMocks();
		resetStores();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		resetStores();
	});

	/** The element matching `selector` (a role) whose accessible name is `name`. */
	function byName<T extends HTMLElement>(selector: string, name: string): T {
		const el = [...document.querySelectorAll<T>(selector)].find((e) => e.getAttribute('aria-label') === name);
		if (!el) throw new Error(`no ${selector} named "${name}"`);
		return el;
	}

	/** The debounce field, shown in seconds. */
	function debounceInput(): HTMLInputElement {
		return byName<HTMLInputElement>('input[type="number"]', 'Debounce delay');
	}

	/** The text field of the excluded folders. */
	function folderInput(): HTMLInputElement {
		return byName<HTMLInputElement>('input', 'Folder to exclude');
	}

	/** Types a raw value, exactly as a keystroke does. */
	function type(input: HTMLInputElement, raw: string) {
		input.value = raw;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	/** Commits the typed value the way Enter or a focus change does. */
	function commit(input: HTMLInputElement) {
		input.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();
	}

	/** Types `folder` in the excluded-folder field and presses Enter. */
	function addFolder(folder: string) {
		const input = folderInput();
		type(input, folder);
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		flushSync();
	}

	function button(label: string): HTMLButtonElement {
		const found = [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === label);
		if (!found) throw new Error(`no button "${label}"`);
		return found;
	}

	/** The chip text of every excluded folder, with its "missing" mark when shown. */
	const chips = () => [...document.querySelectorAll('[data-excluded-folder]')].map((el) => el.textContent?.replace(/\s+/g, ' ').trim());

	const text = () => document.body.textContent ?? '';

	/** A directory node of the tree. */
	const dir = (path: string, children: FileTreeNode[] = []): FileTreeNode => ({
		name: path.split('/').pop()!,
		path,
		isDirectory: true,
		children,
	});

	it('creates a new rule disabled, so it acts on no save while it is being written', () => {
		render();
		button('Add rule').click();
		flushSync();

		expect(autoOrganizeStore.rules).toHaveLength(1);
		expect(autoOrganizeStore.rules[0].enabled).toBe(false);
		expect(autoOrganizeStore.enabledRules).toEqual([]);
		expect(document.querySelectorAll('[data-rule-property]')).toHaveLength(0);
	});

	it('writes the debounce while typing only when it is in range, and clamps on commit', () => {
		render();
		const input = debounceInput();
		expect(settingsStore.autoOrganize.debounceMs).toBe(3000);
		type(input, '');
		expect(settingsStore.autoOrganize.debounceMs).toBe(3000);
		type(input, '0');
		expect(settingsStore.autoOrganize.debounceMs).toBe(3000);
		type(input, '2');
		expect(settingsStore.autoOrganize.debounceMs).toBe(2000);
		type(input, '45');
		expect(settingsStore.autoOrganize.debounceMs).toBe(2000);
		commit(input);
		expect(settingsStore.autoOrganize.debounceMs).toBe(30000);
		expect(input.value).toBe('30');
	});

	it('keeps the stored debounce and restores the field on an empty commit', () => {
		render();
		const input = debounceInput();
		type(input, '');
		commit(input);
		expect(settingsStore.autoOrganize.debounceMs).toBe(3000);
		expect(input.value).toBe('3');
	});

	it('says how each effect picks its rule and what the excluded folders skip', () => {
		render();
		expect(text()).toContain('After a save, applies the rules below and the archive rules of your types');
		expect(text()).toContain('The first matching rule wins for rename, move to folder and run mod action');
		expect(text()).toContain('apply from every matching rule');
		expect(text()).toContain('archive rules run last');
		expect(text()).toContain('Rules never run on notes inside these folders');
		expect(text()).not.toContain('determines the destination folder');
		expect(text()).not.toContain('never be automatically moved');
	});

	describe('archive-off hint', () => {
		const withArchive = (name: string, archiveTo: string | null) => [
			name,
			{ ...getTypeMetadataFallback(name, new Map()), archiveTo },
		] as const;

		const hint = () => [...document.querySelectorAll('p')].find((p) => p.textContent?.includes('of your types set an archive folder'));

		beforeEach(() => {
			typeDefinitionsStore.setTypeMetadataMap(new Map([
				withArchive('Project', '{folder}/_archive'),
				withArchive('Event', 'archive/events/{year}'),
				withArchive('Person', null),
			]));
		});

		it('counts the types with an archive folder while Auto Organize is off', () => {
			render();
			expect(hint()?.textContent?.trim()).toBe(
				'2 of your types set an archive folder. While Auto Organize is off, Archive marks a note as archived but does not move it.',
			);
		});

		it('is hidden while Auto Organize is on', () => {
			settingsStore.updateAutoOrganize({ enabled: true });
			render();
			expect(hint()).toBeUndefined();
		});

		it('is hidden when no type sets an archive folder', () => {
			typeDefinitionsStore.setTypeMetadataMap(new Map([withArchive('Person', null)]));
			render();
			expect(hint()).toBeUndefined();
		});

		it('adds no button to the section', () => {
			render();
			expect(hint()).toBeDefined();
			const withHint = document.querySelectorAll('button').length;

			typeDefinitionsStore.setTypeMetadataMap(new Map([withArchive('Person', null)]));
			flushSync();

			expect(hint()).toBeUndefined();
			expect(document.querySelectorAll('button').length).toBe(withHint);
		});
	});

	it('toasts a failed save once and keeps the new rule in the store', async () => {
		vaultStore.open('/vault');
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockRejectedValue(new Error('disk full'));
		render();

		button('Add rule').click();
		flushSync();
		await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());

		expect(writeTextFile).toHaveBeenCalledTimes(1);
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(toast.error).toHaveBeenCalledWith('Could not save auto-organize rules', { id: 'auto-organize-save' });
		expect(autoOrganizeStore.rules).toHaveLength(1);
	});

	it('names the switch, the debounce field, the folder field and each chip remove', () => {
		autoOrganizeStore.setExcludedFolders(['_templates']);
		render();

		expect(byName('[role="switch"]', 'Enable Auto Organize')).toBeDefined();
		expect(debounceInput()).toBeDefined();
		expect(folderInput()).toBeDefined();
		byName<HTMLButtonElement>('button', 'Remove _templates from excluded folders').click();
		flushSync();

		expect(autoOrganizeStore.excludedFolders).toEqual([]);
	});

	describe('excluded folders', () => {
		it('adds a folder once, whatever its case, and says it is already excluded', () => {
			render();
			addFolder('Archive');
			expect(autoOrganizeStore.excludedFolders).toEqual(['Archive']);
			expect(text()).not.toContain('Already excluded');

			addFolder('Archive');
			addFolder('archive');

			expect(autoOrganizeStore.excludedFolders).toEqual(['Archive']);
			expect(document.querySelector('[aria-live]')?.textContent?.trim()).toBe('Already excluded');
		});

		it('offers the vault folders, vault-relative, as suggestions', () => {
			vaultStore.open('/vault');
			fsStore.setFileTree([dir('/vault/Archive'), dir('/vault/Projects', [dir('/vault/Projects/Old')])]);
			render();

			const listId = folderInput().getAttribute('list');
			expect(listId).toBeTruthy();
			const options = [...document.querySelectorAll<HTMLOptionElement>(`datalist#${listId} option`)].map((o) => o.value);
			expect(options).toEqual(['Archive', 'Projects', 'Projects/Old']);
		});

		it('marks a folder that is not in the tree as missing, case-insensitively, skipping dot folders', () => {
			vaultStore.open('/vault');
			fsStore.setFileTree([dir('/vault/Archive')]);
			autoOrganizeStore.setExcludedFolders(['Old Notes', 'archive', '.kokobrain']);
			render();

			expect(chips()).toEqual(['Old Notes missing', 'archive', '.kokobrain']);
		});

		it('marks nothing while the tree is empty', () => {
			vaultStore.open('/vault');
			autoOrganizeStore.setExcludedFolders(['Old Notes']);
			render();

			expect(chips()).toEqual(['Old Notes']);
		});

		it('shows a placeholder and an empty line with no excluded folder', () => {
			render();
			expect(folderInput().placeholder).toBe('e.g. _templates');
			expect(text()).toContain('No excluded folders');

			addFolder('Archive');
			expect(text()).not.toContain('No excluded folders');
		});
	});

	describe('focus', () => {
		const RULE: AutoOrganizeRule = { id: 'r1', name: 'Archive', expression: '', destination: 'Archive', enabled: true };

		async function settle() {
			for (let i = 0; i < 3; i++) {
				await tick();
				flushSync();
			}
		}

		/** The inputs named `name`, in document order. */
		const named = (name: string) => [...document.querySelectorAll<HTMLInputElement>(`input[aria-label="${name}"]`)];

		it('moves no focus when the section mounts its rules', async () => {
			autoOrganizeStore.setConfig({ rules: [RULE, { ...RULE, id: 'r2', properties: [{ key: 'a', value: '1', mode: 'always' }] }], excludedFolders: [] });
			render();
			await settle();

			expect(named('Rule name')).toHaveLength(2);
			expect(document.activeElement).toBe(document.body);
		});

		it('focuses the name of the rule "Add rule" adds', async () => {
			autoOrganizeStore.setConfig({ rules: [RULE], excludedFolders: [] });
			render();

			button('Add rule').click();
			await settle();

			const names = named('Rule name');
			expect(names).toHaveLength(2);
			expect(document.activeElement).toBe(names[1]);
		});

		it('focuses the key of the row "Add property" adds', async () => {
			autoOrganizeStore.setConfig({ rules: [{ ...RULE, properties: [{ key: 'a', value: '1', mode: 'always' }] }], excludedFolders: [] });
			render();

			button('Add property').click();
			await settle();

			const keys = named('Property key');
			expect(keys).toHaveLength(2);
			expect(document.activeElement).toBe(keys[1]);
		});

		it('focuses the key of the row "Add note property" adds', async () => {
			autoOrganizeStore.setConfig({ rules: [{ ...RULE, createNote: { path: 'a.md' } }], excludedFolders: [] });
			render();

			button('Add note property').click();
			await settle();

			const keys = named('Property key');
			expect(keys).toHaveLength(1);
			expect(document.activeElement).toBe(keys[0]);
		});

		it('focuses the input of the row "Add expression" adds', async () => {
			autoOrganizeStore.setConfig({ rules: [{ ...RULE, expression: 'file.hasTag("a")' }], excludedFolders: [] });
			render();

			button('Add expression').click();
			await settle();

			const inputs = [...document.querySelectorAll<HTMLInputElement>('[data-rule-filter] input[placeholder="Expression..."]')];
			expect(inputs).toHaveLength(2);
			expect(document.activeElement).toBe(inputs[1]);
		});
	});
});
