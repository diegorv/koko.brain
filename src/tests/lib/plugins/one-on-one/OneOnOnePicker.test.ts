// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

// The note creation is the side effect this suite must see happen or not happen.
vi.mock('#lib/plugins/one-on-one/one-on-one.service.js', () => ({
	createOneOnOneNote: vi.fn(async () => {}),
}));

import { mount, unmount, flushSync } from 'svelte';
import { toast } from 'svelte-sonner';

import OneOnOnePicker from '#lib/plugins/one-on-one/OneOnOnePicker.svelte';
import { createOneOnOneNote } from '#lib/plugins/one-on-one/one-on-one.service.js';
import { oneOnOneStore } from '#lib/plugins/one-on-one/one-on-one.store.svelte.js';
import type { PersonEntry } from '#lib/plugins/one-on-one/one-on-one.logic.js';

// bits-ui's Command scrolls its first item into view; jsdom does not implement it.
Element.prototype.scrollIntoView ??= () => {};

const ZYON: PersonEntry = { name: 'Zyon', path: '/vault/work/people/Zyon.md', context: 'work' };
const ANA: PersonEntry = { name: 'Ana', path: '/vault/personal/people/Ana.md', context: 'personal' };

describe('OneOnOnePicker', () => {
	let component: Record<string, unknown> | null = null;

	/** The person rows; Command.Dialog renders through a portal into document.body */
	const rows = () => [...document.querySelectorAll<HTMLElement>('[data-command-item]')];
	const row = (name: string) => rows().find((el) => el.textContent?.trim() === name)!;
	const settle = async () => {
		await new Promise((resolve) => setTimeout(resolve, 0));
		flushSync();
	};

	beforeEach(() => {
		vi.clearAllMocks();
		oneOnOneStore.reset();
		component = mount(OneOnOnePicker, { target: document.body.appendChild(document.createElement('div')) });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		oneOnOneStore.reset();
		document.body.innerHTML = '';
	});

	it('renders no person until it is opened', () => {
		oneOnOneStore.setPeople([ZYON]);
		flushSync();

		expect(rows()).toEqual([]);
	});

	it('lists the people when opened', () => {
		oneOnOneStore.setPeople([ZYON, ANA]);
		oneOnOneStore.open();
		flushSync();

		expect(rows().map((el) => el.textContent?.trim())).toEqual(['Zyon', 'Ana']);
	});

	it('shows the empty message with no people', () => {
		oneOnOneStore.open();
		flushSync();

		expect(rows()).toEqual([]);
		expect(document.body.textContent).toContain('No people available');
	});

	it('without a handler, picking a person creates the 1:1 note and closes', async () => {
		oneOnOneStore.setPeople([ZYON]);
		oneOnOneStore.open();
		flushSync();

		row('Zyon').click();
		await settle();

		expect(createOneOnOneNote).toHaveBeenCalledWith('Zyon');
		expect(oneOnOneStore.isOpen).toBe(false);
	});

	it('a failed note creation shows the generic toast', async () => {
		vi.mocked(createOneOnOneNote).mockRejectedValueOnce(new Error('disk full'));
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		oneOnOneStore.setPeople([ZYON]);
		oneOnOneStore.open();
		flushSync();

		row('Zyon').click();
		await settle();

		expect(toast.error).toHaveBeenCalledWith('Failed to create 1:1 note.');
		consoleError.mockRestore();
	});

	it('with a handler, picking a person hands it the whole entry and creates no note', async () => {
		const handler = vi.fn();
		oneOnOneStore.setPeople([ZYON, ANA]);
		oneOnOneStore.open(handler);
		flushSync();

		row('Ana').click();
		await settle();

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(ANA);
		expect(createOneOnOneNote).not.toHaveBeenCalled();
		expect(oneOnOneStore.isOpen).toBe(false);
	});

	it('a handler that rejects shows its own message and creates no note', async () => {
		oneOnOneStore.setPeople([ZYON]);
		oneOnOneStore.open(async () => {
			throw new Error('No "## Agenda" heading');
		});
		flushSync();

		row('Zyon').click();
		await settle();

		expect(toast.error).toHaveBeenCalledWith('No "## Agenda" heading');
		expect(createOneOnOneNote).not.toHaveBeenCalled();
	});

	it('closing without a pick drops the handler, so the next open creates the note as usual', async () => {
		const handler = vi.fn();
		oneOnOneStore.setPeople([ZYON]);
		oneOnOneStore.open(handler);
		flushSync();
		oneOnOneStore.close();
		flushSync();

		oneOnOneStore.open();
		flushSync();
		row('Zyon').click();
		await settle();

		expect(handler).not.toHaveBeenCalled();
		expect(createOneOnOneNote).toHaveBeenCalledWith('Zyon');
	});
});
