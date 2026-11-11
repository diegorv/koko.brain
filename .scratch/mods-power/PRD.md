# mods-power PRD

## Goal

Give vault mods more power with less complexity (owner, 2026-11-11). A mod should write frontmatter, react to saves and moves without looping on its own writes, match notes with the same expression language that views and Auto Organize rules use, take a text from a rule, and show its callback failures to the user, all through stable `ctx` members with vault-relative paths instead of raw `ctx.app` calls with absolute paths.

Two repositories:

- **Host:** this repo (`/Users/diegorv/Dev/pet-projects/koko/brain`). Mods host in `src/lib/plugins/mods/`, Issues in `.scratch/mods-power/issues/`.
- **Mods workspace:** `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`. The contract `packages/mod-core/src/contract/mod-api.v1.ts`, Issues in `.scratch/mods-power/issues/`, spec in `.scratch/mods-power/spec.md`.

Research and validation per item: `.scratch/mods-power/research/item-0N-*.md`; cross-Issue review: `research/cross-review.md` (applied to the Issues on 2026-11-11).

## Owner decisions

- **Item 8 (per-vault enablement): dropped.** No Issue.
- **Item 7 (declarative settings in the manifest): low priority, not prioritized.** Brain Issue 07 exists with `Status: needs-triage`; its four owner questions (storage and read path, types in v1, in-flight write, pending edit on switch-off) are in its Notes.
- **Still open for the owner:**
  - Brain Issue 08 (`onNoteCreated`): do Quick Capture captures count as created notes, and should the event fire after each creator's tab-open step. Until answered, no contract change for creation.
  - Item 1 scope (cross-review Finding 14): the owner's text names "the editNote helper's raw editorStore/vaultStore use for frontmatter edits". Brain 01 and mods 01 leave `editNote` unchanged, because splitting its one save into a frontmatter save and a body save would let an Auto Organize rule fire between them (`research/item-01-validation.md:21`). Confirm at triage.

## Rules for the order

- Every contract change is one mods Issue and one commit, linear: mods 01, 02, 03, 04. No batching. Each host adoption must implement every contract member between its pin and the adopted SHA (`src/tests/lib/plugins/mods/mod-api-contract.test.ts:46-77`, `src/tests/help/mods-types.test.ts:25-52`), so a batched bump would force all four host members into one commit.
- Each adoption Issue (brain 01, 02, 04, 05) adopts the exact SHA of its own mods Issue, never a later one, and checks `git -C <mods> diff <pin> <sha> -- packages/mod-core/src/contract` first. The SHA bump and the host code land in one commit, because the frozen lists fail `pnpm check` on a bump alone.
- Strict alternation is not needed: brain N adopts mods N's exact SHA, so mods N+1 may already be in progress or pushed.
- Brain 01, 02, 04, 05 stay `needs-info` until their mods SHA exists. relay-lite does not read `Requires first (other repo)` or gate on triage labels, so launch every brain Issue by explicit number only.
- Host Issues that touch `mods-host.service.ts` or `mod-vault.service.ts` (02, 03, 04, 05, 06, 07) run one after another, never as parallel relay workflows.

## Final order

| Step | Repo | Issue | Waits for |
|---|---|---|---|
| 1 | mods | 01 `ctx.vault.updateFrontmatter` | done, `4195eaab9b5f950d80b2d358de383329acb93ea6` on `origin/main` |
| 2 | host | 06 visible callback errors | nothing (host only) |
| 3 | host | 03 rule action input | nothing (host only); after 06 to avoid rebase churn in `mods-host.service.ts` |
| 4 | host | 01 stable `updateFrontmatter` | mods 01 (done) |
| 5 | mods | 02 `onNoteSaved` content and `ignoreOwnWrites` | in progress since 08:21 (mods ledger) |
| 6 | host | 02 `onNoteSaved` content and own writes | brain 01, brain 06, mods 02 SHA |
| 7 | mods | 03 `ctx.query` (plus the own-write JSDoc follow-up) | mods 02 |
| 8 | host | 04 `ctx.query` | brain 02, mods 03 SHA |
| 9 | mods | 04 `ctx.onNoteMoved` | mods 03 |
| 10 | host | 05 `ctx.onNoteMoved` | brain 04, brain 06, mods 04 SHA |
| 11 | host | 07 manifest settings (low priority) | brain 06, owner triage |
| 12 | host + mods | 08 `onNoteCreated`, then a future mods 05 | brain 05, owner answers |

Steps in different repos can overlap (a mods Issue may run while the host adopts the previous SHA). Steps 2 and 3 can run while mods 02 builds.

## Issues

| # | Title | Repo | Blocked by | Requires first (other repo) | Status |
|---|---|---|---|---|---|
| 01 | [Mods write frontmatter through stable `ctx.vault.updateFrontmatter`](issues/01-stable-update-frontmatter.md) | host | none | mods 01 (`4195eaa`, delivered) | ready-for-agent |
| 02 | [`ctx.onNoteSaved` passes the saved content and can ignore the mod's own writes](issues/02-on-note-saved-own-writes.md) | host | 01, 06 | mods 02 SHA | needs-info |
| 03 | [An Auto Organize rule passes a text to its mod action](issues/03-rule-action-input.md) | host | none | nothing | ready-for-agent |
| 04 | [Mods match notes with the view and rule expression engine (`ctx.query`)](issues/04-expression-engine-for-mods.md) | host | 02 | mods 03 SHA | needs-info |
| 05 | [Mods get `ctx.onNoteMoved` for renames and moves](issues/05-note-path-events.md) | host | 04, 06 | mods 04 SHA | needs-info |
| 06 | [Mod callback errors show in the Labs row and in one toast](issues/06-visible-callback-errors.md) | host | none | nothing | ready-for-agent |
| 07 | [A mod declares its settings in the manifest and Labs edits them](issues/07-manifest-declared-settings.md) | host | 06 | nothing | needs-triage (low priority) |
| 08 | [Mods get `ctx.onNoteCreated` for new notes](issues/08-on-note-created.md) | host | 05 | a future mods 05 | needs-info (owner questions) |
| mods 01 | `ctx.vault.updateFrontmatter` in the mod-core contract | mods | none | none | resolved (`4195eaa`) |
| mods 02 | `onNoteSaved` passes the saved content and can ignore the mod's own writes | mods | none in the file (01, done) | none | in progress |
| mods 03 | `ctx.query` in the mod-core contract and test fake | mods | 02 | none | ready-for-agent |
| mods 04 | `ctx.onNoteMoved` reports renames and moves | mods | 03 | none | ready-for-agent |

Item map: 1 = brain 01 + mods 01; 2 = brain 02 + mods 02; 3 = brain 03; 4 = brain 04 + mods 03; 5 = brain 05 + mods 04 (move, rename) and brain 08 (create); 6 = brain 06; 7 = brain 07.

## Cross-review items not applied in the Issue files

- **Mods 02 was already building** when the review was applied (relay start 08:21, worktree `kokobrain-mods-src.worktrees/issue-02-on-note-saved-own-writes`), so its Issue file was left as committed: an uncommitted edit on the mods `main` checkout would collide with relay's delivery of that file. Finding 1's mods half (the `onNoteSaved` and `updateFrontmatter` JSDoc naming `ctx.vault.updateFrontmatter` as an own write) moved to mods 03 Behavior 3, which applies it only if mods 02 did not; brain 04 copies the changed JSDoc into the `.d.ts`. Finding 2's `Blocked by: 01` for mods 02 is moot (01 is done). Finding 11's `check:package` step for mods 02 is not in its Gate: run it at delivery. The orchestrator can still send these points to the running build as a course correction.
- **Mods 01** was delivered before the review was applied; its stale Notes ("Contract-changing items (4, 5, 7)") go away when the Issue is closed.
- **Mods ledger** (`kokobrain-mods-src/.scratch/mods-power/ledger.md`) caches `Blocked by` as none / none / none / 02; the files now say 01 / 02 / 03 for mods 02-04. The ledger is written only by relay: refresh it through `relay ledger` before the next mods run.
- **Finding 7, second half:** add to `.scratch/mods-host-robustness/issues/03-note-saved-fires-for-mod-creates.md` Notes: "If `ctx.vault.create` starts notifying, it must count toward the own-write marker of mods-power brain Issue 02." Not edited here (outside this task's files); brain 08 Notes carry the same pointer.
- **Finding 12:** add to `.scratch/mods-host-robustness/issues/02-mod-write-guard-normalizes-paths.md`: "also `ctx.vault.updateFrontmatter` once mods-power 01 lands". Not edited here; brain 01 Notes point to that Issue.

## Out of scope

- Item 8, per-vault mod enablement (dropped).
- Changing `editNote`, and migrating existing mods (`portent`, `operations`, `bulk-tag`, `inbox-triage`, `help/examples/mods/note-tools/main.js`) to the stable members; a `check-mod.mjs` lint against raw members.
- `onNoteCreated` until the owner answers brain 08; delete events, `isFolder`, child lists, a rename versus move split, and an own-write option for move events.
- Own-write skipping for raw `ctx.app` writes, `editNote` on the open tab, other mods' writes, or Auto Organize rule runs; loops between two writers stay documented, not prevented.
- For `ctx.query`: object filters, `limit`, `sort`, formulas, returning records, a disk fallback, and a `fakeCtx` evaluator.
- For rule input: templates or variables in the text, multi-line input, an expression mode.
- For manifest settings: a `ctx.settings` member, `onChange`, `number`/select/password types, host-written defaults.
- A typed error union or reason type in the contract; enforcing `minAppVersion`.
- Core fixes for documented limits: the `//` tab path miss (`.scratch/mods-host-robustness/issues/02-mod-write-guard-normalizes-paths.md`), a `try/finally` around `applyPathChange`, index freshness after a move or create, the empty `---` block bug, and the `ctx.kb()` `whenIndexReady` docs bug (file separately).
- Mirroring the manifest `settings` check in the mods workspace's `scripts/mod-loader.ts` (a possible mods Issue at brain 07's triage).
