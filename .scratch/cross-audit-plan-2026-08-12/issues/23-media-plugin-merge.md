# Issue 23: Merge the audio/video media plugin remnants

Status: ready-for-agent
Phase: P3 Track A step 5
Source: PONY #8 (re-scoped) — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track A — Live preview)
Blocked by: 22-block-decorator-factory

## What

The audio and video live-preview plugins were near-duplicates. The block decorator factory (issue 22)
already deleted both duplicated plugin bodies, so this finding shrinks to about half its claimed
surface: only the parser, the widget, and the CSS remain to merge. No user-visible change.

## How

- **Re-scoped:** do NOT re-derive the plugin-body merge — arch 1.0 already deleted both bodies. The
  remaining merge is **parser + widget + CSS only**.
- **Keep the derived `cm-lp-${tag}` classes.** Audio and video are not interchangeable in CSS: one
  styles `width`, the other `maxWidth`. Collapsing to a single class would change rendering.
- **Preserve the four audio-only test cases** — they are not duplicates of the video cases.
- Delete by symbol, never by line range.
- Re-run `embed-widgets.spec.ts` after the merge; it is the spec that covers this surface.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- E2E: only the affected spec — `bash scripts/e2e.sh` for `embed-widgets.spec.ts`. Never run
  `PLAYWRIGHT=true pnpm dev` manually.
- Test collateral (including the preserved audio-only cases) lands in the same commit as the source
  change.
- Stage only the files related to this step (`git add <specific files>`), verify with
  `git diff --cached --stat`.
- One commit, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with
  line ranges).

## Comments
