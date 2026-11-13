// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FormulaRow from '#lib/features/collection/toolbar/FormulaRow.svelte';
import { formulasToEntries, updateFormulaEntry } from '#lib/features/collection/toolbar/formula.logic.js';
import type { FormulaEntry } from '#lib/features/collection/toolbar/toolbar.types.js';

describe('FormulaRow — confirming an edit', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	/** Mounts an entry whose onUpdate applies `updateFormulaEntry`, like PropertiesPanel. */
	function render(entry: FormulaEntry, nameError?: string): { entry: () => FormulaEntry } {
		target = document.body.appendChild(document.createElement('div'));
		const props = $state({
			entry,
			nameError,
			onUpdate: (updates: Partial<Pick<FormulaEntry, 'name' | 'expression' | 'editing'>>) => {
				props.entry = updateFormulaEntry([props.entry], props.entry.id, updates)[0];
			},
			onRemove: () => {},
		});
		component = mount(FormulaRow, { target, props });
		flushSync();
		return { entry: () => props.entry };
	}

	const editing = (name: string, expression: string): FormulaEntry => ({
		id: 'f1',
		name,
		expression,
		editing: true,
	});

	function check(): HTMLButtonElement {
		const el = target.querySelector<HTMLButtonElement>('button[aria-label="Confirm formula"]');
		if (!el) throw new Error('Check button not found');
		return el;
	}

	function expressionInput(): HTMLInputElement {
		const el = target.querySelector<HTMLInputElement>('input[placeholder^="Expression"]');
		if (!el) throw new Error('expression input not found');
		return el;
	}

	function type(text: string): void {
		const el = expressionInput();
		el.value = text;
		el.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	const expressionError = () => target.querySelector('[data-formula-error]')?.textContent ?? null;

	it('enables Check for a valid name and expression, and confirms on click', () => {
		const view = render(editing('double', 'priority * 2'));

		expect(check().disabled).toBe(false);
		expect(expressionError()).toBeNull();

		check().click();
		flushSync();

		expect(view.entry().editing).toBe(false);
	});

	it('disables Check while the name has an error', () => {
		const view = render(editing('my formula', 'priority * 2'), 'Name cannot contain spaces');

		expect(check().disabled).toBe(true);
		check().click();
		flushSync();
		expect(view.entry().editing).toBe(true);
	});

	it('disables Check while the expression is blank, without an error message', () => {
		render(editing('double', '   '));

		expect(check().disabled).toBe(true);
		expect(expressionError()).toBeNull();
	});

	it('disables Check and shows the parse error while the expression does not parse', () => {
		render(editing('double', 'priority *'));

		expect(check().disabled).toBe(true);
		expect(expressionError()).toBeTruthy();
		expect(expressionInput().getAttribute('aria-invalid')).toBe('true');
	});

	it('enables Check once the typed expression parses', () => {
		render(editing('double', 'priority *'));

		type('priority * 2');

		expect(check().disabled).toBe(false);
		expect(expressionError()).toBeNull();
		expect(expressionInput().hasAttribute('aria-invalid')).toBe(false);
	});

	it('shows the error of a broken expression loaded from YAML once its edit row opens', () => {
		const [loaded] = formulasToEntries({ double: "(priority * 2" });
		expect(loaded.error).toBeUndefined();

		render(loaded);
		expect(target.querySelector('[data-formula-error]')).toBeNull();

		target.querySelector<HTMLButtonElement>('button[aria-label="Edit formula"]')!.click();
		flushSync();

		expect(expressionError()).toBeTruthy();
		expect(check().disabled).toBe(true);
	});
});
