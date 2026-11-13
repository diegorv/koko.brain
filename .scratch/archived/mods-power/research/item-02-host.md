# Item 2, host side: `onNoteSaved` that ignores the mod's own writes and passes the content

Scout report. Nothing was run (no tests, builds, commits). Every claim cites `path:line` in the host repo (`/Users/diegorv/Dev/pet-projects/koko/brain`) unless it says "mods repo" (`/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`).

## 1. Summary

- The whole host change is small and stays inside `src/lib/plugins/mods/`. No change to `core/` (`editor.hooks.ts`) is needed, so no new layer violation and no touch of the save path.
- The after-save observer already receives `(filePath, content)` (`src/lib/core/editor/editor.hooks.ts:15`, call at `:87`). The mod's observer drops `content` today (`src/lib/plugins/mods/mods-host.service.ts:571`: `addAfterSaveObserver((path) => {`). Passing the content is one extra argument.
- "Own write" detection can be exact for `ctx.vault.write`, because `notifyAfterSave` runs synchronously inside the mod's own call (`mod-vault.service.ts:135`) and every observer runs synchronously inside it (`editor.hooks.ts:84-91`). A synchronous module-level scope set around that one call is race-free.
- It cannot be exact for the raw `ctx.app` writes (`updateNoteFrontmatter`, `saveFileByPath`, `editorStore`, `syncExternalContentToEditor`): `MOD_APP` is one shared object for all mods (`mod-app.service.ts:26-68`), so the host cannot tell which mod called. Item 1's `ctx.vault.updateFrontmatter` fixes that for frontmatter, because the host wraps it per mod (see section 5).
- Ordering constraint: the contract is a pinned Git dependency. The canonical change goes to the mods repo first, then the host bumps the SHA (`package.json:81`, `docs/MOD-CORE.md` "Updating the dependency"). Host tests that call `onNoteSaved(cb, { ignoreOwnWrites: true })` do not type-check before the bump.

## 2. Current behaviour (verified)

| Piece | Where | Fact |
|---|---|---|
| Mod subscription | `mods-host.service.ts:566-591` | Validates callback; per save, computes `vaultRelativeKey(vaultPath, path)`, returns if `null`, unloaded or vault switched; schedules `setTimeout(0)`; timer re-checks unload/vault; calls `callback(relative)`, catches sync throw and rejection into `debug(tag, 'onNoteSaved callback failed:', ...)`. Disposer unsubscribes and clears pending timers. |
| Observer registry | `editor.hooks.ts:50-60`, `:67-91` | `notifyAfterSave(filePath, content)`: `markRecentSave`, `applyNoteChange` (sync for `save`), `notifyContentInvalidated`, then each observer inside try/catch. `content` is the plaintext (`:12-14`). |
| Who fires `notifyAfterSave` | grep `src/lib` | Editor tab save `editor.service.ts:196` (inside `writeTab`, after `await writeTextFile`); `frontmatter-write.service.ts:161` (closed-note branch) and, for an open tab, via `saveFileByPath` at `:133`; deep links (`deep-link.service.ts:277,296,313,337`, `deep-link-actions.ts:78,216`); mod `ctx.vault.write` `mod-vault.service.ts:135`. |
| `vault.write` | `mod-vault.service.ts:118-136` | Refuses a dirty open tab (`:124-125`), writes, `syncExternalContentToEditor`, returns early for mod code (`:132`), else `notifyAfterSave(abs, content)` (`:135`). |
| `vault.create` | `mod-vault.service.ts:95-117` | Calls `applyNoteChange` with `source: 'create'`, never `notifyAfterSave`. `.scratch/mods-host-robustness/issues/03-note-saved-fires-for-mod-creates.md` (needs-triage) is about that gap. Docs say `create` does not fire it (`help/documentation/mods/07-events-and-reactivity.md:195`). |
| Contract text | mods repo `packages/mod-core/src/contract/mod-api.v1.ts:356-362` | `onNoteSaved: (callback: (path: string) => void) => () => void`. JSDoc: "Writing again with vault.write can loop; switching off the mod in Labs stops it." Same text in the installed copy and in `help/examples/mods/kokobrain-mod.d.ts:375-378`. |
| Frozen surface | `src/tests/lib/plugins/mods/mod-api-contract.test.ts:52` | Only the member NAME is frozen (`satisfies Record<keyof ModContextV1, true>`). Signatures are enforced by `tsc` against the installed contract, not by a runtime test. |
| Existing loop guard in the app | `auto-organize.service.ts:64,205,351,365` | `writingPaths` Set skips the after-save evaluation for paths Auto Organize itself is writing. Precedent for a path-keyed synchronous own-write skip in an observer. |

Compatibility reading of the contract header (mods repo `mod-api.v1.ts:15-17`): a new optional parameter and a second callback argument are additive, no `apiVersion` bump. Existing mods written as `(path) => ...` keep working, and the default stays "hear everything" (`ignoreOwnWrites` off).

## 3. Proposed host design

### Signature (to be adopted in the canonical contract)

```ts
onNoteSaved: (
	callback: (path: string, content: string) => void,
	options?: { ignoreOwnWrites?: boolean },
) => () => void;
```

Content semantics to document: the plaintext saved at that moment; one call per save, in order, so N saves give N callbacks each with its own content; a later save may already have replaced it by the time the timer runs (same staleness the path already has).

### Host change in `mods-host.service.ts:566-591`

1. Validate `options`: `undefined` is fine; otherwise it must be a plain object and `ignoreOwnWrites`, when present, a boolean. Throw via `invalid(...)` (existing helper `:128`), message in the existing style, e.g. `onNoteSaved needs options.ignoreOwnWrites to be a boolean`. Mods are untyped JS, so this is a real boundary. Add the message to `help/documentation/mods/13-api-reference.md:258` and `15-errors-and-debugging.md:102`.
2. In the observer, take `(path, content)`. When `options.ignoreOwnWrites` is true and the write is this mod's own (see below), `return` before scheduling the timer. Evaluate it synchronously at fire time. Pass `content` as the second argument at `:579`.

### Own-write attribution

Recommended (Option A, exact for `vault.write`): a module-level synchronous scope kept in `mod-vault.service.ts` (no new file, no new import edge; `mods-host.service.ts` already imports from it, `:24`).

- `mod-vault.service.ts` exports something like `isOwnWrite(modId, absPath)`.
- In `vault.write`, replace the bare `notifyAfterSave(abs, content)` (`:135`) with: set `current = { modId, abs }` (save the previous value), call `notifyAfterSave`, restore in `finally`. Observers are invoked synchronously inside, so the mod's observer sees `current` matching and skips.
- Scope keyed by `modId`, not global: another mod with `ignoreOwnWrites` must still hear this mod's write (cross-mod reactions keep working), and host observers (search, history, Auto Organize) are untouched because the filter lives only inside the mod's observer.
- No timers, no TTL, no content comparison, no leak: the scope ends when the call returns, including when an observer throws (`notifyAfterSave` already catches per observer, `editor.hooks.ts:86-90`).

Option B (needed when item 1 lands, for an open tab): `updateNoteFrontmatter` calls `notifyAfterSave` from inside `writeTab` after `await saveFileByPath` (`frontmatter-write.service.ts:133`, `editor.service.ts:187-196`), so a sync scope around the wrapper does not cover it. The wrapper can instead hold an in-flight marker `(modId, abs)` for the duration of the call, and the observer records "candidate own write" at fire time; the decision is confirmed in the timer (still before the mod callback) by comparing `content` with the content the wrapper resolved with. Reason for the content check: `saveFileByPath` queues behind a pending save of the same path (`editor.service.ts:171-178`), so a user autosave inside the window must not be swallowed. Promise continuations of the wrapper run before the `setTimeout(0)` macrotask, so the resolved content is available at timer time. This is the part of item 1 and item 2 that must be designed together; item 2 alone only needs Option A.

Not covered, must be documented: writes through raw `ctx.app` (`saveFileByPath`, `editorStore`, `syncExternalContentToEditor`, `updateNoteFrontmatter`) and the `editNote` helper. They keep firing the mod's own callback. The doc should say `ignoreOwnWrites` covers `ctx.vault` writes (and `ctx.vault.updateFrontmatter` once item 1 ships).

If `ctx.vault.create` ever notifies (Issue 03 alternative), it must go through the same scope or `ignoreOwnWrites` would not cover it.

## 4. Risks

- **Loops that remain.** Two mods ping-ponging (A writes, B hears and writes, A hears B). `ignoreOwnWrites` is per mod; say so in the JSDoc. The pre-existing guidance (compare before write) still applies.
- **Auto Organize loop is independent.** A mod write fires the Auto Organize observer (`auto-organize.service.ts:204`), whose `writingPaths` only covers Auto Organize's own writes. A rule that runs a mod action which writes the same note can still re-trigger. Not changed by item 2; relevant to item 3 (`runAction` input).
- **Hearing user saves must not be lost.** The scope must be cleared in `finally`; a leaked scope would silence a mod. Test explicitly (section 6).
- **Race exposure (Option B only).** In-flight marker plus content equality; the residual case is a user save with byte-identical content to the mod's, which the mod would receive as identical text anyway.
- **Performance.** One object compare per save per subscribed mod; content is a reference to a string already in memory, retained only until the 0 ms timer. No indexing or watcher interaction: nothing here touches `applyNoteChange`, dedupe maps or `markRecentSave`, so `docs/agents/indexing-watcher-rules.md` rules 6, 8 are untouched. Rule 6 ("`save` must stay synchronous") is respected because `notifyAfterSave` is not modified, only wrapped.
- **Security (ADR 0036).** Mods run with the app's full trust (`docs/adr/0036-vault-mods-trust-loader-storage.md:41`, "No sandbox, no per-mod permission list"). Passing saved content gives a mod nothing it lacks: it can already `ctx.vault.read` any file and read every tab via `ctx.app`. Passing content to every subscriber adds no boundary. Do not log content (the `debug` lines must keep logging only the path; the existing failure log prints the error text, not the content).
- **Mod code files.** `vault.write` of a mod's own code/data returns before `notifyAfterSave` (`mod-vault.service.ts:132`), so no scope and no event; unchanged.
- **Content for non-note files.** The callback still fires for `.canvas`, `.view`, and so on (docs `07:187`); content can be large. Reference only, no copy.

## 5. Interactions with other items

- Item 1: `ctx.vault.updateFrontmatter` must register as an own write (Option B). Its absolute path is `${vaultPath}/${path}` like the other `ctx.vault` calls (`mod-vault.service.ts:36-40`).
- Item 3: a rule that calls a mod action runs `runAction(..., 'rule', ...)` (`mods-host.service.ts:336,514`); the action's `ctx.vault.write` calls are the mod's own writes and are attributed correctly through `modId`.
- Item 5: `onNoteCreated` is a separate event; keep `onNoteSaved` semantics unchanged.
- Issue 03 (`create` does not notify): decide it together; docs table at `help/documentation/mods/04-vault-files.md:306`.

## 6. Test plan (docs/TESTING.md rules: real stores, mock only Tauri/side-effect services)

Existing harness to extend: `src/tests/lib/plugins/mods/mod-note-saved.test.ts` (real `startModsHost`, real editor save via `saveFileByPath`, fake timers, `globals.__saveCtx`; its `readDir` mock lists one mod, `:7`, so a second mod needs the mock widened). Write each test first, see it fail, then implement.

`mod-note-saved.test.ts`:
1. Content: an editor save delivers `(relativePath, savedContent)`; two quick saves deliver two calls in order with their own content.
2. Default unchanged: without options, the mod's own `ctx.vault.write` still calls back, now with the written content (backward compatibility).
3. `{ ignoreOwnWrites: true }`: own `ctx.vault.write` does not call back; an editor save of the same path right after (separate tick) does, with its content.
4. Cross-mod: mod A writes; mod B with `ignoreOwnWrites` is called; A is not.
5. Subscriptions are independent: one mod, one subscription with the option and one without; only the second hears the own write.
6. Scope cleanup: a `vault.write` that rejects (dirty open tab, `mod-vault.service.ts:125`) does not leave a scope behind; the next user save is heard. Same after an observer that throws inside the scope.
7. Invalid options (`true`, `'yes'`, `{ ignoreOwnWrites: 'yes' }`, `null`) throw `onNoteSaved needs ...`; `undefined` and `{}` accepted.
8. Existing unload, dispose and vault-switch cases keep passing with the new argument.

`mod-vault.service.test.ts` (`describe('write', ...)`, `:171`): the scope is set only during `notifyAfterSave` and restored (including nested calls); a mod-code write (`:190`) never sets it.

Contract tests: `mod-api-contract.test.ts` needs no key change (name already frozen, `:52`). Add a compile-time check, for example `expectTypeOf<ModContextV1['onNoteSaved']>().parameters.toEqualTypeOf<[(path: string, content: string) => void, ({ ignoreOwnWrites?: boolean } | undefined)?]>()`, so a later contract edit cannot drop the option.

Docs-copy test: `src/tests/help/mods-types.test.ts` asserts that the `...V1` types of `help/examples/mods/kokobrain-mod.d.ts` equal the contract's (`ModContextV1` is in `STABLE_TYPES`), so `kokobrain-mod.d.ts:378` must be updated in the same commit as the SHA bump or `pnpm check` fails. `mods-example.test.ts:46` and `mods-examples.test.ts:295` fakes keep working (no example listens to saves).

Gate: frontend only, so `pnpm check` + `pnpm vitest run` (CLAUDE.md rule 6); `pnpm build` also because `package.json` and the lockfile change with the SHA bump. Layer tests (`src/tests/lib/architecture/layer-rules.test.ts`) need no baseline change: no new import is introduced.

## 7. Files an implementation touches (host)

Code
- `src/lib/plugins/mods/mods-host.service.ts:566-591` (options check, content argument, own-write filter).
- `src/lib/plugins/mods/mod-vault.service.ts:135` plus a small exported `isOwnWrite`-style helper in the same file.
- `package.json:81` and `pnpm-lock.yaml` (SHA of the new contract commit), per `docs/MOD-CORE.md`.
- `help/examples/mods/kokobrain-mod.d.ts:375-378` (copy of the contract text).

Tests: `src/tests/lib/plugins/mods/mod-note-saved.test.ts`, `mod-vault.service.test.ts`, `mod-api-contract.test.ts`.

Docs that state the old behaviour and need an edit
- `help/documentation/mods/07-events-and-reactivity.md:179` ("The callback gets only the path: no content"), `:189-195` table, `:224-236` loop section.
- `help/documentation/mods/13-api-reference.md:101,106,258`; `15-errors-and-debugging.md:102`.
- `help/documentation/28-mods.md:171-176`; `mods/04-vault-files.md:292` warning; `mods/16-pitfalls-checklist.md:85,197`; `mods/14-cookbook.md` recipes 15 (`:1992-2134`) and 20 (`:2573-2649`); `mods/README.md:92`.
- `help/documentation/mods/12-types-build-and-test.md:477,570` mention the fake's `onNoteSaved` (mods repo follow-up: `packages/mod-core/src/testing/fake-ctx.ts:237` is `notModelled('onNoteSaved')`).

## 8. Not checked / open

- I did not verify that no other help doc test pins the exact doc strings above (grep in `src/tests/help/` found only the two fakes and the d.ts test).
- Option B's microtask-before-timer ordering is reasoned from the code (`writeTab` resolves after `notifyAfterSave`, `editor.service.ts:196-198`), not exercised; it needs a real test with an open tab when item 1 is built.
- Whether `ignoreOwnWrites` should also cover `ctx.vault.rename/move` events is moot today (they do not fire `onNoteSaved`, docs `07:195`); revisit with item 5.
- Decision for the owner: ship Option A alone first (exact, tiny) and add Option B with item 1, or wait and ship both together. Recommendation: A first.
