// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { mount, unmount, flushSync } from 'svelte';
import HeadingTypographyEditor from '#lib/core/settings/sections/HeadingTypographyEditor.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

describe('HeadingTypographyEditor - font weight', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		settingsStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	function render() {
		component = mount(HeadingTypographyEditor, { target });
		flushSync();
	}

	/** The weight Select trigger inside the given heading level's row (0 = H1). */
	function weightTrigger(level: number): HTMLElement {
		const details = target.querySelectorAll('details')[level];
		const trigger = details?.querySelector<HTMLElement>('[data-slot="select-trigger"]');
		if (!trigger) throw new Error(`no weight trigger for level ${level}`);
		return trigger;
	}

	it('uses the shadcn Select, with no native select', () => {
		render();
		expect(target.querySelector('select')).toBeNull();
		expect(target.querySelectorAll('[data-slot="select-trigger"]')).toHaveLength(6);
	});

	it('shows the label of the stored weight on each trigger with the defaults', () => {
		render();
		expect(settingsStore.editor.headingTypography.h1.fontWeight).toBe('bold');
		expect(weightTrigger(0).textContent?.trim()).toBe('Bold');
		expect(settingsStore.editor.headingTypography.h6.fontWeight).toBe('semibold');
		expect(weightTrigger(5).textContent?.trim()).toBe('Semibold');
	});

	it('follows a stored weight change on the H1 trigger', () => {
		render();
		const current = settingsStore.editor.headingTypography;
		settingsStore.updateEditor({ headingTypography: { ...current, h1: { ...current.h1, fontWeight: 'semibold' } } });
		flushSync();
		expect(weightTrigger(0).textContent?.trim()).toBe('Semibold');
	});
});
