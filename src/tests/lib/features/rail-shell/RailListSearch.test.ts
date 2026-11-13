// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { reactiveProps } from '../../../fixtures/reactive-props.svelte';
import RailListSearch from '#lib/features/rail-shell/RailListSearch.svelte';

describe('RailListSearch', () => {
	let target: HTMLElement;
	const mounted: Record<string, unknown>[] = [];
	let onChange: ReturnType<typeof vi.fn<(value: string) => void>>;
	let onClose: ReturnType<typeof vi.fn<() => void>>;

	function render(props: { value?: string; loading?: boolean } = {}) {
		const component = mount(RailListSearch, {
			target,
			props: {
				value: props.value ?? '',
				loading: props.loading ?? false,
				onChange,
				onClose,
			},
		});
		mounted.push(component);
		flushSync();
		return component;
	}

	const input = () => target.querySelector<HTMLInputElement>('input')!;
	const clearButton = () => target.querySelector<HTMLButtonElement>('[data-note-list-search-clear]');
	const spinner = () => target.querySelector('[data-note-list-search-loading]');

	function type(text: string) {
		input().value = text;
		input().dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	beforeEach(() => {
		vi.useFakeTimers();
		target = document.body.appendChild(document.createElement('div'));
		onChange = vi.fn();
		onClose = vi.fn();
	});

	afterEach(() => {
		for (const c of mounted.splice(0)) unmount(c);
		document.body.innerHTML = '';
		vi.useRealTimers();
	});

	it('renders the search row with the placeholder and focuses the input on mount', () => {
		render();
		expect(target.querySelector('[data-note-list-search]')).not.toBeNull();
		expect(input().placeholder).toBe('Search notes...');
		expect(document.activeElement).toBe(input());
	});

	it('shows the draft value passed in as the initial value', () => {
		render({ value: 'budget' });
		expect(input().value).toBe('budget');
	});

	it('does not call onChange before 180 ms and calls it once after', () => {
		render();
		type('a');
		vi.advanceTimersByTime(179);
		expect(onChange).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith('a');
	});

	it('fires once with the last value when typing continues within the debounce window', () => {
		render();
		type('b');
		vi.advanceTimersByTime(100);
		type('bu');
		vi.advanceTimersByTime(100);
		type('bud');
		vi.advanceTimersByTime(180);
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith('bud');
	});

	it('fires at once when the draft goes blank, without waiting for the debounce', () => {
		render({ value: 'x' });
		type('');
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith('');
	});

	it('cancels a pending debounced call when the draft goes blank', () => {
		render();
		type('a');
		type('');
		vi.advanceTimersByTime(500);
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith('');
	});

	it('shows the clear button only while the draft has text', () => {
		render();
		expect(clearButton()).toBeNull();
		type('notes');
		expect(clearButton()).not.toBeNull();
		type('');
		expect(clearButton()).toBeNull();
	});

	it('clear button empties the draft, fires onChange at once and keeps focus', () => {
		render({ value: 'notes' });
		input().focus();
		clearButton()!.click();
		flushSync();
		expect(input().value).toBe('');
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith('');
		expect(document.activeElement).toBe(input());
	});

	it('shows the spinner while debouncing and hides it once the call fires', () => {
		render();
		expect(spinner()).toBeNull();
		type('a');
		expect(spinner()).not.toBeNull();
		vi.advanceTimersByTime(180);
		flushSync();
		expect(spinner()).toBeNull();
	});

	it('shows the spinner while loading', () => {
		render({ loading: true });
		expect(spinner()).not.toBeNull();
	});

	it('does not show the spinner when neither debouncing nor loading', () => {
		render({ loading: false });
		expect(spinner()).toBeNull();
	});

	it('calls onClose on Escape', () => {
		render();
		input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onChange).not.toHaveBeenCalled();
	});

	it('does not call onClose on other keys', () => {
		render();
		input().dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
		expect(onClose).not.toHaveBeenCalled();
	});

	it('cancels the pending timer on unmount so no onChange fires afterwards', () => {
		const component = render();
		type('a');
		mounted.splice(mounted.indexOf(component), 1);
		unmount(component);
		vi.advanceTimersByTime(1000);
		expect(onChange).not.toHaveBeenCalled();
	});

	describe('when the value prop changes', () => {
		function renderReactive(value: string) {
			const props = reactiveProps({ value, loading: false, onChange, onClose });
			mounted.push(mount(RailListSearch, { target, props }));
			flushSync();
			return props;
		}

		it('takes an outside value and drops a pending call', () => {
			const props = renderReactive('old');
			type('old typed');
			props.value = 'other';
			flushSync();
			expect(input().value).toBe('other');
			vi.advanceTimersByTime(1000);
			expect(onChange).not.toHaveBeenCalled();
		});

		it('does not clobber newer typing when the parent echoes an emitted value', () => {
			const props = renderReactive('');
			type('abc');
			vi.advanceTimersByTime(180);
			expect(onChange).toHaveBeenCalledWith('abc');
			type('abcd');
			props.value = 'abc';
			flushSync();
			expect(input().value).toBe('abcd');
			vi.advanceTimersByTime(180);
			expect(onChange).toHaveBeenLastCalledWith('abcd');
		});
	});
});
