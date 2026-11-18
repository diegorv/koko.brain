// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';

import PeriodicNotesSection from '#lib/core/settings/sections/PeriodicNotesSection.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

describe('PeriodicNotesSection', () => {
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	function render(): HTMLElement {
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(PeriodicNotesSection, { target });
		flushSync();
		return target;
	}

	function autoPin(root: HTMLElement): HTMLButtonElement | null {
		return root.querySelector<HTMLButtonElement>('[role="switch"][aria-label="Auto-pin"]');
	}

	it('disables Auto-pin while Auto-open is off and enables it once Auto-open is on', () => {
		settingsStore.updatePeriodicNotes({ daily: { autoOpen: false, autoPin: false } });
		const root = render();

		expect(autoPin(root)).not.toBeNull();
		expect(autoPin(root)!.disabled).toBe(true);

		settingsStore.updatePeriodicNotes({ daily: { autoOpen: true } });
		flushSync();

		expect(autoPin(root)!.disabled).toBe(false);
		expect(settingsStore.periodicNotes.daily.autoPin).toBe(false);
	});

	it('keeps a stored-on Auto-pin enabled so it can be turned off, then disables it', () => {
		settingsStore.updatePeriodicNotes({ daily: { autoOpen: false, autoPin: true } });
		const root = render();

		expect(autoPin(root)!.disabled).toBe(false);
		expect(autoPin(root)!.getAttribute('aria-checked')).toBe('true');

		autoPin(root)!.click();
		flushSync();

		expect(settingsStore.periodicNotes.daily.autoPin).toBe(false);
		expect(autoPin(root)!.disabled).toBe(true);
	});

	it('does not change the stored Auto-pin when Auto-open flips', () => {
		settingsStore.updatePeriodicNotes({ daily: { autoOpen: true, autoPin: true } });
		const root = render();

		const autoOpenRow = [...root.querySelectorAll<HTMLElement>('.bg-setting-item-bg')].find(
			(r) => r.querySelector('span')?.textContent?.trim() === 'Auto-open',
		)!;
		autoOpenRow.querySelector<HTMLButtonElement>('[role="switch"]')!.click();
		flushSync();

		expect(settingsStore.periodicNotes.daily.autoOpen).toBe(false);
		expect(settingsStore.periodicNotes.daily.autoPin).toBe(true);
		expect(autoPin(root)!.disabled).toBe(false);
	});
});
