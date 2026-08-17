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
