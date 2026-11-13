// @vitest-environment jsdom
// The New view and Edit view dialog over the real name check, the real filter
// logic, collection store and view parse cache, with the view service mocked
// and plugin-fs mocked at the Tauri boundary: validation, Enter, the close
// guard while a save is in flight, the inline error of a failed save, the
// filter section, and the Edit view prefill.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('#lib/features/type-definitions/type-definitions.service.js', () => ({ createView: vi.fn(), editView: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn() }));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { mount, unmount, flushSync, tick } from 'svelte';
import { toast } from 'svelte-sonner';
import ViewDialog from '#lib/features/type-definitions/ViewDialog.svelte';
import { createView, editView } from '#lib/features/type-definitions/type-definitions.service.js';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { clearAllViewParseCache, refreshViewDefinition } from '#lib/features/type-definitions/view-parse-cache.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import { getAllKnownProperties, getOperatorsForType } from '#lib/features/collection/toolbar/filter.logic.js';
import { OPERATOR_LABELS } from '#lib/features/collection/toolbar/toolbar.types.js';

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
	let folder = $state<string | undefined>(undefined);
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
		get folder() {
			return folder;
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
		collectionStore.reset();
		open = false;
		existingLabels = ['All projects'];
		folder = undefined;
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
		expect(createView).toHaveBeenCalledWith('Reading', undefined, undefined);
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
		expect(createView).toHaveBeenCalledWith('Reading', undefined, undefined);
		expect(oncreated).toHaveBeenCalledWith('/vault/Reading.view');
		expect(props.open).toBe(false);
	});

	it('creates the view in the folder it was given', async () => {
		folder = '/vault/Work';
		vi.mocked(createView).mockResolvedValue('/vault/Work/Reading.view');
		await openDialog();
		await type('Reading');
		await pressEnter();
		expect(createView).toHaveBeenCalledWith('Reading', undefined, '/vault/Work');
		expect(oncreated).toHaveBeenCalledWith('/vault/Work/Reading.view');
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
		const alert = document.querySelector('[role="alert"]');
		expect(alert?.textContent).toBe('Could not create "Reading.view": permission denied');
		// The reason names the file of the typed name, so it sits with the name input.
		expect(alert?.parentElement?.contains(input())).toBe(true);
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

	describe('filters', () => {
		/** Notes whose frontmatter gives a text, a number, a date and a boolean property. */
		function seedIndex() {
			const notes: Record<string, string> = {
				'/vault/a.md': '---\n_type: Project\npriority: 3\ndue: 2026-01-05\ndone: true\n---\n',
				'/vault/b.md': '---\nstatus: open\n---\n',
			};
			collectionStore.setPropertyIndex(new Map(Object.entries(notes).map(([p, c]) => [p, buildNoteRecord(p, c)])));
		}

		function dialogButtons(): HTMLButtonElement[] {
			return [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')];
		}

		/** The dialog's filter rows' value inputs. */
		function valueInputs(): HTMLInputElement[] {
			return [...document.querySelectorAll<HTMLInputElement>('[role="dialog"] input[placeholder="Value..."]')];
		}

		/** The innermost button whose text is `text` (a menu trigger wraps its own button). */
		function trigger(text: string, index = 0): HTMLButtonElement {
			const found = dialogButtons().filter((b) => b.textContent?.trim() === text && !b.querySelector('button'));
			if (!found[index]) throw new Error(`trigger "${text}" #${index} not found`);
			return found[index];
		}

		/** The items of the open menu (a closed menu's content can linger in jsdom). */
		function menuItems(): string[] {
			return [...document.querySelectorAll<HTMLElement>('[role="menu"][data-state="open"] [role="menuitem"]')].map((el) => el.textContent?.trim() ?? '');
		}

		/** A synthetic click (detail 0, the keyboard path in bits-ui) toggles a menu. */
		async function openMenu(el: HTMLElement) {
			el.click();
			await settle();
		}

		async function pick(text: string) {
			const item = [...document.querySelectorAll<HTMLElement>('[role="menu"][data-state="open"] [role="menuitem"]')].find((el) => el.textContent?.trim() === text);
			if (!item) throw new Error(`menu item "${text}" not found`);
			item.click();
			await settle();
		}

		async function addFilter() {
			button('Add filter').click();
			await settle();
		}

		async function typeValue(index: number, value: string) {
			const el = valueInputs()[index];
			el.value = value;
			el.dispatchEvent(new Event('input', { bubbles: true }));
			await settle();
		}

		function blankMessage(): string | null {
			return document.querySelector('[data-view-dialog-filter-error]')?.textContent ?? null;
		}

		it('shows only the This view section, starting with no rows', async () => {
			await openDialog();
			const dialog = document.querySelector('[role="dialog"]')!;
			expect(dialog.textContent).toContain('This view');
			expect(dialog.textContent).not.toContain('All views');
			expect(valueInputs()).toHaveLength(0);
			expect(button('Add filter')).toBeTruthy();
		});

		it('reopens with no rows after rows were added and the dialog cancelled', async () => {
			await openDialog();
			await addFilter();
			await addFilter();
			expect(valueInputs()).toHaveLength(2);
			button('Cancel').click();
			await settle();
			expect(props.open).toBe(false);

			await openDialog();
			expect(valueInputs()).toHaveLength(0);
		});

		it('offers exactly the known properties of the real collection store as fields', async () => {
			seedIndex();
			await openDialog();
			await addFilter();
			await openMenu(trigger('file.name'));
			expect(menuItems()).toEqual(getAllKnownProperties(collectionStore.propertyIndex));
			expect(menuItems()).toEqual(expect.arrayContaining(['file.name', '_type', 'priority', 'due', 'done', 'status']));
		});

		it('offers only the file fields while the property index is empty', async () => {
			await openDialog();
			await addFilter();
			await openMenu(trigger('file.name'));
			expect(menuItems()).toEqual(getAllKnownProperties(new Map()));
			expect(menuItems().every((p) => p.startsWith('file.'))).toBe(true);
		});

		it.each([
			['priority', 'number'],
			['due', 'date'],
			['done', 'boolean'],
			['status', 'text'],
		] as const)('lists the operators of the inferred type for %s (%s)', async (property, type) => {
			seedIndex();
			await openDialog();
			await addFilter();
			await openMenu(trigger('file.name'));
			await pick(property);
			const first = OPERATOR_LABELS[getOperatorsForType(type)[0]];
			await openMenu(trigger(first));
			expect(menuItems()).toEqual(getOperatorsForType(type).map((op) => OPERATOR_LABELS[op]));
		});

		it('keeps the dialog mounted and creates nothing when the field, operator and conjunction triggers are clicked', async () => {
			await openDialog();
			await type('Reading');
			await addFilter();

			await openMenu(trigger('file.name'));
			await pick('file.path');
			await openMenu(trigger('is'));
			await pick('contains');
			await openMenu(trigger('All the following are true'));
			await pick('Any of the following are true');

			expect(createView).not.toHaveBeenCalled();
			expect(props.open).toBe(true);
			expect(dialogOpen()).toBe(true);
			expect(trigger('file.path')).toBeTruthy();
			expect(trigger('contains')).toBeTruthy();
			expect(trigger('Any of the following are true')).toBeTruthy();
		});

		it('disables Create with a message while a row that takes a value is blank, and Enter does not create', async () => {
			await openDialog();
			await type('Reading');
			expect(blankMessage()).toBeNull();
			await addFilter();

			expect(button('Create').disabled).toBe(true);
			expect(blankMessage()).toBe('Every filter needs a value');
			await pressEnter();
			expect(createView).not.toHaveBeenCalled();

			await typeValue(0, '   ');
			expect(button('Create').disabled).toBe(true);
			await pressEnter();
			expect(createView).not.toHaveBeenCalled();

			await typeValue(0, 'Alpha');
			expect(button('Create').disabled).toBe(false);
			expect(blankMessage()).toBeNull();

			await addFilter();
			expect(button('Create').disabled).toBe(true);
			expect(blankMessage()).toBe('Every filter needs a value');
		});

		it.each(['is empty', 'is not empty'])('lets a blank %s row through', async (label) => {
			await openDialog();
			await type('Reading');
			await addFilter();
			await openMenu(trigger('is'));
			await pick(label);
			expect(button('Create').disabled).toBe(false);
			expect(blankMessage()).toBeNull();
		});

		it.each(['is true', 'is false'])('lets a boolean %s row through', async (label) => {
			seedIndex();
			await openDialog();
			await type('Reading');
			await addFilter();
			await openMenu(trigger('file.name'));
			await pick('done');
			if (label !== 'is true') {
				await openMenu(trigger('is true'));
				await pick(label);
			}
			expect(valueInputs()).toHaveLength(0);
			expect(button('Create').disabled).toBe(false);
		});

		it('passes undefined filters when there are no rows', async () => {
			vi.mocked(createView).mockResolvedValue('/vault/Reading.view');
			await openDialog();
			await type('Reading');
			button('Create').click();
			await settle();
			expect(createView).toHaveBeenCalledWith('Reading', undefined, undefined);
		});

		it('passes one positive row as a single expression', async () => {
			vi.mocked(createView).mockResolvedValue('/vault/Reading.view');
			await openDialog();
			await type('Reading');
			await addFilter();
			await typeValue(0, 'Alpha');
			button('Create').click();
			await settle();
			expect(createView).toHaveBeenCalledWith('Reading', "file.name == 'Alpha'", undefined);
			expect(oncreated).toHaveBeenCalledWith('/vault/Reading.view');
		});

		it('passes several rows as an and object, or an or object under Any', async () => {
			vi.mocked(createView).mockResolvedValue('/vault/Reading.view');
			await openDialog();
			await type('Reading');
			await addFilter();
			await addFilter();
			await typeValue(0, 'Alpha');
			await typeValue(1, 'Beta');
			button('Create').click();
			await settle();
			expect(createView).toHaveBeenLastCalledWith('Reading', { and: ["file.name == 'Alpha'", "file.name == 'Beta'"] }, undefined);

			await openDialog();
			await type('Reading');
			await addFilter();
			await addFilter();
			await typeValue(0, 'Alpha');
			await typeValue(1, 'Beta');
			await openMenu(trigger('All the following are true'));
			await pick('Any of the following are true');
			button('Create').click();
			await settle();
			expect(createView).toHaveBeenLastCalledWith('Reading', { or: ["file.name == 'Alpha'", "file.name == 'Beta'"] }, undefined);
		});

		it('passes a one-row None group as a not object', async () => {
			vi.mocked(createView).mockResolvedValue('/vault/Reading.view');
			await openDialog();
			await type('Reading');
			await addFilter();
			await typeValue(0, 'Alpha');
			await openMenu(trigger('All the following are true'));
			await pick('None of the following are true');
			await pressEnter();
			expect(createView).toHaveBeenCalledWith('Reading', { not: ["file.name == 'Alpha'"] }, undefined);
		});
	});
});

describe('ViewDialog: Edit view', () => {
	const PATH = '/vault/Views/Projects.view';
	const WITH_GLOBAL = "_sidebar_label: All projects\nfilters: _type == 'Project'\nviews:\n  - type: table\n    name: Projects\n    filters: status == 'active'\n";
	const VIEW_ONLY = "views:\n  - type: table\n    name: Projects\n    filters: status == 'active'\n";
	/** In-memory disk behind the plugin-fs mock. */
	const files: Record<string, string> = {};

	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let open = $state(false);
	let edit = $state<{ path: string; label: string } | null>({ path: PATH, label: 'All projects' });
	const props = {
		get open() {
			return open;
		},
		set open(value: boolean) {
			open = value;
		},
		get existingLabels() {
			return ['Reading'];
		},
		get edit() {
			return edit;
		},
	};

	async function openDialog() {
		props.open = true;
		await settle();
	}

	function nameInput(): HTMLInputElement {
		return document.querySelector<HTMLInputElement>('input[placeholder="View name"]')!;
	}

	function button(label: string): HTMLButtonElement {
		return [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((b) => b.textContent?.trim() === label)!;
	}

	function valueInputs(): string[] {
		return [...document.querySelectorAll<HTMLInputElement>('[role="dialog"] input[placeholder="Value..."]')].map((el) => el.value);
	}

	function dialogText(): string {
		return document.querySelector('[role="dialog"]')?.textContent ?? '';
	}

	async function rename(value: string) {
		nameInput().value = value;
		nameInput().dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
	}

	async function save() {
		button('Save').click();
		await settle();
	}

	beforeEach(() => {
		vi.clearAllMocks();
		collectionStore.reset();
		clearAllViewParseCache();
		for (const p of Object.keys(files)) delete files[p];
		files[PATH] = WITH_GLOBAL;
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			const content = files[String(p)];
			if (content === undefined) throw new Error('not found');
			return content;
		});
		open = false;
		edit = { path: PATH, label: 'All projects' };
		target = document.body.appendChild(document.createElement('div'));
		component = mount(ViewDialog, { target, props });
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		clearAllViewParseCache();
	});

	it('opens titled Edit view with Save, prefilled with the label and both filter sections', async () => {
		await openDialog();
		expect(dialogText()).toContain('Edit view');
		expect(dialogText()).not.toContain('New view');
		expect(button('Save')).toBeTruthy();
		expect(button('Create')).toBeUndefined();
		expect(nameInput().value).toBe('All projects');
		expect(dialogText()).toContain('All views');
		expect(dialogText()).toContain('This view');
		// "All views" renders above "This view".
		expect(valueInputs()).toEqual(['Project', 'active']);
		expect(button('Save').disabled).toBe(false);
		expect(document.querySelector('[role="alert"]')).toBeNull();
	});

	it('prefills the row label, so a view without _sidebar_label shows its filename', async () => {
		files[PATH] = VIEW_ONLY;
		edit = { path: PATH, label: 'Projects' };
		await openDialog();
		expect(nameInput().value).toBe('Projects');
	});

	it("shows at once why Save is disabled when the prefilled label holds another view's label", async () => {
		edit = { path: PATH, label: 'Reading' };
		await openDialog();
		expect(nameInput().value).toBe('Reading');
		expect(button('Save').disabled).toBe(true);
		expect(document.querySelector('[data-view-dialog-name-error]')?.textContent).toBe('A view with this name already exists');
	});

	it('saves a label a file name refuses, since the file keeps its name', async () => {
		vi.mocked(editView).mockResolvedValue();
		edit = { path: PATH, label: 'Q1: goals' };
		await openDialog();
		expect(button('Save').disabled).toBe(false);
		expect(document.querySelector('[data-view-dialog-name-error]')).toBeNull();

		await rename('Q2: "plan"');
		expect(button('Save').disabled).toBe(false);
		await save();
		expect(editView).toHaveBeenCalledWith(PATH, expect.objectContaining({ label: 'Q2: "plan"' }));
	});

	it('opens a valid prefilled label with no name message', async () => {
		await openDialog();
		expect(document.querySelector('[data-view-dialog-name-error]')).toBeNull();
	});

	it('shows no All views section for a view without top-level filters', async () => {
		files[PATH] = VIEW_ONLY;
		await openDialog();
		expect(dialogText()).toContain('This view');
		expect(dialogText()).not.toContain('All views');
		expect(valueInputs()).toEqual(['active']);
	});

	it('prefills the filters of the view _rail_view names, and of the first view when it names none', async () => {
		files[PATH] = "_rail_view: Done\nviews:\n  - type: table\n    name: Projects\n    filters: status == 'active'\n  - type: table\n    name: Done\n    filters: status == 'done'\n";
		await openDialog();
		expect(valueInputs()).toEqual(['done']);

		button('Cancel').click();
		await settle();
		files[PATH] = files[PATH].replace('_rail_view: Done', '_rail_view: Dne');
		await openDialog();
		expect(valueInputs()).toEqual(['active']);
	});

	it('reads the file fresh, not the cached parse', async () => {
		files[PATH] = VIEW_ONLY;
		await refreshViewDefinition(PATH);
		files[PATH] = WITH_GLOBAL.replace("'active'", "'paused'");
		await openDialog();
		expect(valueInputs()).toEqual(['Project', 'paused']);
	});

	it.each([
		['YAML that does not parse', 'views: ['],
		['a file the view parser refuses', '_sidebar_label: X\n'],
	])('shows the parse error of %s and keeps Save disabled', async (_label, content) => {
		files[PATH] = content;
		await openDialog();
		const alert = document.querySelector('[role="alert"]');
		expect(alert?.textContent).toMatch(/^Could not read "Projects\.view": /);
		expect(button('Save').disabled).toBe(true);
		nameInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
		await settle();
		expect(editView).not.toHaveBeenCalled();
	});

	it('shows the read error when the file cannot be read', async () => {
		delete files[PATH];
		await openDialog();
		expect(document.querySelector('[role="alert"]')?.textContent).toBe('Could not read "Projects.view": not found');
		expect(button('Save').disabled).toBe(true);
	});

	it('saves the trimmed name with both filter places, the unchanged filters as loaded, and closes', async () => {
		vi.mocked(editView).mockResolvedValue();
		await openDialog();
		await rename('  Live projects ');
		await save();
		expect(editView).toHaveBeenCalledWith(PATH, {
			label: 'Live projects',
			filters: "_type == 'Project'",
			viewFilters: "status == 'active'",
		});
		expect(props.open).toBe(false);
	});

	it('saves the same name, or a case change of it', async () => {
		vi.mocked(editView).mockResolvedValue();
		await openDialog();
		await save();
		expect(editView).toHaveBeenLastCalledWith(PATH, expect.objectContaining({ label: 'All projects' }));

		await openDialog();
		await rename('ALL PROJECTS');
		expect(button('Save').disabled).toBe(false);
		await save();
		expect(editView).toHaveBeenLastCalledWith(PATH, expect.objectContaining({ label: 'ALL PROJECTS' }));
	});

	it("refuses another view's label", async () => {
		await openDialog();
		await rename('reading');
		expect(button('Save').disabled).toBe(true);
		expect(document.querySelector('[data-view-dialog-name-error]')?.textContent).toBe('A view with this name already exists');
	});

	it('leaves the top-level filters out of the save when All views is not shown', async () => {
		vi.mocked(editView).mockResolvedValue();
		files[PATH] = VIEW_ONLY;
		edit = { path: PATH, label: 'Projects' };
		await openDialog();
		await save();
		expect(editView).toHaveBeenCalledWith(PATH, { label: 'Projects', viewFilters: "status == 'active'" });
	});

	it('saves an undefined section once its rows are removed', async () => {
		vi.mocked(editView).mockResolvedValue();
		await openDialog();
		const removeButtons = () => [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].filter((b) => b.querySelector('.lucide-x') && !b.textContent?.includes('Close'));
		expect(removeButtons()).toHaveLength(2);
		removeButtons()[1].click();
		await settle();
		await save();
		expect(editView).toHaveBeenCalledWith(PATH, { label: 'All projects', filters: "_type == 'Project'", viewFilters: undefined });
	});

	it('keeps the dialog open with the reason inline when the save fails', async () => {
		vi.mocked(editView).mockRejectedValue(new Error('disk full'));
		await openDialog();
		await save();
		expect(props.open).toBe(true);
		expect(document.querySelector('[role="alert"]')?.textContent).toBe('Could not save "Projects.view": disk full');
		expect(button('Save').disabled).toBe(false);
	});

	it('cannot be closed while the save is in flight', async () => {
		const pending = deferred<void>();
		vi.mocked(editView).mockReturnValue(pending.promise);
		await openDialog();
		await save();
		expect(button('Save').disabled).toBe(true);
		expect(button('Cancel').disabled).toBe(true);
		document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
		await settle();
		expect(props.open).toBe(true);
		expect(editView).toHaveBeenCalledTimes(1);

		pending.resolve();
		await settle();
		expect(props.open).toBe(false);
	});

	it('reloads the file on every open', async () => {
		await openDialog();
		button('Cancel').click();
		await settle();
		files[PATH] = VIEW_ONLY;
		await openDialog();
		expect(dialogText()).not.toContain('All views');
		expect(valueInputs()).toEqual(['active']);
	});
});
