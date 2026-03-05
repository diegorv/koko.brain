// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { getPropertyIcon, FrontmatterWidget, dispatchFrontmatterChange } from '$lib/core/markdown-editor/extensions/live-preview/widgets/frontmatter-widget';
import type { Property } from '$lib/features/properties/properties.types';
import type { EditorView } from '@codemirror/view';

describe('getPropertyIcon', () => {
	it('returns date icon for date-related keys regardless of type', () => {
		for (const key of ['created', 'updated', 'modified', 'date', 'published']) {
			const icon = getPropertyIcon(key, 'text');
			expect(icon).toContain('circle');
		}
	});

	it('returns tag icon for tag-related keys regardless of type', () => {
		for (const key of ['tags', 'tag']) {
			const icon = getPropertyIcon(key, 'text');
			expect(icon).toContain('M12 2H2v10');
		}
	});

	it('returns link icon for alias-related keys regardless of type', () => {
		for (const key of ['aliases', 'alias', 'cssclasses', 'cssclass']) {
			const icon = getPropertyIcon(key, 'text');
			expect(icon).toContain('M10 13a5');
		}
	});

	it('returns number icon for number type', () => {
		const icon = getPropertyIcon('count', 'number');
		expect(icon).toContain('x1="4"');
	});

	it('returns boolean icon for boolean type', () => {
		const icon = getPropertyIcon('draft', 'boolean');
		expect(icon).toContain('polyline');
	});

	it('returns date icon for date type', () => {
		const icon = getPropertyIcon('deadline', 'date');
		expect(icon).toContain('circle');
	});

	it('returns tag icon for list type', () => {
		const icon = getPropertyIcon('items', 'list');
		expect(icon).toContain('M12 2H2v10');
	});

	it('returns text icon for text type', () => {
		const icon = getPropertyIcon('title', 'text');
		expect(icon).toContain('x1="17"');
	});

	it('key-specific icons take priority over type-based icons', () => {
		// 'date' key should use date icon even if type is 'text'
		const dateIcon = getPropertyIcon('date', 'text');
		expect(dateIcon).toContain('circle');

		// 'tags' key should use tag icon even if type is 'text'
		const tagIcon = getPropertyIcon('tags', 'text');
		expect(tagIcon).toContain('M12 2H2v10');
	});

	it('is case-insensitive for key matching', () => {
		expect(getPropertyIcon('Tags', 'text')).toContain('M12 2H2v10');
		expect(getPropertyIcon('DATE', 'text')).toContain('circle');
		expect(getPropertyIcon('Aliases', 'text')).toContain('M10 13a5');
	});
});

describe('FrontmatterWidget', () => {
	describe('eq', () => {
		it('returns true for identical properties', () => {
			const props: Property[] = [
				{ key: 'title', value: 'Hello', type: 'text' },
				{ key: 'count', value: 42, type: 'number' },
			];
			const a = new FrontmatterWidget(props);
			const b = new FrontmatterWidget([...props]);
			expect(a.eq(b)).toBe(true);
		});

		it('returns false when property count differs', () => {
			const a = new FrontmatterWidget([{ key: 'title', value: 'Hello', type: 'text' }]);
			const b = new FrontmatterWidget([]);
			expect(a.eq(b)).toBe(false);
		});

		it('returns false when a key differs', () => {
			const a = new FrontmatterWidget([{ key: 'title', value: 'Hello', type: 'text' }]);
			const b = new FrontmatterWidget([{ key: 'name', value: 'Hello', type: 'text' }]);
			expect(a.eq(b)).toBe(false);
		});

		it('returns false when a value differs', () => {
			const a = new FrontmatterWidget([{ key: 'title', value: 'Hello', type: 'text' }]);
			const b = new FrontmatterWidget([{ key: 'title', value: 'World', type: 'text' }]);
			expect(a.eq(b)).toBe(false);
		});

		it('returns false when a type differs', () => {
			const a = new FrontmatterWidget([{ key: 'val', value: '42', type: 'text' }]);
			const b = new FrontmatterWidget([{ key: 'val', value: '42', type: 'number' }]);
			expect(a.eq(b)).toBe(false);
		});

		it('compares list values element-by-element', () => {
			const a = new FrontmatterWidget([{ key: 'tags', value: ['a', 'b'], type: 'list' }]);
			const b = new FrontmatterWidget([{ key: 'tags', value: ['a', 'b'], type: 'list' }]);
			expect(a.eq(b)).toBe(true);
		});

		it('returns false when list values differ', () => {
			const a = new FrontmatterWidget([{ key: 'tags', value: ['a', 'b'], type: 'list' }]);
			const b = new FrontmatterWidget([{ key: 'tags', value: ['a', 'c'], type: 'list' }]);
			expect(a.eq(b)).toBe(false);
		});

		it('returns false when list lengths differ', () => {
			const a = new FrontmatterWidget([{ key: 'tags', value: ['a'], type: 'list' }]);
			const b = new FrontmatterWidget([{ key: 'tags', value: ['a', 'b'], type: 'list' }]);
			expect(a.eq(b)).toBe(false);
		});

		it('handles boolean values', () => {
			const a = new FrontmatterWidget([{ key: 'draft', value: true, type: 'boolean' }]);
			const b = new FrontmatterWidget([{ key: 'draft', value: true, type: 'boolean' }]);
			expect(a.eq(b)).toBe(true);

			const c = new FrontmatterWidget([{ key: 'draft', value: false, type: 'boolean' }]);
			expect(a.eq(c)).toBe(false);
		});

		it('handles empty properties', () => {
			const a = new FrontmatterWidget([]);
			const b = new FrontmatterWidget([]);
			expect(a.eq(b)).toBe(true);
		});
	});

	it('ignoreEvent returns true to capture interactive events', () => {
		const widget = new FrontmatterWidget([]);
		expect(widget.ignoreEvent()).toBe(true);
	});
});

describe('FrontmatterWidget toDOM rendering', () => {
	function createMockView(): EditorView {
		return {
			state: { doc: { toString: () => '---\ntitle: Hello\n---\nBody' } },
			dispatch: vi.fn(),
		} as unknown as EditorView;
	}

	it('renders text input for text properties', () => {
		const widget = new FrontmatterWidget([{ key: 'title', value: 'Hello', type: 'text' }]);
		const dom = widget.toDOM(createMockView());
		const input = dom.querySelector('input.cm-lp-frontmatter-input') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.type).toBe('text');
		expect(input.value).toBe('Hello');
	});

	it('renders number input for number properties', () => {
		const widget = new FrontmatterWidget([{ key: 'count', value: 42, type: 'number' }]);
		const dom = widget.toDOM(createMockView());
		const input = dom.querySelector('input.cm-lp-frontmatter-input') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.type).toBe('number');
		expect(input.value).toBe('42');
	});

	it('renders date input for date properties', () => {
		const widget = new FrontmatterWidget([{ key: 'created', value: '2024-01-15', type: 'date' }]);
		const dom = widget.toDOM(createMockView());
		const input = dom.querySelector('input.cm-lp-frontmatter-input') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.type).toBe('date');
		expect(input.value).toBe('2024-01-15');
	});

	it('renders checkbox for boolean properties', () => {
		const widget = new FrontmatterWidget([{ key: 'draft', value: true, type: 'boolean' }]);
		const dom = widget.toDOM(createMockView());
		const checkbox = dom.querySelector('input.cm-lp-frontmatter-checkbox') as HTMLInputElement;
		expect(checkbox).toBeTruthy();
		expect(checkbox.type).toBe('checkbox');
		expect(checkbox.checked).toBe(true);
	});

	it('renders tag pills for list properties', () => {
		const widget = new FrontmatterWidget([{ key: 'tags', value: ['a', 'b'], type: 'list' }]);
		const dom = widget.toDOM(createMockView());
		const tags = dom.querySelectorAll('.cm-lp-frontmatter-tag');
		expect(tags).toHaveLength(2);
		expect(tags[0].textContent).toContain('a');
		expect(tags[1].textContent).toContain('b');
	});

	it('renders wikilink display for text properties containing wikilinks', () => {
		const widget = new FrontmatterWidget([{ key: 'person', value: '[[Ana Beatriz]]', type: 'text' }]);
		const dom = widget.toDOM(createMockView());
		const display = dom.querySelector('.cm-lp-frontmatter-wikilink-display');
		expect(display).toBeTruthy();
		const link = display!.querySelector('a.cm-lp-wikilink');
		expect(link).toBeTruthy();
		expect(link!.textContent).toBe('Ana Beatriz');
		// Should NOT have a plain input
		const input = dom.querySelector('input.cm-lp-frontmatter-input');
		expect(input).toBeNull();
	});

	it('renders wikilink with display text for [[target|alias]] syntax', () => {
		const widget = new FrontmatterWidget([{ key: 'ref', value: '[[file-name|Display Name]]', type: 'text' }]);
		const dom = widget.toDOM(createMockView());
		const link = dom.querySelector('a.cm-lp-wikilink');
		expect(link).toBeTruthy();
		expect(link!.textContent).toBe('Display Name');
	});

	it('renders plain text around wikilinks in mixed values', () => {
		const widget = new FrontmatterWidget([{ key: 'note', value: 'See [[Ana]] for details', type: 'text' }]);
		const dom = widget.toDOM(createMockView());
		const display = dom.querySelector('.cm-lp-frontmatter-wikilink-display');
		expect(display).toBeTruthy();
		expect(display!.textContent).toBe('See Ana for details');
		const link = display!.querySelector('a.cm-lp-wikilink');
		expect(link!.textContent).toBe('Ana');
	});

	it('switches to input on click of non-link area in wikilink display', () => {
		const widget = new FrontmatterWidget([{ key: 'note', value: 'See [[Ana]] here', type: 'text' }]);
		const dom = widget.toDOM(createMockView());
		const display = dom.querySelector('.cm-lp-frontmatter-wikilink-display') as HTMLElement;
		// Click on the display span itself (not on the <a> link)
		display.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		const input = dom.querySelector('input.cm-lp-frontmatter-input') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.value).toBe('See [[Ana]] here');
	});

	it('does not switch to input when clicking on the wikilink anchor', () => {
		const widget = new FrontmatterWidget([{ key: 'person', value: '[[Ana]]', type: 'text' }]);
		const dom = widget.toDOM(createMockView());
		const link = dom.querySelector('a.cm-lp-wikilink') as HTMLElement;
		// Click event targeting the <a> should not enter edit mode
		link.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		const input = dom.querySelector('input.cm-lp-frontmatter-input');
		expect(input).toBeNull();
		// Display should still be there
		const display = dom.querySelector('.cm-lp-frontmatter-wikilink-display');
		expect(display).toBeTruthy();
	});

	it('renders plain input for text properties without wikilinks', () => {
		const widget = new FrontmatterWidget([{ key: 'title', value: 'No links here', type: 'text' }]);
		const dom = widget.toDOM(createMockView());
		const input = dom.querySelector('input.cm-lp-frontmatter-input') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.value).toBe('No links here');
		const display = dom.querySelector('.cm-lp-frontmatter-wikilink-display');
		expect(display).toBeNull();
	});

	it('renders empty text input for empty string value', () => {
		const widget = new FrontmatterWidget([{ key: 'title', value: '', type: 'text' }]);
		const dom = widget.toDOM(createMockView());
		const input = dom.querySelector('input.cm-lp-frontmatter-input') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.value).toBe('');
	});

	it('renders editable key input for each property', () => {
		const widget = new FrontmatterWidget([
			{ key: 'title', value: 'Hello', type: 'text' },
			{ key: 'count', value: 42, type: 'number' },
		]);
		const dom = widget.toDOM(createMockView());
		const keyInputs = dom.querySelectorAll('input.cm-lp-frontmatter-key-input') as NodeListOf<HTMLInputElement>;
		expect(keyInputs).toHaveLength(2);
		expect(keyInputs[0].value).toBe('title');
		expect(keyInputs[1].value).toBe('count');
	});

	it('key input reverts to original on empty blur', () => {
		const widget = new FrontmatterWidget([{ key: 'title', value: 'Hello', type: 'text' }]);
		const dom = widget.toDOM(createMockView());
		const keyInput = dom.querySelector('input.cm-lp-frontmatter-key-input') as HTMLInputElement;
		keyInput.value = '';
		keyInput.dispatchEvent(new Event('blur'));
		expect(keyInput.value).toBe('title');
	});

	it('key input reverts on Escape', () => {
		const widget = new FrontmatterWidget([{ key: 'title', value: 'Hello', type: 'text' }]);
		const dom = widget.toDOM(createMockView());
		const keyInput = dom.querySelector('input.cm-lp-frontmatter-key-input') as HTMLInputElement;
		keyInput.value = 'changed';
		keyInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		expect(keyInput.value).toBe('title');
	});

	it('renders tag pills with × remove buttons for list properties', () => {
		const widget = new FrontmatterWidget([{ key: 'tags', value: ['a', 'b', 'c'], type: 'list' }]);
		const dom = widget.toDOM(createMockView());
		const tags = dom.querySelectorAll('.cm-lp-frontmatter-tag');
		expect(tags).toHaveLength(3);
		const xButtons = dom.querySelectorAll('.cm-lp-frontmatter-tag-x');
		expect(xButtons).toHaveLength(3);
	});

	it('renders add input for list properties', () => {
		const widget = new FrontmatterWidget([{ key: 'tags', value: ['a'], type: 'list' }]);
		const dom = widget.toDOM(createMockView());
		const addInput = dom.querySelector('input.cm-lp-frontmatter-list-input') as HTMLInputElement;
		expect(addInput).toBeTruthy();
		expect(addInput.placeholder).toBe('Add...');
	});

	it('renders remove button for each property row', () => {
		const widget = new FrontmatterWidget([
			{ key: 'title', value: 'Hello', type: 'text' },
			{ key: 'count', value: 42, type: 'number' },
		]);
		const dom = widget.toDOM(createMockView());
		const removeButtons = dom.querySelectorAll('.cm-lp-frontmatter-remove');
		expect(removeButtons).toHaveLength(2);
		expect(removeButtons[0].textContent).toBe('\u00d7');
	});

	it('renders add property button', () => {
		const widget = new FrontmatterWidget([{ key: 'title', value: 'Hello', type: 'text' }]);
		const dom = widget.toDOM(createMockView());
		const addBtn = dom.querySelector('.cm-lp-frontmatter-add');
		expect(addBtn).toBeTruthy();
		expect(addBtn!.textContent).toContain('Add property');
	});

	it('add property button shows input on click', () => {
		const widget = new FrontmatterWidget([]);
		const dom = widget.toDOM(createMockView());
		const addBtn = dom.querySelector('.cm-lp-frontmatter-add') as HTMLElement;
		addBtn.click();
		const addInput = addBtn.querySelector('input.cm-lp-frontmatter-add-input') as HTMLInputElement;
		expect(addInput).toBeTruthy();
		expect(addInput.placeholder).toBe('Property name...');
	});
});

describe('dispatchFrontmatterChange', () => {
	it('parses doc, applies mutation, and dispatches frontmatter replacement', () => {
		const doc = '---\ntitle: Hello\n---\nBody content';
		const dispatch = vi.fn();
		const mockView = {
			state: { doc: { toString: () => doc } },
			dispatch,
		} as unknown as EditorView;

		dispatchFrontmatterChange(mockView, (props) =>
			props.map((p) => (p.key === 'title' ? { ...p, value: 'World' } : p)),
		);

		expect(dispatch).toHaveBeenCalledOnce();
		const call = dispatch.mock.calls[0][0];
		expect(call.changes.from).toBe(0);
		expect(call.changes.insert).toContain('title: World');
	});

	it('handles document with no frontmatter gracefully', () => {
		const doc = 'Just some text';
		const dispatch = vi.fn();
		const mockView = {
			state: { doc: { toString: () => doc } },
			dispatch,
		} as unknown as EditorView;

		dispatchFrontmatterChange(mockView, (props) => props);

		expect(dispatch).toHaveBeenCalledOnce();
	});
});
