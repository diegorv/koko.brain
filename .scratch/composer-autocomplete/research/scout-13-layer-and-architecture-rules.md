# Scout 13: layer rules and architecture constraints for composer autocomplete

Read-only research at HEAD 130d6b8f7. No tests or builds were run. Every claim cites file:line; anything not verified is marked UNVERIFIED.

## Summary

- `src/routes/**` is NOT scanned by the layer ratchet, so a composer route can import `core/markdown-editor`, `plugins/` and `app/` without any new violation. Placing new files under `src/lib/` is where the rules bite.
- The best home for new composer-only glue is `src/routes/composer/` (zero layer risk) or `src/lib/plugins/quick-capture/` (legal, with precedent for plugins reusing editor completion logic). Putting anything inside `src/lib/core/markdown-editor/` is the worst option: it is against constraint 2, against the folder doc, and trips or strains `markdown-editor-imports.test.ts`.
- Reusing the editor's completion code from outside the editor needs ZERO edits to editor files, provided the consumer imports `extensions/tag/completion` and `extensions/wikilink/completion` directly and never the `extensions/wikilink/index.ts` barrel.
- No new module folder is needed, so no new architecture doc is required. Only existing docs get prose updates.

## 1. What the layer-rules test enforces

- `layer-rules.test.ts` calls `scanLib(ROOT)` (src/tests/lib/architecture/layer-rules.test.ts:42) and checks every violation against `layer-baseline.json` (3 entries, all `utils -> core/settings`, layer-baseline.json:2-4). `BASELINE_SIZE = 3` (layer-rules.test.ts:32). The baseline only shrinks; adding an entry needs owner sign-off (scripts/import-graph.mjs:204-205, ADR-0003 "Existing violations").
- `scanLib` walks only `src/lib` (scripts/import-graph.mjs:249-263, `walk(join(root, LIB))`, `LIB = 'src/lib'` at :29). The doc comment at :152-153 says it outright: "`src/routes` is not scanned". `locate()` returns layer `outside` for any path not under `src/lib` (:141) and `ruleFor` has no rule for a `from` in `outside`. Confirmed again in docs/architecture/modules/src/routes.md:50.
- Rules in `ruleFor` (scripts/import-graph.mjs:156-172):
  - `contracts` is open to everyone (:160).
  - Any file outside `app/` importing `src/lib/app/` is `app-inbound` (:161). Only routes may.
  - `app/` may import everything (:162).
  - `core->features`, `core->plugins`, `features->plugins` (:163-165).
  - `utils` and `types` may import only their own layer (:166-167).
  - `components/ui` may not import core/features/plugins (:168).
  - `plugin->plugin` only through `PLUGIN_ALLOWLIST`, which has `quick-capture -> periodic-notes` and no other quick-capture entry (:47-52).
- Allowed directions that matter here: `plugins -> core` is the inward direction and is legal (layer-rules.test.ts:138). `features -> core` legal (:139). A plugin may import `core/markdown-editor/*` (see precedent in section 4).
- Non-literal `import()` is forbidden in `src/lib` (layer-rules.test.ts:61-64). Any lazy-loading of CodeMirror pieces under `src/lib` must use a literal specifier.

## 2. Other architecture tests that apply to composer work

| Test | Scope | Consequence for the change |
|------|-------|----------------------------|
| `raw-invoke.test.ts:11,67-73` | `src/lib` and `src/routes` | Composer code must use `call()` from `#lib/contracts/ipc.js`, never `invoke` from `@tauri-apps/api/core`. The composer page already complies (src/routes/composer/+page.svelte:5). |
| `event-listen.test.ts:15,68-73` | `src/lib` and `src/routes` | Events only through `on()`; raw `listen`/`once` forbidden. `import type { UnlistenFn }` is allowed (event-listen.test.ts:110, page.svelte:2). |
| `palette-classes.test.ts:12,15` | `src/lib` and `src/routes` | Any popup CSS for a suggestion list must use theme tokens (`bg-popover`, `text-muted-foreground`, `var(--popover)`), never `bg-red-500` style shades. Comments are scanned too (palette-classes.test.ts:7-8). |
| `pure-logic.test.ts:57-61,96-115` | `src/lib` only | Any new `*.logic.ts`, `*.types.ts` or `src/lib/utils/*.ts` file must not reach (transitively, type-only imports included except in `.types.ts`) `svelte`, `@tauri-apps/*`, `$app/*`, a `.store.svelte.ts`, a `.svelte` file or a `.service.ts` (pure-logic.test.ts:40-54). A composer logic file in `src/routes` is NOT checked (the test scans `src/lib`), but keep it pure anyway. |
| `markdown-editor-imports.test.ts:12,34,40-47` | `.ts` files under `src/lib/core/markdown-editor/` | Forbids Tauri, `.store.svelte`, `.service`, `features/`, `plugins/` and `utils/debug.ts` imports from there. It would NOT flag a `#lib/contracts/ipc.js` import (the `forbidden()` list at :15-23 has no contracts entry), so a composer host that calls `call()` placed in the editor folder would pass the test while contradicting the folder doc (see section 5). UNVERIFIED whether the owner would call that a violation; the doc line says "This folder calls no app Tauri command and listens to no event" (docs/architecture/modules/src/lib/core/markdown-editor.md:59). |
| `ipc-mirrors.test.ts:21-50,86-93` | `src/lib` minus `contracts/` | If a new Rust DTO is exposed to the composer, its TS type comes from `src/lib/contracts/generated/`; hand-written interfaces under a generated name fail. Not relevant if no new DTO. |
| `feature-cycle.test.ts` | feature -> feature pairs | Only matters if the glue goes into a new `features/` folder. Not recommended. |
| `fs-capabilities.test.ts` | capability JSON | Untouched unless the composer capability changes (scout 05 topic). |

## 3. Architecture-map and docs requirements

- `discoverModules` makes one module per `core/<x>`, `features/<x>`, `plugins/<x>` folder, per other `src/lib` layer, plus `src/routes` and each Rust folder (scripts/architecture-map.mjs:124-137; test at architecture-map.test.ts:39-65). Files added inside an existing module folder, at any depth, need no new doc.
- `validate` fails on a module with no doc, a doc with no `summary:`, a doc naming a repo path that does not exist, and an orphan doc (scripts/architecture-map.mjs:399-411; the real-repo assertion is architecture-map.test.ts:380-383). Consequence: a NEW folder like `src/lib/plugins/composer-host/` or `src/lib/core/composer/` requires `docs/architecture/modules/src/lib/<layer>/<name>.md` with frontmatter `summary:` or the test fails. Adding files to `src/routes/composer/`, `src/lib/plugins/quick-capture/` or an app subfolder requires no new doc.
- A doc that names a path must name one that exists. If prose in `routes.md` or `quick-capture.md` is updated to mention a new file in backticks (for example `src/routes/composer/composer-host.ts`), the file must exist at the time the test runs (architecture-map.test.ts:300-306 shows the exact failure text). UNVERIFIED which prose patterns `namedPaths` extracts beyond backticked `src/...` paths; the fixture test shows backticked paths and `src/lib/<feature>`-style patterns are treated differently (architecture-map.test.ts:300).
- Docs that need prose updates (not test-enforced except for path existence):
  - `docs/architecture/modules/src/routes.md:7,15,28,46` describe the composer as "a textarea" and say it "uses the theme service" only. A change to a completing input or an imported editor completion makes lines 7, 15, 28 and the gotcha at :46 stale.
  - `docs/architecture/modules/src/lib/plugins/quick-capture.md:7,47` ("It does not own ... the composer page UI", "The composer ... cannot call executeAction or read vaultStore").
  - `docs/architecture/modules/src/lib/core/markdown-editor.md:33,44-45` list who consumes completion logic. If a plugin or route now consumes the sources, line 33 ("`src/lib/plugins`: ... the kanban wikilink suggestions import completion logic from here") should add the composer.
  - `docs/adr/0028-quick-capture-merge-into-kokobrain.md:68` lists "Wikilink `[[` autocomplete in the composer (requires CodeMirror swap + IPC exposing vault entries to the composer webview)" as out of scope. This ADR already uses dated "Amendment" sections (:9); the natural edit is an amendment that moves tags and wikilinks out of scope. ADR-0003 needs no edit unless a new layer rule or allowlist entry is added.

## 4. Reuse and import-direction findings

### Editor completion code has a small, clean import closure

- `extensions/tag/completion.ts` imports only `@codemirror/autocomplete` (type), `../../editor-host`, `../live-preview/core/profiling` and `./completion.logic` (tag/completion.ts:1-4). `completion.logic.ts` imports only `#lib/utils/fuzzy-match.js` (tag/completion.logic.ts:1).
- `extensions/wikilink/completion.ts` imports `#lib/core/filesystem/wikilink-resolution.logic.js`, `#lib/utils/fuzzy-match.js`, `#lib/types/vault-v2.types.js` (type), `../../editor-host`, `../live-preview/core/profiling` and `./completion.logic` (wikilink/completion.ts:1-12). Its logic file imports `file-entries.logic` (type), `fuzzy-match` and `./navigation.logic` (wikilink/completion.logic.ts:1-3).
- `profiling.ts` has no imports at all; `reportError` is `console.error` plus a no-op port until configured (profiling.ts:9-39). So in a composer webview the editor's error reporting degrades to console.error with no app wiring.
- `editor-host.ts` imports only `@codemirror/state`, and types (editor-host.ts:1-4). It exports the `editorHost` facet, `NOOP_HOST` (:87-98) and the types `EditorHost`, `LinkCandidates`, `VaultTag` (:13-26, 44-77). A composer host can be `{ ...NOOP_HOST, listTags, listLinkCandidates, resolveLink, readNote }` without touching editor files.
- Barrel trap: `extensions/wikilink/index.ts` re-exports `wikilinkDecoration` and `decoration.ts` alongside `wikilinkCompletionSource` (wikilink/index.ts:1-5). The composer must import `#lib/core/markdown-editor/extensions/wikilink/completion.js` directly, not the barrel, or it drags in the decoration module (UNVERIFIED how heavy: decoration.ts imports `@codemirror/view` items and `./decoration.logic`, decoration.ts:1-9). The tag source has no barrel issue (editor-extensions.ts:21 imports it by file).
- A source needs a `CompletionContext`, which is constructible outside a view: `new CompletionContext(state, pos, explicit)`, documented as "mostly useful for testing" and `view` is optional (node_modules/@codemirror/autocomplete/dist/index.d.ts:124-170). This means a headless `EditorState` could feed the unmodified sources from a non-CodeMirror host. Both sources read `context.state.doc` and `state.facet(editorHost)` (tag/completion.ts:15-26, wikilink/completion.ts:43-47), so the state needs `editorHost.of(host)`. Whether the wikilink sources touch `context.view` or `matchBefore`: UNVERIFIED (scouts 01/02 cover this).
- Only one `autocompletion()` may exist per editor (markdown-editor.md:53; editor-extensions.ts:139-145). A composer that mounts its own CodeMirror view makes its own instance with `override: [wikilinkCompletionSource, tagCompletionSource]` and has no conflict with the main editor, because the composer is a separate webview.

### Precedent for non-editor consumers of the editor's completion logic

- `plugins/kanban/KanbanWikilinkSuggestions.svelte:2-3` imports `detectWikilinkContext` and `matchFilesForWikilink` from `#lib/core/markdown-editor/extensions/wikilink/completion.logic.js` and drives a plain `<textarea>`/`<input>` with its own popup (lines 5-80). `plugins/table-of-contents/toc.logic.ts:1` imports `HEADING_RE` from `navigation.logic.js`. `features/` and `app/` import editor files too (app/editor-host.ts:17-20). So "an outside module reuses the editor's `.logic.ts`" is an accepted, documented pattern (markdown-editor.md:33).
- That precedent reads `fsStore` for the file list (KanbanWikilinkSuggestions.svelte:4-5,20-22), which the composer cannot do (separate webview, scout 06 topic). The reuse shape that carries over is: pure detect/rank functions plus a host-supplied list.
- `tagCompletionSource` and `wikilinkCompletionSource` currently have consumers only in `setup/editor-extensions.ts` and tests (grep of `src`: files listed are editor-extensions.ts, wikilink/index.ts, the two completion.ts, tests). No second consumer exists yet.

### What the composer route may import

- Routes are unscanned, so from `src/routes/composer/` any `#lib/core/*`, `#lib/plugins/*`, `#lib/features/*`, `#lib/app/*` and `#lib/contracts/*` import produces no layer violation. The ADR states only routes may import `app/` (ADR-0003 amendment, first section).
- Current composer imports: `#lib/contracts/events.js`, `#lib/contracts/ipc.js`, `#lib/core/settings/theme.service.js` (+page.svelte:4-6). `theme.service.ts` itself imports `settings.store.svelte` and `applied-theme.store.svelte` (theme.service.ts:4-5), so the composer webview already bundles an unhydrated `settingsStore` instance. The note in ADR-0028:47 that the composer "cannot import vaultStore" is about empty state in that webview, not about the bundler. A `vaultStore` import would compile but hold no data.
- Practical caution for importing `plugins/quick-capture/*` from the route: `quick-capture.service.ts` imports app-wide services (deep-link, settings, vault, per the doc at quick-capture.md:23-30). Importing a NEW small file from that folder is fine; importing the existing service would bundle the main-window listener code into the composer. UNVERIFIED exact transitive set.

## 5. Where should a composer completion host (or glue) live?

| Option | Layer-rule risk | Doc / test cost | Fit | Verdict |
|--------|-----------------|-----------------|-----|---------|
| A. `src/routes/composer/` (e.g. a `composer-host.ts` next to `+page.svelte`) | None: routes are unscanned (import-graph.mjs:152-153). Must still obey raw-invoke, event-listen, palette tests. | Add prose to `routes.md` (:7,15,28,46); named paths must exist. No new module doc. | Matches "composer page UI lives in src/routes/composer" (quick-capture.md:7). routes.md:7 says "Routes own no stores and no business logic", so keep it a thin adapter. Tests go in `src/tests/routes/` next to composer-page.test.ts. | Recommended for glue that is composer-specific and has no other consumer. |
| B. `src/lib/plugins/quick-capture/` (new file such as `composer-host.ts` or `composer-completion.logic.ts`) | Legal: plugin -> core is inward (layer-rules.test.ts:138). Must not import `#lib/app/` (`app-inbound`) and must not import another plugin except `periodic-notes`. Pure parts must satisfy `pure-logic.test.ts` if named `.logic.ts`. | Update `quick-capture.md` Key files/Collaborators/Gotchas (:11-13,23-31,47). Tests in `src/tests/lib/plugins/quick-capture/` (existing: note-composer.*.test.ts). | Matches the plugin's ownership of "the frontend half of Quick Capture" and the plugin-reuses-editor-logic precedent (Kanban). Mild awkwardness: the doc says the plugin does not own composer UI (:7). | Recommended when the file holds testable logic, because `src/lib` files get pure-logic enforcement and sit next to existing tests. |
| C. `src/lib/app/` (e.g. `app/composer-host.ts`) | Legal for a route to import (only routes may import app). `app/` may import all layers. | `app.md` update. | `app/` is documented as the main-window composition root (ADR-0003 amendment: vault lifecycle, app shell, listeners...). A composer host is not main-window wiring and `app/editor-host.ts` is main-window state-bound (markdown-editor.md:27). | Layer-legal, semantically off. Not recommended. |
| D. `src/lib/core/markdown-editor/` | Passes `markdown-editor-imports.test.ts` only if it avoids Tauri, stores, services, features, plugins and utils/debug. | Folder doc says it "calls no app Tauri command and listens to no event" (markdown-editor.md:59) and "reaches the app only through the EditorHost interface" (:7). Adds new files to the owner's frozen-behavior folder. | Conflicts with constraint 2's spirit (even additive files in the editor folder invite review as an editor change) and with the folder's own gotcha. | Avoid. |
| E. New module folder, for example `plugins/composer-completion` | A plugin importing `plugins/quick-capture` hits `plugin->plugin` unless `PLUGIN_ALLOWLIST` gains an entry, which edits `scripts/import-graph.mjs:47-52` and the ADR-0003 allowlist row and needs owner sign-off. | New `docs/architecture/modules/src/lib/plugins/<name>.md` with `summary:` or architecture-map.test.ts:380-383 fails. | Heavy for a single feature. | Avoid. |

Cross-layer note: `core/` and `features/` may not import `plugins/` (layer-rules.test.ts:113-116). So nothing in `core/markdown-editor` can be edited to import a quick-capture host, which also rules out editor-side registration of a composer host. Under the zero-edit constraint this is moot: the composer-side file installs `editorHost.of(...)` itself.

## 6. Risks

1. Importing the wikilink barrel instead of `wikilink/completion` pulls decoration code into the composer bundle (wikilink/index.ts:1-5). Low severity; avoid by file-level import.
2. A new `.logic.ts` under `src/lib` that imports the editor's `completion.ts` (which imports `editor-host.ts` and `@codemirror/state`) is fine for purity (CodeMirror packages are not in the forbidden package list, pure-logic.test.ts:40-45), but any import of a `.service.ts` or Tauri package in that chain fails the pure-logic test. Keep Tauri calls in the route or a `.service.ts`.
3. Placing any adapter in `src/lib/core/markdown-editor/` risks the owner's constraint 2 and the folder docs. Placing it in `src/lib/app/` is legal but misleading.
4. Doc staleness: `routes.md` and `quick-capture.md` both assert "a textarea" and "cannot read vault state" (routes.md:7,46; quick-capture.md:47). They are not test-gated for prose, only for named path existence, so staleness would pass CI silently. ADR-0028:68 lists the feature as out of scope and needs an amendment.
5. If the composer imports `quick-capture.service.ts` (instead of a new small file), it bundles main-window capture logic and its store imports into the composer webview (quick-capture.md:23-30). UNVERIFIED transitive size.
6. Tests: `composer-page.test.ts:4-8` mocks `#lib/contracts/ipc.js` and imports `+page.svelte` in jsdom. Adding CodeMirror to the page affects that test's DOM assumptions (scout 17 topic).
7. Bundle: `@codemirror/autocomplete` is already a dependency (package.json:25); no new dependency, so the "also run `pnpm build`" rule for dependency changes does not trigger by itself.

## 7. Open questions

1. Does the owner count a new additive file inside `core/markdown-editor/` as "changing the editor"? The research recommends not creating one, so this may be moot.
2. Is a thin `src/routes/composer/*.ts` file acceptable given routes.md:7 ("Routes own no stores and no business logic")? A host that only adapts IPC results into `EditorHost` methods is thin, but anything with ranking or caching logic belongs in plugin quick-capture (option B).
3. Where do the vault tags and link candidates come from for the composer (IPC or events)? That decides whether a new `.logic.ts` or a DTO is needed, and therefore whether the IPC DTO rule (cargo test regeneration, CLAUDE.md quick-reference rule 6) applies. Covered by scouts 03, 04 and 06.
4. Does any editor completion source depend on `context.view` or on facets other than `editorHost`? If so, a headless `EditorState` driver may be insufficient. UNVERIFIED here; scouts 01 and 02 own it.
5. Should ADR-0028 get a dated amendment, or a new ADR, for the move of tag and wikilink autocomplete from out-of-scope to in-scope? Per ADR-0028's own pattern (line 9) an amendment fits.
