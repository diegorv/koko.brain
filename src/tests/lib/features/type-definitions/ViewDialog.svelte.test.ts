// @vitest-environment jsdom
// The New view dialog over the real name check, with the view service mocked:
// validation, Enter, the close guard while a create is in flight, and the
// inline error of a failed create.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('#lib/features/type-definitions/type-definitions.service.js', () => ({ createView: vi.fn() }));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { mount, unmount, flushSync, tick } from 'svelte';
import { toast } from 'svelte-sonner';
import ViewDialog from '#lib/features/type-definitions/ViewDialog.svelte';
import { createView } from '#lib/features/type-definitions/type-definitions.service.js';

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

/** A promise with its settle functions, to hold a create in flight. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (err: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

describe('ViewDialog', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	const oncreated = vi.fn();
	let open = $state(false);
	let existingLabels = $state(['All projects']);
	// Accessors, so the dialog's writes to its bindable `open` land here.
	const props = {
		get open() {
			return open;
		},
		set open(value: boolean) {
			open = value;
		},
		get existingLabels() {
			return existingLabels;
		},
		oncreated,
	};

	async function openDialog() {
		props.open = true;
		await settle();
	}

	function input(): HTMLInputElement {
		return document.querySelector<HTMLInputElement>('input[placeholder="View name"]')!;
	}

	function button(label: string): HTMLButtonElement {
		return [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((b) => b.textContent?.trim() === label)!;
	}

	function closeButton(): HTMLButtonElement {
		return [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((b) => b.textContent?.trim() === 'Close')!;
	}

	function dialogOpen(): boolean {
		return document.querySelector('[role="dialog"]') !== null;
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
		vi.clearAllMocks();
		open = false;
		existingLabels = ['All projects'];
		target = document.body.appendChild(document.createElement('div'));
		component = mount(ViewDialog, { target, props });
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('opens titled New view with the name field focused and Create disabled', async () => {
		await openDialog();
		expect(document.querySelector('[role="dialog"]')?.textContent).toContain('New view');
		expect(document.activeElement).toBe(input());
		expect(input().value).toBe('');
		expect(button('Create').disabled).toBe(true);
		expect(document.querySelector('[data-view-dialog-name-error]')).toBeNull();
	});

	it('enables Create for a valid name and shows the reason once an invalid name is typed', async () => {
		await openDialog();
		await type('Reading');
		expect(button('Create').disabled).toBe(false);
		await type('a/b');
		expect(button('Create').disabled).toBe(true);
		expect(document.querySelector('[data-view-dialog-name-error]')?.textContent).toBe('Name cannot contain "/"');
		await type('  all PROJECTS ');
		expect(document.querySelector('[data-view-dialog-name-error]')?.textContent).toBe('A view with this name already exists');
		await type('');
		expect(document.querySelector('[data-view-dialog-name-error]')?.textContent).toBe('Name cannot be empty');
	});

	it('creates the trimmed name on Enter, closes, and hands the path on', async () => {
		vi.mocked(createView).mockResolvedValue('/vault/Reading.view');
		await openDialog();
		await type('  Reading  ');
		await pressEnter();
		expect(createView).toHaveBeenCalledWith('Reading');
		expect(oncreated).toHaveBeenCalledWith('/vault/Reading.view');
		expect(props.open).toBe(false);
		expect(document.querySelector('[role="alert"]')).toBeNull();
		expect(toast.success).not.toHaveBeenCalled();
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('creates on a click on Create', async () => {
		vi.mocked(createView).mockResolvedValue('/vault/Reading.view');
		await openDialog();
		await type('Reading');
		button('Create').click();
		await settle();
		expect(createView).toHaveBeenCalledWith('Reading');
		expect(oncreated).toHaveBeenCalledWith('/vault/Reading.view');
		expect(props.open).toBe(false);
	});

	it('does nothing on Enter with an invalid or taken name', async () => {
		await openDialog();
		await type('.hidden');
		await pressEnter();
		await type('All projects');
		await pressEnter();
		expect(createView).not.toHaveBeenCalled();
		expect(props.open).toBe(true);
	});

	it('closes without creating on Cancel and on Escape', async () => {
		await openDialog();
		await type('Reading');
		button('Cancel').click();
		await settle();
		expect(props.open).toBe(false);

		await openDialog();
		await type('Reading');
		await pressEscape();
		expect(props.open).toBe(false);
		expect(createView).not.toHaveBeenCalled();
		expect(oncreated).not.toHaveBeenCalled();
	});

	// The in-flight test below relies on these two paths closing an idle dialog.
	it('closes on an outside click and on the close button with no create in flight', async () => {
		await openDialog();
		await clickOutside();
		expect(props.open).toBe(false);

		await openDialog();
		closeButton().click();
		await settle();
		expect(props.open).toBe(false);
	});

	it('ignores Cancel, Create, Escape, an outside click and the close button while the create is in flight', async () => {
		const pending = deferred<string>();
		vi.mocked(createView).mockReturnValue(pending.promise);
		await openDialog();
		await type('Reading');
		await pressEnter();
		expect(createView).toHaveBeenCalledTimes(1);

		expect(button('Cancel').disabled).toBe(true);
		expect(button('Create').disabled).toBe(true);
		button('Cancel').click();
		await settle();
		button('Create').click();
		await settle();
		await pressEnter();
		await pressEscape();
		await clickOutside();
		closeButton().click();
		await settle();

		expect(props.open).toBe(true);
		expect(dialogOpen()).toBe(true);
		expect(createView).toHaveBeenCalledTimes(1);

		pending.resolve('/vault/Reading.view');
		await settle();
		expect(props.open).toBe(false);
		expect(oncreated).toHaveBeenCalledWith('/vault/Reading.view');
	});

	it('keeps the dialog open with the reason inline and the name kept when the create fails', async () => {
		vi.mocked(createView).mockRejectedValue('permission denied');
		await openDialog();
		await type('Reading');
		await pressEnter();

		expect(props.open).toBe(true);
		expect(document.querySelector('[role="alert"]')?.textContent).toBe('Could not create "Reading.view": permission denied');
		expect(input().value).toBe('Reading');
		expect(button('Create').disabled).toBe(false);
		expect(oncreated).not.toHaveBeenCalled();
		expect(toast.success).not.toHaveBeenCalled();
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('clears the failed-create reason once the name is edited', async () => {
		vi.mocked(createView).mockRejectedValue('permission denied');
		await openDialog();
		await type('Reading');
		await pressEnter();
		expect(document.querySelector('[role="alert"]')).not.toBeNull();

		await type('Reading list');
		expect(document.querySelector('[role="alert"]')).toBeNull();
		expect(props.open).toBe(true);
	});

	it('starts blank when reopened after a failed create', async () => {
		vi.mocked(createView).mockRejectedValue(new Error('disk full'));
		await openDialog();
		await type('Reading');
		await pressEnter();
		button('Cancel').click();
		await settle();
		expect(props.open).toBe(false);

		await openDialog();
		expect(input().value).toBe('');
		expect(document.querySelector('[role="alert"]')).toBeNull();
		expect(document.querySelector('[data-view-dialog-name-error]')).toBeNull();
	});

	it('starts blank when reopened after a successful create', async () => {
		vi.mocked(createView).mockResolvedValue('/vault/Reading.view');
		await openDialog();
		await type('Reading');
		await pressEnter();
		expect(props.open).toBe(false);

		await openDialog();
		expect(input().value).toBe('');
		expect(button('Create').disabled).toBe(true);
	});
});
