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
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';

import { wikilinkCompletionSource, wikilinkDecoration } from '../extensions/wikilink';
import { dateShortcutCompletionSource } from '../extensions/date-shortcut/completion';
import { calloutDecoration } from '../extensions/callout';
import { compositionAwareBracketMatching } from '../extensions/composition-aware-bracket-matching';
import { livePreview } from '../extensions/live-preview';
import { markdownHighlight, markdownLanguage, sourceHeadingSize } from '../highlight-styles';
import { copyBlockLinkToClipboard } from '#lib/features/copy-block-link/copy-block-link.service.js';
import { buildEditorTheme } from './editor-theme';
import { FRONTMATTER_FENCE_RE } from '../extensions/live-preview/parsers/frontmatter';

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
	/** Compartment holding `sourceModeExtensions()` in source mode and `[]` in live preview */
	sourceModeCompartment: Compartment;
	/** Compartment for dynamic theme updates */
	editorThemeCompartment: Compartment;
	/** Compartment for switching language parser */
	languageCompartment: Compartment;
	/** Compartment for switching highlight style */
	highlightStyleCompartment: Compartment;
	/** Callback invoked when the document content changes */
	onDocChanged: (content: string, frontmatterChanged: boolean) => void;
	/** Returns whether a tab switch is in progress (suppresses onDocChanged) */
	isTabSwitching: () => boolean;
	/**
	 * Returns whether an external-content doc replace is in progress
	 * (suppresses onDocChanged). External writers pick their auto-save
	 * schedule explicitly via `syncExternalContentToEditor`, so their doc
	 * replace must not re-enter the keystroke pipeline.
	 */
	isExternalEdit: () => boolean;
}

/**
 * Extensions installed only in source mode. The legacy wikilink and callout
 * decorations are the only styling for those constructs in source mode; in
 * live preview the inline wikilink handler and `calloutField` own them, so
 * installing these there would style the same text twice. `sourceHeadingSize`
 * is the source-mode heading size owner; in live preview the `cm-lp-hN` line
 * class owns it, and the two together would compound.
 */
export function sourceModeExtensions(): Extension[] {
	return [
		lineNumbers(),
		highlightActiveLineGutter(),
		wikilinkDecoration(),
		calloutDecoration(),
		syntaxHighlighting(sourceHeadingSize),
	];
}

/** Builds the full CodeMirror extension array for the markdown editor */
export function createExtensions(opts: CreateExtensionsOptions): Extension[] {
	return [
		opts.sourceModeCompartment.of(opts.isLivePreview ? [] : sourceModeExtensions()),
		highlightSpecialChars(),
		history(),
		dropCursor(),
		EditorState.allowMultipleSelections.of(true),
		indentOnInput(),
		compositionAwareBracketMatching(),
		closeBrackets(),
		// Single autocompletion instance for ALL completion sources — the
		// config facet has no combiner for `override`, so a second
		// autocompletion() extension would throw "Config merge conflict".
		autocompletion({
			override: [wikilinkCompletionSource, dateShortcutCompletionSource],
			activateOnTyping: true,
		}),
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
		EditorView.updateListener.of((update) => {
			if (update.docChanged && !opts.isTabSwitching() && !opts.isExternalEdit()) {
				const doc = update.startState.doc;
				let fmChanged = false;
				if (doc.lines >= 2 && FRONTMATTER_FENCE_RE.test(doc.line(1).text)) {
					let fmEnd = -1;
					for (let i = 2; i <= doc.lines; i++) {
						if (FRONTMATTER_FENCE_RE.test(doc.line(i).text)) {
							fmEnd = doc.line(i).to;
							break;
						}
					}
					if (fmEnd !== -1) {
						update.changes.iterChangedRanges((fromA, _toA) => {
							if (fromA <= fmEnd) fmChanged = true;
						});
					}
				}
				opts.onDocChanged(update.state.doc.toString(), fmChanged);
			}
		}),
	];
}
