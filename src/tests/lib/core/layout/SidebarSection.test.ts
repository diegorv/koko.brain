// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import SidebarSection from '#lib/core/layout/SidebarSection.svelte';

/**
 * The right sidebar's section wrapper. jsdom computes no Tailwind, so the
 * shared recipe is held by the classes and slots every header carries.
 */
describe('SidebarSection', () => {
	let target: HTMLDivElement;
	let component: ReturnType<typeof mount> | null = null;

	const body = createRawSnippet(() => ({ render: () => '<p data-testid="section-body">content</p>' }));

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
	});

	function mountSection(props: { title: string; open?: boolean; onOpenChange?: (open: boolean) => void }): void {
		component = mount(SidebarSection, { target, props: { ...props, children: body } });
		flushSync();
	}

	const header = () => target.querySelector<HTMLElement>('[data-sidebar-section-header]')!;
	const chevronSlot = () => header().querySelector<HTMLElement>('[data-sidebar-section-chevron]')!;
	const title = () => header().querySelector<HTMLElement>('h2')!;
	/**
	 * The collapsible content stays in the DOM when closed: its `data-state`
	 * flips at once, while `hidden` waits for the exit transition.
	 */
	const bodyShown = () => {
		const el = target.querySelector('[data-testid="section-body"]');
		return el !== null && el.closest('[hidden], [data-state="closed"]') === null;
	};

	/** The header recipe every section shares, collapsible or not. */
	function expectSharedHeader(): void {
		expect(target.querySelectorAll('[data-sidebar-section]')).toHaveLength(1);
		expect(header().classList).toContain('pane-toolbar');
		expect(header().firstElementChild).toBe(chevronSlot());
		expect(chevronSlot().classList).toContain('size-3.5');
		expect(chevronSlot().classList).toContain('shrink-0');
		expect(title().classList).toContain('text-title');
		expect(title().classList).toContain('text-right-sidebar-primary');
	}

	it('draws a static section with the shared header, an empty chevron slot and its body', () => {
		mountSection({ title: 'Properties' });

		expectSharedHeader();
		expect(header().tagName).toBe('DIV');
		expect(title().textContent?.trim()).toBe('Properties');
		expect(chevronSlot().querySelector('svg')).toBeNull();
		expect(bodyShown()).toBe(true);
	});

	it('draws a collapsible section with the same header as a button with the chevron in the slot', () => {
		mountSection({ title: 'Backlinks', open: false });

		expectSharedHeader();
		expect(header().tagName).toBe('BUTTON');
		expect(header().getAttribute('aria-expanded')).toBe('false');
		expect(title().textContent?.trim()).toBe('Backlinks');
		expect(chevronSlot().querySelector('svg')).not.toBeNull();
		expect(bodyShown()).toBe(false);
	});

	it('opens and closes from the header and reports each change', () => {
		const onOpenChange = vi.fn();
		mountSection({ title: 'Backlinks', open: false, onOpenChange });

		header().click();
		flushSync();
		expect(onOpenChange).toHaveBeenLastCalledWith(true);
		expect(header().getAttribute('aria-expanded')).toBe('true');
		expect(bodyShown()).toBe(true);

		header().click();
		flushSync();
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
		expect(bodyShown()).toBe(false);
	});

	it('toggles without an onOpenChange callback', () => {
		mountSection({ title: 'Outgoing links', open: true });
		expect(bodyShown()).toBe(true);

		header().click();
		flushSync();
		expect(bodyShown()).toBe(false);
	});

	it('draws the divider under the header and under an open body, never above the section', () => {
		mountSection({ title: 'Table of contents', open: true });

		const section = target.querySelector<HTMLElement>('[data-sidebar-section]')!;
		const sectionBody = target.querySelector<HTMLElement>('[data-sidebar-section-body]')!;
		expect(section.className).not.toMatch(/(^|\s)border-t(\s|$)/);
		expect(sectionBody.classList).toContain('border-b');
		expect(sectionBody.classList).toContain('border-divider');
		expect(sectionBody.classList).toContain('p-2');
	});

	it('renders an empty title without breaking the header', () => {
		mountSection({ title: '' });

		expectSharedHeader();
		expect(title().textContent).toBe('');
	});
});
