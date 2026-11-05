import { type EditorView, WidgetType } from '@codemirror/view';
import { toast } from 'svelte-sonner';
import { isSafeUrl } from '#lib/utils/sanitize-url.js';
import { editorHost } from '../../../editor-host';
import { findWikilinkInfoAtPosition } from '../../wikilink/decoration.logic';
import { followWikilinkInfo } from '../wikilink-navigation';
import {
	type ButtonAction,
	type ButtonConfig,
	getButtonActions,
} from '../meta-bind-button.logic';

/** Widget that renders a ```meta-bind-button code block as an interactive button */
export class MetaBindButtonWidget extends WidgetType {
	constructor(readonly config: ButtonConfig) {
		super();
	}

	toDOM(view: EditorView) {
		const container = document.createElement('div');
		container.className = 'cm-lp-meta-bind-button-container';

		const button = document.createElement('button');
		button.className = `cm-lp-meta-bind-btn cm-lp-meta-bind-btn-${this.config.style}`;
		button.textContent = this.config.label;
		button.title = this.config.tooltip ?? this.config.label;

		button.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
		});

		button.addEventListener('click', async (e) => {
			e.preventDefault();
			e.stopPropagation();
			const actions = getButtonActions(this.config);
			for (const action of actions) {
				if (!(await executeButtonAction(action, view))) break;
			}
		});

		container.appendChild(button);
		return container;
	}

	eq(other: MetaBindButtonWidget) {
		return (
			this.config.label === other.config.label &&
			this.config.style === other.config.style &&
			this.config.tooltip === other.config.tooltip &&
			JSON.stringify(getButtonActions(this.config)) ===
				JSON.stringify(getButtonActions(other.config))
		);
	}

	ignoreEvent() {
		return true;
	}
}

/** Widget that renders an error message for invalid button configurations */
export class MetaBindButtonErrorWidget extends WidgetType {
	constructor(readonly error: string) {
		super();
	}

	toDOM() {
		const container = document.createElement('div');
		container.className = 'cm-lp-meta-bind-button-error';
		container.textContent = `Invalid button: ${this.error}`;
		return container;
	}

	eq(other: MetaBindButtonErrorWidget) {
		return this.error === other.error;
	}

	/**
	 * Lets the editor handle a click on the box, which puts the cursor in the
	 * fence and reveals the invalid YAML: the box is the mouse path to it.
	 */
	ignoreEvent() {
		return false;
	}
}

/**
 * Executes a single button action. Navigation, note creation and opening a
 * view go through the view's editor host.
 * Returns `false` when an `updateMetadata` write was refused, an `open` link
 * is empty, unparseable or an unsafe URL (with an error toast), a
 * `createNote` opened nothing, or an `openView` names no file in the vault
 * (with an error toast), which stops the rest of the button's actions.
 */
async function executeButtonAction(action: ButtonAction, view: EditorView): Promise<boolean> {
	const host = view.state.facet(editorHost);
	switch (action.type) {
		case 'updateMetadata': {
			const { dispatchMetaBindUpdate } = await import('../widgets');
			return dispatchMetaBindUpdate(view, action.bindTarget, action.value);
		}

		case 'open': {
			const link = action.link.trim();
			if (link.startsWith('[[') && link.endsWith(']]')) {
				// The body-link parser, so `[[Note|alias]]`, `[[Note#Heading]]` and a
				// missing note behave as they do from a wikilink in the note.
				const info = findWikilinkInfoAtPosition(link, 0, 0);
				if (!info || (!info.target && info.heading === null && info.blockId === null)) {
					return refuseOpen(link, 'not a wikilink');
				}
				await followWikilinkInfo(view, info);
			} else if (link.startsWith('http')) {
				if (!isSafeUrl(link)) return refuseOpen(link, 'unsafe URL');
				await host.openExternal(link);
			} else {
				return refuseOpen(link, link === '' ? 'empty link' : 'not a [[wikilink]] or http(s) URL');
			}
			break;
		}

		case 'createNote': {
			const relative = action.folderPath
				? `${action.folderPath}/${action.fileName}`
				: action.fileName;
			// A button names its note's path exactly: no periodic-folder redirect.
			return host.createNote(relative, undefined, { periodic: false });
		}

		case 'openView': {
			if (await host.openView(action.path)) return true;
			toast.error(`Button cannot open view "${action.path}": file not found`);
			return false;
		}
	}
	return true;
}

/** Reports an `open` action that cannot run and stops the button's actions. */
function refuseOpen(link: string, reason: string): false {
	toast.error(link === '' ? `Button cannot open: ${reason}` : `Button cannot open "${link}": ${reason}`);
	return false;
}
