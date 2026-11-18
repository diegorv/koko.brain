// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, unmount, flushSync, type ComponentProps } from 'svelte';
import Star from '@lucide/svelte/icons/star';
import EmptyState from '#lib/components/EmptyState.svelte';

describe('EmptyState', () => {
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	function render(props: ComponentProps<typeof EmptyState> & Record<string, unknown>) {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(EmptyState, { target, props });
		flushSync();
		return target.firstElementChild as HTMLElement;
	}

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('renders the title, and no hint, action or icon unless given', () => {
		const root = render({ title: 'No favorites yet' });
		expect(root.querySelector('[data-empty-state-title]')?.textContent).toBe('No favorites yet');
		expect(root.querySelector('[data-empty-state-hint]')).toBeNull();
		expect(root.querySelector('button')).toBeNull();
		expect(root.querySelector('[data-empty-state-icon]')).toBeNull();
	});

	it('renders the hint, the icon and the action when given, and a click on the action calls it', () => {
		const onclick = vi.fn();
		const root = render({ title: 'No notes match "x"', hint: 'Search covers titles.', icon: Star, action: { label: 'Clear search', onclick } });
		expect(root.querySelector('[data-empty-state-hint]')?.textContent).toBe('Search covers titles.');
		expect(root.querySelector('[data-empty-state-icon] svg')).not.toBeNull();
		const button = root.querySelector<HTMLButtonElement>('[data-empty-state-action]')!;
		expect(button.textContent?.trim()).toBe('Clear search');
		expect(button.type).toBe('button');
		button.click();
		expect(onclick).toHaveBeenCalledTimes(1);
	});

	it('renders text, never markup, from the title', () => {
		const root = render({ title: 'No notes match "<b>x</b>"' });
		expect(root.querySelector('b')).toBeNull();
		expect(root.querySelector('[data-empty-state-title]')?.textContent).toBe('No notes match "<b>x</b>"');
	});

	it('compact is one p.text-meta with the title and no icon', () => {
		const root = render({ title: 'Searching note contents...', icon: Star, compact: true });
		expect(target.children).toHaveLength(1);
		expect(root.tagName).toBe('P');
		expect(root.classList).toContain('text-meta');
		expect(root.textContent?.trim()).toBe('Searching note contents...');
		expect(root.querySelector('svg')).toBeNull();
	});

	it('spinner renders an animate-spin element and the title, not the icon', () => {
		const root = render({ title: 'Loading notes', icon: Star, spinner: true });
		expect(root.querySelector('.animate-spin')).not.toBeNull();
		expect(root.querySelector('[data-empty-state-icon]')).toBeNull();
		expect(root.querySelector('[data-empty-state-title]')?.textContent).toBe('Loading notes');
	});

	it('passes data-* attributes and the class to the root', () => {
		const root = render({ title: 'Nothing archived', class: 'text-file-explorer-muted-fg', 'data-note-list-empty': '' });
		expect(root.hasAttribute('data-note-list-empty')).toBe(true);
		expect(root.classList).toContain('text-file-explorer-muted-fg');

		unmount(component!);
		document.body.innerHTML = '';
		const compact = render({ title: 'Searching', compact: true, class: 'px-3', 'data-note-list-searching': '' });
		expect(compact.hasAttribute('data-note-list-searching')).toBe(true);
		expect(compact.classList).toContain('px-3');
	});
});
