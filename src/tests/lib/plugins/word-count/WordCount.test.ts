// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import WordCount from '#lib/plugins/word-count/WordCount.svelte';

describe('WordCount', () => {
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	beforeEach(() => {
		vi.useFakeTimers();
		editorStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target.remove();
		editorStore.reset();
		vi.useRealTimers();
	});

	/** Opens `path` with `content`, mounts the counter and lets its 500 ms debounce run. */
	function render(path: string, content: string): string {
		editorStore.addTab({ path, name: path.split('/').pop() ?? path, content, savedContent: content });
		component = mount(WordCount, { target });
		flushSync();
		vi.advanceTimersByTime(500);
		flushSync();
		return target.textContent ?? '';
	}

	it('shows 0 words and no reading time for an empty note', () => {
		const text = render('/vault/empty.md', '');

		expect(text).toContain('0 words');
		expect(text).toContain('0 characters');
		expect(text).not.toContain('min read');
	});

	it('reads one word in the singular with a 1 minute estimate', () => {
		const text = render('/vault/one.md', 'hello');

		expect(text).toContain('1 word');
		expect(text).not.toContain('1 words');
		expect(text).toContain('5 characters');
		expect(text).toContain('1 min read');
	});

	it('reads one character in the singular', () => {
		const text = render('/vault/char.md', 'a');

		expect(text).toContain('1 character');
		expect(text).not.toContain('1 characters');
	});

	it('estimates 2 minutes for a 250-word note', () => {
		const text = render('/vault/long.md', Array.from({ length: 250 }, () => 'word').join(' '));

		expect(text).toContain('250 words');
		expect(text).toContain('2 min read');
	});

	it('renders nothing for a non-markdown tab', () => {
		const text = render('/vault/board.canvas', 'hello');

		expect(text.trim()).toBe('');
	});
});
