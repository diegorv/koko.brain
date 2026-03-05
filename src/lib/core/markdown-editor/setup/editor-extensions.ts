import {
	EditorView,
	keymap,
	lineNumbers,
	highlightActiveLineGutter,
	highlightSpecialChars,
	dropCursor,
	rectangularSelection,
	crosshairCursor,
	highlightActiveLine,
} from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import type { Compartment, Extension } from '@codemirror/state';
import { history, defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, indentOnInput } from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';

import { wikilinkCompletion, wikilinkDecoration } from '../extensions/wikilink';
import { calloutDecoration } from '../extensions/callout';
import { compositionAwareBracketMatching } from '../extensions/composition-aware-bracket-matching';
import { livePreview } from '../extensions/live-preview';
import { markdownHighlight, markdownLanguage } from '../highlight-styles';
import { copyBlockLinkToClipboard } from '$lib/features/copy-block-link/copy-block-link.service';
import { buildEditorTheme } from './editor-theme';
// Debug extension for composition issues (dead-key accents on WebKit).
// Uncomment to enable: logs composition events, DOM mutations, and exposes window.dbg.* toggles.
// import { compositionDebugExtension } from '../extensions/debug-composition';

/** Options for building the CodeMirror extension array */
export interface CreateExtensionsOptions {
	/** Whether live preview mode is active */
	isLivePreview: boolean;
	/** Editor font family */
	fontFamily: string;
	/** Editor font size in pixels */
	fontSize: number;
	/** Editor line height multiplier */
	lineHeight: number;
	/** Maximum content width in pixels (0 = no limit) */
	contentWidth: number;
	/** Extra vertical spacing added after each line, in em (0 = none) */
	paragraphSpacing: number;
	/** Compartment for toggling line numbers */
	lineNumbersCompartment: Compartment;
	/** Compartment for dynamic theme updates */
	editorThemeCompartment: Compartment;
	/** Compartment for switching language parser */
	languageCompartment: Compartment;
	/** Compartment for switching highlight style */
	highlightStyleCompartment: Compartment;
	/** Callback invoked when the document content changes */
	onDocChanged: (content: string) => void;
	/** Returns whether a tab switch is in progress (suppresses onDocChanged) */
	isTabSwitching: () => boolean;
}

/** Builds the full CodeMirror extension array for the markdown editor */
export function createExtensions(opts: CreateExtensionsOptions): Extension[] {
	return [
		opts.lineNumbersCompartment.of(
			opts.isLivePreview ? [] : [lineNumbers(), highlightActiveLineGutter()]
		),
		highlightSpecialChars(),
		history(),
		dropCursor(),
		EditorState.allowMultipleSelections.of(true),
		indentOnInput(),
		compositionAwareBracketMatching(),
		closeBrackets(),
		wikilinkCompletion(),
		wikilinkDecoration(),
		calloutDecoration(),
		livePreview(opts.isLivePreview),
		rectangularSelection(),
		crosshairCursor(),
		highlightActiveLine(),
		highlightSelectionMatches({ highlightWordAroundCursor: false, minSelectionLength: Infinity }),
		keymap.of([
			{
				key: 'Mod-Shift-l',
				run: (v) => {
					copyBlockLinkToClipboard(v);
					return true;
				},
			},
			...closeBracketsKeymap,
			...defaultKeymap,
			...searchKeymap,
			...historyKeymap,
			...completionKeymap,
			indentWithTab,
		]),
		opts.languageCompartment.of(markdownLanguage()),
		opts.editorThemeCompartment.of(
			buildEditorTheme(opts.fontFamily, opts.fontSize, opts.lineHeight, opts.contentWidth, opts.paragraphSpacing)
		),
		opts.highlightStyleCompartment.of(syntaxHighlighting(markdownHighlight)),
		EditorView.lineWrapping,
		// compositionDebugExtension(),
		EditorView.updateListener.of((update) => {
			if (update.docChanged && !opts.isTabSwitching()) {
				opts.onDocChanged(update.state.doc.toString());
			}
		}),
	];
}
