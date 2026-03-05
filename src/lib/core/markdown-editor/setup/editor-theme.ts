import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

/** Builds a CodeMirror theme from the current editor settings */
export function buildEditorTheme(
	fontFamily: string,
	fontSize: number,
	lineHeight: number,
	contentWidth: number,
	paragraphSpacing: number,
): Extension {
	return EditorView.theme(
		{
			'&': {
				backgroundColor: 'var(--card)',
				color: 'var(--foreground)',
				height: '100%',
			},
			'.cm-scroller': {
				overflow: 'auto',
				fontFamily,
				fontSize: `${fontSize}px`,
				lineHeight: `${lineHeight}`,
			},
			'.cm-content': {
				caretColor: 'var(--foreground)',
				padding: '16px clamp(24px, 5vw, 80px)',
				userSelect: 'text',
				fontSize: '1.05em',
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
				borderLeftColor: 'var(--foreground)',
			},
			'.cm-activeLine': {
				backgroundColor: 'var(--syntax-active-line)',
			},
			'.cm-content ::selection': {
				backgroundColor: 'var(--syntax-selection)',
			},
			'.cm-gutters': {
				backgroundColor: 'var(--card)',
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
			},
			'.cm-tooltip-autocomplete': {
				'& > ul > li[aria-selected]': {
					backgroundColor: 'var(--accent)',
					color: 'var(--accent-foreground)',
				},
			},
		},
		{ dark: true }
	);
}
