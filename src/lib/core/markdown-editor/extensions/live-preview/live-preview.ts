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
import { imagePlugin } from './plugins/image-plugin';
import { footnotePlugin } from './plugins/footnote-plugin';
import { wikilinkEmbedPlugin } from './plugins/wikilink-embed-plugin';
import { metaBindInputPlugin } from './plugins/meta-bind-input-plugin';
import { audioPlugin } from './plugins/audio-plugin';
import { videoPlugin } from './plugins/video-plugin';
import { scrollDebouncePlugin } from './core/scroll-debounce-plugin';
import { pasteTsvHandler } from './core/paste-tsv-handler';
import { newInlineExtensions } from './inline/inline-extensions';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';

export { forceDecorationRebuild } from './core/effects';
import { calloutFoldState } from './core/effects';

export const livePreviewCompartment = new Compartment();

/** Checks if a decorator is disabled via settings. Returns false (enabled) by default. */
function isDisabled(name: string): boolean {
	return settingsStore.disabledDecorators[name] ?? false;
}

/**
 * Inline plugins that iterate Lezer node types the unified pipeline does not
 * register handlers for (Image, FootnoteRef/FootnoteDef, WikilinkEmbed,
 * MetaBindInput). They coexist with the unified plugin without double-decoration
 * because the node-handler registry only fires for types registered by
 * `PRODUCTION_INLINE_HANDLERS`.
 */
export function sharedInlineExtensions(): Extension[] {
	const exts: Extension[] = [imagePlugin, footnotePlugin, wikilinkEmbedPlugin];
	if (!isDisabled('metaBindInput')) { exts.push(metaBindInputPlugin); }
	return exts;
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

	// Inline: unified pipeline (syntaxHighlighting + inlineFormattingPlugin) + shared plugins
	exts.push(...newInlineExtensions(), ...sharedInlineExtensions());

	// Scroll debounce + shared
	exts.push(scrollDebouncePlugin, livePreviewClickHandler, pasteTsvHandler, livePreviewStyles);

	return exts;
}

export function livePreview(enabled: boolean): Extension {
	return livePreviewCompartment.of(enabled ? livePreviewExtensions() : []);
}
