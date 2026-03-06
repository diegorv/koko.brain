import { Decoration, EditorView, GutterMarker } from '@codemirror/view';

export const linkTextDeco = Decoration.mark({ class: 'cm-lp-link' });
export const boldTextDeco = Decoration.mark({ class: 'cm-lp-bold' });
export const italicTextDeco = Decoration.mark({ class: 'cm-lp-italic' });
export const blockquoteLineDeco = Decoration.line({ class: 'cm-lp-blockquote' });
export const strikethroughTextDeco = Decoration.mark({ class: 'cm-lp-strikethrough' });
export const inlineCodeTextDeco = Decoration.mark({ class: 'cm-lp-code' });
export const wikilinkTextDeco = Decoration.mark({ class: 'cm-lp-wikilink' });
export const highlightTextDeco = Decoration.mark({ class: 'cm-lp-highlight' });
export const codeBlockLineDeco = Decoration.line({ class: 'cm-lp-codeblock-line' });
export const footnoteRefDeco = Decoration.mark({ class: 'cm-lp-footnote-ref' });
export const footnoteDefMarkerDeco = Decoration.mark({ class: 'cm-lp-footnote-def-marker' });
export const hiddenLineDeco = Decoration.line({ class: 'cm-lp-hidden-line' });

/** GutterMarker that hides gutter elements (line numbers, fold markers) for collapsed lines */
class HiddenGutterMarker extends GutterMarker {
	elementClass = 'cm-lp-hidden-line';
}

/** Singleton gutter marker for hiding gutter elements on collapsed lines */
export const hiddenGutterMarker = new HiddenGutterMarker();

export const headingLineDeco: Record<number, Decoration> = {
	1: Decoration.line({ class: 'cm-lp-h1' }),
	2: Decoration.line({ class: 'cm-lp-h2' }),
	3: Decoration.line({ class: 'cm-lp-h3' }),
	4: Decoration.line({ class: 'cm-lp-h4' }),
	5: Decoration.line({ class: 'cm-lp-h5' }),
	6: Decoration.line({ class: 'cm-lp-h6' }),
};

export const livePreviewStyles = EditorView.baseTheme({
	/* ── Phase 3: CSS animation classes for mark visibility ── */

	/** Inline formatting marks (**, *, ~~, `, ==) — hidden state */
	'.cm-formatting-inline': {
		display: 'inline-flex',
		maxWidth: '0',
		height: '0',
		opacity: '0',
		overflow: 'hidden',
		transition: 'max-width 0.2s ease, opacity 0.15s ease',
	},
	/** Inline formatting marks — visible state (cursor nearby) */
	'.cm-formatting-inline-visible': {
		maxWidth: '4ch',
		height: 'auto',
		opacity: '1',
	},
	/** Block formatting marks (#, >) — hidden state */
	'.cm-formatting-block': {
		fontSize: '0.01em',
		opacity: '0',
		transition: 'font-size 0.2s ease, opacity 0.2s ease',
	},
	/** Block formatting marks — visible state (cursor nearby) */
	'.cm-formatting-block-visible': {
		fontSize: '1em',
		opacity: '0.6',
	},
	'.cm-lp-link': {
		color: 'var(--lp-link)',
		textDecoration: 'underline',
		textDecorationColor: 'var(--lp-link-decoration)',
		cursor: 'pointer',
	},
	'.cm-lp-link-ref-def': {
		opacity: '0.5',
		fontSize: '0.85em',
	},
	'.cm-lp-link:hover': {
		textDecorationColor: 'var(--lp-link)',
	},
	'.cm-lp-wikilink': {
		color: 'var(--lp-wikilink)',
		textDecoration: 'underline',
		textDecorationColor: 'var(--lp-wikilink-decoration)',
		cursor: 'pointer',
	},
	'.cm-lp-wikilink span': {
		color: 'inherit !important',
	},
	'.cm-lp-wikilink:hover': {
		textDecorationColor: 'var(--lp-wikilink)',
	},
	'.cm-lp-bold': {
		fontWeight: 'bold',
	},
	'.cm-lp-h1': {
		fontSize: 'var(--heading-h1-font-size, 2.058em)',
		fontWeight: 'var(--heading-h1-font-weight, bold)',
		lineHeight: 'var(--heading-h1-line-height, 1.4)',
		letterSpacing: 'var(--heading-h1-letter-spacing, -0.02em)',
		color: 'var(--syntax-heading1)',
	},
	'.cm-lp-h2': {
		fontSize: 'var(--heading-h2-font-size, 1.618em)',
		fontWeight: 'var(--heading-h2-font-weight, bold)',
		lineHeight: 'var(--heading-h2-line-height, 1.4)',
		letterSpacing: 'var(--heading-h2-letter-spacing, -0.015em)',
		color: 'var(--syntax-heading2)',
	},
	'.cm-lp-h3': {
		fontSize: 'var(--heading-h3-font-size, 1.272em)',
		fontWeight: 'var(--heading-h3-font-weight, bold)',
		lineHeight: 'var(--heading-h3-line-height, 1.4)',
		letterSpacing: 'var(--heading-h3-letter-spacing, -0.01em)',
		color: 'var(--syntax-heading3)',
	},
	'.cm-lp-h4': {
		fontSize: 'var(--heading-h4-font-size, 1em)',
		fontWeight: 'var(--heading-h4-font-weight, bold)',
		lineHeight: 'var(--heading-h4-line-height, inherit)',
		letterSpacing: 'var(--heading-h4-letter-spacing, 0em)',
		color: 'var(--syntax-heading4)',
	},
	'.cm-lp-h5': {
		fontSize: 'var(--heading-h5-font-size, 1em)',
		fontWeight: 'var(--heading-h5-font-weight, bold)',
		lineHeight: 'var(--heading-h5-line-height, inherit)',
		letterSpacing: 'var(--heading-h5-letter-spacing, 0em)',
		color: 'var(--syntax-heading5)',
	},
	'.cm-lp-h6': {
		fontSize: 'var(--heading-h6-font-size, 1em)',
		fontWeight: 'var(--heading-h6-font-weight, bold)',
		lineHeight: 'var(--heading-h6-line-height, inherit)',
		letterSpacing: 'var(--heading-h6-letter-spacing, 0em)',
		color: 'var(--syntax-heading6)',
	},
	'.cm-lp-italic': {
		fontStyle: 'italic',
	},
	'.cm-lp-hr': {
		border: 'none',
		borderTop: '1px solid var(--lp-hr-border)',
		margin: '0.5em 0',
	},
	'.cm-lp-blockquote': {
		borderLeft: '3px solid var(--lp-blockquote-border)',
		paddingLeft: '8px',
		background: 'var(--lp-blockquote-bg)',
	},
	'.cm-lp-blockquote-2': {
		borderLeft: '3px solid var(--lp-blockquote-border)',
		paddingLeft: '16px',
		background: 'var(--lp-blockquote-bg-2)',
	},
	'.cm-lp-blockquote-3': {
		borderLeft: '3px solid var(--lp-blockquote-border)',
		paddingLeft: '24px',
		background: 'var(--lp-blockquote-bg-3)',
	},
	'.cm-lp-task-checkbox': {
		appearance: 'none',
		width: '18px',
		height: '18px',
		border: '2px solid var(--lp-task-border)',
		borderRadius: '4px',
		backgroundColor: 'transparent',
		cursor: 'pointer',
		verticalAlign: 'middle',
		marginRight: '6px',
		position: 'relative',
		transition: 'all 0.15s ease',
	},
	'.cm-lp-task-checkbox:hover': {
		borderColor: 'var(--lp-task-hover)',
	},
	'.cm-lp-task-checkbox:checked': {
		backgroundColor: 'var(--lp-task-checked)',
		borderColor: 'var(--lp-task-checked)',
	},
	'.cm-lp-task-checkbox:checked::after': {
		content: '""',
		position: 'absolute',
		left: '4px',
		top: '1px',
		width: '5px',
		height: '9px',
		border: 'solid var(--lp-task-checkmark)',
		borderWidth: '0 2px 2px 0',
		transform: 'rotate(45deg)',
	},
	'.cm-lp-strikethrough': {
		textDecoration: 'line-through',
	},
	'.cm-lp-highlight': {
		backgroundColor: 'var(--lp-highlight-bg)',
		borderRadius: '2px',
	},
	'.cm-lp-ol-marker': {
		display: 'inline-block',
		color: 'var(--lp-ol-marker)',
		fontWeight: '600',
		minWidth: '1.5em',
		textAlign: 'right',
		marginRight: '6px',
		fontSize: '0.95em',
	},
	'.cm-lp-ul-marker': {
		display: 'inline-block',
		color: 'var(--lp-ul-marker, var(--lp-ol-marker))',
		fontWeight: '600',
		minWidth: '1.5em',
		textAlign: 'center',
		marginRight: '6px',
		fontSize: '0.95em',
	},
	'.cm-lp-hard-break': {
		color: 'var(--lp-hard-break, var(--syntax-comment, #6c7086))',
		opacity: '0.5',
		fontSize: '0.85em',
	},
	'.cm-lp-code': {
		fontFamily: 'MonoLisa, monospace',
		backgroundColor: 'var(--lp-code-bg)',
		padding: '1px 4px',
		borderRadius: '3px',
	},
	'.cm-lp-image-wrapper': {
		display: 'block',
		padding: '4px 0',
	},
	'.cm-lp-image': {
		maxWidth: '100%',
		borderRadius: '4px',
	},
	'.cm-lp-audio-wrapper': {
		display: 'block',
		padding: '4px 0',
	},
	'.cm-lp-audio': {
		width: '100%',
		borderRadius: '4px',
	},
	'.cm-activeLine:has(.cm-lp-audio-wrapper)': {
		backgroundColor: 'transparent !important',
	},
	'.cm-lp-video-wrapper': {
		display: 'block',
		padding: '4px 0',
	},
	'.cm-lp-video': {
		maxWidth: '100%',
		borderRadius: '4px',
	},
	'.cm-activeLine:has(.cm-lp-video-wrapper)': {
		backgroundColor: 'transparent !important',
	},
	'.cm-lp-codeblock-line': {
		backgroundColor: 'var(--lp-codeblock-bg)',
		fontFamily: 'MonoLisa, monospace',
	},
	'.cm-lp-codeblock': {
		display: 'block',
		backgroundColor: 'var(--lp-codeblock-bg)',
		borderRadius: '6px',
		border: '1px solid var(--lp-codeblock-border)',
		overflow: 'hidden',
		margin: '2px 0',
	},
	'.cm-lp-codeblock-header': {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: '4px 12px',
		borderBottom: '1px solid var(--lp-codeblock-border)',
		backgroundColor: 'var(--lp-codeblock-header-bg)',
	},
	'.cm-lp-codeblock-lang': {
		fontSize: '11px',
		color: 'var(--lp-codeblock-lang)',
		fontFamily: 'MonoLisa, monospace',
		textTransform: 'lowercase',
	},
	'.cm-lp-codeblock-copy': {
		fontSize: '11px',
		color: 'var(--lp-codeblock-copy)',
		backgroundColor: 'transparent',
		border: 'none',
		cursor: 'pointer',
		padding: '2px 6px',
		borderRadius: '3px',
		opacity: '0',
		transition: 'opacity 0.15s ease, background-color 0.15s ease',
	},
	'.cm-lp-codeblock:hover .cm-lp-codeblock-copy': {
		opacity: '1',
	},
	'.cm-lp-codeblock-copy:hover': {
		backgroundColor: 'var(--lp-codeblock-copy-hover)',
	},
	'.cm-lp-codeblock-pre': {
		margin: '0',
		padding: '10px 12px',
		overflow: 'auto',
		fontFamily: 'MonoLisa, monospace',
		fontSize: '13px',
		lineHeight: '1.5',
		color: 'var(--lp-codeblock-text)',
	},
	'.cm-lp-codeblock-pre code': {
		fontFamily: 'inherit',
	},
	'.cm-activeLine:has(.cm-lp-codeblock)': {
		backgroundColor: 'transparent !important',
	},
	/* ── Syntax highlighting tokens (highlight.js classes) ── */
	'.cm-lp-codeblock .hljs-keyword': { color: 'var(--lp-syntax-keyword)' },
	'.cm-lp-codeblock .hljs-built_in': { color: 'var(--lp-syntax-builtin)' },
	'.cm-lp-codeblock .hljs-type': { color: 'var(--lp-syntax-type)' },
	'.cm-lp-codeblock .hljs-literal': { color: 'var(--lp-syntax-literal)' },
	'.cm-lp-codeblock .hljs-number': { color: 'var(--lp-syntax-number)' },
	'.cm-lp-codeblock .hljs-string': { color: 'var(--lp-syntax-string)' },
	'.cm-lp-codeblock .hljs-regexp': { color: 'var(--lp-syntax-string)' },
	'.cm-lp-codeblock .hljs-title': { color: 'var(--lp-syntax-function)' },
	'.cm-lp-codeblock .hljs-title\\.function_': { color: 'var(--lp-syntax-function)' },
	'.cm-lp-codeblock .hljs-title\\.class_': { color: 'var(--lp-syntax-type)' },
	'.cm-lp-codeblock .hljs-params': { color: 'var(--lp-syntax-variable)' },
	'.cm-lp-codeblock .hljs-comment': { color: 'var(--lp-syntax-comment)', fontStyle: 'italic' },
	'.cm-lp-codeblock .hljs-doctag': { color: 'var(--lp-syntax-comment)' },
	'.cm-lp-codeblock .hljs-meta': { color: 'var(--lp-syntax-meta)' },
	'.cm-lp-codeblock .hljs-attr': { color: 'var(--lp-syntax-attr)' },
	'.cm-lp-codeblock .hljs-attribute': { color: 'var(--lp-syntax-attr)' },
	'.cm-lp-codeblock .hljs-variable': { color: 'var(--lp-syntax-variable)' },
	'.cm-lp-codeblock .hljs-property': { color: 'var(--lp-syntax-property)' },
	'.cm-lp-codeblock .hljs-selector-tag': { color: 'var(--lp-syntax-keyword)' },
	'.cm-lp-codeblock .hljs-selector-class': { color: 'var(--lp-syntax-type)' },
	'.cm-lp-codeblock .hljs-selector-id': { color: 'var(--lp-syntax-function)' },
	'.cm-lp-codeblock .hljs-tag': { color: 'var(--lp-syntax-tag)' },
	'.cm-lp-codeblock .hljs-name': { color: 'var(--lp-syntax-tag)' },
	'.cm-lp-codeblock .hljs-punctuation': { color: 'var(--lp-syntax-punctuation)' },
	'.cm-lp-codeblock .hljs-operator': { color: 'var(--lp-syntax-operator)' },
	'.cm-lp-table': {
		width: '100%',
		borderCollapse: 'collapse',
		margin: '-4px 0',
		fontSize: '0.9em',
	},
	'.cm-lp-table th, .cm-lp-table td': {
		border: '1px solid var(--lp-table-border)',
		padding: '4px 8px',
	},
	'.cm-lp-table th': {
		backgroundColor: 'var(--lp-table-header-bg)',
		fontWeight: '600',
	},
	'.cm-lp-table tr:nth-child(even)': {
		backgroundColor: 'var(--lp-table-alt)',
	},
	'.cm-lp-callout': {
		borderLeft: '3px solid var(--callout-note)',
		paddingLeft: '8px',
		background: 'color-mix(in srgb, var(--callout-note) 7%, transparent)',
	},
	'.cm-lp-callout-title': {
		fontWeight: '600',
	},
	'.cm-lp-callout-fold': {
		cursor: 'pointer',
		display: 'inline-block',
		width: '1.2em',
		textAlign: 'center',
		opacity: '0.6',
		transition: 'opacity 0.15s ease',
		userSelect: 'none',
	},
	'.cm-lp-callout-fold:hover': {
		opacity: '1',
	},
	'.cm-lp-footnote-ref': {
		fontSize: '0.75em',
		verticalAlign: 'super',
		color: 'var(--lp-footnote)',
		cursor: 'pointer',
	},
	'.cm-lp-footnote-def-marker': {
		color: 'var(--lp-footnote)',
		fontWeight: '600',
	},
	'.cm-lp-frontmatter': {
		display: 'block',
		padding: '10px 14px',
		margin: '2px 0 8px 0',
		backgroundColor: 'var(--lp-frontmatter-bg)',
		borderRadius: '8px',
		border: '1px solid var(--lp-frontmatter-border)',
		fontSize: '13px',
		lineHeight: '1.5',
	},
	'.cm-lp-frontmatter-header': {
		display: 'flex',
		alignItems: 'center',
		gap: '8px',
		marginBottom: '8px',
		paddingBottom: '8px',
		borderBottom: '1px solid var(--lp-frontmatter-border)',
	},
	'.cm-lp-frontmatter-label': {
		color: 'var(--lp-frontmatter-label)',
		fontWeight: '600',
		fontSize: '14px',
	},
	'.cm-lp-frontmatter-count': {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		minWidth: '18px',
		height: '18px',
		borderRadius: '9px',
		backgroundColor: 'var(--lp-frontmatter-count-bg)',
		color: 'var(--lp-frontmatter-count-text)',
		fontSize: '10px',
		fontWeight: '500',
		padding: '0 5px',
	},
	'.cm-lp-frontmatter-rows': {
		display: 'flex',
		flexDirection: 'column',
		gap: '2px',
	},
	'.cm-lp-frontmatter-row': {
		display: 'flex',
		alignItems: 'center',
		gap: '12px',
		minHeight: '28px',
		padding: '2px 0',
		borderBottom: '1px solid var(--lp-frontmatter-row-border)',
	},
	'.cm-lp-frontmatter-row:last-child': {
		borderBottom: 'none',
	},
	'.cm-lp-frontmatter-key': {
		display: 'flex',
		alignItems: 'center',
		gap: '6px',
		color: 'var(--lp-frontmatter-key)',
		fontSize: '12px',
		width: '250px',
		flexShrink: '0',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
	},
	'.cm-lp-frontmatter-icon': {
		display: 'flex',
		alignItems: 'center',
		opacity: '0.6',
	},
	'.cm-lp-frontmatter-value': {
		color: 'var(--lp-frontmatter-value)',
		fontSize: '12px',
		display: 'flex',
		alignItems: 'center',
		gap: '4px',
		flexWrap: 'wrap',
		flex: '1',
	},
	'.cm-lp-frontmatter-key-input': {
		flex: '1',
		backgroundColor: 'transparent',
		color: 'inherit',
		border: '1px solid transparent',
		borderRadius: '4px',
		padding: '1px 4px',
		fontSize: '12px',
		fontFamily: 'inherit',
		outline: 'none',
		minWidth: '0',
	},
	'.cm-lp-frontmatter-key-input:focus': {
		borderColor: 'hsl(var(--primary))',
		backgroundColor: 'var(--lp-frontmatter-input-focus-bg, rgba(255,255,255,0.05))',
	},
	'.cm-lp-frontmatter-wikilink-display': {
		flex: '1',
		padding: '1px 4px',
		cursor: 'text',
		minHeight: '20px',
	},
	'.cm-lp-frontmatter-input': {
		flex: '1',
		backgroundColor: 'transparent',
		color: 'var(--lp-frontmatter-value)',
		border: '1px solid transparent',
		borderRadius: '4px',
		padding: '1px 4px',
		fontSize: '12px',
		fontFamily: 'inherit',
		outline: 'none',
	},
	'.cm-lp-frontmatter-input:focus': {
		borderColor: 'hsl(var(--primary))',
		backgroundColor: 'var(--lp-frontmatter-input-focus-bg, rgba(255,255,255,0.05))',
	},
	'.cm-lp-frontmatter-checkbox': {
		cursor: 'pointer',
		marginRight: '4px',
	},
	'.cm-lp-frontmatter-remove': {
		opacity: '0',
		cursor: 'pointer',
		color: 'var(--lp-frontmatter-key)',
		fontSize: '14px',
		padding: '0 4px',
		transition: 'opacity 0.15s ease',
		flexShrink: '0',
	},
	'.cm-lp-frontmatter-row:hover .cm-lp-frontmatter-remove': {
		opacity: '0.6',
	},
	'.cm-lp-frontmatter-remove:hover': {
		opacity: '1 !important',
	},
	'.cm-lp-frontmatter-tag': {
		display: 'inline-flex',
		alignItems: 'center',
		gap: '4px',
		backgroundColor: 'var(--lp-frontmatter-tag-bg)',
		color: 'var(--lp-frontmatter-tag-text)',
		padding: '1px 8px',
		borderRadius: '10px',
		fontSize: '11px',
	},
	'.cm-lp-frontmatter-tag-x': {
		color: 'var(--lp-frontmatter-tag-x)',
		fontSize: '12px',
		cursor: 'pointer',
		opacity: '0.6',
		transition: 'opacity 0.15s ease',
	},
	'.cm-lp-frontmatter-tag-x:hover': {
		opacity: '1',
	},
	'.cm-lp-frontmatter-list-input': {
		backgroundColor: 'transparent',
		color: 'var(--lp-frontmatter-value)',
		border: '1px solid transparent',
		borderRadius: '4px',
		padding: '1px 4px',
		fontSize: '11px',
		fontFamily: 'inherit',
		outline: 'none',
		width: '60px',
	},
	'.cm-lp-frontmatter-list-input:focus': {
		borderColor: 'hsl(var(--primary))',
		backgroundColor: 'var(--lp-frontmatter-input-focus-bg, rgba(255,255,255,0.05))',
	},
	'.cm-lp-frontmatter-add': {
		display: 'flex',
		alignItems: 'center',
		gap: '4px',
		marginTop: '6px',
		padding: '4px 6px',
		borderRadius: '4px',
		cursor: 'pointer',
		color: 'var(--lp-frontmatter-key)',
		fontSize: '12px',
		opacity: '0.6',
		transition: 'opacity 0.15s ease, background-color 0.15s ease',
	},
	'.cm-lp-frontmatter-add:hover': {
		opacity: '1',
		backgroundColor: 'var(--lp-frontmatter-input-focus-bg, rgba(255,255,255,0.05))',
	},
	'.cm-lp-frontmatter-add-input': {
		flex: '1',
		backgroundColor: 'transparent',
		color: 'var(--lp-frontmatter-value)',
		border: '1px solid hsl(var(--primary))',
		borderRadius: '4px',
		padding: '2px 6px',
		fontSize: '12px',
		fontFamily: 'inherit',
		outline: 'none',
	},
	'.cm-activeLine:has(.cm-lp-frontmatter)': {
		backgroundColor: 'transparent !important',
	},
	'.cm-lp-block-ref': {
		color: 'var(--lp-comment, var(--syntax-comment, #6c7086))',
		opacity: '0.5',
	},
	'.cm-lp-block-ref-hidden': {
		display: 'none',
	},
	'.cm-lp-inline-comment': {
		color: 'var(--lp-comment, var(--syntax-comment, #6c7086))',
		opacity: '0.5',
	},
	'.cm-lp-inline-comment-hidden': {
		display: 'none',
	},
	'.cm-lp-hidden-line': {
		display: 'none !important',
	},
	'.cm-lp-collection-block': {
		display: 'block',
		padding: '10px 14px',
		margin: '4px 0',
		backgroundColor: 'var(--lp-collection-bg)',
		borderRadius: '8px',
		border: '1px solid var(--lp-collection-border)',
		fontSize: '13px',
		lineHeight: '1.5',
	},
	'.cm-lp-collection-header': {
		color: 'var(--lp-collection-header)',
		fontSize: '12px',
		fontWeight: '600',
		marginBottom: '8px',
		paddingBottom: '6px',
		borderBottom: '1px solid var(--lp-collection-header-border)',
	},
	'.cm-lp-collection-table': {
		width: '100%',
		borderCollapse: 'collapse',
		fontSize: '12px',
	},
	'.cm-lp-collection-table th, .cm-lp-collection-table td': {
		border: '1px solid var(--lp-collection-border)',
		padding: '4px 8px',
		textAlign: 'left',
	},
	'.cm-lp-collection-table th': {
		backgroundColor: 'var(--lp-collection-table-header-bg)',
		fontWeight: '600',
		color: 'var(--lp-collection-table-header-text)',
	},
	'.cm-lp-collection-table tr': {
		cursor: 'pointer',
	},
	'.cm-lp-collection-table tr:hover': {
		backgroundColor: 'var(--lp-collection-table-hover)',
	},
	'.cm-lp-collection-table tr:nth-child(even)': {
		backgroundColor: 'var(--lp-collection-table-alt)',
	},
	'.cm-lp-collection-null': {
		color: 'var(--lp-collection-null)',
	},
	'.cm-lp-collection-error': {
		color: 'var(--lp-collection-error)',
		fontSize: '12px',
		padding: '4px 0',
	},
	'.cm-lp-collection-loading': {
		color: 'var(--lp-collection-loading)',
		fontSize: '12px',
		padding: '4px 0',
	},
	'.cm-lp-collection-empty': {
		color: 'var(--lp-collection-empty)',
		fontSize: '12px',
		padding: '8px 0',
		textAlign: 'center',
	},
	'.cm-activeLine:has(.cm-lp-collection-block)': {
		backgroundColor: 'transparent !important',
	},
	'.cm-lp-embed': {
		display: 'block',
		padding: '8px 12px',
		margin: '2px 0',
		backgroundColor: 'var(--lp-embed-bg)',
		borderRadius: '6px',
		border: '1px solid var(--lp-embed-border)',
		borderLeft: '3px solid var(--lp-embed-header)',
		fontSize: '13px',
	},
	'.cm-lp-embed:hover': {
		backgroundColor: 'var(--lp-embed-hover)',
	},
	'.cm-lp-embed-header': {
		display: 'flex',
		alignItems: 'center',
		gap: '6px',
		color: 'var(--lp-embed-header)',
		fontSize: '12px',
		fontWeight: '500',
		marginBottom: '6px',
		paddingBottom: '6px',
		borderBottom: '1px solid var(--lp-embed-border)',
		cursor: 'pointer',
	},
	'.cm-lp-embed-icon': {
		display: 'flex',
		alignItems: 'center',
		opacity: '0.7',
		flexShrink: '0',
	},
	'.cm-lp-embed-label': {
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
	},
	'.cm-lp-embed-content': {
		color: 'var(--lp-embed-content)',
		fontSize: '13px',
		lineHeight: '1.6',
		whiteSpace: 'pre-wrap',
		wordBreak: 'break-word',
		maxHeight: '200px',
		overflowY: 'auto',
	},
	'.cm-lp-embed-error': {
		color: 'var(--lp-embed-error)',
		fontStyle: 'italic',
	},
	'.cm-lp-meta-bind-select': {
		display: 'inline-block',
		appearance: 'none',
		backgroundColor: 'var(--lp-meta-bind-select-bg)',
		color: 'var(--lp-meta-bind-select-text)',
		border: '1px solid var(--lp-meta-bind-select-border)',
		borderRadius: '6px',
		padding: '2px 24px 2px 8px',
		fontSize: '13px',
		lineHeight: '1.4',
		cursor: 'pointer',
		outline: 'none',
		verticalAlign: 'middle',
		backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3c7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, // privacy-ok
		backgroundRepeat: 'no-repeat',
		backgroundPosition: 'right 6px center',
		backgroundSize: '12px',
	},
	'.cm-lp-meta-bind-select:hover': {
		borderColor: 'var(--lp-meta-bind-select-hover)',
	},
	'.cm-lp-meta-bind-select:focus': {
		borderColor: 'hsl(var(--primary))',
		boxShadow: '0 0 0 1px hsl(var(--primary) / 0.3)',
	},
	'.cm-lp-meta-bind-button-container': {
		display: 'block',
		padding: '4px 0',
	},
	'.cm-lp-meta-bind-btn': {
		display: 'inline-flex',
		alignItems: 'center',
		gap: '6px',
		padding: '6px 16px',
		borderRadius: '6px',
		fontSize: '13px',
		fontWeight: '500',
		cursor: 'pointer',
		border: '1px solid transparent',
		transition: 'all 0.15s ease',
		lineHeight: '1.4',
		outline: 'none',
	},
	'.cm-lp-meta-bind-btn-default': {
		backgroundColor: 'var(--lp-meta-bind-btn-default-bg)',
		color: 'var(--lp-meta-bind-btn-default-text)',
		border: '1px solid var(--lp-meta-bind-btn-default-border)',
	},
	'.cm-lp-meta-bind-btn-default:hover': {
		backgroundColor: 'var(--lp-meta-bind-btn-default-hover)',
	},
	'.cm-lp-meta-bind-btn-primary': {
		backgroundColor: 'var(--lp-meta-bind-btn-primary-bg)',
		color: 'var(--lp-meta-bind-btn-primary-text)',
	},
	'.cm-lp-meta-bind-btn-primary:hover': {
		backgroundColor: 'var(--lp-meta-bind-btn-primary-hover)',
	},
	'.cm-lp-meta-bind-btn-destructive': {
		backgroundColor: 'var(--lp-meta-bind-btn-destructive-bg)',
		color: 'var(--lp-meta-bind-btn-destructive-text)',
	},
	'.cm-lp-meta-bind-btn-destructive:hover': {
		backgroundColor: 'var(--lp-meta-bind-btn-destructive-hover)',
	},
	'.cm-lp-meta-bind-btn-plain': {
		backgroundColor: 'transparent',
		color: 'var(--lp-meta-bind-btn-plain-text)',
	},
	'.cm-lp-meta-bind-btn-plain:hover': {
		backgroundColor: 'var(--lp-meta-bind-btn-plain-hover)',
	},
	'.cm-activeLine:has(.cm-lp-meta-bind-button-container)': {
		backgroundColor: 'transparent !important',
	},
	'.cm-lp-meta-bind-button-error': {
		display: 'block',
		padding: '6px 12px',
		margin: '4px 0',
		color: 'var(--lp-meta-bind-error-text)',
		fontSize: '12px',
		fontStyle: 'italic',
		backgroundColor: 'var(--lp-meta-bind-error-bg)',
		borderRadius: '6px',
		border: '1px solid var(--lp-meta-bind-error-border)',
	},
	/* ── Mermaid diagrams ── */
	'.cm-lp-mermaid': {
		display: 'block',
		backgroundColor: 'var(--lp-codeblock-bg)',
		borderRadius: '6px',
		border: '1px solid var(--lp-codeblock-border)',
		overflow: 'hidden',
		margin: '2px 0',
	},
	'.cm-lp-mermaid-header': {
		display: 'flex',
		alignItems: 'center',
		padding: '4px 12px',
		borderBottom: '1px solid var(--lp-codeblock-border)',
		backgroundColor: 'var(--lp-codeblock-header-bg)',
	},
	'.cm-lp-mermaid-lang': {
		fontSize: '11px',
		color: 'var(--lp-codeblock-lang)',
		fontFamily: 'MonoLisa, monospace',
		textTransform: 'lowercase',
	},
	'.cm-lp-mermaid-diagram': {
		padding: '16px',
		display: 'flex',
		justifyContent: 'center',
		overflow: 'auto',
	},
	'.cm-lp-mermaid-diagram svg': {
		maxWidth: '100%',
		height: 'auto',
	},
	'.cm-lp-mermaid-error': {
		padding: '10px 12px',
		color: 'var(--lp-collection-error, #f87171)',
		fontSize: '12px',
		fontStyle: 'italic',
	},
	'.cm-activeLine:has(.cm-lp-mermaid)': {
		backgroundColor: 'transparent !important',
	},
	/* ── Math (KaTeX) ── */
	'.cm-lp-math-inline': {
		display: 'inline',
		verticalAlign: 'baseline',
	},
	'.cm-lp-math-block': {
		display: 'block',
		padding: '12px 16px',
		margin: '2px 0',
		textAlign: 'center',
		overflow: 'auto',
	},
	'.cm-lp-math-error': {
		color: 'var(--lp-collection-error, #f87171)',
		fontSize: '12px',
		fontStyle: 'italic',
		fontFamily: 'MonoLisa, monospace',
	},
	'.cm-activeLine:has(.cm-lp-math-block)': {
		backgroundColor: 'transparent !important',
	},
	/* ── QueryJS ── */
	'.cm-lp-qjs-block': {
		display: 'block',
		padding: '10px 14px',
		margin: '4px 0',
		backgroundColor: 'var(--lp-collection-bg)',
		borderRadius: '8px',
		border: '1px solid var(--lp-collection-border)',
		fontSize: '16px',
		lineHeight: '1.5',
	},
	'.cm-lp-qjs-error': {
		color: 'var(--lp-collection-error, #f87171)',
		fontSize: '15px',
		fontStyle: 'italic',
	},
	'.cm-lp-qjs-loading': {
		color: 'var(--lp-collection-loading)',
		fontSize: '15px',
		padding: '4px 0',
	},
	'.cm-lp-qjs-link': {
		color: 'var(--lp-wikilink)',
		textDecoration: 'underline',
		textDecorationColor: 'var(--lp-wikilink-decoration)',
		cursor: 'pointer',
	},
	'.cm-lp-qjs-link:hover': {
		textDecorationColor: 'var(--lp-wikilink)',
	},
	'.cm-lp-qjs-list': {
		margin: '0',
		paddingLeft: '20px',
	},
	'.cm-lp-qjs-table': {
		width: '100%',
		borderCollapse: 'collapse',
		fontSize: '15px',
	},
	'.cm-lp-qjs-table th, .cm-lp-qjs-table td': {
		border: '1px solid var(--lp-collection-border)',
		padding: '7px 12px',
		textAlign: 'left',
	},
	'.cm-lp-qjs-table th': {
		backgroundColor: 'var(--lp-collection-table-header-bg)',
		fontWeight: '600',
	},
	'.cm-lp-qjs-tasklist': {
		listStyle: 'none',
		margin: '0',
		paddingLeft: '4px',
	},
	'.cm-activeLine:has(.cm-lp-qjs-block)': {
		backgroundColor: 'transparent !important',
	},
});
