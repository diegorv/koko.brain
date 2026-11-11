# 01: Mods write frontmatter through stable `ctx.vault.updateFrontmatter`

**What to build:** the host implements `ctx.vault.updateFrontmatter(path, mutate)`, the new stable member of `ModVaultV1`, as a thin adapter over core's `updateNoteFrontmatter` (`src/lib/core/frontmatter/frontmatter-write.service.ts:99-105`): vault-relative path, Markdown notes only, unload guard. The host adopts the mod-core commit that adds the member, updates the standalone `.d.ts` copy, and documents it. Today a mod can write frontmatter only through raw `ctx.app.updateNoteFrontmatter` (`src/lib/plugins/mods/mod-app.service.ts:4,53`), which takes an absolute path and has no compatibility promise. The raw member stays.

```ts
await ctx.vault.updateFrontmatter('Projects/Alpha.md', (props) => [
	...props.filter((p) => p.key !== 'status'),
	{ key: 'status', value: 'active', type: 'text' },
]);
```

**Blocked by:** none

**Requires first (other repo):** mods Issue `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/.scratch/mods-power/issues/01-stable-update-frontmatter.md` delivered and pushed (it adds `ModPropertyV1` and `ModVaultV1.updateFrontmatter` to `packages/mod-core/src/contract/mod-api.v1.ts`), and its full commit SHA recorded in that Issue's Comments. This Issue adopts that SHA per `docs/MOD-CORE.md` "Updating the dependency". The install needs Git read access to the private mods repository (`docs/MOD-CORE.md` "Local installation"); an agent without it stops and reports, it does not edit the lockfile by hand.

**Status:** resolved

Mods Issue 01 is delivered: squash commit `4195eaab9b5f950d80b2d358de383329acb93ea6` on `origin/main` of the mods repo (mods ledger row 01; its Comments name "the squash commit on main from this delivery" without the hash). Launch by explicit number only.

**Gate:** frontend with a dependency change: `pnpm check` + `pnpm vitest run` + `pnpm build` (CLAUDE.md rule 6: `package.json` and `pnpm-lock.yaml` change). Then the mods workspace's `pnpm check:package <temp consumer>` and `pnpm verify` with `KOKOBRAIN_HOST_ROOT` set to this checkout (`docs/MOD-CORE.md` steps 2 and 6).

### Behavior

1. **SHA bump and implementation in one commit.** Adopt exactly the SHA of mods Issue 01, `4195eaab9b5f950d80b2d358de383329acb93ea6`, never a later one. Before installing, `git -C /Users/diegorv/kokobrain-vaults/kokobrain-mods-src diff <pin in package.json> <sha> -- packages/mod-core/src/contract` must show only this Issue's change plus members already on this repo's `main`; otherwise stop and record it under Comments. `package.json:81` and `pnpm-lock.yaml:180-182` move from `328ca55f6add4d18e3c5b1490feee66ce8503b5e` to the new full SHA, using the `pnpm add -D` command in `docs/MOD-CORE.md` step 3, then the lockfile inspection of step 4. They land with Behavior 2-4: `createModVault` returns `ModVaultV1` (`src/lib/plugins/mods/mod-vault.service.ts:33`) and `VAULT_PUBLIC` is `satisfies Record<keyof ModVaultV1, true>` (`src/tests/lib/plugins/mods/mod-api-contract.test.ts:68-77`), so `pnpm check` fails between a bump and the member.
2. **The member.** In `createModVault` (`src/lib/plugins/mods/mod-vault.service.ts:55-137`), after `write` (`:118-136`), so a later item can treat the three write members in one place:
   - `const abs = toAbsolute(path)` (`:36-40`: live guard, `assertVaultPath`, `${vaultPath}/${path}`, Indexing rule 9).
   - `if (!isMarkdownFile(abs)) throw new Error(\`Mod "${modId}": vault.updateFrontmatter needs a Markdown note\`)` (`isMarkdownFile`, already imported at `:8`, is `.md` / `.markdown`, `src/lib/core/filesystem/fs.logic.ts:65-68`). This is a data-safety check: a file without `---` has no lossy reason (`src/lib/core/frontmatter/properties.logic.ts:405-407`), and `rebuildContent` prepends a YAML block (`properties.logic.ts:689-697`), which would corrupt a `.canvas`, a `.view` or a mod's `main.js`.
   - `await logged('updateFrontmatter', path, () => updateNoteFrontmatter(abs, mutate))` (`logged` at `:46-53` logs and rethrows unchanged), then `assertLive()`, and resolve to `undefined` (the contract says `Promise<void>`).
   - Import `updateNoteFrontmatter` from `#lib/core/frontmatter/frontmatter-write.service.js`.
   - No other code: no per-path queue (the core writer puts serialization on the caller, `frontmatter-write.service.ts:95-97`, and every mod call site awaits one write at a time), no check of what `mutate` returns (a non-array throws in `rebuildContent` before any write, `properties.logic.ts:690`), no rewrapping of `FrontmatterWriteError` (its `name` and `reason` reach the mod as they are, `frontmatter-write.service.ts:33-45`), no conversion of read errors (`ModVaultV1` rejects file system errors "as they come", like `read` and `write`).
   - The after-save path is the core writer's own: the closed branch ends in `notifyAfterSave` (`frontmatter-write.service.ts:161`), the tab branch saves through `saveFileByPath` (`:133`). The adapter adds no `writeTextFile`, `applyNoteChange` or `notifyAfterSave` call (Indexing rule 6).
3. **Contract pin.** `src/tests/lib/plugins/mods/mod-api-contract.test.ts:68-77`: `updateFrontmatter: true` in `VAULT_PUBLIC`. The runtime key check at `:244-246` then covers it.
4. **Standalone type copy.** `help/examples/mods/kokobrain-mod.d.ts`:
   - `export interface ModPropertyV1`, copied from the contract, next to `ModVaultEntryV1` (`:138`);
   - `updateFrontmatter` with its JSDoc on `ModVaultV1` (`:152-177`), after `write`.
   - `src/tests/help/mods-types.test.ts`: `'ModPropertyV1'` in `STABLE_TYPES` (`:25-47`, after `'ModVaultEntryV1'` at `:33`) and `expectTypeOf<Doc.ModPropertyV1>().toEqualTypeOf<App.ModPropertyV1>()` in the vault case (`:83-87`). The `RawProperty` copy (`kokobrain-mod.d.ts:582-587`) stays.

### Docs

- `help/documentation/mods/13-api-reference.md`:
  - the `ctx.vault` table (`:116-125`): a row after `write`: signature `(path: string, mutate: (props: ModPropertyV1[]) => ModPropertyV1[]) => Promise<void>`; resolves to nothing; a Markdown note only; an open tab keeps unsaved body edits and is saved at once; nothing is written when the rebuilt note equals the file. Rejects with `Mod "<id>": vault.updateFrontmatter needs a Markdown note`, and `FrontmatterWriteError` with a `reason` (lossy frontmatter, `save-failed`, `vault-changed`, `missing`).
  - the error message index (`:248`, near `:264-267`): the new message.
- `help/documentation/mods/04-vault-files.md`:
  - "Writing" (`:258`): a `updateFrontmatter(path, mutate)` subsection after `write` (`:279-294`). It states: Markdown only; `mutate` must be pure and can run twice; the first write may normalize the YAML (a block list becomes a flow list), so returning the same array does not mean no write; unlike `write`, a dirty tab is not refused, its body edits are kept and the tab is saved; on the active note the caret keeps its old offset, as with `write`; concurrent calls on one note race, so write one note at a time; it fires `onNoteSaved`, the mod's own too, so a save callback that sets a property can loop; a tab whose path holds `//` (`:394`) is not found, as with `write`; `writeFailureText(err)` gives the user text, and `save-failed` already has a toast.
  - the tip at `:441`: point to `ctx.vault.updateFrontmatter` first, the raw member second.
  - the "What each write updates" table (`:296`) may gain a column; optional.
- `help/documentation/mods/09-raw-app.md`: one line at the `updateNoteFrontmatter` section (`:526`) and its row in "Members at a glance" (`:32`): prefer the stable `ctx.vault.updateFrontmatter` with a vault-relative path.
- Other pages that show the raw call (cookbook, events, pitfalls, README, `28-mods.md`) change with the mod migrations, not here.

### Acceptance

- [x] Failing test first, in `src/tests/lib/plugins/mods/mod-vault.service.test.ts` (`ctx.vault and ctx.workspace`, `:103`, a new `describe('updateFrontmatter')` after `write` at `:171`): with `${VAULT}/Note.md` holding `---\nstatus: draft\n---\nbody`, `ctx.vault.updateFrontmatter('Note.md', (props) => props.map((p) => p.key === 'status' ? { ...p, value: 'active' } : p))` resolves to `undefined`, the file reads `status: active` with the body `body` untouched, and an after-save observer (`addAfterSaveObserver`) saw `${VAULT}/Note.md`. It fails today, because `ctx.vault.updateFrontmatter` is not a function.
- [x] An open dirty tab (`editorStore.addTab({ path, content: <frontmatter + 'typing'>, savedContent: <old> })`): the call resolves, the tab keeps the body edit `typing` with the new frontmatter, and the disk holds the same text (proves the delegate is the tab-aware writer; contrast with `write`'s refusal at `:241-255`).
- [x] Lossy frontmatter (a YAML comment): rejects with `name: 'FrontmatterWriteError'` and `reason: 'comments'`, the file is unchanged, no after-save observer ran.
- [x] `Board.canvas` and `_system/mods/x/main.js` reject with `Mod "ideas": vault.updateFrontmatter needs a Markdown note`; nothing read or written (`writeTextFile` not called).
- [x] An invalid path (`'/Note.md'`) rejects with `Invalid vault path "/Note.md"`. A missing note rejects with the read error and writes nothing.
- [x] After `runtime.unloaded = true` the call rejects `Mod "ideas" is unloaded` and writes nothing. An unload during the write (set `runtime.unloaded` inside a `writeTextFile` mock implementation) rejects with the unload message.
- [x] No adapter test re-tests the core writer's behaviors already covered in `src/tests/lib/core/frontmatter/frontmatter-write.service.test.ts` beyond the cases above.
- [x] `mod-api-contract.test.ts`, `mods-types.test.ts` and `kokobrain-mod.d.ts` updated as in Behavior 3-4.
- [x] `src/tests/help/mods-example.test.ts`: `updateFrontmatter: unused` in the `vault` literal (`:59-74`). The literal is typed `ModContextV1` (`:40`), so `pnpm check` fails without it.
- [x] `package.json` and `pnpm-lock.yaml` name the new SHA; the lockfile has no credentials, workspace links or personal paths (`docs/MOD-CORE.md` step 4).
- [x] Docs above updated.
- [x] Gate passes: `pnpm check`, `pnpm vitest run`, `pnpm build`, and the mods workspace's `pnpm check:package <temp consumer>` and `KOKOBRAIN_HOST_ROOT=<this checkout> pnpm verify`.

## Notes

- **Research:** `.scratch/mods-power/research/item-01-contract.md`, `item-01-host.md`, and `item-01-validation.md` (which wins where they differ). Host code read at `c2bed3463`, mods code at `03526cf`.
- **Decisions taken from the validation:**
  - The owner's item text also names "the editNote helper's raw editorStore/vaultStore use for frontmatter edits". No change there: `editNote` (`/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/packages/mod-core/src/notes/editor.ts:24-42`) is a text editor used for body edits, and the one example that changes frontmatter through it does so in one save with a body line on purpose (`examples/auto-organize-rule-action.ts:44-53`). Splitting it would make two saves and let an Auto Organize rule fire between them.
  - `Promise<void>`, not `Promise<string>`: no mod reads the written text.
  - One exported contract type (`ModPropertyV1`), no typed error or reason union: each exported type costs a `.d.ts` copy, a `STABLE_TYPES` entry and an `expectTypeOf` line here.
  - No version gate: `minAppVersion` is parsed, never compared (`src/lib/plugins/mods/mods.logic.ts:150,199-206`). A mod using the member on an older app fails with "not a function" at call time.
- **Accepted limits (documented, not fixed):**
  - A tab opened with `//` in its path is missed (`findTab` compares exactly, `frontmatter-write.service.ts:80-82`): disk is written, and that tab's next save puts the old frontmatter back. `vault.write` has the same hole (`mod-vault.service.ts:124`). The follow-up is `.scratch/mods-host-robustness/issues/02-mod-write-guard-normalizes-paths.md`, which covers `vault.write` and should also cover `ctx.vault.updateFrontmatter` once this Issue lands.
  - Each changing write fires the mod's own `onNoteSaved` (`src/lib/plugins/mods/mods-host.service.ts:566-591`). A non-idempotent `mutate` (a timestamp) loops. Item 2 (brain 02) extends the own-write marker to this member.
  - A `vault-changed` thrown after the bytes are on disk (`frontmatter-write.service.ts:24-26`), and the adapter's `assertLive()` after the await then reports the unload. Same as the other members.
- **Security:** no new capability. Full-trust mods already have `ctx.vault.write` and raw `ctx.app` (ADR 0036); `assertVaultPath` is hygiene (`mods.logic.ts:63-68`).
- **Ordering:** Contract Issues land in the mods repo in the order 01, 02, 03, 04; each brain Issue adopts its own mods SHA in the order brain 01, 02, 04, 05. No batching. The contract-changing items are 1, 2, 4 and 5 (item 7 changes no contract). Full order: `.scratch/mods-power/PRD.md`.
- **Out of scope:** migrating `portent`, `operations`, `bulk-tag`, `inbox-triage` and `help/examples/mods/note-tools/main.js` to the stable member; a `check-mod.mjs` lint; the caret test; the `//` tab fix; the empty `---` block bug.
- **Scope versus the owner's text (for triage):** the owner's item names "the editNote helper's raw editorStore/vaultStore use for frontmatter edits"; this Issue and mods Issue 01 leave `editNote` unchanged (Decisions above, `item-01-validation.md:21`).
- **Not verified:** whether `pnpm add` with the Git URL works in a relay worktree without the owner's credential setup.

## Comments

- 2026-11-11, `issue/01-stable-update-frontmatter`: added stable `ctx.vault.updateFrontmatter` (delegates to the tab-aware core frontmatter writer), types/contract tests, mods package SHA bump and docs. Review round 1 APPROVED (one nit: tip referents in `help/documentation/mods/04-vault-files.md:473`, fixed); review round 2 APPROVED, no findings. Tests: `pnpm check` 0 errors; full suite at 811e0092a exit 0, 611 files, 15384 passed, 54 skipped, 1 todo.
