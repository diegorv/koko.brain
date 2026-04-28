// Phase 6 of the perf refactor migrated outgoing-link extraction +
// unlinked-mention discovery to Rust (`get_outgoing_links_v2`,
// `get_outgoing_unlinked_mentions_v2`). The TS implementations
// (`getOutgoingLinks`, `deduplicateOutgoingLinks`,
// `findOutgoingUnlinkedMentions`) were deleted — their consumers now
// invoke the Rust commands via `fetchOutgoingLinksV2`.
//
// This file is intentionally kept (instead of deleted) so any feature
// that adds future pure helpers about outgoing-link logic has a stable
// home. If nothing lands here within a few iterations, delete it and
// remove the test stub.

export {};
