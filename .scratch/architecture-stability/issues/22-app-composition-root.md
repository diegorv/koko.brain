# 22: Create the src/lib/app/ composition root

**What to build:** Move the wiring files to `src/lib/app/` without changing logic:
- `core/app-lifecycle/*` -> `app/lifecycle/`
- `core/layout/{AppShell,AppOverlays}.svelte`
- `core/layout/tauri-listeners.service.ts`
- `core/keybindings/global-keybindings.ts`
- `core/markdown-editor/EditorView.svelte`
- `core/settings/SettingsPanel.svelte`

Related changes:
- **Tab icons.** EditorView passes a `tabIcon` snippet to EditorTabs, so EditorTabs drops its file-icons imports.
- **Owner moves.** QueryjsSection -> plugins/queryjs. SearchSection and SemanticIndexStatus (with its .logic) -> features/search.
- **Write barrier.** app-lifecycle.service.ts:183 and tauri-listeners:65 keep their direct drain calls (they are in `app/` now); vault.service.ts uses the issue-21 barrier.
- **Leftovers.** Re-run the core grep. Any `core/file-explorer` file that survived sidebar 25 moves to rail-shell or gets inverted here.
- **Ratchet.** Rewrite issue 04's composition-root table and test so the roots are `src/lib/app/**`, with the inbound rule "only `src/routes` imports `#lib/app`".
- **ADR and docs.** Add a dated amendment to ADR-0003 for a fifth layer, `app/`: it may import every layer, and only `src/routes` imports it. Update the CLAUDE.md paths (Indexing 6, Project Structure) and note which archify maps are stale.

**Blocked by:** 04, 21


**Status:** needs-triage

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh`

**Source:** src/lib/core/{app-lifecycle,layout,keybindings,settings,status-bar,markdown-editor/EditorView.svelte,markdown-editor/EditorTabs.svelte}, src/routes/(app)/+layout.svelte, docs/adr/0003, docs/adr/0033, .scratch/sidebar-redesign/PRD.md (Code placement)

- [ ] Before moving, a lifecycle test asserts the order "note-change consumers -> step 3 loads -> watcher" and the teardown reset order. It passes unchanged after the move
- [ ] `git diff -M` shows the `initializeVault`/`teardownVault` bodies unchanged apart from import paths
- [ ] Before the snippet change, a test shows a tab displaying its type icon, and it still does afterwards
- [ ] A test fails if any file under core/, features/ or plugins/ imports `#lib/app/`
- [ ] `layer-baseline.json` and `featureCycleEdges` (issues 04-05) shrink by exactly the edges this issue removes, in the same commit
- [ ] The only core -> features/plugins lines left are the editor ones that issues 31-32 handle (issues 23, 31 and 32), including `editor.service.ts:13` (queryjsSessionStore, assigned to 32). The full E2E suite passes

## Notes

- **Why wait for sidebar 25:** sidebar-redesign 17, 20 and 24 edit `initializeVault`, 21 and 25 edit keybindings, and 25 rewrites AppShell.
- **Also fold in (from the dropped plugin pilot):** build the command palette's plugin commands in `app/` (today `features/command-palette` imports 6 plugin modules), and derive the palette's shortcut labels and `RESERVED_KEYBINDINGS` (`keybindings.logic.ts:112`) from the keybinding registrations. ⌘⇧N is declared three times today (`global-keybindings.ts:143-147`, `command-palette.service.ts:269`, `keybindings.logic.ts:112`). If this makes the issue too big, split it into issue 25.
- **Size:** L (mostly moves, plus docs and the full E2E suite).
