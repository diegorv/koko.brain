# 10: Usage stats count which kinds of files I open (owner decision needed)

**What to build:** The four seams in Issue 07 count commands, shortcuts, rail items and Settings pages. Opening a kanban board, a canvas or a collection view goes through none of them. The owner uses kanban, canvas, tables, meta-bind and Quick Capture. Without this Issue, "Most used" will be dominated by Cmd+S and Cmd+W, and those features will look unused.

**What this can and cannot measure:**
- **It can count file opens by kind.** `openFileInEditor` already classifies the file when it adds a tab (`src/lib/core/editor/editor.service.ts` about lines 136-140). The kinds are:
  - `collection` (view files);
  - `canvas`;
  - `kanban`, which is detected by the `.kanban` extension (`isKanbanFile`, `src/lib/core/filesystem/fs.logic.ts` about line 81), not by frontmatter;
  - plain markdown.
- **It cannot see tables or meta-bind.** They live inside `.md` notes, so counting opens by kind never reveals them. Counting them would need hooks inside the live-preview widgets. That is out of scope here; decide separately whether it is worth it.
- **Quick Capture** captures arrive in the main window through `handleDetectedCapture` (`src/lib/plugins/quick-capture/quick-capture.service.ts` about line 91). `plugins/` may import `features/`, so `recordUsage('quick-capture:save')` can go there. The hotkey itself is handled in Rust (`src-tauri/src/lib.rs` about lines 42-54), and the composer window has a narrow capability set (`capabilities/composer.json`). Do not record from either of those.

**Seam:** 34 files call `openFileInEditor`, so do not instrument the callers. The classification happens in `core/`, which must not import `features/`. Instead:
- add a listener hook in `editor.service.ts`, for example `setFileOpenedListener((kind) => void)`, called once right after the fresh `editorStore.addTab(...)` (about line 141);
- register it from the app layer (`src/lib/app/`) to call `recordUsage('open:<kind>')`.

Re-activating a tab that is already open (the cached and race branches, about lines 128-133) does not count. Check whether tabs restored at startup go through this path. If they do, they must not count, for example by registering the listener only after the vault finishes initializing.

**Owner decision:**
1. Count file opens by kind (yes or no)?
2. Count Quick Capture saves?
3. Accept that tables and meta-bind stay invisible, or open a separate Issue for widget-level counts?

**Blocked by:** 07

**Status:** needs-info

**Gate:** Frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Owner decision recorded in Notes.
- [ ] Failing first: opening a `.canvas` file records `open:canvas` once; opening the same file again while its tab is open records nothing.
- [ ] Opening a `.kanban` file records `open:kanban`, and a view file records `open:collection`.
- [ ] Tabs restored at startup record nothing.
- [ ] If approved, a Quick Capture save records `quick-capture:save` once.
- [ ] `layer-rules.test.ts` stays green: `core/` gains no import of `features/` or `app/`.

## Notes

- Source: review 2026-11-06 of Issue 07 (coverage gap), priority review 2026-11-06 (kanban detection, the 34 callers, tables and meta-bind not visible), memory note on which features the owner uses.
- Size: M.

## Comments
