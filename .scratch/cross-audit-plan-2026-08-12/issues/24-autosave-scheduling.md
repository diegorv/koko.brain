# Issue 24: Explicit autosave schedule on external content sync

Status: ready-for-agent
Phase: P3 Track B step 1
Source: ARCH 2.1 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track B — Editor/save)
Blocked by: 13-editor-save-deletions

## What

`syncExternalContentToEditor` currently leaves the autosave schedule implicit, so a caller writing
frontmatter cannot say which debounce it wants. Add an explicit `schedule` parameter and an
external-edit annotation, so the 500 ms frontmatter path and the 2000 ms body path are chosen by the
caller instead of inferred.

## How

- Add a `schedule: 'frontmatter' | 'body' | 'none'` parameter to `syncExternalContentToEditor`.
- Add an **external-edit annotation** built to the **same shape as `isTabSwitching`** — reuse that
  existing pattern, do not invent a second annotation style.
- **Audit `restoreSnapshot`'s silent no-op when `editorView` is null**
  (`file-history.service.ts:82-105`). Note for scope: it takes **no position argument** and is
  therefore **not an arch 2.2 caller** — it does not become an `openNoteAt` call site.
- **The `markSaved` flip was ALREADY taken in issue 03** (`type-definitions.service.ts:149`,
  prescribed by both 2.0 and 2.1, landed once). **Do not repeat it here.**
- Requires the P2 editor deletions (#54 → #44 → #15) to have landed first, so this refactor rewrites
  the editor test files after the deletions have already shrunk them.
- **Testing seam:** real debounce + fake timers, discriminating the 500 ms frontmatter path from the
  2000 ms body path. Prior art: the editor-service reset-timers suite.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Test collateral lands in the same commit as the source change.
- Stage only the files related to this step (`git add <specific files>`), verify with
  `git diff --cached --stat`.
- One commit, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with
  line ranges).

## Comments
