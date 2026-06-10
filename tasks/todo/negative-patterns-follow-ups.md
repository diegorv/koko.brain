# Negative-patterns follow-ups (panels refetch tests + deep-link toast)

Two items the negative-patterns remediation (PR #133) left incomplete against
its own spec (tasks/done/negative-patterns-remediation.md):

- Task 4 promised "component/store tests asserting a version bump triggers a
  refetch" for BacklinksPanel and OutgoingLinksPanel; the effects shipped but
  the tests never did.
- Task 5c prescribed "surface failures (log + inline/toast)" for the three
  `refreshTree()` background calls in deep-link.service.ts; only the log
  shipped, so a captured note that fails to appear in the tree is still
  visually silent.

## Tasks

- [x] Task 1: component tests for the `vaultIndexVersion` refetch effect in
      BacklinksPanel and OutgoingLinksPanel — Svelte 5 `mount` + `flushSync`
      in jsdom, real editorStore/vaultStore/feature stores, fetch services
      mocked (side-effect services), localStorage fixture for vaultStore.
      Assert: no fetch while collapsed (even on version bump), fetch on
      expand, refetch on version bump while expanded.
- [ ] Task 2: deep-link tree-refresh failures show a toast — extract the
      repeated `refreshTree().catch(...)` one-liner into a helper that logs
      AND calls `toast.error`, keeping the write itself non-blocking. TDD:
      failing test first (toast.error asserted on refreshTree rejection).

## Notes

- These are the first Svelte component tests in the repo; the pattern is
  `mount(Component, { target })` + `flushSync()` with the real stores, per
  CLAUDE.md rule 1 (never mock stores).
- The toast message says the note was written but the tree failed to refresh,
  because that is the actual state: the write succeeded, only the background
  refresh failed.
