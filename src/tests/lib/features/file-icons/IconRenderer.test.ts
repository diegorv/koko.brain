// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import IconRenderer from '#lib/features/file-icons/IconRenderer.svelte';
import type { NormalizedIcon } from '#lib/features/file-icons/file-icons.types.js';

const SVG_ICON: NormalizedIcon = { name: 'rocket', pack: 'lucide', svgContent: '<path d="M0 0"/>', viewBox: '0 0 24 24', keywords: [] };
const EMOJI_ICON: NormalizedIcon = { name: '🚀', pack: 'emoji', svgContent: '', viewBox: '', keywords: [] };

describe('IconRenderer color', () => {
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	function render(icon: NormalizedIcon, color?: string): Element {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(IconRenderer, { target, props: { icon, color } });
		flushSync();
		return target.firstElementChild!;
	}

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it.each([['an svg', SVG_ICON], ['an emoji', EMOJI_ICON]])('adds no declaration from a color with a semicolon, on %s', (_name, icon) => {
		const el = render(icon, 'red; background-image: url(https://example.com/x)') as HTMLElement;
		expect(el.style.backgroundImage).toBe('');
		expect(el.getAttribute('style')).toBeNull();
	});

	it('renders a palette name with the theme token', () => {
		const svg = render(SVG_ICON, 'green');
		expect(svg.tagName.toLowerCase()).toBe('svg');
		expect((svg as SVGElement).style.color).toBe('var(--type-green)');
	});

	it('renders a palette name on an emoji with the theme token', () => {
		const span = render(EMOJI_ICON, 'pink');
		expect(span.textContent).toBe('🚀');
		expect((span as HTMLElement).style.color).toBe('var(--type-pink)');
	});

	it('renders a hex color as it is', () => {
		// jsdom normalizes the hex to rgb(); the value itself is unchanged
		expect((render(SVG_ICON, '#ff8800') as SVGElement).style.color).toBe('rgb(255, 136, 0)');
	});

	it('leaves the icon uncolored without a color', () => {
		expect(render(SVG_ICON).hasAttribute('style')).toBe(false);
		unmount(component!);
		component = null;
		document.body.innerHTML = '';
		expect(render(SVG_ICON, '').hasAttribute('style')).toBe(false);
	});
});
