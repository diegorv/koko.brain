import { describe, it, expect, beforeEach } from 'vitest';
import { appliedThemeStore } from '#lib/core/settings/applied-theme.store.svelte.js';

describe('appliedThemeStore', () => {
	beforeEach(() => {
		appliedThemeStore._reset();
	});

	it('starts dark, like the default theme', () => {
		expect(appliedThemeStore.isDark).toBe(true);
	});

	it('setDark(false) makes isDark false', () => {
		appliedThemeStore.setDark(false);
		expect(appliedThemeStore.isDark).toBe(false);
	});

	it('setDark(true) after light makes isDark true again', () => {
		appliedThemeStore.setDark(false);
		appliedThemeStore.setDark(true);
		expect(appliedThemeStore.isDark).toBe(true);
	});

	it('_reset() restores dark', () => {
		appliedThemeStore.setDark(false);
		appliedThemeStore._reset();
		expect(appliedThemeStore.isDark).toBe(true);
	});

	it('revision starts at 0 and bumpRevision() raises it by one each call', () => {
		expect(appliedThemeStore.revision).toBe(0);
		appliedThemeStore.bumpRevision();
		appliedThemeStore.bumpRevision();
		expect(appliedThemeStore.revision).toBe(2);
	});

	it('_reset() restores revision 0', () => {
		appliedThemeStore.bumpRevision();
		appliedThemeStore._reset();
		expect(appliedThemeStore.revision).toBe(0);
	});

	it('vars starts empty and setVars() replaces it', () => {
		expect(appliedThemeStore.vars).toEqual({});
		appliedThemeStore.setVars({ '--editor-bg': '#ffffff' });
		expect(appliedThemeStore.vars).toEqual({ '--editor-bg': '#ffffff' });
		appliedThemeStore.setVars({ '--rail-x': '#000000' });
		expect(appliedThemeStore.vars).toEqual({ '--rail-x': '#000000' });
	});

	it('_reset() restores empty vars', () => {
		appliedThemeStore.setVars({ '--editor-bg': '#ffffff' });
		appliedThemeStore._reset();
		expect(appliedThemeStore.vars).toEqual({});
	});
});
