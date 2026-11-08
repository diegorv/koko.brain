# 229: Say plainly that the Todoist token lives in the vault

**Origin:** `tasks-view` Issue 25, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/tasks-view/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** PRD decision L1 is answered (a): the Todoist API token stays in the vault's `.kokobrain/settings.json` (`src/lib/core/settings/settings.types.ts:243-245`), because the owner does not sync vaults. Nothing moves. What is wrong today is that the docs and the UI say otherwise or say nothing:

- `docs/adr/0019-kokobrain-in-vault-data-dir.md:61` says keys must not be written to the vault and points at a bundle-ID macOS Keychain service (ADR-0013) that no longer exists. Add an amendment section dated 2026-11-06, in the style of ADR-0003's 2026-11-01 amendment: the Todoist token is stored in `.kokobrain/settings.json`, this is an accepted exception (PRD L1), and anyone who syncs a vault must exclude `.kokobrain/` (the line above, `:58`, already says so for the model). Do not rewrite the original Consequences text.
- The `apiToken` JSDoc (`settings.types.ts:244`) says where it comes from but not where it is stored. Add: "Stored in plain text in the vault's `.kokobrain/settings.json`; see ADR-0019's 2026-11-06 amendment."
- `TodoistSection.svelte` (`:20-21`): the token field's `description` keeps the Todoist path and adds "Stored in this vault's .kokobrain folder. Exclude .kokobrain from sync tools."
- `help/documentation/10-tasks-and-todoist.md` setup steps (`:121-125`): one sentence with the same fact.

**Blocked by:** none

**Status:** ready-for-agent

**Answered:** PRD L1 (a): keep the token in the vault and document it (owner, 2026-11-06).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `src/tests/lib/core/settings/TodoistSection.test.ts` with the real settings store: the token field shows the storage sentence. Fails today.
- [ ] The help doc and ADR changes are prose only; `src/tests/help/` still passes.

## Notes

- **Size:** XS.
- The old (b1) design, a Rust command pair under the app config dir, is in git history (commit 8dac7a537) if the owner ever starts syncing vaults.
