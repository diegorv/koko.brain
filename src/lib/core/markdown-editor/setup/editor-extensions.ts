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
import type { Compartment, Extension, StateEffect } from '@codemirror/state';
import { history, defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, indentOnInput } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';

import { wikilinkCompletionSource, wikilinkDecoration } from '../extensions/wikilink';
import { dateShortcutCompletionSource } from '../extensions/date-shortcut/completion';
import { tagCompletionSource } from '../extensions/tag/completion';
import { calloutDecoration } from '../extensions/callout';
import { compositionAwareBracketMatching } from '../extensions/composition-aware-bracket-matching';
import { livePreview, livePreviewCompartment, livePreviewExtensions } from '../extensions/live-preview';
import { markdownHighlight, markdownLanguage, sourceHeadingSize } from '../highlight-styles';
import { toCodeMirrorKey } from '#lib/utils/keybindings.js';
import { editorHost, type EditorHost } from '../editor-host';
import { fencedBlockRenderers, type FencedBlockRenderer } from '../extensions/live-preview/core/fenced-block-renderers';
import { buildEditorTheme } from './editor-theme';
import { FRONTMATTER_FENCE_RE } from '../extensions/live-preview/parsers/frontmatter';

/**
 * Copy Block Link (Cmd+Shift+L). Bound in the editor keymap below, not
 * globally, because it needs the focused editor; the command palette reads
 * its label from here.
 */
export const COPY_BLOCK_LINK_SHORTCUT = { meta: true, shift: true, key: 'l' } as const;

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
	/** Whether the applied app theme is dark (`appliedThemeStore.isDark`); picks CodeMirror's base theme */
	dark: boolean;
	/** Compartment holding `sourceModeExtensions()` in source mode and `[]` in live preview */
	sourceModeCompartment: Compartment;
	/** Compartment for dynamic theme updates */
	editorThemeCompartment: Compartment;
	/** Compartment for switching language parser */
	languageCompartment: Compartment;
	/** Compartment for switching highlight style */
	highlightStyleCompartment: Compartment;
	/**
	 * The app's editor host. Installed outside every compartment, so completion
	 * and the keymap reach it in source mode too; pass a stable object, since
	 * the editor never reconfigures it.
	 */
	host: EditorHost;
	/**
	 * The fenced-block renderers (queryjs, collection), installed outside every
	 * compartment like the host; a language with none renders as raw lines.
	 */
	renderers: readonly FencedBlockRenderer[];
	/** Decorator kill-switches (Settings > Troubleshooting), read when live preview is installed */
	disabledDecorators: Record<string, boolean>;
	/** Copy Block Link for the focused editor, run by the Cmd+Shift+L keymap entry */
	copyBlockLink: (view: EditorView) => void | Promise<void>;
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

/**
 * Effects that switch a mounted editor between live preview and source mode.
 * Both compartments change in the same transaction, so the editor never
 * holds both modes' extensions (or neither) and each mode keeps one heading
 * size owner.
 */
export function editorModeEffects(
	isLivePreview: boolean,
	sourceModeCompartment: Compartment,
	disabledDecorators: Record<string, boolean>,
): StateEffect<unknown>[] {
	return [
		livePreviewCompartment.reconfigure(isLivePreview ? livePreviewExtensions(disabledDecorators) : []),
		sourceModeCompartment.reconfigure(isLivePreview ? [] : sourceModeExtensions()),
	];
}

/** Builds the full CodeMirror extension array for the markdown editor */
export function createExtensions(opts: CreateExtensionsOptions): Extension[] {
	return [
		editorHost.of(opts.host),
		opts.renderers.map((renderer) => fencedBlockRenderers.of(renderer)),
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
			override: [wikilinkCompletionSource, dateShortcutCompletionSource, tagCompletionSource],
			activateOnTyping: true,
		}),
		livePreview(opts.isLivePreview, opts.disabledDecorators),
		rectangularSelection(),
		crosshairCursor(),
		highlightActiveLine(),
		keymap.of([
			{
				key: toCodeMirrorKey(COPY_BLOCK_LINK_SHORTCUT),
				run: (v) => {
					void opts.copyBlockLink(v);
					return true;
				},
			},
			...closeBracketsKeymap,
			...defaultKeymap,
			// Mod-d is the app's Favorite shortcut (global-keybindings.ts), so
			// CodeMirror's select-next-occurrence must not take it first.
			...searchKeymap.filter((binding) => binding.key !== 'Mod-d'),
			...historyKeymap,
			...completionKeymap,
			indentWithTab,
		]),
		opts.languageCompartment.of(markdownLanguage()),
		opts.editorThemeCompartment.of(
			buildEditorTheme(opts.fontFamily, opts.fontSize, opts.lineHeight, opts.contentWidth, opts.paragraphSpacing, opts.dark)
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
