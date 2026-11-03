import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { TABLE_WIDGET_CLASS } from '../../../wikilink-click-target';

/**
 * Where a press in a block widget's blank band sends the cursor: a document
 * position on the visible line next to the block, or `null` to keep the
 * selection as it is (the neighbour is another block or there is none, or the
 * press is beside the widget: in the block line's own padding, in the
 * `.cm-content` padding beside that line, or on the table wrapper's padding).
 */
export interface BandTarget {
	/** Cursor position, or `null` for "leave the selection alone" */
	pos: number | null;
}

/** The parts of a mouse event `bandClickTarget` reads. */
export type BandPress = Pick<MouseEvent, 'target' | 'button' | 'clientY'>;

/**
 * The one block-level widget element a `.cm-line` holds, when the line holds
 * nothing else but CodeMirror's `cm-widgetBuffer` images; otherwise `null`.
 * A line with text beside the widget (an image mid-paragraph) is not a band
 * line: a press there belongs to the text.
 */
export function soleBlockWidget(line: Element): HTMLElement | null {
	let widget: HTMLElement | null = null;
	for (const node of Array.from(line.childNodes)) {
		if (node.nodeType === Node.TEXT_NODE) {
			if (node.textContent) return null;
			continue;
		}
		if (!(node instanceof HTMLElement)) return null;
		if (node.classList.contains('cm-widgetBuffer')) continue;
		if (widget) return null;
		widget = node;
	}
	if (!widget) return null;
	const display = getComputedStyle(widget).display;
	return display.startsWith('inline') || display === 'none' || display === 'contents' ? null : widget;
}

/** The nearest sibling of `line` in direction `dir` that is laid out (hidden block lines are skipped). */
function visibleSibling(line: Element, dir: -1 | 1): Element | null {
	let el = dir < 0 ? line.previousElementSibling : line.nextElementSibling;
	while (el?.classList.contains('cm-lp-hidden-line')) {
		el = dir < 0 ? el.previousElementSibling : el.nextElementSibling;
	}
	return el;
}

/** The `.cm-line` child of the content element whose box spans `clientY`, if any. */
function lineAtY(view: EditorView, clientY: number): Element | null {
	for (const el of Array.from(view.contentDOM.children)) {
		if (!el.classList.contains('cm-line')) continue;
		const box = el.getBoundingClientRect();
		if (clientY >= box.top && clientY <= box.bottom) return el;
	}
	return null;
}

/**
 * Decides whether a press lands in the blank band above or below a block
 * widget. The block decorators replace their source with an inline
 * `Decoration.replace` whose DOM is a block-level element, and the widget
 * buffers CodeMirror draws on each side of it each get a line box of their
 * own inside the widget's `.cm-line`. `posAtCoords` maps a press there into
 * the replaced range, which would reveal the source, so the press is sent to
 * the visible line next to the block instead: the end of the line above, or
 * the start of the line below.
 *
 * The blank zones beside a block widget keep the selection as it is
 * (`{ pos: null }`): the widget line's own horizontal padding level with the
 * widget box (CodeMirror's `.cm-line` padding, left and right of the widget),
 * the `.cm-content` padding beside that line (CodeMirror would send either
 * press into the replaced range), and the table wrapper's own padding around
 * the table and its `+` buttons. Returns `null` when the press is anywhere else.
 */
export function bandClickTarget(view: EditorView, event: BandPress): BandTarget | null {
	if (event.button !== 0 || !(event.target instanceof Element)) return null;
	const target = event.target;
	if (target === view.contentDOM) {
		const beside = lineAtY(view, event.clientY);
		return beside && soleBlockWidget(beside) ? { pos: null } : null;
	}
	if (target.classList.contains(TABLE_WIDGET_CLASS) && view.contentDOM.contains(target)) return { pos: null };
	const line = target.closest('.cm-line');
	if (!line || !view.contentDOM.contains(line)) return null;
	if (target !== line && !target.classList.contains('cm-widgetBuffer')) return null;
	const widget = soleBlockWidget(line);
	if (!widget) return null;

	const box = widget.getBoundingClientRect();
	const dir = event.clientY < box.top ? -1 : event.clientY > box.bottom ? 1 : 0;
	if (dir === 0) return { pos: null };

	const neighbour = visibleSibling(line, dir);
	if (!neighbour?.classList.contains('cm-line') || soleBlockWidget(neighbour)) return { pos: null };
	const next = view.state.doc.lineAt(view.posAtDOM(neighbour, 0));
	return { pos: dir < 0 ? next.to : next.from };
}

/**
 * Mouse selection for a press in a block widget's blank band (see
 * `bandClickTarget`): the press puts the cursor on the line next to the
 * block, shift extends the selection there, and a drag runs from there to
 * wherever the pointer goes. A press in a zone that keeps the selection (the
 * block line's own padding beside the widget, the `.cm-content` padding beside
 * a block line, the table wrapper's padding, a band whose neighbour is another
 * block) leaves it as it is, drag included.
 * Any other press gets CodeMirror's default.
 */
export const blockBandClick = EditorView.mouseSelectionStyle.of((view, event) => {
	const start = bandClickTarget(view, event);
	if (!start) return null;
	let startSel = view.state.selection;
	let anchor = start.pos;
	return {
		update(update) {
			if (!update.docChanged) return;
			startSel = startSel.map(update.changes);
			if (anchor !== null) anchor = update.changes.mapPos(anchor);
		},
		get(cur, extend, multiple) {
			if (anchor === null) return startSel;
			const band = bandClickTarget(view, cur);
			const head = band ? (band.pos ?? anchor) : view.posAtCoords({ x: cur.clientX, y: cur.clientY }, false);
			if (extend) return startSel.replaceRange(startSel.main.extend(head));
			const range = EditorSelection.range(anchor, head);
			return multiple ? startSel.addRange(range) : EditorSelection.create([range]);
		},
	};
});
