import { type EditorView, WidgetType } from '@codemirror/view';
import { isSafeUrl } from '#lib/utils/sanitize-url.js';
import { editorHost } from '../../../editor-host';
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
}

/**
 * Executes a single button action. Navigation and note creation go through
 * the view's editor host.
 * Returns `false` when an `updateMetadata` write was refused or a
 * `createNote` opened nothing, which stops the rest of the button's actions.
 */
async function executeButtonAction(action: ButtonAction, view: EditorView): Promise<boolean> {
	const host = view.state.facet(editorHost);
	switch (action.type) {
		case 'updateMetadata': {
			const { dispatchMetaBindUpdate } = await import('../widgets');
			return dispatchMetaBindUpdate(view, action.bindTarget, action.value);
		}

		case 'open': {
			const link = action.link;
			if (link.startsWith('[[') && link.endsWith(']]')) {
				const resolvedPath = host.resolveLink(link.slice(2, -2));
				if (resolvedPath) {
					await host.openLink(resolvedPath);
				}
			} else if (link.startsWith('http')) {
				if (isSafeUrl(link)) {
					await host.openExternal(link);
				}
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
	}
	return true;
}
