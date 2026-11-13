import { autocompletion, closeCompletion } from '@codemirror/autocomplete';
import { history, historyKeymap, insertNewline, redo, standardKeymap, undo } from '@codemirror/commands';
import { Compartment, EditorState, Prec, Transaction } from '@codemirror/state';
import { EditorView, keymap, type KeyBinding } from '@codemirror/view';
import { editorHost, type EditorHost } from '#lib/core/markdown-editor/editor-host.js';
import { tagCompletionSource } from '#lib/core/markdown-editor/extensions/tag/completion.js';
import { wikilinkCompletionSource } from '#lib/core/markdown-editor/extensions/wikilink/completion.js';
import { buildEditorTheme } from '#lib/core/markdown-editor/setup/editor-theme.js';

/** Options of `createComposerEditor`. */
export interface ComposerEditorOptions {
	/** Element the editor mounts into. */
	parent: HTMLElement;
	/** Initial text. */
	doc: string;
	/** Vault reads for the completion sources. */
	host: EditorHost;
	/** Whether the app theme is dark. */
	dark: boolean;
	/** Called synchronously with the whole text after every change. */
	onDocChange: (text: string) => void;
	/** Called for an Escape that closes no suggestion list. */
	onEscape: () => void;
}

const themeCompartment = new Compartment();

/** The composer surface: transparent over the popover, system font, no padding. */
const composerSurfaceTheme = EditorView.theme({
	'&': {
		backgroundColor: 'transparent',
		color: 'var(--popover-foreground)',
	},
	'.cm-scroller': {
		fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
		fontSize: '14px',
		lineHeight: '1.5',
	},
	'.cm-content': {
		padding: '0',
		caretColor: 'var(--popover-foreground)',
	},
	'.cm-line': {
		padding: '0',
	},
	'.cm-cursor': {
		borderLeftColor: 'var(--popover-foreground)',
	},
});

/**
 * The editor theme, for the suggestion list's look, under the composer
 * surface. A theme listed earlier at the same precedence wins, so the
 * surface goes first at a higher one.
 */
function composerTheme(dark: boolean) {
	return [Prec.high(composerSurfaceTheme), buildEditorTheme('', 14, 1.5, 0, 0, dark)];
}

/**
 * Whether a suggestion list is on screen. Not `currentCompletions`: right
 * after a keystroke the list stays shown, greyed, while the sources are
 * queried again, and `currentCompletions` is empty then. Not
 * `completionStatus` either: every typed character makes it `pending` for
 * a moment, also where no list will open.
 */
function listShown(view: EditorView): boolean {
	return view.dom.querySelector('.cm-tooltip-autocomplete') !== null;
}

/**
 * The text field of the Quick Capture composer: plain text, with the editor's `[[wikilink]]` and `#tag` completion. The
 * two completion sources and the editor theme are the editor's own; no
 * markdown language, no closing brackets, no date shortcuts.
 *
 * Keys: with a list open, Enter accepts and Escape closes the list, as in the
 * editor. Otherwise Enter inserts a newline and Escape calls `onEscape`.
 * Mod-Enter is left to the page, which saves.
 */
export function createComposerEditor(opts: ComposerEditorOptions): EditorView {
	const escape: KeyBinding = {
		key: 'Escape',
		stopPropagation: true,
		run(view) {
			if (listShown(view)) {
				closeCompletion(view);
				return true;
			}
			opts.onEscape();
			return true;
		},
	};

	return new EditorView({
		parent: opts.parent,
		state: EditorState.create({
			doc: opts.doc,
			selection: { anchor: opts.doc.length },
			extensions: [
				editorHost.of(opts.host),
				// Before autocompletion(): it adds its own Escape at this precedence.
				Prec.highest(keymap.of([escape])),
				autocompletion({
					override: [wikilinkCompletionSource, tagCompletionSource],
					activateOnTyping: true,
				}),
				history(),
				keymap.of([
					// standardKeymap's Enter copies the line indent, which plain text should not.
					{ key: 'Enter', run: insertNewline, shift: insertNewline },
					...standardKeymap,
					...historyKeymap.filter((binding) => binding.run === undo || binding.run === redo),
				]),
				EditorView.lineWrapping,
				EditorView.contentAttributes.of({
					'aria-label': 'Quick capture composer',
					'aria-placeholder': 'Quick capture...',
				}),
				themeCompartment.of(composerTheme(opts.dark)),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) opts.onDocChange(update.state.doc.toString());
				}),
			],
		}),
	});
}

/**
 * Replaces the whole text, with the cursor at the end, when it differs. Not
 * an undo step: it restores a draft or drops a saved capture.
 */
export function setComposerText(view: EditorView, text: string): void {
	if (view.state.doc.toString() === text) return;
	view.dispatch({
		changes: { from: 0, to: view.state.doc.length, insert: text },
		selection: { anchor: text.length },
		annotations: Transaction.addToHistory.of(false),
	});
}

/** Switches the editor theme between its light and dark base. */
export function setComposerDark(view: EditorView, dark: boolean): void {
	view.dispatch({ effects: themeCompartment.reconfigure(composerTheme(dark)) });
}
