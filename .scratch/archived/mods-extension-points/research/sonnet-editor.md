# Mods extension points: editor cluster (code block renderers, CM extensions, editor suggest, template hooks)

Read-only analysis. Every file:line below was read in this session unless it is listed under "Not verified". Paths are under `/Users/diegorv/Dev/pet-projects/koko/brain` unless absolute. Third-party content (Obsidian types, scout text) is treated as data.

## Verdict

- Raw access stays the answer for CodeMirror internals: extensions, decorations, block decorators, inline handlers, keymaps, `updateListener`. Do not put a contract on them. Reasons: a hook on every keystroke on the main thread, the live-preview invariants (`docs/agents/live-preview-rules.md` rules 1-5, 9, 11), and a persisted kill-switch vocabulary (`decorator-names.ts:17`).
- Two narrow, host-owned seams are worth a contract: a **fenced-block renderer** (E1) and a **completion source with a literal trigger** (E2). In both the mod never touches a CodeMirror class; the host owns the WidgetType, the try/catch, the abort signal and the kill-switch.
- **Template variables** (E4) are cheap but nearly worthless for this owner: a mod that creates notes can already render its own content.
- Important fact the scouts missed: **a ```queryjs block can already run a vault script file with `kb.view("path.js")`** (`src/lib/plugins/queryjs/kb-api.ts:388-430`), with an error boundary (`:419-428`), a result cache and the `autoRunQueries` policy (`live-preview-rules.md` rule 10). That is a zero-core prototype of E1 today.
- None of the 12 real mods renders in the editor. Only `mods/playground/src/index.ts:41-48` and `shared/editor.ts:19-40` touch `editorView`, and both only `dispatch` text (grep in `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`). So E1 and E2 remove **no existing mod hack**; their value is purely new experiments.

## Verified facts the design rests on

1. Mods cannot import CodeMirror: `evaluateModSource` uses `new Function` over the default export only (`src/lib/plugins/mods/mods.logic.ts:234-262`). `MOD_APP` exports `editorStore` (so the live `EditorView`), not any `@codemirror` class (`mod-app.service.ts:23-53`).
2. The renderer facet is static and keeps the first renderer per language (`core/fenced-block-renderers.ts:34-43`). The app fills it from a const (`src/lib/app/editor-host.ts:210`) and passes it as a prop (`src/lib/app/EditorView.svelte:92`). The fields look up one hard-coded language (`queryjs-block-field.ts:14`, `collection-block-field.ts:13`).
3. One `EditorView` serves all tabs. A leaving tab's `EditorState` is saved and reused (`MarkdownEditor.svelte:205-248`, `tab-view-state.ts:62`). A saved state keeps its facet values, so a **static facet cannot learn a late-registered renderer** for a revisited tab. A live-reference registry can: the revisit dispatches `editorModeEffects` (`MarkdownEditor.svelte:239`), a reconfigure, which `checkUpdateAction` turns into a rebuild (`core/check-update-action.ts:21`).
4. `markdown-editor/*.ts` may not import stores, services, features, plugins, Tauri or `utils/debug` (`src/tests/lib/architecture/markdown-editor-imports.test.ts:15-22`). So an editor-side registry must be a plain module (not `.store.svelte.ts`, not `.service.ts`); `.svelte` files are not scanned. `plugins/mods` may import `core` (`layer-rules.test.ts:138-139`), but not `app` (`:178`). The baseline holds 3 `utils` entries only (`layer-baseline.json`).
5. CodeMirror deactivates a ViewPlugin whose `create` or `update` throws (`node_modules/@codemirror/view/dist/index.js:1496-1530`), so a throw inside `compute` drops every decoration of that field for that view. A widget `toDOM` is **not** wrapped: `WidgetTile.of` calls `widget.toDOM(view)` bare (`index.js:2204-2207`), and `MarkdownEditor.svelte:139-150` already has a retry for "a `setState` that throws (a widget `toDOM`)". A mod `toDOM` must therefore be called inside a host try/catch.
6. `autocompletion({ override })` replaces the language-data sources (`@codemirror/autocomplete` 6.20.4, `dist/index.js:892`), and the source list is read from the state on every transaction. `override` is one constant array (`setup/editor-extensions.ts:142-145`). `CompletionContext` has `aborted` and `addEventListener('abort', fn, { onDocChange })` (`dist/index.d.ts:197-215`).
7. `codeBlockField` renders every closed fence except a hard-coded set (`plugins/code-block-field.ts:13`, used `:37`). A new fence language is a **fourth** registration place beyond the three in `docs/LIVE-PREVIEW.md` (names tuple, `BLOCK_EXTENSIONS`, `settingsKey`).
8. `findSpecialFenceBlocks` calls `findAllFencedCodeBlocks(state)` on every call (`parsers/fenced-code-block.ts:128-131`), so a per-language field costs one tree walk per language. A generic field must walk once.
9. Template expansion: `processTemplate` is synchronous (`utils/template.ts:22`); custom variables are looked up **first** (`:195`), so a custom name shadows `tp.file.title`; unknown expressions are returned as-is (`:214`). `loadNoteTemplate` (`core/note-creator/note-creator.service.ts:49-64`) is the single expansion point, also used by `createTypedNote` (`features/type-definitions/type-definitions.service.ts:129-148`), which passes no `customVariables`. A throw there rejects creation (`note-creator.service.ts:128-131` rethrows).
10. ctx members are frozen by key list: `mod-api-contract.test.ts:206`. A new member needs that list updated; ADR-0036 allows additive members with no `apiVersion` bump (`mod-api.v1.ts:15-17`).

---

## E1. Fenced-block renderer for mods

**API sketch** (`mod-api.v1.ts`, additive; one `ctx.editor` namespace shared with the text-edit helpers other clusters propose):
```ts
interface ModFencedBlockV1 {
	/** Renders into `el`; `source` is the text between the fences, data from the note: never evaluate it. */
	mount: (el: HTMLElement, source: string, block: { signal: AbortSignal }) => void | (() => void);
}
interface ModEditorV1 {
	/** Lowercase `[a-z][a-z0-9-]*`; throws on a duplicate or a built-in language. Returns a disposer, also run at unload. */
	registerFencedBlock: (language: string, block: ModFencedBlockV1) => () => void;
}
```
**Cost: M.** Files:
- new `core/markdown-editor/extensions/live-preview/core/mod-fence-registry.ts`: plain module, `register/unregister/get/size`, change callbacks.
- new `plugins/mod-fence-field.ts` via `blockDecorator` (`core/block-decorator.ts:59`): one pass over `findAllFencedCodeBlocks`, `Decoration.replace({ widget })` plus `hideLines`, copied from `queryjs-block-field.ts:23-38`. Return `Decoration.none` first when `size === 0` (as `:15`).
- new host `WidgetType` wrapper (in `widgets/`): `toDOM` creates the container, adds the interactive-target `mousedown` guard, calls `mount` in try/catch (error box on throw); `destroy` aborts the signal and runs the returned cleanup; `eq` = same registration id and same source.
- `decorator-names.ts:17` + `:85` (one name, e.g. `modFence`), `live-preview.ts:46` (`BLOCK_EXTENSIONS`), `code-block-field.ts:13` (skip registered languages).
- `MarkdownEditor.svelte:671-684`: subscribe to the registry and dispatch `forceDecorationRebuild`.
- `mod-api.v1.ts:289-329`, `mods-host.service.ts:357` (next to `vault`), `mod-api-contract.test.ts:206`, `help/documentation/28-mods.md`; tests: field, widget, host disposal.

**Core change and layers.** One new generic field and a registry in `core/markdown-editor`; no feature or plugin import. Layer rules hold (fact 4); the registry is read through a live reference, not a facet, because of fact 3.

**Risks.**
- Hot path: the field scans on every doc edit, like each of the 12 block decorators. Mod code runs only in `toDOM` (mount, re-enter viewport, edit of that block), never in `compute`; this is better than the scout's picture, where `renderer.widget()` runs per rebuild. Zero cost when no mod is registered. Not measured.
- Throw: wrap `mount` (fact 5). A throw in `compute` would silence the field, so `compute` must call no mod code.
- Disposal and reload: unregister notifies, the editor rebuilds, widgets are destroyed and their signals aborted. A reloaded mod gets a new registration id, so `eq` is false and the block re-mounts with the new code. After unload the wrapper must not call a dead mod: check registration is live, else render the raw placeholder.
- Rules 2/3: `toDOM` re-runs on each re-entry to the viewport; a mod that does heavy work in `mount` pays each time. The host cannot cache the mod's DOM (shared live node, rule 2). Offer no cache in v1; the mod caches its own data.
- Rule 9: Chart.js and similar registries are released through `signal` abort in `destroy`.
- Rule 11: the host stops `mousedown` only when the target is an input, button, select, textarea or link; other clicks keep revealing the block (`queryjs-block-field.ts:21`).
- Data and trust: the source is note text, possibly from an import. Mods are full trust (ADR-0036), so the contract states "never evaluate or `innerHTML` the source". The main webview has `'unsafe-eval'` (ADR-0036 Context) and reaches Tauri commands, so an XSS in a mod widget is as serious as a queryjs block.
- Collisions: reject `queryjs`, `collection`, `meta-bind-button`, `mermaid` (and `SPECIAL_LANGUAGES`); a mod taking `js` would hijack ordinary code blocks, so also reject languages the code-block widget highlights (not enumerated here).
- Source mode shows raw lines; only live preview installs the field (`live-preview.ts:79-107`).

**Bugs and complexity removed.** Mod hacks: none (no real mod renders in the editor). Core: none; collapsing the queryjs and collection fields into the generic one is possible but not needed (queryjs has a custom gate, `queryjs-block-field.ts:63-73`); do not do it in this change.

**Experiments unlocked.** ```habit streak chip next to the daily log, ```focus session summary, ```inbox count, a ```portent card for a note, a form block that writes frontmatter through `ctx.app.updateNoteFrontmatter` (`mod-app.service.ts:50`).

**Tier: B.** **Prototype first without core: yes.** Put the code in a vault script and use ```queryjs `kb.view("scripts/habit.js", input)` (`kb-api.ts:388-430`). It already gives an error boundary and a cache. What it lacks is a custom language name, hiding the code, and a signal. Do this before E1; build E1 only if the experiments show those three matter. A raw-CodeMirror prototype is a poor route: `Decoration` and `WidgetType` are not reachable from an `EditorView` instance (not verified beyond that), and anything added with `appendConfig` is dropped by the next tab switch (fact 3).

---

## E2. Completion source with a literal trigger (slash menu and snippets as mods)

**API sketch:**
```ts
interface ModCompletionItemV1 { label: string; detail?: string; insert: string }
interface ModCompletionSourceV1 {
	/** Literal text that opens the menu, e.g. `/` or `::`. */
	trigger: string;
	/** Fire only when the trigger starts the line (after indentation). */
	lineStartOnly?: boolean;
	/** `query` is the text typed after the trigger. Keep it cheap; async is allowed. */
	items: (query: string, signal: AbortSignal) => ModCompletionItemV1[] | Promise<ModCompletionItemV1[]>;
}
// ModEditorV1: addCompletionSource: (source: ModCompletionSourceV1) => () => void;
```
**Cost: M (small end).** Files:
- new `core/markdown-editor/extensions/mod-completion/completion-registry.ts` (plain module, not `.service`) and `completion.ts` (one composite `CompletionSource`).
- `setup/editor-extensions.ts:143`: add the composite to `override`; that array is the only place (fact 6).
- Contract, host, contract-test key list, docs, tests as in E1. Nothing in `MarkdownEditor.svelte`; no rebuild needed.

**Core change and layers.** One registry plus one source in core; plugins/mods fill it; layer rules hold (fact 4). It must be one source in the existing single `autocompletion()`: a second instance throws a config merge conflict (comment `editor-extensions.ts:139-141`; not run).

**Risks.**
- Hot path: every source is asked on each typed character with `activateOnTyping`. Built-ins gate cheaply (`tag/completion.ts:16-19`, `date-shortcut/completion.ts:23-25`). The composite must return `null` at once when the registry is empty or the line before the cursor does not contain a registered trigger (string `lastIndexOf`, no mod code, no regex from mods). Then the mod runs only after the user typed its trigger.
- Slow mod: pass `signal` tied to `context.addEventListener('abort', ..., { onDocChange: true })` so a stale result is dropped. A timeout cannot stop a synchronous loop (`28-mods.md:517`); say so in the contract.
- Throw: try/catch in the composite, log under `MOD:<id>`, return `null`.
- Insert text only (`insert: string`); no `apply` function, no `info` DOM node, because those hand the mod the CodeMirror view or build DOM in the popup. The edit is a normal transaction, so it flows through `onDocChanged` (`editor-extensions.ts:173-192`); no new write path, nothing for `docs/agents/indexing-watcher-rules.md` rule 6.
- Skip inside fenced code and frontmatter, as the tag source does (its detector reads fences and frontmatter, per the comment `tag/completion.ts:15-16`; the detector itself was not read).
- Disposal: lazy registry read means nothing stale after unload; an open popup keeps string results, which is harmless.
- Collision with built-ins: `[[`, `#` and `@` triggers are taken; reject them. The `/` trigger can collide with prose and paths; `lineStartOnly` covers the slash menu case.

**Bugs and complexity removed.** Mod hacks: none today. Core: future editor features stop editing the literal `override` array. No slash menu exists in `core/markdown-editor` (grep found none; the two files it matched were unrelated), so a mod would be the first one.

**Experiments unlocked.** `/` menu that inserts a Portent capture link, a stamp or a task template; `::` property snippets; `[[type:` style pickers backed by `ctx.vault.list`; completion of a habit id inside a ```habit block.

**Tier: B.** **Prototype first without core: no.** `override` hides language-data sources (fact 6), and a mod cannot create the extension objects without CodeMirror classes (fact 1). The cheapest probe is a throwaway app-side spike of the composite with one hard-coded source. A text-only substitute exists today: an action that inserts text through `view.dispatch(view.state.replaceSelection(...))` (`playground/src/index.ts:45-47`), reachable from a rail button or, once built, the palette.

---

## E3. Template variable provider

**API sketch:**
```ts
// ModContextV1.templates (additive)
addVariable: (name: string, resolve: () => string) => () => void; // used as <% name %>
```
**Cost: S.** Files: new plain registry in `core/note-creator/` (not a store); `note-creator.service.ts:49-64` merges `{ ...modVariables, ...callerVariables }` before `processTemplate`; contract, host (`mods-host.service.ts:357`), contract test, docs, tests (provider throws, shadowing, async result).

**Core change and layers.** Core registry consulted in core; mods fill it; layer rules hold. Template expansion runs before `create_note`/`applyNoteChange` (`note-creator.service.ts:100-106`), so no save-path change.

**Risks.**
- A throwing provider must not fail note creation: `processTemplate` is not guarded, and `openOrCreateNote` rethrows (fact 9), so a bad mod would break every daily or typed note. Catch per provider, log under `MOD:<id>`, and leave the expression raw (the default for unknown expressions, `template.ts:214`).
- Shadowing: custom variables win (`template.ts:195`), so reject names containing `tp.` or not matching `[A-Za-z_][A-Za-z0-9_]*`, and let caller variables (`yesterdayPath` etc.) win over mod ones.
- Sync string only; `processTemplate` is sync and an async provider would put mod latency into every creation.
- Reload: unregister drops the variable; a note created in between renders the raw `<% name %>`.
- No `new Function` evaluation of `<% %>` bodies: note and template text would become code (see the queryjs precedent, `kb-api.ts:553`).

**Bugs and complexity removed.** None. No real mod uses `<%` (grep). A mod that creates notes already writes its own content through `ctx.vault.create` (`mod-api.v1.ts:125`). Per-call content rewriting already exists raw: `createTypedNote` takes `buildContent` (`type-definitions.service.ts:130-148`), reachable as `ctx.app.createTypedNote` (`mod-app.service.ts:33`), though `shared/types.ts:60` types only `typeName` and `title`.

**Experiments unlocked.** `<% sprint %>`, `<% weekNumber %>` or `<% lastInboxNote %>` in periodic and typed notes without a core release.

**Tier: C.** **Prototype without core: per-call yes** (`ctx.app.createTypedNote({ ..., buildContent })`), global no.

---

## E4. Raw CM extension hook, keymap, block decorators, inline handlers, document listeners

**API sketch:** none recommended. Considered: `registerExtension(factory: (cm) => Extension)` with curated CodeMirror classes.

**Cost: L** (curated factories, kill-switch names, per-tab state reconfiguration, tests). Files would include `editor-extensions.ts:127-195`, `live-preview.ts:46-67`, `decorator-names.ts`, `MarkdownEditor.svelte:107-131`, `:205-248`.

**Why stay out.**
- Hot path: an `updateListener` or decoration plugin runs on every keystroke on the main thread. A synchronous loop cannot be stopped.
- `BLOCK_EXTENSIONS` and the name tuples are total `Record`s (`live-preview.ts:46`, `decorator-names.ts:17`) whose names are persisted settings keys; mod-defined names have no stable owner.
- Every extension must survive per-tab states (fact 3) and the compartment reconfigure on mode change.
- A throwing `ViewPlugin` is deactivated silently (fact 5).
- Rules 1, 4, 5 are easy to break from outside (`font-size` animation, full scans per scroll).

**Tier: C.** **Prototype first without core: only fragile.** Text edits through `editorView.dispatch` work (playground, `shared/editor.ts:24-40`). Adding an extension needs `StateEffect.appendConfig` (`@codemirror/state` `index.d.ts:852`), which a mod could in theory reach from an effect instance such as `EditorView.scrollIntoView(0)` (`@codemirror/view` `index.d.ts:1129`); this was not run. Anything added is lost at the next tab switch (fact 3). Keep it documented as unsupported.

A **keymap** entry for a mod is better served by declared hotkeys on actions in the keybinding cluster (the app registry, `global-keybindings.ts:43-44` already skips typing targets and dialogs), not by an editor keymap (`editor-extensions.ts:150-166`).

---

## Order and trade-offs inside this cluster

1. Now, zero core: prototype E1 with ```queryjs + `kb.view` scripts; prototype text insertion with the raw `dispatch` already used by playground. Cost: none; the gap is a visible code line in the note and no cleanup signal.
2. E2 (M): best value for danger here. Does not touch live-preview rules, does not rebuild decorations, no save path. Gives the slash menu and snippets.
3. E1 (M, large): only if step 1 shows a custom language and a signal matter. It touches live-preview invariants, and four registration places.
4. E3 (S): only if a mod needs core-created notes to carry its values. Low demand.
5. E4: do not build.

Shared prerequisite: agree the `ctx.editor` namespace with the cluster adding `insertAtCursor` and `activeNote`, so the contract gets one `editor` member.
## Refuted scout claims

- "`queryjs-block-widget.ts:158-161` `eq()` compares `jsContent` only": refuted. It compares `jsContent` and `isIndexReady` (`src/lib/plugins/queryjs/queryjs-block-widget.ts:158-161`).
- "Open tabs keep the renderer set of their EditorState, so rebuild on register or accept the gap": incomplete. The facet is also kept in the saved per-tab states reused on revisit (`MarkdownEditor.svelte:205-248`); rebuild alone does not fix it. A live-reference registry does (fact 3).
- "`renderer.widget()` is expensive in `compute` on every keystroke": not shown. `widget(source)` only builds a WidgetType (`fenced-block-renderers.ts:19`, `queryjs-block-field.ts:23`); the cost is in `toDOM` and the full-doc scan. Not measured.
- "A per-language field could collapse into one generic field, deleting code": unproven and unneeded; queryjs has its own gate (`queryjs-block-field.ts:63-73`).
- "Register in three places for a new fence": for a **mod** language there is a fourth, `SPECIAL_LANGUAGES` (`code-block-field.ts:13`), which no scout named.
- "Mod hacks exist around fences, completion or templates": none found in the 12 mods (grep for `editorView`, `cm-content`, `MutationObserver`, `<%`, `createTypedNote`); only playground and `shared/editor.ts` use `editorView`, and only to dispatch text.
- "Second `autocompletion()` conflicts": only a source comment (`editor-extensions.ts:139-141`), not run.
## Not verified

- Nothing built, run or edited. No runtime measurement of `findAllFencedCodeBlocks` on large notes, `toDOM` cost, completion latency or tab-switch cost.
- Whether mods load before or after the first editor mount (the live-reference design makes it irrelevant, but I did not trace `mods-host.service.ts` start order).
- Whether `EditorView.scrollIntoView(0).constructor.appendConfig` really reaches `StateEffect` at runtime.
- The tag detector's handling of fences and frontmatter (`detectTagContext`) was only read through its comment.
- Which languages `codeBlockField`/`CodeBlockWidget` highlight (for the collision list).
- Reading mode, print or export paths for fences; search indexing of mod fence text; Obsidian parity (not re-read, no claim depends on it).
