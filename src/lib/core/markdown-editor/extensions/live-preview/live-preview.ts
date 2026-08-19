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
import {
	BLOCK_DECORATOR_NAMES,
	INLINE_PLUGIN_NAMES,
	type BlockDecoratorName,
	type DecoratorName,
	type InlinePluginName,
} from './core/decorator-names';
import { inlineExtensions } from './inline/inline-extensions';
import { pasteHtmlLinkHandler } from './handlers/paste-html-link-handler';
import { pasteTsvHandler } from './handlers/paste-tsv-handler';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';

export { forceDecorationRebuild } from './core/effects';
import { calloutFoldState } from './core/effects';

export const livePreviewCompartment = new Compartment();

/** Checks if a decorator is disabled via settings. Returns false (enabled) by default. */
function isDisabled(name: DecoratorName): boolean {
	return settingsStore.disabledDecorators[name] ?? false;
}

/**
 * Kill-switch name -> the extensions it installs, for the block decorators that
 * run before the inline pipeline. Total `Record`s, so a name added to
 * `decorator-names.ts` without an extension here fails `pnpm check` — that is
 * what keeps every switch in Troubleshooting connected to something.
 */
const BLOCK_EXTENSIONS: Record<BlockDecoratorName, Extension> = {
	frontmatter: [frontmatterField, frontmatterGutter],
	codeBlock: codeBlockField,
	blockComment: blockCommentField,
	table: tableField,
	callout: calloutField,
	collectionBlock: collectionBlockField,
	queryjs: queryjsBlockField,
	metaBindButton: metaBindButtonField,
	mermaid: mermaidField,
	blockMath: blockMathField,
	audio: audioPlugin,
	video: videoPlugin,
};

/** Same, for the inline ViewPlugins installed after the inline pipeline. */
const INLINE_PLUGIN_EXTENSIONS: Record<InlinePluginName, Extension> = {
	image: imagePlugin,
	footnote: footnotePlugin,
	wikilinkEmbed: wikilinkEmbedPlugin,
	metaBindInput: metaBindInputPlugin,
};

/**
 * Returns the live-preview extension array. The inline pipeline is the
 * unified `HighlightStyle` + `inlineFormattingPlugin` set from `inline/`;
 * block fields and the inline plugins (image, footnote, wikilink-embed,
 * metaBindInput) are kept side-by-side. Every decorator goes through the same
 * `disabledDecorators` gate. Source mode is handled at the compartment level
 * by `livePreview(enabled)` — when off, the entire array is replaced with `[]`
 * so line numbers + gutter come back.
 */
export function livePreviewExtensions(): Extension[] {
	const exts: Extension[] = [
		mouseSelectingField,
		mouseSelectingHandlers,
		calloutFoldState,
	];

	// Block plugins
	for (const name of BLOCK_DECORATOR_NAMES) {
		if (!isDisabled(name)) { exts.push(BLOCK_EXTENSIONS[name]); }
	}

	// Unified inline pipeline (ex-Phases 3–10) + the inline plugins
	exts.push(...inlineExtensions(settingsStore.disabledDecorators));
	for (const name of INLINE_PLUGIN_NAMES) {
		if (!isDisabled(name)) { exts.push(INLINE_PLUGIN_EXTENSIONS[name]); }
	}

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
