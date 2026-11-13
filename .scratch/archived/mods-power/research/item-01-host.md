# Item 1, host side: stable `ctx.vault.updateFrontmatter(path, mutate)`

Scout report. Nothing was run, built or committed. Paths are in `/Users/diegorv/Dev/pet-projects/koko/brain` (host) unless prefixed `mods:` (`/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`).

## 1. Summary

The host already has everything the feature needs. `updateNoteFrontmatter(path, mutate)` (`src/lib/core/frontmatter/frontmatter-write.service.ts:99`) handles open tab, closed note, lossy-YAML refusal, vault switch and `create: false`, and ends in `notifyAfterSave`. It is exposed today only as the raw `MOD_APP.updateNoteFrontmatter` (`src/lib/plugins/mods/mod-app.service.ts:53`). The stable version is a thin adapter in `createModVault` (`src/lib/plugins/mods/mod-vault.service.ts:55-137`):

- vault-relative path in, markdown-only check, boundary validation of what the untyped mod passes and returns
- `assertLive` after the await
- mapping of `FrontmatterWriteError` to a contract error type with a relative path
- a per-mod, per-path queue

No new `writeTextFile` call is needed, so `raw-write-ratchet.test.ts` and the Indexing rules stay satisfied.

The host change cannot land before the contract change (section 3). The main decisions for the owner or orchestrator are in section 9.

## 2. Existing pieces to reuse (verified)

| Piece | Where | What it gives |
|---|---|---|
| `updateNoteFrontmatter` | `src/lib/core/frontmatter/frontmatter-write.service.ts:99-163` | Open tab (`:116-141`): patches content, keeps unsaved body edits, `saveFileByPath`, restores base on `save-failed`. Closed note (`:143-162`): read, `exists` recheck, redo if a tab opened (`:148`), `writeTextFile(..., {create:false})`, `syncExternalContentToEditor`, `notifyAfterSave`. Returns written text, or the unchanged base without writing (`:129`). |
| `FrontmatterWriteError` | same file `:33-45` | `name`, `reason` (`unparseable \| nested \| comments \| duplicate-keys \| alias-collision \| anchors \| save-failed \| vault-changed \| missing`), `path` (absolute). |
| Lossy detection and rebuild | `src/lib/core/frontmatter/properties.logic.ts:405` (`detectLossyFrontmatter`), `:603` (`serializeProperties`), `:689` (`rebuildContent`) | Refuses comments, nested, anchors, duplicate keys. |
| Parse cache returns clones | `properties.logic.ts:226-241` | A mod mutating `props` in place cannot corrupt the LRU cache. |
| `ctx.vault` factory | `mod-vault.service.ts:33-138` | `toAbsolute` (`:36-40`) = `assertLive` + `assertVaultPath` + prefix with `vaultPath`. `logged` (`:46-53`) logs and rethrows. |
| Error-type precedent | `mod-vault.service.ts:202-205` | `ModDataCorruptErrorV1` built with `Object.assign(new Error(...), { name, corruptPath })`. Same pattern fits a `FrontmatterWriteError` contract type. |
| Per-instance queue precedent | `mod-vault.service.ts:162-169` (`inOrder`) | Serialized tail promise with `assertLive`. Reuse the idea per path. |
| `isMarkdownFile` | `src/lib/core/filesystem/fs.logic.ts:65` | `.md` / `.markdown`. |
| `assertLive` / `invalid()` | `src/lib/plugins/mods/mods-host.service.ts:124-128` | Message style `Mod "<id>": ...`. |

The sibling Auto Organize call (`src/lib/features/auto-organize/auto-organize.service.ts:676`) already passes a pure `mutate` that can run twice; it needs no change.

## 3. Files an implementation touches

### Mods workspace (contract first, owned by the workspace scouts)
- `mods:packages/mod-core/src/contract/mod-api.v1.ts`: add `updateFrontmatter` to `ModVaultV1` (`:136-161`) plus the property and error types. The contract imports nothing, so it needs its own property type with the shape `{ key: string; value: string | number | boolean | string[]; type: 'text'|'list'|'number'|'date'|'boolean' }`. The host's `Property` (`properties.types.ts`) matches it structurally. I did not check whether a name for this type already exists in the workspace.
- Additive per the contract header; no `apiVersion` bump.

### Host (after the contract is committed, pushed and adopted by SHA, see `docs/MOD-CORE.md:35-47`)
1. `package.json` and `pnpm-lock.yaml`: SHA bump. This triggers rule 6: `pnpm check`, `pnpm vitest run` and `pnpm build`.
2. `src/lib/plugins/mods/mod-vault.service.ts`: new `updateFrontmatter` member, new import of `updateNoteFrontmatter` (core import from plugins is allowed, `mod-app.service.ts:4` does it already).
3. `src/lib/plugins/mods/contract/mod-api.v1.ts`: re-export only (`export type *`). Nothing to edit.
4. `src/lib/plugins/mods/mod-app.service.ts:49-53`: keep the raw member (existing mods and `mods-host.service.test.ts:1713` depend on it). Optionally add a doc comment pointing to the stable one.
5. Tests (section 7).
6. Docs (section 8) and `.claude/skills/kokobrain-mods/scripts/check-mod.mjs`.

Ordering trap: `createModVault` returns `ModVaultV1` (`mod-vault.service.ts:55`). With the old pinned contract, an extra `updateFrontmatter` property in the returned object literal is an excess-property error in `pnpm check`. The SHA bump must come first, in the same or an earlier commit. Also `VAULT_PUBLIC ... satisfies Record<keyof ModVaultV1, true>` (`src/tests/lib/plugins/mods/mod-api-contract.test.ts:68-77`) fails `pnpm check` as soon as the installed contract has the new key, until the list is updated.

## 4. Behavior to implement (adapter contract)

1. `assertLive()`, then `assertVaultPath(path)`, then markdown only (`isMarkdownFile`). The raw API does not check the extension and writes a frontmatter block into `.canvas`, `.view` or `.js` (`help/documentation/mods/16-pitfalls-checklist.md:189`). Reject with a `Mod "<id>": vault.updateFrontmatter needs a Markdown note` style message (`invalid()` style).
2. `typeof mutate === 'function'`, else `Mod "<id>": vault.updateFrontmatter needs a mutate function`. This mirrors `assertContent` (`mod-vault.service.ts:42-44`) and the `invalid('watch needs a read function')` checks (`mods-host.service.ts:562`).
3. Validate what `mutate` returns, because mods are untyped JS. `serializeProperties` writes `p.value` by its JavaScript type (`properties.logic.ts:610-621`), so an object or `undefined` value, a non-array result, or `type: 'list'` with a non-array would crash inside `dedupeCanonicalKeys` or write YAML the lossy check refuses on the next call. Wrap `mutate`: result must be an array of `{ key: non-empty string, value: string | finite number | boolean | string[], type: one of the five }`. Throw `Mod "<id>": vault.updateFrontmatter mutate must return ...`. Validation inside the wrapper runs on both passes of `mutate`, which is what we want. A thrown error from `mutate` (the cookbook's sentinel for "nothing to change", `14-cookbook.md:731`) must propagate unchanged; do not wrap it.
4. Delegate: `updateNoteFrontmatter(abs, wrapped)`.
5. After the await, `assertLive()` (same discipline as `write`, `mod-vault.service.ts:128`). On failure the bytes may already be on disk (documented for `vault-changed`, `frontmatter-write.service.ts:24-26`); the doc for the mod must say so.
6. Error mapping:
   - `FrontmatterWriteError` becomes a contract error with `name: 'FrontmatterWriteError'`, `reason`, and a vault-relative `path` (the raw one carries the absolute path; `message` would also embed it, `frontmatter-write.service.ts:41`, so rebuild the message with the relative path). Keep `save-failed` distinct: the editor already toasted `Failed to save file.` (`editor.service.ts:200-201`), so the mod must not toast again (`15-errors-and-debugging.md:170`).
   - Read errors from `readTextFile` reach the mod as bare strings today. In `createModData` the `logged` helper converts to `Error` (`:180`); `createModVault.logged` (`:46-53`) rethrows as-is. Pick one: converting to `Error` for the new method is cheaper for mod authors but differs from `read`/`write`. Recommend convert, and say so in the contract doc.
7. Return value: raw resolves to the written text. Options: `Promise<string>` (1:1 swap in the cookbook helpers, e.g. `14-cookbook.md:654`), or `Promise<void>`. Recommend `Promise<string>`; it is already computed and costs nothing. For the unchanged case the raw API returns the base text, so a mod cannot tell "changed" from "unchanged" without comparing. Not needed for item 1.
8. Per-path queue inside the mod instance (same idea as `inOrder`, `:162-169`), because `updateNoteFrontmatter` documents that concurrent calls on one closed note race and the last write wins (`frontmatter-write.service.ts:95-98`). Concrete failure: two parallel calls from one mod each read the same base, each write only their own property, one property is lost. A host-wide queue would fix cross-mod and Auto Organize races too, but that is a core write-path change; per the owner's rule "no core changes for corner cases" (memory), keep the queue in the adapter and state the limit once in the docs: calls from other mods or Auto Organize on the same closed note can still race. The queue must run each step after `assertLive()` and must not reject later calls when one fails (same `tail = result.catch(() => {})` shape).

## 5. Hidden costs and risks

**Pipeline cost per call.** A changing call on a closed note runs the full `notifyAfterSave` (`frontmatter-write.service.ts:161`): `applyNoteChange`, Rust index update, FTS5, semantic chunk re-embed (hash skip applies, `docs/agents/indexing-watcher-rules.md` rule 10), file history row, Auto Organize observer (`auto-organize.service.ts:204`), Todoist scheduler (`sync-scheduler.service.ts:90`). A mod batching 500 notes pays 500 pipelines; identical to raw today. No batching API is proposed. Document it; consider recommending the run's `signal` check between notes.

**Indexing rules compliance.** Rule 6 (`applyNoteChange` is the one owner) is met because the delegate ends in `notifyAfterSave`; the adapter must not write or index itself. Rule 9 (absolute paths): `toAbsolute` builds `${vaultPath}/${path}` (`mod-vault.service.ts:39`). `raw-write-ratchet.test.ts:40` lists one `writeTextFile` site in `mod-vault.service.ts`; the adapter adds none, so that file needs no change. Do not call `writeTextFile` in the new code.

**Save loops.** The call fires `onNoteSaved` for the same mod (`mods-host.service.ts:566-591`; docs `07-events-and-reactivity.md:190-192`). A save-triggered callback that sets a property unconditionally loops; the `mutate` that returns equal bytes does not write (`frontmatter-write.service.ts:129`), only when the frontmatter is already canonical (`09-raw-app.md:589`). Item 2 (`ignoreOwnWrites`) needs a marker set around this call, so design the adapter so the marking point is the single place that all mod writes (`create`, `write`, `updateFrontmatter`) pass through. Do not build the marker in item 1; just keep the three write members structured alike.

**Cascade with Auto Organize.** Auto Organize rules run on after-save (`auto-organize.service.ts:204`) and can write frontmatter on the same note, which saves again and wakes the mod. Same as raw today.

**Dirty tab semantics differ from `write`.** `vault.write` refuses a dirty tab (`mod-vault.service.ts:124-125`). `updateFrontmatter` merges into the tab and saves the whole tab, including the user's unsaved body typing, immediately (`frontmatter-write.service.ts:131-134`). That is intended, but must be stated in the contract doc so a mod author does not expect the refusal.

**Tab path spelling.** `findTab` compares paths exactly (`frontmatter-write.service.ts:81`). `help/documentation/mods/04-vault-files.md:394` documents tabs spelled with `//` (`dailyNotePath` with a folder ending in `/`). A relative-path call builds the single-slash spelling, misses that tab, and takes the closed-note branch: writes the file behind a possibly dirty tab, and `syncExternalContentToEditor` also matches exactly (`editor.service.ts:77`). Same hazard as `vault.write`; write a test that pins today's behavior and document, do not fix in core.

**Caret claim in the docs may be stale.** `09-raw-app.md:680` says the active-tab sync puts the caret back at the old offset. Reading the code: `MarkdownEditor.svelte:630-655` calls `replaceDoc(content, cursorPos)`; `replaceDoc` (`:175-188`) first computes `docDiff` and, when there are edits, dispatches the changes without a selection (`:189-194`), so CodeMirror maps the selection through them. Only the `!changes` branch (docs differing by more than `DOC_DIFF_MAX_EDITS = 400` line edits, `doc-diff.logic.ts:16,24-25`) rebuilds the state at the old `cursorPos` (`:183`). The doc-diff was added in `fe51c2ad0` (Issue 14). `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts` has no test of an external sync keeping the caret (grep for `externalContentSignal`/caret found none). I did not run the app, so this is unconfirmed. Before the stable API's doc repeats the caret warning, or the host adds caret compensation, someone should add a MarkdownEditor test that applies a frontmatter edit through `syncExternalContentToEditor` and asserts the caret position. If it holds, the "Known problems: caret" text (`09-raw-app.md:676-700`, `14-cookbook.md:649,737`, `16-pitfalls-checklist.md:78,186`) and the `editNote` caret workaround can shrink. The "empty `---`/`---` block gets a second block" problem (`09-raw-app.md:702`) is separate and real in `extractBody`/`FRONTMATTER_REGEX` (`properties.logic.ts:39,55-59`); fixing it is a core change and outside item 1. Flag it to the owner rather than fix.

**Security (ADR 0036).** Mods run with full trust and `assertVaultPath` is "hygiene, not a security boundary" (`mods.logic.ts:64-68`). The new method adds no capability beyond `ctx.vault.write` and raw `ctx.app`; it reduces risk (lossy-YAML refusal, no raw store access). The Markdown-only rule keeps it off mod code (`isModCodePath` treats non-`.md` files under `_system/mods/` as code, `mods.logic.ts:58-61`); a `.md` under a mod folder goes through the normal pipeline, as `write` does.

**Layer rules.** No new violation: `plugins/mods` already imports `core/frontmatter` (`mod-app.service.ts:4`). `layer-rules.test.ts` is unaffected; `layer-baseline.json` has no `mods` entries (grep).

## 6. Docs and the `editNote` helper

Raw-to-stable migration is a workspace job (`mods:packages/mod-core/src/notes`, `editNote` currently uses raw `editorStore`/`vaultStore`). Host side only needs to make sure the new member behaves for it (open dirty tab, active tab, closed note), which the tests below cover.

## 7. Test plan (docs/TESTING.md: real stores, mock only Tauri/fs/toast, never mock `.logic.ts`)

New or changed files:

1. `src/tests/lib/plugins/mods/mod-vault.service.test.ts` (it already mocks `@tauri-apps/plugin-fs` with an in-memory disk and honors `create:false`, header lines 1-60; uses real stores and editor service). Add `describe('updateFrontmatter')`:
   - closed note: sets a property, file on disk has canonical YAML, body untouched, resolves to the written text
   - open dirty tab: unsaved body edit is kept and saved, tab ends clean
   - mutate returns same properties for canonical frontmatter: no `writeTextFile` call, no `notifyAfterSave`
   - `mutate` throws a sentinel: rejects with that same error, nothing written
   - `mutate` runs on both passes when a tab opens during the read (purity contract), if feasible with the existing disk mock
   - lossy frontmatter (comments, nested, duplicate keys, anchors): rejects with `name === 'FrontmatterWriteError'`, `reason`, and a relative `path`; message has no absolute path; file unchanged
   - `save-failed` keeps `reason` and the tab restored to base
   - non-markdown (`.canvas`, `.js`) rejected, nothing written
   - `Invalid vault path` for `''`, `../x.md`, leading `/`
   - missing note: rejects (error shape as chosen in 4.6)
   - invalid `mutate` argument; invalid return (non-array, object value, `undefined` value, bad `type`, empty key, non-array `list`)
   - unloaded: `assertLive` before the call and after the await (flip the flag during the read)
   - queue: two overlapping calls on one closed note both land (neither property lost); a failing first call does not block the second; different paths run independently
   - `//` tab spelling: pin the current behavior
2. `src/tests/lib/plugins/mods/mod-note-saved.test.ts` (real editor save, fake timers): one `updateFrontmatter` that changes a closed note fires the mod's `onNoteSaved` exactly once with the relative path; an unchanged one fires none.
3. `src/tests/lib/plugins/mods/mod-api-contract.test.ts`: add `updateFrontmatter: true` to `VAULT_PUBLIC` (`:68-77`); the runtime check at `:244-246` then compares `Object.keys(ctx.vault)` with it. Add the error type and property type to the frozen-surface checks if the contract exports them.
4. `src/tests/lib/plugins/mods/mods-host.service.test.ts`: keep the `app.updateNoteFrontmatter` identity assertion (`:1713`); add one smoke test that `ctx.vault.updateFrontmatter` is reachable through a loaded mod and rejects with `Mod "<id>" is unloaded` after unload.
5. `src/tests/help/mods-examples.test.ts`: its fake `app.updateNoteFrontmatter` (`:243`, `:727`, `:731`) serves `help/examples/mods/note-tools`. If the examples migrate to `ctx.vault.updateFrontmatter`, the fake context needs the same member and the refusal cases at `:727-731` follow. Which example files change is a decision for the issue.
6. `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts`: a caret test for external sync (see the caret section above). This is the evidence step, not part of the feature.
7. `.claude/skills/kokobrain-mods/scripts/check-mod.mjs`: it simulates raw `app.updateNoteFrontmatter` (`:1428-1455`) and lints callbacks that call `updateNoteFrontmatter` without an `activeTabPath` check (`:668-746`). Add the stable member to the simulation and to the lint. That script has no automated test that I found; verify by running it on an example mod.

Gate for the host commit: frontend only plus a dependency change, so `pnpm check`, `pnpm vitest run` and `pnpm build`. No Rust, no IPC DTO change, no ts-rs bindings. The Task Completion rule "fix/feat needs a test change" is met by the files above.

## 8. Docs to update (all under `help/documentation/` unless noted)

- `mods/13-api-reference.md`: `ctx.vault` table (`:112-125`) and the error table (`:262-270`); the raw row at `:236` gets "prefer `ctx.vault.updateFrontmatter`".
- `mods/04-vault-files.md`: new subsection under Writing (after `write`, `:279-296`), the note at `:441` ("To change only frontmatter properties..."), `:54`, `:331`, See also `:572`.
- `mods/09-raw-app.md`: `:32` and the `updateNoteFrontmatter` section (`:526-760`) become "raw, kept for compatibility; stable twin exists"; the caret section per the evidence above.
- `mods/README.md:116` (decision table row), `:200` (examples list); `28-mods.md:181`, `:541`, `:609`.
- `mods/07-events-and-reactivity.md:190-192`, `:236`, `:262`, `:305`; `mods/05-mod-data.md:350`; `mods/10-querying-the-index.md:69`, `:304`, `:492`, `:515`; `mods/14-cookbook.md` recipes 5 and others (`:28`, `:596`, `:649-666`, `:743`, `:796`, `:1213`, `:1284`, `:2573-2651`, `:2788`); `mods/15-errors-and-debugging.md:164-170` (error table; the stable error has a relative path); `mods/16-pitfalls-checklist.md:77-78`, `:186-190`.
- The Mods file docs are the in-app help, so `src/tests/help/*` may check structure; run the help tests after editing.
- `.claude/skills/kokobrain-mods/SKILL.md` (not read in this scout) should mention the new member.
- ADR `docs/adr/0036-vault-mods-trust-loader-storage.md`: grep found no mention of `updateNoteFrontmatter`; no edit expected. Not read in full.

## 9. Decisions and open questions for the owner

1. Return type: `Promise<string>` (recommended) or `void`.
2. Error mapping of read failures: convert to `Error` for this method (recommended) or keep bare strings like `read`/`write`.
3. Per-path queue scope: adapter-only (recommended; limit stated in docs) versus a host-wide queue in `updateNoteFrontmatter` (core change; also fixes mod vs Auto Organize races, but touches every caller).
4. Whether to keep the raw `ctx.app.updateNoteFrontmatter` documented as supported. Recommend keep and mark "prefer stable".
5. The caret and empty-block "app bugs" in `09-raw-app.md:676-725`: verify the caret claim with a MarkdownEditor test before copying it into stable docs. The empty-block problem is a core fix and is out of scope here.

## 10. Not checked

- The mods workspace side (contract naming, `editNote`, `fakeCtx`, existing property type names): not read beyond `ModVaultV1` (`mods:.../mod-api.v1.ts:136-161`) and the header.
- Runtime behavior (caret, dirty tab merge, queue ordering) was read from code, not observed in the running app or in a test.
- `docs/TESTING.md`, `docs/COMMITS.md`, `.claude/skills/kokobrain-mods/SKILL.md` and ADR 0036 were not read in full; test-plan conventions come from existing tests and the project CLAUDE.md.
- Line numbers in the docs list come from grep and may be a few lines off after edits elsewhere.
