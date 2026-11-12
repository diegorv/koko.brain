// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// `vaultStore.open` persists the recent-vaults list.
setupLocalStorage();

// Tauri IPC and the disk are mocked; tasksStore, settingsStore and vaultStore
// stay real (CLAUDE.md rule 1).
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())), emit: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn(), writeTextFile: vi.fn(), exists: vi.fn(async () => false) }));

import { mount, unmount, flushSync } from 'svelte';
import { resetTasks } from '#lib/features/tasks/tasks.service.js';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { defaultTaskExcludes, headingSources } from '#lib/features/tasks/task-query.logic.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { mockTaskFetch, mountTasksView, openMenu, taskGroupV2, taskV2 } from '../../../fixtures/tasks.fixture';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

/** The rule sentence's part for the default excludes. */
const EXCEPT = ', except archived notes, type definitions, templates, the system folder';

const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-task-row]'));
const rowTexts = () => rows().map((r) => r.querySelector('[data-task-text]')?.textContent?.trim());
const paragraph = (text: string) => Array.from(document.querySelectorAll('p')).find((p) => p.textContent?.trim() === text);
const one = (path: string, text: string) => taskGroupV2(path, [taskV2(text)]);

/** An element's accessible name as the view sets it: `aria-label`, else its text. */
const nameOf = (el: Element) => el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '';

/** Every element of `role` (`button` also matches `<button>` elements with no role) named exactly `name`. */
function named(role: 'button' | 'switch' | 'textbox' | 'menuitem', name: string): HTMLElement[] {
	const selector =
		role === 'button'
			? 'button:not([role]), [role="button"]'
			: role === 'textbox'
				? 'input:not([type]), input[type="text"]'
				: `[role="${role}"]`;
	return Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((el) => nameOf(el) === name);
}

/** The one element of `role` named `name`; throws when there is none or several. */
function only(role: 'button' | 'switch' | 'textbox' | 'menuitem', name: string): HTMLElement {
	const found = named(role, name);
	if (found.length !== 1) throw new Error(`${found.length} ${role} elements named ${name}`);
	return found[0];
}

/** Types `value` into `input` as one input event. */
function type(input: HTMLElement, value: string): void {
	(input as HTMLInputElement).value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

/** Waits, flushing Svelte, until `check` stops throwing. */
async function until(check: () => void): Promise<void> {
	await vi.waitFor(() => {
		flushSync();
		check();
	});
}

/** Clicks Add clause on the last card and picks `kind` in its menu. */
async function addClause(kind: 'Folder' | 'Type' | 'Note tag' | 'Heading' | 'Property' | 'Lifecycle'): Promise<void> {
	await openMenu(named('button', 'Add clause').at(-1)!);
	const item = Array.from(document.querySelectorAll<HTMLElement>('[role="menu"][data-state="open"] [role="menuitem"]')).find(
		(el) => el.textContent?.trim() === kind,
	);
	if (!item) throw new Error(`no ${kind} item in the open menu`);
	item.click();
	flushSync();
}

describe('TasksView: the Sources panel', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		// Also clears the write overlay, which outlives a test.
		resetTasks();
		editorStore.reset();
		settingsStore.reset();
		// A system folder that does not hold the templates folder, so only the templates switch covers it.
		settingsStore.updateTemplates({ systemFolder: 'System' });
		// Rows get their vault-relative folder only inside an open vault.
		vaultStore.open('/vault');
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		vaultStore.close();
		settingsStore.reset();
		document.body.innerHTML = '';
	});

	/** A project task, a home task and a template task, none under a heading. */
	const vault = () => [
		one('/vault/Projects/P.md', 'project task'),
		one('/vault/Home/H.md', 'home task'),
		one('/vault/_system/templates/T.md', 'template task'),
	];

	it('builds a folder card from Edit, Add card and Add clause, and its excludes switch brings a template task back', async () => {
		mockTaskFetch(vault());
		({ component } = await mountTasksView());
		await until(() => expect(paragraph('No task sits under a heading containing #to-list')).toBeDefined());
		const edit = only('button', 'Edit');
		expect(edit.getAttribute('aria-expanded')).toBe('false');

		edit.click();
		flushSync();
		expect(edit.getAttribute('aria-expanded')).toBe('true');
		const panel = document.getElementById(edit.getAttribute('aria-controls')!);
		expect(panel).not.toBeNull();
		expect(panel!.closest('.pane-toolbar')).toBeNull();

		only('button', 'Add card').click();
		flushSync();
		await addClause('Folder');
		// An empty value is inactive: the new card matches every note until it holds a folder.
		expect(rowTexts()).toEqual(['home task', 'project task']);
		type(only('textbox', 'Folder'), 'Projects');

		expect(rowTexts()).toEqual(['project task']);
		expect(
			paragraph(`Open tasks from notes under a heading tagged #to-list; or in folder Projects${EXCEPT}`),
		).toBeDefined();

		only('switch', 'Templates folder').click();
		flushSync();
		expect(tasksStore.query.exclude.templatesFolder).toBe(false);

		type(only('textbox', 'Folder'), '');
		expect(rowTexts()).toEqual(['template task', 'home task', 'project task']);
	});

	it('sets negate with Not and match with Contains, and Remove clause drops a clause', async () => {
		mockTaskFetch(vault());
		({ component } = await mountTasksView());
		only('button', 'Edit').click();
		flushSync();
		only('button', 'Add card').click();
		flushSync();
		await addClause('Folder');
		type(only('textbox', 'Folder'), 'Projects');
		only('switch', 'Not').click();
		flushSync();
		expect(tasksStore.query.sources[1]).toEqual({ clauses: [{ kind: 'folder', path: 'Projects', negate: true }] });
		expect(rowTexts()).toEqual(['home task']);

		named('button', 'Remove clause').at(-1)!.click();
		flushSync();
		expect(tasksStore.query.sources[1]).toEqual({ clauses: [] });

		const [headingCard] = tasksStore.query.sources;
		expect(headingCard).toEqual(headingSources(['#to-list'])[0]);
		only('button', 'Contains').click();
		flushSync();
		expect(tasksStore.query.sources[0]).toEqual({ clauses: [{ kind: 'heading', text: '#to-list', match: 'substring' }] });
	});

	it('edits the four exclude lists with an input, Add and a remove button per entry', async () => {
		mockTaskFetch([one('/vault/Projects/P.md', 'project task'), one('/vault/Home/H.md', 'home task')]);
		tasksStore.setSources([]);
		({ component } = await mountTasksView());
		only('button', 'Edit').click();
		flushSync();

		type(only('textbox', 'Excluded folder'), 'Projects');
		only('button', 'Add excluded folder').click();
		flushSync();
		expect(tasksStore.query.exclude.folders).toEqual(['Projects']);
		expect(rowTexts()).toEqual(['home task']);
		expect((only('textbox', 'Excluded folder') as HTMLInputElement).value).toBe('');

		type(only('textbox', 'Excluded note'), 'Home/H.md');
		only('textbox', 'Excluded note').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		flushSync();
		expect(tasksStore.query.exclude.notes).toEqual(['Home/H.md']);

		type(only('textbox', 'Excluded note tag'), '#x');
		only('button', 'Add excluded note tag').click();
		type(only('textbox', 'Excluded type'), 'Meeting');
		only('button', 'Add excluded type').click();
		flushSync();
		expect(tasksStore.query.exclude).toEqual({
			...defaultTaskExcludes(),
			folders: ['Projects'],
			notes: ['Home/H.md'],
			tags: ['#x'],
			types: ['Meeting'],
		});

		only('button', 'Remove excluded folder Projects').click();
		only('button', 'Remove excluded note Home/H.md').click();
		flushSync();
		expect(rowTexts()).toEqual(['home task', 'project task']);
		expect(tasksStore.query.exclude.folders).toEqual([]);
	});

	it('Remove card drops the card and its rows, writes the tag cards to tasksView.sectionTag and keeps focus in the panel', async () => {
		mockTaskFetch(vault());
		tasksStore.setSources([
			...headingSources(['#to-list']),
			{ clauses: [{ kind: 'folder', path: 'Projects' }] },
			{ clauses: [{ kind: 'folder', path: 'Home' }] },
		]);
		({ component } = await mountTasksView());
		await until(() => expect(rowTexts()).toEqual(['home task', 'project task']));
		only('button', 'Edit').click();
		flushSync();

		const removeLast = named('button', 'Remove card').at(-1)!;
		removeLast.focus();
		removeLast.click();
		flushSync();
		expect(tasksStore.query.sources).toEqual([...headingSources(['#to-list']), { clauses: [{ kind: 'folder', path: 'Projects' }] }]);
		expect(rowTexts()).toEqual(['project task']);
		expect(document.activeElement).toBe(named('button', 'Remove card')[1]);

		const removeTagCard = named('button', 'Remove card')[0];
		removeTagCard.focus();
		removeTagCard.click();
		flushSync();
		expect(tasksStore.query.sources).toEqual([{ clauses: [{ kind: 'folder', path: 'Projects' }] }]);
		expect(rowTexts()).toEqual(['project task']);
		expect(settingsStore.tasksView).toEqual({ version: 1, sectionTag: '' });
		expect(document.activeElement).toBe(only('button', 'Remove card'));

		only('button', 'Remove card').click();
		flushSync();
		expect(tasksStore.query.sources).toEqual([]);
		expect(document.activeElement).toBe(only('button', 'Add card'));
	});

	it('Remove clause and an exclude entry remove button keep focus in the panel', async () => {
		mockTaskFetch(vault());
		tasksStore.setSources([{ clauses: [{ kind: 'folder', path: 'Projects' }, { kind: 'type', type: '' }] }]);
		({ component } = await mountTasksView());
		await until(() => expect(rowTexts()).toEqual(['project task']));
		only('button', 'Edit').click();
		flushSync();

		const removeType = named('button', 'Remove clause')[1];
		removeType.focus();
		removeType.click();
		flushSync();
		expect(tasksStore.query.sources).toEqual([{ clauses: [{ kind: 'folder', path: 'Projects' }] }]);
		expect(document.activeElement).toBe(only('button', 'Remove clause'));

		only('button', 'Remove clause').click();
		flushSync();
		expect(rowTexts()).toEqual(['home task', 'project task']);
		expect(document.activeElement).toBe(only('button', 'Add clause'));

		for (const folder of ['A', 'B']) {
			type(only('textbox', 'Excluded folder'), folder);
			only('button', 'Add excluded folder').click();
			flushSync();
		}
		only('button', 'Remove excluded folder A').focus();
		only('button', 'Remove excluded folder A').click();
		flushSync();
		expect(tasksStore.query.exclude.folders).toEqual(['B']);
		expect(document.activeElement).toBe(only('button', 'Remove excluded folder B'));

		only('button', 'Remove excluded folder B').click();
		flushSync();
		expect(tasksStore.query.exclude.folders).toEqual([]);
		expect(document.activeElement).toBe(only('textbox', 'Excluded folder'));
	});

	it('names a folder card that matches no note, and Edit sources opens the panel', async () => {
		mockTaskFetch(vault());
		tasksStore.setSources([{ clauses: [{ kind: 'folder', path: 'Nowhere' }] }]);
		({ component } = await mountTasksView());
		await until(() => expect(paragraph('No note matches the sources')).toBeDefined());
		const edit = only('button', 'Edit');
		expect(edit.getAttribute('aria-expanded')).toBe('false');
		expect(document.getElementById(edit.getAttribute('aria-controls')!)).toBeNull();

		only('button', 'Edit sources').click();
		flushSync();

		expect(edit.getAttribute('aria-expanded')).toBe('true');
		expect(document.getElementById(edit.getAttribute('aria-controls')!)).not.toBeNull();
		expect((only('textbox', 'Folder') as HTMLInputElement).value).toBe('Nowhere');
	});

	it('says every matching note is excluded, and Edit excludes opens the panel on the first excludes switch', async () => {
		mockTaskFetch(vault());
		tasksStore.setSources([{ clauses: [{ kind: 'folder', path: '_system' }] }]);
		({ component } = await mountTasksView());
		await until(() => expect(paragraph('Every matching note is excluded')).toBeDefined());
		const edit = only('button', 'Edit');

		only('button', 'Edit excludes').click();
		flushSync();

		expect(edit.getAttribute('aria-expanded')).toBe('true');
		expect(document.getElementById(edit.getAttribute('aria-controls')!)).not.toBeNull();
		expect(document.activeElement).toBe(only('switch', 'Archived notes'));
	});

	it('shows Clear only while sources is not empty, and Clear lists every non-excluded task', async () => {
		mockTaskFetch(vault());
		({ component } = await mountTasksView());
		await until(() => expect(paragraph('No task sits under a heading containing #to-list')).toBeDefined());
		expect(named('button', 'Clear')).toHaveLength(1);
		expect(named('button', 'Clear tag')).toHaveLength(0);

		only('button', 'Clear').click();
		flushSync();

		expect(tasksStore.query.sources).toEqual([]);
		expect(rowTexts()).toEqual(['home task', 'project task']);
		expect(paragraph(`Open tasks from every note${EXCEPT}`)).toBeDefined();
		expect(named('button', 'Clear')).toHaveLength(0);
	});

	it('shows no Clear and no Edit while Indexing tasks... shows', async () => {
		mockTaskFetch(() => new Promise(() => {}));
		// The first fetch never settles, so mountTasksView (which waits for it) is not used.
		vaultStore.markIndexReady();
		globalThis.ResizeObserver ??= class {
			observe() {}
			unobserve() {}
			disconnect() {}
		} as unknown as typeof ResizeObserver;
		const { default: TasksView } = await import('#lib/features/tasks/TasksView.svelte');
		component = mount(TasksView, {
			target: document.body.appendChild(document.createElement('div')),
			props: { onOpenWikilink: () => {} },
		});
		flushSync();

		expect(document.body.textContent).toContain('Indexing tasks...');
		expect(tasksStore.query.sources).not.toEqual([]);
		expect(named('button', 'Clear')).toHaveLength(0);
		expect(named('button', 'Edit')).toHaveLength(0);
	});

	it('keeps focus in a panel input when the first rows arrive and when the list changes', async () => {
		mockTaskFetch(vault());
		tasksStore.setSources([{ clauses: [{ kind: 'folder', path: '' }, { kind: 'type', type: 'None' }] }]);
		({ component } = await mountTasksView());
		await until(() => expect(paragraph('No note matches the sources')).toBeDefined());
		only('button', 'Edit').click();
		flushSync();
		const typeInput = only('textbox', 'Type');
		typeInput.focus();

		type(typeInput, '');
		await until(() => expect(rowTexts()).toEqual(['home task', 'project task']));
		expect(document.activeElement).toBe(typeInput);

		const folderInput = only('textbox', 'Folder');
		folderInput.focus();
		type(folderInput, 'Home');
		await until(() => expect(rowTexts()).toEqual(['home task']));
		expect(document.activeElement).toBe(folderInput);
	});

	it('lists a note tag card and a type card from the panel', async () => {
		const tagged: NoteEntryV2 = entryV2('/vault/Tagged.md', { tags: ['#client'], tasks: [taskV2('client task')] });
		const typed: NoteEntryV2 = entryV2('/vault/Meeting.md', { isA: 'Meeting', tasks: [taskV2('meeting task')] });
		mockTaskFetch(vault(), { entries: [tagged, typed] });
		tasksStore.setSources([]);
		({ component } = await mountTasksView());
		only('button', 'Edit').click();
		flushSync();

		only('button', 'Add card').click();
		flushSync();
		await addClause('Note tag');
		type(only('textbox', 'Note tag'), 'client');
		expect(rowTexts()).toEqual(['client task']);

		only('button', 'Add card').click();
		flushSync();
		await addClause('Type');
		type(only('textbox', 'Type'), 'meeting');
		expect(rowTexts()).toEqual(['meeting task', 'client task']);
	});

	it('lists only the tasks of notes whose frontmatter matches a property card, and exists hides the value field', async () => {
		const project = (name: string, status: string) =>
			entryV2(`/vault/Projects/${name}.md`, { frontmatter: { status }, tasks: [taskV2(`${status} project task`)] });
		mockTaskFetch(vault(), { entries: [project('Active', 'active'), project('Done', 'done')] });
		tasksStore.setSources([]);
		({ component } = await mountTasksView());
		only('button', 'Edit').click();
		flushSync();

		only('button', 'Add card').click();
		flushSync();
		await addClause('Property');
		type(only('textbox', 'Property key'), 'status');
		type(only('textbox', 'Property value'), 'Active');

		expect(rowTexts()).toEqual(['active project task']);
		expect(paragraph(`Open tasks from notes where status is Active${EXCEPT}`)).toBeDefined();
		expect(tasksStore.query.sources).toEqual([{ clauses: [{ kind: 'property', key: 'status', op: 'is', value: 'Active' }] }]);

		await openMenu(only('button', 'Operator: is'));
		const exists = Array.from(document.querySelectorAll<HTMLElement>('[role="menu"][data-state="open"] [role="menuitemradio"]')).find(
			(el) => el.textContent?.trim() === 'exists',
		);
		exists!.click();
		flushSync();

		expect(named('textbox', 'Property value')).toHaveLength(0);
		expect(rowTexts()).toEqual(['active project task', 'done project task']);
		expect(paragraph(`Open tasks from notes where status is set${EXCEPT}`)).toBeDefined();
	});

	it('lists the archived notes from a lifecycle card set to Archived, with no Not switch', async () => {
		const old = entryV2('/vault/Old.md', { archived: true, tasks: [taskV2('archived task')] });
		const organized = entryV2('/vault/Done.md', { organized: true, tasks: [taskV2('organized task')] });
		mockTaskFetch(vault(), { entries: [old, organized] });
		tasksStore.setSources([]);
		({ component } = await mountTasksView());
		only('button', 'Edit').click();
		flushSync();

		only('button', 'Add card').click();
		flushSync();
		await addClause('Lifecycle');
		expect(named('switch', 'Not')).toHaveLength(0);
		expect(rowTexts()).toEqual(['home task', 'project task']);

		await openMenu(only('button', 'State: Inbox'));
		const archived = Array.from(document.querySelectorAll<HTMLElement>('[role="menu"][data-state="open"] [role="menuitemradio"]')).find(
			(el) => el.textContent?.trim() === 'Archived',
		);
		archived!.click();
		flushSync();

		expect(tasksStore.query.sources).toEqual([{ clauses: [{ kind: 'lifecycle', state: 'archived' }] }]);
		expect(rowTexts()).toEqual(['archived task']);
		expect(paragraph('Open tasks from notes that are archived, except type definitions, templates, the system folder')).toBeDefined();
	});

	describe('value suggestions', () => {
		/** The texts of the open menu's items. */
		const menuItems = () =>
			Array.from(document.querySelectorAll<HTMLElement>('[role="menu"][data-state="open"] [role="menuitem"]')).map((el) => el.textContent?.trim());

		/** Clicks the open menu's item reading `text`. */
		function pick(text: string): void {
			const item = Array.from(document.querySelectorAll<HTMLElement>('[role="menu"][data-state="open"] [role="menuitem"]')).find(
				(el) => el.textContent?.trim() === text,
			);
			if (!item) throw new Error(`no ${text} item in the open menu`);
			item.click();
			flushSync();
		}

		it("picking a folder from a folder clause's suggestions sets the value and limits the list", async () => {
			mockTaskFetch(vault());
			tasksStore.setSources([]);
			({ component } = await mountTasksView());
			only('button', 'Edit').click();
			flushSync();
			only('button', 'Add card').click();
			flushSync();
			await addClause('Folder');
			expect(rowTexts()).toEqual(['home task', 'project task']);

			await openMenu(only('button', 'Suggestions'));
			// Every note with tasks, the excluded template included, and each parent folder.
			expect(menuItems()).toEqual(['_system', '_system/templates', 'Home', 'Projects']);
			pick('Projects');

			expect((only('textbox', 'Folder') as HTMLInputElement).value).toBe('Projects');
			expect(tasksStore.query.sources).toEqual([{ clauses: [{ kind: 'folder', path: 'Projects' }] }]);
			expect(rowTexts()).toEqual(['project task']);
		});

		it('lists the property keys, and the values seen for the chosen key', async () => {
			const project = (name: string, frontmatter: NoteEntryV2['frontmatter']) =>
				entryV2(`/vault/Projects/${name}.md`, { frontmatter, tasks: [taskV2(`${name} task`)] });
			mockTaskFetch(vault(), {
				entries: [project('A', { status: 'active', area: 'Home' }), project('B', { status: ['done', 'Active'] }), project('C', { area: 'Work' })],
			});
			tasksStore.setSources([]);
			({ component } = await mountTasksView());
			only('button', 'Edit').click();
			flushSync();
			only('button', 'Add card').click();
			flushSync();
			await addClause('Property');

			await openMenu(only('button', 'Key suggestions'));
			expect(menuItems()).toEqual(['area', 'status']);
			pick('status');
			expect((only('textbox', 'Property key') as HTMLInputElement).value).toBe('status');

			await openMenu(only('button', 'Suggestions'));
			expect(menuItems()).toEqual(['active', 'done']);
			pick('done');

			expect(tasksStore.query.sources).toEqual([{ clauses: [{ kind: 'property', key: 'status', op: 'is', value: 'done' }] }]);
			expect(rowTexts()).toEqual(['B task']);
		});

		it('says there is no suggestion for a key no note holds, and a typed value still applies', async () => {
			mockTaskFetch(vault());
			tasksStore.setSources([]);
			({ component } = await mountTasksView());
			only('button', 'Edit').click();
			flushSync();
			only('button', 'Add card').click();
			flushSync();
			await addClause('Folder');
			type(only('textbox', 'Folder'), 'Home');
			expect(rowTexts()).toEqual(['home task']);

			await addClause('Property');
			type(only('textbox', 'Property key'), 'nope');
			// The folder clause's button comes first; the property value's is the last.
			expect(named('button', 'Suggestions')).toHaveLength(2);
			await openMenu(named('button', 'Suggestions').at(-1)!);
			expect(menuItems()).toEqual(['No suggestions']);
		});
	});

	describe('group header actions', () => {
		/** The header buttons of the group keyed `key`, by their text. */
		const headerButtons = (key: string) =>
			Array.from(document.querySelectorAll<HTMLElement>(`[data-task-group-key="${key}"] [data-task-group-actions] button`)).map((b) =>
				b.textContent?.trim(),
			);
		const action = (key: string, name: string) => {
			const button = Array.from(
				document.querySelectorAll<HTMLElement>(`[data-task-group-key="${key}"] [data-task-group-actions] button`),
			).find((b) => b.textContent?.trim() === name);
			if (!button) throw new Error(`no ${name} in group ${key}`);
			return button;
		};
		/** A project task, a home task and a vault root task. */
		const folders = () => [...vault(), one('/vault/Root.md', 'root task')];

		it('Hide this folder removes the folder group and its tasks, and the sentence names the exclude', async () => {
			mockTaskFetch(folders());
			tasksStore.setSources([]);
			tasksStore.setGroupBy('folder');
			({ component } = await mountTasksView());
			expect(rowTexts()).toEqual(['root task', 'home task', 'project task']);
			expect(headerButtons('Projects')).toEqual(['Only this folder', 'Hide this folder']);

			action('Projects', 'Hide this folder').click();
			flushSync();

			expect(rowTexts()).toEqual(['root task', 'home task']);
			expect(document.querySelector('[data-task-group-key="Projects"]')).toBeNull();
			expect(tasksStore.query.exclude.folders).toEqual(['Projects']);
			expect(paragraph(`Open tasks from every note${EXCEPT}, folder Projects`)).toBeDefined();
		});

		it('Only this folder with no card adds one card holding the folder clause', async () => {
			mockTaskFetch(folders());
			tasksStore.setSources([]);
			tasksStore.setGroupBy('folder');
			({ component } = await mountTasksView());

			action('Home', 'Only this folder').click();
			flushSync();

			expect(rowTexts()).toEqual(['home task']);
			expect(tasksStore.query.sources).toEqual([{ clauses: [{ kind: 'folder', path: 'Home' }] }]);
			expect(paragraph(`Open tasks from notes in folder Home${EXCEPT}`)).toBeDefined();
		});

		it('ANDs Only this folder into the existing cards', async () => {
			const listed = (path: string, text: string) =>
				entryV2(path, { taskHeadings: [{ level: 2, text: 'Inbox #to-list', line: 1 }], tasks: [taskV2(text, { lineNumber: 2, heading: 0 })] });
			mockTaskFetch([], { entries: [listed('/vault/Projects/P.md', 'listed project task'), listed('/vault/Home/H.md', 'listed home task')] });
			tasksStore.setGroupBy('folder');
			({ component } = await mountTasksView());
			expect(rowTexts()).toEqual(['listed home task', 'listed project task']);

			action('Projects', 'Only this folder').click();
			flushSync();

			expect(rowTexts()).toEqual(['listed project task']);
			expect(paragraph(`Open tasks from notes under a heading tagged #to-list and in folder Projects${EXCEPT}`)).toBeDefined();
		});

		it('Hide this note removes the note group, and the sentence names its path', async () => {
			mockTaskFetch(folders());
			tasksStore.setSources([]);
			({ component } = await mountTasksView());
			expect(headerButtons('/vault/Projects/P.md')).toEqual(['Hide this note']);

			action('/vault/Projects/P.md', 'Hide this note').click();
			flushSync();

			expect(rowTexts()).toEqual(['home task', 'root task']);
			expect(tasksStore.query.exclude.notes).toEqual(['Projects/P.md']);
			expect(paragraph(`Open tasks from every note${EXCEPT}, note Projects/P.md`)).toBeDefined();
		});

		it('names the group each action targets, keeping the visible text in the name', async () => {
			mockTaskFetch(folders());
			tasksStore.setSources([]);
			tasksStore.setGroupBy('folder');
			({ component } = await mountTasksView());
			expect(action('Projects', 'Only this folder').getAttribute('aria-label')).toBe('Only this folder Projects');
			expect(action('Projects', 'Hide this folder').getAttribute('aria-label')).toBe('Hide this folder Projects');

			tasksStore.setGroupBy('note');
			flushSync();
			expect(action('/vault/Projects/P.md', 'Hide this note').getAttribute('aria-label')).toBe('Hide this note Projects/P.md');
		});

		/** A Project note, a Meeting note and an untyped note, one task each. */
		const typed = () => [
			entryV2('/vault/P.md', { isA: 'Project', tasks: [taskV2('project task')] }),
			entryV2('/vault/M.md', { isA: 'Meeting', tasks: [taskV2('meeting task')] }),
			entryV2('/vault/U.md', { tasks: [taskV2('untyped task')] }),
		];

		it('Hide this type removes the type group and its tasks, and the sentence names the exclude; No type has no actions', async () => {
			mockTaskFetch([], { entries: typed() });
			tasksStore.setSources([]);
			tasksStore.setGroupBy('type');
			({ component } = await mountTasksView());
			expect(rowTexts()).toEqual(['meeting task', 'project task', 'untyped task']);
			expect(headerButtons('Project')).toEqual(['Only this type', 'Hide this type']);
			expect(headerButtons('')).toEqual([]);
			expect(action('Project', 'Hide this type').getAttribute('aria-label')).toBe('Hide this type Project');

			action('Project', 'Hide this type').click();
			flushSync();

			expect(rowTexts()).toEqual(['meeting task', 'untyped task']);
			expect(document.querySelector('[data-task-group-key="Project"]')).toBeNull();
			expect(tasksStore.query.exclude.types).toEqual(['Project']);
			expect(paragraph(`Open tasks from every note${EXCEPT}, type Project`)).toBeDefined();
		});

		it('Only this type with no card adds one card holding the type clause', async () => {
			mockTaskFetch([], { entries: typed() });
			tasksStore.setSources([]);
			tasksStore.setGroupBy('type');
			({ component } = await mountTasksView());

			action('Meeting', 'Only this type').click();
			flushSync();

			expect(rowTexts()).toEqual(['meeting task']);
			expect(tasksStore.query.sources).toEqual([{ clauses: [{ kind: 'type', type: 'Meeting' }] }]);
		});

		it('gives the vault root folder group and the other groupings no actions', async () => {
			mockTaskFetch(folders());
			tasksStore.setSources([]);
			tasksStore.setGroupBy('folder');
			({ component } = await mountTasksView());
			expect(headerButtons('')).toEqual([]);

			tasksStore.setGroupBy('status');
			flushSync();
			expect(document.querySelectorAll('[data-task-group-actions]')).toHaveLength(0);
		});
	});
});
