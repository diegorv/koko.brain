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
import { inlineExtensions } from './inline/inline-extensions';
import { pasteHtmlLinkHandler } from './handlers/paste-html-link-handler';
import { pasteTsvHandler } from './handlers/paste-tsv-handler';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';

export { forceDecorationRebuild } from './core/effects';
import { calloutFoldState } from './core/effects';

export const livePreviewCompartment = new Compartment();

/** Checks if a decorator is disabled via settings. Returns false (enabled) by default. */
function isDisabled(name: string): boolean {
	return settingsStore.disabledDecorators[name] ?? false;
}

/**
 * Returns the live-preview extension array. The inline pipeline is the
 * unified `HighlightStyle` + `inlineFormattingPlugin` set from `new/`;
 * block fields and always-on inline plugins (image, footnote, wikilink-embed,
 * metaBindInput) are kept side-by-side. Source mode is handled at the
 * compartment level by `livePreview(enabled)` — when off, the entire array
 * is replaced with `[]` so line numbers + gutter come back.
 */
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

	// Unified inline pipeline (ex-Phases 3–10) + always-on inline plugins
	exts.push(...inlineExtensions(settingsStore.disabledDecorators));
	exts.push(imagePlugin, footnotePlugin, wikilinkEmbedPlugin);
	if (!isDisabled('metaBindInput')) { exts.push(metaBindInputPlugin); }

	// Scroll debounce + shared
	exts.push(scrollDebouncePlugin, livePreviewClickHandler, livePreviewStyles);
	// Paste handlers (after scroll/click so click takes precedence);
	// html-link runs before TSV so its null result falls through to the TSV check
	exts.push(pasteHtmlLinkHandler, pasteTsvHandler);

	return exts;
}

export function livePreview(enabled: boolean): Extension {
	return livePreviewCompartment.of(enabled ? livePreviewExtensions() : []);
}
