# Item 2 validation: `onNoteSaved` ignores own writes, passes content

Adversarial check of `item-02-host.md` and `item-02-contract.md`. Nothing was run. `H:` = `/Users/diegorv/Dev/pet-projects/koko/brain`, `M:` = `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`.

## Verdict

- **Cost: small.** About 15 lines of host code in two files, one signature in the contract, one test double in the mods repo, and a pin bump. Most of the work is the docs (section 5).
- **Contract change: yes.** But it is not "additive per the header", as the contract scout says. Section 2 explains why and what to add to the header.
- **Design:** the host scout's Option A is correct and exact for `ctx.vault.write`. I add three corrections: a vacuous test, a new type that trips a docs test the scouts missed, and two risks they did not list (stale content written back, version skew). For item 1, the Auto Organize precedent is simpler than Option B.

## 1. Claims checked

| Claim | Result | Evidence |
|---|---|---|
| The observer already gets `(filePath, content)`; the mod wrapper drops `content` | Confirmed | `H:src/lib/core/editor/editor.hooks.ts:10,87`; `H:src/lib/plugins/mods/mods-host.service.ts:571` `addAfterSaveObserver((path) => {`, `:579` `callback(relative)` |
| `notifyAfterSave` calls every observer synchronously, so a sync scope around it is race-free | Confirmed | `editor.hooks.ts:67-92`. `applyNoteChange` is `void`ed (`:81`), so no await happens inside the call. |
| `vault.write` notifies at `:135` and skips mod code files at `:132` | Confirmed | `H:src/lib/plugins/mods/mod-vault.service.ts:118-136` |
| `vault.write` does not trigger a second, unattributable editor autosave | Confirmed (scouts did not check) | `syncExternalContentToEditor(abs, content, true, 'none')` (`mod-vault.service.ts:129`) marks the tab saved and arms no timer (`H:src/lib/core/editor/editor.service.ts:79-91`, `:243-251`). The CodeMirror replace runs with `isExternalEdit = true`, which suppresses `onContentChange` (`H:src/lib/core/markdown-editor/MarkdownEditor.svelte:640-650`). So no spurious save fires later outside the scope. |
| `MOD_APP` is shared, so raw `ctx.app` writes cannot be attributed | Confirmed | `H:src/lib/plugins/mods/mod-app.service.ts:26-68` is one module-level object; `mods-host.service.ts:598-601` returns it to every mod |
| (contract scout) `editNote` cannot be attributed | **Partly wrong** | `M:packages/mod-core/src/notes/editor.ts:25-45`. The disk branch (no matching active tab) goes through `ctx.vault.write` (`:44`), so Option A covers it. Only the active-tab branch, a CodeMirror dispatch saved later by autosave (`:38`), is unattributable. |
| (contract scout) the change is additive per the header | **Overstated** | `M:packages/mod-core/src/contract/mod-api.v1.ts:15-16` says "a new `ModContextV1` member is additive; removing or changing a member is a major change that bumps `apiVersion`." Changing `onNoteSaved`'s signature is literally "changing a member". It breaks no mod, but the header rule does not cover it. See section 2. |
| (contract scout) after a bump-only commit, `callback(relative)` fails `tsc` | Confirmed | With a `(path, content) => void` callback, a one-argument call is an arity error. The bump and the host change land in one commit. |
| (contract scout) `M:test/examples-save.test.ts` must change | Confirmed | `:9-10`: a `(path, content) => void` handler is not assignable to `Set<(path: string) => void>`. |
| Host member-name freeze needs no change | Confirmed | `H:src/tests/lib/plugins/mods/mod-api-contract.test.ts:52` freezes names only |
| (contract scout) `ModNoteSavedOptionsV1` as a new named type is free | **Wrong, missed cost** | `H:src/tests/help/mods-types.test.ts:25-47,60-61` fails at runtime when the contract gains an exported type that is not in `STABLE_TYPES`. It also needs a matching `expectTypeOf` pin (pattern at `:108`) and a declaration in `H:help/examples/mods/kokobrain-mod.d.ts`. Neither scout lists this. |
| (host scout) test 6 "a rejected `vault.write` (dirty tab) leaves no scope" | **Vacuous** | The dirty-tab throw is at `mod-vault.service.ts:125`, before the scope is opened, so the test passes even with a leaking scope. "An observer that throws" is vacuous too: `notifyAfterSave` catches per observer (`editor.hooks.ts:86-90`). What protects against a leak is `try/finally`. The test that means something: after an own write, a user save of the same path in a later tick is heard (host test 3 already covers this). Drop test 6. |
| (host scout) Option B microtask ordering for item 1 | Confirmed, but fragile | Tab branch: `writeTab` notifies, then returns (`editor.service.ts:192-197`). The `saveFileByPath` chain (`:171-178`) and `attempt`'s `await` / `return next` (`H:src/lib/core/frontmatter/frontmatter-write.service.ts:132-140`) run as microtasks only. Closed branch: notify, then a synchronous return (`:160-162`). The ordering holds today, but one added IPC `await` after the save would break it silently. |
| Auto Organize's `writingPaths` precedent | Confirmed, and it is **not** a sync scope | `H:src/lib/features/auto-organize/auto-organize.service.ts:351-366`: the path stays in the Set across awaits. Rule actions run outside it on purpose (`:369-371`). |

## 2. Contract change (yes)

Proposed signature, at `M:packages/mod-core/src/contract/mod-api.v1.ts:357-362`:

```ts
onNoteSaved: (
	callback: (path: string, content: string) => void,
	options?: { ignoreOwnWrites?: boolean },
) => () => void;
```

- **Inline option type, not `ModNoteSavedOptionsV1`.** A named type costs a `STABLE_TYPES` entry, an `expectTypeOf` pin and a d.ts declaration (row above). The inline type costs nothing beyond the d.ts line `H:help/examples/mods/kokobrain-mod.d.ts:378`, which `mods-types.test.ts:108` already pins through `ModContextV1`. The trade-off is that it breaks the `*OptionsV1` naming convention (`mod-api.v1.ts:36`). Owner's call; inline is the cheaper choice.
- **Header sentence.** Amend `mod-api.v1.ts:15-16` in the same commit, so the rule says that an added optional parameter and an added trailing callback argument are additive. Otherwise the next reader of the header will want an `apiVersion` bump. `apiVersion` stays `1`.
- **JSDoc must state:**
  - `content` is the text that was saved, a snapshot (section 4, risk 1).
  - "Own writes" means this mod's `ctx.vault.write` (plus `ctx.vault.updateFrontmatter` once item 1 lands). Edits through `ctx.app` or the editor count as ordinary saves.
  - The option filters only this mod's writes: two mods, or a mod and an Auto Organize rule, can still loop.
- **Mods repo files:**
  - Required: the contract and `test/examples-save.test.ts:9-12`.
  - Should: `docs/examples.md:51`.
  - Leave alone: `fake-ctx.ts:237` stays `notModelled` (modelling it is speculative).

## 3. Minimal host design

**`mod-vault.service.ts`.** One module-level marker and one exported predicate:

```ts
/** The mod whose `vault.write` is running the synchronous after-save fan-out, and its path */
let ownWrite: { modId: string; abs: string } | null = null;
export const isOwnWrite = (modId: string, abs: string) => ownWrite?.modId === modId && ownWrite.abs === abs;
```

At `:135`: `const prev = ownWrite; ownWrite = { modId, abs }; try { notifyAfterSave(abs, content); } finally { ownWrite = prev; }`.

- Keep `abs` in the marker. It costs nothing and stays correct if a future observer nests a synchronous notify for another path.
- Keying by `modId` is sound because the loader allows one live instance per id. A replaced instance's observer bails on `runtime.unloaded` first (`mods-host.service.ts:573,577`).

**`mods-host.service.ts:566-591`.**

- Validate `options`: `undefined` is accepted. Anything else must be a non-null object whose `ignoreOwnWrites` is `undefined` or a boolean; otherwise throw through `invalid(...)`, in the existing style. Mods are untyped JS, so this is a real boundary.
- Take `(path, content)`. If `options?.ignoreOwnWrites && isOwnWrite(manifest.id, path)`, return before scheduling the timer. The check must run at fire time, because the marker is gone by the time the timer runs.
- Call `callback(relative, content)`.

**Pin and copy.** `H:package.json:81` and the lockfile (new SHA, `H:docs/MOD-CORE.md`), and `help/examples/mods/kokobrain-mod.d.ts:378`.

**Tests (written first).** In `H:src/tests/lib/plugins/mods/mod-note-saved.test.ts`, host scout tests 1-5, 7 and 8:

- Test 4 (cross-mod) needs the `readDir` mock at `:7` widened to two mods.
- Drop test 6 (vacuous).
- `mod-vault.service.test.ts` needs no separate scope test: the behaviour tests cover it through the real write path, and a unit test of `isOwnWrite` would only restate the implementation.

**Cut as speculative:**

- Option B. It belongs to item 1's Issue, not this one.
- Modelling `fakeCtx.onNoteSaved`.
- The `expectTypeOf` parameter pin in `mod-api-contract.test.ts`. `mods-types.test.ts:108` plus host `tsc` already catch a dropped option.
- The `package-consumer` fixture pin.

**Considered and rejected:** making own-write skipping the default, with no option. It means less API, and no mod in `M:mods/` subscribes (`grep onNoteSaved` hits only the example and the test). But it silently changes a stable member's behaviour, and the owner explicitly asked for the opt-in.

**For item 1 (record in its Issue).** Use the Auto Organize precedent instead of Option B's content comparison:

- `ctx.vault.updateFrontmatter` holds `(modId, abs)` in the same marker from the call until it settles.
- Use a per-key counter, not a Set, so two concurrent calls on one path do not clear each other.
- Trade-off: a user save of that path queued inside the window (`saveFileByPath` chains behind a pending save, `editor.service.ts:171-178`) is not delivered to that mod. That loses one event, never data, and it is the same trade-off Auto Organize accepts (`auto-organize.service.ts:205`).
- Option B is exact, but it relies on the microtask ordering above.

## 4. Risks the design must handle

1. **Data loss: stale `content` written back (not in either scout report).** The callback runs in a later timer (`mods-host.service.ts:575`) and may `await` before it writes. If the user saves again in between, `ctx.vault.write(path, transform(content))` overwrites the newer save. The dirty-tab guard (`mod-vault.service.ts:124-125`) only protects unsaved edits, not a newer saved version. Passing `content` invites exactly this pattern. JSDoc and docs must say: read `content` to decide; to write, re-read right before writing, or use `ctx.vault.updateFrontmatter` (item 1), which edits the current text. This is an argument for shipping item 1 no later than item 2.
2. **Version skew: an old host and a new mod (not in either report).** An older app ignores the second argument and calls `callback(path)`. `ignoreOwnWrites` is then silently ignored, so the mod loops, and `content` is `undefined`. `vault.write(path, content + x)` would then write the literal text `undefined...`. `minAppVersion` is parsed but never enforced (`H:src/lib/plugins/mods/mods.logic.ts:199-206`; docs `H:help/documentation/28-mods.md:86` "not enforced"). The owner is the only user, so the risk is low, but it has the shape of data loss. The minimum fix: document "check `typeof content === 'string'`" for mods that may run on older apps. Enforcing `minAppVersion` would be a separate decision; I do not propose it here.
3. **Loops that remain.**
   - A mod's active-tab `editNote` edit (autosave), and raw `ctx.app` writes.
   - Two mods ping-ponging.
   - A mod and an Auto Organize rule: the rule runs the mod action outside `writingPaths` (`auto-organize.service.ts:369-371`, `:380-401`). The action's write fires the observer at `:204` again, so only the property gates and the rule's conditions stop a re-run. Item 2 does not change any of this. Document it.
4. **A leaked marker would silence a mod.** `try/finally` around a synchronous call is enough. No timer or TTL is needed.
5. **Security:** no new capability. Mods already read every tab through `ctx.app.editorStore` (`mod-app.service.ts:28`) and every file through `ctx.vault.read`. ADR 0036 sets full trust. Keep `content` out of `debug` lines.
6. **Memory:** each pending timer holds a reference to an existing string (large for canvases) until 0 ms later. Nothing is copied. Acceptable.

## 5. Docs surface

Fifteen help files mention `onNoteSaved` (`grep -c`). The scouts' list covers the statements that become false. Two more need edits:

- `help/documentation/mods/README.md:92` ("never write the same note again ... it loops").
- `mods/07-events-and-reactivity.md:179` ("The callback gets only the path: no content").

Also update the table in 07 (`:189-197`) with one sentence on coverage, and the "can loop" line in `13-api-reference.md:106`. Cookbook recipes 15 and 20 still work unchanged (both guard by content), so a one-line mention of the option is enough; no rewrite is needed.

## 6. Ordering against the other items

- **One mod-core commit for every contract change.** Items 1, 2, 4 and 5 each touch `mod-api.v1.ts`, and every adoption costs the full `MOD-CORE.md` sequence plus `pnpm build`. The contract work for these items should be one mods-repo commit and one host SHA bump. Each host Issue then implements against that pin. A bump-only host commit is not possible, because it fails `pnpm check` (section 1). The first host Issue to land carries the bump and stubs nothing: every other new member must exist in the host by then, or `ModContext extends ModContextV1` fails (`mods-host.service.ts:36`). The other route is to bump per Issue in sequence. That is more ceremony but keeps Issues independent; the owner picks.
- **Run 2, 1, 5 and 6 one after another, not in parallel.** All four edit `mods-host.service.ts` (2 at `:566-591`; 6 the same `report` at `:570`; 5 adds sibling subscriptions) and/or `mod-vault.service.ts` (1 and 2).
- **Item 2 before or together with item 1.** Item 1's `updateFrontmatter` must open the same marker (section 3). Risk 1 makes item 1 the safe write path for content-driven mods.
- **Item 5:** reuse `{ ignoreOwnWrites }` with the same meaning on create and move events. If `ctx.vault.create` starts notifying (`H:.scratch/mods-host-robustness/issues/03-note-saved-fires-for-mod-creates.md`), it must open the marker.
- **Items 3, 4 and 7:** independent of item 2. Item 3 inherits the rule-action loop in risk 3.

## Not verified

- I did not run `tsc` to confirm the arity error and the `Set` assignability error. Both are reasoned from `strict` TypeScript rules.
- I did not check whether any loader path can create two live contexts with the same `modId` at once (for example a reload racing an enable). I relied on the `runtime.unloaded` checks at `mods-host.service.ts:573,577`.
- I did not verify whether Issue 10's rule-action loop is guarded anywhere beyond the property gates (`auto-organize.service.ts:381-388`).
