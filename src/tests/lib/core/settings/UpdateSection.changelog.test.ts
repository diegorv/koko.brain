// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';

const globals = globalThis as Record<string, unknown>;
globals.__APP_CHANNEL__ = 'nightly';
globals.__BUILD_INFO__ = '9.9.9-beta.1.nightly.3.abc1234 (test)';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), Channel: class {} }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())) }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn(), writeTextFile: vi.fn(), exists: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(), open: vi.fn() }));
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: vi.fn() }));

import { mount, unmount, flushSync } from 'svelte';
import { openUrl } from '@tauri-apps/plugin-opener';
import UpdateSection from '#lib/core/settings/sections/UpdateSection.svelte';

describe('UpdateSection changelog', () => {
	let component: Record<string, unknown> | null = null;

	function render(changelog: unknown): HTMLElement {
		globals.__CHANGELOG__ = changelog;
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(UpdateSection, { target });
		flushSync();
		return target;
	}

	afterEach(() => {
		vi.clearAllMocks();
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('lists the commits in this build since the last release tag', () => {
		const root = render({
			since: '9.9.9-beta.1',
			commits: [
				{ sha: 'aaa1111', subject: 'feat: views section groups' },
				{ sha: 'bbb2222', subject: 'fix(layout): lower the side panes minimum width' },
			],
		});

		expect(root.textContent).toContain('Changes in this build');
		expect(root.textContent).toContain('Since 9.9.9-beta.1');
		const items = [...root.querySelectorAll('[data-testid="changelog-entry"]')].map((li) => li.textContent?.trim());
		expect(items).toEqual([
			'feat: views section groups',
			'fix(layout): lower the side panes minimum width',
		]);
	});

	it('opens the commit on GitHub when its title is clicked', () => {
		const root = render({ since: '9.9.9-beta.1', commits: [{ sha: 'aaa1111', subject: 'feat: views section groups' }] });

		root.querySelector<HTMLButtonElement>('[data-testid="changelog-entry"] button')!.click();

		expect(openUrl).toHaveBeenCalledWith('https://github.com/diegorv/koko.brain/commit/aaa1111');
	});

	it('says so when no app commit landed since the tag', () => {
		const root = render({ since: '9.9.9-beta.1', commits: [] });

		expect(root.textContent).toContain('No app changes since 9.9.9-beta.1');
		expect(root.querySelectorAll('[data-testid="changelog-entry"]')).toHaveLength(0);
	});

	it('hides the changelog when the build had no git history', () => {
		const root = render(null);

		expect(root.textContent).not.toContain('Changes in this build');
	});
});
