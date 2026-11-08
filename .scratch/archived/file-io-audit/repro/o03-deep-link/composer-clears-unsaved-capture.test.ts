// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/** Event handlers registered through `listen`, by event name. */
const handlers = vi.hoisted(() => new Map<string, (event: { payload: unknown }) => void>());

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async (cmd: string) => {
		// The main window is gone / the emit failed: Rust returns an error.
		if (cmd === 'submit_composer_capture') throw new Error('emit failed');
		return undefined;
	}),
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(async (name: string, handler: (event: { payload: unknown }) => void) => {
		handlers.set(name, handler);
		return () => handlers.delete(name);
	}),
}));

import { mount, unmount, flushSync, tick } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import Composer from '../../../routes/composer/+page.svelte';

describe('repro o03: composer drops the text when the capture is not delivered', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(async () => {
		handlers.clear();
		target = document.body.appendChild(document.createElement('div'));
		component = mount(Composer, { target });
		flushSync();
		await vi.waitFor(() => expect(handlers.has('qc:open-composer')).toBe(true));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('keeps the typed text after a failed submit and the next show', async () => {
		const textarea = target.querySelector('textarea')!;
		textarea.value = 'An idea I will not remember tomorrow';
		textarea.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true }));
		await vi.waitFor(() => expect(vi.mocked(invoke)).toHaveBeenCalledWith('dismiss_composer'));

		// The user summons the composer again to retry.
		handlers.get('qc:open-composer')!({ payload: undefined });
		await tick();
		flushSync();

		expect(target.querySelector('textarea')!.value).toBe('An idea I will not remember tomorrow');
	});
});
