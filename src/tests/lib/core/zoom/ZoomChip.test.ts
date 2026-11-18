// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';

const mockSetZoom = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@tauri-apps/api/webviewWindow', () => ({
	getCurrentWebviewWindow: () => ({ setZoom: mockSetZoom }),
}));

import ZoomChip from '#lib/core/zoom/ZoomChip.svelte';
import { zoomIn, resetZoom } from '#lib/core/zoom/zoom.service.js';
import { zoomStore } from '#lib/core/zoom/zoom.store.svelte.js';

/** Lets the click handler's `resetZoom()` settle its awaited `setZoom`. */
async function settle(): Promise<void> {
	for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe('ZoomChip', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	function chip(): HTMLButtonElement | null {
		return target.querySelector<HTMLButtonElement>('button[aria-label]');
	}

	beforeEach(async () => {
		vi.useFakeTimers();
		await resetZoom();
		vi.clearAllTimers();
		vi.clearAllMocks();
		localStorage.clear();
		zoomStore._reset();
		target = document.body.appendChild(document.createElement('div'));
		component = mount(ZoomChip, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		vi.useRealTimers();
	});

	it('is absent before a change', () => {
		expect(chip()).toBeNull();
	});

	it('shows the level after one zoomIn', async () => {
		await zoomIn();
		flushSync();

		expect(chip()?.querySelector('[role="status"]')?.textContent).toBe('110%');
		expect(chip()?.querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
	});

	it('names the button "Reset zoom to 100%"', async () => {
		await zoomIn();
		flushSync();

		expect(chip()?.getAttribute('aria-label')).toBe('Reset zoom to 100%');
	});

	it('resets to 100% when clicked', async () => {
		await zoomIn();
		flushSync();
		vi.clearAllMocks();

		chip()?.click();
		await settle();
		flushSync();

		expect(mockSetZoom).toHaveBeenCalledWith(1);
		expect(chip()?.textContent).toContain('100%');
	});

	it('disappears when the hide timer fires', async () => {
		await zoomIn();
		flushSync();

		vi.advanceTimersByTime(1500);
		flushSync();

		expect(chip()).toBeNull();
	});
});
