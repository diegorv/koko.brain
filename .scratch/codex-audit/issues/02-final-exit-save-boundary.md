# 02: Authorize exit only after the final accepted editor state is safe

**What to build:** Window close, intercepted Quit, update restart, and vault switching preserve accepted editor changes through the entire destructive transition.

**Blocked by:** None (can start immediately).
**Status:** ready-for-agent
**Priority:** P1
**Gate:** Frontend; exercise the existing native-exit entry points.

## Reproduction

Begin exit with B dirty, delay its write, type C, and finish B's write. Exit is authorized while C remains unsaved. An edit during a later write-barrier wait is also omitted.

## Acceptance criteria

- [ ] Add failing tests with real editor and exit services for typing during a write and during subsequent barrier/settings waits.
- [ ] At the destructive boundary, every accepted edit is persisted or explicitly discarded. Either exclude further editing during that boundary or revalidate all accepted changes; a fixed second save is insufficient.
- [ ] Include initially clean tabs edited during preparation and a clean-looking tab with an older save still pending after Undo.
- [ ] Preserve per-note ordering across multiple tabs and concurrent save requests.
- [ ] Failed writes or inability to establish a safe boundary retain the session or enter the existing explicit discard/cancel flow.
- [ ] Vault initialization's fallback save cannot ignore failures and then discard buffers.
- [ ] Verify window close, intercepted Quit, update restart, and vault switching; reopen the original files and assert their final content.
- [ ] Keep ordinary exit and cancellation behavior. Do not conflate this with adding new OS exit-event interception.

## Provenance

The vault-switch fallback may rescue an earlier edit; tests must exercise the final transition, not claim loss from the first save alone. [Evidence](../evidence.md#save-boundaries).
