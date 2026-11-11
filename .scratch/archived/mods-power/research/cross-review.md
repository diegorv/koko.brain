# mods-power cross-Issue review

Scope: brain Issues `.scratch/mods-power/issues/01-07`, mods Issues `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/.scratch/mods-power/issues/01-04`, and `research/item-0*-validation.md`. Code read at host `c2bed3463`, mods `36a53cb` (contract unchanged since `03526cf`; `git log 328ca55..HEAD -- packages/mod-core/src/contract` is empty). The mods ledger already has mods 01 `in-progress` (`kokobrain-mods-src/.scratch/mods-power/ledger.md`, Log `08:13`).

Path prefixes: `B:` is `/Users/diegorv/Dev/pet-projects/koko/brain`, `M:` is `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`.

Checked, no finding:
- No mods-repo number gap or collision: 01, 02, 03, 04, one feature folder (`M:docs/agents/issue-tracker.md:8` numbers per feature). The cross-repo pairs are brain 01/mods 01, brain 02/mods 02, brain 04/mods 03, brain 05/mods 04; every Issue names its partner by full path and the right number.
- No `Blocked by` line names another repo; the cross-repo prerequisite is a separate `Requires first (other repo)` line in every brain Issue.
- No other open mods Issue edits the contract (grep of every non-resolved `M:.scratch/*/issues/*.md` for `mod-api.v1.ts` / `contract/`: only the four mods-power Issues; the habits hit is a word match). So nothing else lands between the mods-power contract commits.
- No mods host-integration test compares `ctx` keys with the host (`M:test/host-integration/` has none of `createModContext`, `ModContextV1`, `CONTEXT_PUBLIC`), so each mods commit verifies green before the host adopts it, as the mods Issues claim.
- Every failing-first test can be written (see Finding 3 and 4 for the two that need text changes).

## Findings

### 1. HIGH: the own-write marker for `ctx.vault.updateFrontmatter` belongs to no Issue

Files: `B:.scratch/mods-power/issues/01-stable-update-frontmatter.md`, `B:.scratch/mods-power/issues/02-on-note-saved-own-writes.md`, `M:.scratch/mods-power/issues/01-stable-update-frontmatter.md`, `M:.scratch/mods-power/issues/02-on-note-saved-own-writes.md`.

Evidence:
- Brain 02 Notes: "For item 1: `ctx.vault.updateFrontmatter` must set the same marker ... with a per-key counter ... Record it in item 1's Issue; nothing here." Brain 01 has no marker in Behavior or Acceptance; its Notes say the opposite direction: "Item 2 (`ignoreOwnWrites`) is the fix and depends on this Issue".
- `item-02-validation.md:45`: own writes mean `ctx.vault.write` "plus `ctx.vault.updateFrontmatter` once item 1 lands"; `:90-93` give the design (marker held from the call until it settles, per-key counter). `item-01-validation.md:67`: the main loop case is "a mod reacting to a save by setting a property".
- Mods 02 contradicts itself: the summary says "skip the saves it caused through `ctx.vault`", Behavior 2 says only "this mod's own `ctx.vault.write`". Mods 01's JSDoc (Behavior 3, last-but-one bullet) says `updateFrontmatter` "fires `onNoteSaved`, the mod's own included, so a callback ... can loop", and no Issue updates it once the option exists.
- A synchronous marker cannot wrap this member from the adapter: core notifies inside its own awaits (`B:src/lib/core/frontmatter/frontmatter-write.service.ts:133` tab branch through `saveFileByPath`, `:161` closed branch).

Result if left: both Issues ship, and the case item 2 exists for (stamp a property on save with the stable writer) still loops with `{ ignoreOwnWrites: true }`.

Fix (brain 02 owns it, because mods 01 and brain 01 run first and mods 01 is already in progress):
- Brain 02 `Blocked by: 01, 06` (06: see Finding 3).
- Brain 02 Behavior 2: replace the single `let ownWrite` slot with `const ownWrites = new Map<string, number>()` keyed by `` `${modId}\n${abs}` ``, and `isOwnWrite(modId, abs)` true while the count is above zero. `vault.write` increments before `notifyAfterSave(abs, content)` and decrements in `finally` (still synchronous). `vault.updateFrontmatter` increments after `toAbsolute` and the Markdown check, before `updateNoteFrontmatter(abs, mutate)`, and decrements in `finally` after it settles. JSDoc states the accepted cost: an editor save of the same note while that call is in flight is not reported to this mod.
- Brain 02 Acceptance, new item: with `{ ignoreOwnWrites: true }`, the mod's own `ctx.vault.updateFrontmatter` on a closed note and on an open tab does not call back; without the option it does, with the rebuilt text; two concurrent `updateFrontmatter` calls on one path leave `isOwnWrite` false after both settle (a later editor save calls back).
- Brain 02 Docs: also the `updateFrontmatter` subsection that brain 01 adds to `help/documentation/mods/04-vault-files.md` ("it fires `onNoteSaved`, the mod's own too ... can loop") and the `13-api-reference.md` row brain 01 adds: name the option.
- Mods 02 Behavior 2: "saves caused by this mod's own `ctx.vault.write` and `ctx.vault.updateFrontmatter` are not reported", and edit the `updateFrontmatter` JSDoc loop sentence from mods 01 to name the option. Mods 02 `Blocked by: 01` (also Finding 2).
- Brain 01 Notes: replace "Item 2 ... is the fix and depends on this Issue" with "Item 2 (brain 02) extends the own-write marker to this member"; nothing else changes in brain 01.

### 2. HIGH: `Blocked by` lines do not encode the SHA adoption order, and the Issues state three different adoption policies

Files: brain 01, 02, 04, 05; mods 01, 02, 03, 04.

Evidence:
- Each host adoption must implement every contract member between the current pin and the adopted SHA: `CONTEXT_PUBLIC` / `VAULT_PUBLIC` are `satisfies Record<keyof ...>` (`B:src/tests/lib/plugins/mods/mod-api-contract.test.ts:46-77`) and `STABLE_TYPES` lists every exported `...V1` type (`B:src/tests/help/mods-types.test.ts:25-52`).
- Mods `Blocked by`: 01 none, 02 none, 03 none, 04 `02`. The mods ledger runs the lowest unblocked number (`M:.scratch/mods-power/ledger.md`, "Next up"), so the mods history will be 01, 02, 03, 04, but nothing stops 03 before 02, or `--all --parallel`.
- Brain `Blocked by`: 01 none, 02 none, 04 none, 05 `02`. Brain 05 adopts mods 04's SHA, which sits after mods 03 (`ctx.query`), so brain 05 cannot pass `pnpm check` until brain 04 is delivered; its "Why Blocked by 02" covers only 02. Brain 04 adopts mods 03's SHA, which contains mods 01 and 02, so it needs brain 01 and 02 first.
- Brain 04 hard-codes the guard `git -C <mods> diff 328ca55..<sha>`: after brain 01 and 02 the pin is no longer `328ca55`. Brain 05 says `<current pin>` correctly. Brain 01 and 02 have no guard at all, and brain 02 allows "a later mods SHA that contains it", which can carry an unimplemented member.
- Policies: mods 03 Notes "deliver one, let the host adopt it, then the next" (strict alternation); mods 01 and brain 01 "run after this one, never in parallel"; mods 02 and 04 offer batching "into one commit"; brain 02 Notes "If another Issue adopts first, it carries at least that line; this Issue then needs no bump".

Decision: one adoption per contract Issue, each brain Issue adopting the exact SHA of its own mods Issue, with the mods commits linear in the same order as the brain Issues. A batched bump is not simpler: every frozen list above would force all four host members into one host commit, so no host Issue could ship alone. Strict alternation is not needed: brain N adopts mods N's exact SHA, not mods `HEAD`, so mods N+1 may already be in progress or pushed.

Fix:
- Mods: `02` `Blocked by: 01`; `03` `Blocked by: 02`; `04` `Blocked by: 03` (replacing `02`; its rationale paragraph then reads "the host adopts SHAs in order, and brain 05 adopts after brain 04").
- Brain: `02` `Blocked by: 01, 06`; `04` `Blocked by: 02`; `05` `Blocked by: 04, 06`.
- Every adoption Issue (brain 01, 02, 04, 05) uses the same Behavior 1 sentence: "Adopt exactly the SHA recorded in mods Issue NN's Comments, never a later one. Before installing, `git -C /Users/diegorv/kokobrain-vaults/kokobrain-mods-src diff <pin in package.json> <sha> -- packages/mod-core/src/contract` must show only this Issue's change plus members already on this repo's `main`; otherwise stop and record it under Comments." Brain 04: replace `328ca55..<sha>` with that. Brain 02: delete "(or a later mods SHA that contains it)" and the Notes bullet "Whichever host Issue first adopts ...".
- Replace the four policy sentences (mods 01, 02, 03, 04 Notes; brain 01, 02, 04 Notes) with one: "Contract Issues land in the mods repo in the order 01, 02, 03, 04; each brain Issue adopts its own mods SHA in the order brain 01, 02, 04, 05. No batching." Drop the batching paragraphs in mods 02 ("Batching") and mods 04 ("If the owner batches ...").
- After the `Blocked by` edits, the mods ledger's cached column is stale (`M:.scratch/mods-power/ledger.md` table). It is written only by relay (`relay ledger`); refresh it through relay before the next run. Not verified whether `/relay-lite:run` re-reads `Blocked by` from the Issue files.

### 3. MEDIUM: brain 02, 05 and 06 rewrite the same callback delivery, and only 06 states an order

Files: `B:.scratch/mods-power/issues/02-on-note-saved-own-writes.md`, `05-note-path-events.md`, `06-visible-callback-errors.md`.

Evidence:
- All three edit `onNoteSaved` delivery in `B:src/lib/plugins/mods/mods-host.service.ts:566-591` (the `report` at `:570`, the `try` at `:578-582`). Brain 06 Behavior 3 replaces it with `callModCallback('onNoteSaved', () => callback(relative))` and its Notes say "land before items 2 and 5"; brain 02 and 05 do not list 06 in `Blocked by`.
- Brain 02 Behavior 3 keeps "The failure log at `:570` keeps printing only the error text", which 06 deletes.
- Brain 05 Behavior 3 is conditional: "If Issue 02 left a shared delivery helper ... use it" (brain 02 creates none) and "If Issue 06 has landed ... report `onNoteMoved` failures the same way". Its Acceptance pins only `debug` and "not in `error`", so if 05 lands first, 06 (whose union is `'onNoteSaved' | 'watch' | 'theme.onChange'`) never retrofits `onNoteMoved`, and its failures stay invisible with no failing test.
- If 06 landed after 02 as written, `callback(relative)` fails `tsc` against the two-argument callback type: caught, but 06's text is then wrong.

Fix: 06 first (host only, no SHA). Then:
- Brain 02 and 05 `Blocked by` include `06` (Finding 2 lists the full lines).
- Brain 02 Behavior 3: "`:579` becomes `callModCallback('onNoteSaved', () => callback(relative, content))`"; delete the `:570` log sentence.
- Brain 05 Behavior 3: drop both "If ..." sentences; deliver with `callModCallback('onNoteMoved', () => callback({ from, to }))` and add `'onNoteMoved'` to `ModCallbackError.callback` in `B:src/lib/plugins/mods/mods.store.svelte.ts`. Acceptance: a sync throw and a rejection are recorded under `modsStore.callbackErrorFor(<id>).callback === 'onNoteMoved'`, `debug` gets `onNoteMoved callback failed:`, `error` is never called, and the per-load toast is shared with the other callbacks (one toast per load in total, as 06's closure flag gives).
- Brain 05 Docs: `15-errors-and-debugging.md` row for `onNoteMoved` gets the Labs row and once-per-load toast cells that 06 gives the others.
- Brain 06 Notes: replace "both should call `callModCallback`" with "brain 02 and 05 are blocked by this Issue".

### 4. MEDIUM: brain 01 and 05 miss the typed `ModContextV1` literal in `mods-example.test.ts`

Files: `B:.scratch/mods-power/issues/01-stable-update-frontmatter.md`, `05-note-path-events.md`.

Evidence: `B:src/tests/help/mods-example.test.ts:40-89` builds `const ctx: ModContextV1 = { ... }` with every member, `vault` included (`:59-74`). `pnpm check` type-checks `src/tests` (`B:tsconfig.json` `"include": ["src", ...]`, `B:package.json:14` svelte-check). Brain 04 lists `query: unused` for it; brain 01 does not list `updateFrontmatter: unused` in `vault`, and brain 05 says the file "still pass[es]" without the `onNoteMoved: unused` line. Both gates fail until the agent finds it. Brain 02 needs nothing (`onNoteSaved: unused` stays assignable).

Fix: brain 01 Acceptance: "`src/tests/help/mods-example.test.ts`: `updateFrontmatter: unused` in the `vault` literal (`:59-74`)". Brain 05 Acceptance: replace "`src/tests/help/mods-example.test.ts` ... still pass" with "`src/tests/help/mods-example.test.ts`: `onNoteMoved: unused` after `onNoteSaved` (`:46`)".

### 5. MEDIUM: mods 04's JSDoc promises an index that `ctx.query` does not see at `onNoteMoved` time

Files: `M:.scratch/mods-power/issues/04-note-path-events.md`, `B:.scratch/mods-power/issues/05-note-path-events.md`, `B:.scratch/mods-power/issues/04-expression-engine-for-mods.md`.

Evidence: mods 04 Behavior 3: "the file tree and index already use `to`". At the `settled` point the Rust index is re-keyed (`B:src/lib/core/filesystem/path-change.service.ts:207-212`), but the collection property index is not: its path-change consumer moves only view indexes (`B:src/lib/features/collection/collection.service.ts:198-213`), and `forgetNote` evicts the old key (`path-change.service.ts:233-235`). Brain 04 documents that `matches()` rejects for the new path "until the index refreshes" and its Notes say "Item 5's Issue must document the rename window above for `onNoteMoved`"; brain 05's Docs do not.

Fix: mods 04 Behavior 3 bullet becomes "links in other notes are already rewritten and the file tree already uses `to`; `ctx.query` may not see the note at `to` until the app's index refreshes, a few seconds later" (mods 03 lands before 04 under Finding 2, so the name exists). Brain 05 Docs, `28-mods.md` and `07-events-and-reactivity.md` sections: the same sentence. No code or test change.

### 6. MEDIUM: `onNoteCreated` was split out to "a separate Issue" that does not exist

Files: `B:.scratch/mods-power/issues/05-note-path-events.md` Notes ("Split out, needs the owner"), `M:.scratch/mods-power/issues/04-note-path-events.md` Notes; `item-05-validation.md:64-79,97`.

Evidence: item 5 asks for `onNoteCreated`; both Issues drop it and say it waits for the owner; `ls B:.scratch/mods-power/issues/` has 01-07 only. The two owner questions live only in a Notes bullet of a delivered Issue, so they disappear when brain 05 is closed and deleted.

Fix: add `B:.scratch/mods-power/issues/08-on-note-created.md`, `Status: needs-info`, `Blocked by: 05`, with the two owner questions from brain 05 Notes (do Quick Capture captures count; fire after each creator's tab-open step) and the validation's shape (`{ path }` payload, fired from the creators, `item-05-validation.md:79`). Its contract half becomes mods Issue 05 only after the owner answers. Brain 05 Notes then point to it.

### 7. MEDIUM: brain 02 Notes require an own-write option on move events that brain 05 and mods 04 cut

Evidence: brain 02 Notes: "For item 5: create and move events reuse `{ ignoreOwnWrites }` with the same meaning." Brain 05 Notes: "No `isFolder`, child list, deletes, own-write option"; mods 04 Cut: "an own-write option". Source of both: `item-02-validation.md:123` versus `item-05-validation.md:76` ("no `ignoreOwnWrites` in v1").

Fix: delete that sentence from brain 02 Notes. Move its second half ("If `ctx.vault.create` starts notifying, it must set the marker") into `B:.scratch/mods-host-robustness/issues/03-note-saved-fires-for-mod-creates.md` as a Notes line, since that Issue owns the change (`Status: needs-triage`).

### 8. MEDIUM: brain 01, 02, 04, 05 are `ready-for-agent` before their mods SHA exists

Evidence: brain 01, 02 and 04 have `Blocked by: none` and `Status: ready-for-agent`; the prerequisite is only the prose `Requires first (other repo)` line, which relay-lite does not read (the ledger columns are `Blocked by` and `Status` only, `M:.scratch/mods-power/ledger.md`). The owner's standing rule launches `ready-for-agent` Issues without asking (memory "Relay auto-launch"). A run before the SHA comment exists stops at Behavior 1 or adopts the wrong commit.

Fix: set `Status: needs-info` on brain 01, 02, 04, 05 with one line "Set `ready-for-agent` when mods Issue NN's full SHA is in its Comments". Launch them by explicit number only (memory "relay-lite ignores triage labels", so the status alone does not gate a run).

### 9. LOW: wrong item lists in ordering notes

- Brain 01 Notes and mods 01 Notes: "Contract-changing items (4, 5, 7)". Item 7 changes no contract (brain 07 "Requires first: nothing"); item 2 does. Fix: "(2, 4, 5)" (or replace with the single sentence of Finding 2).
- Brain 03 Notes: "shares `mods-host.service.ts` with items 1, 2, 5 and 6". Brain 01 edits `mod-vault.service.ts`, not `mods-host.service.ts`; brain 04 and 07 also edit `mods-host.service.ts`. Fix: "items 2, 4, 5, 6 and 7".
- Brain 02 Notes: "Items 1, 5 and 6 also edit ..." omits 4 (`createModContext` wiring) and 7 (`ModRuntime`, `reloadFolder`, data queue in `mod-vault.service.ts`). Fix: "Items 1, 4, 5, 6 and 7".

### 10. LOW: the "debug log" JSDoc wording has three owners

Evidence: brain 06 Notes: "the contract commit of item 2 or 5 can reword the 'debug log' JSDoc"; brain 06 Docs (optional): reword `B:help/examples/mods/kokobrain-mod.d.ts:327,368,374`. Mods 02 Behavior 2 keeps "the timer, debug-log and disposer sentences"; mods 04 JSDoc "Callback failures go to the mod's debug log"; brain 02 copies the d.ts JSDoc "word for word" from the contract. Brain 06's optional d.ts edit would make the d.ts differ from the contract text that brain 02 copies.

Fix: keep the contract wording (it stays true, `item-06-validation.md:29`). Delete brain 06's optional d.ts bullet and its Notes sentence about rewording in item 2 or 5.

### 11. LOW: mods 03's gate differs from the others

Evidence: mods 03 Gate: `KOKOBRAIN_HOST_ROOT=<brain checkout> pnpm check` plus `check:package`. Mods 01, 02, 04 and `B:docs/MOD-CORE.md` step 6 use `pnpm verify` (temp build, then `pnpm check`: `M:package.json` scripts `verify`, `check`).

Fix: mods 03 Gate: `pnpm typecheck`, then `KOKOBRAIN_HOST_ROOT=<brain checkout> pnpm verify`, then `pnpm check:package <temp consumer>` (MOD-CORE step 2). Mods 01, 02, 04 add the same `check:package` step, which brain 02 already expects ("MOD-CORE.md steps 2 and 6").

### 12. LOW: follow-ups that already have an Issue

Evidence: brain 01 Notes: "A small follow-up can fix both members in the adapter" (the `//` tab miss). `B:.scratch/mods-host-robustness/issues/02-mod-write-guard-normalizes-paths.md` already covers it for `vault.write`.

Fix: brain 01 Notes point to that Issue, and add one line to it: "also `ctx.vault.updateFrontmatter` once mods-power 01 lands".

### 13. LOW: shared doc lines and stale line numbers

Evidence: `help/documentation/mods/13-api-reference.md:101-107` is edited by brain 02, 05 and 06; `15-errors-and-debugging.md:17-21,102` by 02, 05, 06; `07-events-and-reactivity.md:173-236` by 02, 05, 06; `28-mods.md:167-180` by 02, 05, 06; `14-cookbook.md:2132-2135` by 02 and 06. The `mods-host.service.ts` line numbers in 02, 04, 05, 07 are from `c2bed3463` and move once 06 and 03 land.

Fix: one Notes line in brain 02, 04, 05, 07: "Line numbers are from `c2bed3463`; locate each edit by the quoted text after earlier mods-power Issues land." The serial order below already prevents parallel edits.

### 14. INFO: item 1 is narrower than the owner's text

Brain 01 and mods 01 both leave `editNote` unchanged, against the owner's wording "replacing ... the editNote helper's raw editorStore/vaultStore use for frontmatter edits", on the validation's reasoning (`item-01-validation.md:21`). The Issues agree with each other; no fix, but the owner should see it at triage.

## Recommended final order

### Mods workspace (`/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`)

| Step | Issue | Blocked by (after fixes) | Notes |
|---|---|---|---|
| 1 | 01 `ctx.vault.updateFrontmatter` | none | in progress now; push, record full SHA |
| 2 | 02 `onNoteSaved` content and `ignoreOwnWrites` | 01 | covers `updateFrontmatter` (Finding 1); push, record SHA |
| 3 | 03 `ctx.query` | 02 | push, record SHA |
| 4 | 04 `ctx.onNoteMoved` | 03 | JSDoc fix of Finding 5; push, record SHA |

One contract commit per Issue, linear, no batching. A mods Issue may run while the host adopts the previous SHA.

### Host (`/Users/diegorv/Dev/pet-projects/koko/brain`)

| Step | Issue | Blocked by (after fixes) | Needs mods SHA | Status until ready |
|---|---|---|---|---|
| 1 | 06 visible callback errors | none | no | ready-for-agent |
| 2 | 03 rule action input | none | no | ready-for-agent (can run any time; serial with 06 to avoid `mods-host.service.ts` rebase churn) |
| 3 | 01 stable `updateFrontmatter` | none | mods 01 | needs-info until the SHA is recorded |
| 4 | 02 `onNoteSaved` content and own writes | 01, 06 | mods 02 | needs-info until the SHA is recorded |
| 5 | 04 `ctx.query` | 02 | mods 03 | needs-info until the SHA is recorded |
| 6 | 05 `ctx.onNoteMoved` | 04, 06 | mods 04 | needs-info until the SHA is recorded |
| 7 | 07 manifest settings (low priority) | 06 | no | needs-triage (owner decisions) |
| 8 | 08 `onNoteCreated` (new, Finding 6) | 05 | a future mods 05 | needs-info (owner decisions) |

Each adoption Issue bumps `package.json` and `pnpm-lock.yaml` to its own mods SHA in the same commit as its host code, because the frozen lists fail `pnpm check` on a bump alone.

Not verified: whether `/relay-lite:run` re-reads `Blocked by` from the Issue files into the ledger; nothing was run.
