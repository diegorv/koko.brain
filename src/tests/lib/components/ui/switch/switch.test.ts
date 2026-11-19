// @vitest-environment jsdom
// The shadcn Switch in its off state: the track is the only shape of the
// control, so it must stand out from the Settings row it sits on.
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { Switch } from '#lib/components/ui/switch/index.js';
import { BUILTIN_THEMES } from '#lib/core/settings/theme.logic.js';
import { contrastRatio, isDarkColor } from '#lib/utils/color.js';
import { HARD_PALETTE_THEMES } from '../../../../fixtures/hard-palette-themes.fixture';

describe('Switch off state', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target?.remove();
	});

	function renderSwitch(checked: boolean): HTMLElement {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(Switch, { target, props: { checked } });
		flushSync();
		return target.querySelector<HTMLElement>('[data-slot="switch"]')!;
	}

	it('paints the off track only with the switch-unchecked-bg token', () => {
		const root = renderSwitch(false);
		expect(root.getAttribute('data-state')).toBe('unchecked');
		const offFills = [...root.classList].filter((c) => c.startsWith('data-[state=unchecked]:bg-'));
		expect(offFills).toEqual(['data-[state=unchecked]:bg-switch-unchecked-bg']);
	});

	it('paints the on track with primary', () => {
		const root = renderSwitch(true);
		expect(root.getAttribute('data-state')).toBe('checked');
		expect(root.classList).toContain('data-[state=checked]:bg-primary');
	});

	it('draws the off track at 3:1 on the Settings row, and the thumb at 3:1 on the track, on every theme', () => {
		const failures: string[] = [];
		for (const { name, colors } of [...BUILTIN_THEMES, ...HARD_PALETTE_THEMES]) {
			const { switchUncheckedBg: track, settingItemBg, background, foreground } = colors.ui;
			// Thumb: `bg-background`, `dark:data-[state=unchecked]:bg-foreground`
			const thumb = isDarkColor(colors.ui.editorBg) ? foreground : background;
			const onRow = contrastRatio(track, settingItemBg)!;
			const thumbOnTrack = contrastRatio(thumb, track)!;
			if (onRow < 3 - 0.005) failures.push(`${name} track on row ${onRow.toFixed(2)}`);
			if (thumbOnTrack < 3 - 0.005) failures.push(`${name} thumb on track ${thumbOnTrack.toFixed(2)}`);
		}
		expect(failures).toEqual([]);
	});
});
