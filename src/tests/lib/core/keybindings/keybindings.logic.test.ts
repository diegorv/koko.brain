import { describe, it, expect } from 'vitest';
import {
	matchesKeybinding,
	eventToKeybindingConfig,
	keybindingsEqual,
	isAcceptableShortcut,
	formatKeybinding,
	findKeybindingConflict,
	RESERVED_KEYBINDINGS,
} from '$lib/core/keybindings/keybindings.logic';
import type { KeybindingConfig } from '$lib/core/settings/settings.types';

/** Builds a fake keyboard event with only the fields the logic reads. */
function evt(key: string, mods: Partial<{ meta: boolean; shift: boolean; alt: boolean; ctrl: boolean }> = {}): KeyboardEvent {
	return {
		key,
		metaKey: !!mods.meta,
		shiftKey: !!mods.shift,
		altKey: !!mods.alt,
		ctrlKey: !!mods.ctrl,
	} as KeyboardEvent;
}

const CYCLE: KeybindingConfig = { key: 'e', meta: true, shift: true, alt: false, ctrl: false };

describe('matchesKeybinding', () => {
	it('matches when key and all modifiers align', () => {
		expect(matchesKeybinding(evt('e', { meta: true, shift: true }), CYCLE)).toBe(true);
	});

	it('matches case-insensitively on the key', () => {
		expect(matchesKeybinding(evt('E', { meta: true, shift: true }), CYCLE)).toBe(true);
	});

	it('rejects when a required modifier is missing', () => {
		expect(matchesKeybinding(evt('e', { meta: true }), CYCLE)).toBe(false);
	});

	it('rejects when an extra modifier is held', () => {
		expect(matchesKeybinding(evt('e', { meta: true, shift: true, alt: true }), CYCLE)).toBe(false);
	});

	it('rejects when the key differs', () => {
		expect(matchesKeybinding(evt('r', { meta: true, shift: true }), CYCLE)).toBe(false);
	});

	it('rejects an empty key config', () => {
		expect(matchesKeybinding(evt('e', { meta: true, shift: true }), { ...CYCLE, key: '' })).toBe(false);
	});
});

describe('eventToKeybindingConfig', () => {
	it('captures key and modifiers, lowercasing the key', () => {
		expect(eventToKeybindingConfig(evt('E', { meta: true, shift: true }))).toEqual({
			key: 'e',
			meta: true,
			shift: true,
			alt: false,
			ctrl: false,
		});
	});

	it('returns null when only a modifier key is pressed', () => {
		expect(eventToKeybindingConfig(evt('Meta', { meta: true }))).toBeNull();
		expect(eventToKeybindingConfig(evt('Shift', { shift: true }))).toBeNull();
		expect(eventToKeybindingConfig(evt('Alt', { alt: true }))).toBeNull();
		expect(eventToKeybindingConfig(evt('Control', { ctrl: true }))).toBeNull();
	});
});

describe('keybindingsEqual', () => {
	it('is true for the same shortcut regardless of key case', () => {
		expect(keybindingsEqual(CYCLE, { ...CYCLE, key: 'E' })).toBe(true);
	});

	it('is false when any modifier differs', () => {
		expect(keybindingsEqual(CYCLE, { ...CYCLE, shift: false })).toBe(false);
	});

	it('is false when the key differs', () => {
		expect(keybindingsEqual(CYCLE, { ...CYCLE, key: 'r' })).toBe(false);
	});
});

describe('isAcceptableShortcut', () => {
	it('accepts a combo with a command modifier', () => {
		expect(isAcceptableShortcut(CYCLE)).toBe(true);
		expect(isAcceptableShortcut({ key: 'e', meta: false, shift: false, alt: false, ctrl: true })).toBe(true);
		expect(isAcceptableShortcut({ key: 'e', meta: false, shift: false, alt: true, ctrl: false })).toBe(true);
	});

	it('rejects a bare key or Shift-only combo', () => {
		expect(isAcceptableShortcut({ key: 'e', meta: false, shift: false, alt: false, ctrl: false })).toBe(false);
		expect(isAcceptableShortcut({ key: 'e', meta: false, shift: true, alt: false, ctrl: false })).toBe(false);
	});
});

describe('formatKeybinding', () => {
	it('orders modifier glyphs Ctrl, Alt, Shift, Cmd and uppercases letters', () => {
		expect(formatKeybinding(CYCLE)).toBe('⇧⌘E');
		expect(formatKeybinding({ key: 'k', meta: true, shift: false, alt: true, ctrl: true })).toBe('⌃⌥⌘K');
	});

	it('renders glyphs for special keys', () => {
		expect(formatKeybinding({ key: ' ', meta: true, shift: false, alt: false, ctrl: false })).toBe('⌘Space');
		expect(formatKeybinding({ key: 'ArrowUp', meta: true, shift: false, alt: false, ctrl: false })).toBe('⌘↑');
		expect(formatKeybinding({ key: 'Escape', meta: false, shift: false, alt: true, ctrl: false })).toBe('⌥Esc');
	});
});

describe('findKeybindingConflict', () => {
	it('returns the label of a colliding built-in shortcut', () => {
		// Cmd+S is Save File.
		expect(findKeybindingConflict({ key: 's', meta: true, shift: false, alt: false, ctrl: false })).toBe('Save File');
	});

	it('returns null when there is no collision', () => {
		// Default cycle-sidebar combo is not in the reserved list.
		expect(findKeybindingConflict(CYCLE)).toBeNull();
	});

	it('reserved list excludes the customizable cycle-sidebar shortcut', () => {
		expect(RESERVED_KEYBINDINGS.some((r) => keybindingsEqual(r.binding, CYCLE))).toBe(false);
	});
});
