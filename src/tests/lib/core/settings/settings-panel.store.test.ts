import { describe, it, expect, beforeEach } from 'vitest';
import { settingsPanelStore } from '$lib/core/settings/settings-panel.store.svelte';

describe('settingsPanelStore', () => {
	beforeEach(() => {
		settingsPanelStore._reset();
	});

	it('starts closed with appearance section', () => {
		expect(settingsPanelStore.isOpen).toBe(false);
		expect(settingsPanelStore.activeSection).toBe('appearance');
	});

	it('open() sets isOpen to true', () => {
		settingsPanelStore.open();
		expect(settingsPanelStore.isOpen).toBe(true);
	});

	it('open(section) sets activeSection', () => {
		settingsPanelStore.open('editor');
		expect(settingsPanelStore.isOpen).toBe(true);
		expect(settingsPanelStore.activeSection).toBe('editor');
	});

	it('open() without section keeps last activeSection', () => {
		settingsPanelStore.setSection('search');
		settingsPanelStore.open();
		expect(settingsPanelStore.activeSection).toBe('search');
	});

	it('close() sets isOpen to false', () => {
		settingsPanelStore.open();
		settingsPanelStore.close();
		expect(settingsPanelStore.isOpen).toBe(false);
	});

	it('toggle() flips isOpen', () => {
		expect(settingsPanelStore.isOpen).toBe(false);
		settingsPanelStore.toggle();
		expect(settingsPanelStore.isOpen).toBe(true);
		settingsPanelStore.toggle();
		expect(settingsPanelStore.isOpen).toBe(false);
	});

	it('setSection() updates activeSection', () => {
		settingsPanelStore.setSection('troubleshooting');
		expect(settingsPanelStore.activeSection).toBe('troubleshooting');
	});

	it('_reset() restores defaults', () => {
		settingsPanelStore.open('editor');
		settingsPanelStore._reset();
		expect(settingsPanelStore.isOpen).toBe(false);
		expect(settingsPanelStore.activeSection).toBe('appearance');
	});
});
