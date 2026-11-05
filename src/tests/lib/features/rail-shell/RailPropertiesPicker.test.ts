// @vitest-environment jsdom
// The "Show in note list" picker: the popover the rail header opens to choose
// and order the frontmatter keys shown under each note. The picker is driven
// through its props, so `onChange` receives the next key list the parent would
// save; these tests assert those arguments and the rendered rows.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import { reactiveProps } from '../../../fixtures/reactive-props.svelte';
import RailPropertiesPicker from '#lib/features/rail-shell/RailPropertiesPicker.svelte';

const AVAILABLE = ['budget', 'owner', 'priority', '_belongs_to'];

type Props = { available: string[]; selected: string[]; onChange?: (next: string[]) => void };

describe('RailPropertiesPicker', () => {
	let target: HTMLElement;
	const mounted: Record<string, unknown>[] = [];

	function render(props: Props) {
		const onChange = props.onChange ?? vi.fn();
		mounted.push(mount(RailPropertiesPicker, { target, props: { available: props.available, selected: props.selected, onChange } }));
		flushSync();
		return onChange;
	}

	const trigger = () => target.querySelector<HTMLButtonElement>('[data-note-list-properties]')!;
	const panel = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]');
	const search = () => document.querySelector<HTMLInputElement>('input[placeholder="Search properties..."]')!;
	const rows = () => [...document.querySelectorAll<HTMLElement>('[data-note-list-property-row]')];
	const rowKeys = () => rows().map((row) => row.getAttribute('data-note-list-property-row'));
	const checkbox = (key: string) =>
		document.querySelector<HTMLInputElement>(`[data-note-list-property-row="${key}"] input[type="checkbox"]`)!;
	const handle = (key: string) =>
		document.querySelector<HTMLElement>(`[data-note-list-property-row="${key}"] [data-note-list-property-handle]`);
	const handles = () => [...document.querySelectorAll<HTMLElement>('[data-note-list-property-handle]')];

	async function open() {
		trigger().click();
		await tick();
		flushSync();
	}

	function typeQuery(value: string) {
		search().value = value;
		search().dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	function keydown(el: Element, init: KeyboardEventInit) {
		el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
		flushSync();
	}

	function dragEvent(type: string, dataTransfer = stubDataTransfer()) {
		const event = new Event(type, { bubbles: true, cancelable: true });
		Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
		return event;
	}

	function stubDataTransfer() {
		return { setData: vi.fn(), getData: vi.fn(), effectAllowed: 'uninitialized', dropEffect: 'none' };
	}

	beforeEach(() => {
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		for (const c of mounted.splice(0)) unmount(c);
		document.body.innerHTML = '';
	});

	describe('trigger', () => {
		it('is labelled "Show in note list" and uses the inactive color with no selection', () => {
			render({ available: AVAILABLE, selected: [] });
			expect(trigger().getAttribute('title')).toBe('Show in note list');
			expect(trigger().getAttribute('aria-label')).toBe('Show in note list');
			expect(trigger().classList.contains('text-tab-text-inactive')).toBe(true);
			expect(trigger().classList.contains('text-tab-text-active')).toBe(false);
		});

		it('uses the active color when at least one key is selected', () => {
			render({ available: AVAILABLE, selected: ['owner'] });
			expect(trigger().classList.contains('text-tab-text-active')).toBe(true);
			expect(trigger().classList.contains('text-tab-text-inactive')).toBe(false);
		});

		it('opens the panel with the search input focused', async () => {
			render({ available: AVAILABLE, selected: [] });
			expect(panel()).toBeNull();
			await open();
			expect(panel()).not.toBeNull();
			expect(document.activeElement).toBe(search());
		});
	});

	describe('rows', () => {
		it('lists selected rows first in their saved order, then the other keys', async () => {
			render({ available: AVAILABLE, selected: ['priority', 'budget'] });
			await open();
			expect(rowKeys()).toEqual(['priority', 'budget', 'owner', '_belongs_to']);
			expect(rows().map((row) => row.getAttribute('data-selected'))).toEqual(['true', 'true', 'false', 'false']);
		});

		it('checks the checkboxes of selected rows only and labels them without leading underscores', async () => {
			render({ available: AVAILABLE, selected: ['priority', 'budget'] });
			await open();
			expect(checkbox('priority').checked).toBe(true);
			expect(checkbox('budget').checked).toBe(true);
			expect(checkbox('owner').checked).toBe(false);
			expect(checkbox('_belongs_to').checked).toBe(false);
			expect(checkbox('_belongs_to').getAttribute('aria-label')).toBe('belongs_to');
		});

		it('drops a selected key that no note offers, so no empty row shows', async () => {
			render({ available: ['budget'], selected: ['gone'] });
			await open();
			expect(rowKeys()).toEqual(['budget']);
			expect(checkbox('budget').checked).toBe(false);
		});

		it('shows the empty text when there are no keys to offer', async () => {
			render({ available: [], selected: [] });
			await open();
			expect(rows()).toHaveLength(0);
			expect(panel()?.textContent).toContain('No matching properties');
		});
	});

	describe('toggling', () => {
		it('ticking an unselected row appends it to the selection', async () => {
			const onChange = render({ available: AVAILABLE, selected: ['priority'] });
			await open();
			checkbox('owner').click();
			flushSync();
			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith(['priority', 'owner']);
		});

		it('unticking a selected row removes it from the selection', async () => {
			const onChange = render({ available: AVAILABLE, selected: ['priority', 'budget'] });
			await open();
			checkbox('priority').click();
			flushSync();
			expect(onChange).toHaveBeenCalledWith(['budget']);
		});
	});

	describe('filtering', () => {
		it('keeps only rows whose label contains the query, ignoring case', async () => {
			render({ available: AVAILABLE, selected: [] });
			await open();
			typeQuery('OW');
			expect(rowKeys()).toEqual(['owner']);
		});

		it('shows the empty text when nothing matches', async () => {
			render({ available: AVAILABLE, selected: [] });
			await open();
			typeQuery('zzz');
			expect(rows()).toHaveLength(0);
			expect(panel()?.textContent).toContain('No matching properties');
		});

		it('clears the query when the panel closes', async () => {
			render({ available: AVAILABLE, selected: [] });
			await open();
			typeQuery('own');
			expect(rowKeys()).toEqual(['owner']);

			keydown(search(), { key: 'Escape' });
			// The panel unmounts after its exit transition, so wait for it rather than checking at once.
			await vi.waitFor(() => expect(panel()).toBeNull());

			await open();
			expect(search().value).toBe('');
			expect(rowKeys()).toEqual(AVAILABLE);
		});
	});

	describe('drag handle', () => {
		it('renders a handle only on selected rows', async () => {
			render({ available: AVAILABLE, selected: ['priority', 'budget'] });
			await open();
			expect(handles()).toHaveLength(2);
			expect(handle('priority')).not.toBeNull();
			expect(handle('budget')).not.toBeNull();
			expect(handle('owner')).toBeNull();
			expect(handle('_belongs_to')).toBeNull();
		});

		it('renders no handle while a query is active', async () => {
			render({ available: AVAILABLE, selected: ['priority', 'budget'] });
			await open();
			typeQuery('pri');
			expect(rowKeys()).toEqual(['priority']);
			expect(handles()).toHaveLength(0);
		});

		it('dragging a handle onto another selected row reorders the selection', async () => {
			const onChange = render({ available: AVAILABLE, selected: ['priority', 'budget'] });
			await open();
			const dataTransfer = stubDataTransfer();
			handle('budget')!.dispatchEvent(dragEvent('dragstart', dataTransfer));
			const over = dragEvent('dragover', stubDataTransfer());
			handle('priority')!.closest('[data-note-list-property-row]')!.dispatchEvent(over);
			expect(over.defaultPrevented).toBe(true);
			handle('priority')!.closest('[data-note-list-property-row]')!.dispatchEvent(dragEvent('drop', stubDataTransfer()));
			flushSync();
			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith(['budget', 'priority']);
		});

		it('dropping on an unselected row changes nothing', async () => {
			const onChange = render({ available: AVAILABLE, selected: ['priority', 'budget'] });
			await open();
			handle('budget')!.dispatchEvent(dragEvent('dragstart'));
			const ownerRow = document.querySelector<HTMLElement>('[data-note-list-property-row="owner"]')!;
			ownerRow.dispatchEvent(dragEvent('dragover'));
			ownerRow.dispatchEvent(dragEvent('drop'));
			flushSync();
			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe('keyboard reorder', () => {
		it('Alt+ArrowUp moves a selected row one place up', async () => {
			const onChange = render({ available: AVAILABLE, selected: ['priority', 'budget'] });
			await open();
			keydown(checkbox('budget'), { key: 'ArrowUp', altKey: true });
			expect(onChange).toHaveBeenCalledWith(['budget', 'priority']);
		});

		it('Alt+ArrowDown moves a selected row one place down', async () => {
			const onChange = render({ available: AVAILABLE, selected: ['priority', 'budget', 'owner'] });
			await open();
			keydown(checkbox('priority'), { key: 'ArrowDown', altKey: true });
			expect(onChange).toHaveBeenCalledWith(['budget', 'priority', 'owner']);
		});

		it('Alt+ArrowUp on the first selected row does nothing', async () => {
			const onChange = render({ available: AVAILABLE, selected: ['priority', 'budget'] });
			await open();
			keydown(checkbox('priority'), { key: 'ArrowUp', altKey: true });
			expect(onChange).not.toHaveBeenCalled();
		});

		it('Alt+Arrow on an unselected row does nothing', async () => {
			const onChange = render({ available: AVAILABLE, selected: ['priority', 'budget'] });
			await open();
			keydown(checkbox('owner'), { key: 'ArrowUp', altKey: true });
			expect(onChange).not.toHaveBeenCalled();
		});

		it('Alt+Arrow does nothing while a query is active', async () => {
			const onChange = render({ available: AVAILABLE, selected: ['priority', 'budget'] });
			await open();
			typeQuery('bud');
			keydown(checkbox('budget'), { key: 'ArrowUp', altKey: true });
			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe('review regressions', () => {
		it('keeps focus on the moved checkbox after Alt+Arrow, so the next keystroke still moves it', async () => {
			const props = reactiveProps<Props & { onChange: (next: string[]) => void }>({
				available: AVAILABLE,
				selected: ['budget', 'owner', 'priority'],
				onChange: (next) => {
					props.selected = next;
				},
			});
			mounted.push(mount(RailPropertiesPicker, { target, props }));
			flushSync();
			await open();
			checkbox('owner').focus();
			keydown(checkbox('owner'), { key: 'ArrowDown', altKey: true });
			expect(props.selected).toEqual(['budget', 'priority', 'owner']);
			await vi.waitFor(() => expect(document.activeElement).toBe(checkbox('owner')));
		});

		it('drags with a private type, so a drop on the editor inserts no text', async () => {
			render({ available: AVAILABLE, selected: ['budget', 'owner'] });
			await open();
			const transfer = stubDataTransfer();
			handle('budget')!.dispatchEvent(dragEvent('dragstart', transfer));
			expect(transfer.setData).not.toHaveBeenCalledWith('text/plain', expect.anything());
		});
	});
});
