import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import type { WikilinkResolutionCache } from '$lib/features/backlinks/backlinks.logic';
import { outgoingLinksStore } from './outgoing-links.store.svelte';
import { getOutgoingLinks, deduplicateOutgoingLinks, findOutgoingUnlinkedMentions } from './outgoing-links.logic';
import { perfStart, perfEnd } from '$lib/utils/debug';

export function updateOutgoingLinksForFile(
	filePath: string,
	sharedFilePaths?: string[],
	sharedCache?: WikilinkResolutionCache,
) {
	const t0 = perfStart();
	const noteContents = noteIndexStore.noteContents;
	const noteIndex = noteIndexStore.noteIndex;
	const content = noteContents.get(filePath) ?? '';
	const allFilePaths = sharedFilePaths ?? Array.from(noteContents.keys());

	const t1 = perfStart();
	const links = getOutgoingLinks(content, allFilePaths, sharedCache);
	perfEnd('OUTGOING', 'getOutgoingLinks', t1);
	const deduplicated = deduplicateOutgoingLinks(links);
	outgoingLinksStore.setOutgoingLinks(deduplicated);

	const t2 = perfStart();
	const unlinked = findOutgoingUnlinkedMentions(filePath, content, allFilePaths, noteIndex);
	perfEnd('OUTGOING', 'findOutgoingUnlinkedMentions', t2);
	outgoingLinksStore.setUnlinkedMentions(unlinked);
	perfEnd('OUTGOING', 'updateOutgoingLinksForFile', t0);
}

export function resetOutgoingLinks() {
	outgoingLinksStore.reset();
}
