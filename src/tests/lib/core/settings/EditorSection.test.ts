// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// `onMount` asks Rust for the installed font list - the only Tauri call in this
// tree, legitimately mocked. The settings store stays real (CLAUDE.md rule 1):
// every assertion reads the real store back after a real DOM event.
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve([])),
}));

import { mount, unmount, flushSync } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import EditorSection from '#lib/core/settings/sections/EditorSection.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

// The command list scrolls its highlighted item into view; jsdom has no layout.
Element.prototype.scrollIntoView ??= () => {};

describe('EditorSection - clamp on commit', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		settingsStore.reset();
		target = document.body.appendChild(document.createElement('div'));
		component = mount(EditorSection, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	/**
	 * The four editor-level number inputs, in markup order:
	 * font size, line height, paragraph spacing, content width.
	 * Heading inputs live inside `<details>` and are excluded here.
	 */
	function editorInputs(): HTMLInputElement[] {
		return [...target.querySelectorAll<HTMLInputElement>('input[type="number"]')]
			.filter((el) => !el.closest('details'));
	}

	/** The h1 heading inputs, in markup order: font size, line height, letter spacing. */
	function headingInputs(): HTMLInputElement[] {
		const h1 = target.querySelector('details');
		if (!h1) throw new Error('heading typography <details> not rendered');
		return [...h1.querySelectorAll<HTMLInputElement>('input[type="number"]')];
	}

	/** Types a raw value, exactly as a keystroke does. Never clamps. */
	function type(input: HTMLInputElement, raw: string) {
		input.value = raw;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	/**
	 * Commits the typed value the way Enter or a focus change does.
	 * Deliberately NOT a blur: `onblur` is the path this issue replaces, and
	 * firing it would let the probe pass against the unfixed code.
	 */
	function commit(input: HTMLInputElement) {
		input.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();
	}

	it('groups the rows under Text, Page and Heading Typography', () => {
		expect([...target.querySelectorAll('h3')].map((h) => h.textContent?.trim())).toEqual(['Text', 'Page', 'Heading Typography']);
		const text = target.textContent ?? '';
		const order = ['Text', 'Font family', 'Font size', 'Line height', 'Paragraph spacing', 'Page', 'Content width', 'Heading Typography'].map((label) => text.indexOf(label));
		expect(order).not.toContain(-1);
		expect(order).toEqual([...order].sort((a, b) => a - b));
	});

	it('renders the four editor number inputs plus the heading ones', () => {
		expect(editorInputs()).toHaveLength(4);
		expect(headingInputs()).toHaveLength(3);
	});

	it('clamps font size to the upper bound on commit', () => {
		const input = editorInputs()[0];
		type(input, '999');
		// Raw while typing is deliberate (live preview); only the commit clamps.
		expect(settingsStore.editor.fontSize).toBe(999);
		commit(input);
		expect(settingsStore.editor.fontSize).toBe(32);
	});

	it('clamps font size to the lower bound on commit', () => {
		const input = editorInputs()[0];
		type(input, '1');
		expect(settingsStore.editor.fontSize).toBe(1);
		commit(input);
		expect(settingsStore.editor.fontSize).toBe(8);
	});

	it('clamps line height on commit', () => {
		const input = editorInputs()[1];
		type(input, '9');
		expect(settingsStore.editor.lineHeight).toBe(9);
		commit(input);
		expect(settingsStore.editor.lineHeight).toBe(3);
	});

	it('clamps content width on commit', () => {
		const input = editorInputs()[3];
		type(input, '50');
		expect(settingsStore.editor.contentWidth).toBe(50);
		commit(input);
		expect(settingsStore.editor.contentWidth).toBe(400);
	});

	it('keeps content width 0 as the "no limit" sentinel on commit', () => {
		const input = editorInputs()[3];
		type(input, '0');
		commit(input);
		expect(settingsStore.editor.contentWidth).toBe(0);
	});

	it('clamps paragraph spacing on commit', () => {
		const input = editorInputs()[2];
		type(input, '9');
		expect(settingsStore.editor.paragraphSpacing).toBe(9);
		commit(input);
		expect(settingsStore.editor.paragraphSpacing).toBe(2);
	});

	it('clamps heading font size on commit', () => {
		const input = headingInputs()[0];
		type(input, '99');
		expect(settingsStore.editor.headingTypography.h1.fontSize).toBe(99);
		commit(input);
		expect(settingsStore.editor.headingTypography.h1.fontSize).toBe(5);
	});

	it('clamps heading line height on commit', () => {
		const input = headingInputs()[1];
		type(input, '9');
		expect(settingsStore.editor.headingTypography.h1.lineHeight).toBe(9);
		commit(input);
		expect(settingsStore.editor.headingTypography.h1.lineHeight).toBe(3);
	});

	it('clamps heading letter spacing on commit', () => {
		const input = headingInputs()[2];
		type(input, '5');
		expect(settingsStore.editor.headingTypography.h1.letterSpacing).toBe(5);
		commit(input);
		expect(settingsStore.editor.headingTypography.h1.letterSpacing).toBe(0.1);
	});
});

describe('EditorSection - font picker', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(async () => {
		settingsStore.reset();
		vi.mocked(invoke).mockResolvedValueOnce(['Font Awesome 6 Free', 'Menlo']);
		target = document.body.appendChild(document.createElement('div'));
		component = mount(EditorSection, { target });
		flushSync();
		// Let `onMount` receive the font list and render the Browse trigger.
		await vi.waitFor(() => {
			if (!findBrowse()) throw new Error('Browse trigger not rendered');
		});
		findBrowse()!.click();
		flushSync();
		await vi.waitFor(() => {
			if (pickerItems().length === 0) throw new Error('font picker items not rendered');
		});
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	function findBrowse(): HTMLButtonElement | undefined {
		return [...target.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Browse');
	}

	/** The picker items; the popover content is portalled to `document.body`. */
	function pickerItems(): HTMLElement[] {
		return [...document.body.querySelectorAll<HTMLElement>('[data-command-item]')];
	}

	it('previews each font in its own face, quoted', () => {
		const item = pickerItems().find((el) => el.textContent?.trim() === 'Font Awesome 6 Free');
		expect(item).toBeDefined();
		expect(item!.style.fontFamily).toBe('"Font Awesome 6 Free"');
		expect(item!.className).not.toContain('font-[');
	});

	it('stores the picked name as written', () => {
		const item = pickerItems().find((el) => el.textContent?.trim() === 'Menlo');
		item!.click();
		flushSync();
		expect(settingsStore.editor.fontFamily).toBe('Menlo');
	});
});
