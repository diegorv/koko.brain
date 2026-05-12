import { beforeEach, describe, expect, it } from 'vitest';
import { ragStore } from '$lib/features/rag/rag.store.svelte';
import type { RetrievedChunk } from '$lib/features/rag/rag.types';

function chunk(path: string): RetrievedChunk {
	return {
		path,
		headingPath: ['intro'],
		text: 'hello world',
		score: 0.9,
		lineStart: 1,
		lineEnd: 2,
	};
}

describe('ragStore', () => {
	beforeEach(() => {
		ragStore.reset();
	});

	it('starts with empty defaults', () => {
		expect(ragStore.response).toBe('');
		expect(ragStore.sources).toEqual([]);
		expect(ragStore.streaming).toBe(false);
		expect(ragStore.error).toBeNull();
	});

	it('startNewChat resets fields and marks streaming', () => {
		ragStore.appendToken('stale');
		ragStore.setSources([chunk('old.md')]);
		ragStore.fail('previous error');
		ragStore.startNewChat();

		expect(ragStore.response).toBe('');
		expect(ragStore.sources).toEqual([]);
		expect(ragStore.error).toBeNull();
		expect(ragStore.streaming).toBe(true);
	});

	it('appendToken accumulates response text', () => {
		ragStore.startNewChat();
		ragStore.appendToken('Hello');
		ragStore.appendToken(', ');
		ragStore.appendToken('world');

		expect(ragStore.response).toBe('Hello, world');
	});

	it('setSources replaces the sources list', () => {
		ragStore.setSources([chunk('a.md'), chunk('b.md')]);
		expect(ragStore.sources).toHaveLength(2);

		ragStore.setSources([chunk('c.md')]);
		expect(ragStore.sources).toHaveLength(1);
		expect(ragStore.sources[0].path).toBe('c.md');
	});

	it('finish clears the streaming flag without touching the response', () => {
		ragStore.startNewChat();
		ragStore.appendToken('answer');
		ragStore.finish();

		expect(ragStore.streaming).toBe(false);
		expect(ragStore.response).toBe('answer');
	});

	it('fail sets error and clears streaming', () => {
		ragStore.startNewChat();
		ragStore.fail('oops');

		expect(ragStore.error).toBe('oops');
		expect(ragStore.streaming).toBe(false);
	});

	it('reset wipes every field', () => {
		ragStore.startNewChat();
		ragStore.appendToken('partial');
		ragStore.setSources([chunk('a.md')]);
		ragStore.fail('boom');
		ragStore.reset();

		expect(ragStore.response).toBe('');
		expect(ragStore.sources).toEqual([]);
		expect(ragStore.streaming).toBe(false);
		expect(ragStore.error).toBeNull();
	});
});
