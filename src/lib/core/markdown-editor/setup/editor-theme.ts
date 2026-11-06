import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

import { editorFontFamily } from '#lib/utils/font-stacks.js';

/**
 * Builds a CodeMirror theme from the current editor settings. `fontFamily` is
 * the raw setting: a single name is quoted and the app sans stack is appended.
 * `dark` sets CodeMirror's `darkTheme` facet, which picks the light or dark
 * base theme for every style the app theme does not override.
 */
export function buildEditorTheme(
	fontFamily: string,
	fontSize: number,
	lineHeight: number,
	contentWidth: number,
	paragraphSpacing: number,
	dark: boolean,
): Extension {
	return EditorView.theme(
		{
			'&': {
				backgroundColor: 'var(--editor-bg)',
				color: 'var(--editor-fg)',
				height: '100%',
				outline: 'none',
			},
			'&.cm-focused': {
				outline: 'none',
			},
			'.cm-scroller': {
				overflow: 'auto',
				fontFamily: editorFontFamily(fontFamily),
				fontSize: `${fontSize}px`,
				lineHeight: `${lineHeight}`,
			},
			'.cm-content': {
				caretColor: 'var(--editor-fg)',
				padding: '16px clamp(24px, 5vw, 80px)',
				userSelect: 'text',
				...(contentWidth > 0 && {
					maxWidth: `${contentWidth}px`,
					marginLeft: 'auto',
					marginRight: 'auto',
				}),
			},
			'.cm-line': {
				...(paragraphSpacing > 0 && {
					paddingBottom: `${paragraphSpacing}em`,
				}),
			},
			'.cm-cursor, .cm-dropCursor': {
				borderLeftColor: 'var(--editor-fg)',
			},
			'.cm-activeLine': {
				backgroundColor: 'var(--syntax-active-line)',
			},
			'.cm-content ::selection': {
				backgroundColor: 'var(--syntax-selection)',
			},
			'.cm-gutters': {
				backgroundColor: 'var(--editor-bg)',
				color: 'var(--muted-foreground)',
				borderRight: '1px solid var(--border)',
			},
			'.cm-activeLineGutter': {
				backgroundColor: 'var(--syntax-active-line-gutter)',
			},
			'.cm-tooltip': {
				backgroundColor: 'var(--popover)',
				color: 'var(--popover-foreground)',
				border: '1px solid var(--border)',
				borderRadius: 'var(--radius-md)',
				boxShadow: 'var(--shadow-md)',
			},
			// Same selector as @codemirror/autocomplete's base theme, whose
			// `padding: 0` on the list would otherwise outrank this one.
			'.cm-tooltip.cm-tooltip-autocomplete': {
				'& > ul': {
					padding: '4px',
				},
				'& > ul > li': {
					borderRadius: 'var(--radius-sm)',
				},
				'& > ul > li[aria-selected]': {
					backgroundColor: 'var(--accent)',
					color: 'var(--accent-foreground)',
				},
			},
		},
		{ dark }
	);
}
