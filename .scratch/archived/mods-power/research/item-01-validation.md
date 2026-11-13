# Item 1 validation: stable `ctx.vault.updateFrontmatter`

Adversarial pass over `item-01-host.md` and `item-01-contract.md`. Nothing was run, built or committed. `B:` = `/Users/diegorv/Dev/pet-projects/koko/brain`, `M:` = `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`.

## Verdict

- **Cost: small in code (about 40 lines across both repos, plus about 8 adapter test cases), with the fixed overhead of a mod-core SHA adoption** (mods commit, push, host `package.json` + lockfile bump, which means `pnpm build` in the host gate, `B:CLAUDE.md` rule 6).
- **Contract change: yes.** `ModVaultV1` has no frontmatter writer (`M:packages/mod-core/src/contract/mod-api.v1.ts:136-161`); the only writer is raw (`M:packages/mod-core/src/unstable/raw.ts:76-77`, `B:src/lib/plugins/mods/mod-app.service.ts:53`). Additive, no `apiVersion` bump (`M:.../mod-api.v1.ts:15-16`; precedent: `328ca55` added `run.ui` to the contract without a bump).
- Both scouts are right on the core facts. Five load-bearing claims are wrong or overbuilt; see "Refuted".

## What holds (verified)

- `updateNoteFrontmatter(path, mutate): Promise<string>` does open tab, closed note, lossy refusal, vault switch, `create: false`, and ends in `notifyAfterSave` (`B:src/lib/core/frontmatter/frontmatter-write.service.ts:99-163`). It already has 21 tests (`B:src/tests/lib/core/frontmatter/frontmatter-write.service.test.ts`), so the adapter tests must not re-test those behaviors.
- Indexing rules 6 and 9 hold if the adapter only delegates: the write goes through `notifyAfterSave` (`frontmatter-write.service.ts:161`) and `toAbsolute` builds `${vaultPath}/${path}` (`B:src/lib/plugins/mods/mod-vault.service.ts:36-40`). No new `writeTextFile` call.
- Host `Property` and the raw `Property` are structurally identical (`B:src/lib/core/frontmatter/properties.types.ts:5-12`, `M:.../unstable/raw.ts:7-11`).
- Markdown-only guard is a real data-safety check, not polish: a file without `---` gives `detectLossyFrontmatter` null (`B:src/lib/core/frontmatter/properties.logic.ts:405-407`) and `rebuildContent` prepends a YAML block (`properties.logic.ts:689-697`), which corrupts a `.canvas`, `.view` or `main.js`.
- Host ordering trap is real: `createModVault` returns `ModVaultV1` (`mod-vault.service.ts:33`) and `VAULT_PUBLIC satisfies Record<keyof ModVaultV1, true>` (`B:src/tests/lib/plugins/mods/mod-api-contract.test.ts:68-77`, runtime check `:244-246`). SHA bump and implementation must land in one host commit.

## Refuted

1. **"`editNote` uses raw stores for frontmatter edits" (owner context) needs no change.** `editNote` is a text editor (`M:packages/mod-core/src/notes/editor.ts:24-42`). Its callers edit bodies (`M:mods/tasks`, `M:mods/one-on-one`, `M:packages/mod-core/src/notes/owned-report.ts:18`, `M:examples/batch-preview.ts:27`). The only frontmatter-through-`editNote` user is `M:examples/auto-organize-rule-action.ts:65`, and it edits frontmatter and body as one change on purpose (`:44-53`). Splitting it into `updateFrontmatter` + `editNote` makes two saves and lets the rule fire between them. Leave `editNote` and that example alone. The contract scout is right here; the item text overstates the scope.
2. **"Returning the same array means no change, nothing is written" (contract scout, section 4) is false.** The writer compares bytes, not array identity: `next = rebuildContent(mutate(parse(base)), ...)`, then `if (next === base) return base` (`frontmatter-write.service.ts:128-129`). Non-canonical YAML (a block list, for one: `serializeProperties` forces flow lists, `properties.logic.ts:610-614`) is rewritten even by a no-op `mutate`. The doc must say "nothing is written when the rebuilt note equals the file; the first write may normalize the YAML". The mods' `didChange = next !== props` latch (`M:mods/bulk-tag/src/bulk-tag.service.ts:142-147`) can report false for a note that was rewritten. Not data loss (lossy YAML is refused first).
3. **Per-path queue in the adapter (host scout 4.8) is speculative. Cut.** Every call site awaits one write at a time: `M:mods/portent/src/portent.service.ts:40`, `M:mods/operations/src/operations.service.ts:69`, `M:mods/bulk-tag/src/bulk-tag.service.ts:142` (inside a sequential `for`), `M:mods/inbox-triage/src/triage.service.ts:73`. The host writer puts serialization on the caller (`frontmatter-write.service.ts:95-97`), and the adapter queue would not cover the real cross-writer case (other mods, Auto Organize). Carry the host's sentence into the contract JSDoc instead.
4. **Return-shape validation of `mutate` (host scout 4.3) is speculative. Cut.** A non-array result throws in `rebuildContent` (`properties.length`, `properties.logic.ts:690`) before any write. An object value is written as a nested map, which is what the mod asked for, and the next call refuses it as `nested`. No existing data is lost either way. The raw API has run without it. A `typeof mutate === 'function'` check is optional (one line, matches `assertContent`, `mod-vault.service.ts:42-44`); without it `mutate(...)` throws a `TypeError` before the write.
5. **Converting read errors to `Error` (host scout 4.6, decision 2) contradicts the interface.** `ModVaultV1`'s doc says "File system errors reject as they come" (`M:.../mod-api.v1.ts:134`), and `read`/`write` rethrow unchanged (`mod-vault.service.ts:46-53`). Keep `logged` as is.
6. **Rewrapping `FrontmatterWriteError` with a vault-relative `path` and a typed `ModFrontmatterWriteErrorV1` + reason union (both scouts) is more API than needed.** `writeFailureText(err: unknown)` reads only `err.reason` (`M:packages/mod-core/src/errors/index.ts:23-27`), mod tests already throw `{ reason }` plain objects (`M:mods/portent/test/index.test.ts:123`), and the mod knows which path it passed. Each new exported contract type costs three edits (see "Missed by both scouts"). Minimal: the JSDoc says it rejects with an `Error` named `FrontmatterWriteError` whose `reason` is one of the nine strings; the host passes the error through unchanged. Do not promise `path` on the error (the host's one is absolute, `frontmatter-write.service.ts:37-43`).
7. **`fakeCtx` needs no `vault?: Partial<ModVaultV1>` option (contract scout).** Mod tests already override members by assignment, e.g. `ctx.app.updateNoteFrontmatter = async (...) => ...` (`M:mods/operations/test/operations.service.test.ts:116-117`). `ctx.vault.updateFrontmatter = ...` works the same way. Item 1 only adds `updateFrontmatter: notModelled('vault.updateFrontmatter')` to the literal (`M:packages/mod-core/src/testing/fake-ctx.ts:256-261`), which `tsc` requires.
8. **No compatibility gate exists, but none is needed.** `minAppVersion` is parsed and validated only, never compared (`B:src/lib/plugins/mods/mods.logic.ts:150,199-206`; `B:help/documentation/mods/01-anatomy-and-loading.md:55`). A migrated mod on an older app throws "not a function" at call time. The owner builds app and mods together; no action. Answers the contract scout's open point.
9. **Return type: `Promise<void>`, not `Promise<string>`.** No call site reads the result (all four above `await` and discard). `void` is the smaller promise to keep forever. Cost in the adapter: `await` the delegate and return nothing.

## Missed by both scouts

- `B:help/examples/mods/kokobrain-mod.d.ts:152` holds a standalone copy of `ModVaultV1`, and `B:src/tests/help/mods-types.test.ts` pins it: `expectTypeOf<Doc.ModVaultV1>().toEqualTypeOf<App.ModVaultV1>()` (`:85`) and a runtime list `STABLE_TYPES` of every exported contract type, compared against both files (`:24-47`, `:54-61`). `pnpm check` and vitest fail until the `.d.ts` gains the member and every new exported type is added to `STABLE_TYPES` and asserted. This is why the design adds one exported type (`ModPropertyV1`), not three.

## Minimal design

Mods repo (one commit, pushed, then adopted by SHA per `B:docs/MOD-CORE.md`):

1. `M:packages/mod-core/src/contract/mod-api.v1.ts`: add `ModPropertyV1 { key: string; value: string | number | boolean | string[]; type: 'text' | 'list' | 'number' | 'date' | 'boolean' }` and
   `updateFrontmatter: (path: string, mutate: (props: ModPropertyV1[]) => ModPropertyV1[]) => Promise<void>` on `ModVaultV1`. JSDoc: vault-relative Markdown path; `mutate` must be pure (can run twice); nothing is written when the rebuilt note equals the file, and the first write may normalize the YAML; an open tab keeps unsaved body edits and is saved at once (unlike `write`, which refuses a dirty tab); rejects with `name: 'FrontmatterWriteError'` and a `reason` (list the nine), `save-failed` already toasted; concurrent calls on one note race, so call one at a time per note.
2. `M:packages/mod-core/src/unstable/raw.ts:7-11`: `export type Property = ModPropertyV1` (import type from the contract, as `unstable/context.ts:1` already does). Optional, keeps one shape.
3. `M:packages/mod-core/src/testing/fake-ctx.ts`: `updateFrontmatter: notModelled('vault.updateFrontmatter')`.

Host (one commit):

1. `package.json`, `pnpm-lock.yaml`: SHA bump.
2. `src/lib/plugins/mods/mod-vault.service.ts`: one member, about 8 lines: `toAbsolute(path)`; refuse `!isMarkdownFile(abs)` with `Mod "<id>": vault.updateFrontmatter needs a Markdown note`; `await logged('updateFrontmatter', path, () => updateNoteFrontmatter(abs, mutate))`; `assertLive()`. Put it next to `create`/`write` so item 2 can mark all three write members in one place.
3. `src/tests/lib/plugins/mods/mod-api-contract.test.ts`: `updateFrontmatter: true` in `VAULT_PUBLIC`.
4. `help/examples/mods/kokobrain-mod.d.ts` and `src/tests/help/mods-types.test.ts`: the member, `ModPropertyV1`, its `STABLE_TYPES` entry and one `expectTypeOf` line.
5. `src/tests/lib/plugins/mods/mod-vault.service.test.ts`, adapter-only cases: relative path reaches the closed note and the body is untouched; an open dirty tab keeps the body edit (one case, proves the delegate is the tab-aware one); lossy frontmatter rejects with `name`/`reason` intact and the file unchanged; `.canvas` and `_system/mods/x/main.js` rejected with nothing written; invalid path; unload during the await rejects `is unloaded`; missing note rejects.
6. Docs: `help/documentation/mods/13-api-reference.md` (vault table), `04-vault-files.md` (Writing subsection), `09-raw-app.md` (one line: prefer the stable member). The long doc list in the host scout (sections 07, 10, 14, 15, 16, README, 28-mods) follows with the mod migrations, not item 1.

Out of item 1 (separate, optional): migrating the five mods and `help/examples/mods/note-tools/main.js` (with `src/tests/help/mods-examples.test.ts`), `check-mod.mjs` lint, the `MarkdownEditor` caret test, the `//` tab fix, the empty `---` block bug.

## Risks the design must handle

- **Data corruption of non-Markdown files:** handled by the Markdown guard (above). It also keeps the member off mod code (`B:src/lib/plugins/mods/mods.logic.ts:58-61`).
- **Silent loss of the mod's write on a `//` tab:** `findTab` compares exactly (`frontmatter-write.service.ts:80-82`); a tab opened from `dailyNotePath` with a folder ending in `/` keeps `//` (`B:help/documentation/mods/04-vault-files.md:394`). The relative call misses it, writes disk, and the tab's next save puts the old frontmatter back. User text is not lost; the mod's change is. `vault.write` has the same hole today (`mod-vault.service.ts:124`). Recommendation: document it in item 1 like `write`; fix both members in one small follow-up (resolve the tab by `path.replace(/\/{2,}/g, '/')` in the adapter, as `editNote` does, `M:.../notes/editor.ts:27-28`), not in core.
- **Save loops:** each changing call fires the mod's own `onNoteSaved` (`B:src/lib/plugins/mods/mods-host.service.ts:566-591`). An idempotent `mutate` stops after at most one extra normalizing write; a non-idempotent one (a timestamp) loops. This is item 2's job; item 1 only documents it.
- **Vault switch mid-write:** `vault-changed` may come after the bytes are on disk (`frontmatter-write.service.ts:24-26`), and the adapter's `assertLive()` after the await then reports unload. Document; no code.
- **Pipeline cost:** each changing closed-note write runs the full after-save path (`frontmatter-write.service.ts:161`), same as raw today. bulk-tag already paces itself (`M:mods/bulk-tag/src/bulk-tag.service.ts:151-154`). No batching API.
- **Security:** no new capability: full-trust mods already have `ctx.vault.write` and raw `ctx.app` (ADR 0036; `assertVaultPath` is hygiene, `mods.logic.ts:63-68`).

## Ordering against the other items

1. **Item 1 first, alone.** Smallest contract change, no dependencies.
2. **Item 2 after item 1.** `ignoreOwnWrites` can only mark writes that pass through `ctx.vault`; raw `ctx.app.updateNoteFrontmatter` writes are invisible to it, and every frontmatter-writing mod uses raw today. Without item 1 the main loop case (a mod reacting to a save by setting a property) stays unprotected.
3. **Items 3 and 6 (host only) can run any time**, in parallel with 1.
4. **Items 4, 5, 7 change the contract.** Each contract change is its own SHA bump that edits `package.json`/`pnpm-lock.yaml`, `kokobrain-mod.d.ts` and `mods-types.test.ts` in the host, so two of them in flight conflict on the same lines. Run contract-changing Issues one after another, never in parallel relay workflows.

## Not checked

- `M:scripts/check-bundle.mjs`, `M:test/bundles.test.ts`, `M:test/fixtures/package-consumer/main.ts` beyond the scout's reading.
- Whether `Promise<string>` returned from the delegate is a type error against `Promise<void>` in this tsconfig; the adapter awaits and returns nothing, which avoids the question.
- The caret behavior of the active-tab sync (`B:src/lib/core/markdown-editor/MarkdownEditor.svelte:175-194` reads as the host scout says), not observed.
