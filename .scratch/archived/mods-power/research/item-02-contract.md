# Item 2 (onNoteSaved ignores own writes, passes content): contract side

Paths: `M:` = `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`, `H:` = `/Users/diegorv/Dev/pet-projects/koko/brain`.
Nothing was run (no tests, builds, commits). Every claim below was read in code.

## Verdict

The item needs a contract change, and it is additive (no `apiVersion` bump).

Current signature, `M:packages/mod-core/src/contract/mod-api.v1.ts:362`:

```ts
onNoteSaved: (callback: (path: string) => void) => () => void;
```

Neither requested capability fits it:

- `{ ignoreOwnWrites: true }` is a second parameter that does not exist. A mod calling `ctx.onNoteSaved(cb, { ignoreOwnWrites: true })` fails `tsc` ("expected 1 argument"), and the contract is the only source of the type mods compile against (`M:packages/mod-core/package.json` exports `./contract`).
- "Passes the saved content" is a second callback argument. A mod writing `(path, content) => ...` fails `tsc` against `(path: string) => void`.

The host already has the content at hand: `AfterSaveObserver = (filePath, content) => void` (`H:src/lib/core/editor/editor.hooks.ts:12`) and the host's `onNoteSaved` wrapper (`H:src/lib/plugins/mods/mods-host.service.ts:566-587`) simply drops it, calling `callback(relative)`.

## Proposed contract text

Replace line 357-362 of `mod-api.v1.ts` and add one options interface next to the other `*OptionsV1` types (existing style: `ModNotifyOptionsV1` at line 36):

```ts
/** Options for `ctx.onNoteSaved` */
export interface ModNoteSavedOptionsV1 {
	/** Skip saves this mod caused through `ctx.vault` (see `onNoteSaved`); `false` when omitted */
	ignoreOwnWrites?: boolean;
}

onNoteSaved: (
	callback: (path: string, content: string) => void,
	options?: ModNoteSavedOptionsV1,
) => () => void;
```

Doc comment must (a) say `content` is the text that was saved (the host's after-save content, plaintext), (b) define "own write" exactly (below), (c) drop or qualify the sentence "Writing again with vault.write can loop; switching off the mod in Labs stops it", which the option now answers for `ctx.vault` writes only.

Positional `(path, content)` matches the host observer (`editor.hooks.ts:12`) and keeps old callbacks valid. An event object (`{ path, content }`) would be more extensible but would break every existing `(path) => ...` callback, so it is not additive. Not recommended.

### Why this is additive (header rule at `mod-api.v1.ts:15-17`)

- Mods are the consumers of the callback type. A mod's old `(path) => ...` still type-checks (fewer parameters is assignable) and a one-argument call still type-checks (`options` optional).
- Type-level breakage lands only on code that implements or doubles the context, not on mods: the host's implementation and hand-rolled test doubles. Concretely `M:test/examples-save.test.ts:9-10` declares `handlers = new Set<(path: string) => void>()` and does `ctx.onNoteSaved = (handler) => { handlers.add(handler); ... }`. With the new callback type, `handler` requires two parameters and is not assignable to `(path: string) => void`, so `pnpm typecheck` fails until that test is updated (tsconfig includes `test` and `examples`: `M:tsconfig.json` `include`).
- Per the header, adding a member (or here an optional parameter) needs no `apiVersion` bump; `apiVersion` stays `1`.

### What "own write" must mean in the contract (host decides, contract must state it)

Paths in the host that reach the after-save observers:

- `ctx.vault.write` calls `notifyAfterSave(abs, content)` at `H:src/lib/plugins/mods/mod-vault.service.ts:135` (not for mod-code files, line 131). Attributable to the mod.
- `updateNoteFrontmatter` calls `notifyAfterSave(path, next)` at `H:src/lib/core/frontmatter/frontmatter-write.service.ts:161`. Attributable only if the mod goes through the stable item-1 `ctx.vault.updateFrontmatter` (to be built); the raw `ctx.app.updateNoteFrontmatter` is not attributable today.
- `editNote` (`M:packages/mod-core/src/notes/editor.ts:25,38`) edits the open tab through `ctx.app.editorStore` and relies on the editor's autosave, which fires its own `notifyAfterSave`. The host cannot tell that save from a user keystroke save.

So the contract text should say: "own writes are those made through this mod's `ctx.vault` calls (`write`, and `updateFrontmatter` once it exists); edits through `ctx.app` or the editor are saves like any other." Stating this limit once is enough; no core change is proposed (memory: no core changes for corner cases).

## Files to change in the mods workspace

1. `M:packages/mod-core/src/contract/mod-api.v1.ts` (lines 356-362): new `ModNoteSavedOptionsV1`, new signature, rewritten doc comment. The header comment at line 16-17 ("a new ModContextV1 member is additive") needs no edit.
2. `M:test/examples-save.test.ts:9-12`: widen the double to `Set<(path: string, content: string) => void>` and have `emit` pass a content string. Required, or `pnpm typecheck` fails.
3. `M:docs/examples.md:51-53`: the recipe says "Removing a listener after awaiting a write is not a write-loop guard ... avoids the loop by staying read-only". Add a sentence on `ignoreOwnWrites` and its coverage limit (above). Optional: a second example (a stamper that writes with `ctx.vault.write` and subscribes with `{ ignoreOwnWrites: true }`) in `M:examples/` plus a test and a docs entry. `M:examples/note-save-reaction.ts` itself needs no change (it only logs).
4. `M:packages/mod-core/src/testing/fake-ctx.ts:237`: `onNoteSaved: notModelled('onNoteSaved')` throws if called, and the file header (line 3) and the host doc (`H:help/documentation/mods/12-types-build-and-test.md:477,570`) list it as deliberately not modelled. No change is required for the contract to work. Optional: model it (store callbacks; fire them from the fake `vault.write` at `fake-ctx.ts:277` unless `ignoreOwnWrites`), which would let the examples test drop its hand-rolled `Set`. Only do this if the owner wants the loop behavior testable in mod unit tests; if so, update `M:packages/mod-core/test/testing/fake-ctx.test.ts` and the "does not model" doc lines in the host.
5. `M:test/fixtures/package-consumer/main.ts:35-43`: optional compile pin, e.g. a call with `(path, content)` and `{ ignoreOwnWrites: true }`, and a `@ts-expect-error` for a non-boolean option. It runs only in `pnpm check:package <prepared-consumer>` (`M:scripts/check-core-package.mjs`).

No mod under `M:mods/` calls `onNoteSaved` (grep over the workspace found it only in `test/examples-save.test.ts`, `examples/note-save-reaction.ts`, `docs/examples.md`, the contract, `fake-ctx.ts` and `.scratch/` notes), so no mod source changes and no `test/registrations.baseline.json` edit.

## Checks and tests that pin the contract

Mods workspace (`M:package.json` scripts):

- `pnpm typecheck` = `tsc -p tsconfig.json` over `packages/*/src`, `packages/*/test`, `mods/*`, `scripts`, `test`, `examples`. This is the real pin: no runtime test freezes the signature (`M:test/workspace.test.ts:16` only checks that `@kokobrain/mod-core/contract` resolves to `contract/mod-api.v1.ts`).
- `pnpm check` = typecheck + `scripts/check-bundle.mjs` + `pnpm test` + `pnpm test:host`. `test:host` (`test/host-integration`) needs `KOKOBRAIN_HOST_ROOT` pointing at the host checkout and none of those tests touch `onNoteSaved`.
- `pnpm verify` runs a temp build plus the complete `check`.
- `pnpm check:package <consumer>` for the installed-package view (required by `H:docs/MOD-CORE.md` step 2).

Host (`H:src/tests/lib/plugins/mods/mod-api-contract.test.ts`): freezes member names only. `CONTEXT_PUBLIC` lists `onNoteSaved: true` (line 52) and is checked with `satisfies Record<keyof ModContextV1, true>`; lines 230-231 compare `Object.keys(ctx)`. Signature and options are not pinned there, so this test passes unchanged. Behavior is covered by `H:src/tests/lib/plugins/mods/mod-note-saved.test.ts` (host scout's side).

## Host adoption sequence (`H:docs/MOD-CORE.md`)

Current pin: `H:package.json:81` is `...koko.brain-mods.git#328ca55f6add4d18e3c5b1490feee66ce8503b5e&path:/packages/mod-core`.

1. In the mods repo: edit contract (+ test double fix, docs), run `pnpm check` (with `KOKOBRAIN_HOST_ROOT`), commit, push.
2. `pnpm check:package` in a temp consumer (MOD-CORE.md step 2).
3. In Kokobrain: `pnpm add -D '@kokobrain/mod-core@github:diegorv/koko.brain-mods#<full-sha>&path:/packages/mod-core'`; inspect `package.json` and `pnpm-lock.yaml` (no credentials, no workspace links).
4. `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm vitest run`, `pnpm build` (build is required because `package.json` and the lockfile change).
5. Mods workspace `pnpm verify` with `KOKOBRAIN_HOST_ROOT`.

Ordering constraint: the SHA bump and the host implementation must land in the same host commit. After the bump alone, `callback(relative)` at `H:mods-host.service.ts:578` no longer type-checks (the contract callback now takes two required parameters), so `pnpm check` would be red for a bump-only commit. The host change in that same commit: pass `content` to `callback`, accept `options?.ignoreOwnWrites`, and skip own `ctx.vault` writes (design belongs to the host scout). `ModContext extends ModContextV1` (`H:mods-host.service.ts:36`) picks up the new signature automatically.

Host docs that state the old signature or the "can loop" advice and need updating after the host change (host scout's list; checked by grep): `H:help/documentation/mods/13-api-reference.md:101,106`; `07-events-and-reactivity.md:173-229,280,310,339`; `04-vault-files.md:292`; `14-cookbook.md` recipes 15 and 20 (about lines 1992-2134 and 2573-2649); `16-pitfalls-checklist.md:85,197`; `12-types-build-and-test.md:477,570`; `help/documentation/28-mods.md:171-176`.

## Risks and not verified

- Not verified: that `tsc` 7.0.2 reports the `Set<(path) => void>` assignment error in `examples-save.test.ts` (reasoned from `strict` in `M:tsconfig.json`, not run).
- Open design point for the owner: whether "own writes" should also cover the editor-tab edits of `editNote` (would need new host plumbing in the core editor save path; not proposed).
- Item 1 dependency: `ignoreOwnWrites` covers frontmatter edits only once `ctx.vault.updateFrontmatter` exists. Until then the raw `ctx.app.updateNoteFrontmatter` path still loops, as `14-cookbook.md:2649` documents.
