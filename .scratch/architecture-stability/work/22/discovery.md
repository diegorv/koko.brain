# Issue 22 discovery

No `spec.md` for architecture-stability. Pattern from `work/04` (ratchet) and `work/21` (boot.ts ports).

## Files that change

- Moves (git mv, imports only): `core/app-lifecycle/{app-lifecycle,index-updater,watcher-handler}.service.ts` -> `app/lifecycle/`; `core/layout/{AppShell,AppOverlays}.svelte`, `core/layout/tauri-listeners.service.ts`, `core/keybindings/global-keybindings.ts`, `core/markdown-editor/EditorView.svelte`, `core/settings/SettingsPanel.svelte` -> `app/` (flat). Relative imports become `#lib/...` (AppShell:52-53, EditorView:11-12, SettingsPanel:93, app-lifecycle:25 stays relative). Tests move to `src/tests/lib/app/` mirroring.
- `src/routes/(app)/+layout.svelte:8-23`: import paths.
- `core/markdown-editor/EditorTabs.svelte:13-14,21-24,56-60`: `tabIcon` snippet prop (rendered for non-virtual tabs, FileText fallback) plus a `tabTitleColor` function prop, both supplied by EditorView; file-icons imports go.
- Owner moves: `core/settings/sections/QueryjsSection.svelte` -> `plugins/queryjs/`; `SearchSection.svelte` -> `features/search/`; `core/status-bar/SemanticIndexStatus.svelte` + `semantic-index-status.logic.ts` -> `features/search/`. AppShell (app) renders SemanticIndexStatus inside StatusBar's snippet, so StatusBar stays in core.
- Command palette: `getBuiltInCommands` (`features/command-palette/command-palette.service.ts:42-307`, 6 plugin imports) moves to `app/commands.ts`; `CommandPalette.svelte` takes a `commands` prop; AppOverlays passes it. `resetCommandPalette` stays.
- `watcher-handler.service.ts:79-81,121-123`: three direct calls -> `notifyContentInvalidated()`.
- `app/boot.ts`: keep the unregister handles, add `unregisterAppPorts()`, `import.meta.hot?.dispose(unregisterAppPorts)`.
- `scripts/import-graph.mjs:38-48,156-171`: roots become `src/lib/app/**` (one ADR row); new rule `app-inbound` for any `src/lib` file outside `app/` importing `app/` (routes are not scanned, so "only routes"). `layer-rules.test.ts` composition-root block rewritten.
- `layer-baseline.json`: drop the 2 EditorTabs, QueryjsSection, 2 SearchSection, SemanticIndexStatus lines = 6, BASELINE_SIZE 37 -> 31. `featureCycleEdges`: unchanged (no edge removed is feature->feature inside a cycle; command-palette is not in the cycle). `featurePairs` auto-syncs (command-palette pairs leave).
- `docs/adr/0003`: dated amendment (fifth layer `app/`), root table -> `src/lib/app/**`. Docs path refs (TESTING.md, LIVE-PREVIEW.md) updated.

## Plan (one commit each)

1. Lifecycle order test (consumers -> step 3 loads -> watcher; teardown reset order) on current code, green.
2. EditorView tab-icon test (inactive markdown tab with a type icon, active `tags` tab), green; then snippet change, still green.
3. Watcher test (a registered listener fires once per batch, incremental and full) red, then route through `notifyContentInvalidated`.
4. boot.ts HMR: test register -> unregister -> register fires once, red, then implement.
5. Owner moves (sections, SemanticIndexStatus) + baseline lines.
6. Command palette commands -> `app/commands.ts`.
7. Moves to `app/` + ratchet rewrite + app-inbound test, same commit (roots list must change with the moves).
8. ADR-0003 amendment and doc paths.

## Defaults taken

- Shortcut derivation (palette labels from keybinding registrations) is split out, as the Issue allows: `RESERVED_KEYBINDINGS` / `keybindings.logic.ts` no longer exist, so the triple ⌘⇧N is now two (global-keybindings, the palette list), both in `app/` after this Issue.
- CLAUDE.md (Indexing 6, Project Structure) is NOT edited by this agent: workflow agents may not change CLAUDE.md; the exact edits are listed in the report for the main session.
- E2E (`bash scripts/e2e.sh`) is not run here; deliver runs the gate.

## Risks

- `e2e/fixtures/helpers.ts` and docs mention moved paths: grep and fix.
- `vi.mock` paths in tests must follow every moved module, or the mock silently stops applying.
