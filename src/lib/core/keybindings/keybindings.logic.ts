import type { KeybindingConfig } from '$lib/core/settings/settings.types';

/** Keys that are modifiers themselves — the recorder waits for a real key. */
const MODIFIER_KEYS = new Set(['Meta', 'Shift', 'Alt', 'Control']);

/** Display glyphs for non-printable keys, keyed by lowercase `KeyboardEvent.key`. */
const SPECIAL_KEY_LABELS: Record<string, string> = {
	' ': 'Space',
	arrowup: '↑',
	arrowdown: '↓',
	arrowleft: '←',
	arrowright: '→',
	escape: 'Esc',
	enter: '↵',
	tab: 'Tab',
	backspace: '⌫',
	delete: 'Del',
};

/**
 * Tests whether a keyboard event matches a keybinding config. Every modifier
 * must match exactly (a binding without Shift will not fire when Shift is held)
 * — mirroring the matching in `$lib/utils/keybindings`.
 */
export function matchesKeybinding(e: KeyboardEvent, kb: KeybindingConfig): boolean {
	if (!kb.key) return false;
	if (kb.meta !== e.metaKey) return false;
	if (kb.shift !== e.shiftKey) return false;
	if (kb.alt !== e.altKey) return false;
	if (kb.ctrl !== e.ctrlKey) return false;
	return e.key.toLowerCase() === kb.key.toLowerCase();
}

/**
 * Builds a KeybindingConfig from a keydown event for the shortcut recorder.
 * Returns null when only modifier keys are held, so capture waits for a real
 * non-modifier key to be pressed.
 */
export function eventToKeybindingConfig(e: KeyboardEvent): KeybindingConfig | null {
	if (MODIFIER_KEYS.has(e.key)) return null;
	return {
		key: e.key.toLowerCase(),
		meta: e.metaKey,
		shift: e.shiftKey,
		alt: e.altKey,
		ctrl: e.ctrlKey,
	};
}

/** Returns true when two keybinding configs describe the same shortcut. */
export function keybindingsEqual(a: KeybindingConfig, b: KeybindingConfig): boolean {
	return (
		a.key.toLowerCase() === b.key.toLowerCase() &&
		a.meta === b.meta &&
		a.shift === b.shift &&
		a.alt === b.alt &&
		a.ctrl === b.ctrl
	);
}

/**
 * A shortcut is acceptable only if it carries a "command" modifier
 * (Cmd, Ctrl or Alt). A bare key or Shift-only combo would fire while typing
 * in the editor, so the recorder rejects it.
 */
export function isAcceptableShortcut(kb: KeybindingConfig): boolean {
	return kb.meta || kb.ctrl || kb.alt;
}

/** Formats a single key for display (uppercase letters, glyphs for special keys). */
function formatKey(key: string): string {
	const lower = key.toLowerCase();
	if (SPECIAL_KEY_LABELS[lower]) return SPECIAL_KEY_LABELS[lower];
	return key.length === 1 ? key.toUpperCase() : key;
}

/** Formats a keybinding for display using macOS modifier glyphs (e.g. "⌘⇧E"). */
export function formatKeybinding(kb: KeybindingConfig): string {
	const parts: string[] = [];
	if (kb.ctrl) parts.push('⌃');
	if (kb.alt) parts.push('⌥');
	if (kb.shift) parts.push('⇧');
	if (kb.meta) parts.push('⌘');
	parts.push(formatKey(kb.key));
	return parts.join('');
}

/**
 * Built-in global shortcuts other than the customizable ones, used to warn
 * when a chosen combo collides. The bracket/comma entries are matched here by
 * their printed key character (they are registered by `code` at runtime), so
 * conflict detection for them is best-effort across keyboard layouts.
 */
export const RESERVED_KEYBINDINGS: readonly { label: string; binding: KeybindingConfig }[] = [
	{ label: 'Command Palette', binding: kb('p', { meta: true }) },
	{ label: 'Quick Switcher', binding: kb('o', { meta: true }) },
	{ label: 'Save File', binding: kb('s', { meta: true }) },
	{ label: 'Close Tab', binding: kb('w', { meta: true }) },
	{ label: 'Previous Tab', binding: kb('[', { meta: true, shift: true }) },
	{ label: 'Next Tab', binding: kb(']', { meta: true, shift: true }) },
	{ label: 'Search', binding: kb('f', { meta: true, shift: true }) },
	{ label: 'Toggle Graph View', binding: kb('g', { meta: true }) },
	{ label: 'Toggle Tasks', binding: kb('t', { meta: true, shift: true }) },
	{ label: 'Toggle Left Sidebar', binding: kb('b', { meta: true, shift: true }) },
	{ label: 'Toggle Right Sidebar', binding: kb('b', { meta: true }) },
	{ label: 'New Note', binding: kb('n', { meta: true }) },
	{ label: 'New 1:1 Note', binding: kb('n', { meta: true, shift: true }) },
	{ label: 'Open Settings', binding: kb(',', { meta: true }) },
	{ label: 'File History', binding: kb('h', { meta: true, shift: true }) },
	{ label: 'Zoom In', binding: kb('=', { meta: true }) },
	{ label: 'Zoom In', binding: kb('+', { meta: true, shift: true }) },
	{ label: 'Zoom Out', binding: kb('-', { meta: true }) },
	{ label: 'Reset Zoom', binding: kb('0', { meta: true }) },
	{ label: 'Toggle Source Mode', binding: kb('k', { meta: true }) },
];

/**
 * Returns the label of the first reserved shortcut that the candidate collides
 * with, or null when there is no conflict.
 */
export function findKeybindingConflict(
	candidate: KeybindingConfig,
	reserved: readonly { label: string; binding: KeybindingConfig }[] = RESERVED_KEYBINDINGS,
): string | null {
	const hit = reserved.find((r) => keybindingsEqual(r.binding, candidate));
	return hit ? hit.label : null;
}

/** Builds a KeybindingConfig from a key + a subset of modifier flags. */
function kb(key: string, mods: Partial<Omit<KeybindingConfig, 'key'>> = {}): KeybindingConfig {
	return { key, meta: !!mods.meta, shift: !!mods.shift, alt: !!mods.alt, ctrl: !!mods.ctrl };
}
