// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// bits-ui Tooltip positions via @floating-ui/dom, which needs ResizeObserver.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// Tauri IPC, the editor's file opener and saver, the Trash move and the
// toast are side effects; the stores and the event-calendar service stay
// real (CLAUDE.md rule 1).
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
	saveFileByPath: vi.fn(async () => true),
}));

vi.mock('$lib/core/filesystem/fs.service', async () => {
	const actual = await vi.importActual<typeof import('$lib/core/filesystem/fs.service')>('$lib/core/filesystem/fs.service');
	return { ...actual, deleteItem: vi.fn(async () => true) };
});

vi.mock('svelte-sonner', () => ({
	toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

import { flushSync, mount, unmount } from 'svelte';
import { toast } from 'svelte-sonner';
import { invoke } from '@tauri-apps/api/core';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { invalidateVaultEntries } from '$lib/core/vault/vault-entries.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import EventCalendarView from '$lib/features/event-calendar/EventCalendarView.svelte';
import { resetEventCalendar } from '$lib/features/event-calendar/event-calendar.service';
import { toKey } from '$lib/features/event-calendar/event-calendar-dates.logic';
import { eventCalendarStore } from '$lib/features/event-calendar/event-calendar.store.svelte';
import { eventCalendarViewStore } from '$lib/features/event-calendar/event-calendar-view.store.svelte';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import { eventEntry } from '../../../fixtures/event-notes.fixture';

const VAULT = '/vault';
const P = (name: string) => `${VAULT}/${name}.md`;

/** A promise whose resolution the test controls. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

/** Lets pending loads resolve, then flushes effects and the DOM. */
async function settle() {
	await new Promise((r) => setTimeout(r, 0));
	flushSync();
}

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

function mountView() {
	component = mount(EventCalendarView, { target });
	flushSync();
}

function unmountView() {
	if (component) unmount(component);
	component = null;
	flushSync();
}

/** Text of the first element matching `selector`, trimmed. */
function text(selector: string): string {
	return target.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	clearLocalStorage();
	invalidateVaultEntries();
	vaultStore._reset();
	vaultStore.open(VAULT);
	vaultStore.markIndexReady();
	settingsStore.reset();
	resetEventCalendar();
	eventCalendarViewStore.setDate('2026-11-10');
	vi.mocked(invoke).mockResolvedValue([]);
	target = document.body.appendChild(document.createElement('div'));
});

afterEach(() => {
	unmountView();
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});

describe('EventCalendarView: header', () => {
	it('shows the range title and the week subtitle', async () => {
		mountView();
		await settle();

		expect(text('[data-calendar-title]')).toBe('November, 2026');
		expect(text('[data-calendar-subtitle]')).toContain('Week 46');
	});

	it('renders the D/W/M control as a tablist with the selected view', async () => {
		mountView();
		await settle();

		const tablist = target.querySelector('[role="tablist"]')!;
		expect(tablist.getAttribute('aria-label')).toBe('Calendar view');
		const tabs = [...tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
		expect(tabs.map((t) => t.textContent?.trim())).toEqual(['D', 'W', 'M']);
		expect(tabs.map((t) => t.getAttribute('aria-keyshortcuts'))).toEqual(['D', 'W', 'M']);
		expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);

		tabs[0].click();
		flushSync();

		expect(eventCalendarViewStore.view).toBe('day');
		expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
	});

	it('moves between the tabs with ArrowLeft and ArrowRight, wrapping', async () => {
		mountView();
		await settle();
		const tabs = () => [...target.querySelectorAll<HTMLButtonElement>('[role="tab"]')];

		tabs()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		flushSync();
		expect(eventCalendarViewStore.view).toBe('month');
		expect(document.activeElement).toBe(tabs()[2]);

		tabs()[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		flushSync();
		expect(eventCalendarViewStore.view).toBe('day');

		tabs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
		flushSync();
		expect(eventCalendarViewStore.view).toBe('month');
	});

	it('steps the range with prev / next and returns with Today', async () => {
		mountView();
		await settle();

		target.querySelector<HTMLButtonElement>('[aria-label="Next week"]')!.click();
		flushSync();
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-17');

		target.querySelector<HTMLButtonElement>('[aria-label="Previous week"]')!.click();
		target.querySelector<HTMLButtonElement>('[aria-label="Previous week"]')!.click();
		flushSync();
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-03');
	});
});

describe('EventCalendarView: loading', () => {
	it('shows "Indexing vault..." and does not load while the index is not ready', async () => {
		vaultStore._reset();
		vaultStore.open(VAULT);
		mountView();
		await settle();

		expect(target.textContent).toContain('Indexing vault...');
		expect(invoke).not.toHaveBeenCalled();
	});

	it('loads on mount and shows the empty time grid in week view', async () => {
		mountView();
		await settle();

		expect(invoke).toHaveBeenCalledWith('get_all_vault_entries_v2');
		expect(target.querySelector('[data-time-grid]')).not.toBeNull();
		expect(target.querySelectorAll('[data-day-column]')).toHaveLength(7);
		expect(target.querySelector('[data-calendar-issues]')).toBeNull();
	});

	it('shows one day column in day view and the month grid in month view', async () => {
		mountView();
		await settle();

		eventCalendarViewStore.setView('day');
		flushSync();
		expect(target.querySelectorAll('[data-day-column]')).toHaveLength(1);
		expect(target.querySelector('[data-day-column]')?.getAttribute('data-day-column')).toBe('2026-11-10');

		eventCalendarViewStore.setView('month');
		flushSync();
		expect(target.querySelector('[data-time-grid]')).toBeNull();
		expect(target.querySelector('[data-month-grid]')).not.toBeNull();
		expect(target.querySelectorAll('[data-month-cell]')).toHaveLength(42);
	});

	it('renders a loaded event on the grid', async () => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:00' })]);
		mountView();
		await settle();

		const block = target.querySelector(`[data-day-column="2026-11-10"] [data-event-path="${P('Standup')}"]`);
		expect(block?.getAttribute('aria-label')).toBe('Standup, 09:00 – 10:00');
	});

	it('re-projects when defaultDurationMinutes changes, with no extra IPC', async () => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:00' })]);
		mountView();
		await settle();
		expect(eventCalendarStore.eventByPath(P('Standup'))?.end).toBe(600);

		settingsStore.updateEventCalendar({ defaultDurationMinutes: 30 });
		flushSync();
		await settle();

		expect(eventCalendarStore.eventByPath(P('Standup'))?.end).toBe(570);
		expect(vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'get_all_vault_entries_v2')).toHaveLength(1);
	});

	it('reloads on an index bump', async () => {
		mountView();
		await settle();
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Retro'), { date: '2026-11-11', start: '14:00' })]);

		vaultStore.bumpVaultIndexVersion(vaultStore.vaultIndexVersion + 1);
		flushSync();
		await settle();

		expect(eventCalendarStore.events.map((e) => e.path)).toEqual([P('Retro')]);
	});

	it('shows the inline error and toasts when the current load fails', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('boom'));
		mountView();
		await settle();

		expect(text('[data-calendar-load-error]')).toContain('boom');
		expect(toast.error).toHaveBeenCalledTimes(1);
	});

	it('does not toast for a load that a newer load replaced', async () => {
		const first = deferred<NoteEntryV2[]>();
		vi.mocked(invoke).mockReturnValueOnce(first.promise).mockResolvedValue([]);
		mountView();
		flushSync();

		vaultStore.bumpVaultIndexVersion(vaultStore.vaultIndexVersion + 1);
		flushSync();
		await settle();
		first.reject(new Error('stale'));
		await settle();

		expect(toast.error).not.toHaveBeenCalled();
		expect(eventCalendarStore.loadError).toBeNull();
	});

	it('toasts once when a remount shares the failing in-flight load', async () => {
		const first = deferred<NoteEntryV2[]>();
		vi.mocked(invoke).mockReturnValueOnce(first.promise);
		mountView();
		unmountView();
		mountView();
		first.reject(new Error('boom'));
		await settle();

		expect(vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'get_all_vault_entries_v2')).toHaveLength(1);
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(text('[data-calendar-load-error]')).toContain('boom');
	});

	it('does not toast for a load that a same-vault reset discarded', async () => {
		const first = deferred<NoteEntryV2[]>();
		vi.mocked(invoke).mockReturnValueOnce(first.promise);
		mountView();

		resetEventCalendar();
		first.reject(new Error('stale'));
		await settle();

		expect(toast.error).not.toHaveBeenCalled();
		expect(eventCalendarStore.loadError).toBeNull();
	});
});

describe('EventCalendarView: needs attention', () => {
	it('lists an actionable issue with its title and reason and opens its note', async () => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Broken'), { date: '2026-11-10', start: 'later' })]);
		mountView();
		await settle();

		expect(text('[data-attention-badge]')).toBe('1 event needs attention');
		const row = target.querySelector<HTMLButtonElement>('[data-attention-list] [data-issue-path]')!;
		expect(row.querySelector('[data-issue-title]')?.textContent).toBe('Broken');
		expect(row.querySelector('[data-issue-reason]')?.textContent).toBe('start is not a valid time (HH:mm)');

		row.click();

		expect(openFileInEditor).toHaveBeenCalledWith(P('Broken'));
	});

	it('counts only actionable issues and keeps 50 unscheduled notes collapsed', async () => {
		const unscheduled = Array.from({ length: 50 }, (_, i) => eventEntry(P(`Someday ${i}`)));
		vi.mocked(invoke).mockResolvedValue([...unscheduled, eventEntry(P('Broken'), { date: '2026-11-10', start: '25:00' })]);
		mountView();
		await settle();

		expect(eventCalendarStore.attentionCount).toBe(1);
		expect(text('[data-attention-badge]')).toBe('1 event needs attention');
		expect(target.querySelectorAll('[data-attention-list] [data-issue-path]')).toHaveLength(1);
		const details = target.querySelector<HTMLDetailsElement>('details[data-unscheduled]')!;
		expect(details.open).toBe(false);
		expect(details.querySelector('summary')?.textContent).toBe('Unscheduled (50)');
		expect(details.querySelectorAll('[data-issue-path]')).toHaveLength(50);
		expect(details.querySelector('[data-issue-reason]')?.textContent).toBe(
			'add `date:` (and `start` / `end` for a timed event)',
		);
	});

	it('shows only a quiet "N unscheduled" link when nothing is actionable', async () => {
		vi.mocked(invoke).mockResolvedValue([
			eventEntry(P('Someday')),
			eventEntry(P('Bad date'), { date: '10/11/2026' }),
		]);
		mountView();
		await settle();

		expect(target.querySelector('[data-attention-badge]')).toBeNull();
		const link = target.querySelector<HTMLButtonElement>('[data-unscheduled] button')!;
		expect(link.textContent?.trim()).toBe('2 unscheduled');
		expect(target.querySelector('[data-unscheduled-list]')).toBeNull();

		link.click();
		flushSync();

		const reasons = [...target.querySelectorAll('[data-unscheduled-list] [data-issue-reason]')].map((r) => r.textContent);
		expect(reasons).toContain('date is not YYYY-MM-DD');
	});

	it('shows the archived footer when archived events are hidden', async () => {
		vi.mocked(invoke).mockResolvedValue([
			eventEntry(P('Done'), { date: '2026-11-01', start: '09:00' }, { archived: true }),
			eventEntry(P('Done too'), { date: '2026-11-02', start: '09:00' }, { archived: true }),
		]);
		mountView();
		await settle();

		expect(text('[data-archived-footer]')).toBe('2 archived events hidden');
	});
});

describe('EventCalendarView: popover', () => {
	const STANDUP = () => target.querySelector<HTMLElement>(`[data-day-column="2026-11-10"] [data-event-path="${P('Standup')}"]`)!;

	/** Lets bits-ui finish mounting or unmounting the popover. */
	async function settlePopover() {
		await settle();
		await new Promise((r) => setTimeout(r, 0));
		flushSync();
	}

	beforeEach(() => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:00' })]);
	});

	it('shows the popover for a clicked block and returns focus to it on Escape', async () => {
		mountView();
		await settle();

		STANDUP().click();
		await settlePopover();
		const card = document.querySelector('[data-event-popover]');
		expect(card?.querySelector('[data-popover-title]')?.textContent?.trim()).toBe('Standup');

		document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await settlePopover();

		expect(document.querySelector('[data-event-popover]')).toBeNull();
		expect(document.activeElement).toBe(STANDUP());
	});

	it('closes on a scroll of the time grid inside the view', async () => {
		mountView();
		await settle();
		STANDUP().click();
		await settlePopover();

		target.querySelector('[data-time-grid]')!.dispatchEvent(new Event('scroll'));

		expect(eventCalendarViewStore.popover).toBeNull();
	});

	it('focuses the view root when the event leaves the snapshot', async () => {
		mountView();
		await settle();
		STANDUP().click();
		await settlePopover();

		eventCalendarStore.setSnapshot({ events: [], issues: [], archivedCount: 0 }, 99);
		await settlePopover();

		expect(document.activeElement).toBe(target.querySelector('section[data-event-calendar]'));
	});

	it('"Edit" in the popover opens the edit dialog, and Escape returns focus to the block', async () => {
		mountView();
		await settle();
		STANDUP().click();
		await settlePopover();

		const edit = [...document.querySelectorAll<HTMLButtonElement>('[data-event-popover] button')].find((b) => b.textContent?.trim() === 'Edit')!;
		edit.click();
		await settlePopover();

		const dialog = document.querySelector('[data-event-dialog]');
		expect(document.querySelector('[data-event-popover]')).toBeNull();
		expect(dialog?.querySelector<HTMLInputElement>('[data-field="title"]')?.value).toBe('Standup');
		expect(dialog?.contains(document.activeElement)).toBe(true);

		document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await settlePopover();

		expect(document.querySelector('[data-event-dialog]')).toBeNull();
		expect(document.activeElement).toBe(STANDUP());
	});

	it('drops an open popover on unmount', async () => {
		mountView();
		await settle();
		STANDUP().click();
		await settlePopover();
		expect(eventCalendarViewStore.popover?.path).toBe(P('Standup'));

		unmountView();

		expect(eventCalendarViewStore.popover).toBeNull();
	});
});

describe('EventCalendarView: keyboard', () => {
	const ROOT = () => target.querySelector<HTMLElement>('section[data-event-calendar]')!;
	const STANDUP = () => target.querySelector<HTMLElement>(`[data-day-column="2026-11-10"] [data-event-path="${P('Standup')}"]`)!;

	/** Dispatches a bubbling keydown on `el` and flushes. */
	function press(el: Element, key: string, mods: KeyboardEventInit = {}) {
		el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...mods }));
		flushSync();
	}

	/** Lets bits-ui finish mounting or unmounting the popover. */
	async function settlePopover() {
		await settle();
		await new Promise((r) => setTimeout(r, 0));
		flushSync();
	}

	it('focuses the view root on mount', async () => {
		mountView();
		await settle();

		expect(document.activeElement).toBe(ROOT());
	});

	it('Cmd+Z with an empty stack shows "Nothing to undo"', async () => {
		mountView();
		await settle();

		press(ROOT(), 'z', { metaKey: true });
		await settle();

		expect(toast).toHaveBeenCalledWith('Nothing to undo');
	});

	it('Shift+Cmd+Z and Ctrl+Y with an empty stack show "Nothing to redo"', async () => {
		mountView();
		await settle();

		press(ROOT(), 'z', { metaKey: true, shiftKey: true });
		press(ROOT(), 'y', { ctrlKey: true });
		await settle();

		expect(vi.mocked(toast).mock.calls).toEqual([['Nothing to redo'], ['Nothing to redo']]);
	});

	it('T, D/W/M and the arrows drive the view store, once per key', async () => {
		mountView();
		await settle();

		press(ROOT(), 'ArrowRight');
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-17');
		press(ROOT(), 'ArrowLeft');
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-10');
		press(ROOT(), 'd');
		expect(eventCalendarViewStore.view).toBe('day');
		press(ROOT(), 'm');
		expect(eventCalendarViewStore.view).toBe('month');
		press(ROOT(), 'w');
		expect(eventCalendarViewStore.view).toBe('week');
		press(ROOT(), 't');
		expect(eventCalendarViewStore.focusedDate).toBe(toKey(new Date()));
	});

	it('leaves the arrows to the D/W/M tablist', async () => {
		mountView();
		await settle();
		const weekTab = target.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1];

		press(weekTab, 'ArrowRight');

		expect(eventCalendarViewStore.view).toBe('month');
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-10');
	});

	it('N opens the create dialog, and letters do nothing while it is open', async () => {
		mountView();
		await settle();

		press(ROOT(), 'n');
		expect(eventCalendarViewStore.dialog?.mode).toBe('create');

		press(ROOT(), 'm');
		expect(eventCalendarViewStore.view).toBe('week');
	});

	it('ignores letters held with Meta', async () => {
		mountView();
		await settle();

		press(ROOT(), 'm', { metaKey: true });

		expect(eventCalendarViewStore.view).toBe('week');
	});

	it('after Escape on an open popover the block has focus and "w" switches to week', async () => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:00' })]);
		mountView();
		await settle();
		press(ROOT(), 'd');
		STANDUP().click();
		await settlePopover();
		expect(document.querySelector('[data-event-popover]')).not.toBeNull();

		press(document.activeElement!, 'Escape');
		await settlePopover();

		expect(document.querySelector('[data-event-popover]')).toBeNull();
		expect(document.activeElement).toBe(STANDUP());
		press(document.activeElement!, 'w');
		expect(eventCalendarViewStore.view).toBe('week');
	});

	it('Escape on the focused block closes an open popover', async () => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:00' })]);
		mountView();
		await settle();
		eventCalendarViewStore.openPopover(P('Standup'), { x: 0, y: 0, width: 1, height: 1 });
		flushSync();

		press(STANDUP(), 'Escape');

		expect(eventCalendarViewStore.popover).toBeNull();
	});

	it('handles a key on <body> but not one in an <input>', async () => {
		mountView();
		await settle();
		ROOT().blur();
		expect(document.activeElement).toBe(document.body);

		press(document.body, 'm');
		expect(eventCalendarViewStore.view).toBe('month');

		const input = document.body.appendChild(document.createElement('input'));
		input.focus();
		press(input, 'w');
		expect(eventCalendarViewStore.view).toBe('month');
	});

	it('ignores a letter typed in an input inside the view', async () => {
		mountView();
		await settle();
		const input = ROOT().appendChild(document.createElement('input'));

		press(input, 'd');

		expect(eventCalendarViewStore.view).toBe('week');
	});

	it('Delete on a focused block deletes that event', async () => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:00' })]);
		mountView();
		await settle();
		STANDUP().focus();

		press(STANDUP(), 'Delete');
		await settlePopover();

		expect(toast).toHaveBeenCalledWith('Event deleted', { description: 'Standup', action: { label: 'Undo', onClick: expect.any(Function) } });
		expect(eventCalendarStore.history.undo.at(-1)).toMatchObject({ kind: 'delete', path: P('Standup') });
		expect(document.activeElement).toBe(ROOT());
	});

	it('Delete with the popover open deletes the popover event and leaves focus on the root', async () => {
		vi.mocked(invoke).mockResolvedValue([
			eventEntry(P('Standup'), { date: '2026-11-10', start: '09:00' }),
			eventEntry(P('Retro'), { date: '2026-11-11', start: '14:00' }),
		]);
		mountView();
		await settle();
		STANDUP().click();
		await settlePopover();
		expect(document.querySelector('[data-event-popover]')).not.toBeNull();

		press(ROOT(), 'Delete');
		await settlePopover();

		expect(document.querySelector('[data-event-popover]')).toBeNull();
		expect(toast).toHaveBeenCalledWith('Event deleted', expect.objectContaining({ description: 'Standup' }));
		expect(eventCalendarStore.history.undo.at(-1)).toMatchObject({ kind: 'delete', path: P('Standup') });
		expect(document.activeElement).toBe(ROOT());
	});

	it('Backspace with no focused block and no popover does nothing', async () => {
		vi.mocked(invoke).mockResolvedValue([eventEntry(P('Standup'), { date: '2026-11-10', start: '09:00' })]);
		mountView();
		await settle();
		const e = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });

		ROOT().dispatchEvent(e);
		await settle();

		expect(e.defaultPrevented).toBe(false);
		expect(toast).not.toHaveBeenCalled();
		expect(eventCalendarStore.history.undo).toHaveLength(0);
		expect(STANDUP()).not.toBeNull();
	});

	it('removes the <body> listener on unmount', async () => {
		mountView();
		await settle();
		unmountView();

		press(document.body, 'm');

		expect(eventCalendarViewStore.view).toBe('week');
	});
});

describe('EventCalendarView: lifecycle', () => {
	it('closes the popover and the dialog on unmount', async () => {
		eventCalendarViewStore.openPopover(P('a'), { x: 1, y: 2, width: 3, height: 4 });
		eventCalendarViewStore.openDialog({ mode: 'edit', path: P('a') });
		mountView();
		unmountView();
		mountView();

		expect(eventCalendarViewStore.popover).toBeNull();
		expect(eventCalendarViewStore.dialog).toBeNull();
	});

	it('holds the clock while mounted', async () => {
		eventCalendarViewStore.setNow(0);
		mountView();

		expect(eventCalendarViewStore.nowMs).toBeGreaterThan(0);
	});

	it('releases the clock on unmount', async () => {
		vi.useFakeTimers();
		try {
			mountView();
			unmountView();
			eventCalendarViewStore.setNow(0);

			vi.advanceTimersByTime(61_000);
			window.dispatchEvent(new Event('focus'));

			expect(eventCalendarViewStore.nowMs).toBe(0);
		} finally {
			vi.useRealTimers();
		}
	});
});
