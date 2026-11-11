# 02: `ctx.onNoteSaved` passes the saved content and can ignore the mod's own writes

**What to build:** a mod's save callback gets the saved text as a second argument, and `ctx.onNoteSaved(cb, { ignoreOwnWrites: true })` skips the saves this mod caused through `ctx.vault.write`. A mod that stamps notes on save then stops hearing its own stamp. The default is unchanged: without the option, every save is reported, the mod's own included.

```javascript
ctx.onNoteSaved(async (path, content) => {
	if (!path.endsWith('.md') || content.includes('#seen')) return;
	const current = await ctx.vault.read(path);
	if (!current.includes('#seen')) await ctx.vault.write(path, `${current}\n#seen`);
}, { ignoreOwnWrites: true });
```

**Blocked by:** none

**Requires first (other repo):** mods Issue `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/.scratch/mods-power/issues/02-on-note-saved-own-writes.md` delivered and pushed: the contract signature `onNoteSaved: (callback: (path: string, content: string) => void, options?: { ignoreOwnWrites?: boolean }) => () => void`. This Issue adopts that commit's full SHA (or a later mods SHA that contains it) per `docs/MOD-CORE.md` "Updating the dependency", in the same commit as the host change: after the bump alone, `callback(relative)` (`src/lib/plugins/mods/mods-host.service.ts:579`) fails `pnpm check`.

**Status:** ready-for-agent

**Gate:** frontend, plus `pnpm build` because `package.json` and `pnpm-lock.yaml` change: `pnpm check` + `pnpm vitest run` + `pnpm build`. Also MOD-CORE.md steps 2 and 6 in the mods workspace (`pnpm check:package <consumer>`, `KOKOBRAIN_HOST_ROOT=<this checkout> pnpm verify`).

### Behavior

1. **Adopt the contract.** `package.json:81` and `pnpm-lock.yaml` point at the new SHA (MOD-CORE.md steps 3-5). `help/examples/mods/kokobrain-mod.d.ts:372-378` copies the new `onNoteSaved` signature and JSDoc word for word; `src/tests/help/mods-types.test.ts:108` pins `ModContextV1` equal to the contract. `STABLE_TYPES` (`mods-types.test.ts:25-47`) is unchanged: the option type is inline.
2. **Own-write marker** in `src/lib/plugins/mods/mod-vault.service.ts`:
   - one module-level `let ownWrite: { modId: string; abs: string } | null = null` and an exported `isOwnWrite(modId, abs)` that is true only while that mod's `vault.write` of that path runs the after-save fan-out. JSDoc on both.
   - at `:135`, replace the bare `notifyAfterSave(abs, content)` with: save the previous marker, set `{ modId, abs }`, call `notifyAfterSave`, restore the previous marker in `finally`.
   - This is race-free because `notifyAfterSave` calls every observer synchronously (`src/lib/core/editor/editor.hooks.ts:67-92`; `applyNoteChange` is `void`ed at `:81`). `vault.write` arms no later autosave that would escape the marker: `syncExternalContentToEditor(abs, content, true, 'none')` (`:129`) marks the tab saved and starts no timer (`src/lib/core/editor/editor.service.ts:79-91,243-251`).
   - The mod-code early return (`:132`) stays before the marker: no notify, no marker.
   - Keying by `modId` is sound: one live instance per id, and a replaced instance's observer returns on `runtime.unloaded` first (`mods-host.service.ts:573,577`).
3. **`ctx.onNoteSaved`** (`mods-host.service.ts:566-591`):
   - Accept `(callback, options)`. `options` may be `undefined`. Otherwise it must be a non-null object, or throw `invalid('onNoteSaved needs options to be an object')`; and `options.ignoreOwnWrites` must be `undefined` or a boolean, or throw `invalid('onNoteSaved needs options.ignoreOwnWrites to be a boolean')` (helper at `:128`). Mods are untyped JS, so this is a real boundary.
   - The observer at `:571` takes `(path, content)`. When `ignoreOwnWrites` is true and `isOwnWrite(manifest.id, path)`, return before scheduling the timer. The check runs in the observer, at fire time: the marker is gone by the time the timer runs.
   - `:579` calls `callback(relative, content)`.
   - Never log `content`. The failure log at `:570` keeps printing only the error text.
   - Unload, disposal and vault-switch handling are unchanged.
4. **Coverage of "own".** Only this mod's `ctx.vault.write`. The `editNote` helper's disk branch goes through `ctx.vault.write` (mods repo `packages/mod-core/src/notes/editor.ts:41-44`) and is covered; its open-tab branch (a CodeMirror edit saved later by autosave, `editor.ts:28-35`) and every raw `ctx.app` write (one shared `MOD_APP` for all mods, `src/lib/plugins/mods/mod-app.service.ts:26-68`) are ordinary saves. Another mod with the option still hears this mod's writes.

### Docs

State in user terms: the callback is `(path, content)`; `content` is a snapshot, so read it to decide but read the note again right before writing; `{ ignoreOwnWrites: true }` skips only this mod's `ctx.vault.write` saves (not `ctx.app` writes, editor edits, other mods or an Auto Organize rule running the mod's action, `src/lib/features/auto-organize/auto-organize.service.ts:369-401`), so comparing before writing is still the guard that ends a loop between two writers; on an app older than this change, the option is ignored and `content` is `undefined`, so a mod that may run there checks `typeof content === 'string'` (`minAppVersion` is not enforced, `help/documentation/28-mods.md:86`).

- `help/documentation/mods/07-events-and-reactivity.md`: the example and text at `:173-179` ("The callback gets only the path: no content"), one sentence under the table at `:183-200` on which writes the option skips, and the "Avoiding save loops" section at `:224-236`.
- `help/documentation/mods/13-api-reference.md`: signature `:101`, the `onNoteSaved` bullet `:106` ("with the vault-relative path only", "can loop"), error row `:258`.
- `help/documentation/mods/15-errors-and-debugging.md:102`: the two new messages.
- `help/documentation/28-mods.md:171-176`.
- `help/documentation/mods/04-vault-files.md:292` (the loop warning).
- `help/documentation/mods/16-pitfalls-checklist.md:85` and `:197`.
- `help/documentation/mods/README.md:92`.
- `help/documentation/mods/14-cookbook.md` recipes 15 (`:1992-2134`, "receives only the vault-relative path" at `:2132`) and 20 (`:2573-2649`): a one-line mention of the option. Both already guard by content and need no rewrite.

`help/documentation/mods/12-types-build-and-test.md:477,570` stay: `fakeCtx` still does not model `onNoteSaved`.

### Acceptance

- [ ] Failing test first, in `src/tests/lib/plugins/mods/mod-note-saved.test.ts`: an editor save (`saveFileByPath`, as at `:56-69`) delivers `('Ideas/Note.md', 'edited')`, and two quick saves deliver two calls in order, each with its own content. It fails today: the callback gets only the path (`mods-host.service.ts:579`).
- [ ] Without options, the mod's own `ctx.vault.write('Ideas/Note.md', 'mine')` still calls back, with `'mine'`.
- [ ] With `{ ignoreOwnWrites: true }`, the mod's own `vault.write` does not call back; an editor save of the same path in a later tick does, with its content.
- [ ] Cross-mod: mod A writes; mod B with `ignoreOwnWrites` is called, and A (also with the option) is not. The `readDir` mock at `:7` lists two mods.
- [ ] One mod with two subscriptions, one with the option and one without: only the second hears the own write.
- [ ] Options: `null`, `true`, `'yes'` throw `onNoteSaved needs options to be an object`; `{ ignoreOwnWrites: 'yes' }` throws `onNoteSaved needs options.ignoreOwnWrites to be a boolean`; `undefined`, `{}` and `{ ignoreOwnWrites: false }` are accepted.
- [ ] The existing tests at `:56-125` (throws and rejections, disposal, unload, vault switch, non-function callback) still pass with the second argument.
- [ ] No `debug` or `error` call receives the saved content.
- [ ] Contract adopted: `package.json` and `pnpm-lock.yaml` name the new SHA and `packages/mod-core`, with no credentials, workspace links or personal paths; `kokobrain-mod.d.ts` matches the contract (`mods-types.test.ts` passes).
- [ ] Docs above updated.
- [ ] Gate: `pnpm check`, `pnpm vitest run` and `pnpm build` pass; mods workspace `pnpm check:package <consumer>` and `KOKOBRAIN_HOST_ROOT=<this checkout> pnpm verify` pass.

## Notes

- **Research:** `.scratch/mods-power/research/item-02-host.md`, `item-02-contract.md` and `item-02-validation.md` (the validation wins where they differ). Code read at `c2bed3463`; mods repo at `03526cfee`.
- **Decisions taken from the validation:**
  - Opt-in option, not the default: the default must not change for a stable member.
  - A synchronous marker around the one `notifyAfterSave` call, exact for `ctx.vault.write`. No timers, no TTL, no content comparison. `try/finally` is what prevents a leaked marker from silencing a mod.
  - No separate `mod-vault.service.test.ts` test of `isOwnWrite`: the behavior tests go through the real write path, and a unit test would restate the implementation.
  - No test that "a rejected `vault.write` leaves no marker": the dirty-tab throw (`mod-vault.service.ts:125`) happens before the marker is set, and `notifyAfterSave` catches each observer's throw (`editor.hooks.ts:86-90`), so such a test passes with a leaking marker too.
  - No `expectTypeOf` pin of the parameters in `mod-api-contract.test.ts`: `mods-types.test.ts:108` and host `tsc` already catch a dropped option. `mod-api-contract.test.ts:52` freezes names only and needs no change.
- **Accepted limits:**
  - Loops that remain: raw `ctx.app` writes, `editNote` on the active tab, two mods writing each other's notes, a mod plus an Auto Organize rule. Documented, not handled.
  - Stale `content` written back: a callback that awaits and then writes `transform(content)` can overwrite a newer save. The dirty-tab guard (`mod-vault.service.ts:124-125`) only protects unsaved edits. The docs tell mods to re-read before writing.
  - Version skew (old app, new mod) is documented, not enforced.
- **Ordering with other mods-power Issues:**
  - Items 1, 5 and 6 also edit `mods-host.service.ts` and/or `mod-vault.service.ts`: run them one after another, not in parallel with this one.
  - Whichever host Issue first adopts a mods SHA containing this contract change must make `:579` pass `content`, or `pnpm check` fails. If another Issue adopts first, it carries at least that line; this Issue then needs no bump.
  - For item 1: `ctx.vault.updateFrontmatter` must set the same marker from the call until it settles, with a per-key counter so two calls on one path do not clear each other. Record it in item 1's Issue; nothing here.
  - For item 5: create and move events reuse `{ ignoreOwnWrites }` with the same meaning. If `ctx.vault.create` starts notifying (`.scratch/mods-host-robustness/issues/03-note-saved-fires-for-mod-creates.md`), it must set the marker.
- **Security:** no new capability under ADR 0036 (`docs/adr/0036-vault-mods-trust-loader-storage.md`). Mods already read every tab through `ctx.app.editorStore` and every file through `ctx.vault.read`.
- **Layers:** no new import edge; `mods-host.service.ts` already imports `mod-vault.service.ts`. No `layer-baseline.json` change.
- **Not verified:** the `tsc` arity error after a bump-only commit is reasoned, not run. Whether a loader path can create two live contexts with one mod id (a reload racing an enable) was not checked.

## Comments
