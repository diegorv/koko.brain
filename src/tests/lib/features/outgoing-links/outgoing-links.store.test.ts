import { describe, it, expect, beforeEach } from 'vitest';
import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';

describe('outgoingLinksStore', () => {
	beforeEach(() => {
		outgoingLinksStore.reset();
	});

	it('starts with empty state', () => {
		expect(outgoingLinksStore.outgoingLinks).toEqual([]);
		expect(outgoingLinksStore.unlinkedMentions).toEqual([]);
	});

	it('setOutgoingLinks updates links', () => {
		const links = [{ target: 'a', exists: true }] as any;
		outgoingLinksStore.setOutgoingLinks(links);
		expect(outgoingLinksStore.outgoingLinks).toBe(links);
	});

	it('setUnlinkedMentions updates mentions', () => {
		const mentions = [{ name: 'a' }] as any;
		outgoingLinksStore.setUnlinkedMentions(mentions);
		expect(outgoingLinksStore.unlinkedMentions).toBe(mentions);
	});

	it('reset clears all state', () => {
		outgoingLinksStore.setOutgoingLinks([{}] as any);
		outgoingLinksStore.setUnlinkedMentions([{}] as any);

		outgoingLinksStore.reset();

		expect(outgoingLinksStore.outgoingLinks).toEqual([]);
		expect(outgoingLinksStore.unlinkedMentions).toEqual([]);
	});
});
