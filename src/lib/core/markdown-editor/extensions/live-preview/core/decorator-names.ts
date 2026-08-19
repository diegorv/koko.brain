/**
 * The live-preview decorator kill-switch vocabulary — every name the
 * Troubleshooting section renders a switch for, split by what installs it.
 *
 * Names are persisted user data (`settings.json` -> `disabledDecorators`), so
 * renaming one orphans everyone's saved toggle.
 *
 * This module deliberately imports nothing. `TroubleshootingSection.svelte`
 * needs the names and nothing else; importing the registry in `live-preview.ts`
 * instead would drag katex, mermaid and DOMPurify into the settings chunk.
 */

/**
 * Block decorators, in the order `livePreviewExtensions()` installs them
 * (extension order is precedence order — do not reorder casually).
 */
export const BLOCK_DECORATOR_NAMES = [
	'frontmatter',
	'codeBlock',
	'blockComment',
	'table',
	'callout',
	'collectionBlock',
	'queryjs',
	'metaBindButton',
	'mermaid',
	'blockMath',
	'audio',
	'video',
] as const;

/**
 * Inline ViewPlugins installed after the unified inline pipeline. They are not
 * `blockDecorator()` products (each one scans only the expanded viewport).
 */
export const INLINE_PLUGIN_NAMES = [
	'image',
	'footnote',
	'wikilinkEmbed',
	'metaBindInput',
] as const;

/**
 * Names owned by the inline pipeline's handler registry
 * (`inline/inline-extensions.ts` -> `TOGGLEABLE_HANDLERS`). Each one disables a
 * set of handlers rather than a whole extension; `markdownStyle` additionally
 * drops the `HighlightStyle` wrapper.
 */
export const INLINE_HANDLER_NAMES = [
	'heading',
	'blockquote',
	'simpleWidget',
	'link',
	'inlineMarks',
	'markdownStyle',
] as const;

/**
 * Every kill-switch name, in Troubleshooting display order. Built by
 * concatenation so a name cannot exist without an owner: the three source
 * lists are each consumed by a total `Record`, which `pnpm check` enforces.
 */
export const DECORATOR_NAMES = [
	...BLOCK_DECORATOR_NAMES,
	...INLINE_PLUGIN_NAMES,
	...INLINE_HANDLER_NAMES,
] as const;

/** A block decorator's kill-switch name (`BlockDecoratorSpec.settingsKey`). */
export type BlockDecoratorName = (typeof BLOCK_DECORATOR_NAMES)[number];

/** An always-on inline ViewPlugin's kill-switch name. */
export type InlinePluginName = (typeof INLINE_PLUGIN_NAMES)[number];

/** An inline-handler-group kill-switch name. */
export type InlineHandlerName = (typeof INLINE_HANDLER_NAMES)[number];

/** Any live-preview decorator kill-switch name. */
export type DecoratorName = (typeof DECORATOR_NAMES)[number];
