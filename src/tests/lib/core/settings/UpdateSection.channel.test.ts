// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const globals = globalThis as Record<string, unknown>;
const PREVIEW_BUILD_INFO = '9.9.10-preview.3.abc1234 (test)';
globals.__BUILD_INFO__ = PREVIEW_BUILD_INFO;
globals.__CHANGELOG__ = null;

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async () => null), Channel: class {} }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())) }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(() => Promise.resolve()),
	exists: vi.fn(() => Promise.resolve(true)),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(async () => true), open: vi.fn() }));
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';
import UpdateSection from '#lib/core/settings/sections/UpdateSection.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import type { ReleaseChannel } from '#lib/core/settings/settings.types.js';

globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;
// jsdom lacks the pointer-capture and scroll APIs the Select calls when it opens.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

/** Lets queued promises and Svelte updates run. */
async function settle(): Promise<void> {
	for (let i = 0; i < 20; i++) {
		await Promise.resolve();
		await tick();
	}
	flushSync();
}

describe('UpdateSection release channels', () => {
	let component: Record<string, unknown> | null = null;

	/** Renders the section for a build of `build` whose updater follows `chosen`. */
	function render(build: ReleaseChannel, chosen: ReleaseChannel): HTMLElement {
		globals.__APP_CHANNEL__ = build;
		settingsStore.updateUpdates({ channel: chosen });
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(UpdateSection, { target });
		flushSync();
		return target;
	}

	function downgradeButton(root: HTMLElement): HTMLButtonElement | undefined {
		return [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('(downgrade)'));
	}

	/** Clicks the downgrade button and returns the confirm dialog's message and options. */
	async function confirmDowngrade(root: HTMLElement): Promise<{ message: string; options: Record<string, unknown> }> {
		const button = downgradeButton(root);
		if (!button) throw new Error(`no downgrade button in: ${root.textContent}`);
		button.click();
		await settle();
		const [message, options] = vi.mocked(ask).mock.calls[0] as unknown as [string, Record<string, unknown>];
		return { message, options };
	}

	beforeEach(() => {
		settingsStore.reset();
	});

	afterEach(() => {
		vi.clearAllMocks();
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
		delete globals.__APP_CHANNEL__;
		globals.__BUILD_INFO__ = PREVIEW_BUILD_INFO;
	});

	it('lists Preview after Nightly in the channel picker', async () => {
		const root = render('stable', 'stable');
		const trigger = root.querySelector<HTMLElement>('[data-slot="select-trigger"]')!;
		trigger.focus();
		trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		flushSync();

		const labels = await vi.waitFor(() => {
			const found = [...document.querySelectorAll<HTMLElement>('[role="option"]')].map((o) => o.textContent?.trim());
			if (found.length === 0) throw new Error('select did not open');
			return found;
		});

		expect(labels).toEqual(['Stable', 'Nightly', 'Preview']);
	});

	it('describes the Preview channel when it is chosen', () => {
		const root = render('preview', 'preview');

		expect(root.textContent).toContain('Built from main plus features under test. May be unstable.');
		expect(root.textContent).toContain('Preview channel. Last checked: never.');
	});

	it('offers Install Nightly on a preview build set to Nightly', async () => {
		const root = render('preview', 'nightly');

		expect(downgradeButton(root)?.textContent?.trim()).toBe('Install Nightly (downgrade)');
		const { message, options } = await confirmDowngrade(root);

		expect(options.title).toBe('Install Nightly (downgrade)');
		expect(options.okLabel).toBe('Install Nightly');
		expect(message).toContain('replace your Preview build (9.9.10-preview.3.abc1234 (test)) with the latest Nightly build');
		expect(message).toContain('settings that only Preview builds know');
		expect(invoke).toHaveBeenCalledWith('check_for_update_on_channel', { channel: 'nightly', allowDowngrades: true });
		expect(root.textContent).toContain("You're up to date");
	});

	it('offers Install Stable on a preview build set to Stable', async () => {
		const root = render('preview', 'stable');

		expect(downgradeButton(root)?.textContent?.trim()).toBe('Install Stable (downgrade)');
		const { message, options } = await confirmDowngrade(root);

		expect(options.title).toBe('Install Stable (downgrade)');
		expect(options.okLabel).toBe('Install Stable');
		expect(message).toContain('replace your Preview build (9.9.10-preview.3.abc1234 (test)) with the latest Stable release');
		expect(message).toContain('since the last Stable tag');
		expect(invoke).toHaveBeenCalledWith('check_for_update_on_channel', { channel: 'stable', allowDowngrades: true });
	});

	it('keeps the nightly to stable texts', async () => {
		globals.__BUILD_INFO__ = '9.9.10-nightly.3.abc1234 (test)';
		const root = render('nightly', 'stable');

		expect(downgradeButton(root)?.textContent?.trim()).toBe('Install Stable (downgrade)');
		expect(root.textContent).toContain(
			"You're on a Nightly build but the updater is set to Stable. Auto-update normally won't downgrade, so click below to install the latest Stable in-app. You'll lose any changes that landed on main since the last Stable tag.",
		);
		const { message, options } = await confirmDowngrade(root);

		expect(message).toBe(
			'This will replace your Nightly build (9.9.10-nightly.3.abc1234 (test)) with the latest Stable release. You will lose any changes that landed on main since the last Stable tag, until the next Stable release ships. Your vault and settings are unaffected.\n\nContinue?',
		);
		expect(options).toEqual({
			title: 'Install Stable (downgrade)',
			kind: 'warning',
			okLabel: 'Install Stable',
			cancelLabel: 'Cancel',
		});
		expect(invoke).toHaveBeenCalledWith('check_for_update_on_channel', { channel: 'stable', allowDowngrades: true });
	});

	it.each<[ReleaseChannel, string]>([
		['nightly', 'https://github.com/diegorv/koko.brain/releases/tag/nightly'],
		['stable', 'https://github.com/diegorv/koko.brain/releases/latest'],
	])('opens the %s Releases page from a preview build', (chosen, url) => {
		const root = render('preview', chosen);
		const button = [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Releases page');
		if (!button) throw new Error(`no Releases page button in: ${root.textContent}`);

		button.click();

		expect(openUrl).toHaveBeenCalledWith(url);
	});

	it('does not install when the downgrade is cancelled', async () => {
		vi.mocked(ask).mockResolvedValueOnce(false);
		const root = render('preview', 'nightly');

		await confirmDowngrade(root);

		expect(invoke).not.toHaveBeenCalledWith('check_for_update_on_channel', expect.anything());
	});

	it.each<[ReleaseChannel, ReleaseChannel]>([
		['stable', 'stable'],
		['stable', 'nightly'],
		['stable', 'preview'],
		['nightly', 'nightly'],
		['nightly', 'preview'],
		['preview', 'preview'],
	])('shows no downgrade on a %s build set to %s', (build, chosen) => {
		const root = render(build, chosen);

		expect(downgradeButton(root)).toBeUndefined();
		expect(root.textContent).not.toContain('(downgrade)');
	});
});
