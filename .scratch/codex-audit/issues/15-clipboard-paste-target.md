# 15: Cancel a pending menu paste when its editor target changes

**What to build:** Context-menu Paste never inserts into another note or a changed selection after asynchronous clipboard reading.

**Blocked by:** None (can start immediately).
**Status:** ready-for-agent
**Priority:** P1
**Gate:** Frontend with real tab switching and CodeMirror state.

## Acceptance criteria

- [ ] Start menu Paste in A with a delayed clipboard read, switch to B, complete the read: both notes remain unchanged.
- [ ] Closing the originating note, replacing its editor state, or changing its document/selection cancels the stale operation rather than redirecting it.
- [ ] Keep cancellation consistent with the existing stale-target Cut protection; retaining an old target for background editing is outside scope.
- [ ] Ordinary menu Paste remains plain text, replaces all selected ranges, and is undoable.
- [ ] Clipboard rejection retains existing error feedback.
- [ ] Test the actual handler with real tabs/stores and a real editor, mocking only the clipboard boundary.
- [ ] Assert both buffers, selection behavior, and subsequent save payloads.

## Provenance

New follow-up to delivered clipboard menu work, which guarded Cut but not the pending Paste destination. It is not the parked TSV-conversion issue. [Evidence](../evidence.md#clipboard).
