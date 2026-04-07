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

/**
 * TEMPORARY: Debug flags to disable individual plugins for performance isolation.
 * Set a flag to `true` to DISABLE that plugin. Restart app after each change.
 * Test scroll on the journal daily note to identify which plugin causes lag.
 */
const DISABLE = {
	table: false,            // 1st test: disable tables — NO IMPROVEMENT
	metaBindInput: false,    // 2nd test: disable meta-bind selects — NO IMPROVEMENT
	queryjs: false,          // 3rd test: disable queryjs blocks — WAS THE VILLAIN! Fixed with updateDOM()
	codeBlock: false,        // 4th test: disable code blocks
	frontmatter: false,      // 5th test: disable frontmatter widget
	callout: false,          // 6th test: disable callouts
	link: false,             // 7th test: disable link decorations
	inlineMarks: false,      // 8th test: disable inline marks (bold, italic, etc.)
	simpleWidget: false,     // 9th test: disable task/HR/list/math widgets
	heading: false,          // 10th test: disable heading decorations
	blockquote: false,       // 11th test: disable blockquote decorations
	markdownStyle: false,    // 12th test: disable markdown styling
};

export function livePreviewExtensions(): Extension[] {
	const exts: Extension[] = [
		mouseSelectingField,
		mouseSelectingHandlers,
		calloutFoldState,
	];

	// Block plugins
	if (!DISABLE.frontmatter) { exts.push(frontmatterField, frontmatterGutter); }
	if (!DISABLE.codeBlock) { exts.push(codeBlockField); }
	exts.push(blockCommentField);
	if (!DISABLE.table) { exts.push(tableField); }
	if (!DISABLE.callout) { exts.push(calloutField); }
	exts.push(collectionBlockField);
	if (!DISABLE.queryjs) { exts.push(queryjsBlockField); }
	exts.push(metaBindButtonField, mermaidField, blockMathField, audioPlugin, videoPlugin);

	// Inline plugins
	if (!DISABLE.simpleWidget) { exts.push(simpleWidgetPlugin); }
	if (!DISABLE.inlineMarks) { exts.push(inlineMarksPlugin); }
	if (!DISABLE.markdownStyle) { exts.push(markdownStylePlugin); }
	if (!DISABLE.heading) { exts.push(headingPlugin); }
	if (!DISABLE.blockquote) { exts.push(blockquotePlugin); }
	if (!DISABLE.link) { exts.push(linkPlugin); }
	exts.push(imagePlugin, footnotePlugin, wikilinkEmbedPlugin);
	if (!DISABLE.metaBindInput) { exts.push(metaBindInputPlugin); }
	exts.push(inlineCommentPlugin, blockReferencePlugin);

	// Scroll debounce + shared
	exts.push(scrollDebouncePlugin, livePreviewClickHandler, livePreviewStyles);

	return exts;
}

export function livePreview(enabled: boolean): Extension {
	return livePreviewCompartment.of(enabled ? livePreviewExtensions() : []);
}
