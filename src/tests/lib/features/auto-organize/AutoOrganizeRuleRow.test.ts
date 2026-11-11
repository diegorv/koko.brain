// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import AutoOrganizeRuleRow from '#lib/features/auto-organize/AutoOrganizeRuleRow.svelte';
import type { AutoOrganizeRule } from '#lib/features/auto-organize/auto-organize.types.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import Harness from '../../../fixtures/AutoOrganizeRuleRowHarness.svelte';

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

const RULE: AutoOrganizeRule = {
	id: 'r1',
	name: 'Archive',
	expression: '',
	destination: 'Archive',
	enabled: true,
	icon: { iconPack: 'lucide', iconName: 'star', color: '#ef4444' },
};

describe('AutoOrganizeRuleRow icon picker', () => {
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	async function openPicker() {
		const onupdate = vi.fn();
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(AutoOrganizeRuleRow, {
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

const BLANK: AutoOrganizeRule = { id: 'r1', name: 'Rule', expression: '', destination: '', enabled: false };

describe('AutoOrganizeRuleRow consequences', () => {
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
	async function render(rule: AutoOrganizeRule) {
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

	function filterBox(): HTMLElement {
		return document.querySelector<HTMLElement>('[data-rule-filter]')!;
	}

	/** The value inputs of the builder's visual rows, in order. */
	function valueInputs(): HTMLInputElement[] {
		return [...filterBox().querySelectorAll<HTMLInputElement>('input[placeholder="Value..."]')];
	}

	/** The builder's raw-expression inputs, in order. */
	function rawInputs(): HTMLInputElement[] {
		return [...filterBox().querySelectorAll<HTMLInputElement>('input[placeholder="Expression..."]')];
	}

	/** A synthetic click (detail 0, the keyboard path in bits-ui) opens the menu; then the item is picked. */
	async function pickMenuItem(trigger: HTMLElement, text: string) {
		trigger.click();
		await settle();
		const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) => el.textContent?.trim() === text);
		if (!item) throw new Error(`menu item "${text}" not found`);
		item.click();
		await settle();
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

			button('Delete row').click();
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
			expect(document.querySelector('[data-refused-key]')?.textContent).toContain('never sets or removes');
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

		it('saves a remove row without a value and shows no value field', async () => {
			const onupdate = await render({ ...BLANK, properties: [{ key: 'status', value: 'done', mode: 'always' }] });

			await choose(propertyRows()[0], 'Property mode', 'remove');

			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: 'status', mode: 'remove' }] });
			expect(propertyRows()[0].querySelector('[aria-label="Property value"]')).toBeNull();
			expect(propertyRows()[0].querySelector('[aria-label="Property type"]')).toBeNull();
		});

		it('keeps a remove row on a lifecycle key without a value when the key is renamed', async () => {
			const onupdate = await render({ ...BLANK, properties: [{ key: 'status', mode: 'remove' }] });

			commit(field(propertyRows()[0], 'Property key'), '_archived');
			await settle();

			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: '_archived', mode: 'remove' }] });
			expect(propertyRows()[0].querySelector('[aria-label="Property value"]')).toBeNull();
		});

		it('gives a remove row a value again when it goes back to always', async () => {
			const onupdate = await render({ ...BLANK, properties: [{ key: '_archived', mode: 'remove' }] });

			await choose(propertyRows()[0], 'Property mode', 'always');

			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: '_archived', value: false, mode: 'always' }] });
		});

		it('turns a text value into list items when the row becomes add to list', async () => {
			const onupdate = await render({ ...BLANK, properties: [{ key: 'tags', value: 'work', mode: 'always' }] });

			await choose(propertyRows()[0], 'Property mode', 'add to list');

			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: 'tags', value: ['work'], mode: 'add' }] });
			expect(field(propertyRows()[0], 'Property value').value).toBe('work');
		});

		it('turns an empty add row back into an editable text value when it goes to always', async () => {
			const onupdate = await render({ ...BLANK, properties: [{ key: 'tags', value: [], mode: 'add' }] });

			await choose(propertyRows()[0], 'Property mode', 'always');

			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: 'tags', value: '', mode: 'always' }] });
			expect(field(propertyRows()[0], 'Property value').disabled).toBe(false);
		});

		it('turns a one-item add row back into its text when it goes to if missing', async () => {
			const onupdate = await render({ ...BLANK, properties: [{ key: 'tags', value: ['work'], mode: 'add' }] });

			await choose(propertyRows()[0], 'Property mode', 'if missing');

			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: 'tags', value: 'work', mode: 'if-missing' }] });
			expect(field(propertyRows()[0], 'Property value').value).toBe('work');
		});

		it('does not offer add to list on a lifecycle key', async () => {
			await render({ ...BLANK, properties: [{ key: '_archived', value: false, mode: 'always' }] });
			const trigger = propertyRows()[0].querySelector<HTMLElement>('[data-slot="select-trigger"][aria-label="Property mode"]')!;
			trigger.focus();
			trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
			flushSync();

			const options = await vi.waitFor(() => {
				const found = [...document.querySelectorAll<HTMLElement>('[role="option"]')].map((o) => o.textContent?.trim());
				if (!found.includes('remove')) throw new Error('mode menu not open');
				return found;
			});
			expect(options).not.toContain('add to list');
		});

		it('turns an add row renamed to a lifecycle key into an if missing yes/no', async () => {
			const onupdate = await render({ ...BLANK, properties: [{ key: 'tags', value: ['work'], mode: 'add' }] });

			commit(field(propertyRows()[0], 'Property key'), '_archived');
			await settle();

			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: '_archived', value: false, mode: 'if-missing' }] });
			expect(propertyRows()[0].querySelector('[aria-label="Property value"][role="switch"]')).not.toBeNull();
		});

		it('saves comma-separated add items as a list, trimmed and without blanks', async () => {
			const onupdate = await render({ ...BLANK, properties: [{ key: 'tags', value: ['a'], mode: 'add' }] });
			const items = field(propertyRows()[0], 'Property value');
			expect(items.disabled).toBe(false);

			commit(items, 'work, , home ');

			expect(onupdate).toHaveBeenLastCalledWith('r1', { properties: [{ key: 'tags', value: ['work', 'home'], mode: 'add' }] });
			expect(field(propertyRows()[0], 'Property value').value).toBe('work, home');
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

	describe('filter builder', () => {
		const COMPLEX = '(status == "done" && _type == "project") || file.hasTag("archive")';

		it('adding two rows in an "any" group saves { or: [..] }', async () => {
			const onupdate = await render(BLANK);

			button('Add filter').click();
			await settle();
			commit(valueInputs()[0], 'Alpha');
			button('Add filter').click();
			await settle();
			commit(valueInputs()[1], 'Beta');
			await pickMenuItem(button('All the following are true'), 'Any of the following are true');

			expect(onupdate).toHaveBeenLastCalledWith('r1', { expression: { or: ["file.name == 'Alpha'", "file.name == 'Beta'"] } });
		});

		it('adds an expression row and saves what is typed in it', async () => {
			const onupdate = await render(BLANK);

			button('Add expression').click();
			await settle();
			expect(rawInputs().map((i) => i.value)).toEqual(['']);
			expect(onupdate).not.toHaveBeenCalled();

			commit(rawInputs()[0], "file.hasTag('x')");
			expect(onupdate).toHaveBeenLastCalledWith('r1', { expression: "file.hasTag('x')" });
		});

		it('adds an expression row to the first group', async () => {
			const onupdate = await render({ ...BLANK, expression: { or: ["status == 'done'", "status == 'dropped'"] } });

			button('Add expression').click();
			await settle();
			commit(rawInputs()[0], "file.hasTag('x')");

			expect(onupdate).toHaveBeenLastCalledWith('r1', {
				expression: { or: ["status == 'done'", "status == 'dropped'", "file.hasTag('x')"] },
			});
		});

		it('saves a row only once it has a value, and says so', async () => {
			const onupdate = await render(BLANK);

			button('Add filter').click();
			await settle();

			expect(onupdate).not.toHaveBeenCalled();
			expect(document.querySelector('[data-rule-filter-error]')?.textContent).toContain('Every filter needs a value');
			expect(matchCount()).toBeNull();

			commit(valueInputs()[0], 'Alpha');
			expect(onupdate).toHaveBeenLastCalledWith('r1', { expression: "file.name == 'Alpha'" });
			expect(document.querySelector('[data-rule-filter-error]')).toBeNull();
		});

		it('saves a value on change, not on every keystroke', async () => {
			const onupdate = await render({ ...BLANK, expression: "status == 'done'" });

			type(valueInputs()[0], 'dro');
			type(valueInputs()[0], 'dropped');
			expect(onupdate).not.toHaveBeenCalled();
			valueInputs()[0].dispatchEvent(new Event('change', { bubbles: true }));
			flushSync();

			expect(onupdate).toHaveBeenCalledTimes(1);
			expect(onupdate).toHaveBeenLastCalledWith('r1', { expression: "status == 'dropped'" });
		});

		it('shows a stored string as one row', async () => {
			setIndex(buildNoteRecord(`${VAULT}/a.md`, '---\nstatus: done\n---\n'));
			await render({ ...BLANK, expression: "status == 'done'" });

			expect(valueInputs().map((i) => i.value)).toEqual(['done']);
			expect(rawInputs()).toEqual([]);
			expect(button('status')).toBeTruthy();
		});

		it('shows a stored object filter as its groups', async () => {
			await render({ ...BLANK, expression: { or: ["status == 'done'", "status == 'dropped'"] } });

			expect(button('Any of the following are true')).toBeTruthy();
			expect(valueInputs().map((i) => i.value)).toEqual(['done', 'dropped']);
		});

		it('shows an empty filter as no rows', async () => {
			await render(BLANK);

			expect(valueInputs()).toEqual([]);
			expect(rawInputs()).toEqual([]);
		});

		it('shows a complex string as a raw row and saves it back unchanged', async () => {
			const onupdate = await render({ ...BLANK, expression: COMPLEX });

			expect(rawInputs().map((i) => i.value)).toEqual([COMPLEX]);
			expect(valueInputs()).toEqual([]);

			button('Add filter').click();
			await settle();
			commit(valueInputs()[0], 'x');
			expect(onupdate).toHaveBeenLastCalledWith('r1', { expression: { and: [COMPLEX, "file.name == 'x'"] } });

			// The new row's remove button is the last icon-only button in the builder.
			const removes = [...filterBox().querySelectorAll<HTMLButtonElement>('button')].filter((b) => b.textContent?.trim() === '' && b.querySelector('svg'));
			removes[removes.length - 1].click();
			await settle();
			expect(onupdate).toHaveBeenLastCalledWith('r1', { expression: COMPLEX });
		});

		it('saves an empty builder as an empty string', async () => {
			const onupdate = await render({ ...BLANK, expression: "status == 'done'" });

			const remove = [...filterBox().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === '' && b.querySelector('svg'))!;
			remove.click();
			await settle();

			expect(onupdate).toHaveBeenLastCalledWith('r1', { expression: '' });
		});

		it('shows the parse error of a raw row while typing', async () => {
			await render({ ...BLANK, expression: COMPLEX });

			type(rawInputs()[0], "status == 'do");

			expect(filterBox().textContent).toMatch(/Unterminated|Expected|Unexpected/i);
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

		it('counts an object filter', async () => {
			setIndex(done(), open());
			await render({ ...BLANK, expression: { or: ["status == 'done'", "status == 'open'"] } });

			expect(matchCount()).toBe('Matches 2 notes now');
		});

		it('shows 0 for an empty filter', async () => {
			setIndex(done(), open());
			await render(BLANK);

			expect(matchCount()).toBe('Matches 0 notes now');
		});

		it('hides the previous count while the typed filter is not counted yet, then counts it', async () => {
			setIndex(done(), open());
			await render({ ...BLANK, expression: "status == 'done'" });

			type(valueInputs()[0], 'open');
			expect(matchCount()).toBeNull();

			await vi.waitFor(() => expect(matchCount()).toBe('Matches 1 note now'));
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
