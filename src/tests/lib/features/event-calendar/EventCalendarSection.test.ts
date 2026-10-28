// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';

// `vaultStore.open` persists the recent-vaults list.
setupLocalStorage();

// Side-effect services the "Open Event type" button reaches. Mocked so the
// mount needs no Tauri; the settings, vault and type stores stay real
// (CLAUDE.md rule 1) and every value assertion reads the real store back.
vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));
vi.mock('$lib/features/type-definitions/type-definitions.service', () => ({
	createTypeDefinition: vi.fn(() => Promise.resolve()),
}));
vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn() },
}));

import { mount, unmount, flushSync } from 'svelte';
import EventCalendarSection from '$lib/features/event-calendar/EventCalendarSection.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import { getTypeMetadataFallback, type TypeMetadata } from '$lib/features/type-definitions/type-definitions.logic';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { createTypeDefinition } from '$lib/features/type-definitions/type-definitions.service';
import { toast } from 'svelte-sonner';

const VAULT = '/vault';

/** Metadata for an on-disk `Event` definition with the given `_folder`. */
function eventType(folder: string | null): TypeMetadata {
	return { ...getTypeMetadataFallback('Event', new Map()), path: `${VAULT}/Event.md`, folder };
}

describe('EventCalendarSection', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	function render() {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(EventCalendarSection, { target });
		flushSync();
	}

	beforeEach(() => {
		vi.clearAllMocks();
		settingsStore.reset();
		vaultStore._reset();
		typeDefinitionsStore.reset();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
		vaultStore._reset();
		typeDefinitionsStore.reset();
		clearLocalStorage();
	});

	/** The input inside the setting row labelled `label`. */
	function inputOf(label: string): HTMLInputElement {
		const row = [...target.querySelectorAll('[data-setting]')].find((el) => el.getAttribute('data-setting') === label);
		const input = row?.querySelector('input');
		if (!input) throw new Error(`no input for setting "${label}"`);
		return input;
	}

	/** Types a raw value, exactly as a keystroke does. */
	function type(input: HTMLInputElement, raw: string) {
		input.value = raw;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	/** Commits the typed value the way Enter or a focus change does. */
	function commit(input: HTMLInputElement) {
		input.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();
	}

	it('clamps an out-of-range default duration on commit', () => {
		render();
		const input = inputOf('duration');
		type(input, '999');
		commit(input);
		expect(settingsStore.eventCalendar.defaultDurationMinutes).toBe(480);
		expect(input.value).toBe('480');
	});

	it('rounds a duration to the 15-minute step on commit', () => {
		render();
		const input = inputOf('duration');
		type(input, '50');
		commit(input);
		expect(settingsStore.eventCalendar.defaultDurationMinutes).toBe(45);
	});

	it('clamps an out-of-range day start hour on commit', () => {
		render();
		const input = inputOf('day-start');
		type(input, '20');
		commit(input);
		expect(settingsStore.eventCalendar.dayStartHour).toBe(12);
	});

	it('commits a blank event type as Event', () => {
		settingsStore.updateEventCalendar({ eventTypeName: 'Meeting' });
		render();
		const input = inputOf('event-type');
		expect(input.value).toBe('Meeting');
		type(input, '   ');
		commit(input);
		expect(settingsStore.eventCalendar.eventTypeName).toBe('Event');
		expect(input.value).toBe('Event');
	});

	it('commits a trimmed event type name', () => {
		render();
		const input = inputOf('event-type');
		type(input, '  Meeting ');
		commit(input);
		expect(settingsStore.eventCalendar.eventTypeName).toBe('Meeting');
	});

	it('shows the static rename hint for the event type', () => {
		render();
		expect(target.textContent).toContain(
			'Notes of this type appear on the calendar. If you rename the type in the type sidebar, enter its new name here.',
		);
	});

	it('toggling show weekends writes the store', () => {
		render();
		expect(settingsStore.eventCalendar.showWeekends).toBe(true);
		const toggle = target.querySelector<HTMLButtonElement>('[data-setting="weekends"] [role="switch"]');
		toggle!.click();
		flushSync();
		expect(settingsStore.eventCalendar.showWeekends).toBe(false);
	});

	it('picking a swatch sets the default color', () => {
		render();
		target.querySelector<HTMLButtonElement>('[data-color="pink"]')!.click();
		flushSync();
		expect(settingsStore.eventCalendar.defaultColor).toBe('pink');
		expect(target.querySelector('[data-color="pink"]')!.getAttribute('aria-checked')).toBe('true');
	});

	it('shows the folder new events go to: vault / base folder / _folder', () => {
		vaultStore.open(VAULT);
		settingsStore.setSettings({ ...settingsStore.settings, typesBaseFolder: 'Types' });
		typeDefinitionsStore.setTypeMetadataMap(new Map([['Event', eventType('Events/')]]));
		render();
		expect(target.querySelector('[data-event-folder]')!.textContent).toBe('/vault/Types/Events');
	});

	it('resolves the configured type name ignoring case, as createEvent does', () => {
		vaultStore.open(VAULT);
		settingsStore.updateEventCalendar({ eventTypeName: 'event' });
		typeDefinitionsStore.setTypeMetadataMap(new Map([['Event', eventType('Calendar')]]));
		render();
		expect(target.querySelector('[data-event-folder]')!.textContent).toBe('/vault/Calendar');
	});

	it('shows the vault root when the event type has no definition', () => {
		vaultStore.open(VAULT);
		render();
		expect(target.querySelector('[data-event-folder]')!.textContent).toBe('/vault');
	});

	it('shows no folder line when no vault is open', () => {
		render();
		expect(target.querySelector('[data-event-folder]')).toBeNull();
	});

	it('"Open Event type" opens the existing definition', () => {
		vaultStore.open(VAULT);
		typeDefinitionsStore.setTypeMetadataMap(new Map([['Event', eventType(null)]]));
		render();
		target.querySelector<HTMLButtonElement>('[data-open-event-type]')!.click();
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/Event.md');
		expect(createTypeDefinition).not.toHaveBeenCalled();
	});

	it('"Open Event type" creates the definition when there is none', () => {
		vaultStore.open(VAULT);
		settingsStore.updateEventCalendar({ eventTypeName: 'Meeting' });
		render();
		target.querySelector<HTMLButtonElement>('[data-open-event-type]')!.click();
		expect(createTypeDefinition).toHaveBeenCalledWith('Meeting');
		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('"Open Event type" toasts when the definition cannot be created', async () => {
		vaultStore.open(VAULT);
		vi.mocked(createTypeDefinition).mockRejectedValueOnce(new Error('disk full'));
		render();
		target.querySelector<HTMLButtonElement>('[data-open-event-type]')!.click();
		await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not create the "Event" type'));
	});
});
