import { EditorView, WidgetType } from '@codemirror/view';

import {
	parseFrontmatterProperties,
	updatePropertyValue,
	addProperty,
	extractBody,
	rebuildContent,
} from '$lib/features/properties/properties.logic';

import type { MetaBindOption } from '../parsers/meta-bind-input';

/**
 * Creates a `<select>` element for a meta-bind inline select input.
 * Shared between MetaBindSelectWidget (inline) and TableWidget (table cells)
 * so the same dispatch behavior runs in both contexts.
 */
export function createMetaBindSelect(
	options: MetaBindOption[],
	bindTarget: string,
	currentValue: string | null,
	view: EditorView,
): HTMLSelectElement {
	const select = document.createElement('select');
	select.className = 'cm-lp-meta-bind-select';

	// Placeholder when no value is set
	if (currentValue === null || currentValue === '') {
		const placeholder = document.createElement('option');
		placeholder.value = '';
		placeholder.textContent = 'Select...';
		placeholder.disabled = true;
		placeholder.selected = true;
		select.appendChild(placeholder);
	}

	for (const opt of options) {
		const option = document.createElement('option');
		option.value = opt.value;
		option.textContent = opt.label;
		if (opt.value === currentValue) {
			option.selected = true;
		}
		select.appendChild(option);
	}

	// Prevent CodeMirror from moving the cursor to this line on click,
	// which would remove the decoration and close the native dropdown
	select.addEventListener('mousedown', (e) => {
		e.stopPropagation();
	});

	select.addEventListener('change', (e) => {
		const selectedValue = (e.target as HTMLSelectElement).value;
		const doc = view.state.doc.toString();
		const properties = parseFrontmatterProperties(doc);
		const body = extractBody(doc);

		const existing = properties.find((p) => p.key === bindTarget);
		let updated;
		if (existing) {
			updated = updatePropertyValue(properties, bindTarget, selectedValue);
		} else {
			updated = addProperty(properties, bindTarget);
			updated = updatePropertyValue(updated, bindTarget, selectedValue);
		}

		const newContent = rebuildContent(updated, body);
		const frontmatterEnd = doc.length - body.length;
		const newFrontmatter = newContent.slice(0, newContent.length - body.length);

		view.dispatch({
			changes: { from: 0, to: frontmatterEnd, insert: newFrontmatter },
		});
	});

	return select;
}

/** Widget that renders a meta-bind inline select dropdown for `INPUT[inlineSelect(...):prop]`. */
export class MetaBindSelectWidget extends WidgetType {
	constructor(
		readonly options: MetaBindOption[],
		readonly bindTarget: string,
		readonly currentValue: string | null,
	) {
		super();
	}

	toDOM(view: EditorView) {
		return createMetaBindSelect(this.options, this.bindTarget, this.currentValue, view);
	}

	eq(other: MetaBindSelectWidget) {
		if (this.bindTarget !== other.bindTarget) return false;
		if (this.currentValue !== other.currentValue) return false;
		if (this.options.length !== other.options.length) return false;
		return this.options.every(
			(opt, i) => opt.value === other.options[i].value && opt.label === other.options[i].label,
		);
	}

	ignoreEvent() {
		return false;
	}
}
