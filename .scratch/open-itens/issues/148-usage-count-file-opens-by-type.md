# 148: Usage stats count which kinds of files I open and Quick Capture saves

**Origin:** `usage-telemetry` Issue 10, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/usage-telemetry/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** The four seams in Issue 07 count commands, shortcuts, rail items and Settings pages. Opening a kanban board, a canvas or a collection view goes through none of them. The owner uses kanban, canvas, tables, meta-bind and Quick Capture. Without this Issue, "Most used" is dominated by Cmd+S and Cmd+W, and those features look unused. Tables and meta-bind are Issue 12.

## 1. A core usage hook

Add `src/lib/core/usage-hook.ts`. It holds no state other than the reporter:

- `reportUsage(id: string)`: a no-op until a reporter is set.
- `setUsageReporter(fn: ((id: string) => void) | null)`: sets or clears the reporter.

Register the reporter from the app layer (`src/lib/app/`), pointing it at `recordUsage` from Issue 07. Clear it on teardown.

`core/` may not import `features/`, so this hook is how `core/` code reports usage. Issue 12 reuses it.

## 2. File opens by kind

`openFileInEditor` already classifies the file when it adds a tab (`src/lib/core/editor/editor.service.ts` about lines 136-140):

| File | Kind |
|---|---|
| view file | `collection` |
| `.canvas` | `canvas` |
| `.kanban` (`isKanbanFile`, `src/lib/core/filesystem/fs.logic.ts` about line 81; detected by extension, not frontmatter) | `kanban` |
| anything else | `md` |

- Call `reportUsage('open:<kind>')` once, right after the fresh `editorStore.addTab(...)` (about line 141).
- Do not instrument the 34 files that call `openFileInEditor`.
- Re-activating a tab that is already open (the cached and race branches, about lines 128-133) does not count.
- Check whether tabs restored at startup go through this path. If they do, they must not count. For example, register the reporter only after the vault finishes initializing.

## 3. Quick Capture saves

Captures arrive in the main window through `handleDetectedCapture` (`src/lib/plugins/quick-capture/quick-capture.service.ts` about line 91).

- Record `quick-capture:save` once per successful dispatch. `plugins/` may import `features/`, so call `recordUsage` directly.
- Do not record from the Rust hotkey handler (`src-tauri/src/lib.rs` about lines 42-54) or from the composer window (`capabilities/composer.json`).

**Blocked by:** 146

**Status:** ready-for-agent

**Gate:** Frontend: `pnpm check` + `pnpm vitest run`.

**Hook** (failing first, `usage-hook` test)
- [ ] `reportUsage` is a no-op without a reporter.
- [ ] After `setUsageReporter(fn)`, `fn` receives the id.
- [ ] `setUsageReporter(null)` stops reporting.

**File opens** (failing first)
- [ ] Opening a `.canvas` file records `open:canvas` once.
- [ ] Opening the same file again while its tab is open records nothing.
- [ ] A `.kanban` file records `open:kanban`, and a view file records `open:collection`.
- [ ] Tabs restored at startup record nothing.

**Quick Capture**
- [ ] A successful capture records `quick-capture:save` once.
- [ ] A rejected payload records nothing.

**Layer rules**
- [ ] `layer-rules.test.ts` stays green: `core/` gains no import of `features/` or `app/`.

## Notes

- Owner decision 2026-11-06 (survey): count file opens by kind, count Quick Capture saves, and track tables and meta-bind in a separate Issue (12).
- Issue 08's "never used" list should add `open:canvas`, `open:kanban`, `open:collection` and `quick-capture:save` to its registered ids once this lands. The agent on whichever of 08 or 10 lands second makes that change.
- Source: the 2026-11-06 review of Issue 07 (the coverage gap), the 2026-11-06 priority review (kanban detection, the 34 callers), and the memory note on which features the owner uses.
- Size: M.

## Comments
