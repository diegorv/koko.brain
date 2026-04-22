import { EditorView, WidgetType } from '@codemirror/view';

import {
	parseFrontmatterProperties,
	updatePropertyValue,
	addProperty,
	extractBody,
	rebuildContent,
} from '$lib/features/properties/properties.logic';

/**
 * Widget for `` `INPUT[number(...):bindTarget]` `` fields. Shows an `<input
 * type="number">` wired to the frontmatter property. Commits on blur or Enter,
 * reverts on Escape. Displays an inline error when the bound frontmatter
 * already holds a non-numeric value, giving users a one-glance hint that the
 * property is malformed.
 */
export class MetaBindNumberWidget extends WidgetType {
	constructor(
		readonly bindTarget: string,
		readonly currentValue: string | null,
	) {
		super();
	}

	toDOM(view: EditorView): HTMLElement {
		const wrap = document.createElement('span');
		wrap.className = 'cm-lp-meta-bind-number';

		// type="text" + inputMode="numeric" keeps our validation authoritative —
		// native type="number" inputs silently clear non-numeric keystrokes, which
		// breaks the "flag as invalid + don't commit on blur" flow below.
		const input = document.createElement('input');
		input.type = 'text';
		input.inputMode = 'numeric';
		input.className = 'cm-lp-meta-bind-number-input';
		input.value = this.currentValue ?? '';

		const error = document.createElement('span');
		error.className = 'cm-lp-meta-bind-number-error';
		error.setAttribute('role', 'alert');

		const initialInvalid =
			this.currentValue !== null && this.currentValue !== '' && !isNumericString(this.currentValue);
		if (initialInvalid) {
			input.classList.add('cm-lp-meta-bind-number-input-invalid');
			error.textContent = `"${this.currentValue}" is not a number`;
		}

		input.addEventListener('mousedown', (e) => e.stopPropagation());

		input.addEventListener('input', () => {
			const raw = input.value;
			if (raw === '' || isNumericString(raw)) {
				input.classList.remove('cm-lp-meta-bind-number-input-invalid');
				error.textContent = '';
			} else {
				input.classList.add('cm-lp-meta-bind-number-input-invalid');
				error.textContent = `"${raw}" is not a number`;
			}
		});

		const commit = () => {
			const raw = input.value.trim();
			if (raw !== '' && !isNumericString(raw)) return; // leave invalid in place
			writeNumberProperty(view, this.bindTarget, raw);
		};

		input.addEventListener('blur', commit);
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				commit();
				input.blur();
			} else if (e.key === 'Escape') {
				input.value = this.currentValue ?? '';
				input.classList.remove('cm-lp-meta-bind-number-input-invalid');
				error.textContent = '';
				input.blur();
			}
		});

		wrap.appendChild(input);
		wrap.appendChild(error);
		return wrap;
	}

	eq(other: MetaBindNumberWidget) {
		return this.bindTarget === other.bindTarget && this.currentValue === other.currentValue;
	}

	ignoreEvent() {
		return false;
	}
}

/** True for strings that parse as finite numbers. Rejects 'NaN', ''. */
export function isNumericString(value: string): boolean {
	if (value === '' || value === 'NaN') return false;
	const n = Number(value);
	return Number.isFinite(n);
}

/** Writes `value` to the frontmatter property, creating the key if absent. */
function writeNumberProperty(view: EditorView, bindTarget: string, value: string): void {
	const doc = view.state.doc.toString();
	const properties = parseFrontmatterProperties(doc);
	const body = extractBody(doc);

	const existing = properties.find((p) => p.key === bindTarget);
	let updated;
	if (existing) {
		updated = updatePropertyValue(properties, bindTarget, value);
	} else {
		updated = addProperty(properties, bindTarget);
		updated = updatePropertyValue(updated, bindTarget, value);
	}

	const newContent = rebuildContent(updated, body);
	const frontmatterEnd = doc.length - body.length;
	const newFrontmatter = newContent.slice(0, newContent.length - body.length);

	view.dispatch({
		changes: { from: 0, to: frontmatterEnd, insert: newFrontmatter },
	});
}
