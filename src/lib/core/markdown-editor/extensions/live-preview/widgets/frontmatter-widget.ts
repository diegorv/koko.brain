import { type EditorView, WidgetType } from '@codemirror/view';
import type { Property, PropertyType } from '$lib/features/properties/properties.types';
import {
	parseFrontmatterProperties,
	extractBody,
	rebuildContent,
	updatePropertyValue,
	renamePropertyKey,
	removeProperty,
	addProperty,
} from '$lib/features/properties/properties.logic';
import { WIKILINK_DECORATION_RE } from '../../wikilink/decoration.logic';
import { openWikilinkTarget } from '../wikilink-navigation';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { getTagColor } from '$lib/features/tags/tag-colors.logic';

/** SVG icon strings for property type indicators */
const ICON_DATE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
const ICON_TAG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>';
const ICON_LINK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
const ICON_NUMBER = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>';
const ICON_BOOLEAN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
const ICON_TEXT = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>';
/** Small tag icon for inline use in frontmatter tag pills */
const ICON_TAG_SMALL = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>';

/** Keys that always use the date icon regardless of detected type */
const DATE_KEYS = new Set(['created', 'updated', 'modified', 'date', 'published']);
/** Keys that always use the tag icon regardless of detected type */
const TAG_KEYS = new Set(['tags', 'tag']);
/** Keys that always use the link icon regardless of detected type */
const ALIAS_KEYS = new Set(['aliases', 'alias', 'cssclasses', 'cssclass']);

/**
 * Renders a text value with wikilinks as clickable `<a>` elements.
 * Non-wikilink text is rendered as plain text nodes.
 */
function renderWikilinkValue(parent: HTMLElement, text: string): void {
	WIKILINK_DECORATION_RE.lastIndex = 0;
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = WIKILINK_DECORATION_RE.exec(text)) !== null) {
		if (match.index > lastIndex) {
			parent.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
		}

		const target = match[1];
		const displayText = match[3] ?? target;

		const a = document.createElement('a');
		a.textContent = displayText;
		a.className = 'cm-lp-wikilink';
		a.href = '#';
		a.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			openWikilinkTarget(target);
		});
		parent.appendChild(a);

		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < text.length) {
		parent.appendChild(document.createTextNode(text.slice(lastIndex)));
	}
}

/** Returns an SVG icon string based on the property key and type */
export function getPropertyIcon(key: string, type: PropertyType): string {
	const k = key.toLowerCase();
	if (DATE_KEYS.has(k)) return ICON_DATE;
	if (TAG_KEYS.has(k)) return ICON_TAG;
	if (ALIAS_KEYS.has(k)) return ICON_LINK;

	switch (type) {
		case 'number': return ICON_NUMBER;
		case 'boolean': return ICON_BOOLEAN;
		case 'date': return ICON_DATE;
		case 'list': return ICON_TAG;
		default: return ICON_TEXT;
	}
}

/**
 * Parses the current document, applies a mutation to the properties,
 * and dispatches a transaction that replaces the frontmatter section.
 * Follows the established pattern from createMetaBindSelect.
 */
export function dispatchFrontmatterChange(
	view: EditorView,
	mutate: (properties: Property[]) => Property[],
): void {
	const doc = view.state.doc.toString();
	const properties = parseFrontmatterProperties(doc);
	const body = extractBody(doc);
	const updated = mutate(properties);
	const newContent = rebuildContent(updated, body);
	const frontmatterEnd = doc.length - body.length;
	const newFrontmatter = newContent.slice(0, newContent.length - body.length);
	view.dispatch({
		changes: { from: 0, to: frontmatterEnd, insert: newFrontmatter },
	});
}

/** Widget that renders YAML frontmatter as an Obsidian-style "Properties" panel */
export class FrontmatterWidget extends WidgetType {
	/** Serialized tag colors snapshot for eq() comparison */
	private colorSnapshot: string;

	constructor(readonly properties: Property[]) {
		super();
		// Capture current tag colors so eq() detects color changes
		const parts: string[] = [];
		for (const prop of properties) {
			if (TAG_KEYS.has(prop.key.toLowerCase()) && Array.isArray(prop.value)) {
				for (const item of prop.value) {
					const c = getTagColor(item, settingsStore.tagColors.colors);
					if (c) parts.push(`${item}:${c}`);
				}
			}
		}
		this.colorSnapshot = parts.join(',');
	}

	toDOM(view: EditorView) {
		const container = document.createElement('div');
		container.className = 'cm-lp-frontmatter';

		// Header
		const header = document.createElement('div');
		header.className = 'cm-lp-frontmatter-header';

		const label = document.createElement('span');
		label.className = 'cm-lp-frontmatter-label';
		label.textContent = 'Properties';
		header.appendChild(label);

		const count = document.createElement('span');
		count.className = 'cm-lp-frontmatter-count';
		count.textContent = String(this.properties.length);
		header.appendChild(count);

		container.appendChild(header);

		// Property rows
		if (this.properties.length > 0) {
			const rows = document.createElement('div');
			rows.className = 'cm-lp-frontmatter-rows';

			for (const prop of this.properties) {
				rows.appendChild(this.createPropertyRow(prop, view));
			}

			container.appendChild(rows);
		}

		// Add property button
		const addBtn = document.createElement('div');
		addBtn.className = 'cm-lp-frontmatter-add';
		addBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
		addBtn.appendChild(document.createTextNode(' Add property'));
		addBtn.addEventListener('mousedown', (e) => {
			e.stopPropagation();
		});
		addBtn.addEventListener('click', () => {
			// Replace button with input
			addBtn.innerHTML = '';
			const addInput = document.createElement('input');
			addInput.className = 'cm-lp-frontmatter-add-input';
			addInput.type = 'text';
			addInput.placeholder = 'Property name...';
			addBtn.appendChild(addInput);
			addInput.focus();

			const collapseBack = () => {
				if (!addInput.value.trim()) {
					addBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
					addBtn.appendChild(document.createTextNode(' Add property'));
				}
			};

			addInput.addEventListener('blur', collapseBack);
			addInput.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					const newKey = addInput.value.trim();
					if (!newKey) return;
					// Check for duplicate
					const hasDuplicate = this.properties.some((p) => p.key === newKey);
					if (hasDuplicate) return;
					dispatchFrontmatterChange(view, (props) =>
						addProperty(props, newKey),
					);
				} else if (e.key === 'Escape') {
					addInput.value = '';
					addInput.blur();
				}
			});
		});
		container.appendChild(addBtn);

		return container;
	}

	/** Creates a single property row with icon, key, and value */
	private createPropertyRow(prop: Property, view: EditorView): HTMLElement {
		const row = document.createElement('div');
		row.className = 'cm-lp-frontmatter-row';

		// Key with icon
		const key = document.createElement('span');
		key.className = 'cm-lp-frontmatter-key';

		const icon = document.createElement('span');
		icon.className = 'cm-lp-frontmatter-icon';
		icon.innerHTML = getPropertyIcon(prop.key, prop.type);
		key.appendChild(icon);

		const keyInput = document.createElement('input');
		keyInput.className = 'cm-lp-frontmatter-key-input';
		keyInput.type = 'text';
		keyInput.value = prop.key;
		const originalKey = prop.key;
		keyInput.addEventListener('mousedown', (e) => {
			e.stopPropagation();
		});
		keyInput.addEventListener('blur', () => {
			const newKey = keyInput.value.trim();
			if (newKey === '' || newKey === originalKey) {
				keyInput.value = originalKey;
				return;
			}
			// Check for duplicate keys
			const hasDuplicate = this.properties.some(
				(p) => p.key !== originalKey && p.key === newKey,
			);
			if (hasDuplicate) {
				keyInput.value = originalKey;
				return;
			}
			dispatchFrontmatterChange(view, (props) =>
				renamePropertyKey(props, originalKey, newKey),
			);
		});
		keyInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				keyInput.blur();
			} else if (e.key === 'Escape') {
				keyInput.value = originalKey;
				keyInput.blur();
			}
		});
		key.appendChild(keyInput);
		row.appendChild(key);

		// Value
		const value = document.createElement('span');
		value.className = 'cm-lp-frontmatter-value';

		if (prop.type === 'boolean') {
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.checked = prop.value === true;
			checkbox.className = 'cm-lp-frontmatter-checkbox';
			checkbox.addEventListener('mousedown', (e) => {
				e.stopPropagation();
			});
			checkbox.addEventListener('change', () => {
				dispatchFrontmatterChange(view, (props) =>
					updatePropertyValue(props, prop.key, !checkbox.checked),
				);
			});
			value.appendChild(checkbox);
			value.appendChild(document.createTextNode(String(prop.value)));
		} else if (prop.type === 'text' || prop.type === 'number' || prop.type === 'date') {
			const strValue = prop.value === '' ? '' : String(prop.value);
			const hasWikilink = prop.type === 'text' && WIKILINK_DECORATION_RE.test(strValue);

			if (hasWikilink) {
				// Display mode: render wikilinks as clickable links
				const display = document.createElement('span');
				display.className = 'cm-lp-frontmatter-wikilink-display';
				renderWikilinkValue(display, strValue);
				display.addEventListener('mousedown', (e) => {
					e.stopPropagation();
				});

				// Click on non-link area switches to edit mode.
				// Clicks on <a> wikilinks navigate via their own mousedown handler.
				display.addEventListener('click', (e) => {
					if ((e.target as HTMLElement).closest('a.cm-lp-wikilink')) return;
					const input = this.createTextInput(prop, strValue, view);
					value.replaceChild(input, display);
					input.focus();
					// On blur without change, swap back to display mode.
					// On blur with change, dispatchFrontmatterChange triggers a widget rebuild.
					input.addEventListener('blur', () => {
						if (input.value === strValue && value.contains(input)) {
							value.replaceChild(display, input);
						}
					});
				});
				value.appendChild(display);
			} else {
				value.appendChild(this.createTextInput(prop, strValue, view));
			}
		} else if (prop.type === 'list' && Array.isArray(prop.value)) {
			const isTagProp = TAG_KEYS.has(prop.key.toLowerCase());
			for (const item of prop.value) {
				const tag = document.createElement('span');
				tag.className = 'cm-lp-frontmatter-tag';
				if (isTagProp) {
					const tagColor = getTagColor(item, settingsStore.tagColors.colors);
					const color = tagColor ?? 'var(--tab-text-inactive)';
					tag.style.border = `1px solid color-mix(in srgb, ${color} 30%, transparent)`;
					const tagIcon = document.createElement('span');
					tagIcon.innerHTML = ICON_TAG_SMALL;
					tagIcon.style.color = color;
					tagIcon.style.display = 'inline-flex';
					tagIcon.style.alignItems = 'center';
					tag.appendChild(tagIcon);
				}
				tag.appendChild(document.createTextNode(item));

				const x = document.createElement('span');
				x.className = 'cm-lp-frontmatter-tag-x';
				x.textContent = '\u00d7';
				x.addEventListener('mousedown', (e) => {
					e.stopPropagation();
				});
				x.addEventListener('click', () => {
					dispatchFrontmatterChange(view, (props) =>
						updatePropertyValue(
							props,
							prop.key,
							(prop.value as string[]).filter((v) => v !== item),
							'list',
						),
					);
				});
				tag.appendChild(x);

				value.appendChild(tag);
			}

			// Add input for new list items
			const addInput = document.createElement('input');
			addInput.className = 'cm-lp-frontmatter-list-input';
			addInput.type = 'text';
			addInput.placeholder = 'Add...';
			addInput.addEventListener('mousedown', (e) => {
				e.stopPropagation();
			});
			addInput.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					const trimmed = addInput.value.trim();
					if (trimmed) {
						dispatchFrontmatterChange(view, (props) =>
							updatePropertyValue(
								props,
								prop.key,
								[...(prop.value as string[]), trimmed],
								'list',
							),
						);
					}
				}
			});
			value.appendChild(addInput);
		} else {
			value.textContent = prop.value === '' ? '\u2014' : String(prop.value);
		}

		row.appendChild(value);

		// Remove button
		const remove = document.createElement('span');
		remove.className = 'cm-lp-frontmatter-remove';
		remove.textContent = '\u00d7';
		remove.title = 'Remove property';
		remove.addEventListener('mousedown', (e) => {
			e.stopPropagation();
		});
		remove.addEventListener('click', () => {
			dispatchFrontmatterChange(view, (props) =>
				removeProperty(props, prop.key),
			);
		});
		row.appendChild(remove);

		return row;
	}

	/** Creates a text/number/date input element for editing a property value */
	private createTextInput(prop: Property, strValue: string, view: EditorView): HTMLInputElement {
		const input = document.createElement('input');
		input.className = 'cm-lp-frontmatter-input';
		input.type = prop.type === 'number' ? 'number' : prop.type === 'date' ? 'date' : 'text';
		input.value = strValue;
		const originalValue = strValue;
		input.addEventListener('mousedown', (e) => {
			e.stopPropagation();
		});
		input.addEventListener('blur', () => {
			if (input.value !== originalValue) {
				const newValue = prop.type === 'number' ? Number(input.value) : input.value;
				dispatchFrontmatterChange(view, (props) =>
					updatePropertyValue(props, prop.key, newValue),
				);
			}
		});
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				input.blur();
			}
		});
		return input;
	}

	eq(other: FrontmatterWidget) {
		if (this.colorSnapshot !== other.colorSnapshot) return false;
		if (this.properties.length !== other.properties.length) return false;
		return this.properties.every(
			(p, i) => {
				const o = other.properties[i];
				if (p.key !== o.key || p.type !== o.type) return false;
				if (Array.isArray(p.value) && Array.isArray(o.value)) {
					const oArr = o.value;
					return p.value.length === oArr.length && p.value.every((v, j) => v === oArr[j]);
				}
				return p.value === o.value;
			},
		);
	}

	ignoreEvent() {
		return true;
	}
}
