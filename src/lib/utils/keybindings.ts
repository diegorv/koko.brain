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
