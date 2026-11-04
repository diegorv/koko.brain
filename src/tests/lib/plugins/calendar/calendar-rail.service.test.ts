// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Opening or creating the note is the side effect; stores and logic stay real.
vi.mock('#lib/core/note-creator/note-creator.service.js', () => ({ openOrCreateNote: vi.fn() }));
vi.mock('#lib/core/editor/editor.service.js', () => ({ openFileInEditor: vi.fn() }));

import dayjs from 'dayjs';
import { openOrCreateNote } from '#lib/core/note-creator/note-creator.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';
import { newNoteRule, resolveLens, restoreRailItem } from '#lib/features/rail-shell/lens.logic.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { parseRailHidden, railItems } from '#lib/features/rail-shell/rail-items.logic.js';
import { registerCalendarRail } from '#lib/plugins/calendar/calendar-rail.service.js';
import { CALENDAR_RAIL_ITEM } from '#lib/plugins/calendar/day-lens.logic.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const DAY = '2026-10-27';
const dayProvider = () => railRegistryStore.lensProviders.find((p) => p.kind === 'day')!;

describe('registerCalendarRail', () => {
	let off: (() => void) | null = null;

	beforeEach(() => {
		clearLocalStorage();
		railRegistryStore.reset();
		settingsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		vi.mocked(openOrCreateNote).mockReset();
	});

	afterEach(() => {
		off?.();
		off = null;
	});

	it('registers the Calendar navigator and the day lens, and one call unregisters both', () => {
		off = registerCalendarRail();
		expect(railRegistryStore.navigators.map((n) => [n.id, n.label])).toEqual([['calendar', 'Calendar']]);
		expect(railRegistryStore.lensProviders.map((p) => p.kind)).toEqual(['day']);

		off();
		off = null;
		expect(railRegistryStore.navigators).toEqual([]);
		expect(railRegistryStore.lensProviders).toEqual([]);
	});

	it('the Calendar rail item shows the saved day, else today', () => {
		off = registerCalendarRail();
		expect(restoreRailItem('calendar', railRegistryStore.navigators)).toEqual({
			item: 'calendar',
			lens: { kind: 'day', target: eventCalendarViewStore.todayKey },
		});

		settingsStore.updateLayout({ railDay: DAY });
		expect(restoreRailItem('calendar', railRegistryStore.navigators).lens).toEqual({ kind: 'day', target: DAY });
	});

	it('resolves the day lens and its New here rule through the rail', () => {
		off = registerCalendarRail();
		const ctx = {
			entries: [entryV2('/vault/a.md', { frontmatter: { date: DAY } }), entryV2('/vault/b.md', { frontmatter: { date: '2026-10-28' } })],
			vaultPath: '/vault',
			systemFolder: '_system',
			typeMetadataMap: new Map(),
			fileTree: [],
		};
		const resolved = resolveLens({ kind: 'day', target: DAY }, ctx, railRegistryStore.lensProviders);
		expect(resolved?.rule).toBe('note date is 2026-10-27');
		expect(resolved?.notes.map((n) => n.path)).toEqual(['/vault/a.md']);

		const rule = newNoteRule(
			{ kind: 'day', target: DAY },
			{ vaultPath: '/vault', captureBaseFolder: '_notes', captureFolderFormat: 'YYYY', now: dayjs('2026-11-01T10:00:00') },
			railRegistryStore.lensProviders,
		);
		expect(rule).toEqual({ folder: '/vault/_notes/2026', frontmatter: { date: DAY } });
	});

	it('hiding the Calendar rail item drops its rail button only: the navigator and the Day lens stay registered', () => {
		off = registerCalendarRail();
		settingsStore.updateLayout({ railItem: CALENDAR_RAIL_ITEM, railHidden: [CALENDAR_RAIL_ITEM] });
		const hidden = parseRailHidden(settingsStore.layout.railHidden);

		expect(railItems(railRegistryStore.navigators, [], hidden).map((i) => i.key)).not.toContain(CALENDAR_RAIL_ITEM);
		expect(restoreRailItem(settingsStore.layout.railItem, railRegistryStore.navigators, null, hidden).item).toBe('today');
		expect(settingsStore.layout.railItem).toBe(CALENDAR_RAIL_ITEM);

		expect(railRegistryStore.navigators.map((n) => n.id)).toEqual([CALENDAR_RAIL_ITEM]);
		expect(railRegistryStore.lensProviders.map((p) => p.kind)).toEqual(['day']);
		const ctx = {
			entries: [entryV2('/vault/a.md', { frontmatter: { date: DAY } })],
			vaultPath: '/vault',
			systemFolder: '_system',
			typeMetadataMap: new Map(),
			fileTree: [],
		};
		expect(resolveLens({ kind: 'day', target: DAY }, ctx, railRegistryStore.lensProviders)?.notes.map((n) => n.path)).toEqual(['/vault/a.md']);
	});

	it("the header's Daily note opens or creates that day's daily note", async () => {
		off = registerCalendarRail();
		const action = dayProvider().headerAction!;
		expect(action.label).toBe('Daily note');

		await action.run({ kind: 'day', target: DAY });
		expect(openOrCreateNote).toHaveBeenCalledTimes(1);
		const call = vi.mocked(openOrCreateNote).mock.calls[0][0];
		expect(call.filePath).toBe('/vault/_notes/2026/10-Oct/_journal-day-27-10-2026.md');
		expect(call.title).toBe('2026/10-Oct/_journal-day-27-10-2026');
	});

	it('the Daily note action rejects when the note cannot be opened, and for a lens without a day', async () => {
		off = registerCalendarRail();
		const action = dayProvider().headerAction!;
		vi.mocked(openOrCreateNote).mockRejectedValueOnce(new Error('disk full'));
		await expect(action.run({ kind: 'day', target: DAY })).rejects.toThrow('disk full');
		await expect(action.run({ kind: 'day' })).rejects.toThrow();
		expect(openOrCreateNote).toHaveBeenCalledTimes(1);
	});
});
