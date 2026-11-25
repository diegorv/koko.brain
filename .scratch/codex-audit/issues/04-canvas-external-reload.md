# 04: Preserve unpublished Canvas edits during external reload

**What to build:** Treat pending Canvas edits as local modifications before deciding whether external file content can replace the view.

**Blocked by:** None (can start immediately).
**Status:** ready-for-agent
**Priority:** P1
**Gate:** Frontend, including mounted Canvas integration.

## Acceptance criteria

- [ ] A local text edit inside the publication delay survives external reload, including when the external change affects another node.
- [ ] Cover an edit arriving while the external read is pending.
- [ ] A genuinely clean Canvas still reloads normally; existing self-save and stale-read guards remain.
- [ ] Apply the existing local-edits-win policy, retaining the observed external version through File History when enabled and keeping truthful existing notification behavior.
- [ ] Read or history failures never replace the local draft; preserve existing error handling.
- [ ] Later timers, saves, destruction, undo, and redo cannot resurrect the discarded reload over the local edit.
- [ ] Assert real nodes, editor state, saved JSON, and observed history bytes with boundary-only mocks.

## Provenance

Independent from exit interception and final-save ordering. [Evidence](../evidence.md#buffered-views).
