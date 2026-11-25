# 13: Preserve newer composer drafts when earlier saves finish

**What to build:** A capture completion consumes only its own inherited unsaved text, once, and cannot truncate a replacement composition or alter a newer save's UI.

**Blocked by:** None (can start immediately).
**Status:** ready-for-agent
**Priority:** P1
**Gate:** Frontend with the mounted production composer and editor.

## Reproduction

Save `buy `, dismiss/reopen during the Saved flash, and type `buy milk`. The earlier callback changes the new draft and storage to `milk` and clears Undo history.

## Acceptance criteria

- [ ] Preserve new text, storage, Undo, and the newer save's status when an older completion occurs before, during, or after the newer save.
- [ ] Discard separates a replacement composition from outstanding saves, even when texts share a prefix or are identical.
- [ ] Preserve intentional late-success cleanup for an unchanged inherited draft and appended remainder, consuming the submitted portion at most once.
- [ ] A remainder beginning with the same words is not consumed again.
- [ ] Typing during Saved cannot repersist already-written content and resubmit it on reopen.
- [ ] Failure or unconfirmed status retains the newer complete draft; successful cleanup/dismissal belongs to its own request/show.
- [ ] Exercise both submit/result completion orders, rejection, timeout, and ignored superseded results.
- [ ] Keep ADR-0028's single-pending-request and inherited-draft semantics; ignoring all old successes is not a valid fix.
- [ ] Assert rendered text/status, stored draft, Undo, and delivered capture bodies. Transactional capture delivery and submit-timeout redesign are outside scope.

## Provenance

A distinct regression follow-up to delivered composer preservation work. [Evidence](../evidence.md#composer).
