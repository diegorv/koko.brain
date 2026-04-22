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
import { pasteTsvHandler } from './core/paste-tsv-handler';
import { newInlineExtensions as newInlinePipeline } from './new/new-inline-extensions';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';

export { forceDecorationRebuild } from './core/effects';
import { calloutFoldState } from './core/effects';

export const livePreviewCompartment = new Compartment();

/** Checks if a decorator is disabled via settings. Returns false (enabled) by default. */
function isDisabled(name: string): boolean {
	return settingsStore.disabledDecorators[name] ?? false;
}

/**
 * Legacy inline pipeline — the subset of inline plugins that ARE being
 * migrated to the unified pipeline in Phases 3–10. Replaced wholesale by
 * newInlineExtensions() when experimental.newLivePreview is on.
 *
 * Plugins that are NOT being migrated (image, footnote, wikilink-embed,
 * meta-bind input) live in sharedInlineExtensions() so they run on BOTH
 * paths — the unified plugin doesn't register handlers for their node
 * types, so there's no conflict.
 */
export function legacyInlineExtensions(): Extension[] {
	const exts: Extension[] = [];
	if (!isDisabled('simpleWidget')) { exts.push(simpleWidgetPlugin); }
	if (!isDisabled('inlineMarks')) { exts.push(inlineMarksPlugin); }
	if (!isDisabled('markdownStyle')) { exts.push(markdownStylePlugin); }
	if (!isDisabled('heading')) { exts.push(headingPlugin); }
	if (!isDisabled('blockquote')) { exts.push(blockquotePlugin); }
	if (!isDisabled('link')) { exts.push(linkPlugin); }
	exts.push(inlineCommentPlugin, blockReferencePlugin);
	return exts;
}

/**
 * Shared inline plugins — run regardless of experimental.newLivePreview.
 * These ViewPlugins iterate Lezer node types the unified plugin doesn't
 * claim (Image, FootnoteRef/FootnoteDef, WikilinkEmbed, MetaBindInput) so
 * they coexist cleanly with the new pipeline without double-decoration.
 */
export function sharedInlineExtensions(): Extension[] {
	const exts: Extension[] = [imagePlugin, footnotePlugin, wikilinkEmbedPlugin];
	if (!isDisabled('metaBindInput')) { exts.push(metaBindInputPlugin); }
	return exts;
}

/**
 * New inline pipeline — unified HighlightStyle + inlineFormattingPlugin.
 * Delegates to new/new-inline-extensions.ts so the scaffolding lives next
 * to markdown-highlight-style.ts + inline-formatting-plugin.ts. Phases 3–10
 * fill the handler registry consumed by the plugin.
 */
export function newInlineExtensions(): Extension[] {
	return newInlinePipeline();
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

	// Inline plugins — flag picks new vs legacy, plus always-on shared plugins
	const useNew = settingsStore.experimental.newLivePreview;
	exts.push(...(useNew ? newInlineExtensions() : legacyInlineExtensions()));
	exts.push(...sharedInlineExtensions());

	// Scroll debounce + shared
	exts.push(scrollDebouncePlugin, livePreviewClickHandler, pasteTsvHandler, livePreviewStyles);

	return exts;
}

export function livePreview(enabled: boolean): Extension {
	return livePreviewCompartment.of(enabled ? livePreviewExtensions() : []);
}
