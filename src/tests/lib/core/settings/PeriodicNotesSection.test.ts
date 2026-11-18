// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import dayjs from 'dayjs';

import PeriodicNotesSection from '#lib/core/settings/sections/PeriodicNotesSection.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { buildPeriodicNotePath } from '#lib/plugins/periodic-notes/periodic-notes.logic.js';

describe('PeriodicNotesSection', () => {
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	function render(): HTMLElement {
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(PeriodicNotesSection, { target });
		flushSync();
		return target;
	}

	function autoPin(root: HTMLElement): HTMLButtonElement | null {
		return root.querySelector<HTMLButtonElement>('[role="switch"][aria-label="Auto-pin"]');
	}

	it('disables Auto-pin while Auto-open is off and enables it once Auto-open is on', () => {
		settingsStore.updatePeriodicNotes({ daily: { autoOpen: false, autoPin: false } });
		const root = render();

		expect(autoPin(root)).not.toBeNull();
		expect(autoPin(root)!.disabled).toBe(true);

		settingsStore.updatePeriodicNotes({ daily: { autoOpen: true } });
		flushSync();

		expect(autoPin(root)!.disabled).toBe(false);
		expect(settingsStore.periodicNotes.daily.autoPin).toBe(false);
	});

	it('keeps a stored-on Auto-pin enabled so it can be turned off, then disables it', () => {
		settingsStore.updatePeriodicNotes({ daily: { autoOpen: false, autoPin: true } });
		const root = render();

		expect(autoPin(root)!.disabled).toBe(false);
		expect(autoPin(root)!.getAttribute('aria-checked')).toBe('true');

		autoPin(root)!.click();
		flushSync();

		expect(settingsStore.periodicNotes.daily.autoPin).toBe(false);
		expect(autoPin(root)!.disabled).toBe(true);
	});

	it('does not change the stored Auto-pin when Auto-open flips', () => {
		settingsStore.updatePeriodicNotes({ daily: { autoOpen: true, autoPin: true } });
		const root = render();

		const autoOpenRow = [...root.querySelectorAll<HTMLElement>('.bg-setting-item-bg')].find(
			(r) => r.querySelector('span')?.textContent?.trim() === 'Auto-open',
		)!;
		autoOpenRow.querySelector<HTMLButtonElement>('[role="switch"]')!.click();
		flushSync();

		expect(settingsStore.periodicNotes.daily.autoOpen).toBe(false);
		expect(settingsStore.periodicNotes.daily.autoPin).toBe(true);
		expect(autoPin(root)!.disabled).toBe(false);
	});
});

describe('PeriodicNotesSection - path examples and missing templates', () => {
	let component: Record<string, unknown> | null = null;

	const tree: FileTreeNode[] = [
		{
			name: 'Templates',
			path: '/vault/Templates',
			isDirectory: true,
			children: [{ name: 'Daily.md', path: '/vault/Templates/Daily.md', isDirectory: false }],
		},
	];

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
		fsStore.reset();
		vaultStore._reset();
		vi.useRealTimers();
	});

	function render(): HTMLElement {
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(PeriodicNotesSection, { target });
		flushSync();
		return target;
	}

	/** The daily row with this label (the daily rows come before the other periods). */
	function dailyRow(root: HTMLElement, label: string): HTMLElement {
		const row = [...root.querySelectorAll<HTMLElement>('.bg-setting-item-bg')].find(
			(r) => r.querySelector('span')?.textContent?.trim() === label,
		);
		if (!row) throw new Error(`row ${label} not rendered`);
		return row;
	}

	function example(root: HTMLElement, period: string): string | undefined {
		return root.querySelector(`[data-periodic-example="${period}"]`)?.textContent?.trim();
	}

	function missing(root: HTMLElement, period: string): string | undefined {
		return root.querySelector(`[data-template-missing="${period}"]`)?.textContent?.trim();
	}

	function type(input: HTMLInputElement, value: string) {
		input.value = value;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	function fakeToday() {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(2026, 10, 18, 9, 30, 0));
	}

	it('stacks the Format and Template path rows', () => {
		const root = render();
		expect(dailyRow(root, 'Format').className).toContain('flex-col');
		expect(dailyRow(root, 'Template path').className).toContain('flex-col');
		const stacked = [...root.querySelectorAll<HTMLElement>('.bg-setting-item-bg.flex-col')].map((r) => r.querySelector('span')?.textContent?.trim());
		expect(stacked).toEqual(Array.from({ length: 5 }, () => ['Format', 'Template path']).flat());
	});

	it('shows today\'s note path under the Format and follows edits', () => {
		fakeToday();
		settingsStore.updatePeriodicNotes({ folder: 'Daily', daily: { format: 'YYYY-MM-DD' } });
		const root = render();

		expect(example(root, 'daily')).toBe('Today: Daily/2026-11-18.md');

		type(dailyRow(root, 'Format').querySelector('input')!, 'YYYY/MM-MMM/DD');
		expect(settingsStore.periodicNotes.daily.format).toBe('YYYY/MM-MMM/DD');
		expect(example(root, 'daily')).toBe('Today: Daily/2026/11-Nov/18.md');
	});

	it('shows exactly the path a create opens, for every period', () => {
		fakeToday();
		const root = render();
		const { folder } = settingsStore.periodicNotes;
		for (const period of ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const) {
			const format = settingsStore.periodicNotes[period].format;
			const opened = buildPeriodicNotePath('', folder, format, dayjs()).slice(1);
			expect(example(root, period)).toBe(`Today: ${opened}`);
		}
	});

	it('shows the note name without a folder when the folder is empty', () => {
		fakeToday();
		settingsStore.updatePeriodicNotes({ folder: '', daily: { format: 'YYYY-MM-DD' } });
		const root = render();
		expect(example(root, 'daily')).toBe('Today: 2026-11-18.md');
	});

	it('shows the timestamp name a create makes when the format is empty', () => {
		fakeToday();
		settingsStore.updatePeriodicNotes({ folder: 'Daily', daily: { format: '' } });
		const root = render();
		expect(example(root, 'daily')).toMatch(/^Today: Daily\/2026-11-18T09:30:00[+-]\d\d:\d\d\.md$/);
		expect(example(root, 'daily')).toBe(`Today: ${buildPeriodicNotePath('', 'Daily', '', dayjs()).slice(1)}`);
	});

	it('marks a template path absent from the loaded tree as not found', () => {
		vaultStore.open('/vault');
		fsStore.setFileTree(tree);
		settingsStore.updatePeriodicNotes({ daily: { templatePath: 'Templates/Dialy.md' } });
		const root = render();
		expect(missing(root, 'daily')).toBe('File not found');

		type(dailyRow(root, 'Template path').querySelector('input')!, 'Templates/Daily.md');
		expect(missing(root, 'daily')).toBeUndefined();
	});

	it('shows no mark for an empty or dot-prefixed path', () => {
		vaultStore.open('/vault');
		fsStore.setFileTree(tree);
		settingsStore.updatePeriodicNotes({ daily: { templatePath: '' }, weekly: { templatePath: '.templates/Weekly.md' } });
		const root = render();
		expect(missing(root, 'daily')).toBeUndefined();
		expect(missing(root, 'weekly')).toBeUndefined();
		expect(missing(root, 'monthly')).toBe('File not found');
	});

	it('shows no mark with no vault open or an empty tree', () => {
		settingsStore.updatePeriodicNotes({ daily: { templatePath: 'Templates/Dialy.md' } });
		fsStore.setFileTree(tree);
		const root = render();
		expect(missing(root, 'daily')).toBeUndefined();

		fsStore.setFileTree([]);
		vaultStore.open('/vault');
		flushSync();
		expect(missing(root, 'daily')).toBeUndefined();

		fsStore.setFileTree(tree);
		flushSync();
		expect(missing(root, 'daily')).toBe('File not found');
	});

	it('links each Format input to its Today line for screen readers', () => {
		const root = render();
		for (const period of ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']) {
			const line = root.querySelector<HTMLElement>(`[data-periodic-example="${period}"]`)!;
			expect(line.id).not.toBe('');
			const input = root.querySelector<HTMLInputElement>(`input[aria-describedby="${line.id}"]`);
			expect(input?.value).toBe(settingsStore.periodicNotes[period as 'daily'].format);
		}
	});

	it('links the Template path input to its mark only while the file is missing', () => {
		vaultStore.open('/vault');
		fsStore.setFileTree(tree);
		settingsStore.updatePeriodicNotes({ daily: { templatePath: 'Templates/Dialy.md' } });
		const root = render();
		const input = dailyRow(root, 'Template path').querySelector('input')!;
		const mark = root.querySelector<HTMLElement>('[data-template-missing="daily"]')!;
		expect(mark.id).not.toBe('');
		expect(input.getAttribute('aria-describedby')).toBe(mark.id);

		type(input, 'Templates/Daily.md');
		expect(input.hasAttribute('aria-describedby')).toBe(false);
	});

	it('leaves the periodic notes settings unchanged by rendering', () => {
		fakeToday();
		vaultStore.open('/vault');
		fsStore.setFileTree(tree);
		settingsStore.updatePeriodicNotes({ daily: { format: '', templatePath: 'Templates/Dialy.md' } });
		const before = JSON.stringify(settingsStore.periodicNotes);
		render();
		expect(JSON.stringify(settingsStore.periodicNotes)).toBe(before);
	});
});
