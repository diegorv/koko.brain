---
status: open
priority: high
tags: [bug, frontend, editor]
foundAt: 2026-03-08
---

# Bug — double save on rename

After renaming a file from the file explorer, the editor fires two save
events: one for the old path (which 404s) and one for the new path. The
second one succeeds, but the failed first call leaves a console error.

## Reproduction

1. Open any `.md` file in a tab.
2. Rename it from the file tree.
3. Watch the console — you should see one failed save before the
   successful one.

## Suspected cause

The tab's `path` field is updated synchronously, but the in-flight
debounced save still holds a snapshot of the old path. Should debounce
on `(path, content)` rather than just `content`.

**This note matches the "Tag-as-bug → Bug Tracker" rule** (`status` is
`open`, not `closed`) and will be moved to `Inbox/Bugs/` the next time
auto-move evaluates. Once `status` flips to `closed`, the rule no longer
matches and the file stays where it is.
