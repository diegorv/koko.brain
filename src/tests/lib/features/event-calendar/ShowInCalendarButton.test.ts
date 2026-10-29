// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Tauri IPC and the toast are side effects; the stores and the
// event-calendar service stay real (CLAUDE.md rule 1).
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), dismiss: vi.fn() }),
}));

import { flushSync, mount, unmount } from 'svelte';
import { toast } from 'svelte-sonner';
import { invoke } from '@tauri-apps/api/core';
import { EVENT_CALENDAR_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import ShowInCalendarButton from '#lib/features/event-calendar/ShowInCalendarButton.svelte';
import { resetEventCalendar } from '#lib/features/event-calendar/event-calendar.service.js';
import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';
import { eventEntry } from '../../../fixtures/event-notes.fixture';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const VAULT = '/vault';
const P = (name: string) => `${VAULT}/${name}.md`;

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

/** Lets the lookup resolve, then flushes effects and the DOM. */
async function settle() {
	await new Promise((r) => setTimeout(r, 0));
	flushSync();
}

function mountButton(path: string) {
	component = mount(ShowInCalendarButton, { target, props: { path } });
	flushSync();
}

const BUTTON = () => target.querySelector<HTMLButtonElement>('[data-show-in-calendar]');

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	clearLocalStorage();
	invalidateVaultEntries();
	vaultStore._reset();
	vaultStore.open(VAULT);
	vaultStore.markIndexReady();
	settingsStore.reset();
	editorStore.reset();
	resetEventCalendar();
	vi.mocked(invoke).mockResolvedValue([
		eventEntry(P('Standup'), { date: '2026-11-10', start: '09:00', end: '10:00' }),
		entryV2(P('plain note')),
	]);
	target = document.body.appendChild(document.createElement('div'));
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});

describe('ShowInCalendarButton', () => {
	it('renders a labelled button for an event note', async () => {
		mountButton(P('Standup'));
		await settle();

		expect(BUTTON()?.getAttribute('aria-label')).toBe('Show in Calendar');
	});

	it('renders nothing for a note that is not an event', async () => {
		mountButton(P('plain note'));
		await settle();

		expect(BUTTON()).toBeNull();
	});

	it('renders nothing while the index is not ready, without reading it', async () => {
		vaultStore._reset();
		vaultStore.open(VAULT);
		mountButton(P('Standup'));
		await settle();

		expect(BUTTON()).toBeNull();
		expect(invoke).not.toHaveBeenCalled();
	});

	it('renders nothing when the lookup fails', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('index gone'));
		mountButton(P('Standup'));
		await settle();

		expect(BUTTON()).toBeNull();
	});

	it('appears after an index bump turns the note into an event', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([entryV2(P('Standup'))]);
		mountButton(P('Standup'));
		await settle();
		expect(BUTTON()).toBeNull();

		vaultStore.bumpVaultIndexVersion(2);
		flushSync();
		await settle();

		expect(BUTTON()).not.toBeNull();
	});

	it('a click opens the Calendar on the event day with a focus request', async () => {
		mountButton(P('Standup'));
		await settle();

		BUTTON()!.click();
		await settle();

		expect(editorStore.activeTab?.path).toBe(EVENT_CALENDAR_VIRTUAL_PATH);
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-10');
		expect(eventCalendarViewStore.focusRequest?.path).toBe(P('Standup'));
	});

	it('toasts and opens nothing when the note stopped being an event', async () => {
		mountButton(P('Standup'));
		await settle();
		// The index moved on, but the button has not re-resolved yet.
		vaultStore.bumpVaultIndexVersion(3);
		vi.mocked(invoke).mockResolvedValue([entryV2(P('Standup'))]);

		BUTTON()!.click();
		await settle();

		expect(toast.error).toHaveBeenCalledWith('This note is no longer a calendar event');
		expect(editorStore.tabs).toHaveLength(0);
	});

	it('toasts the error when the lookup fails on click', async () => {
		mountButton(P('Standup'));
		await settle();
		vaultStore.bumpVaultIndexVersion(4);
		vi.mocked(invoke).mockRejectedValue(new Error('index gone'));

		BUTTON()!.click();
		await settle();

		expect(toast.error).toHaveBeenCalledWith('Could not open the Calendar', { description: 'index gone' });
		expect(editorStore.tabs).toHaveLength(0);
	});
});
