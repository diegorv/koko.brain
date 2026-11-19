// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import BuildInfo from '#lib/core/settings/BuildInfo.svelte';

const globals = globalThis as Record<string, unknown>;
globals.__BUILD_INFO__ = '9.9.9 (abc1234) (test)';

describe('BuildInfo chip', () => {
	let component: Record<string, unknown> | null = null;

	/** Mounts the widget for a build and returns its chip element. */
	function renderChip(opts: { dev: boolean; channel: 'stable' | 'nightly' | 'preview' }): HTMLElement {
		vi.stubEnv('DEV', opts.dev);
		globals.__APP_CHANNEL__ = opts.channel;
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(BuildInfo, { target });
		flushSync();
		return target.querySelector<HTMLElement>('span > span')!;
	}

	function cleanup() {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	}

	afterEach(() => {
		cleanup();
		vi.unstubAllEnvs();
	});

	it('labels a release build by its channel', () => {
		expect(renderChip({ dev: false, channel: 'stable' }).textContent).toBe('STABLE');
		cleanup();
		expect(renderChip({ dev: false, channel: 'nightly' }).textContent).toBe('NIGHTLY');
		cleanup();
		expect(renderChip({ dev: false, channel: 'preview' }).textContent).toBe('PREVIEW');
	});

	it('labels a dev server run as DEV whatever the channel define says', () => {
		expect(renderChip({ dev: true, channel: 'stable' }).textContent).toBe('DEV');
		cleanup();
		expect(renderChip({ dev: true, channel: 'nightly' }).textContent).toBe('DEV');
	});

	it('gives each kind of build its own color', () => {
		const stable = renderChip({ dev: false, channel: 'stable' }).className;
		cleanup();
		const nightly = renderChip({ dev: false, channel: 'nightly' }).className;
		cleanup();
		const preview = renderChip({ dev: false, channel: 'preview' }).className;
		cleanup();
		const dev = renderChip({ dev: true, channel: 'stable' }).className;

		expect(new Set([stable, nightly, preview, dev]).size).toBe(4);
		for (const className of [stable, nightly, preview, dev]) {
			expect(className).toMatch(/\bbg-\S+/);
		}
	});

	it.each([
		['stable', false, 'bg-success/20', 'text-success-tint-fg', 'text-success'],
		['nightly', false, 'bg-warning/20', 'text-warning-tint-fg', 'text-warning'],
		['preview', false, 'bg-type-purple/20', 'text-type-purple-tint-fg', 'text-type-purple'],
		['dev', true, 'bg-primary/20', 'text-primary-tint-fg', 'text-primary'],
	] as const)('draws the %s chip label in its text-on-tint color on its tint', (channel, dev, bg, text, raw) => {
		const chip = renderChip({ dev, channel: channel === 'dev' ? 'stable' : channel });

		expect(chip.classList).toContain(bg);
		expect(chip.classList).toContain(text);
		expect(chip.classList).not.toContain(raw);
	});

	it('does not style the stable chip as muted', () => {
		const chip = renderChip({ dev: false, channel: 'stable' });

		expect(chip.className).not.toContain('bg-muted');
	});

	it('still shows the build string next to the chip', () => {
		const chip = renderChip({ dev: true, channel: 'stable' });

		expect(chip.parentElement?.textContent).toContain('9.9.9 (abc1234) (test)');
	});

	it('lets the version be selected, against the body-wide user-select: none', () => {
		const chip = renderChip({ dev: false, channel: 'stable' });

		expect(chip.parentElement?.classList.contains('select-text')).toBe(true);
	});
});
