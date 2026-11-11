// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import AutoMoveRuleRow from '#lib/features/auto-move/AutoMoveRuleRow.svelte';
import type { AutoMoveRule } from '#lib/features/auto-move/auto-move.types.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import Harness from '../../../fixtures/AutoMoveRuleRowHarness.svelte';

// The icon grid's bits-ui ScrollArea observes its size; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;
// jsdom lacks the pointer-capture and scroll APIs the Select calls when it opens.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

function dialogContent(): HTMLElement | null {
	return document.querySelector<HTMLElement>('[data-slot="dialog-content"]');
}

const RULE: AutoMoveRule = {
	id: 'r1',
	name: 'Archive',
	expression: '',
	destination: 'Archive',
	enabled: true,
	icon: { iconPack: 'lucide', iconName: 'star', color: '#ef4444' },
};

describe('AutoMoveRuleRow icon picker', () => {
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	async function openPicker() {
		const onupdate = vi.fn();
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(AutoMoveRuleRow, {
			target,
			props: { rule: RULE, isFirst: true, isLast: true, onupdate, onremove: () => {}, onmoveup: () => {}, onmovedown: () => {} },
		});
		await settle();
		document.querySelector<HTMLButtonElement>('button[title="Icon: lucide:star"]')!.click();
		await settle();
		expect(dialogContent()!.textContent).toContain('Change icon');
		return onupdate;
	}

	it('saves a text color on the rule and keeps the picker open', async () => {
		const onupdate = await openPicker();

		document.querySelectorAll<HTMLButtonElement>('button[title="Green"]')[1].click();
		await settle();

		expect(onupdate).toHaveBeenCalledWith('r1', {
			icon: { iconPack: 'lucide', iconName: 'star', color: '#ef4444', textColor: '#22c55e' },
		});
		expect(dialogContent()?.dataset.state).toBe('open');
	});
});

const VAULT = '/vault';

const BLANK: AutoMoveRule = { id: 'r1', name: 'Rule', expression: '', destination: '', enabled: false };

describe('AutoMoveRuleRow consequences', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vaultStore.open(VAULT);
		collectionStore.reset();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		collectionStore.reset();
		vaultStore._reset();
	});

	/** Mounts the row on `rule`, its updates merged back into it like the store does. */
	async function render(rule: AutoMoveRule) {
		const onupdate = vi.fn();
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(Harness, { target, props: { initial: rule, onupdate } });
		await settle();
		return onupdate;
	}

	function button(label: string): HTMLButtonElement {
		const found = [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === label || b.title === label);
		if (!found) throw new Error(`no button ${label}`);
		return found;
	}

	function propertyRows(): HTMLElement[] {
		return [...document.querySelectorAll<HTMLElement>('[data-rule-property]')];
	}

	function field(row: HTMLElement, label: string): HTMLInputElement {
		const el = row.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
		if (!el) throw new Error(`no field ${label}`);
		return el;
	}

	function filterInput(): HTMLInputElement {
		return document.querySelector<HTMLInputElement>('input[aria-label="Filter"]')!;
	}

	/** Types `text` into `el` without leaving it. */
	function type(el: HTMLInputElement, text: string) {
		el.value = text;
		el.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	/** Types `text` into `el` and leaves it, which fires `change`. */
	function commit(el: HTMLInputElement, text: string) {
		type(el, text);
		el.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();
	}

	/** Opens the Select labelled `label` in `row` and picks `option`. */
	async function choose(row: HTMLElement, label: string, option: string) {
		const trigger = row.querySelector<HTMLElement>(`[data-slot="select-trigger"][aria-label="${label}"]`)!;
		trigger.focus();
		trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		flushSync();
		const item = await vi.waitFor(() => {
			const found = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((o) => o.textContent?.trim() === option);
			if (!found) throw new Error(`no option ${option}`);
			return found;
		});
		item.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerType: 'mouse' }));
		item.click();
		await settle();
	}

	function setIndex(...records: PropertyIndexRecord[]) {
		collectionStore.setPropertyIndex(new Map(records.map((r) => [r.path, r])));
		flushSync();
	}

	const matchCount = () => document.querySelector('[data-match-count]')?.textContent?.trim() ?? null;
	const hint = () => document.querySelector('[data-rule-hint]');

	describe('Set properties', () => {
		it('adds a property row and saves its key, value and mode', async () => {
			const onupdate = await render(BLANK);

			button('Add property').click();
			await settle();
			const [row] = propertyRows();
			commit(field(row, 'Property key'), 'status');
			commit(field(row, 'Property value'), 'done');
			await choose(row, 'Property mode', 'always');

			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: 'status', value: 'done', mode: 'always' }] });
		});

		it('starts a new row as if-missing with an empty text value', async () => {
			const onupdate = await render(BLANK);

			button('Add property').click();
			await settle();

			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: '', value: '', mode: 'if-missing' }] });
			expect(propertyRows()[0].querySelector('[aria-label="Property mode"]')!.textContent).toContain('if missing');
		});

		it('removes a row', async () => {
			const onupdate = await render({ ...BLANK, properties: [
				{ key: 'a', value: '1', mode: 'always' },
				{ key: 'b', value: '2', mode: 'always' },
			] });

			button('Remove property').click();
			await settle();

			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: 'b', value: '2', mode: 'always' }] });
			expect(propertyRows()).toHaveLength(1);
			expect(field(propertyRows()[0], 'Property key').value).toBe('b');
		});

		it('edits a row value on change, not on every keystroke', async () => {
			const onupdate = await render({ ...BLANK, properties: [{ key: 'status', value: 'open', mode: 'if-missing' }] });
			const value = field(propertyRows()[0], 'Property value');

			type(value, 'do');
			expect(onupdate).not.toHaveBeenCalled();
			commit(value, 'done');

			expect(onupdate).toHaveBeenCalledTimes(1);
			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: 'status', value: 'done', mode: 'if-missing' }] });
		});

		it('saves a key on change, not on every keystroke', async () => {
			const onupdate = await render({ ...BLANK, properties: [{ key: '', value: 'x', mode: 'always' }] });
			const key = field(propertyRows()[0], 'Property key');

			type(key, 'sta');
			expect(onupdate).not.toHaveBeenCalled();
			commit(key, ' status ');

			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: 'status', value: 'x', mode: 'always' }] });
		});

		it('suggests the known note properties for the key, without file.* fields', async () => {
			setIndex(buildNoteRecord(`${VAULT}/a.md`, '---\nstatus: done\nproject: x\n---\n'));
			await render({ ...BLANK, properties: [{ key: '', value: '', mode: 'always' }] });

			const list = field(propertyRows()[0], 'Property key').getAttribute('list')!;
			const options = [...document.getElementById(list)!.querySelectorAll('option')].map((o) => o.value);
			expect(options).toContain('status');
			expect(options).toContain('project');
			expect(options.some((o) => o.startsWith('file.'))).toBe(false);
		});

		it('does not suggest the refused key todoist_project', async () => {
			setIndex(buildNoteRecord(`${VAULT}/a.md`, '---\nstatus: done\ntodoist_project: Work\n---\n'));
			await render({ ...BLANK, properties: [{ key: '', value: '', mode: 'always' }] });

			const list = field(propertyRows()[0], 'Property key').getAttribute('list')!;
			const options = [...document.getElementById(list)!.querySelectorAll('option')].map((o) => o.value);
			expect(options).toContain('status');
			expect(options).not.toContain('todoist_project');
		});

		it('notes that a rule never sets todoist_project', async () => {
			await render({ ...BLANK, properties: [{ key: '', value: '', mode: 'always' }] });
			expect(document.querySelector('[data-refused-key]')).toBeNull();

			commit(field(propertyRows()[0], 'Property key'), 'todoist_project');
			await settle();

			expect(document.querySelector('[data-refused-key]')?.textContent).toContain('todoist_project');
		});

		it('resets a yes/no value when the key is renamed to _icon, so the icon picker shows', async () => {
			const onupdate = await render({ ...BLANK, properties: [{ key: '_archived', value: false, mode: 'always' }] });

			commit(field(propertyRows()[0], 'Property key'), '_icon');
			await settle();

			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: '_icon', value: '', mode: 'always' }] });
			expect(button('Pick icon')).toBeTruthy();
		});

		it('shows a yes/no toggle (the Settings Switch) for _archived and saves a boolean', async () => {
			const onupdate = await render({ ...BLANK, properties: [{ key: '', value: '', mode: 'if-missing' }] });

			commit(field(propertyRows()[0], 'Property key'), '_archived');
			await settle();
			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: '_archived', value: false, mode: 'if-missing' }] });

			const checkbox = propertyRows()[0].querySelector<HTMLElement>('[aria-label="Property value"][role="switch"]')!;
			expect(checkbox.getAttribute('aria-checked')).toBe('false');
			checkbox.click();
			await settle();

			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: '_archived', value: true, mode: 'if-missing' }] });
			expect(checkbox.getAttribute('aria-checked')).toBe('true');
		});

		it('switches a row to yes/no and saves a boolean', async () => {
			const onupdate = await render({ ...BLANK, properties: [{ key: 'pinned', value: 'x', mode: 'always' }] });

			await choose(propertyRows()[0], 'Property type', 'Yes/no');

			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: 'pinned', value: false, mode: 'always' }] });
			expect(propertyRows()[0].querySelector('[aria-label="Property value"][role="switch"]')).not.toBeNull();
		});

		it('keeps the value when the row type is picked again', async () => {
			const onupdate = await render({ ...BLANK, properties: [{ key: 'status', value: 'done', mode: 'always' }] });

			await choose(propertyRows()[0], 'Property type', 'Text');

			expect(onupdate).not.toHaveBeenCalled();
			expect(field(propertyRows()[0], 'Property value').value).toBe('done');
		});

		it('shows a number or list read-only, to be edited in the JSON', async () => {
			await render({ ...BLANK, properties: [{ key: 'priority', value: 2, mode: 'always' }] });

			const value = field(propertyRows()[0], 'Property value');
			expect(value.disabled).toBe(true);
			expect(value.value).toBe('2');
		});

		it('opens the icon picker for _icon and saves its choice as pack:name', { timeout: 15_000 }, async () => {
			const onupdate = await render({ ...BLANK, properties: [{ key: '', value: '', mode: 'always' }] });

			commit(field(propertyRows()[0], 'Property key'), '_icon');
			await settle();
			button('Pick icon').click();
			await settle();
			expect(document.querySelector('[data-slot="dialog-content"]')!.textContent).toContain('Change icon');

			button('Lucide').click();
			const search = document.querySelector<HTMLInputElement>('input[placeholder="Search icons..."]')!;
			type(search, 'star');
			const star = await vi.waitFor(() => {
				flushSync();
				const found = document.querySelector<HTMLElement>('button[title="star (lucide)"]');
				if (!found) throw new Error('star not rendered');
				return found;
			}, { timeout: 10_000 });
			star.click();
			await settle();

			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: '_icon', value: 'lucide:star', mode: 'always' }] });
		});

		it('sets _color from the picker color controls', async () => {
			const onupdate = await render({ ...BLANK, properties: [{ key: '_color', value: '', mode: 'always' }] });

			button('Pick color').click();
			await settle();
			document.querySelectorAll<HTMLButtonElement>('button[title="Red"]')[0].click();
			await settle();

			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: '_color', value: '#ef4444', mode: 'always' }] });
		});

		it('sets _title_color from the picker text color controls', async () => {
			const onupdate = await render({ ...BLANK, properties: [{ key: '_title_color', value: '', mode: 'always' }] });

			button('Pick color').click();
			await settle();
			document.querySelectorAll<HTMLButtonElement>('button[title="Blue"]')[1].click();
			await settle();

			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: '_title_color', value: '#3b82f6', mode: 'always' }] });
		});
	});

	describe('filter', () => {
		it('does not save while typing, only on change', async () => {
			const onupdate = await render(BLANK);

			type(filterInput(), "status == 'do");
			type(filterInput(), "status == 'done'");
			expect(onupdate).not.toHaveBeenCalled();

			filterInput().dispatchEvent(new Event('change', { bubbles: true }));
			flushSync();

			expect(onupdate).toHaveBeenCalledTimes(1);
			expect(onupdate).toHaveBeenLastCalledWith('r1', { expression: "status == 'done'" });
		});

		it('shows the parse error while typing', async () => {
			await render(BLANK);

			type(filterInput(), "status == 'do");

			expect(document.body.textContent).toMatch(/Unterminated|Expected|Unexpected/i);
			expect(matchCount()).toBeNull();
		});
	});

	describe('match count', () => {
		const done = () => buildNoteRecord(`${VAULT}/a.md`, '---\nstatus: done\n---\n');
		const open = () => buildNoteRecord(`${VAULT}/b.md`, '---\nstatus: open\n---\n');

		it('shows how many index records the filter matches', async () => {
			setIndex(done(), open());
			await render({ ...BLANK, expression: "status == 'done'" });

			expect(matchCount()).toBe('Matches 1 note now');
		});

		it('shows 0 for an empty filter', async () => {
			setIndex(done(), open());
			await render(BLANK);

			expect(matchCount()).toBe('Matches 0 notes now');
		});

		it('counts a typed filter once the user stops typing', async () => {
			setIndex(done(), open());
			await render(BLANK);

			type(filterInput(), 'status != null');

			await vi.waitFor(() => expect(matchCount()).toBe('Matches 2 notes now'));
		});

		it('hides the previous count while the typed filter is not counted yet', async () => {
			setIndex(done(), open());
			await render({ ...BLANK, expression: "status == 'done'" });

			type(filterInput(), 'status != null');
			expect(matchCount()).toBeNull();

			await vi.waitFor(() => expect(matchCount()).toBe('Matches 2 notes now'));
		});
	});

	describe('does-nothing hint', () => {
		it('shows for a rule with no destination and no properties', async () => {
			await render(BLANK);

			expect(hint()?.textContent).toContain('does nothing');
		});

		it('hides once the rule has a destination', async () => {
			await render({ ...BLANK, destination: 'Archive' });

			expect(hint()).toBeNull();
		});

		it('hides once the rule has a property with a key', async () => {
			await render({ ...BLANK, properties: [{ key: 'status', value: 'done', mode: 'always' }] });

			expect(hint()).toBeNull();
		});

		it('still shows while the only property row has no key', async () => {
			await render({ ...BLANK, properties: [{ key: '', value: '', mode: 'always' }] });

			expect(hint()).not.toBeNull();
		});
	});
});
