import { Compartment } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { livePreviewClickHandler } from './click-handler';
import { livePreviewStyles } from './styles';
import { mouseSelectingField, mouseSelectingHandlers } from './core/mouse-selecting';
import { frontmatterField, frontmatterGutter } from './plugins/frontmatter-field';
import { codeBlockField } from './plugins/code-block-field';
import { blockCommentField } from './plugins/block-comment-field';
import { tableField } from './plugins/table-field';
import { calloutField } from './plugins/callout-field';
import { collectionBlockField } from './plugins/collection-block-field';
import { metaBindButtonField } from './plugins/meta-bind-button-field';
import { queryjsBlockField } from './plugins/queryjs-block-field';
import { mermaidField } from './plugins/mermaid-field';
import { blockMathField } from './plugins/block-math-field';
import { simpleWidgetPlugin } from './plugins/simple-widget-plugin';
import { inlineMarksPlugin } from './plugins/inline-marks-plugin';
import { markdownStylePlugin } from './plugins/markdown-style-plugin';
import { headingPlugin } from './plugins/heading-plugin';
import { blockquotePlugin } from './plugins/blockquote-plugin';
import { linkPlugin } from './plugins/link-plugin';
import { imagePlugin } from './plugins/image-plugin';
import { footnotePlugin } from './plugins/footnote-plugin';
import { wikilinkEmbedPlugin } from './plugins/wikilink-embed-plugin';
import { metaBindInputPlugin } from './plugins/meta-bind-input-plugin';
import { inlineCommentPlugin } from './plugins/inline-comment-plugin';
import { blockReferencePlugin } from './plugins/block-reference-plugin';
import { audioPlugin } from './plugins/audio-plugin';
import { videoPlugin } from './plugins/video-plugin';
import { scrollDebouncePlugin } from './core/scroll-debounce-plugin';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';

export { forceDecorationRebuild } from './core/effects';
import { calloutFoldState } from './core/effects';

export const livePreviewCompartment = new Compartment();

/** Checks if a decorator is disabled via settings. Returns false (enabled) by default. */
function isDisabled(name: string): boolean {
	return settingsStore.disabledDecorators[name] ?? false;
}

/**
 * Legacy inline pipeline — the 11 inline plugins shipped before the Híbrido D
 * refactor. Kept as the default path until experimental.newLivePreview is
 * flipped in Phase 11.5.
 */
export function legacyInlineExtensions(): Extension[] {
	const exts: Extension[] = [];
	if (!isDisabled('simpleWidget')) { exts.push(simpleWidgetPlugin); }
	if (!isDisabled('inlineMarks')) { exts.push(inlineMarksPlugin); }
	if (!isDisabled('markdownStyle')) { exts.push(markdownStylePlugin); }
	if (!isDisabled('heading')) { exts.push(headingPlugin); }
	if (!isDisabled('blockquote')) { exts.push(blockquotePlugin); }
	if (!isDisabled('link')) { exts.push(linkPlugin); }
	exts.push(imagePlugin, footnotePlugin, wikilinkEmbedPlugin);
	if (!isDisabled('metaBindInput')) { exts.push(metaBindInputPlugin); }
	exts.push(inlineCommentPlugin, blockReferencePlugin);
	return exts;
}

/**
 * New inline pipeline — unified HighlightStyle + inlineFormattingPlugin.
 * Phases 2–11 progressively fill this array. Returns `[]` while scaffolding
 * is in place but no handlers are migrated yet.
 */
export function newInlineExtensions(): Extension[] {
	return [];
}

export function livePreviewExtensions(): Extension[] {
	const exts: Extension[] = [
		mouseSelectingField,
		mouseSelectingHandlers,
		calloutFoldState,
	];

	// Block plugins
	if (!isDisabled('frontmatter')) { exts.push(frontmatterField, frontmatterGutter); }
	if (!isDisabled('codeBlock')) { exts.push(codeBlockField); }
	exts.push(blockCommentField);
	if (!isDisabled('table')) { exts.push(tableField); }
	if (!isDisabled('callout')) { exts.push(calloutField); }
	exts.push(collectionBlockField);
	if (!isDisabled('queryjs')) { exts.push(queryjsBlockField); }
	exts.push(metaBindButtonField, mermaidField, blockMathField, audioPlugin, videoPlugin);

	// Inline plugins — flag picks new vs legacy
	const useNew = settingsStore.experimental.newLivePreview;
	exts.push(...(useNew ? newInlineExtensions() : legacyInlineExtensions()));

	// Scroll debounce + shared
	exts.push(scrollDebouncePlugin, livePreviewClickHandler, livePreviewStyles);

	return exts;
}

export function livePreview(enabled: boolean): Extension {
	return livePreviewCompartment.of(enabled ? livePreviewExtensions() : []);
}
