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
import { inlineMathPlugin } from './plugins/inline-math-plugin';
import { inlineMarksPlugin } from './plugins/inline-marks-plugin';
import { markdownStylePlugin } from './plugins/markdown-style-plugin';
import { headingPlugin } from './plugins/heading-plugin';
import { blockquotePlugin } from './plugins/blockquote-plugin';
import { linkPlugin } from './plugins/link-plugin';
import { taskListPlugin } from './plugins/task-list-plugin';
import { horizontalRulePlugin } from './plugins/horizontal-rule-plugin';
import { imagePlugin } from './plugins/image-plugin';
import { orderedListPlugin } from './plugins/ordered-list-plugin';
import { footnotePlugin } from './plugins/footnote-plugin';
import { wikilinkEmbedPlugin } from './plugins/wikilink-embed-plugin';
import { metaBindInputPlugin } from './plugins/meta-bind-input-plugin';
import { hardBreakPlugin } from './plugins/hard-break-plugin';
import { inlineCommentPlugin } from './plugins/inline-comment-plugin';
import { unorderedListPlugin } from './plugins/unordered-list-plugin';
import { blockReferencePlugin } from './plugins/block-reference-plugin';
import { audioPlugin } from './plugins/audio-plugin';
import { videoPlugin } from './plugins/video-plugin';

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
		// Inline ViewPlugins (Phase 3)
		inlineMarksPlugin,
		markdownStylePlugin,
		headingPlugin,
		blockquotePlugin,
		linkPlugin,
		taskListPlugin,
		horizontalRulePlugin,
		imagePlugin,
		orderedListPlugin,
		unorderedListPlugin,
		footnotePlugin,
		wikilinkEmbedPlugin,
		metaBindInputPlugin,
		inlineMathPlugin,
		hardBreakPlugin,
		inlineCommentPlugin,
		blockReferencePlugin,
		// Shared
		livePreviewClickHandler,
		livePreviewStyles,
	];
}

export function livePreview(enabled: boolean): Extension {
	return livePreviewCompartment.of(enabled ? livePreviewExtensions() : []);
}
