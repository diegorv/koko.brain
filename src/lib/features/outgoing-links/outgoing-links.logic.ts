import { parseWikilinks, getNoteName, buildResolutionCache, resolveWikilinkCached, stripNonBodyContent, findPlainTextMentionPositions } from '$lib/features/backlinks/backlinks.logic';
import type { WikilinkResolutionCache } from '$lib/features/backlinks/backlinks.logic';
import type { WikiLink } from '$lib/features/backlinks/backlinks.types';
import type { OutgoingLink, OutgoingUnlinkedMention } from './outgoing-links.types';

export function getOutgoingLinks(content: string, allFilePaths: string[], prebuiltCache?: WikilinkResolutionCache): OutgoingLink[] {
	const wikilinks = parseWikilinks(content);
	const cache = prebuiltCache ?? buildResolutionCache(allFilePaths);

	return wikilinks.map((link) => ({
		target: link.target,
		alias: link.alias,
		heading: link.heading,
		resolvedPath: resolveWikilinkCached(link.target, cache),
		position: link.position,
	}));
}

export function deduplicateOutgoingLinks(links: OutgoingLink[]): OutgoingLink[] {
	const seen = new Set<string>();
	return links.filter((link) => {
		const key = link.target.toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

export function findOutgoingUnlinkedMentions(
	currentPath: string,
	content: string,
	allFilePaths: string[],
	noteIndex: Map<string, WikiLink[]>,
): OutgoingUnlinkedMention[] {
	if (!content) return [];

	const currentLinks = (noteIndex.get(currentPath) ?? []).map((l) => l.target.toLowerCase());
	const stripped = stripNonBodyContent(content);
	const strippedLower = stripped.toLowerCase();
	const mentions: OutgoingUnlinkedMention[] = [];

	for (const filePath of allFilePaths) {
		if (filePath === currentPath) continue;

		const noteName = getNoteName(filePath);
		if (!noteName) continue;

		const noteNameLower = noteName.toLowerCase();

		if (currentLinks.some(t => t === noteNameLower || getNoteName(t).toLowerCase() === noteNameLower)) continue;

		const count = findPlainTextMentionPositions(content, strippedLower, noteName).length;

		if (count > 0) {
			mentions.push({ noteName, notePath: filePath, count });
		}
	}

	return mentions.sort((a, b) => a.noteName.localeCompare(b.noteName));
}
