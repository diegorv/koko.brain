// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { registerKeybinding } from '$lib/utils/keybindings';

function fireKeyDown(key: string, options: Partial<KeyboardEvent> & { code?: string } = {}) {
	const event = new KeyboardEvent('keydown', {
		key,
		code: options.code ?? '',
		metaKey: options.metaKey ?? false,
		shiftKey: options.shiftKey ?? false,
		altKey: options.altKey ?? false,
		ctrlKey: options.ctrlKey ?? false,
		bubbles: true,
		cancelable: true,
	});
	document.dispatchEvent(event);
	return event;
}

describe('registerKeybinding', () => {
	it('triggers handler on matching key', () => {
		const handler = vi.fn();
		const cleanup = registerKeybinding({ key: 'o', meta: true, handler });

		fireKeyDown('o', { metaKey: true });
		expect(handler).toHaveBeenCalledTimes(1);

		cleanup();
	});

	it('does not trigger on wrong key', () => {
		const handler = vi.fn();
		const cleanup = registerKeybinding({ key: 'o', meta: true, handler });

		fireKeyDown('p', { metaKey: true });
		expect(handler).not.toHaveBeenCalled();

		cleanup();
	});

	it('does not trigger without required meta key', () => {
		const handler = vi.fn();
		const cleanup = registerKeybinding({ key: 'o', meta: true, handler });

		fireKeyDown('o');
		expect(handler).not.toHaveBeenCalled();

		cleanup();
	});

	it('does not trigger when extra modifier is pressed', () => {
		const handler = vi.fn();
		const cleanup = registerKeybinding({ key: 'o', handler });

		fireKeyDown('o', { metaKey: true });
		expect(handler).not.toHaveBeenCalled();

		cleanup();
	});

	it('cleanup removes the listener', () => {
		const handler = vi.fn();
		const cleanup = registerKeybinding({ key: 'o', meta: true, handler });

		cleanup();

		fireKeyDown('o', { metaKey: true });
		expect(handler).not.toHaveBeenCalled();
	});

	it('is case insensitive for key matching', () => {
		const handler = vi.fn();
		const cleanup = registerKeybinding({ key: 'O', meta: true, handler });

		fireKeyDown('o', { metaKey: true });
		expect(handler).toHaveBeenCalledTimes(1);

		cleanup();
	});

	it('supports shift modifier', () => {
		const handler = vi.fn();
		const cleanup = registerKeybinding({ key: 'p', meta: true, shift: true, handler });

		fireKeyDown('p', { metaKey: true });
		expect(handler).not.toHaveBeenCalled();

		fireKeyDown('p', { metaKey: true, shiftKey: true });
		expect(handler).toHaveBeenCalledTimes(1);

		cleanup();
	});

	it('supports simple key without modifiers', () => {
		const handler = vi.fn();
		const cleanup = registerKeybinding({ key: 'Escape', handler });

		fireKeyDown('Escape');
		expect(handler).toHaveBeenCalledTimes(1);

		cleanup();
	});

	it('triggers handler on matching code', () => {
		const handler = vi.fn();
		const cleanup = registerKeybinding({ code: 'BracketLeft', meta: true, shift: true, handler });

		fireKeyDown('{', { code: 'BracketLeft', metaKey: true, shiftKey: true });
		expect(handler).toHaveBeenCalledTimes(1);

		cleanup();
	});

	it('does not trigger on wrong code', () => {
		const handler = vi.fn();
		const cleanup = registerKeybinding({ code: 'BracketLeft', meta: true, shift: true, handler });

		fireKeyDown('}', { code: 'BracketRight', metaKey: true, shiftKey: true });
		expect(handler).not.toHaveBeenCalled();

		cleanup();
	});

	it('does not trigger when neither key nor code is set', () => {
		const handler = vi.fn();
		const cleanup = registerKeybinding({ meta: true, handler });

		fireKeyDown('a', { metaKey: true });
		expect(handler).not.toHaveBeenCalled();

		cleanup();
	});

	it('supports both key and code together', () => {
		const handler = vi.fn();
		const cleanup = registerKeybinding({ key: 'w', code: 'KeyW', meta: true, handler });

		fireKeyDown('w', { code: 'KeyW', metaKey: true });
		expect(handler).toHaveBeenCalledTimes(1);

		// Wrong code, right key — should not trigger
		fireKeyDown('w', { code: 'KeyX', metaKey: true });
		expect(handler).toHaveBeenCalledTimes(1);

		cleanup();
	});

	it('does not trigger when ctrl is pressed but not expected', () => {
		const handler = vi.fn();
		const cleanup = registerKeybinding({ key: 'k', handler });

		fireKeyDown('k', { ctrlKey: true });
		expect(handler).not.toHaveBeenCalled();

		cleanup();
	});
});
