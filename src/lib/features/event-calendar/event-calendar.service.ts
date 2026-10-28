/**
 * Read side of the Calendar tab: projects the vault entries snapshot into
 * `eventCalendarStore`, opens and closes the singleton Calendar tab, runs the
 * clock that keeps "today" current, and resets the two event-calendar stores.
 */

import { EVENT_CALENDAR_VIRTUAL_PATH, findTabIndex } from '$lib/core/editor/editor.logic';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { getVaultEntries } from '$lib/core/vault/vault-entries.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { error } from '$lib/utils/debug';
import { eventsFromEntries } from './event-calendar-event.logic';
import { eventCalendarStore } from './event-calendar.store.svelte';
import { eventCalendarViewStore } from './event-calendar-view.store.svelte';
import type { CalendarViewMode } from './event-calendar.types';

/** How often the mounted view's clock re-reads the system time. */
const CLOCK_INTERVAL_MS = 30_000;

/** Bumped by every load and every reset; a load writes only while it still holds the latest value. */
let loadToken = 0;

/** Number of live clock acquirers. */
let clockRefs = 0;
/** Interval of the running clock, or null while nobody holds it. */
let clockTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Projects the current vault entries snapshot into `eventCalendarStore`.
 * Latest wins: a result that lands after a newer load, a reset or a vault
 * switch is discarded; a load stale only by a vault switch still clears
 * `isLoading`. The snapshot is memoized per index version, so a
 * re-projection after a settings change costs no IPC.
 * @throws the IPC error, after logging it and setting `loadError`; events
 *   are left untouched
 */
export async function loadEvents(): Promise<void> {
	const token = ++loadToken;
	const vaultPath = vaultStore.path;
	const version = vaultStore.vaultIndexVersion;
	const isCurrent = () => token === loadToken && vaultStore.path === vaultPath;
	eventCalendarStore.setLoading(true);
	try {
		const entries = await getVaultEntries();
		if (!isCurrent()) {
			// Stale by vault switch only: no newer load or reset owns the flag.
			if (token === loadToken) eventCalendarStore.setLoading(false);
			return;
		}
		const settings = settingsStore.eventCalendar;
		const projection = eventsFromEntries(entries, {
			defaults: { defaultDurationMinutes: settings.defaultDurationMinutes, defaultColor: settings.defaultColor },
			typeName: settings.eventTypeName,
			vaultPath,
			systemFolder: settingsStore.templates.systemFolder,
		});
		eventCalendarStore.setSnapshot(projection, version);
		eventCalendarStore.setLoadError(null);
		eventCalendarStore.setLoading(false);
	} catch (err) {
		error('EVENT-CALENDAR', 'loadEvents failed:', err);
		if (isCurrent()) {
			eventCalendarStore.setLoadError(err instanceof Error ? err.message : String(err));
			eventCalendarStore.setLoading(false);
		} else if (token === loadToken) {
			eventCalendarStore.setLoading(false);
		}
		throw err;
	}
}

/**
 * Opens or focuses the Calendar tab, creating it when absent.
 * @param options.date - day key to show; moves the view store there (closes the popover)
 * @param options.view - view to show; switches the view store (closes the popover)
 */
export function openEventCalendarTab(options: { date?: string; view?: CalendarViewMode } = {}): void {
	if (options.date !== undefined) eventCalendarViewStore.setDate(options.date);
	if (options.view !== undefined) eventCalendarViewStore.setView(options.view);
	const existingIndex = findTabIndex(editorStore.tabs, EVENT_CALENDAR_VIRTUAL_PATH);
	if (existingIndex >= 0) {
		editorStore.setActiveIndex(existingIndex);
		return;
	}
	editorStore.addTab({
		path: EVENT_CALENDAR_VIRTUAL_PATH,
		name: 'Calendar',
		content: '',
		savedContent: '',
		fileType: 'event-calendar',
	});
}

/** Closes the Calendar tab if it exists. */
export function closeEventCalendarTab(): void {
	const index = findTabIndex(editorStore.tabs, EVENT_CALENDAR_VIRTUAL_PATH);
	if (index >= 0) {
		editorStore.removeTab(index);
	}
}

/** Toggles the Calendar tab: opens if closed, closes if active, focuses if open but not active. */
export function toggleEventCalendarTab(): void {
	const existingIndex = findTabIndex(editorStore.tabs, EVENT_CALENDAR_VIRTUAL_PATH);
	if (existingIndex < 0) {
		openEventCalendarTab();
	} else if (existingIndex === editorStore.activeIndex) {
		editorStore.removeTab(existingIndex);
	} else {
		editorStore.setActiveIndex(existingIndex);
	}
}

/** Sets the view store's clock to the current system time. */
function tick(): void {
	eventCalendarViewStore.setNow(Date.now());
}

/**
 * Holds the calendar clock, which keeps `eventCalendarViewStore.nowMs`
 * current across midnight and sleep: a tick on first acquire, every 30 s,
 * and on window `focus` and document `visibilitychange`. Ref-counted; the
 * last release stops it. The mounted view owns it and no reset touches it.
 * @returns an idempotent release
 */
export function acquireCalendarClock(): () => void {
	if (clockRefs === 0) {
		tick();
		clockTimer = setInterval(tick, CLOCK_INTERVAL_MS);
		window.addEventListener('focus', tick);
		document.addEventListener('visibilitychange', tick);
	}
	clockRefs += 1;
	let released = false;
	return () => {
		if (released) return;
		released = true;
		clockRefs = Math.max(0, clockRefs - 1);
		if (clockRefs > 0) return;
		if (clockTimer !== null) clearInterval(clockTimer);
		clockTimer = null;
		window.removeEventListener('focus', tick);
		document.removeEventListener('visibilitychange', tick);
	};
}

/**
 * Resets the two event-calendar stores and discards any load in flight.
 * Leaves the clock and the editor tabs alone.
 */
export function resetEventCalendar(): void {
	loadToken += 1;
	eventCalendarStore.reset();
	eventCalendarViewStore.reset();
}
