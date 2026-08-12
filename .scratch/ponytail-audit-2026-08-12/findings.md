# Ponytail audit (over-engineering) — 2026-08-12

Repo-wide scan of `src/` and `src-tauri/` for over-engineering only. Correctness, security and
performance were explicitly out of scope and routed away.

**Method:** 6 finder agents (deps/build, core, live-preview, features, plugins, rust+utils) swept the
tree under a mandatory evidence rule — no finding may be reported without the grep/wc command that
proves it. Each finder's output then went to an independent skeptic agent instructed to *refute*,
defaulting to `survives=false`, with `CLAUDE.md` and all 30 ADRs as a kill criterion: a pattern the
repo documents as an intentional decision kills the finding. 3 items whose verdicts the pipeline
failed to join were re-verified by hand (noted per entry).

**Result:** 71 findings confirmed | 8 refuted | **net: -2861 lines, -6 deps possible**

Deps removable: npm `codemirror`, `@fortawesome/fontawesome-svg-core`, `@types/katex`; cargo `uuid`,
`percent-encoding`, `objc2-core-foundation`. Plus the `watch` feature on `tauri-plugin-fs` and its two
capability grants.

> Scope: findings only — no fix plan, nothing was applied.

Raw data: `raw-result.json` (final merged output), `raw-journal.jsonl` (per-agent returns, including
every finder finding and every skeptic verdict with its full reasoning).

## Summary

| # | Tag | Lines | Area | What | Path |
|---|-----|-------|------|------|------|
| 1 | `delete` | 628 | live-preview | 11 regex/Lezer `find*Ranges` parser files superseded by the unified inline handler registry — every export is referenced only by its own test file | `src/lib/core/markdown-editor/extensions/live-preview/parsers/bold.ts` |
| 2 | `delete` | 251 | live-preview | debug-composition.ts — a 251-line debug extension whose only two references in the codebase are both commented out | `src/lib/core/markdown-editor/extensions/debug-composition.ts` |
| 3 | `delete` | 241 | features | Entire task-metadata.logic.ts — emoji task-signifier parser with zero production importers (Rust parses tasks at scan time via get_all_tasks_v2) | `src/lib/features/tasks/task-metadata.logic.ts` |
| 4 | `delete` | 1 +1dep | deps/build | `codemirror` meta-package dependency — never imported anywhere; the app imports the individual `@codemirror/*` packages directly | `package.json:57` |
| 5 | `delete` | 1 +1dep | deps/build | `@fortawesome/fontawesome-svg-core` dependency — the three FA icon-set packages are imported by file-icons.icon-data.ts, the core runtime never is | `package.json:31` |
| 6 | `delete` | 1 +1dep | deps/build | `@types/katex` devDependency — katex 0.18.1 ships its own declarations, so the @types stub is never consulted | `package.json:93` |
| 7 | `delete` | 184 | rust + utils | `search_vault` Tauri command and its only dependency `search/text_search.rs` — the frontend does full-text search via `search_fts` (FTS5) and never in | `src-tauri/src/commands/search.rs` |
| 8 | `shrink` | 165 | live-preview | audio and video are three copy-pasted file pairs (parser, plugin, widget) differing only in the string "audio"/"video" | `src/lib/core/markdown-editor/extensions/live-preview/parsers/audio.ts` |
| 9 | `delete` | 146 | rust + utils | Five `#[tauri::command]`s registered in `invoke_handler` that the frontend never invokes — `get_notes_with_tag_v2`, `get_tasks_in_path_v2`, `query_not | `src-tauri/src/commands/vault.rs:566` |
| 10 | `delete` | 115 | live-preview | dead halves of two surviving parser files: findInlineMathRanges/InlineMathRange in math.ts and findMarkdownLinkRanges/MarkdownLinkRange + findAutolink | `src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts:4` |
| 11 | `delete` | 94 | deps/build | `scripts/settings-watcher.py` — orphan script, nothing invokes or documents it | `scripts/settings-watcher.py` |
| 12 | `delete` | 83 | rust + utils | `debug_semantic_embeddings` — a hardcoded diagnostic that embeds six fixed Portuguese/English query-passage pairs and returns a formatted score report | `src-tauri/src/commands/semantic.rs:1067` |
| 13 | `delete` | 72 | plugins | Five exports in periodic-notes.logic.ts plus the two lookup tables that feed them have zero production callers - referenced only from src/tests | `src/lib/plugins/periodic-notes/periodic-notes.logic.ts:13` |
| 14 | `shrink` | 70 | plugins | KBDateTime hand-rolls a 269-line date library (quarter, ISO weekNumber, plus/minus, startOf/endOf, month-name arrays, token formatter) while dayjs is  | `src/lib/plugins/queryjs/kb-datetime.ts` |
| 15 | `delete` | 65 | core | The file read/write transform hook system in editor.hooks.ts: `FileReadTransform` + `FileWriteTransform` types, the `readTransform`/`writeTransform` m | `src/lib/core/editor/editor.hooks.ts:12` |
| 16 | `shrink` | 45 | live-preview | block-math-widget.ts and inline-math-widget.ts are near-identical KaTeX widgets, each carrying its own Map cache and its own clear* export (CLAUDE.md  | `src/lib/core/markdown-editor/extensions/live-preview/widgets/inline-math-widget.ts` |
| 17 | `shrink` | 45 | plugins | DataArray's Proxy gates on KNOWN_PROPS, a hand-maintained 42-entry Set that must be kept in sync by hand with every method on the class | `src/lib/plugins/queryjs/data-array.ts:12` |
| 18 | `delete` | 35 | features | canvas.logic.ts:373-411 — addNode, removeNode, updateNode, createEdge, addEdge, removeEdge (immutable CanvasData helpers). CanvasInner drives @xyflow/ | `src/lib/features/canvas/canvas.logic.ts:373` |
| 19 | `delete` | 34 | features | properties.logic.ts dead exports: detectPropertyType (L31-39), serializePropertyValue (L192-205), formatRelationshipLabel (L428-430) | `src/lib/features/properties/properties.logic.ts:31` |
| 20 | `delete` | 30 | features | type-sidebar.logic.ts dead exports: isInsideSystemFolder (L57-68), countInbox (L361-368, a byte-identical copy of inbox-workflow.logic.ts::getInboxCou | `src/lib/features/type-definitions/type-sidebar.logic.ts:57` |
| 21 | `delete` | 30 | features | view-parse-cache.ts: getCachedViewYaml, getViewQueryResult, clearViewParseCache, clearAllViewParseCache are dead — which makes queryResultCache write- | `src/lib/features/type-definitions/view-parse-cache.ts:38` |
| 22 | `delete` | 27 | rust + utils | `components/ui/label` — a shadcn-svelte component nobody imports, plus its one-symbol barrel | `src/lib/components/ui/label/label.svelte` |
| 23 | `delete` | 26 | features | Scattered single dead exports: tags.service.ts:103 flushScheduledTagIndexRebuild, collection.service.ts:108 removeNoteFromIndex, toolbar/sort.logic.ts | `src/lib/features/tags/tags.service.ts:103` |
| 24 | `shrink` | 25 | live-preview | MetaBindNumberWidget and MetaBindDateWidget are identical classes whose only difference is the 3-field options object handed to buildMetaBindTextInput | `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:838` |
| 25 | `delete` | 23 | rust + utils | `extract_wikilinks_from_str` in entry.rs — a second hand-rolled `[[target]]` byte scanner living in a file that already imports the real one | `src-tauri/src/vault/entry.rs:406` |
| 26 | `delete` | 22 | features | inbox-workflow.logic.ts: isInboxEnabled and shouldNewNoteBeUnorganized are identity functions (`return explicitOrganization`) and getInboxEntries is u | `src/lib/features/type-definitions/inbox-workflow.logic.ts:6` |
| 27 | `shrink` | 21 | features | Three byte-identical copies of getRelativePath in features (search.logic.ts:146, quick-switcher.logic.ts:81, file-history.logic.ts:108), all duplicati | `src/lib/features/search/search.logic.ts:146` |
| 28 | `delete` | 20 | deps/build | `watch` feature on tauri-plugin-fs plus the `fs:allow-watch` / `fs:allow-unwatch` capability grants — the vault watcher is native Rust `notify`, the J | `src-tauri/Cargo.toml:24` |
| 29 | `shrink` | 20 | core | Seven single-range clamp wrappers in settings.logic.ts (`clampFontSize`, `clampLineHeight`, `clampContentWidth`, `clampParagraphSpacing`, `clampHeadin | `src/lib/core/settings/settings.logic.ts:3` |
| 30 | `delete` | 20 | rust + utils | `sanitizeMathHtml` — an exported KaTeX/MathML DOMPurify config that no caller uses; the two math widgets call `DOMPurify.sanitize(raw)` directly | `src/lib/utils/sanitize.ts:57` |
| 31 | `delete` | 18 | features | lifecycle-filter.logic.ts: excludeArchived, onlyArchived, countArchived unused; only buildArchivedPathSet has a caller | `src/lib/features/properties/lifecycle-filter.logic.ts:3` |
| 32 | `yagni` | 18 | plugins | getPeriodicNoteTitle / getTemplatePathForPeriod / getDailyInlineTemplate are one-line property reads wrapped as exported 'logic' functions with a sing | `src/lib/plugins/periodic-notes/periodic-notes.logic.ts:82` |
| 33 | `delete` | 17 | rust + utils | `VaultSearchMatch` interface — the TS mirror of the dead `search_vault` command's return type | `src/lib/core/filesystem/fs.types.ts:40` |
| 34 | `stdlib` | 16 | rust + utils | `find_triple_backtick(bytes, start)` — a 14-line manual byte loop looking for three consecutive backticks | `src-tauri/src/vault/parsing.rs:967` |
| 35 | `delete` | 15 | live-preview | extractAliasesFromContent in the wikilink completion logic — no completion path calls it | `src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:118` |
| 36 | `delete` | 14 | live-preview | 5 exported Decoration constants in styles.ts with no producer (inline marks moved to the HighlightStyle), plus the `.cm-lp-codeblock-line` and `.cm-lp | `src/lib/core/markdown-editor/extensions/live-preview/styles.ts:4` |
| 37 | `shrink` | 14 | plugins | heatmapCalendar() and yearlyCalendar() open with the same ~44-line intensity-resolution preamble (year filter, min/max intensity, scale start/end, col | `src/lib/plugins/queryjs/kb-ui.ts:646` |
| 38 | `yagni` | 14 | plugins | calendar.service.ts openCalendarFile() is a pure rename of openFileInEditor, and openOrCreateDailyNoteForDate() a one-line partial application - each  | `src/lib/plugins/calendar/calendar.service.ts:124` |
| 39 | `delete` | 13 | core | The entire file-tree sort-option feature: `changeSortOption`, the `sortVersion` counter, the `expectedSortVersion` optional param + staleness guard on | `src/lib/core/filesystem/fs.service.ts:333` |
| 40 | `delete` | 12 | core | `removeThemeOverrides(theme)` in theme.service.ts — walks a theme's CSS vars and removes them from documentElement. Nothing in the app ever removes th | `src/lib/core/settings/theme.service.ts:32` |
| 41 | `delete` | 12 | live-preview | HorizontalRuleWidget and its `.cm-lp-hr` CSS rule — horizontal rules are rendered CSS-only via `.cm-lp-hr-line`, so the widget never produces a decora | `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:17` |
| 42 | `delete` | 12 | features | todoist-bridge.logic.ts:41-52 mapPriorityFromTodoist — the inbound half of a bidirectional mapping; only mapPriorityToTodoist is used | `src/lib/features/tasks/todoist-bridge.logic.ts:41` |
| 43 | `delete` | 11 | features | frontmatter-icon.service.ts:49-59 setFrontmatterIconColor — writes _color to frontmatter; no caller anywhere, not even a test | `src/lib/features/file-icons/frontmatter-icon.service.ts:49` |
| 44 | `delete` | 10 | core | `clearRecentSaves(paths)` in editor.hooks.ts — the watcher was supposed to call it after consuming self-save markers, but nothing does; the 15s RECENT | `src/lib/core/editor/editor.hooks.ts:86` |
| 45 | `delete` | 10 | plugins | stripCardDate and stripCardColor are byte-identical duplicates of removeCardDate / removeCardColor, and both strip* variants are test-only | `src/lib/plugins/kanban/kanban.logic.ts:472` |
| 46 | `delete` | 10 | rust + utils | `get_search_index_stats` — registered command returning the FTS document count; nothing asks for it | `src-tauri/src/commands/search_index.rs:200` |
| 47 | `yagni` | 9 | core | `shouldAutoCheckNow(autoCheck) { return autoCheck; }` — an identity function with one internal caller, carrying a 13-line docblock that explicitly jus | `src/lib/core/settings/update-check.service.ts:39` |
| 48 | `stdlib` | 9 | rust + utils | `split_key_value` — 9 lines to split a `key: value` line on the first colon | `src-tauri/src/vault/parsing.rs:657` |
| 49 | `delete` | 8 | core | `isValidFolderName(name)` in settings.logic.ts — path-traversal validator for vault-relative folder settings, never called by any settings section or  | `src/lib/core/settings/settings.logic.ts:40` |
| 50 | `delete` | 8 | features | tag-colors.logic.ts:30-37 getContrastTextColor — perceived-brightness contrast picker with no consumer (TagColorPicker.svelte uses only TAG_COLOR_PRES | `src/lib/features/tags/tag-colors.logic.ts:30` |
| 51 | `shrink` | 6 | core | Four separate copies of the same basename one-liner in core: `getFileName` in editor.logic.ts, `getFileName` in fs.logic.ts (byte-identical bodies), ` | `src/lib/core/editor/editor.logic.ts:18` |
| 52 | `native` | 6 | features | Hand-rolled local YYYY-MM-DD formatting duplicated in collection/calendar.logic.ts:174 (formatDateKey) and file-history/file-history.logic.ts:175 (toD | `src/lib/features/collection/calendar.logic.ts:174` |
| 53 | `stdlib` | 5 | deps/build | hand-rolled local-time `YYYY-MM-DDThh:mm:ss` formatter (a `pad` helper plus a 4-line template-literal array join) | `vite.config.js:22` |
| 54 | `delete` | 5 | core | `flushPendingSaves()` in editor.service.ts — flushes the two autosave debounce timers. No production code calls it; app-close/vault-switch use `saveAl | `src/lib/core/editor/editor.service.ts:192` |
| 55 | `delete` | 5 | core | `closeVault()` in vault.service.ts — a 3-line wrapper that only forwards to `vaultStore.close()`, with no callers at all. | `src/lib/core/vault/vault.service.ts:38` |
| 56 | `delete` | 5 | rust + utils | `Reranker::with_batch_size` — a builder override for `batch_size` that no caller ever chains | `src-tauri/src/semantic/reranker.rs:91` |
| 57 | `delete` | 4 | core | `getWatcherCounters()` in fs.watcher.ts — snapshot accessor for the watcher debug counters, read only by tests (the counters themselves are still logg | `src/lib/core/filesystem/fs.watcher.ts:44` |
| 58 | `delete` | 4 | live-preview | core/types.ts — DecorationEntry has zero references and LineInfo just restates CodeMirror's own `Line` type (text/from/to/number) | `src/lib/core/markdown-editor/extensions/live-preview/core/types.ts` |
| 59 | `delete` | 4 | features | search.logic.ts:154 getFileName is byte-identical to backlinks.logic.ts:59 getNoteName (split '/', strip extension) | `src/lib/features/search/search.logic.ts:154` |
| 60 | `stdlib` | 4 | rust + utils | `is_char_boundary(s, byte_pos)` free function that re-wraps the std method with two redundant guards | `src-tauri/src/vault/parsing.rs:1064` |
| 61 | `delete` | 4 | rust + utils | `parseDate` in date.ts — exported dayjs parse wrapper with no production caller | `src/lib/utils/date.ts:52` |
| 62 | `shrink` | 4 | rust + utils | `today(format)` in date.ts is a duplicate of `formatNow(outputFormat, 0)` — same dayjs call, differing only by a default argument | `src/lib/utils/date.ts:15` |
| 63 | `delete` | 3 | core | `SETTINGS_SECTIONS` — a flattened copy of SETTINGS_SECTION_GROUPS "for lookups and iteration". Nothing looks up or iterates it; SettingsPanel.svelte r | `src/lib/core/settings/settings.logic.ts:107` |
| 64 | `delete` | 3 | core | 6 of the 12 live-preview decorator kill-switches in the Troubleshooting settings pane are no-ops — nothing reads them | `src/lib/core/settings/sections/TroubleshootingSection.svelte:14` |
| 65 | `delete` | 2 | core | The `tagsVisible` setting: declared in settings.types.ts and given a default in the store, but no UI toggles it and no code reads it. | `src/lib/core/settings/settings.types.ts:63` |
| 66 | `delete` | 2 | rust + utils | `ColorPresetName` type export in color-presets.ts — never referenced | `src/lib/utils/color-presets.ts:33` |
| 67 | `delete` | 1 | deps/build | cargo `uuid` dependency (with the `v4` feature) — zero references in Rust source or tests | `src-tauri/Cargo.toml:36` |
| 68 | `delete` | 1 | deps/build | cargo `percent-encoding` dependency — zero references in Rust source or tests | `src-tauri/Cargo.toml:51` |
| 69 | `delete` | 1 | deps/build | cargo `objc2-core-foundation` dependency — fonts.rs declares its own `extern "C"` CoreFoundation FFI instead of using the crate | `src-tauri/Cargo.toml:68` |
| 70 | `delete` | 1 | features | file-icons IconPackMeta.iconCount — hardcoded 0 for all 12 packs and never read anywhere | `src/lib/features/file-icons/file-icons.icon-data.ts:15` |
| 71 | `delete` | 1 | features | quick-switcher.logic.ts:4 barrel re-export `export { fuzzyMatch, type FuzzyMatchResult } from '$lib/utils/fuzzy-match'` — FuzzyMatchResult has zero co | `src/lib/features/quick-switcher/quick-switcher.logic.ts:4` |

## Findings

### 1. `delete` 11 regex/Lezer `find*Ranges` parser files superseded by the unified inline handler registry — every export is referenced only by its own test file

- **Path:** `src/lib/core/markdown-editor/extensions/live-preview/parsers/bold.ts`
- **Cut:** -628 lines | **Area:** live-preview
- **Replacement:** nothing (delete the 11 files and their test files)

**Evidence**

```
Per-export sweep over all live-preview parser exports: `for s in ...; do grep -rn "\b$s\b" src src-tauri/src | grep -v '/src/tests/' | wc -l; done`. findBoldRanges/BoldRange, findItalicRanges/ItalicRange, findBoldItalicRanges/BoldItalicRange, findHighlightRanges/HighlightRange, findInlineCodeRanges/InlineCodeRange, findStrikethroughRanges/StrikethroughRange, findHeadingMarkRange+findSetextHeadingRange/HeadingMarkRange+SetextHeadingRange, findImageRanges/ImageRange, findOrderedListMarkRange/OrderedListMarkRange, findTaskMarkerRange/TaskMarkerRange, isHorizontalRule — every hit outside src/tests is the declaration itself inside its own file (e.g. `grep -rn '\bBoldRange\b' src | grep -v /src/tests/` → 3 hits, all bold.ts:4/17/18). wc -l: bold 52, italic 52, bold-italic 112, highlight 62, inline-code 52, strikethrough 52, heading 91, image 50, ordered-list 45, task-list 39, horizontal-rule 21 = 628.
```

**Verification**

Re-ran with a CORRECTED filter (the auditor's `grep -v '/src/tests/'` never matched — paths are `src/tests/...` with no leading slash, so their raw counts were wrong; conclusion still holds). With `grep -v 'src/tests/'` each of findBoldRanges/findItalicRanges/findBoldItalicRanges/findHighlightRanges/findInlineCodeRanges/findStrikethroughRanges/findHeadingMarkRange/findSetextHeadingRange/findImageRanges/findOrderedListMarkRange/findTaskMarkerRange/isHorizontalRule returns exactly 1 hit = its own declaration. Independent cross-check: `grep -rn 'parsers/' src --include=*.ts --include=*.svelte | grep -v src/tests/` lists every production-imported parser module (meta-bind-input, link, table, frontmatter, comment, blockquote, block-reference, wikilink-embed, video, queryjs-block, meta-bind-button, mermaid, math, inline-markdown, footnote, fenced-code-block, collection-block, callout, audio) — none of the 11 appear. image-plugin.ts uses syntaxTree directly, not parsers/image. ADR 0008 confirms the Hibrido D refactor folded these into inline/handlers, so these are residue, not protected design. wc -l re-run: 52+52+112+62+52+52+91+50+45+39+21 = 628 exactly.

### 2. `delete` debug-composition.ts — a 251-line debug extension whose only two references in the codebase are both commented out

- **Path:** `src/lib/core/markdown-editor/extensions/debug-composition.ts`
- **Cut:** -251 lines | **Area:** live-preview
- **Replacement:** nothing (git history keeps it)

**Evidence**

```
`grep -rn "debug-composition\|compositionDebugExtension\|debugCompartments" src src-tauri/src scripts` → only setup/editor-extensions.ts:30 `// import { compositionDebugExtension } ...`, setup/editor-extensions.ts:108 `// compositionDebugExtension(),`, a prose mention in composition-aware-bracket-matching.ts:62, and the file's own definitions. Zero live imports, zero test references. `wc -l` = 251.
```

**Verification**

`grep -rn 'debug-composition|compositionDebugExtension|debugCompartments' src src-tauri/src scripts` reproduced exactly: editor-extensions.ts:30 and :108 are both commented out, composition-aware-bracket-matching.ts:62 is a prose comment, everything else is the file's own definitions. Zero live imports, zero test references. Not mentioned in CLAUDE.md or any of the 30 ADRs, so no documented-intent defense. `wc -l` = 251 confirmed.

### 3. `delete` Entire task-metadata.logic.ts — emoji task-signifier parser with zero production importers (Rust parses tasks at scan time via get_all_tasks_v2)

- **Path:** `src/lib/features/tasks/task-metadata.logic.ts`
- **Cut:** -241 lines | **Area:** features
- **Replacement:** nothing

**Evidence**

```
`rg -n "task-metadata.logic" src` → 2 hits, BOTH in src/tests (tasks.logic.test.ts:9, task-metadata.logic.test.ts:8). Zero production imports. Per-symbol check: parseTaskMetadata/mapCheckboxChar/isOverdue/isDueToday/isDueSoon all prod_files=1 (own file only). `wc -l` = 241.
```

**Verification**

Re-verified: `rg -n --word-regexp parseTaskMetadata|mapCheckboxChar|isOverdue|isDueToday|isDueSoon src src-tauri/src scripts --glob '!src/tests/**'` returns only the definitions in the file itself plus Rust DOC-COMMENT mentions in src-tauri/src/vault/parsing.rs (comments, not code). No `import * as` namespace import exists anywhere in src (checked). Precedent supports the cut: tasks.logic.ts:2-10 records that the sibling TS scanner `extractTasks` was already deleted for the same reason after Phase 7.6. No ADR mandates keeping it (ADR 0025 says the migration ends with 'zero TS metadata indexers'). Caveat to carry into the cut: parsing.rs doc comments cite this file as the parity spec, so those comments must be rewritten or the spec moved. wc -l = 241 confirmed.

### 4. `delete` `codemirror` meta-package dependency — never imported anywhere; the app imports the individual `@codemirror/*` packages directly

- **Path:** `package.json:57`
- **Cut:** -1 lines, -1 dep | **Area:** deps/build
- **Replacement:** nothing

**Evidence**

```
`grep -rn "'codemirror'\|\"codemirror\"" src src-tauri/src scripts vite.config.js svelte.config.js vitest.config.ts e2e` -> 0 hits. Second pass `grep -rn "codemirror'" src e2e scripts | grep -v '@codemirror'` -> 0 hits. Only occurrence in the repo is the package.json line itself. (`@codemirror/state` 73 prod hits, `@codemirror/view` 54 — those are the real deps.)
```

**Verification**

Re-verified: repo-wide `grep -rn "['\"]codemirror['\"]" --exclude-dir=node_modules --exclude-dir=.svelte-kit --exclude=pnpm-lock.yaml .` returns only package.json:57 plus a code sample in help/examples/markdown-editor-vault/09-code-blocks.md (doc text). No `basicSetup`/`minimalSetup` import anywhere in src/e2e/scripts (0 hits). pnpm-lock: `codemirror` appears only at line 121 (root importer) and its own package/snapshot entries at 1267/3420 — nothing else depends on it, so the dep really leaves the tree. Survives.

### 5. `delete` `@fortawesome/fontawesome-svg-core` dependency — the three FA icon-set packages are imported by file-icons.icon-data.ts, the core runtime never is

- **Path:** `package.json:31`
- **Cut:** -1 lines, -1 dep | **Area:** deps/build
- **Replacement:** nothing

**Evidence**

```
`grep -rn "fontawesome-svg-core" src e2e scripts src-tauri/src package.json` -> single hit: `package.json:31`. Repo-wide `grep -rn "fontawesome-svg-core" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=target` returns nothing else. By contrast free-solid/free-regular/free-brands each have 1 real dynamic import at file-icons.icon-data.ts:114-116.
```

**Verification**

`grep -rn "fontawesome-svg-core" src e2e scripts src-tauri/src static` -> 0 hits. Only the three icon-set packages are dynamically imported at src/lib/features/file-icons/file-icons.icon-data.ts:114-116. Checked the peer/transitive angle the auditor didn't: node_modules/@fortawesome/free-solid-svg-icons/package.json declares only `@fortawesome/fontawesome-common-types` as a dependency, not the svg-core runtime; lock lists fontawesome-svg-core only as a root importer (line 43) and its own package entries. Real removal. Survives.

### 6. `delete` `@types/katex` devDependency — katex 0.18.1 ships its own declarations, so the @types stub is never consulted

- **Path:** `package.json:93`
- **Cut:** -1 lines, -1 dep | **Area:** deps/build
- **Replacement:** nothing

**Evidence**

```
`tsc --ignoreConfig --noEmit --traceResolution --moduleResolution bundler .tmp-katex-probe.ts` prints: `Found 'package.json' at node_modules/katex/package.json` / `Using 'exports' subpath '.' with target './types/katex.d.ts'` / `Module name 'katex' was successfully resolved to .../katex/types/katex.d.ts`. node_modules/@types/katex is never visited.
```

**Verification**

Re-ran the probe myself: `tsc --ignoreConfig --noEmit --traceResolution --moduleResolution bundler` on `import katex from 'katex'` prints "Using 'exports' subpath '.' with target './types/katex.d.ts'" and resolves to katex@0.18.1/types/katex.d.ts — @types/katex never visited. Also checked the two ways it could still matter: only `import katex from 'katex'` (2 sites) and a CSS `@import "katex/dist/katex.min.css"` exist, no `katex/contrib/*` submodule import that would need the @types/katex/contrib stubs, and no bare `KatexOptions`/`TrustContext` global reference in src (0 hits). tsconfig sets moduleResolution bundler with skipLibCheck. Survives.

### 7. `delete` `search_vault` Tauri command and its only dependency `search/text_search.rs` — the frontend does full-text search via `search_fts` (FTS5) and never invokes it

- **Path:** `src-tauri/src/commands/search.rs`
- **Cut:** -184 lines | **Area:** rust + utils
- **Replacement:** nothing (delete `commands/search.rs`, `search/text_search.rs`, drop the `commands::search::search_vault` line from lib.rs invoke_handler and `pub mod search` from commands/mod.rs)

**Evidence**

```
`grep -rn "search_vault" src src-tauri/src scripts` → 3 hits total: `src/lib/core/filesystem/fs.types.ts:39` (a doc comment only), `src-tauri/src/lib.rs:316` (registration), `src-tauri/src/commands/search.rs:16` (definition). Zero `invoke('search_vault')` anywhere. And `grep -rn "search_in_content|text_search" src-tauri/src src-tauri/tests | grep -v '^src/search/text_search.rs:'` → only `src/search/mod.rs:4` (mod decl) and `src/commands/search.rs:1,79`, so text_search.rs is reachable ONLY through the dead command. `wc -l` = 85 + 262 (of which lines 100+ are `#[cfg(test)]`, so ~185 production lines).
```

**Verification**

Re-verified. `grep -rn search_vault src src-tauri/src scripts` = 3 hits (doc comment in fs.types.ts:39, lib.rs:316 registration, definition at search.rs:16). Zero `invoke('search_vault')`. Checked for dynamically-built invoke names: `grep -rnE "invoke\(\s*[^'\"\)]" src/lib src/routes` = 0 hits, so no runtime string could reach it. Read the whole of commands/search.rs (85 lines): it contains ONLY search_vault + its private `collect_search_matches` helper — `search_fts` lives in commands/search_index.rs:120, so deleting search.rs does not touch the live FTS path (search.service.ts:207 invokes 'search_fts'). text_search.rs is reachable only from commands/search.rs (grep for `search_in_content` / `build_lower_to_orig_map` outside that file = 0 production hits). ADR 0011 lists `commands/search.rs` as an FTS wrapper, but that is stale — the FTS commands are in search_index.rs, so the ADR does not protect this file. Line count corrected: search.rs = 85 (no cfg(test)), text_search.rs cfg(test) starts at line 100 so 99 production lines. 85+99 = 184, not 185.

### 8. `shrink` audio and video are three copy-pasted file pairs (parser, plugin, widget) differing only in the string "audio"/"video"

- **Path:** `src/lib/core/markdown-editor/extensions/live-preview/parsers/audio.ts`
- **Cut:** -165 lines | **Area:** live-preview
- **Replacement:** one `media.ts` parser + one `mediaPlugin(tag)` factory + one `MediaWidget(tag, src)`

**Evidence**

```
`diff plugins/audio-plugin.ts plugins/video-plugin.ts` → 8 hunks, all pure audio→video renames (import name, function name, widget name, profile tag, comments). `diff parsers/audio.ts parsers/video.ts` → 11 hunks, all renames plus `/^<audio[\s>\/]/i` vs `/^<video[\s>\/]/i`. widgets.ts:189-247 AudioWidget vs VideoWidget are byte-identical apart from `'audio'`/`'video'` element tag and `cm-lp-audio*`/`cm-lp-video*` class names. Sizes: 81+81 (parsers) + 74+74 (plugins) + 27+32 (widgets) = 369 lines to collapse into roughly 200.
```

**Verification**

Re-ran both diffs. parsers/audio.ts vs video.ts: 81 vs 81 lines, every hunk a pure audio→video rename plus /^<audio[\s>\/]/i vs /^<video[\s>\/]/i. plugins/audio-plugin.ts vs video-plugin.ts: 74 vs 74 lines, every hunk a rename (import, function, widget, profileStart tag). widgets.ts:189-213 AudioWidget vs :216-240 VideoWidget read byte-identical apart from 'audio'/'video' createElement tag and cm-lp-audio*/cm-lp-video* classes. No ADR or CLAUDE.md rule protects the split (ADR 0008 only mandates block-vs-inline, not one file per media tag) and both stay block plugins after merge. Recount: 162 parser + 148 plugin + ~50 widget = 360 lines collapsing to ~190, so ~170 saved; the claimed 165 is if anything conservative.

### 9. `delete` Five `#[tauri::command]`s registered in `invoke_handler` that the frontend never invokes — `get_notes_with_tag_v2`, `get_tasks_in_path_v2`, `query_notes_by_property`, `get_property_values`, `get_note_properties` — plus the five `VaultIndex::lookup_*` methods that exist only to serve them

- **Path:** `src-tauri/src/commands/vault.rs:566`
- **Cut:** -146 lines | **Area:** rust + utils
- **Replacement:** nothing (delete the 5 commands, the 5 lib.rs registrations, and `lookup_notes_with_tag` / `lookup_tasks_in_path` / `lookup_notes_by_property` / `lookup_property_values` / `lookup_note_properties` in index.rs)

**Evidence**

```
Per-command grep over `src/lib src/routes` for the invoke string returned 0 for all five (`grep -rn "'get_notes_with_tag_v2'" src/lib src/routes` etc.). Full-tree `grep -rn "<name>" src scripts src-tauri/src` shows only the lib.rs registration + the vault.rs definition (plus one stale doc comment for get_notes_with_tag_v2 in vault-v2.types.ts:65). Each lookup method has exactly one production caller — the dead command: e.g. `grep -rn lookup_notes_by_property src-tauri/src` → `commands/vault.rs:802` and `index.rs:900` (definition) only; the rest of the hits are `#[cfg(test)]` blocks inside index.rs (lines 1773+).
```

**Verification**

Re-verified each name across src, src-tauri/src, scripts. get_notes_with_tag_v2: only lib.rs:301 + vault.rs:566/570 + a stale doc comment at vault-v2.types.ts:65. get_tasks_in_path_v2: only lib.rs:303 + vault.rs:594/598. query_notes_by_property / get_property_values / get_note_properties: only their lib.rs registration + vault.rs definition (+ one index.rs doc comment). No dynamic invoke exists anywhere (0 hits for non-literal invoke args), so runtime string construction is ruled out. Each lookup_* has exactly one production caller — the dead command — the rest are #[cfg(test)] in index.rs plus src-tauri/tests/vault_index_test.rs. Considered killing this on CLAUDE.md 'Indexing & Watcher' item 1 and ADR 0025, which do name these commands: but both describe the read-through-IPC PATTERN and the target command surface, not a decision to retain uninvoked endpoints; the live panels use get_all_tags_v2 / get_all_tasks_v2 / get_tasks_in_section_v2 / get_all_property_records instead. No user-facing feature is lost. Line count re-measured from the source: 5 commands in vault.rs = 13+13+14+12+12 = 64; 5 lookups in index.rs (incl. doc comments) = 17+9+21+19+11 = 77; +5 lib.rs registration lines = 146, not 150. Caveat for the parent: the cut also deletes ~30 Rust integration tests in src-tauri/tests/vault_index_test.rs.

### 10. `delete` dead halves of two surviving parser files: findInlineMathRanges/InlineMathRange in math.ts and findMarkdownLinkRanges/MarkdownLinkRange + findAutolinkRanges/AutolinkRange in link.ts

- **Path:** `src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts:4`
- **Cut:** -115 lines | **Area:** live-preview
- **Replacement:** nothing (keep findAllBlockMath, findExtendedAutolinkRanges, findMarkdownLinkUrlAtPosition)

**Evidence**

```
`grep -rn '\bfindInlineMathRanges\b\|\bMarkdownLinkRange\b\|\bAutolinkRange\b' src src-tauri/src | grep -v /src/tests/` → InlineMathRange: 3 hits all math.ts:5/32/33; MarkdownLinkRange: 3 hits all link.ts:4/17/18; AutolinkRange: 3 hits all link.ts:54/67/68 (the separate `ExtendedAutolinkRange` has 4 hits including real callers, so it stays). Blocks: math.ts:4-12 + 27-51 = 34 lines; link.ts:4-51 + 53-87 = 83 lines.
```

**Verification**

With the corrected test filter: findInlineMathRanges, findMarkdownLinkRanges, findAutolinkRanges each return exactly 1 non-test hit (their own declaration). The surviving siblings are genuinely live — findAllBlockMath is imported by plugins/block-math-field.ts:4, findExtendedAutolinkRanges by inline/handlers/autolink-handlers.ts:4, findMarkdownLinkUrlAtPosition by click-handler.ts:3 — so the finding correctly scopes to the dead halves and does not remove a user-facing feature (inline math still renders via simple-widget-handlers.ts:120 → InlineMathWidget; markdown links via inline/handlers/markdown-link-handlers.ts). Recounted the blocks by reading them: math.ts jsdoc+interface 4-12 (9) + jsdoc+fn 28-51 (24) = 33; link.ts 4-11 + 13-50 = ~47 and 53-60 + 62-88 = ~35 = ~82. Total ~115, not 117.

### 11. `delete` `scripts/settings-watcher.py` — orphan script, nothing invokes or documents it

- **Path:** `scripts/settings-watcher.py`
- **Cut:** -94 lines | **Area:** deps/build
- **Replacement:** nothing

**Evidence**

```
`grep -rn "settings-watcher" . --exclude-dir=node_modules --exclude-dir=target --exclude-dir=.git` -> only 2 hits, both inside the file's own usage docstring (lines 9-10). Not in package.json scripts, not in .github/workflows, not in tauri.conf.json beforeBuildCommand, not in CLAUDE.md/CONTRIBUTING.md/docs. Every sibling script has external references (e2e.sh in CI+docs, log-watcher.py in CLAUDE.md, tauri-before-build.sh in tauri.conf.json:9, setup-hooks.sh in SECURITY.md, etc.). `wc -l` = 94.
```

**Verification**

Re-ran the grep: `grep -rn "settings-watcher" --exclude-dir=node_modules --exclude-dir=target --exclude-dir=.git .` -> 2 hits, both inside the file's own usage docstring (lines 9-10). Went further and scored every sibling: e2e.sh 48 external refs, perf-baseline.py 9, release.sh 6, tauri-before-build.sh 4, log-watcher.py 3, pre-commit-dep-age.sh 3, quarantine-aware-audit.mjs 3, setup-hooks.sh 2, check-outdated-quarantine.mjs 1 — settings-watcher.py is the only script in the directory at 0, so 'undocumented manual dev tool' is not the house pattern here. `wc -l` = 94, confirmed. Survives.

### 12. `delete` `debug_semantic_embeddings` — a hardcoded diagnostic that embeds six fixed Portuguese/English query-passage pairs and returns a formatted score report; registered as a command but never called

- **Path:** `src-tauri/src/commands/semantic.rs:1067`
- **Cut:** -83 lines | **Area:** rust + utils
- **Replacement:** nothing

**Evidence**

```
`grep -rn "debug_semantic_embeddings" src scripts src-tauri/src` → exactly 2 hits: `src-tauri/src/lib.rs:333` (registration) and `src-tauri/src/commands/semantic.rs:1067` (definition). No frontend reference, no test reference. Body spans lines 1063–1145 (measured with awk on the closing brace).
```

**Verification**

Re-verified: `grep -rn debug_semantic_embeddings src src-tauri/src scripts` = exactly 2 hits, lib.rs:333 (registration) and semantic.rs:1067 (definition). No frontend caller, no test caller, no dynamic invoke path. Function body span re-measured with sed+grep on closing braces: 1063-1145 = 83 lines. Count confirmed as stated.

### 13. `delete` Five exports in periodic-notes.logic.ts plus the two lookup tables that feed them have zero production callers - referenced only from src/tests

- **Path:** `src/lib/plugins/periodic-notes/periodic-notes.logic.ts:13`
- **Cut:** -72 lines | **Area:** plugins
- **Replacement:** nothing

**Evidence**

```
grep -rn '<sym>' src src-tauri/src scripts | grep -v '^src/tests' returns only the declaration line for: buildPeriodicNotePathForToday (:52), buildAdjacentPeriodPath (:65), getTodayPeriodicNoteTitle (:89), buildPeriodicNotePathForDate (:118). Totals: buildPeriodicNotePathForDate total=6 tests=5, buildPeriodicNotePathForToday total=4 tests=3, getTodayPeriodicNoteTitle total=4 tests=3, buildAdjacentPeriodPath total=9 tests=7. grep -rn 'PERIOD_UNIT|PERIOD_MULTIPLIER' src -> only lines 13, 22 (declarations) and 73, 74 (inside dead buildAdjacentPeriodPath). Spans: 9-28 (20 lines), 48-78 (31), 85-91 (7), 113-128 (15).
```

**Verification**

Re-ran `grep -rn <sym> src src-tauri/src scripts | grep -v '^src/tests'` for each: buildPeriodicNotePathForToday -> 1 hit (the declaration at :52); getTodayPeriodicNoteTitle -> 1 hit (:89); buildPeriodicNotePathForDate -> 1 hit (:118) despite its JSDoc claiming 'used by the calendar service' (calendar.service.ts does not import it - it uses dayjs directly at :117); buildAdjacentPeriodPath -> 2 hits (:65 and its own mention in the PERIOD_UNIT comment at :10). PERIOD_UNIT/PERIOD_MULTIPLIER -> declarations at :13/:22 plus uses only inside dead buildAdjacentPeriodPath (:73/:74). No namespace import of periodic-notes.logic exists anywhere (checked `import * as`), and the 5 real importers (wikilink-navigation, MarkdownEditor, periodic-notes.service, one-on-one.logic, note-composer.logic, deep-link.service) pull only detectPeriodicNoteType/buildWikilinkPath/buildPeriodicNotePath. Recount of the spans: 8-19 (12) + 21-28 (8) + 49-58 (10) + 60-77 (18) + 86-91 (6) + 114-126 (13) = 67, plus the now-unused `today` import from utils/date and blank separators ~= 72. Claimed 73, close enough - corrected to 72.

### 14. `shrink` KBDateTime hand-rolls a 269-line date library (quarter, ISO weekNumber, plus/minus, startOf/endOf, month-name arrays, token formatter) while dayjs is already a dependency with quarterOfYear/isoWeek/advancedFormat already extended

- **Path:** `src/lib/plugins/queryjs/kb-datetime.ts`
- **Cut:** -70 lines | **Area:** plugins
- **Replacement:** Wrap dayjs internally: .year()/.month()/.date()/.hour()/.minute()/.valueOf(), .quarter(), .isoWeek(), .add()/.subtract(), .startOf('isoWeek')/.endOf(), .isSame(o,unit), .format('MMMM'|'MMM'|'YYYY-MM-DD'). Public API (kb.date()) unchanged; only a ~6-line yyyy/dd/HH -> YYYY/DD/HH token map is needed

**Evidence**

```
wc -l src/lib/plugins/queryjs/kb-datetime.ts -> 269. grep 'dayjs' package.json -> "dayjs": "^1.11.21". sed -n '1,12p' src/lib/utils/date.ts shows dayjs.extend(customParseFormat/weekOfYear/isoWeek/quarterOfYear/advancedFormat) already loaded. kb-datetime.ts imports nothing (line 1 is a comment) and hand-implements: get quarter (Math.floor(getMonth()/3)+1), get weekNumber (14-line ISO-8601 Thursday algorithm), plus/minus (setFullYear/setMonth/setDate...), startOf/endOf (Monday-based week + quarter math), toFormat (replaceAll chain), private static MONTHS_LONG/MONTHS_SHORT arrays.
```

**Verification**

Verified: wc -l = 269; kb-datetime.ts imports nothing (line 1 is a comment) and hand-implements quarter (:112), the 8-line ISO weekNumber algorithm (:118), plus/minus via setFullYear/setMonth (:129-158), startOf (:202-224), endOf (:228-253), and private MONTHS_LONG/MONTHS_SHORT arrays (:183-190). package.json:62 has dayjs ^1.11.21 and src/lib/utils/date.ts:1-12 already extends quarterOfYear/isoWeek/advancedFormat/weekOfYear/customParseFormat. ADR-0010 names KBDateTime as part of the KBAPI surface but only rejects taking Dataview as a dep - it does not sanction hand-rolling date math, and the public Luxon-compatible API is unchanged by the proposal. HOWEVER linesSaved 150 is badly inflated: constructor (8-26, 19 lines) and tryParse (28-79, 52 lines) are untouchable custom parsing, and every getter/valueOf/toString/toJSDate stays as a delegating one-liner with its JSDoc. Block-by-block the removable delta is weekNumber ~6, plus ~6, minus ~8, toISODate ~3, toFormat ~2, MONTHS arrays 8, hasSame ~2, startOf ~18, endOf ~20 = ~73, minus 2-3 added import/extend lines. Caveat the auditor missed: dayjs .add(1,'month') clamps (Jan 31 -> Feb 28) where the current setMonth() overflows (-> Mar 2/3), so this is not a byte-identical shrink of a user-facing scripting API.

### 15. `delete` The file read/write transform hook system in editor.hooks.ts: `FileReadTransform` + `FileWriteTransform` types, the `readTransform`/`writeTransform` module vars, `setFileReadTransform`, `setFileWriteTransform`, `applyReadTransform`, `applyWriteTransform`, and their call sites in editor.service.ts. Zero production code ever registers a transform, so `applyReadTransform` always returns null and `applyWriteTransform` always returns false. (`addAfterSaveObserver` in the same file IS real — 4 production subscribers — and stays.)

- **Path:** `src/lib/core/editor/editor.hooks.ts:12`
- **Cut:** -65 lines | **Area:** core
- **Replacement:** nothing — inline `const content = await readTextFile(filePath)` and `await writeTextFile(path, content)` directly

**Evidence**

```
grep -rn --include="*.ts" --include="*.svelte" -w "setFileReadTransform" src src-tauri/src scripts | grep -v '^src/tests/' → 1 hit, the definition itself (editor.hooks.ts:97). Same for setFileWriteTransform → 1 hit (editor.hooks.ts:103). Every other reference is in src/tests/ (editor.hooks.test.ts, editor.service.test.ts) or a stale vi.fn() mock in app-lifecycle.service.test.ts. Contrast: grep -w addAfterSaveObserver → 4 real production callers (SemanticIndexStatus.svelte:23, file-history.service.ts:192, auto-move.service.ts:94, search.service.ts:311).
```

**Verification**

Confirmed. `grep -rn -w setFileReadTransform src src-tauri/src scripts` = 1 production hit (the definition at editor.hooks.ts:97); same for setFileWriteTransform (:103). Every other hit is src/tests/. applyRead/WriteTransform ARE called from editor.service.ts:88,140,371 but always short-circuit on the null module var. Checked for a hidden registrant: the only plausible one was encrypted-notes, and ADR 0013 is status: superseded / "Feature removed from the app" — `grep -rln encrypt src/lib src-tauri/src` returns zero files. Not covered by any live ADR or CLAUDE.md pattern. Line count trimmed: editor.hooks.ts block is ~60 lines (types 12-31, vars 41-44, setters 96-106, appliers 118-155), plus ~6 lines of editor.service.ts plumbing (the `transformed` var, the `if (transformed)` debug, the `...transformed?.tabProps` spread at :111, the handled/else branch at 140-145).

### 16. `shrink` block-math-widget.ts and inline-math-widget.ts are near-identical KaTeX widgets, each carrying its own Map cache and its own clear* export (CLAUDE.md counts these as one "math HTML string" cache; there are two)

- **Path:** `src/lib/core/markdown-editor/extensions/live-preview/widgets/inline-math-widget.ts`
- **Cut:** -45 lines | **Area:** live-preview
- **Replacement:** one `MathWidget(formula, displayMode)` with one cache and one `clearMathCache()`

**Evidence**

```
`diff widgets/inline-math-widget.ts widgets/block-math-widget.ts` — 56 vs 62 lines differing only in element tag (span/div), class (cm-lp-math-inline / cm-lp-math-block), `displayMode: false/true`, cache variable name, and a 5-line empty-formula guard. `grep -rn 'clearInlineMathCache\|clearMathCache' src | grep -v /src/tests/` shows both imported and called back-to-back at app-lifecycle.service.ts:414-415, so merging also removes one import and one call.
```

**Verification**

`diff` reproduced: 56 vs 62 lines, differing only in span/div, cm-lp-math-inline vs cm-lp-math-block, displayMode false/true, cache variable name, and a 5-line empty-formula guard in the block version. Both clear functions are imported and called back-to-back at app-lifecycle.service.ts:75-76 and :414-415, so the merge also drops one import and one call. CLAUDE.md perf rule 2 mandates only the CACHING STRATEGY (cache the sanitized HTML string, build a fresh element per toDOM) — a merged MathWidget(formula, displayMode) with one Map preserves that exactly, so the documented decision does not protect the two-file split. My own recount says ~53 saved (118 lines → ~65, plus 2 lines in app-lifecycle); the claimed 45 is under-stated, so leaving it at 45.

### 17. `shrink` DataArray's Proxy gates on KNOWN_PROPS, a hand-maintained 42-entry Set that must be kept in sync by hand with every method on the class

- **Path:** `src/lib/plugins/queryjs/data-array.ts:12`
- **Cut:** -45 lines | **Area:** plugins
- **Replacement:** if (prop === 'then' || Reflect.has(target, prop)) return Reflect.get(target, prop, receiver);

**Evidence**

```
Python set-diff over data-array.ts: KNOWN_PROPS count 42; 'in KNOWN_PROPS but NOT a class member' = ['then'] (plus '_values', a false positive from the `readonly` modifier); 'class members NOT in KNOWN_PROPS' = []. So Reflect.has(target, prop) is exactly equivalent for 41/42 entries and 'then' needs one explicit clause. grep -n 'KNOWN_PROPS' -> declared at :13, used once at :67. Block spans lines 12-51.
```

**Verification**

Re-verified independently: KNOWN_PROPS declared at :13, referenced exactly once at :67 (grep -n KNOWN_PROPS -> 2 hits total). Enumerating class members with grep gives where, filter, whereTag, whereDate, byDate, map, flatMap, sort, sortBy, groupBy, distinct, limit, slice, concat, mutate, find, findIndex, indexOf, includes, some, every, none, first, last, to, into, values(get), array, length(get), forEach, sum, avg, min, max, stats, countBy, reduce, join, toString, _values, constructor - every KNOWN_PROPS entry except 'then', which the proposed replacement keeps as an explicit clause. Reflect.has walks the prototype so getters and methods are covered; the numeric-index branch still runs after it since numeric keys are not class members. Only behavioral delta is that Object.prototype keys (valueOf, hasOwnProperty, toLocaleString, __proto__) would delegate instead of mapping - an obscure improvement, not a regression. linesSaved was UNDER-counted: the block runs from the doc comment at :12 to the closing `]);` at :56 = 45 lines, not 40.

### 18. `delete` canvas.logic.ts:373-411 — addNode, removeNode, updateNode, createEdge, addEdge, removeEdge (immutable CanvasData helpers). CanvasInner drives @xyflow/svelte state directly and never calls them

- **Path:** `src/lib/features/canvas/canvas.logic.ts:373`
- **Cut:** -35 lines | **Area:** features
- **Replacement:** nothing

**Evidence**

```
`rg -l --word-regexp "<sym>" src -g '!src/tests/**' -g '!canvas.logic.ts'` → 0 files for each of addNode, removeNode, updateNode, createEdge, addEdge, removeEdge; each has 0 internal callers in canvas.logic.ts too. Only src/tests/.../canvas.logic.test.ts references them. Block spans lines 373-411 (`sed -n '368,413p'`).
```

**Verification**

Re-ran `rg -ln --word-regexp <sym> src src-tauri/src --glob '!src/tests/**'` for all six: each returns only canvas.logic.ts, and the definition line is the sole hit in that file (no internal callers). Checked the `addEdge` name collision with @xyflow/svelte — no CanvasInner/Canvas component imports it under either origin. Line count corrected: the block runs 374-408 (from the `/** Adds a node` docblock through removeEdge's closing brace), not 373-411, so 35 lines, not 39.

### 19. `delete` properties.logic.ts dead exports: detectPropertyType (L31-39), serializePropertyValue (L192-205), formatRelationshipLabel (L428-430)

- **Path:** `src/lib/features/properties/properties.logic.ts:31`
- **Cut:** -34 lines | **Area:** features
- **Replacement:** nothing

**Evidence**

```
`rg -l --word-regexp detectPropertyType src -g '!src/tests/**'` → 1 (own file); same for serializePropertyValue and formatRelationshipLabel (prod_files=1, test_files=1 each). properties.logic.ts is imported by 13 production files, none of which reference these three.
```

**Verification**

Re-ran `rg -n --word-regexp <sym> src --glob '!src/tests/**'`: one hit each, the definition line, so no internal callers either. Cross-checked ADR 0029's citation map — it cites `serializeProperties` (:202) and `rebuildContent` (:218), NOT `serializePropertyValue` (:192), so nothing ADR-protected is being cut. The `Document`/`YAMLSeq` imports stay (serializeProperties uses them), so depsSaved is 0. Line count corrected UPWARD after reading the blocks with their doclines: 28-39 (12) + 188-205 (18) + 427-430 (4) = 34, not 26.

### 20. `delete` type-sidebar.logic.ts dead exports: isInsideSystemFolder (L57-68), countInbox (L361-368, a byte-identical copy of inbox-workflow.logic.ts::getInboxCount), formatDatePair (L393-401)

- **Path:** `src/lib/features/type-definitions/type-sidebar.logic.ts:57`
- **Cut:** -30 lines | **Area:** features
- **Replacement:** nothing (countInbox's one live equivalent already lives in inbox-workflow.logic.ts)

**Evidence**

```
`rg -l --word-regexp isInsideSystemFolder src -g '!src/tests/**'` → 1 (own file, definition only). Same for countInbox and formatDatePair (prod_files=1, test_files=1). Caller-count sweep over all 22 exports of the file printed `isInsideSystemFolder -> 0`, `countInbox -> 0`, `formatDatePair -> 0` external files.
```

**Verification**

Re-ran `rg -n --word-regexp <sym> src src-tauri/src scripts --glob '!src/tests/**'` for all three: exactly one hit each, the `export function` line itself. Confirmed countInbox (361-367) is byte-identical in body to inbox-workflow.logic.ts::getInboxCount (22-28), which does have a live caller (dock-badge.logic.ts:16). Line count corrected by reading the blocks: 57-68 (12) + 360-367 (8, incl. docline) + 392-400 (9, incl. docline) = 29-30, not 34.

### 21. `delete` view-parse-cache.ts: getCachedViewYaml, getViewQueryResult, clearViewParseCache, clearAllViewParseCache are dead — which makes queryResultCache write-only (setViewQueryResult is the only live toucher, nothing reads it) and the cached `yaml` field unread

- **Path:** `src/lib/features/type-definitions/view-parse-cache.ts:38`
- **Cut:** -30 lines | **Area:** features
- **Replacement:** nothing — drop the 4 functions, the queryResultCache Map + setViewQueryResult call site in TypeSidebar.svelte:105, and ParseCacheEntry.yaml

**Evidence**

```
`rg -l --word-regexp getCachedViewYaml src -g '!src/tests/**'` → 1 (own file). Same for getViewQueryResult, clearViewParseCache, clearAllViewParseCache. `rg -n --word-regexp setViewQueryResult src -g '!src/tests/**'` → only view-parse-cache.ts:48 (def) + TypeSidebar.svelte:32,105 (writes). No reader exists. File is 67 lines total.
```

**Verification**

Read the whole 67-line file with cat -n and re-grepped each symbol. getCachedViewYaml (43), getViewQueryResult (53), clearViewParseCache (58), clearAllViewParseCache (64) each have exactly one prod hit: their own definition. setViewQueryResult has three prod hits — its definition (48) plus TypeSidebar.svelte:32 (import) and :105 (call) — both WRITES, and since getViewQueryResult has no caller, queryResultCache is provably write-only. ParseCacheEntry.yaml is written at :27 and read only by the dead getCachedViewYaml. The two live functions (refreshViewDefinition, getCachedViewDefinition) do not touch queryResultCache. 30 lines is an honest count (8+9+11 for the four functions and their doclines, +1 for the Map, +2 for the field, minus the call site).

### 22. `delete` `components/ui/label` — a shadcn-svelte component nobody imports, plus its one-symbol barrel

- **Path:** `src/lib/components/ui/label/label.svelte`
- **Cut:** -27 lines | **Area:** rust + utils
- **Replacement:** nothing (delete the `label/` directory)

**Evidence**

```
Loop over every `src/lib/components/ui/*/` counting `grep -rn "components/ui/<name>" src/lib src/routes` outside the ui dir: `label` = 0 uses (every other component had ≥1; next lowest was `resizable` at 1). Confirmed with `grep -rn "ui/label" src/lib src/routes` → the only `Label` import hits are `dropdown-menu/index.ts`, `context-menu/index.ts` and `select/index.ts`, which import their OWN local `*-label.svelte`, not this one. `wc -l` = 20 + 7.
```

**Verification**

Re-verified independently: `grep -rn "ui/label" src/lib src/routes` = 0 hits. Swept every `Label` import across src/lib and src/routes — the only three are dropdown-menu/index.ts:8, context-menu/index.ts:16 and select/index.ts:3, each importing its OWN local `*-label.svelte`, never this one. label.svelte itself is the only file importing `Label as LabelPrimitive` from bits-ui. No `src/lib/components/ui/index.ts` barrel exists that could re-export it, and no components.json registry reference. `wc -l` = 20 + 7 = 27, exactly as claimed. bits-ui stays (heavily used elsewhere), so depsSaved is correctly 0.

### 23. `delete` Scattered single dead exports: tags.service.ts:103 flushScheduledTagIndexRebuild, collection.service.ts:108 removeNoteFromIndex, toolbar/sort.logic.ts:7 addSort, toolbar/formula.logic.ts:149 finishAllEditing, expression/duration.logic.ts:77 isDurationString

- **Path:** `src/lib/features/tags/tags.service.ts:103`
- **Cut:** -26 lines | **Area:** features
- **Replacement:** nothing

**Evidence**

```
Sweep over every `export function`/`export const` in src/lib/features counting files that reference the symbol outside its own file with tests excluded, plus internal-reference count. Each of these five: ext=0 files, int=0 references, test_files=1. e.g. `rg -l --word-regexp flushScheduledTagIndexRebuild src -g '!src/tests/**'` → 1 (own file).
```

**Verification**

Re-grepped all five with `rg -n --word-regexp <sym> src src-tauri/src scripts --glob '!src/tests/**'`: removeNoteFromIndex (collection.service.ts:108), addSort (toolbar/sort.logic.ts:7), finishAllEditing (toolbar/formula.logic.ts:149), isDurationString (expression/duration.logic.ts:77) each return exactly one hit, their own definition — genuinely dead. flushScheduledTagIndexRebuild must be REMOVED FROM THE CUT: its own docstring at tags.service.ts:98-102 declares it 'Test-only convenience - production callers should not depend on synchronous completion', and src/tests/lib/features/tags/tags.service.test.ts actively uses it, so deleting it breaks a live suite for a documented, intentional test seam. Line count for the remaining four, read from the blocks with doclines: 6 + 7 + 6 + 7 = 26 (the original 20 was an under-count, and it wrongly included the 11-line flush helper).

### 24. `shrink` MetaBindNumberWidget and MetaBindDateWidget are identical classes whose only difference is the 3-field options object handed to buildMetaBindTextInput

- **Path:** `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:838`
- **Cut:** -25 lines | **Area:** live-preview
- **Replacement:** one `MetaBindTextWidget(bindTarget, currentValue, opts)`

**Evidence**

```
`sed -n '838,900p' widgets.ts` — MetaBindNumberWidget (838-861) and MetaBindDateWidget (876-899) have the same constructor, the same `eq()`, the same `ignoreEvent()`, and a `toDOM` that differs only in `{type:'number',validate:isNumericString,invalidMessage:'Not a number'}` vs `{type:'date',validate:isDateString,invalidMessage:'Use YYYY-MM-DD'}`. Both already delegate all DOM work to the shared `buildMetaBindTextInput` at widgets.ts:941.
```

**Verification**

Read widgets.ts:832-899 directly. Both classes have the identical constructor (bindTarget, currentValue), identical eq(), identical ignoreEvent(), and a toDOM that only forwards a different opts object to the shared buildMetaBindTextInput (widgets.ts:941) — {type:'number',validate:isNumericString,invalidMessage:'Not a number'} vs {type:'date',validate:isDateString,invalidMessage:'Use YYYY-MM-DD'}. Only construction sites are meta-bind-input-plugin.ts:108 and :110, so the merge touches two lines. No behavior lost — both would still produce the same input element. Recount: two ~30-line blocks (incl. jsdoc) collapse to one ~25-line class plus ~8 lines of opts moved to the two call sites, so ~25 net is honest.

### 25. `delete` `extract_wikilinks_from_str` in entry.rs — a second hand-rolled `[[target]]` byte scanner living in a file that already imports the real one

- **Path:** `src-tauri/src/vault/entry.rs:406`
- **Cut:** -23 lines | **Area:** rust + utils
- **Replacement:** `extract_outgoing_links(s).into_iter().map(|l| l.target).filter(|t| !t.is_empty()).collect()`

**Evidence**

```
`sed -n '12,16p' src-tauri/src/vault/entry.rs` shows entry.rs already does `use crate::vault::parsing::{extract_outgoing_links, ...}`. `extract_outgoing_links` (parsing.rs:803) performs the identical `[[`-scan plus the same `|` alias split and `#` heading split and the same `.trim()`; the local copy just discards alias/heading/position. Two independent wikilink parsers in the same module.
```

**Verification**

Confirmed the duplication: entry.rs:12-16 imports `extract_outgoing_links` from vault::parsing, and defines its own scanner at :406 used by 4 sites (:361, :365, :389, :393). Alias (`|`) and heading (`#`) splitting plus `.trim()` are identical in both. CAVEAT the original finding missed: the two are NOT byte-identical on one edge case — the local copy scans to the first `]]` pair (so `[[a]b]]` yields target `a]b`), while `extract_outgoing_links` mirrors the TS regex `[^\]]+?\]\]` and rejects any `]` inside the link. Since `]` is not a legal wikilink target character and parsing.rs is the canonical mirror of the TS behavior, the swap is safe, but the parent should note it is a behavior alignment, not a pure no-op. Line count corrected: the block is entry.rs:405-431 = 27 lines, and 4 call sites need a 4-line delegating wrapper to stay, so net saving is 23, not 28.

### 26. `delete` inbox-workflow.logic.ts: isInboxEnabled and shouldNewNoteBeUnorganized are identity functions (`return explicitOrganization`) and getInboxEntries is unused; only getInboxCount is live (one caller)

- **Path:** `src/lib/features/type-definitions/inbox-workflow.logic.ts:6`
- **Cut:** -22 lines | **Area:** features
- **Replacement:** nothing — file shrinks to the single 8-line getInboxCount

**Evidence**

```
`rg -l --word-regexp isInboxEnabled src -g '!src/tests/**'` → 1 (own file); same for getInboxEntries and shouldNewNoteBeUnorganized. `rg -n --word-regexp getInboxCount src -g '!src/tests/**'` → dock-badge.logic.ts:2,16 + definition. File is 37 lines.
```

**Verification**

cat -n on the 37-line file plus per-symbol grep confirms it: isInboxEnabled (7), getInboxEntries (15), shouldNewNoteBeUnorganized (35) each have exactly one prod hit (own definition); getInboxCount (22) is the only live export, imported by dock-badge.logic.ts:2 and called at :16. Both survivors of the identity pair literally `return explicitOrganization`. Line count corrected slightly: 3-9 (7) + 11-17 (7) + 30-37 (8) = 22, not 23.

### 27. `shrink` Three byte-identical copies of getRelativePath in features (search.logic.ts:146, quick-switcher.logic.ts:81, file-history.logic.ts:108), all duplicating core fs.logic.ts:239

- **Path:** `src/lib/features/search/search.logic.ts:146`
- **Cut:** -21 lines | **Area:** features
- **Replacement:** import { getRelativePath } from '$lib/core/filesystem/fs.logic' (note arg order is (vaultPath, filePath) there)

**Evidence**

```
`rg -n "export function getRelativePath" src/lib` → 4 definitions: quick-switcher.logic.ts:81, file-history.logic.ts:108, search.logic.ts:146, core/filesystem/fs.logic.ts:239. Bodies printed side by side with `rg -A6` are the same startsWith/slice/strip-leading-slash logic.
```

**Verification**

Confirmed 4 definitions via `rg -n -A8 'export function getRelativePath'`. search.logic:146-152 and quick-switcher.logic:81-87 are byte-identical; file-history.logic:108-117 is the same logic with flipped args. All three are LIVE (SearchResult.svelte:64, QuickSwitcher.svelte:82 + RelationshipSearch.svelte:79, file-history.service.ts:27/:115), so this is a dedup, not a delete — the finding states it as such. One correction the fix must carry: fs.logic's version tests `vaultPath + '/'` while the feature copies test the bare prefix and then strip, so consolidation changes behavior on sibling-prefix paths (/a/b vs /a/bc) — fs.logic's is the stricter one. Arg order must be flipped at 5 call sites. 21 lines (24 bodies minus 3 new imports) is honest.

### 28. `delete` `watch` feature on tauri-plugin-fs plus the `fs:allow-watch` / `fs:allow-unwatch` capability grants — the vault watcher is native Rust `notify`, the JS `watch()` API is never called

- **Path:** `src-tauri/Cargo.toml:24`
- **Cut:** -20 lines | **Area:** deps/build
- **Replacement:** nothing

**Evidence**

```
`grep -rn "watchImmediate\|unwatch\|watch(" src e2e --include='*.ts' --include='*.svelte' | grep -v test` -> single hit `e2e/mocks/tauri-fs.ts:35: export async function watch(` (an unused mock export). No production file imports `watch` from '@tauri-apps/plugin-fs'. The real watcher is `src-tauri/src/vault/watcher.rs` on the `notify` crate (`notify` = 5 qualified hits). Dead capability block is src-tauri/capabilities/default.json:223-242 (20 lines, verified with `grep -n "fs:allow-watch" -A 21`). Dropping the feature also drops the plugin's transitive notify + notify-debouncer-full.
```

**Verification**

Verified independently: no production import of `watch`/`unwatch` from '@tauri-apps/plugin-fs' (only src/tests mocks import other fs fns), no `invoke('plugin:fs|...')` string anywhere, and no Rust use of the plugin beyond `tauri_plugin_fs::init()` at src-tauri/src/lib.rs:268. The real watcher is src-tauri/src/vault/watcher.rs on the directly-declared `notify = "8"`. Not a user-facing cut. Line count corrected: the dead capability block is default.json:223-242 = 20 removed lines (the Cargo.toml line is edited, not deleted), so 21 -> 20. depsSaved 0 is right — `cargo tree -i notify` shows kokobrain depends on notify directly, so only notify-debouncer-full would drop.

### 29. `shrink` Seven single-range clamp wrappers in settings.logic.ts (`clampFontSize`, `clampLineHeight`, `clampContentWidth`, `clampParagraphSpacing`, `clampHeadingFontSize`, `clampHeadingLineHeight`, `clampHeadingLetterSpacing`), six of which are the identical `Math.max(min, Math.min(max, v))`.

- **Path:** `src/lib/core/settings/settings.logic.ts:3`
- **Cut:** -20 lines | **Area:** core
- **Replacement:** one `clamp(v, min, max)` in src/lib/utils; call sites pass their range (`clamp(size, 8, 32)`)

**Evidence**

```
grep -rnE "function (clamp)" src/lib/core/settings/settings.logic.ts → 7 definitions at lines 4, 9, 14, 20, 25, 30, 35 spanning lines 3-37. grep -rn clamp src/lib/utils --include="*.ts" → 0 hits (no shared helper exists yet). Each has exactly 1 production call site (grep -w per name, excluding src/tests and the defining file → 2 hits each = import + use).
```

**Verification**

Confirmed by reading settings.logic.ts:3-37. Six are the identical two-arg pattern; clampContentWidth (:13-17) has an extra `if (width <= 0) return 0;` zero-sentinel and would keep a bespoke line. Each has exactly one production call site: clampFontSize/LineHeight/ContentWidth/ParagraphSpacing at EditorSection.svelte:104,127,150,173; the three heading ones at HeadingTypographyEditor.svelte:62,75,100. `grep -rn clamp src/lib/utils` = 0 hits, so no shared helper exists to collide with. Single-use named wrappers over a stdlib two-liner is squarely in scope. linesSaved corrected 22 → 20: six 4-line blocks (24) minus a 4-line shared clamp helper, with clampContentWidth's sentinel moving inline at its call site.

### 30. `delete` `sanitizeMathHtml` — an exported KaTeX/MathML DOMPurify config that no caller uses; the two math widgets call `DOMPurify.sanitize(raw)` directly

- **Path:** `src/lib/utils/sanitize.ts:57`
- **Cut:** -20 lines | **Area:** rust + utils
- **Replacement:** nothing

**Evidence**

```
`grep -rn "sanitizeMathHtml" src scripts` → 1 hit, the definition at `src/lib/utils/sanitize.ts:57`. Zero production callers, zero test callers (every other export in sanitize.ts has both). Meanwhile `block-math-widget.ts:44` and `inline-math-widget.ts:38` each do their own `import DOMPurify from 'dompurify'` + bare `DOMPurify.sanitize(raw)`.
```

**Verification**

Re-verified: `grep -rn sanitizeMathHtml src scripts` = 1 hit, the definition. Confirmed the two math widgets bypass it — inline-math-widget.ts:3/:38 and block-math-widget.ts:3/:44 each import dompurify directly and call bare `DOMPurify.sanitize(raw)`. Dead export, in scope as such. Explicitly NOT scoring the security angle (that the widgets arguably should use the tighter allowlist) — that would be an addition, not an over-engineering cut, and is out of scope. dompurify stays (used by the widgets and other sanitize.ts exports), depsSaved 0. Line count corrected: the block is sanitize.ts:53-72 = 20 lines, not 22.

### 31. `delete` lifecycle-filter.logic.ts: excludeArchived, onlyArchived, countArchived unused; only buildArchivedPathSet has a caller

- **Path:** `src/lib/features/properties/lifecycle-filter.logic.ts:3`
- **Cut:** -18 lines | **Area:** features
- **Replacement:** nothing — 29-line file collapses to one 7-line function

**Evidence**

```
`rg -l --word-regexp excludeArchived src -g '!src/tests/**'` → 1 (own file); same for onlyArchived, countArchived. `rg -n --word-regexp buildArchivedPathSet src -g '!src/tests/**'` → lifecycle-filter.service.ts:3,9 only. `wc -l` = 29.
```

**Verification**

cat -n on the 29-line file plus grep: excludeArchived (4), onlyArchived (9), countArchived (23) each return exactly one prod hit, their own definition. buildArchivedPathSet (14) is the sole live export — lifecycle-filter.service.ts:3 imports it and :9 calls it. Line count verified: 3-6 (4) + 8-11 (4) + 22-29 (8) plus separating blanks = 18. Confirmed.

### 32. `yagni` getPeriodicNoteTitle / getTemplatePathForPeriod / getDailyInlineTemplate are one-line property reads wrapped as exported 'logic' functions with a single production caller each

- **Path:** `src/lib/plugins/periodic-notes/periodic-notes.logic.ts:82`
- **Cut:** -18 lines | **Area:** plugins
- **Replacement:** inline: date.format(format), settings[periodType].templatePath, settings.daily.template

**Evidence**

```
grep -rn per symbol excluding src/tests: getPeriodicNoteTitle -> declaration (:82) + import and one call in periodic-notes.service.ts (:13, :39); getTemplatePathForPeriod -> declaration (:103) + one call (service.ts:40); getDailyInlineTemplate -> declaration (:110) + one call (service.ts:41). Bodies are `return date.format(format)`, `return settings[periodType].templatePath`, `return settings.daily.template`.
```

**Verification**

Grep excluding src/tests confirms exactly one production consumer each, all in the same feature folder: getPeriodicNoteTitle -> :82 declaration + periodic-notes.service.ts:13 import + :39 call; getTemplatePathForPeriod -> :103 + service.ts:11/:40; getDailyInlineTemplate -> :110 + service.ts:12/:41. Bodies are `return date.format(format)`, `return settings[periodType].templatePath`, `return settings.daily.template`. ADR-0004 does not shield these - it scopes `.logic.ts` to 'real pure logic exists (parsing, transformations, validations)' and explicitly warns 'resist extracting preemptively'; a property read is none of those. (Contrast getFormatForPeriod at :96, correctly left out of the finding since detectPeriodicNoteType at :315 gives it a second caller.) Spans 79-84, 100-105, 107-112 = 18 lines. Confirmed as claimed.

### 33. `delete` `VaultSearchMatch` interface — the TS mirror of the dead `search_vault` command's return type

- **Path:** `src/lib/core/filesystem/fs.types.ts:40`
- **Cut:** -17 lines | **Area:** rust + utils
- **Replacement:** nothing

**Evidence**

```
`grep -rn "VaultSearchMatch" src` → 1 hit, the declaration at `src/lib/core/filesystem/fs.types.ts:40`. Its own doc comment says "from the Rust search_vault command", which is itself dead (see the search_vault finding). The live search path uses the unrelated `SearchMatch` in `src/lib/features/search/search.types.ts:7`.
```

**Verification**

Re-verified: `grep -rn VaultSearchMatch src` = 1 hit, the declaration itself. Not exported through any barrel, not referenced in tests. Its own doc comment at :39 names `search_vault`, which I independently confirmed dead above. The live search path uses a different type. Read the block: doc comment at :39 plus interface :40-56 = 18 lines; I'll keep the conservative 17 the finding claimed.

### 34. `stdlib` `find_triple_backtick(bytes, start)` — a 14-line manual byte loop looking for three consecutive backticks

- **Path:** `src-tauri/src/vault/parsing.rs:967`
- **Cut:** -16 lines | **Area:** rust + utils
- **Replacement:** `content[start..].find("```").map(|i| i + start)` (or `bytes[start..].windows(3).position(|w| w == b"```")`)

**Evidence**

```
`grep -n "find_triple_backtick" src-tauri/src/vault/parsing.rs` → 3 hits: definition at :967 and two call sites at :942 and :948, both inside the same fence-scanning loop where a `&str` slice is available. `str::find` uses a substring search rather than the naive byte-by-byte walk written here.
```

**Verification**

Re-read the function and both call sites. It really is a naive byte walk, and stdlib covers it two ways. Verified the enclosing fn `strip_non_body_content(content: &str)` has the `&str` in scope (parsing.rs:818), and both call sites' `start` offsets are ASCII-aligned (0, or a backtick offset +3), so `content[search_from..].find("```").map(|i| i + search_from)` cannot panic on a char boundary; `bytes[start..].windows(3).position(|w| w == b"```")` works too. Semantics match exactly, including the empty/short-input case. Line count corrected UPWARD, not down: doc comment 3 lines + fn 13 lines = 16 removed, call sites stay one-liners. The finding under-claimed at 12.

### 35. `delete` extractAliasesFromContent in the wikilink completion logic — no completion path calls it

- **Path:** `src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:118`
- **Cut:** -15 lines | **Area:** live-preview
- **Replacement:** nothing

**Evidence**

```
`grep -rn 'extractAliasesFromContent' src src-tauri/src scripts` → 9 hits, 8 of them in src/tests/.../completion.logic.test.ts and 1 the declaration at completion.logic.ts:118. Dead production code, kept alive only by its own test block (test lines 227-259).
```

**Verification**

`grep -rn 'extractAliasesFromContent' src src-tauri/src scripts` → 9 hits: 8 in src/tests/.../completion.logic.test.ts and 1 declaration at completion.logic.ts:118. No completion path calls it; alias handling for the wikilink autocomplete does not route through it. Bonus not in the original count: line 119 is the ONLY use of parseFrontmatterProperties in the file, so the import at line 4 dies too. Recount by reading the block: jsdoc + function = 14 lines, +1 import = 15, not 18.

### 36. `delete` 5 exported Decoration constants in styles.ts with no producer (inline marks moved to the HighlightStyle), plus the `.cm-lp-codeblock-line` and `.cm-lp-hard-break` CSS rules whose class names nothing emits

- **Path:** `src/lib/core/markdown-editor/extensions/live-preview/styles.ts:4`
- **Cut:** -14 lines | **Area:** live-preview
- **Replacement:** nothing

**Evidence**

```
Export sweep: boldTextDeco, italicTextDeco, strikethroughTextDeco, inlineCodeTextDeco, codeBlockLineDeco each return exactly 1 non-test hit (their own declaration) from `grep -rn "\b<name>\b" src src-tauri/src | grep -v /src/tests/`. The `.cm-lp-bold/italic/code/strikethrough` CSS rules must stay — inline/markdown-highlight-style.ts:16-19 emits those classes via HighlightStyle. But `grep -rn 'cm-lp-codeblock-line' src | grep -v tests` → only styles.ts:11 (the dead deco) and styles.ts:284 (the rule), and `grep -rn 'cm-lp-hard-break' src src-tauri/src` → only styles.ts:243; the live class is `cm-formatting-hard-break` (simple-widget-handlers.ts:108).
```

**Verification**

Verified each: boldTextDeco, italicTextDeco, strikethroughTextDeco, inlineCodeTextDeco, codeBlockLineDeco each return exactly 1 non-test hit, their own declaration at styles.ts:4,5,7,8,11. cm-lp-codeblock-line only appears at styles.ts:11 (the dead deco) and styles.ts:284 (the rule); the live code-block class is cm-lp-codeblock at styles.ts:288. cm-lp-hard-break only at styles.ts:243; the emitted class is cm-formatting-hard-break (simple-widget-handlers.ts:108, styled at styles.ts:85/88). Correctly scoped: the finding explicitly KEEPS the .cm-lp-bold/italic/code/strikethrough CSS rules, which inline/markdown-highlight-style.ts still emits — so no visual regression. Line recount by reading: 5 deco lines + rule 243-247 (5) + rule 284-287 (4) = 14 exactly.

### 37. `shrink` heatmapCalendar() and yearlyCalendar() open with the same ~44-line intensity-resolution preamble (year filter, min/max intensity, scale start/end, color-array lookup, mapRange bucketing, dark-mode empty color)

- **Path:** `src/lib/plugins/queryjs/kb-ui.ts:646`
- **Cut:** -14 lines | **Area:** plugins
- **Replacement:** one private helper resolveCalendarEntries(entries, options) returning {mapped, colors, emptyColor}, called by both

**Evidence**

```
diff <(sed -n '649,692p' kb-ui.ts) <(sed -n '816,856p' kb-ui.ts) shows only 4 hunks; comm -12 on the sorted blocks reports 33 identical lines out of ~44. Duplicated verbatim: the `colors` default object, showCurrentDayBorder, defaultEntryIntensity, the calEntries year filter, intensities/minIntensity/maxIntensity/scaleStart/scaleEnd block, firstColorKey, the `if (minIntensity === maxIntensity && scaleStart === scaleEnd)` / KBUI.mapRange branch, and the isDark/emptyColor pair.
```

**Verification**

Duplication is real - I read :646-700 and :813-865 side by side and the following are verbatim in both: the `colors` default object (5 lines), showCurrentDayBorder, defaultEntryIntensity, the `year` default, the 4-line calEntries year filter, the 5-line intensities/minIntensity/maxIntensity/scaleStart/scaleEnd block, firstColorKey, the intensity/colorArr/numLevels + `if (minIntensity === maxIntensity && scaleStart === scaleEnd)` / KBUI.mapRange branch inside the loop, and the isDark/emptyColor pair - about 28 identical lines. But linesSaved 28 is the GROSS duplicate, not the net: the fix ADDS an abstraction. The two loops key differently (dayOfYear via KBUI.getDayOfYear vs `${month}-${day}`) and store different record shapes, and weekStartDay exists only in heatmapCalendar, so the helper must return a per-entry resolved list plus the colors/emptyColor bag and each caller keeps its own keying loop. 56 duplicated lines become a ~32-line helper plus ~5 lines of destructuring at each site, i.e. net ~14.

### 38. `yagni` calendar.service.ts openCalendarFile() is a pure rename of openFileInEditor, and openOrCreateDailyNoteForDate() a one-line partial application - each with one caller in the same feature

- **Path:** `src/lib/plugins/calendar/calendar.service.ts:124`
- **Cut:** -14 lines | **Area:** plugins
- **Replacement:** call openFileInEditor(filePath) and openOrCreatePeriodicNoteForDate('daily', dateKey) directly from CalendarPanel.svelte

**Evidence**

```
grep -rn 'openCalendarFile|openOrCreateDailyNoteForDate' src | grep -v '^src/tests' -> declarations at calendar.service.ts:124 and :131, plus a single import and a single call site each in CalendarPanel.svelte (:13, :122, :135). Bodies: `await openFileInEditor(filePath)` and `await openOrCreatePeriodicNoteForDate('daily', dateKey)`.
```

**Verification**

Verified with a repo-wide grep: openCalendarFile -> declaration at calendar.service.ts:131, import at CalendarPanel.svelte:13, one call at CalendarPanel.svelte:135; body is `await openFileInEditor(filePath)`. openOrCreateDailyNoteForDate -> declaration at :124, same single import, one call at CalendarPanel.svelte:122; body is `await openOrCreatePeriodicNoteForDate('daily', dateKey)`. Neither is dynamically imported (no `import * as` of calendar.service anywhere) and neither is a public API. Note the sibling openOrCreatePeriodicNoteForDate at :116 is NOT in this finding and correctly is not - it has 3 call sites and does real dayjs parsing. Recount: lines 120-133 = 14 lines removed plus the now-orphaned openFileInEditor import at :1, minus one import line added to CalendarPanel = 14 net, slightly above the claimed 11.

### 39. `delete` The entire file-tree sort-option feature: `changeSortOption`, the `sortVersion` counter, the `expectedSortVersion` optional param + staleness guard on `loadDirectoryTree`/`refreshTree`, and `fsStore.setSortBy`. No UI ever changes the sort, so `fsStore.sortBy` is permanently the literal 'name'.

- **Path:** `src/lib/core/filesystem/fs.service.ts:333`
- **Cut:** -13 lines | **Area:** core
- **Replacement:** nothing — pass `sortBy: 'name'` literally to the two `scan_vault` invokes; drop the version params

**Evidence**

```
grep -rn -w "changeSortOption" src | grep -v '^src/tests/' → 1 hit (the definition, fs.service.ts:337); 16 hits in src/tests only. grep -rn -w "setSortBy" src | grep -v '^src/tests/' → 2 hits: the store definition (fs.store.svelte.ts:46) and the dead changeSortOption (fs.service.ts:338). grep -rn "SortOption" src --include="*.svelte" | grep -v '^src/tests/' → 0 hits (no UI). Every one of the 14 production `refreshTree(...)` call sites passes no argument except fs.service.ts:340 inside the dead function.
```

**Verification**

Confirmed. `grep -rn -w changeSortOption src | grep -v ^src/tests/` = 1 hit (the definition, fs.service.ts:337). setSortBy outside tests = 2 hits: store definition fs.store.svelte.ts:46 and the dead changeSortOption. Zero .svelte files reference SortOption. Both `scan_vault` call sites (fs.service.ts:84, fs.watcher.ts:175) read fsStore.sortBy, which is initialized 'name' (fs.store.svelte.ts:18) and reset to 'name' (:85) — so it is provably always 'name' in production. No user-facing feature is lost: there is no UI to change the sort. linesSaved corrected 20 → 13: changeSortOption block fs.service.ts:333-341 (9 incl. doc/comment), the guard at :89-90 (2), setSortBy (1), `sortVersion = 0;` in resetFileSystem (1). The params themselves are 0 net lines and the SortOption type/sortTree stay for the store.

### 40. `delete` `removeThemeOverrides(theme)` in theme.service.ts — walks a theme's CSS vars and removes them from documentElement. Nothing in the app ever removes theme overrides.

- **Path:** `src/lib/core/settings/theme.service.ts:32`
- **Cut:** -12 lines | **Area:** core
- **Replacement:** nothing

**Evidence**

```
grep -rn --include="*.ts" --include="*.svelte" -w "removeThemeOverrides" src src-tauri/src scripts → 4 hits: the definition (theme.service.ts:32) and 3 in src/tests/lib/core/settings/theme.service.test.ts. Zero production callers.
```

**Verification**

Confirmed. `grep -rn --include=*.ts --include=*.svelte -w removeThemeOverrides src src-tauri/src scripts` = 4 hits: the definition at theme.service.ts:32 and 3 in src/tests/lib/core/settings/theme.service.test.ts. Zero production callers — dead PRODUCTION code exercised only by its own test. No dynamic-mount escape hatch applies (it is a plain exported function, not a component or Tauri command). Line count verified by reading theme.service.ts:28-39: 4-line docblock + 8-line body = 12. Accurate as filed.

### 41. `delete` HorizontalRuleWidget and its `.cm-lp-hr` CSS rule — horizontal rules are rendered CSS-only via `.cm-lp-hr-line`, so the widget never produces a decoration

- **Path:** `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:17`
- **Cut:** -12 lines | **Area:** live-preview
- **Replacement:** nothing

**Evidence**

```
`grep -rn 'HorizontalRuleWidget' src src-tauri/src scripts` → 1 hit total: widgets.ts:17, the class declaration. Not even a test constructs it. `grep -rn 'cm-lp-hr' src | grep -v tests` shows the only other consumer of that class is widgets.ts:20 inside the dead widget; the live path is `Decoration.line({class:'cm-lp-hr-line'})` at inline/handlers/simple-widget-handlers.ts:43. Widget block widgets.ts:17-23 (7 lines) + CSS styles.ts:167-171 (5 lines). Same file also has a dead re-export at widgets.ts:301 (`export { openWikilinkTarget }`) — every real importer takes it from ./wikilink-navigation directly.
```

**Verification**

`grep -rn 'HorizontalRuleWidget' src src-tauri/src scripts` → 1 hit, the class declaration at widgets.ts:17. cm-lp-hr appears only at widgets.ts:20 (inside the dead widget) and styles.ts:167 (its rule); the live HR path is Decoration.line({class:'cm-lp-hr-line'}) at inline/handlers/simple-widget-handlers.ts:43, styled at styles.ts:75 — so horizontal rules keep rendering and no feature is lost. The bonus re-export claim also checks out: widgets.ts:301 re-exports openWikilinkTarget but the only external consumer, KanbanView.svelte:47, imports it from ./wikilink-navigation directly. Line recount: widget 17-23 (7) + CSS 167-171 (5) = 12 exactly.

### 42. `delete` todoist-bridge.logic.ts:41-52 mapPriorityFromTodoist — the inbound half of a bidirectional mapping; only mapPriorityToTodoist is used

- **Path:** `src/lib/features/tasks/todoist-bridge.logic.ts:41`
- **Cut:** -12 lines | **Area:** features
- **Replacement:** nothing

**Evidence**

```
`rg -l --word-regexp mapPriorityFromTodoist src -g '!src/tests/**'` → 1 (own file, definition only). The v3 dead-export sweep flagged it with ext=0 and int=0.
```

**Verification**

`rg -n --word-regexp mapPriorityFromTodoist src src-tauri/src --glob '!src/tests/**'` → 1 hit, the definition at :41. No internal caller in the file either. Read the block: 41-52 is the switch, and the 6-line ASCII priority table above it (35-40) goes with it, so 12 is if anything conservative. Accepting 12 as stated.

### 43. `delete` frontmatter-icon.service.ts:49-59 setFrontmatterIconColor — writes _color to frontmatter; no caller anywhere, not even a test

- **Path:** `src/lib/features/file-icons/frontmatter-icon.service.ts:49`
- **Cut:** -11 lines | **Area:** features
- **Replacement:** nothing

**Evidence**

```
`rg -l --word-regexp setFrontmatterIconColor src -g '!src/tests/**'` → 1 (own file); `rg -l --word-regexp setFrontmatterIconColor src/tests` → 0 files. Zero references of any kind.
```

**Verification**

`rg -n --word-regexp setFrontmatterIconColor src src-tauri/src` (tests INCLUDED this time) → 1 hit total, the definition at :50. Read 44-62: it is a copy of the neighbouring _icon writer with the key swapped to _color; the live neighbours (setFrontmatterIcon above, removeFrontmatterIcon below, which does clear _color) cover the feature, so no user-facing path is lost. Block 49-59 with docline = 11. Confirmed.

### 44. `delete` `clearRecentSaves(paths)` in editor.hooks.ts — the watcher was supposed to call it after consuming self-save markers, but nothing does; the 15s RECENT_SAVE_TIMEOUT_MS timer is the only path that clears entries.

- **Path:** `src/lib/core/editor/editor.hooks.ts:86`
- **Cut:** -10 lines | **Area:** core
- **Replacement:** nothing

**Evidence**

```
grep -rn --include="*.ts" --include="*.svelte" -w "clearRecentSaves" src src-tauri/src scripts → 5 hits: definition (editor.hooks.ts:86), 3 in src/tests/lib/core/editor/editor.hooks.test.ts, and a stale `clearRecentSaves: vi.fn()` mock entry in src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts:20. Contrast the sibling `areAllRecentSaves`, which has a real caller at watcher-handler.service.ts:46.
```

**Verification**

Confirmed. Outside src/tests/ there is exactly 1 hit, the definition at editor.hooks.ts:86. I checked every production importer of editor.hooks (11 files): they import markRecentSave, areAllRecentSaves, addAfterSaveObserver, notifyAfterSave, resetHooks — never clearRecentSaves. The sibling areAllRecentSaves does have a real consumer (watcher-handler.service.ts:6), which confirms the watcher path was wired for reads but never for the clear. The RECENT_SAVE_TIMEOUT_MS timer (editor.hooks.ts:~60) remains the only live eviction path. Line count verified: doc at :85 + body :86-94 = 10. Accurate as filed.

### 45. `delete` stripCardDate and stripCardColor are byte-identical duplicates of removeCardDate / removeCardColor, and both strip* variants are test-only

- **Path:** `src/lib/plugins/kanban/kanban.logic.ts:472`
- **Cut:** -10 lines | **Area:** plugins
- **Replacement:** nothing - callers already use removeCardDate / removeCardColor / stripCardMetadata

**Evidence**

```
stripCardDate total=7 tests=6 (only hit outside tests is the declaration); stripCardColor total=6 tests=5. Bodies are identical: removeCardDate(:467) and stripCardDate(:472) are both `text.replace(DATE_IN_BRACES_RE, '').replace(/\s{2,}/g, ' ').trim()`; removeCardColor(:511) and stripCardColor(:516) are both `text.replace(COLOR_IN_BRACES_RE, '').replace(/\s{2,}/g, ' ').trim()`.
```

**Verification**

Confirmed by reading :460-525: removeCardDate (:467-469) and stripCardDate (:472-474) are both `text.replace(DATE_IN_BRACES_RE,'').replace(/\s{2,}/g,' ').trim()`; removeCardColor (:510-512) and stripCardColor (:515-517) are identically paired. grep across src/src-tauri/src/scripts excluding src/tests: stripCardDate and stripCardColor return only their declarations, while the three real consumers (KanbanCard.svelte:10/129/138, KanbanListView.svelte, KanbanTableView.svelte) import removeCardDate/removeCardColor/stripCardMetadata only. These are internal feature helpers, not a public scripting surface, so nothing user-facing is lost. Count: 2 x (JSDoc + signature + body + brace + blank) = 10. Confirmed.

### 46. `delete` `get_search_index_stats` — registered command returning the FTS document count; nothing asks for it

- **Path:** `src-tauri/src/commands/search_index.rs:200`
- **Cut:** -10 lines | **Area:** rust + utils
- **Replacement:** nothing (the `IndexStats` struct stays — `build_search_index` returns it)

**Evidence**

```
`grep -rn "'get_search_index_stats'" src/lib src/routes` → 0. Full-tree `grep -rn "get_search_index_stats" src scripts src-tauri/src` → 2 hits: `lib.rs:321` (registration) and `commands/search_index.rs:200` (definition). No test reference either.
```

**Verification**

Re-verified: `grep -rn get_search_index_stats src src-tauri/src scripts` = 2 hits, lib.rs:321 (registration) and search_index.rs:200 (definition). Zero frontend invokes, zero tests, and no dynamic invoke path exists in the codebase. Confirmed the finding's own caveat is right: `IndexStats` must stay because `build_search_index` returns it, and `db::fts_repo::count_entries` has other callers. Read the block: doc comment + attribute + 7-line fn = 10 lines, not 11.

### 47. `yagni` `shouldAutoCheckNow(autoCheck) { return autoCheck; }` — an identity function with one internal caller, carrying a 13-line docblock that explicitly justifies its own existence ("kept as a named function ... so the unit tests can cover the trivial cases").

- **Path:** `src/lib/core/settings/update-check.service.ts:39`
- **Cut:** -9 lines | **Area:** core
- **Replacement:** `if (!autoCheck) return;` inline in maybeAutoCheckForUpdates

**Evidence**

```
grep -rn --include="*.ts" --include="*.svelte" -w "shouldAutoCheckNow" src src-tauri/src scripts | grep -v '^src/tests/' → 2 hits, both inside update-check.service.ts (definition at :39, sole call at :59). Body is `return autoCheck;`. The other 4 hits are src/tests/lib/core/settings/update-check.service.test.ts asserting true→true and false→false.
```

**Verification**

Confirmed. Outside src/tests/ there are exactly 2 hits, both inside update-check.service.ts: the definition at :39 and the sole call at :59 (`if (!shouldAutoCheckNow(autoCheck)) return;`). Body verified as `return autoCheck;`. The docblock literally self-justifies ("Kept as a named function so the rest of the service can pass the boolean intent through one chokepoint and the unit tests can cover the trivial cases") — a test-only reason to keep an identity function. Not in any ADR. linesSaved corrected 16 → 9: the function is 3 lines and the 14-line docblock is not all disposable — the no-throttle rationale and the lastCheckedAt note are genuine context that must move to maybeAutoCheckForUpdates' own docblock. Only the header line, the "Kept as a named function" paragraph, and the body actually disappear.

### 48. `stdlib` `split_key_value` — 9 lines to split a `key: value` line on the first colon

- **Path:** `src-tauri/src/vault/parsing.rs:657`
- **Cut:** -9 lines | **Area:** rust + utils
- **Replacement:** `line.split_once(':').filter(|(k, _)| !k.trim().is_empty()).map(|(k, v)| (k.trim(), v))`

**Evidence**

```
`grep -n "split_key_value" src-tauri/src/vault/parsing.rs` → 2 hits: definition at :657 and exactly one caller at :599. The body is `line.find(':')?` then two manual slices — literally what `str::split_once` returns.
```

**Verification**

Re-read the body: `line.find(':')?` + two manual slices + an empty-key guard. That is `str::split_once(':')` verbatim. Exactly one caller (parsing.rs:599, the `let ... else` in the frontmatter loop). Verified the proposed replacement preserves both quirks — key trimmed, value left untrimmed, `None` on empty-after-trim key: `line.split_once(':').filter(|(k, _)| !k.trim().is_empty()).map(|(k, v)| (k.trim(), v))`. Line count corrected: the block is parsing.rs:655-664 = 10 lines (2 doc + 8 fn); the call site grows by ~1 line when inlined, so net 9, not 6.

### 49. `delete` `isValidFolderName(name)` in settings.logic.ts — path-traversal validator for vault-relative folder settings, never called by any settings section or service.

- **Path:** `src/lib/core/settings/settings.logic.ts:40`
- **Cut:** -8 lines | **Area:** core
- **Replacement:** nothing

**Evidence**

```
grep -rn --include="*.ts" --include="*.svelte" -w "isValidFolderName" src src-tauri/src scripts → 14 hits: the definition (settings.logic.ts:40) and 13 in src/tests/lib/core/settings/settings.logic.test.ts. Zero production callers. (Note: this is validation-shaped code, but it guards nothing today — no input path routes through it.)
```

**Verification**

Confirmed. Outside src/tests/ there is exactly 1 hit, the definition at settings.logic.ts:40. Worth flagging that this is validation-shaped code and the skeptic rules say never to simplify away trust-boundary validation — but it guards nothing today: no settings section, service, or Tauri invoke routes a folder-name input through it, and the real path-traversal defense lives Rust-side per ADR 0020 (canonicalize + starts_with in read_files_batch) plus utils/path.ts resolveFilePath, which throws on escape. So deleting it removes no active guard. Line count corrected 9 → 8: doc at :39 + body :40-46 = 8.

### 50. `delete` tag-colors.logic.ts:30-37 getContrastTextColor — perceived-brightness contrast picker with no consumer (TagColorPicker.svelte uses only TAG_COLOR_PRESET_ENTRIES/getTagColor/setTagColor)

- **Path:** `src/lib/features/tags/tag-colors.logic.ts:30`
- **Cut:** -8 lines | **Area:** features
- **Replacement:** nothing

**Evidence**

```
`rg -l --word-regexp getContrastTextColor src -g '!src/tests/**'` → 1 (own file). `rg -n --word-regexp TAG_COLOR_PRESET_ENTRIES src -g '!src/tests/**'` → TagColorPicker.svelte:5,46,57 — the picker never asks for a text color.
```

**Verification**

Verified by the orchestrator (the skeptic never returned a verdict for it). `grep -rn getContrastTextColor src src-tauri/src scripts` -> 10 hits: 9 in src/tests/lib/features/tags/tag-colors.logic.test.ts, 1 the declaration at tag-colors.logic.ts:30. Zero production callers.

### 51. `shrink` Four separate copies of the same basename one-liner in core: `getFileName` in editor.logic.ts, `getFileName` in fs.logic.ts (byte-identical bodies), `extractVaultName` in vault.logic.ts, and `extractNoteName` in link-updater.logic.ts (identical to `getNoteName` in features/backlinks). src/lib/utils/path.ts already exists as the home for this.

- **Path:** `src/lib/core/editor/editor.logic.ts:18`
- **Cut:** -6 lines | **Area:** core
- **Replacement:** one `basename(p)` and one `stem(p)` in src/lib/utils/path.ts; the 4 core copies import them

**Evidence**

```
grep -rnE "export function (getFileName|getNoteName|extractNoteName|extractVaultName)" src/lib → 5 definitions: editor/editor.logic.ts:18, filesystem/fs.logic.ts:47, filesystem/link-updater.logic.ts:12, vault/vault.logic.ts:14, features/search/search.logic.ts:154 (+ features/backlinks/backlinks.logic.ts:59 getNoteName). Bodies of editor.logic.ts:18 and fs.logic.ts:47 are identical: `return path.split('/').pop() ?? path;`. link-updater.extractNoteName and backlinks.getNoteName are identical 3-line stem extractors. `ls src/lib/utils` shows path.ts already exists (normalizePath, resolveFilePath).
```

**Verification**

Duplication confirmed by reading the bodies. editor.logic.ts:18-20 and fs.logic.ts:47-49 are byte-identical (`return path.split('/').pop() ?? path;`), vault.logic.ts:14-16 is the same expression under a domain name, and link-updater.logic.ts:12-16 is character-for-character identical to features/backlinks/backlinks.logic.ts:59-63. src/lib/utils/path.ts exists and already owns string-only path work (normalizePath, resolveFilePath) with zero framework imports, so it is the correct home. Bonus the finding missed: features/search/search.logic.ts:154 exports a `getFileName` that actually strips the extension — same name, different semantics from the two core `getFileName`s, which is the concrete hazard the dedup removes. linesSaved corrected 15 → 6: the four core definitions total ~19 lines with docs, but a shared basename() + stem() in path.ts costs ~9 and the import lines fold into existing blocks. Net is small but real.

### 52. `native` Hand-rolled local YYYY-MM-DD formatting duplicated in collection/calendar.logic.ts:174 (formatDateKey) and file-history/file-history.logic.ts:175 (toDateKey), 5 lines of getFullYear/padStart each

- **Path:** `src/lib/features/collection/calendar.logic.ts:174`
- **Cut:** -6 lines | **Area:** features
- **Replacement:** dayjs(date).format('YYYY-MM-DD') — dayjs is already a dependency and plugins/calendar/calendar.logic.ts:75 already implements toDateKey exactly that way in one line

**Evidence**

```
`sed -n '172,180p' collection/calendar.logic.ts` and `sed -n '174,181p' file-history.logic.ts` show identical 5-line bodies; `sed -n '75,82p' plugins/calendar/calendar.logic.ts` shows `return dayjs(date).format('YYYY-MM-DD');`. `rg -ln "from 'dayjs'" src/lib` confirms dayjs is already imported in 10 files including features/type-definitions and features/deep-link.
```

**Verification**

Read all three: collection/calendar.logic.ts:174-179 and file-history.logic.ts:175-180 are byte-identical 5-line getFullYear/getMonth/getDate + padStart bodies; plugins/calendar/calendar.logic.ts:75 does the same job in one line with dayjs, and dayjs is a first-party dep (package.json:62). Two corrections. (1) The 'native' tag is imprecise — dayjs is a dependency, not a platform feature; the actual native one-liner is `date.toLocaleDateString('en-CA')`, which yields local-time YYYY-MM-DD with no dep at all. (2) Line count: 2 x 4 body lines = 8 minus 2 new import lines = 6 net.

### 53. `stdlib` hand-rolled local-time `YYYY-MM-DDThh:mm:ss` formatter (a `pad` helper plus a 4-line template-literal array join)

- **Path:** `vite.config.js:22`
- **Cut:** -5 lines | **Area:** deps/build
- **Replacement:** `const buildTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19);`

**Evidence**

```
`grep -n "const now = new Date" -A 6 vite.config.js` shows lines 22-27: `const pad = (n) => String(n).padStart(2,"0")` plus a 4-line array/join producing exactly `YYYY-MM-DDThh:mm:ss`. `buildTime` is passed opaquely into `formatBuildInfo` (src/lib/utils/build-info.js) which only interpolates it into a display string, so the identical output from `Date.prototype.toISOString().slice(0,19)` is a drop-in.
```

**Verification**

Read the block myself: lines 22-27 are exactly `const now`, `const pad`, and a 4-line array/join — 6 lines producing `YYYY-MM-DDThh:mm:ss` in local time. `buildTime` flows only into formatBuildInfo (src/lib/utils/build-info.js:62) which interpolates it into a display string, so output shape is the only contract and the timezone-offset + toISOString().slice(0,19) one-liner reproduces it exactly (offset in minutes, positive west of UTC, shifts the UTC rendering onto local wall time). Runs in Node at config load, so no jsdom/polyfill concern. linesSaved corrected 6 -> 5 (6 lines become 1).

### 54. `delete` `flushPendingSaves()` in editor.service.ts — flushes the two autosave debounce timers. No production code calls it; app-close/vault-switch use `saveAllDirtyTabs` instead.

- **Path:** `src/lib/core/editor/editor.service.ts:192`
- **Cut:** -5 lines | **Area:** core
- **Replacement:** nothing

**Evidence**

```
grep -rn --include="*.ts" --include="*.svelte" -w "flushPendingSaves" src src-tauri/src scripts → 4 hits: the definition (editor.service.ts:192) and 3 in src/tests/lib/core/editor/editor.service.test.ts (lines 70, 403, 417). Zero production callers.
```

**Verification**

Confirmed. Outside src/tests/ there is exactly 1 hit, the definition at editor.service.ts:192. Body verified at :192-195 as two .flush() calls on debouncedSaveFrontmatter/debouncedSave. The app-close and vault-switch paths use saveAllDirtyTabs (defined immediately below at :197+, doc says "Used before app close or vault switch"), so no lifecycle path depends on it. CLAUDE.md's Indexing §7 documents the two-timer debounce design itself as intentional, but says nothing about an external flush entry point — the timers and their cancel-each-other behavior are untouched by this cut. Line count verified: doc + 4-line body = 5. Accurate as filed.

### 55. `delete` `closeVault()` in vault.service.ts — a 3-line wrapper that only forwards to `vaultStore.close()`, with no callers at all.

- **Path:** `src/lib/core/vault/vault.service.ts:38`
- **Cut:** -5 lines | **Area:** core
- **Replacement:** nothing (callers, if ever added, call vaultStore.close() directly)

**Evidence**

```
grep -rn --include="*.ts" --include="*.svelte" -w "closeVault" src src-tauri/src scripts → 4 hits: the definition (vault.service.ts:38) and 3 in src/tests/lib/core/vault/vault.service.test.ts. Zero production callers, and the body is `vaultStore.close();`.
```

**Verification**

Confirmed. Outside src/tests/ there is exactly 1 hit, the definition at vault.service.ts:38. Read the body at :37-40: doc line plus `vaultStore.close();` — a pure delegation with zero added behavior and zero callers, so it is not even serving as a service-layer chokepoint. No .svelte file mounts or dispatches it. Line count verified as 4-5 including the docblock; the filed 5 is honest.

### 56. `delete` `Reranker::with_batch_size` — a builder override for `batch_size` that no caller ever chains

- **Path:** `src-tauri/src/semantic/reranker.rs:91`
- **Cut:** -5 lines | **Area:** rust + utils
- **Replacement:** nothing (keep the `DEFAULT_BATCH_SIZE` set in the constructor)

**Evidence**

```
`grep -rn "with_batch_size" src-tauri/src src-tauri/tests` → 2 hits: the definition at `src/semantic/reranker.rs:91` and a *comment* in `tests/semantic_reranker_test.rs:4` saying the test cannot construct a `Reranker`. `grep -n batch_size src/semantic/reranker.rs` shows the field is only ever written by the constructor (line 86, `Self::DEFAULT_BATCH_SIZE`) and read at line 108.
```

**Verification**

Re-verified: `grep -rn with_batch_size src-tauri/src src-tauri/tests` = 2 hits — the definition at reranker.rs:91 and a `//!` comment at tests/semantic_reranker_test.rs:4 stating the test cannot construct a `Reranker`. A comment is not a call. Read the surrounding code: `batch_size` is written once in the constructor (reranker.rs:86, `Self::DEFAULT_BATCH_SIZE`) and read once at :108 (`documents.chunks(self.batch_size)`), so the field stays and only the builder goes. Classic unused-flexibility. Line count corrected slightly: doc comment + 3-line fn + brace = 5 lines, not 4.

### 57. `delete` `getWatcherCounters()` in fs.watcher.ts — snapshot accessor for the watcher debug counters, read only by tests (the counters themselves are still logged by the internal `logCounters`).

- **Path:** `src/lib/core/filesystem/fs.watcher.ts:44`
- **Cut:** -4 lines | **Area:** core
- **Replacement:** nothing (tests can assert on watcher effects instead of instrumentation)

**Evidence**

```
grep -rn --include="*.ts" --include="*.svelte" -w "getWatcherCounters" src src-tauri/src scripts → 10 hits: the definition (fs.watcher.ts:44) and 9 in src/tests/lib/core/filesystem/fs.watcher.test.ts. Zero production callers.
```

**Verification**

Confirmed. Outside src/tests/ there is exactly 1 hit, the definition at fs.watcher.ts:44; the other 9 are all in src/tests/lib/core/filesystem/fs.watcher.test.ts. Dead PRODUCTION code — stated as such in the finding, which is the correct framing. The counters object and the internal logCounters() debug emitter (fs.watcher.ts:39-41) stay, so no observability is lost; only the test-only getter goes, and 9 test assertions would need rewriting against watcher effects. Unlike onFileChange, ADR 0017 does not mention the counters accessor anywhere — I grepped it. Line count verified as 4 (doc at :43 + body :44-46). Weakest surviving finding on payoff, but it holds.

### 58. `delete` core/types.ts — DecorationEntry has zero references and LineInfo just restates CodeMirror's own `Line` type (text/from/to/number)

- **Path:** `src/lib/core/markdown-editor/extensions/live-preview/core/types.ts`
- **Cut:** -4 lines | **Area:** live-preview
- **Replacement:** import `Line` from @codemirror/state in get-all-lines.ts and delete the file

**Evidence**

```
`grep -rn 'DecorationEntry' src src-tauri/src scripts` → 1 hit, types.ts:4 (the declaration). `grep -rn '\bLineInfo\b' src src-tauri/src scripts` → 4 hits, only types.ts:3 and get-all-lines.ts:2/5/6. get-all-lines.ts:8-9 already does `const line = state.doc.line(i)` and copies `line.text/from/to/number` into a fresh object — `Line` already has exactly those four fields, so `return Line[]` and drop the mapping.
```

**Verification**

`grep -rn 'DecorationEntry' src src-tauri/src scripts` → 1 hit, its own declaration at types.ts:4. LineInfo → 4 hits, only types.ts:3 and get-all-lines.ts:2/5/6. Checked the substitution actually works rather than taking it on faith: every downstream parser types the param structurally as `lines: {text:string; from:number; to:number}[]` (audio.ts:28, video.ts:28, comment.ts:48, frontmatter.ts:102, mermaid.ts:20, queryjs-block.ts:20, meta-bind-button.ts:20, collection-block.ts:20) — never `LineInfo` — so returning `Line[]` from getAllLines satisfies all 8+ call sites, and Line carries text/from/to/number plus a harmless extra length. This is TS-only, no jsdom/runtime API involved. 4 lines for the deleted file is honest.

### 59. `delete` search.logic.ts:154 getFileName is byte-identical to backlinks.logic.ts:59 getNoteName (split '/', strip extension)

- **Path:** `src/lib/features/search/search.logic.ts:154`
- **Cut:** -4 lines | **Area:** features
- **Replacement:** import { getNoteName } from '$lib/features/backlinks/backlinks.logic'

**Evidence**

```
`rg -n -A5 "export function getFileName" search.logic.ts` and `rg -n -A6 "export function getNoteName" backlinks.logic.ts` print the same 3-statement body. `rg -n "export function getFileName|export function getNoteName" src/lib` shows 4 name-stripping variants total (also core/editor/editor.logic.ts:18 and core/filesystem/fs.logic.ts:47, which keep the extension).
```

**Verification**

Bodies confirmed identical via `rg -n -A6` on both (split('/').pop() ?? path, lastIndexOf('.'), substring). Two corrections. (1) The 'delete' tag is wrong: search.logic's getFileName is LIVE, called internally at search.logic.ts:183, so this is a dedup with an import swap, not a removal — the stated replacement handles that. (2) The suggested import crosses feature folders (search -> backlinks), which sits against the CLAUDE.md 'each feature is self-contained' rule; the correct home is src/lib/utils/ or core/filesystem (note fs.logic.ts:47 and editor.logic.ts:18 already own two more name-stripping variants, so a single shared helper is the real fix). Net saving after adding the import line is 4, not 5.

### 60. `stdlib` `is_char_boundary(s, byte_pos)` free function that re-wraps the std method with two redundant guards

- **Path:** `src-tauri/src/vault/parsing.rs:1064`
- **Cut:** -4 lines | **Area:** rust + utils
- **Replacement:** `s.is_char_boundary(byte_pos)` — std already returns true for 0 and `s.len()` and false for out-of-range indices, so the `byte_pos == 0 || byte_pos == s.len() ||` prefix (and the `idx > content.len()` pre-check at the call site) are no-ops

**Evidence**

```
`grep -n "is_char_boundary" src-tauri/src/vault/parsing.rs` → definition at :1064-1065 (`byte_pos == 0 || byte_pos == s.len() || s.is_char_boundary(byte_pos)`) and two call sites at :1035 and :1046. Both call sites can inline `content.is_char_boundary(idx)`.
```

**Verification**

Confirmed by reading it: `byte_pos == 0 || byte_pos == s.len() || s.is_char_boundary(byte_pos)`. std's `str::is_char_boundary` already returns true at 0 and at `s.len()` and false for any index past the end, so both prefix guards AND the `idx > content.len() ||` pre-check at call site :1035 are provably no-ops. Two call sites (:1035, :1046), both can inline `content.is_char_boundary(...)`. Line count corrected: the doc comment plus the 3-line fn is 4 lines, not 5 — the call-site edits shorten lines but remove none.

### 61. `delete` `parseDate` in date.ts — exported dayjs parse wrapper with no production caller

- **Path:** `src/lib/utils/date.ts:52`
- **Cut:** -4 lines | **Area:** rust + utils
- **Replacement:** nothing (or inline `dayjs(str, fmt)` if a caller ever appears)

**Evidence**

```
`grep -rn "\bparseDate\b" src scripts` → 4 hits: the definition at `src/lib/utils/date.ts:52` and three in `src/tests/lib/utils/date.test.ts`. Tests-only, i.e. dead production code.
```

**Verification**

Re-verified: `grep -rn "\bparseDate\b" src scripts` = 4 hits, one definition (date.ts:52) and three in src/tests/lib/utils/date.test.ts. Tests-only, i.e. dead production code, and the audit brief explicitly counts that as dead. Note for the parent: the cut also deletes the corresponding describe block in date.test.ts. The `customParseFormat` dayjs plugin stays regardless — `formatDateWithOffset` (date.ts:141+) relies on the same 3-arg `dayjs(str, fmt, true)` strict parsing — so depsSaved is correctly 0. Block is doc comment + 3-line fn = 4 lines. Count confirmed.

### 62. `shrink` `today(format)` in date.ts is a duplicate of `formatNow(outputFormat, 0)` — same dayjs call, differing only by a default argument

- **Path:** `src/lib/utils/date.ts:15`
- **Cut:** -4 lines | **Area:** rust + utils
- **Replacement:** delete `today` and give `formatNow` the default: `formatNow(fmt: string = 'YYYY-MM-DD', offsetDays = 0)`; the four `today()` / `today(format)` call sites become `formatNow(...)`

**Evidence**

```
`grep -rn "\btoday\(|formatNow\(" src/lib src/routes` → `today` used 4× (KanbanCard.svelte:112, KanbanListView.svelte:30, KanbanTableView.svelte:37, periodic-notes.logic.ts:90), `formatNow` used 4×. Bodies: `today` = `dayjs().format(format)`, `formatNow` = `dayjs().add(offsetDays,'day').format(outputFormat)` — identical when offset is 0.
```

**Verification**

Read both bodies in full: `today` = `dayjs().format(format)`, `formatNow` = `dayjs().add(offsetDays, 'day').format(outputFormat)`. `.add(0, 'day')` returns an equivalent instant, so output is identical for every format token — no edge case separates them. Confirmed 4 `today` call sites (KanbanCard.svelte, KanbanListView.svelte, KanbanTableView.svelte, periodic-notes.logic.ts) and 4 `formatNow` call sites, all reachable statically. Giving `formatNow` the `'YYYY-MM-DD'` default is behavior-preserving. Removed block = doc comment + 3-line fn = 4 lines; call sites stay the same length, so 4 is honest. Weakest survivor on the list: net line win is real but small, and the 4 call sites read slightly worse afterwards.

### 63. `delete` `SETTINGS_SECTIONS` — a flattened copy of SETTINGS_SECTION_GROUPS "for lookups and iteration". Nothing looks up or iterates it; SettingsPanel.svelte renders SETTINGS_SECTION_GROUPS directly.

- **Path:** `src/lib/core/settings/settings.logic.ts:107`
- **Cut:** -3 lines | **Area:** core
- **Replacement:** nothing

**Evidence**

```
grep -rn --include="*.ts" --include="*.svelte" -w "SETTINGS_SECTIONS" src src-tauri/src scripts → 4 hits: the definition (settings.logic.ts:107) and 3 in src/tests/lib/core/settings/settings.logic.test.ts. Meanwhile grep -w SETTINGS_SECTION_GROUPS shows a real consumer at SettingsPanel.svelte:110.
```

**Verification**

Confirmed. Outside src/tests/ there is exactly 1 hit, the definition at settings.logic.ts:107. Read the block at :106-108: a doc comment claiming "for lookups and iteration" over `SETTINGS_SECTION_GROUPS.flatMap((g) => g.sections)`. The grouped constant has a real consumer (SettingsPanel.svelte:110) and the flat one has none — a derived constant whose stated purpose never materialized. Line count verified as 3 (1 doc + 2 code). Accurate as filed.

### 64. `delete` 6 of the 12 live-preview decorator kill-switches in the Troubleshooting settings pane are no-ops — nothing reads them

- **Path:** `src/lib/core/settings/sections/TroubleshootingSection.svelte:14`
- **Cut:** -3 lines | **Area:** core
- **Replacement:** nothing (drop 'link','inlineMarks','simpleWidget','heading','blockquote','markdownStyle' from DECORATOR_NAMES)

**Evidence**

```
TroubleshootingSection.svelte:14-17 renders a Switch for 12 names. `grep -rn "isDisabled\|'link'\|'inlineMarks'\|'simpleWidget'\|'heading'\|'blockquote'\|'markdownStyle'" src/lib/core/markdown-editor/` shows live-preview.ts only calls isDisabled() for 6 of them (lines 54,55,57,58,60,66: frontmatter, codeBlock, table, callout, queryjs, metaBindInput). The other 6 names appear nowhere in the editor — flipping those switches writes to settings and changes nothing. They died when the per-feature inline plugins were folded into inlineFormattingPlugin.
```

**Verification**

Verified by the orchestrator (the skeptic never returned a verdict for it). `grep -rn disabledDecorators src --include=*.ts --include=*.svelte | grep -v src/tests` -> the only place a VALUE is read is live-preview.ts:35 (isDisabled) and TroubleshootingSection.svelte:20 (the switch's own display state). live-preview.ts calls isDisabled() for exactly 6 names (L54 frontmatter, L55 codeBlock, L57 table, L58 callout, L60 queryjs, L66 metaBindInput). Targeted grep for each of link/inlineMarks/simpleWidget/heading/blockquote/markdownStyle outside src/tests -> 0 hits. Those 6 switches render, persist, and do nothing.

### 65. `delete` The `tagsVisible` setting: declared in settings.types.ts and given a default in the store, but no UI toggles it and no code reads it.

- **Path:** `src/lib/core/settings/settings.types.ts:63`
- **Cut:** -2 lines | **Area:** core
- **Replacement:** nothing

**Evidence**

```
grep -rn --include="*.ts" --include="*.svelte" -w "tagsVisible" src src-tauri/src scripts → exactly 2 hits: settings.types.ts:63 (`tagsVisible: boolean;`) and settings.store.svelte.ts:59 (`tagsVisible: true,`). Zero readers, zero writers, not even a test. This was the only settings key in settings.types.ts with ≤2 total references.
```

**Verification**

Confirmed. `grep -rn --include=*.ts --include=*.svelte -w tagsVisible src src-tauri/src scripts` returns exactly 2 hits: settings.types.ts:63 (`tagsVisible: boolean;`) and settings.store.svelte.ts:59 (`tagsVisible: true,`). No reader, no writer, no test, and no Rust-side reference — so it is not a persisted key some Tauri command reads back by string. Removing it changes the shape of the serialized settings JSON, but since nothing consumes the field, stale copies on disk are simply ignored on load. Line count 2 is exact.

### 66. `delete` `ColorPresetName` type export in color-presets.ts — never referenced

- **Path:** `src/lib/utils/color-presets.ts:33`
- **Cut:** -2 lines | **Area:** rust + utils
- **Replacement:** nothing

**Evidence**

```
`grep -rn "\bColorPresetName\b" src scripts` → 1 hit, the declaration at `src/lib/utils/color-presets.ts:33`. The module's real exports `COLOR_PRESET_BG` / `COLOR_PRESET_TEXT` have 6 production importers.
```

**Verification**

Re-verified: `grep -rn ColorPresetName src scripts` = 1 hit, the declaration itself. Read the file around :28-36 — the two real exports `COLOR_PRESET_BG` / `COLOR_PRESET_TEXT` are `Record<string, string>`, so nothing in the module or its consumers is typed by `keyof typeof PALETTE`. Dead type export. Block is the doc comment plus the type alias = 2 lines, as claimed.

### 67. `delete` cargo `uuid` dependency (with the `v4` feature) — zero references in Rust source or tests

- **Path:** `src-tauri/Cargo.toml:36`
- **Cut:** -1 lines | **Area:** deps/build
- **Replacement:** nothing

**Evidence**

```
`grep -rni "uuid" src-tauri/src src-tauri/tests` -> 0 hits (case-insensitive, so `Uuid::new_v4` would have matched). Quick Capture generates ids some other way.
```

**Verification**

`grep -rni "uuid" src-tauri/src src-tauri/tests src-tauri/build.rs` -> 0 hits, so the declaration is dead. But depsSaved is wrong: `cargo tree --offline -i uuid --depth 1` shows uuid v1.24.0 is already pulled in by cfb, schemars, tauri-codegen and tauri-utils, so dropping our line removes a Cargo.toml declaration, not a crate from the build. Corrected depsSaved 1 -> 0.

### 68. `delete` cargo `percent-encoding` dependency — zero references in Rust source or tests

- **Path:** `src-tauri/Cargo.toml:51`
- **Cut:** -1 lines | **Area:** deps/build
- **Replacement:** nothing

**Evidence**

```
`grep -rn "percent" src-tauri/src src-tauri/tests` -> 0 hits. (Comment in Cargo.toml groups it under "File History", but file_history uses `similar` only — `similar` has 4 qualified hits, `percent_encoding` has 0.)
```

**Verification**

`grep -rn "percent" src-tauri/src src-tauri/tests src-tauri/build.rs` -> 0 hits; the declaration is dead. depsSaved corrected: `cargo tree --offline -i percent-encoding --depth 1` lists cookie, form_urlencoded, hyper-util, reqwest (0.12 and 0.13), tauri, tauri-plugin-fs, tauri-plugin-updater, ureq and url as dependents, so the crate stays in the tree either way. Corrected depsSaved 1 -> 0.

### 69. `delete` cargo `objc2-core-foundation` dependency — fonts.rs declares its own `extern "C"` CoreFoundation FFI instead of using the crate

- **Path:** `src-tauri/Cargo.toml:68`
- **Cut:** -1 lines | **Area:** deps/build
- **Replacement:** nothing

**Evidence**

```
`grep -rn "core_foundation\|CoreFoundation" src-tauri/src src-tauri/build.rs` -> only src/commands/fonts.rs:3 (doc comment) and fonts.rs:27 `#[link(name = "CoreFoundation", kind = "framework")]` — a raw framework link, not the crate. `grep -rn "objc2_core_foundation" src-tauri/src` -> 0 hits, while sibling `objc2` has 12 `use` sites and `objc2_foundation` has 2.
```

**Verification**

`grep -rn "objc2_core_foundation" src-tauri/src` -> 0 hits, while `objc2` has 12 use sites and `objc2_foundation` 2; fonts.rs links the CoreFoundation framework directly. Dead declaration confirmed. depsSaved corrected: `cargo tree --offline -i objc2-core-foundation --depth 1` shows arboard, muda, objc2-app-kit, objc2-core-graphics, objc2-foundation, objc2-io-kit, objc2-web-kit, rfd, sysinfo, window-vibrancy and wry all depend on it — the crate compiles regardless. Corrected depsSaved 1 -> 0.

### 70. `delete` file-icons IconPackMeta.iconCount — hardcoded 0 for all 12 packs and never read anywhere

- **Path:** `src/lib/features/file-icons/file-icons.icon-data.ts:15`
- **Cut:** -1 lines | **Area:** features
- **Replacement:** nothing — drop the field from file-icons.types.ts:31 and the 12 `iconCount: 0` literals

**Evidence**

```
`rg -n --word-regexp iconCount src -g '!src/tests/**'` → 13 hits: 12 are the literal `iconCount: 0` in getAllIconPacks (L17-28), 1 is the type declaration in file-icons.types.ts:31. Zero reads. Its only consumer, IconPicker.svelte:47, destructures only id/label.
```

**Verification**

`rg -n --word-regexp iconCount src --glob '!src/tests/**'` → exactly 13 hits: the 12 `iconCount: 0` literals at icon-data.ts:17-28 and the type declaration at file-icons.types.ts:31. Zero reads anywhere. BUT linesSaved is badly inflated: the 12 literals are inline object properties sharing a line with id/label, so deleting them edits 12 lines and removes 0. Only file-icons.types.ts:31 is an actual line deletion. Corrected 13 -> 1.

### 71. `delete` quick-switcher.logic.ts:4 barrel re-export `export { fuzzyMatch, type FuzzyMatchResult } from '$lib/utils/fuzzy-match'` — FuzzyMatchResult has zero consumers and fuzzyMatch has exactly one, which can import the util directly

- **Path:** `src/lib/features/quick-switcher/quick-switcher.logic.ts:4`
- **Cut:** -1 lines | **Area:** features
- **Replacement:** in completion.logic.ts:2, import fuzzyMatch from '$lib/utils/fuzzy-match' (its sibling completion.ts:8 already does)

**Evidence**

```
`rg -n --word-regexp FuzzyMatchResult src` → 3 hits, all definitions/re-exports, no consumer. `rg -n "quick-switcher.logic" src` → the only importer of fuzzyMatch-via-barrel is completion.logic.ts:2; every other importer takes flattenFileTree/filterAndRank/getRelativePath/FileEntry.
```

**Verification**

`rg -n --word-regexp FuzzyMatchResult src` → 3 hits, all definition/re-export (fuzzy-match.ts:2, :8 in the signature, quick-switcher.logic.ts:4) — zero consumers. Enumerated all 14 prod importers of quick-switcher.logic: 13 take flattenFileTree/filterAndRank/getRelativePath/FileEntry; only completion.logic.ts:2 takes fuzzyMatch through the barrel, and its sibling completion.ts:8 already imports flattenFileTree directly, so the direct-import path is established. quick-switcher.logic.ts:2 already imports fuzzyMatch for its own use, so the re-export at :4 is pure pass-through. 1 line, correctly stated.

## Refuted (do not re-report)

These were raised by a finder and killed by the skeptic. Each is recorded with the reason so a future
audit does not resurrect it.

### `src/lib/components/ui/button/button.svelte:4` — `tailwind-variants` used in one file for a variant map whose export is never consumed

The load-bearing evidence claim is false. `buttonVariants` IS consumed — button.svelte:62 and :75 call it to build the class for every rendered button, and 19 non-test files import `{ Button } from '$lib/components/ui/button'` passing variant/size, so the map drives real UI, not dead flexibility. Only the barrel's outward re-export is unused, which is not the dep. linesSaved is also inflated: the ~25 lines of base/variant/size strings stay verbatim; you swap `tv({...})` for two Records + a cn() merge and must hand-roll the `VariantProps`-derived ButtonVariant/ButtonSize unions that ButtonProps needs — net is roughly break-even, not 5 lines. Finally CLAUDE.md documents `components/ui/` as 'shadcn-svelte generated components (generated via CLI)' and components.json is present, so hand-diverging generated code to shed the standard shadcn dep fights the documented regeneration path.

### `src/lib/core/zoom/zoom.service.ts:1` — Replace hand-rolled zoom service with Tauri's zoomHotkeysEnabled window flag

REFUTED — the replacement does not cover the behavior and would delete a working user-facing feature. The @tauri-apps/cli 2.11.4 schema description for WindowConfig.zoomHotkeysEnabled reads: "MacOS / Linux: Injects a polyfill that zooms in and out with ctrl/command + -/=, 20% in each step, ranging from 20% to 1000%." That covers Cmd+- and Cmd+= only. It does NOT cover Cmd+0 reset-zoom (registered at global-keybindings.ts:152) nor Cmd+Shift+= (:150), both of which are documented user shortcuts in the reserved-shortcut list at keybindings.logic.ts:110-113 and used for the settings conflict-detection UI. It also changes the step model from the discrete ZOOM_LEVELS array to linear 20% steps. Cutting zoom.service.ts removes reset-zoom outright, which is a feature removal, not dead flexibility. (The `core:webview:allow-set-webview-zoom` permission is already granted at src-tauri/capabilities/default.json:17, so the permission half of the claim checks out — the coverage half does not.)

### `src/lib/core/filesystem/fs.watcher.ts:64` — onFileChange listener array + unsubscribe closure + fan-out for one subscriber

REFUTED on the ADR rule. The subscriber count is accurate (one production subscriber, app-lifecycle.service.ts:329), but docs/adr/0017-file-watcher-incremental-hidden-filter.md documents this exact API as a numbered decision: §5 "Change listeners with path payload (fs.watcher.ts:57-67). onFileChange(listener) registers consumers that receive the exact list of changed paths. Consumers (backlinks, index-updater, auto-move) decide whether to act", and it recurs in the Consequences section ("Consumers of onFileChange receive raw paths, not a semantic event type... this keeps the watcher agnostic about consumer intent"). The file header at fs.watcher.ts:25 further records that the API was deliberately "preserved verbatim" across the Rust-watcher swap so consumers do not notice. ADR-backed design decision → the finding dies. Savings were also overstated: notifyListeners' try/catch would survive as a single guarded call, so the real delta is ~8 lines, not 12.

### `src/lib/plugins/queryjs/queryjs.service.ts` — queryjs.service.ts is a 6-line rename of readTextFile injected as a loadScript DI seam

REFUTED on three counts. (1) ADR-0004 (docs/adr/0004-file-type-separation.md) defines `.service.ts` verbatim as 'Tauri IPC calls need to be mockable in tests' and says 'extract a .service.ts when Tauri calls appear' - this file is the documented pattern executing exactly as specified, so it is design, not accident. (2) loadScript is not dead flexibility: `grep -n loadScript src/tests/lib/plugins/queryjs/kb-api.test.ts` returns injections at :57, :486, :498, :508, :520, :531, :543, :553, :564 - it is the live mocking seam for kb.require()/kb.view(), and removing it forces a module-level vi.mock of @tauri-apps/plugin-fs into kb-api.test.ts, trading a 6-line file for more mock coupling. (3) linesSaved 47 is 41 lines of src/tests, which the audit brief explicitly excludes from scope; real production saving is 6 lines minus the import that moves into queryjs-block-widget.ts, i.e. ~5.

### `src/lib/plugins/queryjs/kb-api.ts:181` — kb.progressBar() duplicates kb.ui.progressBar()

REFUTED - this cuts a user-facing feature, not dead flexibility. KBAPI is the public queryjs scripting surface consumed from user vault notes (ADR-0010: 'a JS-fluent alternative to Dataview'); `grep -rn progressBar src docs scripts src-tauri/src` excluding the two definition files returns ZERO hits, which is expected for BOTH methods - kb.ui.progressBar has no in-repo caller either. Zero in-repo callers is therefore not evidence of deadness here, and deleting kb.progressBar throws ReferenceError-equivalent in any existing vault script calling it. The claimed drop-in is also not exact: kb-api.ts:182 rounds the VALUE before clamping and repeats max-clamped (throwing RangeError on max<0, truncating a fractional max), while kb-ui.ts:116-131 clamps first, rounds after scaling to width, and returns early on max<=0. Only the stale JSDoc at kb-api.ts:179 ('which renders DOM elements' - kb.ui.progressBar returns a string too) is genuinely wrong, and a wrong comment is not 9 lines of over-engineering.

### `src-tauri/src/quick_capture/shortcuts.rs` — Enum + struct + Vec 'registry' for two hardcoded accelerators

REFUTED on two independent grounds. (1) The proposed replacement does not work: `ShortcutId` is not a decorative wrapper — lib.rs:34 declares `fn dispatch_shortcut<R>(app, id: ShortcutId)` and lib.rs:43/:50 `match` on `ShortcutId::OpenComposer` / `ShortcutId::CaptureClipboard`. Collapsing the registry to `(&str, &str)` literals would force accelerator-string matching in the dispatcher, which is strictly worse. The enum must stay, so at most `ShortcutBinding` (5 lines) and the Vec-returning `default_registry()` could become a const array — roughly 13 lines, not 39. (2) ADR 0028 (`docs/adr/0028-quick-capture-merge-into-kokobrain.md`, status: active) documents this exact file in its 'What ports' table: `shortcuts/mod.rs` → `src-tauri/src/quick_capture/shortcuts.rs`, 'Trimmed to two intents: OpenComposer (Ctrl+Alt+Cmd+Space) + CaptureClipboard (Ctrl+Alt+Cmd+C)', and names it again in the References section. ADR-backed design decision, so the finding dies. Residual 13-line shrink is not worth a finding.

### `src/lib/features/properties/yaml-quoting.logic.ts` — native: 178 lines re-implementing yaml@2.9.0 quoting rules

REFUTED by ADR 0029 (docs/adr/0029-frontmatter-yaml-canonical-form.md), which names this exact file in its Decision and Citation map: it is a deliberate pre-emission PREDICATE (not an emitter) that (a) pins canonical form against silent yaml-version drift via 130 parity tests, (b) is the transcribed contract consumed by an external non-TypeScript producer (koko.brain-os/vault/work/people/_generate.py). The ADR explicitly lists 'use the predicate to actually emit, replacing yaml.Document' under Alternatives considered and rejects it. The finding's replacement is also factually wrong: the live yaml user is `serializeProperties` (properties.logic.ts:202 per the ADR), not `serializePropertyValue` (:192, which is itself dead — see the properties finding). ADR-backed design decision, so the finding dies.

### `src/lib/features/tasks/tasks.logic.ts:27` — delete: filterCompletedTasks as superseded by filterCompleted

REFUTED — filterCompletedTasks is LIVE. `sed -n '20,70p'` shows filterCompleted (L58) calling `filterCompletedTasks(group.tasks)` at L62 inside its own loop; it is the per-group inner helper, not a superseded twin. The auditor's own evidence contains the bug: `rg -l` returned 1 file (the own file) and they read that as 'definition only', but that file hit includes a real call site. Deleting it breaks the tasks panel's completed-task hierarchy filter — a user-facing feature, not dead flexibility.

