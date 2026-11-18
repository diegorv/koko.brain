// @vitest-environment jsdom
// Today's My people over the real stores, the real logic and the real note
// creator: only the Tauri boundaries, the editor open, the tree refresh and the
// toast are mocked, so New 1:1 is checked on the content `create_note` writes.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/plugin-fs', () => ({ readDir: vi.fn(), exists: vi.fn(), readTextFile: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('#lib/core/editor/editor.service.js', () => ({ openFileInEditor: vi.fn() }));
vi.mock('#lib/core/editor/editor.hooks.js', () => ({ markRecentSave: vi.fn(), notifyNoteCreated: vi.fn() }));
vi.mock('#lib/core/filesystem/fs.service.js', () => ({ addToTree: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('#lib/utils/debug.js', () => ({ debug: vi.fn(), error: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import { exists } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { settingsPanelStore } from '#lib/core/settings/settings-panel.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import MyPeopleSection from '#lib/plugins/one-on-one/MyPeopleSection.svelte';
import { MY_PEOPLE_SECTION_ID, registerOneOnOneTodaySection } from '#lib/plugins/one-on-one/one-on-one-today.service.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const PEOPLE = '/vault/Work/_people';
const NOW = new Date(2026, 10, 1, 10, 0, 0);
const ANA_NOTE = '/vault/_notes/2026/11-Nov/-1on1-Ana-01-11-2026.md';

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

const person = (name: string) => entryV2(`${PEOPLE}/${name}.md`, { isA: 'Person', frontmatter: { _one_on_one_every: true } });
const oneOnOne = (path: string, name: string, date: string) => entryV2(path, { relatedTo: [name], frontmatter: { date, kind: 'one-on-one' } });

describe('MyPeopleSection', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	async function mountSection() {
		component = mount(MyPeopleSection, { target });
		await settle();
	}

	function rowEl(name: string): HTMLElement {
		const el = target.querySelector<HTMLElement>(`[data-my-people-row="${name}"]`);
		if (!el) throw new Error(`no row for ${name}`);
		return el;
	}

	const names = () => [...target.querySelectorAll<HTMLElement>('[data-my-people-row]')].map((el) => el.dataset.myPeopleRow);
	const days = (name: string) => rowEl(name).querySelector<HTMLElement>('[data-my-people-days]')!;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		clearAllIndexed();
		vaultStore._reset();
		vaultStore.open('/vault');
		settingsStore.reset();
		settingsPanelStore._reset();
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });
		editorStore.reset();
		typeDefinitionsStore.reset();
		railRegistryStore.reset();
		settingsStore.updatePeriodicNotes({ folder: '_notes' });
		settingsStore.updateOneOnOne({ templatePath: '' });
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(NOW);
		eventCalendarViewStore.setNow(NOW.getTime());
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(invoke).mockResolvedValue(undefined);
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		vi.useRealTimers();
	});

	it('lists the work people with the days since their last 1:1, never first', async () => {
		typeDefinitionsStore.setEntries([
			person('Ana'),
			person('Bruno'),
			entryV2('/vault/Personal/_people/Mom.md'),
			oneOnOne('/vault/m/a.md', 'Ana', '2026-10-27'),
			// A body mention in a daily note is not a 1:1.
			entryV2('/vault/_notes/2026-10-31.md', {
				frontmatter: { date: '2026-10-31' },
				outgoingLinks: [{ target: 'Bruno', alias: null, heading: null, position: 0 }],
			}),
		]);
		await mountSection();

		expect(names()).toEqual(['Bruno', 'Ana']);
		expect(days('Ana').textContent?.trim()).toBe('5d ago');
		expect(days('Bruno').textContent?.trim()).toBe('never');
	});

	it('flags with the warning token past dueAfterDays, and follows the setting live', async () => {
		typeDefinitionsStore.setEntries([person('Ana'), person('Bruno'), oneOnOne('/vault/m/a.md', 'Ana', '2026-10-18')]);
		await mountSection();

		// Exactly 14 days: not flagged; never: flagged.
		expect(days('Ana').textContent?.trim()).toBe('14d ago');
		expect(days('Ana').classList.contains('text-warning')).toBe(false);
		expect(days('Ana').classList.contains('text-file-explorer-muted-fg')).toBe(true);
		expect(days('Bruno').classList.contains('text-warning')).toBe(true);

		settingsStore.updateOneOnOne({ dueAfterDays: 13 });
		await settle();
		expect(days('Ana').classList.contains('text-warning')).toBe(true);
		expect(days('Ana').dataset.overdue).toBe('true');
	});

	it('uses only theme tokens, never hard-coded colors', async () => {
		typeDefinitionsStore.setEntries([person('Ana')]);
		await mountSection();
		const classes = [...target.querySelectorAll<HTMLElement>('[class]')].map((el) => el.getAttribute('class')).join(' ');
		expect(classes).not.toMatch(/\b(?:text|bg)-(?:amber|yellow|red|gray|slate|zinc|neutral|sky|orange)-\d/);
		expect(target.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
	});

	it('rounds the row with the same 8px corner as the rail and the right-sidebar rows', async () => {
		typeDefinitionsStore.setEntries([person('Ana')]);
		await mountSection();
		expect(rowEl('Ana').classList).toContain('rounded-md');
		expect(rowEl('Ana').className).not.toMatch(/(^|\s)rounded(\s|$)/);
	});

	it('opens the person from the row', async () => {
		typeDefinitionsStore.setEntries([person('Ana')]);
		await mountSection();

		rowEl('Ana').querySelector<HTMLButtonElement>('[data-my-people-open]')!.click();
		expect(openFileInEditor).toHaveBeenCalledWith(`${PEOPLE}/Ana.md`);
	});

	it('New 1:1 creates the linked 1:1 and, once the index has it, the row reads today', async () => {
		typeDefinitionsStore.setEntries([person('Ana'), oneOnOne('/vault/m/a.md', 'Ana', '2026-10-01')]);
		await mountSection();
		expect(days('Ana').textContent?.trim()).toBe('31d ago');

		rowEl('Ana').querySelector<HTMLButtonElement>('[data-my-people-new]')!.click();
		await settle();

		const call = vi.mocked(invoke).mock.calls.find(([cmd]) => cmd === 'create_note');
		expect(call?.[1]).toMatchObject({ path: ANA_NOTE, content: '---\n_related_to: "[[Ana]]"\nkind: one-on-one\n---\n' });
		expect(openFileInEditor).toHaveBeenCalledWith(ANA_NOTE);
		expect(openFileInEditor).not.toHaveBeenCalledWith(`${PEOPLE}/Ana.md`);

		// The entries refresh after `vault-index-updated` carries the note Rust indexed:
		// `_related_to` parsed into `relatedTo`, `kind` kept in the frontmatter, no `date`,
		// so the disk creation time dates it.
		typeDefinitionsStore.setEntries([
			...typeDefinitionsStore.entries,
			entryV2(ANA_NOTE, { relatedTo: ['Ana'], frontmatter: { kind: 'one-on-one' }, createdAt: Math.floor(NOW.getTime() / 1000) }),
		]);
		await settle();
		expect(days('Ana').textContent?.trim()).toBe('today');
		expect(days('Ana').classList.contains('text-warning')).toBe(false);
	});

	it('shows a toast when New 1:1 fails, and leaves the row as it was', async () => {
		typeDefinitionsStore.setEntries([person('Ana')]);
		vi.mocked(invoke).mockImplementation(async (cmd) => {
			if (cmd === 'create_note') throw new Error('disk full');
			return undefined;
		});
		await mountSection();

		rowEl('Ana').querySelector<HTMLButtonElement>('[data-my-people-new]')!.click();
		await settle();
		expect(toast.error).toHaveBeenCalledWith('Failed to create 1:1 note.');
		expect(days('Ana').textContent?.trim()).toBe('never');
	});

	it('offers a setup button that opens the one-on-one Settings page when nobody is tracked', async () => {
		typeDefinitionsStore.setEntries([entryV2('/vault/Personal/_people/Mom.md'), entryV2(`${PEOPLE}/Bruno.md`, { isA: 'Person' })]);
		await mountSection();
		expect(names()).toEqual([]);
		const empty = target.querySelector<HTMLElement>('[data-my-people-empty]');
		expect(empty).not.toBeNull();
		expect(target.textContent).not.toContain('_one_on_one_every');
		expect(target.textContent).not.toContain('Work/_people');
		const setup = empty!.querySelector<HTMLButtonElement>('button');
		expect(setup?.textContent?.trim()).toBe('Set up 1:1 tracking');

		expect(settingsPanelStore.isOpen).toBe(false);
		setup!.click();
		flushSync();
		expect(settingsPanelStore.isOpen).toBe(true);
		expect(settingsPanelStore.activeSection).toBe('one-on-one');
	});

	it('marks overdue and never rows with an icon and hidden "Overdue" text, on-time rows with neither', async () => {
		typeDefinitionsStore.setEntries([
			person('Ana'),
			person('Bruno'),
			person('Caio'),
			oneOnOne('/vault/m/a.md', 'Ana', '2026-10-27'),
			oneOnOne('/vault/m/c.md', 'Caio', '2026-10-01'),
		]);
		await mountSection();

		const overdueIcon = (name: string) => rowEl(name).querySelector<SVGElement>('[data-my-people-overdue]');
		const srText = (name: string) => [...rowEl(name).querySelectorAll('.sr-only')].map((el) => el.textContent?.trim());

		for (const name of ['Bruno', 'Caio']) {
			expect(days(name).dataset.overdue).toBe('true');
			expect(overdueIcon(name)?.getAttribute('aria-hidden')).toBe('true');
			expect(overdueIcon(name)?.classList.contains('text-warning')).toBe(true);
			expect(srText(name)).toEqual(['Overdue']);
			// Inside the open button, so a Tab stop on the row announces it, not only browse mode.
			expect(rowEl(name).querySelector('[data-my-people-open] .sr-only')?.textContent?.trim()).toBe('Overdue');
		}
		expect(days('Ana').dataset.overdue).toBe('false');
		expect(overdueIcon('Ana')).toBeNull();
		expect(rowEl('Ana').textContent).not.toContain('Overdue');
	});

	it('draws one inset row ring for the open button, which drops its own outline', async () => {
		typeDefinitionsStore.setEntries([person('Ana')]);
		await mountSection();
		const row = rowEl('Ana');
		for (const cls of [
			'has-[[data-my-people-open]:focus-visible]:ring-2',
			'has-[[data-my-people-open]:focus-visible]:ring-ring/50',
			'has-[[data-my-people-open]:focus-visible]:ring-inset',
		]) {
			expect(row.classList).toContain(cls);
		}
		expect(row.querySelector('[data-my-people-open]')!.classList).toContain('focus-visible:outline-none');
		// New 1:1 keeps the UA outline as its single indicator; the row ring is scoped to the open button.
		expect(row.querySelector('[data-my-people-new]')!.className).not.toContain('outline-none');
	});

	it('registers as the My people Today section and unregisters', () => {
		const off = registerOneOnOneTodaySection();
		expect(railRegistryStore.todaySections).toEqual([{ id: MY_PEOPLE_SECTION_ID, label: 'My people', component: MyPeopleSection }]);
		off();
		expect(railRegistryStore.todaySections).toEqual([]);
	});
});
