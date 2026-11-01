/** Controls that take focus on their own, whatever their `tabindex`. */
const NATIVE_FOCUSABLE = 'button, a[href], input, select, textarea, [contenteditable="true"]';
/** Elements an outside click may land focus on. */
const FOCUSABLE = `${NATIVE_FOCUSABLE}, [tabindex]`;

/** What the event popover's close reads to decide where focus goes. */
export interface FocusReturnInput {
	/** Target of the outside pointer interaction that closed the popover, if any. */
	outside: Element | null;
	/** The Calendar view root. */
	root: HTMLElement | undefined;
	/** Set by Edit: the dialog that replaces the popover takes focus. */
	handOffFocus: boolean;
	/** Set by Duplicate: the copy's block takes focus once it renders. */
	focusCopy: boolean;
	/** Path of the event the popover last showed. */
	lastPath: string | null;
	/** The element holding focus now (`document.activeElement`). */
	activeElement: Element | null;
	/** The block of the event at `path` inside the root, or `null`. */
	findBlock: (path: string) => HTMLElement | null;
}

/**
 * Where focus goes when the event popover closes, or `null` to leave it
 * alone. bits-ui would restore it to an element that may have unmounted,
 * leaving it on `<body>`, so the close decides:
 * - Edit: the dialog takes focus; leave it.
 * - Duplicate: park on the root, unless focus is already inside it.
 * - An outside click on a control: that control.
 * - Otherwise: the clicked event's block, or the root when the block is gone.
 */
export function focusReturnTarget(input: FocusReturnInput): HTMLElement | null {
	const { outside, root } = input;
	if (input.handOffFocus) return null;
	if (input.focusCopy) return root?.isConnected && !root.contains(input.activeElement) ? root : null;
	const focusable = outside?.isConnected ? outside.closest<HTMLElement>(FOCUSABLE) : null;
	// A `tabindex="-1"` wrapper inside this view (the root, the header tablist) is not
	// where the user meant focus to go; one outside it (another pane) is. A native control
	// with a roving `tabindex="-1"` (an unselected header view tab) is not a wrapper.
	const ownWrapper =
		focusable?.getAttribute('tabindex') === '-1' && !focusable.matches(NATIVE_FOCUSABLE) && root?.contains(focusable);
	if (focusable && !ownWrapper) return focusable;
	if (!root || !root.isConnected) return null;
	return (input.lastPath ? input.findBlock(input.lastPath) : null) ?? root;
}
