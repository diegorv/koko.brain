# Hotspots and rewrite triggers

Some modules keep collecting fixes. This page lists the ones we watch, the number that prompts a
review, and what "rewrite behind an interface" means for each. The numbers only prompt a read: the
owner reads the fix subjects and decides. Nothing here is a CI gate.

## The report

```bash
node scripts/fix-feat-ratio.mjs --since 2026-09-01            # month-by-area fix:feat table
node scripts/fix-feat-ratio.mjs --top 10                      # only the 10 areas with most fixes
node scripts/fix-feat-ratio.mjs --paths '<glob>'              # fix: subjects touching <glob>, last 8 weeks
```

The script only reads `git log` and prints to stdout. Run it on a full clone: CI checks out shallow.

## Why a human reads the subjects

Raw fix counts overstate hotspots:

- **In-run review fixes.** A relay run commits its review fixes on the Issue branch, then rebases and
  fast-forwards, so they land on main as ordinary `fix:` commits. Run markers come in two formats, so
  the script cannot filter them out. 61 of event-calendar's first 64 fixes were review fixes made on
  2026-10-28, before the merge.
- **Unrelated commits.** A fix that touches a file for another reason still counts. 2430a64f (a file
  tree toast) touches the calendar and type-definitions files below, and a live-preview file
  outside both live-preview globs.

So count only the fixes whose subject and diff are about the module's own behavior.

## Triggers

Each threshold counts fixes in the last 8 weeks, from `--paths` with the glob given.

| Module | Glob | Prompt | Action if confirmed |
|---|---|---|---|
| Calendar write queue and overlay | `src/lib/features/event-calendar/event-calendar.service.ts` | 3+ fixes, or any fix that must change (not add) an invariant of `src/tests/lib/features/event-calendar/event-calendar.model.test.ts` (Issue 14) | Split into an `EventWriteCoordinator` behind `{enqueue, drain, overlayFor, onPathChange}`, with the Issue 14 model test as its contract test |
| Live-preview core | `src/lib/core/markdown-editor/extensions/live-preview/core/**` | 4+ fixes | Rebuild behind one decoration coordinator |
| Live-preview widgets, each file on its own | `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts`, `src/lib/core/markdown-editor/extensions/live-preview/widgets/*.ts` (one `--paths` run per file) | 4+ fixes in one file | Rebuild behind one decoration coordinator, with the Issue 16 invariants harness (`src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts`) as its contract test |
| Type definitions | `src/lib/features/type-definitions/type-definitions.service.ts` | 3+ fixes | Split into create / rename / favorite / view-file writers |

"Rewrite behind an interface" means: put the new interface in front of the module first, move the
callers onto it, then replace the implementation behind it while the contract test stays green. It is
not a rewrite of the callers.

The widgets row leaves out, on purpose, the widgets that live outside those files:
`live-preview/plugins/callout-field.ts` and the block widgets `plugins/queryjs/queryjs-block-widget.ts`
and `features/collection/collection-block-widget.ts`. The trigger watches the shared widget files the
decoration coordinator would replace; the others belong to their own field or plugin.

## Review dates

- **First review: 2026-12-27**, 8 weeks after Issues 14 and 16 merged (both on 2026-11-01). Fixes
  before that date were made without the contract tests, so the window starts then.
- After each review, set the next date 8 weeks out here.
