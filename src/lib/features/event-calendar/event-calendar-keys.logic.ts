/**
 * Keyboard shortcuts of the Calendar tab, a port of
 * `calender-app-design/src/components/shell/keyboard-shortcuts.tsx` scoped to
 * the view. The view computes the state from its stores and the event target;
 * this module decides what a key does. Pure: no framework imports.
 */

import type { CalendarViewMode } from './event-calendar.types';

/** What a key press asks the Calendar view to do. */
export type CalendarKeyAction =
	| { kind: 'today' }
	| { kind: 'view'; view: CalendarViewMode }
	| { kind: 'step'; dir: 1 | -1 }
	| { kind: 'new-event' }
	| { kind: 'delete'; path: string }
	| { kind: 'close-popover' }
	| { kind: 'undo' }
	| { kind: 'redo' };

/** What the view knows about a key press beyond the key itself. */
export interface CalendarKeyState {
	/** Whether the key landed in a text field (`isTypingTarget`). */
	typing: boolean;
	/** Whether the event dialog is open, read from the view store. */
	dialogOpen: boolean;
	/** Whether the key landed inside the D/W/M tablist, which handles its own arrows. */
	targetInTablist: boolean;
	/** Path of the popover's event, or null when the popover is closed. */
	popoverPath: string | null;
	/** Path of the event block the key landed in, or null. */
	focusedEventPath: string | null;
}

/** The key and modifier fields of a keyboard event that `resolveCalendarKey` reads. */
export type CalendarKeyEvent = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>;

/** Single-letter view keys. */
const VIEW_KEYS: Record<string, CalendarViewMode> = { d: 'day', w: 'week', m: 'month' };

/** Tag names whose elements take typed text. */
const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Whether a key landing on `el` is typing: an input, textarea or select, or
 * a contenteditable element.
 * @param el - the keyboard event's target
 */
export function isTypingTarget(el: EventTarget | null): boolean {
	if (!el || typeof el !== 'object') return false;
	const node = el as Partial<HTMLElement>;
	if (typeof node.tagName === 'string' && TYPING_TAGS.has(node.tagName.toUpperCase())) return true;
	return node.isContentEditable === true;
}

/**
 * Maps a key press in the Calendar view to an action.
 *
 * Nothing fires while the user types or while the dialog is open. Letters
 * and arrows are ignored with Meta, Ctrl or Alt held, and the arrows inside
 * the tablist. Escape acts only on an open popover, so a live drag's own
 * Escape listener keeps it. Delete and Backspace target the popover's event,
 * else the focused block.
 * @returns the action, or null when the key is not a calendar shortcut
 */
export function resolveCalendarKey(e: CalendarKeyEvent, state: CalendarKeyState): CalendarKeyAction | null {
	if (state.typing || state.dialogOpen) return null;
	const key = e.key.toLowerCase();

	if (e.metaKey && !e.ctrlKey && !e.altKey && key === 'z') {
		return e.shiftKey ? { kind: 'redo' } : { kind: 'undo' };
	}
	if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && key === 'y') return { kind: 'redo' };
	if (e.metaKey || e.ctrlKey || e.altKey) return null;

	if (key === 't') return { kind: 'today' };
	if (key === 'n') return { kind: 'new-event' };
	if (Object.hasOwn(VIEW_KEYS, key)) return { kind: 'view', view: VIEW_KEYS[key] };
	if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
		if (state.targetInTablist) return null;
		return { kind: 'step', dir: e.key === 'ArrowRight' ? 1 : -1 };
	}
	if (e.key === 'Delete' || e.key === 'Backspace') {
		const path = state.popoverPath ?? state.focusedEventPath;
		return path === null ? null : { kind: 'delete', path };
	}
	if (e.key === 'Escape') return state.popoverPath === null ? null : { kind: 'close-popover' };
	return null;
}
