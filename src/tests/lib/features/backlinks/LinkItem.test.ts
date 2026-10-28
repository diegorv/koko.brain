// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Opening a note reads the file over Tauri; the "Show in Calendar" lookup
// reads the vault entries over Tauri IPC. Stores stay real (CLAUDE.md rule 1).
vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { flushSync, mount, unmount } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { EVENT_CALENDAR_VIRTUAL_PATH } from '$lib/core/editor/editor.logic';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { invalidateVaultEntries } from '$lib/core/vault/vault-entries.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import LinkItem from '$lib/features/backlinks/LinkItem.svelte';
import type { BacklinkEntry } from '$lib/features/backlinks/backlinks.types';
import { resetEventCalendar } from '$lib/features/event-calendar/event-calendar.service';
import { eventCalendarViewStore } from '$lib/features/event-calendar/event-calendar-view.store.svelte';
import { eventEntry } from '../../../fixtures/event-notes.fixture';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const STANDUP = '/vault/Events/Standup.md';
const PLAIN = '/vault/plain.md';

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

/** A backlink entry from `sourcePath` with one snippet. */
function entry(sourcePath: string, sourceName: string): BacklinkEntry {
	return { sourcePath, sourceName, snippets: [{ text: 'see [[Roadmap]]', linkStart: 4, linkEnd: 15 }] };
}

/** Mounts the item and lets the calendar lookup resolve. */
async function mountItem(e: BacklinkEntry): Promise<void> {
	component = mount(LinkItem, { target, props: { entry: e } });
	flushSync();
	await new Promise((r) => setTimeout(r, 0));
	flushSync();
}

beforeEach(() => {
	vi.clearAllMocks();
	clearLocalStorage();
	invalidateVaultEntries();
	vaultStore._reset();
	vaultStore.open('/vault');
	vaultStore.markIndexReady();
	editorStore.reset();
	resetEventCalendar();
	vi.mocked(invoke).mockResolvedValue([
		eventEntry(STANDUP, { date: '2026-11-12', all_day: 'true' }),
		entryV2(PLAIN),
	]);
	target = document.body.appendChild(document.createElement('div'));
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
	editorStore.reset();
});

describe('LinkItem', () => {
	it('renders the source name and the highlighted link snippet; a click opens the source', async () => {
		await mountItem(entry(PLAIN, 'plain'));

		expect(target.textContent).toContain('plain');
		expect(target.querySelector('.font-semibold')?.textContent).toBe('[[Roadmap]]');
		target.querySelector('button')!.click();
		expect(openFileInEditor).toHaveBeenCalledWith(PLAIN);
	});

	it('offers no calendar action when the source is not an event', async () => {
		await mountItem(entry(PLAIN, 'plain'));
		expect(target.querySelector('[data-show-in-calendar]')).toBeNull();
	});

	it('offers the calendar action when the source is an event and opens its day', async () => {
		await mountItem(entry(STANDUP, 'Standup'));
		const action = target.querySelector<HTMLButtonElement>('[data-show-in-calendar]');
		expect(action?.getAttribute('aria-label')).toBe('Show in Calendar');

		action!.click();
		await new Promise((r) => setTimeout(r, 0));

		expect(openFileInEditor).not.toHaveBeenCalled();
		expect(editorStore.activeTab?.path).toBe(EVENT_CALENDAR_VIRTUAL_PATH);
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-12');
		expect(eventCalendarViewStore.focusRequest?.path).toBe(STANDUP);
	});
});
