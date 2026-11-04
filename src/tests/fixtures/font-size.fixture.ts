/**
 * Font-size helpers for the "block text scales with the editor font" tests.
 * jsdom computes no font sizes, so these resolve the inline `font-size` strings by hand.
 */

/** The one px font size allowed in note blocks: the 11px floor that still grows with the editor font. */
export const BLOCK_TEXT_FLOOR = /^max\(11px, [\d.]+em\)$/;

/** Resolves one `font-size` value, `<n>em` or `max(<n>px, <m>em)`, against its parent's px size. */
export function resolveFontSize(value: string, parentPx: number): number {
	const floored = value.match(/^max\(([\d.]+)px, ([\d.]+)em\)$/);
	if (floored) return Math.max(Number(floored[1]), Number(floored[2]) * parentPx);
	const em = value.match(/^([\d.]+)em$/);
	if (em) return Number(em[1]) * parentPx;
	throw new Error(`unsupported font-size: ${value}`);
}

/**
 * The px font size of `el`, resolved from `rootPx` (the size around `root`) down through
 * `root` and every element between it and `el`. A node's inline size wins over its class
 * size; `classEm` gives the theme size of the classes the walk should apply.
 */
export function resolvedFontPx(
	el: HTMLElement,
	root: HTMLElement,
	rootPx: number,
	classEm: Record<string, number> = {},
): number {
	const chain: HTMLElement[] = [];
	for (let node: HTMLElement | null = el; node; node = node.parentElement) {
		chain.unshift(node);
		if (node === root) break;
	}
	if (chain[0] !== root) throw new Error('root is not an ancestor of el');
	let px = rootPx;
	for (const node of chain) {
		if (node.style.fontSize) {
			px = resolveFontSize(node.style.fontSize, px);
			continue;
		}
		const cls = Object.keys(classEm).find((c) => node.classList.contains(c));
		if (cls) px *= classEm[cls];
	}
	return px;
}
