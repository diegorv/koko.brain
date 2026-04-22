/**
 * Class-name helpers for the two cursor-reveal patterns used by the inline
 * handlers. Keeping them here avoids the 5 handlers that repeat the same
 * ternary inline.
 */

/**
 * Returns the class string for marks that **reveal** when the cursor enters
 * the queried range. Non-touched state is just `base`; touched adds `-visible`.
 *
 * Used by every handler that emits `cm-formatting-block` / `cm-formatting-inline`.
 */
export function revealClass(base: string, touched: boolean): string {
	return touched ? `${base} ${base}-visible` : base;
}

/**
 * Returns the class string for elements that **hide** when the cursor leaves
 * the queried range. Touched state is just `base`; non-touched adds `-hidden`.
 *
 * Used by inline comments and block references — both want to disappear when
 * the cursor is away and show dimmed when the cursor enters.
 */
export function hideClass(base: string, touched: boolean): string {
	return touched ? base : `${base} ${base}-hidden`;
}
