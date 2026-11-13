/** Describes a keyboard shortcut with modifier keys and a handler callback. */
export interface KeyBinding {
	key?: string;
	code?: string;
	meta?: boolean;
	shift?: boolean;
	alt?: boolean;
	ctrl?: boolean;
	handler: () => void;
}

/** The key and modifiers of a binding, without its handler. */
export type KeyCombo = Omit<KeyBinding, 'handler'>;

/**
 * Writes a combo as a CodeMirror keymap key (`Mod-Shift-l`). `meta` becomes
 * `Mod`, which CodeMirror reads as Cmd on macOS and Ctrl elsewhere.
 */
export function toCodeMirrorKey(combo: KeyCombo & { key: string }): string {
	const parts: string[] = [];
	if (combo.meta) parts.push('Mod');
	if (combo.ctrl) parts.push('Ctrl');
	if (combo.alt) parts.push('Alt');
	if (combo.shift) parts.push('Shift');
	parts.push(combo.key);
	return parts.join('-');
}

const CODE_DISPLAY_MAP: Record<string, string> = {
	BracketLeft: '[',
	BracketRight: ']',
	Backquote: '`',
	Comma: ',',
};

/**
 * Writes a combo as the macOS hint shown next to a command or menu item
 * (`⌘⇧L`): modifiers in the order Ctrl, Cmd, Shift, Option, then the key.
 */
export function formatShortcut(combo: KeyCombo): string {
	const parts: string[] = [];
	if (combo.ctrl) parts.push('⌃');
	if (combo.meta) parts.push('⌘');
	if (combo.shift) parts.push('⇧');
	if (combo.alt) parts.push('⌥');

	if (combo.key) {
		parts.push(combo.key.toUpperCase());
	} else if (combo.code) {
		parts.push(CODE_DISPLAY_MAP[combo.code] ?? combo.code);
	}

	return parts.join('');
}

/** Registers a global keyboard shortcut. Returns an unsubscribe function. */
export function registerKeybinding(binding: KeyBinding): () => void {
	function onKeyDown(e: KeyboardEvent) {
		if (binding.meta && !e.metaKey) return;
		if (binding.shift && !e.shiftKey) return;
		if (binding.alt && !e.altKey) return;
		if (binding.ctrl && !e.ctrlKey) return;
		if (!binding.meta && e.metaKey) return;
		if (!binding.shift && e.shiftKey) return;
		if (!binding.alt && e.altKey) return;
		if (!binding.ctrl && e.ctrlKey) return;

		if (binding.key && e.key.toLowerCase() !== binding.key.toLowerCase()) return;
		if (binding.code && e.code !== binding.code) return;
		if (!binding.key && !binding.code) return;

		e.preventDefault();
		binding.handler();
	}

	document.addEventListener('keydown', onKeyDown);

	return () => {
		document.removeEventListener('keydown', onKeyDown);
	};
}
