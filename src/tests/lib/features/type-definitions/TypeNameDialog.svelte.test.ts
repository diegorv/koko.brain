// @vitest-environment jsdom
// The type name dialog over the real name check and casing rule, with
// `onConfirm` a plain function holding its promise: the dialog stays open and
// busy while it runs, ignores every close and a second Enter, and keeps the
// helper line it showed at confirm.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import TypeNameDialog from '#lib/features/type-definitions/TypeNameDialog.svelte';
import { validateTypeName } from '#lib/features/type-definitions/type-definitions.logic.js';
import { normalizeTypeCasing } from '#lib/core/frontmatter/properties.logic.js';

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

/** A promise with its resolve function, to hold `onConfirm` in flight. */
function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

describe('TypeNameDialog', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let open = $state(false);
	/** The known type names; `onConfirm` adds the saved name, as the store does mid-save. */
	let taken = $state<string[]>(['Meeting']);
	/** When false, `onConfirm` leaves `taken` alone, so only `busy` can stop a second confirm. */
	let registersName = true;
	let busyLabel = $state<string | undefined>('Updating notes...');
	let pending = deferred();
	let confirmed: string[] = [];
	// Accessors, so the dialog's writes to its bindable `open` land here.
	const props = {
		get open() {
			return open;
		},
		set open(value: boolean) {
			open = value;
		},
		title: 'Rename type',
		confirmLabel: 'Rename',
		get busyLabel() {
			return busyLabel;
		},
		validate: (name: string) => validateTypeName(name, taken),
		normalize: normalizeTypeCasing,
		onConfirm: (name: string) => {
			confirmed.push(name);
			if (registersName) taken = [...taken, name];
			return pending.promise;
		},
	};

	function input(): HTMLInputElement {
		return document.querySelector<HTMLInputElement>('input[placeholder="Type name"]')!;
	}

	function button(label: string): HTMLButtonElement {
		return [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((b) => b.textContent?.trim() === label)!;
	}

	/** bits-ui keeps a closing dialog mounted through its exit transition, marked `data-state="closed"`. */
	function dialogOpen(): boolean {
		return document.querySelector('[role="dialog"][data-state="open"]') !== null;
	}

	function dialogText(): string {
		return document.querySelector('[role="dialog"]')?.textContent ?? '';
	}

	async function openDialog() {
		props.open = true;
		await settle();
	}

	async function type(value: string) {
		input().value = value;
		input().dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
	}

	async function pressEnter() {
		input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
		await settle();
	}

	async function pressEscape() {
		document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
		await settle();
	}

	/**
	 * A mouse press outside the dialog content. bits-ui handles it after a
	 * 10 ms debounce and only outside the content's rect, which jsdom lays out
	 * at 0,0 with no size.
	 */
	async function clickOutside() {
		const at = { bubbles: true, cancelable: true, clientX: 10, clientY: 10, pointerType: 'mouse' };
		document.body.dispatchEvent(new PointerEvent('pointerdown', at));
		await new Promise((resolve) => setTimeout(resolve, 20));
		document.body.dispatchEvent(new PointerEvent('pointerup', at));
		document.body.dispatchEvent(new MouseEvent('click', at));
		await settle();
	}

	beforeEach(() => {
		open = false;
		taken = ['Meeting'];
		registersName = true;
		busyLabel = 'Updating notes...';
		pending = deferred();
		confirmed = [];
		target = document.body.appendChild(document.createElement('div'));
		component = mount(TypeNameDialog, { target, props });
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('stays open and busy while onConfirm runs, ignores every close, then closes once it resolves', async () => {
		await openDialog();
		await type('Area');
		await pressEnter();
		expect(confirmed).toEqual(['Area']);

		expect(dialogOpen()).toBe(true);
		expect(button('Updating notes...').disabled).toBe(true);
		expect(button('Rename')).toBeUndefined();

		button('Cancel').click();
		await settle();
		button('Close').click();
		await settle();
		await pressEscape();
		await clickOutside();
		expect(props.open).toBe(true);
		expect(dialogOpen()).toBe(true);

		pending.resolve();
		await settle();
		expect(props.open).toBe(false);
		expect(dialogOpen()).toBe(false);
	});

	it('keeps the confirm label while busy when no busy label is given', async () => {
		busyLabel = undefined;
		await openDialog();
		await type('Area');
		await pressEnter();
		expect(button('Rename').disabled).toBe(true);
		pending.resolve();
		await settle();
		expect(dialogOpen()).toBe(false);
	});

	it('still closes on Cancel and Escape with nothing in flight', async () => {
		await openDialog();
		button('Cancel').click();
		await settle();
		expect(props.open).toBe(false);
		await openDialog();
		await pressEscape();
		expect(props.open).toBe(false);
		expect(confirmed).toEqual([]);
	});

	it('keeps the Saved as line and shows no error while busy, as the name becomes taken', async () => {
		await openDialog();
		await type('book');
		expect(dialogText()).toContain('Saved as "Book"');
		await pressEnter();
		expect(taken).toContain('Book');
		expect(validateTypeName('book', taken)).not.toBeNull();

		expect(dialogText()).toContain('Saved as "Book"');
		expect(dialogText()).not.toContain('already exists');
		pending.resolve();
		await settle();
	});

	it('shows no error while busy for a name already cased, as the name becomes taken', async () => {
		await openDialog();
		await type('Area');
		await pressEnter();
		expect(dialogText()).not.toContain('already exists');
		expect(dialogText()).not.toContain('Saved as');
		pending.resolve();
		await settle();
	});

	it('calls onConfirm once for Enter pressed twice while busy, before the name becomes taken', async () => {
		registersName = false;
		await openDialog();
		await type('Area');
		await pressEnter();
		await pressEnter();
		button('Updating notes...').click();
		await settle();
		expect(confirmed).toEqual(['Area']);
		pending.resolve();
		await settle();
	});

	it('reopens with the live helper line after a save', async () => {
		await openDialog();
		await type('Area');
		await pressEnter();
		pending.resolve();
		await settle();
		pending = deferred();
		await openDialog();
		await type('area');
		expect(dialogText()).toContain('A type with this name already exists');
	});

	it('does not confirm an invalid name', async () => {
		await openDialog();
		await type('Meeting');
		await pressEnter();
		expect(confirmed).toEqual([]);
		expect(dialogOpen()).toBe(true);
		expect(dialogText()).toContain('A type with this name already exists');
	});
});
