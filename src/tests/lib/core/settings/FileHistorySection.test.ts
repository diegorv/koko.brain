// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FileHistorySection from '#lib/core/settings/sections/FileHistorySection.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

describe('FileHistorySection - retention days', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		settingsStore.reset();
		target = document.body.appendChild(document.createElement('div'));
		component = mount(FileHistorySection, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	function retentionInput(): HTMLInputElement {
		const input = target.querySelector<HTMLInputElement>('input[type="number"]');
		if (!input) throw new Error('retention days input not rendered');
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

	// The value feeds `cleanup_history` at vault open, which deletes snapshots,
	// so a half-typed value must never be stored.
	it('writes nothing while typing', () => {
		const input = retentionInput();
		expect(settingsStore.history.retentionDays).toBe(7);
		type(input, '');
		expect(settingsStore.history.retentionDays).toBe(7);
		type(input, '1');
		expect(settingsStore.history.retentionDays).toBe(7);
		type(input, '30');
		expect(settingsStore.history.retentionDays).toBe(7);
	});

	it('stores the committed value, clamped to 1-365, and shows it', () => {
		const input = retentionInput();
		type(input, '30');
		commit(input);
		expect(settingsStore.history.retentionDays).toBe(30);

		type(input, '400');
		commit(input);
		expect(settingsStore.history.retentionDays).toBe(365);
		expect(input.value).toBe('365');
	});

	it('keeps the stored value and restores the field on an empty commit', () => {
		const input = retentionInput();
		type(input, '30');
		commit(input);
		type(input, '');
		commit(input);
		expect(settingsStore.history.retentionDays).toBe(30);
		expect(input.value).toBe('30');
	});
});
