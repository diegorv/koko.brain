import { describe, it, expect, beforeEach } from 'vitest';
import { settingsDialogStore } from '$lib/core/settings/settings-dialog.store.svelte';

describe('settingsDialogStore', () => {
	beforeEach(() => {
		settingsDialogStore.reset();
	});

	it('starts closed with appearance section', () => {
		expect(settingsDialogStore.isOpen).toBe(false);
		expect(settingsDialogStore.activeSection).toBe('appearance');
	});

	it('open without section defaults to appearance', () => {
		settingsDialogStore.open();
		expect(settingsDialogStore.isOpen).toBe(true);
		expect(settingsDialogStore.activeSection).toBe('appearance');
	});

	it('open with section param sets active section', () => {
		settingsDialogStore.open('editor' as any);
		expect(settingsDialogStore.isOpen).toBe(true);
		expect(settingsDialogStore.activeSection).toBe('editor');
	});

	it('close sets isOpen to false', () => {
		settingsDialogStore.open();
		settingsDialogStore.close();
		expect(settingsDialogStore.isOpen).toBe(false);
	});

	it('toggle flips isOpen', () => {
		settingsDialogStore.toggle();
		expect(settingsDialogStore.isOpen).toBe(true);
		settingsDialogStore.toggle();
		expect(settingsDialogStore.isOpen).toBe(false);
	});

	it('setSection changes active section', () => {
		settingsDialogStore.setSection('appearance' as any);
		expect(settingsDialogStore.activeSection).toBe('appearance');
	});

	it('open resets to appearance even after navigating to another section', () => {
		settingsDialogStore.open('editor' as any);
		settingsDialogStore.close();
		settingsDialogStore.open();
		expect(settingsDialogStore.activeSection).toBe('appearance');
	});

	it('reset restores defaults', () => {
		settingsDialogStore.open('editor' as any);
		settingsDialogStore.reset();
		expect(settingsDialogStore.isOpen).toBe(false);
		expect(settingsDialogStore.activeSection).toBe('appearance');
	});
});
