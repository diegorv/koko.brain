import type { EditorState, Range } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { findAllCallouts, type CalloutBlock } from '../parsers/callout';
import { blockDecorator } from '../core/block-decorator';
import { revealPredicate } from '../core/reveal';
import { calloutFoldState, toggleCalloutFold } from '../core/effects';
import { hiddenLineDeco, hiddenSyntaxDeco, revealedBlockSyntaxDeco } from '../styles';
import { CALLOUT_COLORS } from '../../callout/callout.logic';

/**
 * Callout type list shown in the type-switcher dropdown. Drawn from
 * `CALLOUT_COLORS` keys so the dropdown matches the parser's recognised
 * set. Sorted alphabetically for predictability.
 */
const CALLOUT_TYPES: readonly string[] = Object.keys(CALLOUT_COLORS).sort();

/** Widget that renders a fold chevron (▶/▼) for any callout (foldable or not) */
class CalloutFoldWidget extends WidgetType {
	constructor(
		readonly isCollapsed: boolean,
		readonly startLine: number,
	) {
		super();
	}

	toDOM(view: EditorView) {
		const span = document.createElement('span');
		span.className = 'cm-lp-callout-fold';
		span.textContent = this.isCollapsed ? '\u25B6' : '\u25BC';
		span.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			view.dispatch({ effects: toggleCalloutFold.of(this.startLine) });
		});
		return span;
	}

	eq(other: CalloutFoldWidget) {
		return this.isCollapsed === other.isCollapsed && this.startLine === other.startLine;
	}

	ignoreEvent() {
		return false;
	}
}

/**
 * Type-switcher widget. Renders a clickable label showing the current
 * callout type; clicking opens a popover with every supported type. On
 * pick, a single transaction rewrites just the type token in the source.
 * The border colour follows automatically because `findAllCallouts`
 * re-reads the type and `CALLOUT_COLORS[type]` resolves the new colour.
 */
class CalloutTypeSwitcherWidget extends WidgetType {
	constructor(
		readonly currentType: string,
		readonly typeFrom: number,
		readonly typeTo: number,
	) {
		super();
	}

	toDOM(view: EditorView) {
		const wrap = document.createElement('span');
		wrap.className = 'cm-lp-callout-type-switcher';

		const label = document.createElement('button');
		label.type = 'button';
		label.className = 'cm-lp-callout-type-label';
		label.textContent = this.currentType;
		label.title = 'Change callout type';

		const popover = document.createElement('div');
		popover.className = 'cm-lp-callout-type-popover';
		popover.style.display = 'none';
		for (const type of CALLOUT_TYPES) {
			const opt = document.createElement('button');
			opt.type = 'button';
			opt.className = 'cm-lp-callout-type-option';
			if (type === this.currentType) opt.classList.add('cm-lp-callout-type-option-current');
			opt.textContent = type;
			opt.addEventListener('mousedown', (e) => {
				e.preventDefault();
				e.stopPropagation();
				view.dispatch({
					changes: { from: this.typeFrom, to: this.typeTo, insert: type },
					userEvent: 'input.callout.set-type',
				});
				popover.style.display = 'none';
			});
			popover.appendChild(opt);
		}

		label.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			popover.style.display = popover.style.display === 'none' ? 'block' : 'none';
		});

		// Close popover on outside click
		const onDocMousedown = (e: MouseEvent) => {
			if (!wrap.contains(e.target as Node)) popover.style.display = 'none';
		};
		document.addEventListener('mousedown', onDocMousedown);
		(wrap as any).__cleanupDocListener = () => {
			document.removeEventListener('mousedown', onDocMousedown);
		};

		wrap.appendChild(label);
		wrap.appendChild(popover);
		return wrap;
	}

	destroy(dom: HTMLElement) {
		(dom as any).__cleanupDocListener?.();
	}

	eq(other: CalloutTypeSwitcherWidget) {
		return (
			this.currentType === other.currentType &&
			this.typeFrom === other.typeFrom &&
			this.typeTo === other.typeTo
		);
	}

	ignoreEvent(event: Event) {
		// Allow mouse events through so the popover stays interactive
		return event.type !== 'mousedown' && event.type !== 'click';
	}
}

/** Number of `>` quote prefixes before the `[!type]` of a callout header line. */
function headerDepth(text: string): number {
	return text.slice(0, text.indexOf('[!')).split('>').length - 1;
}

/** Length of the first `depth` quote prefixes (`>` plus one optional space) of a content line. */
function quotePrefixLength(text: string, depth: number): number {
	let i = 0;
	for (let d = 0; d < depth && text[i] === '>'; d++) {
		i++;
		if (text[i] === ' ' || text[i] === '\t') i++;
	}
	return i;
}

/**
 * Computes callout decorations using the Lezer syntax tree.
 *
 * A nested callout (`> > [!note]` inside `> [!warning]`) owns its lines: the
 * parent skips them, hides them with itself when collapsed, and reveals them
 * with itself. Its decorations land before positions the parent already
 * decorated, so the set is sorted at the end.
 */
export function computeCallouts(state: EditorState): DecorationSet {
	const isRevealed = revealPredicate(state);
	const decos: Range<Decoration>[] = [];
	const callouts = findAllCallouts(state);
	const foldedLines = state.field(calloutFoldState, false) ?? new Set<number>();

	// `findAllCallouts` lists a parent before the callouts nested in it, so the
	// last write per line is its innermost callout.
	const lineOwner = new Map<number, CalloutBlock>();
	for (const callout of callouts) {
		for (let n = callout.startLine; n <= callout.endLine; n++) lineOwner.set(n, callout);
	}
	// Ends of the furthest revealed / collapsed callout so far. A later callout
	// ending at or before one of them is nested inside it.
	let revealedTo = -1;
	let collapsedTo = -1;

	for (const callout of callouts) {
		if (callout.to <= collapsedTo) continue;
		const { header } = callout;
		const isTouched = callout.to <= revealedTo || isRevealed(callout.from, callout.to);
		if (isTouched) revealedTo = Math.max(revealedTo, callout.to);

		const lineDeco = Decoration.line({
			class: 'cm-lp-callout',
			attributes: { style: `border-left-color: ${header.color}` },
		});

		// Phase 17: every callout is foldable. Default state for non-foldable
		// callouts (no `+`/`-` marker) is "expanded"; the `+` marker also
		// defaults to expanded. `-` defaults to collapsed. Toggle via
		// `calloutFoldState` inverts the default.
		const isFoldable = true;
		let isCollapsed: boolean;
		if (foldedLines.has(callout.startLine)) {
			// User toggled — inverted from default
			isCollapsed = header.foldable === '+' || header.foldable === null;
		} else {
			// Default state — `-` starts collapsed, everything else expanded
			isCollapsed = header.foldable === '-';
		}
		const hidesContent = !isTouched && isCollapsed;
		if (hidesContent) collapsedTo = Math.max(collapsedTo, callout.to);

		const markerDeco = isTouched ? revealedBlockSyntaxDeco : hiddenSyntaxDeco;

		// Header line: line deco + (optional) type-switcher widget + mark on marker
		// + (optional) fold chevron + optional title mark.
		const headerLine = state.doc.line(callout.startLine);
		decos.push(lineDeco.range(headerLine.from));

		// Type-switcher widget at marker start (side -1 → before the mark below).
		// Phase 17: every callout gets it (regardless of `+`/`-` marker).
		if (isFoldable && !isTouched) {
			const typeBracketIdx = headerLine.text.indexOf('[!');
			if (typeBracketIdx >= 0) {
				const typeFrom = headerLine.from + typeBracketIdx + 2;
				const typeTo = typeFrom + header.type.length;
				decos.push(
					Decoration.widget({
						widget: new CalloutTypeSwitcherWidget(header.type, typeFrom, typeTo),
						side: -1,
					}).range(header.markerFrom),
				);
			}
		}

		// Hides the marker text (`> [!type]`). A non-inclusive replace sorts after
		// the side -1 type-switcher widget at the same start position. The fold
		// chevron (side -1 at markerTo) stays outside it.
		decos.push(markerDeco.range(header.markerFrom, header.markerTo));

		// Fold chevron widget at markerTo. Phase 17: every callout gets a chevron.
		if (isFoldable && !isTouched) {
			decos.push(
				Decoration.widget({ widget: new CalloutFoldWidget(isCollapsed, callout.startLine), side: -1 }).range(
					header.markerTo,
				),
			);
		}

		if (header.title) {
			decos.push(Decoration.mark({ class: 'cm-lp-callout-title' }).range(header.titleFrom, header.titleTo));
		}

		// Content lines: line deco + mark on the `> ` prefixes (or hide entirely if folded and not editing)
		const depth = headerDepth(headerLine.text);
		for (let lineNum = callout.startLine + 1; lineNum <= callout.endLine; lineNum++) {
			const line = state.doc.line(lineNum);

			if (hidesContent) {
				// Hide content lines when collapsed, nested callouts included
				decos.push(hiddenLineDeco.range(line.from));
				decos.push(Decoration.line({ class: 'cm-lp-hidden-line' }).range(line.from));
			} else if (lineOwner.get(lineNum) === callout) {
				decos.push(lineDeco.range(line.from));

				const prefixLength = quotePrefixLength(line.text, depth);
				if (prefixLength > 0) {
					decos.push(markerDeco.range(line.from, line.from + prefixLength));
				}
			}
		}
	}

	return Decoration.set(decos, true);
}

/**
 * ViewPlugin that manages callout decorations independently.
 * Uses Lezer syntax tree (`Blockquote` nodes) for robust block boundary detection.
 * Hides `> [!type]` markers, applies colored left-border styling, and marks titles.
 * Shows raw text when cursor is inside the callout block.
 * Supports fold/collapse via `[!type]+` and `[!type]-` syntax.
 *
 * `rebuildOn` carries the fold effect: a `toggleCalloutFold` transaction
 * changes no document text and no selection, so `checkUpdateAction` alone
 * would report `'none'` and the chevron would not redraw.
 */
export const calloutField = blockDecorator({
	settingsKey: 'callout',
	profileLabel: 'callout',
	compute: computeCallouts,
	rebuildOn: [toggleCalloutFold],
});
