import type { Page, Locator } from '@playwright/test';
import { openMarkdownFile, clickOnLine } from './live-preview';

/** Line every click-reveal sample ends with: clicking it parks the cursor away from the element under test. */
export const END_LINE = 'End line.';

/**
 * Opens `content` as `test.md`, puts the cursor on the "End line." line so
 * every block renders, and waits for the decorations to settle. `content`
 * must contain "End line.". `settingsOverride` and `extraFiles` go to
 * `openMarkdownFile`.
 *
 * Widgets that render late (a Mermaid SVG, a loaded image, a collection's
 * rows) grow their line and push "End line." down while the click is in
 * flight, so the click is retried until the cursor is really on that line.
 */
export async function openAndSettle(
	page: Page,
	content: string,
	settingsOverride: Record<string, unknown> = {},
	extraFiles: Record<string, string> = {},
): Promise<void> {
	await openMarkdownFile(page, 'test.md', content, settingsOverride, extraFiles);
	for (let attempt = 0; attempt < 5; attempt++) {
		await clickOnLine(page, END_LINE);
		await page.waitForTimeout(200);
		if ((await activeLineText(page)) === END_LINE) return;
	}
	throw new Error(`openAndSettle: cursor never settled on "${END_LINE}"`);
}

/** Which edge of the locator's box a `clickAtOffset` offset is measured from. */
export type BoxEdge = 'top' | 'bottom' | 'left' | 'right' | 'center';

/** Where `clickAtOffset` clicks, relative to a locator's bounding box. */
export interface ClickOffset {
	/** Edge the offset starts from. `top`/`bottom` keep x at the box's horizontal center, `left`/`right` keep y at its vertical center. Default `center`. */
	from?: BoxEdge;
	/** Horizontal pixels added to the anchor point (positive = right). */
	dx?: number;
	/** Vertical pixels added to the anchor point (positive = down). */
	dy?: number;
	/** Pause after the release, in ms, for the decorations to rebuild. Default 150. */
	settle?: number;
}

/** What `clickAtOffset` clicked. */
export interface ClickResult {
	/** Viewport x of the click */
	x: number;
	/** Viewport y of the click */
	y: number;
	/** `tag.class` of the element hit at that point before the press, e.g. `IMG.cm-widgetBuffer` */
	hit: string;
	/** Text of the `.cm-line` holding the hit element, or `null` outside any line */
	hitLine: string | null;
	/** True when the `.cm-line` holding the hit element also holds the locator's element: a press in that element's own line */
	inOwnLine: boolean;
}

/**
 * Clicks a point offset from `locator`'s box with a real mouse press, and
 * reports which element sat under that point before the press, so a spec can
 * assert it hit the zone it meant (a blank band, not a control).
 *
 * The mouse jumps to the point in a single `mousemove` (no intermediate
 * steps), so no element on the way is hovered. The element at the point is
 * hovered: real input cannot press without it. Hover only changes how a
 * control looks; an `opacity: 0` control (the table's `+` buttons, the code
 * block's Copy button) still takes the click, so check `hit` instead of
 * relying on the control being invisible.
 */
export async function clickAtOffset(page: Page, locator: Locator, offset: ClickOffset = {}): Promise<ClickResult> {
	// An element scrolled out of its container (a popover option past
	// `max-height`) still has a box, but the point hits whatever is on screen there.
	await locator.scrollIntoViewIfNeeded();
	const box = await locator.boundingBox();
	if (!box) throw new Error('clickAtOffset: locator has no bounding box (not rendered?)');
	const { from = 'center', dx = 0, dy = 0, settle = 150 } = offset;
	const cx = box.x + box.width / 2;
	const cy = box.y + box.height / 2;
	const anchor = {
		top: { x: cx, y: box.y },
		bottom: { x: cx, y: box.y + box.height },
		left: { x: box.x, y: cy },
		right: { x: box.x + box.width, y: cy },
		center: { x: cx, y: cy },
	}[from];
	const x = Math.round(anchor.x + dx);
	const y = Math.round(anchor.y + dy);

	const { hit, hitLine, inOwnLine } = await locator.first().evaluate(
		(target, [px, py]) => {
			const el = document.elementFromPoint(px, py) as HTMLElement | null;
			const cls = el?.getAttribute('class') ?? '';
			const line = el?.closest('.cm-line') ?? null;
			return {
				hit: el ? `${el.tagName}${cls ? '.' + cls.trim().split(/\s+/).join('.') : ''}` : 'none',
				hitLine: line?.textContent ?? null,
				inOwnLine: !!line && line.contains(target),
			};
		},
		[x, y] as const,
	);

	await page.mouse.move(x, y, { steps: 1 });
	await page.mouse.down();
	await page.mouse.up();
	await page.waitForTimeout(settle);
	return { x, y, hit, hitLine, inOwnLine };
}

/**
 * True when a `.cm-line` contains `rawSnippet` verbatim, i.e. the element
 * that owns that markdown shows its source. Matching is exact and keeps
 * whitespace (Playwright's `hasText` collapses it, so `'    code'` would match
 * a rendered indented code block). Pick a snippet that only exists in the raw
 * markdown (`| A |`, a fence like "```js", `$$`), never text the rendered
 * widget also shows. Does not work for syntax hidden by a `font-size: 0`
 * mark, whose text stays in the DOM (HR `---`, task `- `, hard break).
 */
export async function isRevealed(page: Page, rawSnippet: string): Promise<boolean> {
	return page
		.locator('.cm-line')
		.evaluateAll((lines, raw) => lines.some((l) => (l.textContent ?? '').includes(raw)), rawSnippet);
}

/** Text of the line holding the cursor (`.cm-activeLine`), or `null` when the editor has none. */
export async function activeLineText(page: Page): Promise<string | null> {
	const line = page.locator('.cm-activeLine');
	if ((await line.count()) === 0) return null;
	return line.first().textContent();
}

/** Blank space between a rendered element's box and the `.cm-line` that holds it, in px. */
export interface LineBand {
	/** Line top to element top: the band above the element, inside its own line */
	above: number;
	/** Element bottom to line bottom: the band below the element, inside its own line */
	below: number;
	/** Element right edge to line right edge */
	right: number;
	/** The line box (viewport px) */
	line: { top: number; bottom: number; left: number; right: number };
	/** The element box (viewport px) */
	box: { top: number; bottom: number; left: number; right: number };
}

/**
 * Measures the bands between `locator`'s first element and its enclosing
 * `.cm-line`. A band over ~2px is clickable space that belongs to the
 * element's line, which is where a click can land inside the widget's
 * replaced range without touching the widget.
 */
export async function lineBandProbe(locator: Locator): Promise<LineBand> {
	return locator.first().evaluate((el) => {
		const line = el.closest('.cm-line');
		if (!line) throw new Error('lineBandProbe: element is not inside a .cm-line');
		const r = (n: number) => Math.round(n * 10) / 10;
		const a = line.getBoundingClientRect();
		const b = el.getBoundingClientRect();
		return {
			above: r(b.top - a.top),
			below: r(a.bottom - b.bottom),
			right: r(a.right - b.right),
			line: { top: r(a.top), bottom: r(a.bottom), left: r(a.left), right: r(a.right) },
			box: { top: r(b.top), bottom: r(b.bottom), left: r(b.left), right: r(b.right) },
		};
	});
}

/**
 * Clicks the blank space left of `locator`'s element inside its own
 * `.cm-line` (CodeMirror's left line padding), at the element's vertical
 * center, and checks the press hit that line and nothing else.
 */
export async function clickLeftOfWidget(page: Page, locator: Locator): Promise<ClickResult> {
	const band = await lineBandProbe(locator);
	const padding = band.box.left - band.line.left;
	if (padding < 2) throw new Error(`clickLeftOfWidget: no left padding beside the element (${padding}px)`);
	const hit = await clickAtOffset(page, locator, { from: 'left', dx: -Math.ceil(padding / 2) });
	if (hit.hit !== 'DIV.cm-line' || !hit.inOwnLine) {
		throw new Error(`clickLeftOfWidget: the press hit ${hit.hit}, not the element's own .cm-line`);
	}
	return hit;
}

/**
 * Clicks the glyphs of the first `needle` occurrence inside `line`. The point
 * is measured from a text Range, so it lands on that text and not on a
 * wrapping element's padding.
 */
export async function clickTextInLine(page: Page, line: Locator, needle: string): Promise<ClickResult> {
	const center = await line.evaluate((el, n) => {
		const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			const i = (node.textContent ?? '').indexOf(n);
			if (i < 0) continue;
			const range = document.createRange();
			range.setStart(node, i);
			range.setEnd(node, i + n.length);
			const r = range.getBoundingClientRect();
			return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
		}
		throw new Error(`text "${n}" not found in line`);
	}, needle);
	const box = await line.boundingBox();
	if (!box) throw new Error('line has no bounding box');
	return clickAtOffset(page, line, {
		from: 'left',
		dx: center.x - box.x,
		dy: center.y - (box.y + box.height / 2),
	});
}

/** The editor's main selection: its document offsets and the text it covers (empty for a cursor). */
export interface EditorSelectionInfo {
	from: number;
	to: number;
	text: string;
}

/**
 * Reads the main selection from the CodeMirror view behind `.cm-content`,
 * through the DOM back-reference `EditorView.findFromDOM` uses (the spec cannot
 * import the page's CodeMirror module).
 */
export async function editorSelection(page: Page): Promise<EditorSelectionInfo> {
	return page.evaluate(() => {
		type View = { state: { selection: { main: { from: number; to: number } }; sliceDoc(a: number, b: number): string } };
		const content = document.querySelector('.cm-content') as (Element & { cmTile?: { root?: { view?: View } } }) | null;
		const view = content?.cmTile?.root?.view;
		if (!view) throw new Error('No CodeMirror view behind .cm-content');
		const { from, to } = view.state.selection.main;
		return { from, to, text: view.state.sliceDoc(from, to) };
	});
}
