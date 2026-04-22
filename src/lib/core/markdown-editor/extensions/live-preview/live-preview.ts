import { Compartment } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { livePreviewClickHandler } from './click-handler';
import { livePreviewStyles } from './styles';
import { mouseSelectingField, mouseSelectingHandlers } from './core/mouse-selecting';
import { frontmatterField, frontmatterGutter } from './block-fields/frontmatter-field';
import { codeBlockField } from './block-fields/code-block-field';
import { blockCommentField } from './block-fields/block-comment-field';
import { tableField } from './block-fields/table-field';
import { calloutField } from './block-fields/callout-field';
import { collectionBlockField } from './block-fields/collection-block-field';
import { metaBindButtonField } from './block-fields/meta-bind-button-field';
import { queryjsBlockField } from './block-fields/queryjs-block-field';
import { mermaidField } from './block-fields/mermaid-field';
import { blockMathField } from './block-fields/block-math-field';
import { audioPlugin } from './media/audio-plugin';
import { videoPlugin } from './media/video-plugin';
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

	// Inline: unified pipeline covers every inline Lezer node + regex pattern
	exts.push(...newInlineExtensions());

	// Scroll debounce + shared
	exts.push(scrollDebouncePlugin, livePreviewClickHandler, pasteTsvHandler, livePreviewStyles);

	return exts;
}

export function livePreview(enabled: boolean): Extension {
	return livePreviewCompartment.of(enabled ? livePreviewExtensions() : []);
}
