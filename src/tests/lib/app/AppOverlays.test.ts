// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import { toast } from 'svelte-sonner';

import AppOverlays from '#lib/app/AppOverlays.svelte';
import { appliedThemeStore } from '#lib/core/settings/applied-theme.store.svelte.js';

// Sonner reads the color-scheme media query; jsdom has no matchMedia.
window.matchMedia ??= (query: string) =>
	({
		matches: false,
		media: query,
		onchange: null,
		addEventListener() {},
		removeEventListener() {},
		addListener() {},
		removeListener() {},
		dispatchEvent: () => false,
	}) as MediaQueryList;

describe('AppOverlays toaster theme', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	/** The `data-sonner-theme` of the toaster, which renders only while a toast is shown. */
	function toasterTheme(): string | null | undefined {
		return document.querySelector('[data-sonner-toaster]')?.getAttribute('data-sonner-theme');
	}

	beforeEach(() => {
		appliedThemeStore._reset();
		target = document.body.appendChild(document.createElement('div'));
		component = mount(AppOverlays, { target });
		flushSync();
	});

	afterEach(() => {
		toast.dismiss();
		if (component) unmount(component);
		component = null;
		appliedThemeStore._reset();
		document.body.innerHTML = '';
	});

	it('follows the applied theme mode', async () => {
		appliedThemeStore.setDark(false);
		toast('x');
		await tick();
		flushSync();
		expect(toasterTheme()).toBe('light');

		appliedThemeStore.setDark(true);
		flushSync();
		expect(toasterTheme()).toBe('dark');
	});
});
