import type { OutgoingLink, OutgoingUnlinkedMention } from './outgoing-links.types';

let outgoingLinks = $state<OutgoingLink[]>([]);
let unlinkedMentions = $state<OutgoingUnlinkedMention[]>([]);

export const outgoingLinksStore = {
	get outgoingLinks() { return outgoingLinks; },
	get unlinkedMentions() { return unlinkedMentions; },

	setOutgoingLinks(links: OutgoingLink[]) { outgoingLinks = links; },
	setUnlinkedMentions(mentions: OutgoingUnlinkedMention[]) { unlinkedMentions = mentions; },

	reset() {
		outgoingLinks = [];
		unlinkedMentions = [];
	},
};
