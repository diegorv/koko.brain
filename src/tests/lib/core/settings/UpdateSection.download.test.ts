// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as Record<string, unknown>).__APP_CHANNEL__ = 'stable';
(globalThis as Record<string, unknown>).__BUILD_INFO__ = '9.9.9 (test)';
(globalThis as Record<string, unknown>).__CHANGELOG__ = { since: '9.9.8', commits: [] };

type DownloadMessage =
	| { event: 'Started'; data: { contentLength: number | null } }
	| { event: 'Progress'; data: { chunkLength: number } }
	| { event: 'Finished' };

/**
 * The download Channel the component hands to `download_and_install`, and
 * the check's outcome. The download promise never settles, so the
 * downloading state stays on screen.
 */
const updater = vi.hoisted(() => ({
	channel: null as { onmessage: ((msg: DownloadMessage) => void) | null } | null,
	checkError: null as Error | null,
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async (cmd: string, args?: { onEvent?: typeof updater.channel }) => {
		if (cmd === 'check_for_update_on_channel') {
			if (updater.checkError) throw updater.checkError;
			return { rid: 1, version: '9.9.10', currentVersion: '9.9.9' };
		}
		if (cmd === 'plugin:updater|download_and_install') {
			updater.channel = args?.onEvent ?? null;
			return new Promise(() => {});
		}
		return undefined;
	}),
	Channel: class {
		onmessage: ((msg: unknown) => void) | null = null;
	},
}));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())) }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(() => Promise.resolve()),
	exists: vi.fn(() => Promise.resolve(true)),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(), open: vi.fn() }));
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import UpdateSection from '#lib/core/settings/sections/UpdateSection.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

/** Lets queued promises and Svelte updates run. */
async function settle(): Promise<void> {
	for (let i = 0; i < 20; i++) {
		await Promise.resolve();
		await tick();
	}
	flushSync();
}

function buttonByText(root: HTMLElement, text: string): HTMLButtonElement {
	const btn = [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
	if (!btn) throw new Error(`button "${text}" not found in: ${root.textContent}`);
	return btn as HTMLButtonElement;
}

/** Sends download events through the Channel and lets the view update. */
function emit(...messages: DownloadMessage[]) {
	if (!updater.channel?.onmessage) throw new Error('download did not start');
	for (const msg of messages) updater.channel.onmessage(msg);
	flushSync();
}

describe('UpdateSection check and download', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		updater.channel = null;
		updater.checkError = null;
		settingsStore.reset();
		target = document.body.appendChild(document.createElement('div'));
		component = mount(UpdateSection, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	it('says the idle button also downloads, and checks the chosen channel without downgrades', async () => {
		buttonByText(target, 'Check and download').click();
		await settle();

		expect(invoke).toHaveBeenCalledWith('check_for_update_on_channel', {
			channel: 'stable',
			allowDowngrades: false,
		});
		expect(target.querySelector('[role="progressbar"]')).not.toBeNull();
	});

	it('shows a named progress bar at the downloaded share when the size is known', async () => {
		buttonByText(target, 'Check and download').click();
		await settle();
		emit({ event: 'Started', data: { contentLength: 1000 } }, { event: 'Progress', data: { chunkLength: 500 } });

		const bar = target.querySelector<HTMLElement>('[role="progressbar"]');
		expect(bar).not.toBeNull();
		expect(bar!.getAttribute('aria-label')).toBe('Download of update v9.9.10');
		expect(bar!.getAttribute('aria-valuenow')).toBe('50');
		expect(bar!.getAttribute('aria-valuemin')).toBe('0');
		expect(bar!.getAttribute('aria-valuemax')).toBe('100');
		expect(target.textContent).toContain('Downloading v9.9.10 (1 KB)... 50%');
		// The track is a 3:1 input edge; bg-muted was invisible on a Settings row
		expect(bar!.classList).toContain('ring-input');
		expect(bar!.classList).not.toContain('bg-muted');
	});

	it('shows no "?" and no value when the size is unknown', async () => {
		buttonByText(target, 'Check and download').click();
		await settle();
		emit({ event: 'Started', data: { contentLength: null } }, { event: 'Progress', data: { chunkLength: 500 } });

		const bar = target.querySelector<HTMLElement>('[role="progressbar"]');
		expect(bar).not.toBeNull();
		expect(bar!.getAttribute('aria-label')).toBe('Download of update v9.9.10');
		expect(bar!.hasAttribute('aria-valuenow')).toBe(false);
		const row = bar!.parentElement!;
		expect(row.textContent).toContain('Downloading v9.9.10...');
		expect(row.textContent).not.toContain('?');
	});

	it('shows a failed check as selectable text, and Retry checks again', async () => {
		updater.checkError = new Error('network down');
		buttonByText(target, 'Check and download').click();
		await settle();

		const message = [...target.querySelectorAll('span')].find((s) => s.textContent === 'network down');
		expect(message).toBeDefined();
		expect(message!.classList.contains('select-text')).toBe(true);

		updater.checkError = null;
		buttonByText(target, 'Retry').click();
		await settle();

		expect(invoke).toHaveBeenLastCalledWith('plugin:updater|download_and_install', expect.objectContaining({ rid: 1 }));
		expect(target.querySelector('[role="progressbar"]')).not.toBeNull();
	});

	it('lets the changelog summary be selected', () => {
		const summary = [...target.querySelectorAll('span')].find((s) => s.textContent?.trim().startsWith('Since 9.9.8.'));
		expect(summary).toBeDefined();
		expect(summary!.classList.contains('select-text')).toBe(true);
	});
});
