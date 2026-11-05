// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const globals = globalThis as Record<string, unknown>;
globals.__APP_CHANNEL__ = 'nightly';
globals.__BUILD_INFO__ = '9.9.9-beta.1.nightly.3.abc1234 (test)';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async () => null), Channel: class {} }));
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
import UpdateSection from '#lib/core/settings/sections/UpdateSection.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

const CHANGELOG = { since: '9.9.9-beta.1', commits: [{ sha: 'aaa1111', subject: 'feat: a change' }] };

/** Lets queued promises and Svelte updates run. */
async function settle(): Promise<void> {
	for (let i = 0; i < 20; i++) {
		await Promise.resolve();
		await tick();
	}
	flushSync();
}

describe('UpdateSection layout', () => {
	let component: Record<string, unknown> | null = null;

	function render(changelog: unknown = CHANGELOG): HTMLElement {
		globals.__CHANGELOG__ = changelog;
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(UpdateSection, { target });
		flushSync();
		return target;
	}

	function groupLabels(root: HTMLElement): (string | undefined)[] {
		return [...root.querySelectorAll('h3')].map((h) => h.textContent?.trim());
	}

	function checkButton(root: HTMLElement): HTMLButtonElement {
		const btn = [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Check');
		if (!btn) throw new Error(`Check button not found in: ${root.textContent}`);
		return btn;
	}

	/** Text position of a label in the rendered section; fails when it is absent. */
	function positionOf(root: HTMLElement, text: string): number {
		const position = root.textContent?.indexOf(text) ?? -1;
		expect(position, `"${text}" not found`).toBeGreaterThanOrEqual(0);
		return position;
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
	});

	it('groups the rows under Version, Preferences and Changes in this build', () => {
		const root = render();

		expect(groupLabels(root)).toEqual(['Version', 'Preferences', 'Changes in this build']);
	});

	it('leads with the version and the check, and ends with the changelog', () => {
		const root = render();

		const order = [
			'Current version',
			'Check for updates',
			'Release channel',
			'Auto-check on launch',
			'Changes in this build',
			'feat: a change',
		].map((text) => positionOf(root, text));

		expect(order).toEqual([...order].sort((a, b) => a - b));
	});

	it('drops the changelog group when the build had no git history', () => {
		const root = render(null);

		expect(groupLabels(root)).toEqual(['Version', 'Preferences']);
	});

	it('shows the channel and the last check in the Check for updates row', () => {
		settingsStore.updateUpdates({ channel: 'nightly' });
		const root = render();

		expect(root.textContent).toContain('Nightly channel. Last checked: never.');
	});

	it('updates the last check after a check runs', async () => {
		settingsStore.updateUpdates({ channel: 'nightly' });
		const root = render();

		checkButton(root).click();
		await settle();

		expect(root.textContent).toContain('Nightly channel. Last checked: just now.');
		expect(settingsStore.updates.lastCheckedAt).not.toBeNull();
	});

	it('has no standalone Last checked row', () => {
		const root = render();

		expect(root.textContent).not.toContain('When the app most recently asked GitHub');
	});

	it('leaves the version format and manual reinstall text to the docs', () => {
		const root = render();

		expect(root.textContent).not.toContain('Nightly versions use the format');
		expect(root.textContent).not.toContain('Reinstall the stable DMG');
	});

	it('describes auto-check without implementation detail', () => {
		const root = render();

		expect(root.textContent).toContain('Silently check for an update when the app opens.');
		expect(root.textContent).not.toContain('no throttle');
	});

	it('shows Install Stable right below the channel on a nightly build that follows stable', () => {
		settingsStore.updateUpdates({ channel: 'stable' });
		const root = render();

		const installStable = positionOf(root, 'Install Stable (downgrade)');
		expect(installStable).toBeGreaterThan(positionOf(root, 'Release channel'));
		expect(installStable).toBeLessThan(positionOf(root, 'Auto-check on launch'));
	});

	it('hides Install Stable when a nightly build follows nightly', () => {
		settingsStore.updateUpdates({ channel: 'nightly' });
		const root = render();

		expect(root.textContent).not.toContain('Install Stable');
	});
});
