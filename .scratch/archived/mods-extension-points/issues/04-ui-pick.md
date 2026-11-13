# 04: `ctx.ui.pick`

**What to build:** the plan's EP-04. A fuzzy list dialog in the existing dialog queue, added to contract v1.

```ts
pick: <T extends { id: string; title: string; description?: string }>(o: { title: string; placeholder?: string; items: T[] }) => Promise<T | null>;
```

Touch the contract's `ModUiV1`, `plugins/mods/mod-dialogs.store.svelte.ts` (`CANCELLED` needs `pick: null`), the host's `ui` block and `ModDialogHost.svelte` (a branch on `components/ui/command`). Filter all items and render at most 100. Reject duplicate ids. No mod code runs per keystroke.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`.

- [x] Failing tests first: 1000 items render at most 100 and the filter reaches item 900; Esc and unload give `null`; the mod's own object returns; duplicate ids reject.
- [x] `mod-api-contract.test.ts` freezes the new member. `help/documentation/28-mods.md` documents it.

## Comments

- 2026-11-07, `issue/04-ui-pick`: Added the stable-v1 fuzzy picker with bounded rendering, original-object return, duplicate-id rejection and cancellation on dismissal/unload. Review round 1: APPROVED with a minor browser coverage finding. A fix round added the picker browser happy path, verifying search, Enter acceptance and the selected object's custom content in the editor and virtual file. Review round 2: APPROVED, finding resolved and no new findings. Prior delivery checks: full Vitest suite passed, 576 files and 13921 tests passed, 0 failed, 54 skipped, 1 todo (exit 0; `/Users/diegorv/Dev/pet-projects/koko/brain.worktrees/test-logs/mods-extension-points/04-deliver.log`); targeted Chromium suite 13 passed, 0 failed (`/tmp/issue-04-deliver-e2e.log`); `pnpm check` 0 errors and 0 warnings (`/tmp/issue-04-deliver-check.log`); `git diff --check` passed. Ship-only delivery reused these results without rerunning tests. Native Tauri/WKWebView behavior was not verified.
