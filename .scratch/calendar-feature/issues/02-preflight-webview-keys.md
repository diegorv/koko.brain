# 02: WebView keyboard behaviour verified in pnpm tauri dev

**What to build:** Notes > Pre-flight log records, from a person pressing keys in `pnpm tauri dev` on macOS, whether the WebView delivers the calendar's global toggle (Cmd+Shift+C, with the Cmd+Shift+Y fallback tried in the same session) to a `document` keydown listener, and whether, with a non-editable element focused, Cmd+Z and Shift+Cmd+Z reach a root keydown listener and `preventDefault` there suppresses the native Edit menu undo/redo (`src-tauri/src/lib.rs:197-199`, `.undo().redo()`). The answers settle ticket 31's toggle combo and whether ticket 31 adds the "Calendar: Undo" / "Calendar: Redo" palette commands. The listener is added from the WebView devtools console, so no source file changes.

**Plan reference:** Task 1 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 30-54). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done. It covers only Task 1 (e) bullets 2-3 (lines 42-43), split out because they need a person in the Tauri WebView; ticket 01 covers the rest of the checks.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

**Touches:**
- `.scratch/calendar-feature/plan-2026-10-28.md` (modify; Notes > Pre-flight log, lines 1333-1334)
- `.scratch/calendar-feature/issues/31-*.md` (modify, only on a "no")

**Gate:** none (no source change)

- [ ] The app ran in `pnpm tauri dev` on macOS and the keydown listener was added from the WebView devtools console; no source file changed
- [ ] The log records whether Cmd+Shift+C reaches a `document` keydown listener
- [ ] The log records whether Cmd+Shift+Y reaches the same listener, checked in the same session so a "no" on Cmd+Shift+C needs no second human round
- [ ] The log records whether, with a non-editable element focused, Cmd+Z and Shift+Cmd+Z reach a root `keydown` listener
- [ ] The log records whether `preventDefault` in that listener suppresses the native Edit menu undo/redo items (`src-tauri/src/lib.rs:197-199`)
- [ ] If Cmd+Shift+C does not reach the listener, ticket 31 is switched to Cmd+Shift+Y (lines 721, 1255)
- [ ] If the native Edit menu swallows Cmd+Z / Shift+Cmd+Z, ticket 31 is switched to add the palette commands "Calendar: Undo" / "Calendar: Redo" (count +2) instead (lines 720, 1255)
- [ ] Gate green (no source change; `git diff --cached --stat` lists only the plan file and, on a "no", ticket 31); one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)
