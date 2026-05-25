import type { BacklinkEntry } from './backlinks.types';
import type { RelationshipBacklinkV2 } from '$lib/types/vault-v2.types';

let linkedMentions = $state<BacklinkEntry[]>([]);
let unlinkedMentions = $state<BacklinkEntry[]>([]);
let relationshipBacklinks = $state<RelationshipBacklinkV2[]>([]);
/** When true, unlinked mentions are stale and need recomputation */
let unlinkedDirty = $state(false);

export const backlinksStore = {
	get linkedMentions() { return linkedMentions; },
	get unlinkedMentions() { return unlinkedMentions; },
	get relationshipBacklinks() { return relationshipBacklinks; },
	get unlinkedDirty() { return unlinkedDirty; },

	setLinkedMentions(entries: BacklinkEntry[]) { linkedMentions = entries; },
	setUnlinkedMentions(entries: BacklinkEntry[]) {
		unlinkedMentions = entries;
		unlinkedDirty = false;
	},
	setRelationshipBacklinks(entries: RelationshipBacklinkV2[]) { relationshipBacklinks = entries; },
	/** Marks unlinked mentions as stale without recomputing them */
	markUnlinkedDirty() { unlinkedDirty = true; },

	reset() {
		linkedMentions = [];
		unlinkedMentions = [];
		relationshipBacklinks = [];
		unlinkedDirty = false;
	},
};
