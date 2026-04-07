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

export { forceDecorationRebuild } from './core/effects';
import { calloutFoldState } from './core/effects';

export const livePreviewCompartment = new Compartment();

export function livePreviewExtensions(): Extension[] {
	return [
		mouseSelectingField,
		mouseSelectingHandlers,
		calloutFoldState,
		// Block StateFields
		frontmatterField,
		frontmatterGutter,
		codeBlockField,
		blockCommentField,
		tableField,
		calloutField,
		collectionBlockField,
		queryjsBlockField,
		metaBindButtonField,
		mermaidField,
		blockMathField,
		audioPlugin,
		videoPlugin,
		// Consolidated simple widget plugin (task, HR, ordered/unordered list, hard break, inline math)
		simpleWidgetPlugin,
		// Inline ViewPlugins
		inlineMarksPlugin,
		markdownStylePlugin,
		headingPlugin,
		blockquotePlugin,
		linkPlugin,
		imagePlugin,
		footnotePlugin,
		wikilinkEmbedPlugin,
		metaBindInputPlugin,
		inlineCommentPlugin,
		blockReferencePlugin,
		// Scroll debounce — defers decoration rebuilds during active scroll
		scrollDebouncePlugin,
		// Shared
		livePreviewClickHandler,
		livePreviewStyles,
	];
}

export function livePreview(enabled: boolean): Extension {
	return livePreviewCompartment.of(enabled ? livePreviewExtensions() : []);
}
