# Issue 22: Block decorator factory + registry

Status: ready-for-agent
Phase: P3 Track A steps 3-4
Source: ARCH 1.0 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track A — Live preview)
Blocked by: 20-lp-parser-deletions, 21-lp-widget-merges, 08-inline-decorator-toggles

## What

Eleven block ViewPlugin bodies each copy the same update discipline (and its dead viewport guard).
Give them one owning factory plus a registry, so the discipline exists in exactly one place. Ships as
**TWO commits**. User-visible: ~10 new decorator kill-switches appear in Troubleshooting — an
intentional feature change, reviewed as such.

## How

- **Commit A — factory collapse:** add `core/block-decorator.ts` and collapse the eleven block
  ViewPlugin bodies (files under `live-preview/plugins/`) onto it. Keep `settingsKey` and
  `profileLabel` as **separate fields** — they diverge, and settings keys are persisted user data.
  Callout opts in via `rebuildOn: [toggleCalloutFold]`; queryjs gets a **narrower gate** than the
  others.
- **Commit B — registry + settings-toggle unification:** export **names only**, so
  `TroubleshootingSection` pulls in no katex, no mermaid, no DOMPurify. `DECORATOR_NAMES` and
  `help/documentation/19-settings.md:245` grow from 12 to ~22 names. Amend
  `docs/adr/0008-codemirror-live-preview-architecture.md` §55 and §74 and CLAUDE.md perf rule 4
  **in-series** with this commit.
- The 10 newly exposed toggles are an intentional feature change, not an accident — say so in the
  commit message.
- **Testing:** exactly **ONE new EditorView-mounting test** exercising all four update gates once.
  Prior art: the seven existing jsdom EditorView-mounting suites in the live-preview area. Do not add
  a per-plugin suite.

## Gate

- Frontend surface per commit: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- E2E: re-run only the affected settings spec via `bash scripts/e2e.sh` after commit B (toggle
  unification changes the settings surface).
- Test collateral and the ADR/CLAUDE.md/help-doc edits land in the same commits as their code.
- Stage only the files related to each commit (`git add <specific files>`), verify with
  `git diff --cached --stat`.
- Two commits (A then B), each using the repo's full commit format (Context, Problem, Solution,
  Behavior, Files with line ranges).

## Comments

### 2026-08-18 - closing

Both commits landed in the mandated order, one commit each: commit A collapsed the eleven block
ViewPlugin bodies onto `core/block-decorator.ts`, commit B added the names-only registry
(`core/decorator-names.ts`), turned both extension tables into total `Record`s and unified the
Troubleshooting toggle list. `DECORATOR_NAMES` and `help/documentation/19-settings.md:245` went
from 12 to **exactly 22** names; the ~10 newly exposed kill-switches are the intentional feature
change the issue calls for.

| Step | Resolving SHA |
|------|---------------|
| ARCH 1.0 commit A - factory collapse | `bd6b1433` |
| ARCH 1.0 commit B - registry + settings-toggle unification | this commit |

**Gate + review:**

- **Commit A** (`bd6b1433`) - frontend gate green on `pnpm check` + `pnpm vitest run` +
  `pnpm build` (per-command counts were not recorded in that step's summary). Review: Fable 5
  sub-agent under the presumed-flawed stance, verdict could_not_refute, **0 fix rounds**.
- **Commit B** (this commit) - frontend gate re-run at commit time: `pnpm check` 191 files / 0
  errors / 0 warnings; `pnpm vitest run` 283 files / 6327 tests passing (1 todo); `pnpm build`
  succeeded. E2E per the Gate section: `bash scripts/e2e.sh specs/settings.spec.ts` - 3 passed.
  Review: Fable 5 sub-agent under the presumed-flawed stance, verdict could_not_refute, **0 fix
  rounds**.

**Evidence in brief:**

- **The 10 new switches are real, not cosmetic - and the test proves it per name.**
  `decorator-toggles.test.ts` runs `it.each` over `[...BLOCK_DECORATOR_NAMES,
  ...INLINE_PLUGIN_NAMES]` (16 names) and asserts that flipping each one shrinks the flattened
  extension array returned by `livePreviewExtensions()`. Against the pre-change
  `live-preview.ts`, 10 of those 16 cases fail by construction: `blockCommentField`,
  `collectionBlockField`, `metaBindButtonField`, `mermaidField`, `blockMathField`, `audioPlugin`,
  `videoPlugin`, `imagePlugin`, `footnotePlugin` and `wikilinkEmbedPlugin` were pushed
  unconditionally (old `:54,:57,:58,:65`), so disabling them changed nothing. That diff is the
  red-green record.
- **Nothing can be listed without an owner.** `BLOCK_EXTENSIONS`
  (`live-preview.ts:51-64`), `INLINE_PLUGIN_EXTENSIONS` (`:67-72`) and `TOGGLEABLE_HANDLERS`
  (`inline-extensions.ts:60`) are total `Record<...Name, ...>` over the three exported name
  lists, and `DECORATOR_NAMES` is built by concatenating those same three lists
  (`decorator-names.ts:63-67`). A name added without an extension fails `pnpm check`; a switch
  cannot render for something nothing installs. The suite also pins the count and uniqueness
  (`decorator-toggles.test.ts:33-36`).
- **Caller trace for the names-only constraint.** `grep -rn "DECORATOR_NAMES" src/` shows exactly
  three production readers: `TroubleshootingSection.svelte:9,111`, `live-preview.ts:24,91,97` and
  the registry itself. `decorator-names.ts` has **zero import statements** (the file is 79 lines
  of `as const` arrays plus their derived types), so the settings section reaches the switch
  vocabulary without touching `live-preview.ts`'s module graph - which is what keeps katex,
  mermaid and DOMPurify out of it. A comment at `TroubleshootingSection.svelte:6-8` records why
  the deep import is deliberate. (Chunk-graph note: this app is a single route, so both the
  editor and the settings panel land in the same page node - the guarantee here is the import
  graph, not a measured chunk split.)
- **Persisted-key semantics, per C01.** `settings.service.ts:143-146` spreads
  `DEFAULT_SETTINGS.disabledDecorators` under `parsed.disabledDecorators`, so a name that was
  hand-written into `settings.json` before its switch existed is preserved verbatim and now
  becomes honored on first read. Unknown keys stay inert (`isDisabled` is a lookup with a
  `?? false` default), which is why growing the list needs no migration.
- **`settingsKey` stopped being write-only.** Commit A introduced it unread (flagged as a minor
  finding then, deliberately, per the two-commit split); commit B types it as the closed
  `BlockDecoratorName` union (`block-decorator.ts:10,31`) and `BLOCK_EXTENSIONS` is what reads
  it, so the field is now load-bearing and typo-proof.
- **Docs landed with the code they describe**, per the Gate section: ADR-0008 §55 and §74,
  CLAUDE.md perf rule 4 (`:237`) and `help/documentation/19-settings.md:245` are all in this
  commit.

**Discrepancies vs the issue text:**

- The issue's Testing bullet ("exactly ONE new EditorView-mounting test") was satisfied by commit
  A's `block-decorator.test.ts`. Commit B adds a second new test file,
  `decorator-toggles.test.ts`, which mounts **no** `EditorView` - it only builds the extension
  array - and is one suite over all names rather than a per-plugin suite, so neither half of that
  constraint is violated.
- Handover bookkeeping only: the implementer's reported-files list for commit B named just
  `CLAUDE.md` and `docs/adr/0008-...md`; the working tree actually carried all eight modified
  files plus the two new ones. Everything present traced to this step, so the commit proceeded -
  but the report was incomplete, not the change.

**Minor findings for follow-up (none blocking):**

- minor - `docs/LIVE-PREVIEW.md:91-121`: the "Block ViewPlugin Template" still shows the
  hand-rolled `ViewPlugin.fromClass` pattern that **zero** block plugins now use, and it lacks
  both the viewport guard and `lastCursorLine`. It was already stale before this issue, and it
  was **not** rewritten here - the step scope named ADR §55/§74, CLAUDE.md rule 4 and the help
  doc only. Still open: rewrite the template as `blockDecorator({...})` and refresh line 27's
  "All plugins use this in `update()`" phrasing.
- minor - carry-forward from commit A, now **resolved by this commit**: `settingsKey` at
  `block-decorator.ts:31` was write-only between the two commits. `BLOCK_EXTENSIONS` reads it as
  of here, and the type is now the closed union - verified above.
