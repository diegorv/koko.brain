import { type EditorView, WidgetType } from '@codemirror/view';
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
				await executeButtonAction(action, view);
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
 * Executes a single button action.
 * Uses dynamic imports to avoid circular dependencies and keep the widget lightweight.
 */
async function executeButtonAction(action: ButtonAction, view: EditorView): Promise<void> {
	switch (action.type) {
		case 'updateMetadata': {
			const {
				parseFrontmatterProperties,
				updatePropertyValue,
				addProperty,
				extractBody,
				rebuildContent,
			} = await import('$lib/features/properties/properties.logic');

			const doc = view.state.doc.toString();
			const properties = parseFrontmatterProperties(doc);
			const body = extractBody(doc);

			const existing = properties.find((p) => p.key === action.bindTarget);
			let updated;
			if (existing) {
				updated = updatePropertyValue(properties, action.bindTarget, action.value);
			} else {
				updated = addProperty(properties, action.bindTarget);
				updated = updatePropertyValue(updated, action.bindTarget, action.value);
			}

			const newContent = rebuildContent(updated, body);
			const frontmatterEnd = doc.length - body.length;
			const newFrontmatter = newContent.slice(0, newContent.length - body.length);

			view.dispatch({
				changes: { from: 0, to: frontmatterEnd, insert: newFrontmatter },
			});
			break;
		}

		case 'open': {
			const link = action.link;
			if (link.startsWith('[[') && link.endsWith(']]')) {
				const target = link.slice(2, -2);
				const { resolveWikilink } = await import('$lib/features/backlinks/backlinks.logic');
				const { fsStore } = await import('$lib/core/filesystem/fs.store.svelte');
				const { flattenFileTree } = await import('$lib/features/quick-switcher/quick-switcher.logic');
				const { openFileInEditor } = await import('$lib/core/editor/editor.service');
				const files = flattenFileTree(fsStore.fileTree);
				const resolvedPath = resolveWikilink(target, files.map((f) => f.path));
				if (resolvedPath) {
					await openFileInEditor(resolvedPath);
				}
			} else if (link.startsWith('http')) {
				const { isSafeUrl } = await import('$lib/utils/sanitize-url');
				if (isSafeUrl(link)) {
					const { openUrl } = await import('@tauri-apps/plugin-opener');
					await openUrl(link);
				}
			}
			break;
		}

		case 'createNote': {
			const { openOrCreateNote } = await import('$lib/core/note-creator/note-creator.service');
			const { vaultStore } = await import('$lib/core/vault/vault.store.svelte');

			const folder = action.folderPath ? `${action.folderPath}/` : '';
			const filePath = `${vaultStore.path}/${folder}${action.fileName}.md`;

			await openOrCreateNote({
				filePath,
				title: action.fileName,
			});
			break;
		}
	}
}
