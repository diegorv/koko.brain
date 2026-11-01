# 04: Import-graph extractor and layer-rule ratchet test

**What to build:** Add `scripts/import-graph.mjs`, which exports the pure functions `extractImports(file, text)`, `resolveSpecifier`, `locate` and `findViolations`, built on the existing `typescript` devDependency. It must cover:
- `.svelte` `<script>` blocks (module and instance);
- static and type-only imports;
- `export … from`;
- literal `import()`;
- `import('x')` types.

Add `src/tests/lib/architecture/layer-rules.test.ts` and `layer-baseline.json`.

**Rules:** core->features, core->plugins, features->plugins, utils->non-utils, components/ui->app, types->lib, and plugin->plugin outside a documented allowlist (calendar, one-on-one and quick-capture -> periodic-notes). `src/lib/contracts/` (issues 08-11) is importable from every layer, utils and types included. Logic-file purity is issue 06, not this one.

**Composition roots:** an explicit list of 9 files (app-lifecycle.service, watcher-handler.service, AppShell, AppOverlays, tauri-listeners.service, global-keybindings, EditorView, SettingsPanel, command-palette.service). An inbound rule applies to them: only routes, other roots, or the root's own folder may import a root. The list is shrink-only, like the baseline: the test asserts it matches a table in ADR-0003, so adding a root means editing the ADR.

**Baseline and failure messages:**
- Baseline entries are `<from> -> <resolved to>` and ignore line numbers.
- A new violation fails with file:line, the rule, the ADR and two concrete fixes: a registration API, or moving the code down. The message says the baseline and the root list change only with owner sign-off.
- A stale baseline entry fails and prints the exact line to delete.
- There is no auto-update mode.

Amend ADR-0003 with the enforcement, the composition-root table, and a features->features rule change. Today the ADR reads "features/ may import from core/ and utils/", which forbids feature->feature imports, yet there are 147 such lines. The owner decided on 2026-11-01: feature->feature imports are allowed while they form no cycle. Issue 05 enforces the acyclic part, so this Issue does not baseline them; the ADR text says so. Also fix the ADR's plugin example: the code has calendar -> periodic-notes, not the reverse.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** docs/adr/0003, docs/adr/0004, src/tests/help/examples-scoping.test.ts:29,353-363 (allowlist + stale-entry pattern), src/tests/lib/lib-specifier-convention.test.ts, src/tests/scripts/check-outdated-cargo.test.ts

- [ ] Extractor unit tests are written first, on inline fixture strings. They cover `.svelte` with two script blocks (lang="ts"), `import type {}` and inline `type` specifiers, `export * from`, `await import('#lib/…')`, a relative path into another layer, and `typeof import('x')`. Each fails before the extractor exists
- [ ] Scanner sanity test: more than 2000 edges and more than 150 `.svelte` files are seen, so a broken glob cannot pass silently (210 today; sidebar 25 deletes some)
- [ ] Zero non-literal `import()` in src/lib (a variable specifier would bypass every rule), and a Svelte 5 `<script module>` fixture is covered
- [ ] A synthetic violation (an in-memory edge list) yields the documented message
- [ ] A synthetic missing edge fails the stale-entry assertion and prints the exact JSON line to delete
- [ ] The baseline is sorted and unique, every `from` file exists, and its size equals the count printed at the landing commit (76 at dad4c4c6), generated once by a print-only helper that never writes
- [ ] The inbound rule for composition roots passes at HEAD and fails for a synthetic core file importing `AppShell.svelte`
- [ ] Runtime is measured and reported in the commit message (about 250 ms in plain node); do not assert wall-clock time
- [ ] ADR-0003 amended

## Notes

- **Prototype results** (`/tmp/brain-arch-analysis/s3/edges.mjs`, run at 29a010f5): 2,848 edges in 563 files.
  - 33 core files import features or plugins (153 lines).
  - 4 features import plugins. `utils/debug.ts` and `utils/app-channel.ts` import core.
  - The composition roots account for 92 of the 165 violating lines.
- **Off-the-shelf options rejected:** dependency-cruiser 18.7.0 handles Svelte, but it adds a dependency tree under the quarantine policy, and its `#lib` resolution is unconfirmed. eslint-plugin-boundaries would need ESLint, and the repo has no linter.
- **Landing sequence:** sidebar 15 is in progress. Before 04 lands, add a relay-lite `rules` bullet: "delete `layer-baseline.json` lines your change makes stale; never add any". Then land 04 between two sidebar issues. Sidebar 24 (the path-change.service.ts:9 bookmarks import) and 25 (FileExplorer, 9 lines) will hit stale-entry failures, which that rule covers.
- **Reviewer rule:** a diff that adds to `layer-baseline.json` or the root list gets changes requested. Add this to the relay-lite rules.
- **Size:** M.
