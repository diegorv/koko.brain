// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import OneOnOneSection from '#lib/core/settings/sections/OneOnOneSection.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { ONE_ON_ONE_EVERY_PROPERTY } from '#lib/plugins/one-on-one/one-on-one.logic.js';

// No Tauri call in this tree: the real settings store is read back after real DOM events.
describe('OneOnOneSection - 1:1 due after', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		settingsStore.reset();
		target = document.body.appendChild(document.createElement('div'));
		component = mount(OneOnOneSection, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	function dueInput(): HTMLInputElement {
		const input = target.querySelector<HTMLInputElement>('input[type="number"][data-one-on-one-due-after]');
		if (!input) throw new Error('due-after input not rendered');
		return input;
	}

	function type(raw: string) {
		const input = dueInput();
		input.value = raw;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	it('groups the rows under People, New notes and Reminders', () => {
		expect([...target.querySelectorAll('h3')].map((h) => h.textContent?.trim())).toEqual(['People', 'New notes', 'Reminders']);
		const text = target.textContent ?? '';
		const order = ['People', 'Work people folder', 'Personal people folder', 'New notes', 'Folder format', 'Filename format', 'Template path', 'Reminders', '1:1 due after (days)'].map((label) => text.indexOf(label));
		expect(order).not.toContain(-1);
		expect(order).toEqual([...order].sort((a, b) => a - b));
	});

	it('says at the top that a person in the work people folder is listed in My people by _one_on_one_every', () => {
		const intro = target.querySelector<HTMLElement>('[data-one-on-one-intro]');
		expect(intro?.textContent).toContain(ONE_ON_ONE_EVERY_PROPERTY);
		expect(intro?.textContent).toContain('Work/_people');
		expect(intro?.textContent).toContain('My people');
		expect(intro?.compareDocumentPosition(target.querySelector('h3')!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

		settingsStore.updateOneOnOne({ workPeopleFolder: 'Team' });
		flushSync();
		expect(intro?.textContent).toContain('Team');

		settingsStore.updateOneOnOne({ workPeopleFolder: '' });
		flushSync();
		expect(intro?.textContent).toContain('A person in the work people folder is listed');
	});

	it('shows the default of 14 days', () => {
		expect(dueInput().value).toBe('14');
		expect(target.textContent).toContain('1:1 due after (days)');
	});

	it('writes a typed number of days to the store', () => {
		type('7');
		expect(settingsStore.oneOnOne.dueAfterDays).toBe(7);
	});

	it('keeps whole, non-negative days', () => {
		type('2.6');
		expect(settingsStore.oneOnOne.dueAfterDays).toBe(2);
		type('-3');
		expect(settingsStore.oneOnOne.dueAfterDays).toBe(0);
	});

	it('leaves the store untouched while the field is empty', () => {
		type('');
		expect(settingsStore.oneOnOne.dueAfterDays).toBe(14);
	});
});

describe('OneOnOneSection - missing template mark', () => {
	let component: Record<string, unknown> | null = null;

	const tree: FileTreeNode[] = [
		{
			name: 'Templates',
			path: '/vault/Templates',
			isDirectory: true,
			children: [{ name: '1on1.md', path: '/vault/Templates/1on1.md', isDirectory: false }],
		},
	];

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
		fsStore.reset();
		vaultStore._reset();
	});

	function render(): HTMLElement {
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(OneOnOneSection, { target });
		flushSync();
		return target;
	}

	function templateRow(root: HTMLElement): HTMLElement {
		const row = [...root.querySelectorAll<HTMLElement>('.bg-setting-item-bg')].find(
			(r) => r.querySelector('span')?.textContent?.trim() === 'Template path',
		);
		if (!row) throw new Error('Template path row not rendered');
		return row;
	}

	const missing = (root: HTMLElement) => root.querySelector('[data-template-missing]')?.textContent?.trim();

	function type(value: string, root: HTMLElement) {
		const input = templateRow(root).querySelector('input')!;
		input.value = value;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	it('stacks the Template path row', () => {
		expect(templateRow(render()).className).toContain('flex-col');
	});

	it('marks a template path absent from the loaded tree as not found', () => {
		vaultStore.open('/vault');
		fsStore.setFileTree(tree);
		settingsStore.updateOneOnOne({ templatePath: 'Templates/1on.md' });
		const root = render();
		expect(missing(root)).toBe('File not found');

		type('Templates/1on1.md', root);
		expect(settingsStore.oneOnOne.templatePath).toBe('Templates/1on1.md');
		expect(missing(root)).toBeUndefined();
	});

	it('shows no mark for an empty or dot-prefixed path', () => {
		vaultStore.open('/vault');
		fsStore.setFileTree(tree);
		settingsStore.updateOneOnOne({ templatePath: undefined });
		const root = render();
		expect(missing(root)).toBeUndefined();

		type('.templates/1on1.md', root);
		expect(missing(root)).toBeUndefined();
	});

	it('shows no mark with no vault open or an empty tree', () => {
		settingsStore.updateOneOnOne({ templatePath: 'Templates/1on.md' });
		fsStore.setFileTree(tree);
		const root = render();
		expect(missing(root)).toBeUndefined();

		fsStore.setFileTree([]);
		vaultStore.open('/vault');
		flushSync();
		expect(missing(root)).toBeUndefined();

		fsStore.setFileTree(tree);
		flushSync();
		expect(missing(root)).toBe('File not found');
	});

	it('links the Template path input to its mark only while the file is missing', () => {
		vaultStore.open('/vault');
		fsStore.setFileTree(tree);
		settingsStore.updateOneOnOne({ templatePath: 'Templates/1on.md' });
		const root = render();
		const input = templateRow(root).querySelector('input')!;
		const mark = root.querySelector<HTMLElement>('[data-template-missing]')!;
		expect(mark.id).not.toBe('');
		expect(input.getAttribute('aria-describedby')).toBe(mark.id);

		type('Templates/1on1.md', root);
		expect(input.hasAttribute('aria-describedby')).toBe(false);
	});

	it('leaves the 1:1 settings unchanged by rendering', () => {
		vaultStore.open('/vault');
		fsStore.setFileTree(tree);
		settingsStore.updateOneOnOne({ templatePath: 'Templates/1on.md' });
		const before = JSON.stringify(settingsStore.oneOnOne);
		render();
		expect(JSON.stringify(settingsStore.oneOnOne)).toBe(before);
	});
});
