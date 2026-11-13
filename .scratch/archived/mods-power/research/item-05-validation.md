# Item 5 (note create / move / rename events): adversarial validation

Validator report. I read the two scout reports, assumed they were wrong, and checked every load-bearing claim against code. Nothing was run, built or committed. `B:` = `/Users/diegorv/Dev/pet-projects/koko/brain`, `M:` = `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`; bare paths are `B:`.

## Verdict in one paragraph

Moves and renames are cheap and well-owned: one owner (`applyPathChange`), all three entry points go through it, and a mod event fits as a consumer. Two things the scouts got right but understated: delivering at the consumer's position is **data loss**, not just "stale state", and `settled` is required, not optional. Creation is where the scouts are wrong. "Hook the `applyNoteChange` create/fs branch" misses Quick Capture captures, which the owner actually uses. It also fires before the creator opens the tab, which opens a lost-write race. Recommendation: ship `onNoteMoved` as its own small Issue now. Ship `onNoteCreated` as a second Issue only after the owner rules on coverage. A contract change is needed either way (mods repo commit + SHA adoption).

## Claims checked

### Confirmed

1. All path changes route through `applyPathChange`. The only callers are `fs.service.ts:248` (delete), `:285` (rename) and `:313` (move) (grep `applyPathChange(` in `src/lib`). The only other disk `rename` calls in `src/lib` are Trash (`trash.service.ts:71` inside the delete `diskOp`, `:126` restore). Auto Organize moves through `moveItem`/`renameItem` (`auto-organize.service.ts:338, 472`). `ctx.vault.rename/move/delete` call the same functions (`mod-vault.service.ts:56-77`).
2. Consumers run synchronously, isolated, on a copy of the list (`path-change.service.ts:176-182`), after `diskOp` and `updateTabAfterRenameOrMove` (`:163, :173`), and before the awaited link rewrite (`:190`), tree re-key (`:199`, or `await refreshTree()` at `:201`), `rename_note` (`:209`) and `rename_in_search_index` (`:222`).
3. `PathChange` does not distinguish rename from move. `renameItem` and `moveItem` build the same shape (`fs.service.ts:285-291, 313-319`).
4. A folder change reaches consumers once, for the folder (`path-change.service.ts:42-44`). `childPaths` and `movedNode` are snapshotted before `diskOp` (`:149-152`).
5. Exactly four callers of Rust `create_note`: `note-creator.service.ts:103`, `fs.service.ts:208`, `mod-vault.service.ts:103`, `closed-note-writer.service.ts:76`. Each then calls `applyNoteChange` with source `create`/`fs` (`:118`, `:216`, `:108-114`, `:79`). `create` and `fs` have `rust: 'never'`, `yieldBeforeConsumers: false` (`note-change.service.ts:89-98`).
6. No mod-reachable hook exists today. `MOD_APP` (`mod-app.service.ts:26-67`) exposes no path-change registry and no fs store. The only note event is `onNoteSaved` (`M:packages/mod-core/src/contract/mod-api.v1.ts:356-362`), implemented over `addAfterSaveObserver` (`mods-host.service.ts:566-591`).
7. Freeze test: `CONTEXT_PUBLIC ... satisfies Record<keyof ModContextV1, true>` (`src/tests/lib/plugins/mods/mod-api-contract.test.ts:46-63`). The runtime key equality is at `:231`. Current pin: `package.json:81` (`328ca55f...`).
8. `duplicateItem` never reaches `applyNoteChange` (`fs.service.ts:345-364`). Trash restore uses source `restore`.

### Refuted or corrected

R1. **"Creation has four call sites; the `applyNoteChange` create/fs branch is the cheapest single point" (host 1, 3.3) is incomplete in a way the owner will notice.** Quick Capture does not use `create_note`:
- `app/deep-link-actions.ts:213-225` (`executeCaptureAction`, the clipboard / global-shortcut capture path that `plugins/quick-capture/quick-capture.service.ts:5` dispatches into via `executeAction`) creates a fresh note with `writeTextFile` + `notifyAfterSave` + `addToTree`.
- `features/deep-link/deep-link.service.ts:306-317` (overwrite, possibly a new file) and `:325-337` (silent create) do the same.
- `features/file-icons/file-icons.service.ts:99-104` creates a folder note with source `save`.
- `plugins/templates/templates.service.ts:118` writes empty template files.

All of these fire `onNoteSaved`, not a created event. The owner uses Quick Capture (memory "Owner feature usage"). An `onNoteCreated` fed from the create/fs branch would miss captures, which are the most frequent creation path in that workflow. Covering them means notification calls at about three more write sites in `app/` and `features/`. That is a behavior change in write paths and needs an owner decision.

R2. **"Fire the created listener in `applyNoteChange`, right before `fanOut`" (host 3.3) puts delivery before the creator has finished, which opens a lost-write race.** In `openOrCreateNote` (`note-creator.service.ts:118-127`) the order is: `applyNoteChange` (sync), `addToTree`, `await openFileInEditor`. `openFileInEditor` issues `readTextFile` and adds the tab only after it resolves (`editor.service.ts:125-141`). The mod's `setTimeout(0)` callback runs in that gap. If it calls `ctx.vault.write`:
1. `await exists` (`mod-vault.service.ts:121`) can resolve before the read.
2. The tab check (`:124-125`) finds no tab.
3. `writeTextFile` runs.
4. `syncExternalContentToEditor` is a no-op with no tab (`editor.service.ts:77-78`).
5. The tab is then added with the bytes read before the write, as `savedContent`, so it is clean.

`notifyAfterSave` inside the write marked a recent save, so the watcher does not reconcile. The user's next edit autosaves over the mod's write. `createFile` callers open the file after it returns (for example `app/commands.ts:134`, `QuickSwitcher.svelte:49`), so firing at the end of `createFile` does not close the gap either. The race is IPC-order dependent, so it is rare but silent. It is pre-existing for any `vault.write` against a note that is being opened, but `onNoteCreated` makes it the default timing for the most natural use ("stamp a property on every new note").

R3. **"Delivering at the consumer position hands a mod a half-finished move; it is survivable, not clean" (host 3.2) understates it.** It is data loss. `updateLinksAfterRename` reads each backlinking note (`link-updater.service.ts:52`: the dirty tab or `readTextFile`) and then `writeTextFile`s the rewritten bytes (`:58`). A mod callback scheduled at the consumer position runs during the `get_backlinks_v2` await (`:47`). If it writes one of those backlinking notes, the link updater overwrites it with content derived from its own read, and the mod's write is lost. With `settled` at the end of `applyPathChange` (after `:233-235`) the rewrite is finished. `settled` is mandatory. The contract scout's alternative ("doc line: `ctx.vault.read(to)` may not see rewritten links", contract "Risks") does not cover this.

R4. **The `info` argument with `childPaths` and `isDirectory` on `pathChanged` (host 3.2) is speculative.** Every existing consumer handles folders by prefix (`app/boot.ts:43-52`; the docblock at `path-change.service.ts:42-44`), and a mod can do the same from `{ from, to }`. Per-child events (host 3.4 option a) schedule N callbacks for an N-note folder and are not needed for the stated power. Cut both. A mod that needs to know folder versus note can check the extension or call `ctx.vault.list`.

R5. **The path-keyed own-operation map in `mod-vault.service.ts` (host 3.5) is premature for item 5.** Item 2's research (`item-02-host.md:9, 50-52`) designs own-write detection as a synchronous scope around `notifyAfterSave`. That does not transfer to a `settled` callback that fires after several awaits. The map the host scout proposes works, but it adds a second attribution mechanism. The only loop it prevents is a mod that moves the note it was told about, or creates a note per created note. That is the same class as the documented `onNoteSaved` + `vault.write` loop (`help/documentation/28-mods.md:179`), and the remedy is the same: compare before acting, or switch the mod off in Labs. Use object payloads so an `own: boolean` field can be added later, and leave the option out of v1.

R6. **Contract scout, labs option B "does not change the contract file".** True for `mod-api.v1.ts`, but `M:packages/mod-core/src/unstable/context.ts:18-26` still changes and the SHA still moves. B saves nothing in process; it only weakens the promise. Stable (A) is the right default.

R7. **Contract scout: "A mod calling `ctx.onNoteMoved` on an older host throws not a function".** Correct, but this is only a real risk for the owner's single-host setup if mods ship before the host adopts the SHA. Ordering covers it; no gate is needed.

## (a) Real cost

Split in two. Combined, it is medium-large.

**5a `onNoteMoved` (small to medium).** Files:
- `M:packages/mod-core/src/contract/mod-api.v1.ts`: `ModNoteMovedV1 { from: string; to: string }` and `onNoteMoved: (callback: (event: ModNoteMovedV1) => void) => () => void` next to `onNoteSaved` (`:362`).
- `M:packages/mod-core/src/testing/fake-ctx.ts:237`: `onNoteMoved: notModelled('onNoteMoved')`. Test in `M:packages/mod-core/test/testing/fake-ctx.test.ts`.
- `src/lib/core/filesystem/path-change.service.ts`: optional `settled?(from: string, to: string): void` on `PathChangeConsumer`, and a second isolated loop after `:233-235` for `to !== null` only. Update the lifetimes comment at `:67-72` (mod lifetime).
- `src/lib/plugins/mods/mods-host.service.ts`: `onNoteMoved` next to `:566`. Register via `registerPathChangeConsumer({ name, pathChanged: () => {}, settled })`, filter both paths with `vaultRelativeKey`, and use the same `setTimeout(0)`, `pending` and liveness checks as `:573-583`. Extract the shared delivery helper used by `onNoteSaved` only if item 2 has not already done so.
- SHA bump: `package.json`, `pnpm-lock.yaml` (`docs/MOD-CORE.md` steps).
- Tests: `src/tests/lib/core/filesystem/fs.service.test.ts` (the consumer block; `settled` runs after `rename_note`/`rename_in_search_index`, not on a failed `diskOp`, not on delete, isolated on throw). `src/tests/lib/plugins/mods/mod-api-contract.test.ts` (key plus a `NOTE_MOVED_PUBLIC` payload list). A new `src/tests/lib/plugins/mods/mod-note-moved.test.ts` modelled on `mod-note-saved.test.ts` and `mod-vault-paths.test.ts`. It must assert that inside the callback the tree already holds `to` and a backlinking note already carries the rewritten link; that is what proves `settled`. It also covers rename, move, a folder move reported once, delete not reported, dispose and unload cancel pending callbacks, and a vault switch drops them.
- Docs: `help/documentation/28-mods.md:171-180`, `help/documentation/mods/07-events-and-reactivity.md`, `13-api-reference.md`, `12-types-build-and-test.md:477, 570` (fake list), `15-errors-and-debugging.md` (the "needs a callback function" message).

**5b `onNoteCreated` (medium, owner decision first).** Adds:
- A created-note notifier in core: a registry in `note-change.service.ts` or `editor.hooks.ts`.
- Calls from the creators, placed after each creator has finished. For `openOrCreateNote` that is after `openFileInEditor`.
- If the owner wants Quick Capture covered, calls at `deep-link-actions.ts:215` and `deep-link.service.ts:310, 336`.
- Tests per creator. The race in R2 also needs an owner decision, below.

## (b) Contract change: yes

`ModContextV1` has no event besides `onNoteSaved` (`M:.../mod-api.v1.ts:356-362`), and `MOD_APP` exposes no path registry (`mod-app.service.ts:26-67`). Adding the event to `ModContextV1` is additive: no `apiVersion` bump under the header rule at `:15-17`. The host freeze test (`mod-api-contract.test.ts:46-63, 231`) forces the host to implement the event in the same commit as the SHA bump.

## (c) Minimal design

- One event for rename and move: `ctx.onNoteMoved(({ from, to }) => ...)`. Paths are vault-relative and the payload is an object (additive later). It covers every file and folder the app moves, like `onNoteSaved` covers every saved file. A folder is reported once, and the docs explain the prefix remap. No deletes, no `isFolder`, no child list, no rename/move split, no `ignoreOwnWrites` in v1.
- Delivered from a new `settled` member at the end of `applyPathChange`, in a `setTimeout(0)`, re-checking `runtime.unloaded` and `vaultStore.path` in the timer (the `settled` call follows several awaits). Errors go to `debug(tag, ...)`, never Sentry, as `report` does at `mods-host.service.ts:570`.
- If `updateLinksAfterRename` or `get_backlinks_v2` rejects (`path-change.service.ts:190`, not caught), `applyPathChange` rejects, the event is skipped, and the caller already shows the error. Document it; do not add a `try/finally` (memory "No core changes for corner cases").
- `onNoteCreated`: defer to a second Issue. If the owner wants it now, use the same object payload `{ path }`, fire it from the creators after their tab-open step and not from `applyNoteChange`, and state in the docs which creators are covered.

## (d) Risks the design must handle

1. Lost mod write during the link rewrite (R3). Handled only by `settled`.
2. Concurrent `applyPathChange` started by a mod callback mid-move. A callback that runs before the re-key and calls `ctx.vault.move(to, ...)` finds no tree node at `to` (`findNodeByPath` at `:152` returns null), so it takes `refreshTree` (`:201`), and its `rename_note(to, x)` can land before the first `rename_note(from, to)` (`:209`), leaving the Rust `VaultIndex` keyed wrong. Also handled by `settled`.
3. Lost write on create (R2) if `onNoteCreated` is fed before the tab opens. Handled by firing after the creator's open; otherwise document it.
4. Loops: a mod reacting to `onNoteMoved` by moving again; Auto Organize moving on save (`auto-organize.service.ts:338`) after a mod write, where its `writingPaths` guard (`:64, 205`) covers only its own writes. Document these with the existing "Avoid save loops" text. No mechanism in v1.
5. Vault switch or unload between the move and the timer: covered by the liveness check.
6. Missed events, all documented limits: external changes (the watcher sends bare paths), `duplicateItem`, Trash restore, a failed link rewrite, and for `onNoteCreated` the uncovered creators.
7. Security: no new privilege. Mods already have full app trust and `vault.list`. Paths only, no content.

## (e) Ordering against the other items

- After item 2, or in the same batch. Item 2 reshapes the `onNoteSaved` delivery code that `onNoteMoved` copies, and it sets the convention for payloads and own-write options. Doing 5 first means 2 has to refactor two subscribers.
- With item 6, or after it. Item 6 changes how callback failures are reported (the `report` at `mods-host.service.ts:570`). If 5 lands first, item 6 must also touch `onNoteMoved`. That is small, but it is a reason to land 6 before or with 5.
- One SHA adoption for the contract items (1, 2, 4, 5). Each adoption costs the full `docs/MOD-CORE.md` procedure plus `pnpm build`, so batch the mods-repo contract edits into one commit and adopt once.
- Independent of items 3 (host only) and 4 (read-only query). Item 7 (low priority) is unaffected.
- 5b (`onNoteCreated`) last, after the owner rules on Quick Capture coverage and the open race.

## Not verified

- Whether Tauri resolves `exists` before an earlier `readTextFile` in practice (R2 depends on IPC ordering; it is possible because plugin-fs commands run on separate async tasks, but this was not measured).
- `M:test/bundles.test.ts` handling of an unknown ctx member (not read; no mod subscribes yet).
- The help-doc tests (`src/tests/help/mods-example.test.ts`, `src/tests/scripts/sync-wiki-docs.test.ts`) were not read.
