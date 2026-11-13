# Cross-cut: tests, gates and relay fit (queue and confirmed additions)

Adversarial validator, lens tests-relay. Checked at HEAD `318b6e9b5` (main, 2026-11-12). Read-only: nothing was run (no vitest, check, cargo, e2e, app). "Fact" = read at the cited path:line at HEAD. "Inference" = reasoned from code or docs, not executed.

Inputs: the 12 `refute-*.md` and `dossier-*.md` files for the queue (004, 015, 062, 009, 070, 067, 068, 028, 003, 010, 012, 002), and the four `validate-*.md` files for the confirmed additions (014, 042, 043, 047, 045 second tier, 061 part 2, 064, 055, 039, 077, 094 reduced, 161; conditional 098, 230, 214, 013, 141, 139).

## What relay-lite actually runs (facts the findings rest on)

- Checks: `pnpm check`, `pnpm vitest run <file>`, full suite `pnpm vitest run` (`.agent-relay-lite/config.json:5-9`). Extra rule: `cargo test` only "When src-tauri/ changes" (`config.json:17`). No clippy, no e2e, no `pnpm build`.
- The role prompts say "This prompt decides ... which tests run (the targeted checks, and the full suite only in deliver)". Targeted checks = typecheck + test files of touched files + tests asserting a changed name. Build, fix and re-review never run the full suite; deliver runs only `pnpm vitest run` (`.agent-relay-lite/launch/tasks-view-ux-248.js:36`, `roles.rules`, `roles.deliver` step 2).
- Review rule: "APPROVED only if every acceptance criterion is met ... (a criterion only deliver can check does not hold back APPROVED)" (same file, `roles.review`). A criterion nobody in the run can check (an in-app owner check) therefore holds back APPROVED.
- Delivery is `merge` straight to main (`config.json:4`). Clippy (`.github/workflows/ci.yml:116`, ubuntu, `-D warnings`) and E2E run only after the push, in `main-checks.yml:8-41`. A clippy or e2e break lands on main first.
- Auto-launch memory: Issues that say `ready-for-agent` with done blockers are launched without asking, up to 3 workflows, one cargo-heavy Issue at a time, one E2E per checkout (memory `relay-auto-launch-ready-issues.md:15`).
- TESTING.md allowlist: mock only Tauri APIs, side-effect services, DOM services; never stores or `.logic.ts` (`docs/TESTING.md:13-27`). A failing test that mocks away the real boundary does not count.

## Findings

Severity: **high** = a relay run would ship a wrong or broken fix with green checks, or stall, or a launch would happen on known-bad text. **medium** = a needed check is missing but backstopped, or criteria allow a weak test, or a series collision. **low** = wording, stale refs, harmless extras.

### H1 (high, all 12 queue Issues): every queue Issue is `ready-for-agent` while every refuter says run-after-edits

- What: all twelve refuter verdicts are `run-after-edits`, and several of the defects let a wrong fix pass (004 M1: a flush-only fix passes criterion 1; 062 M3: AC2 passes without the fix; 070: logic test passes while the user still sees nothing; 002 M2: a drop-filter breaks replace-all). The Issue files still say `**Status:** ready-for-agent` (004:15, 015:9, 062:9, 009:13, 070:11, 067:12, 068:11, 028:9, 003:9, 010:12, 012:12, 002:11) and the ledger rows are `todo` (`ledger.md:39-107`). Under the auto-launch rule these launch as written.
- Fix: before any launch, apply the refute edits (and the ones below) in one batched docs commit on main (batching also avoids the deliver-starvation pattern in memory `relay-deliver-starved-by-main-commits`), or set the Issues that need an owner answer (see "Owner decisions" below) to `needs-info` until answered.

### H2 (high, 003): the owner in-app checks as checkboxes will hold the review back

- What: refute-003 Must-fix 2 rewrites criteria 4-6 as `- [ ] Owner check in the app after delivery (not run by the agent ...)`. It is still a checkbox. No role can tick it, and the review rule above withholds APPROVED for an unmet criterion that deliver cannot check either. Result: CHANGES_REQUESTED, a fix round that cannot fix it, then a blocked or mis-ticked delivery.
- Evidence: review role text (`tasks-view-ux-248.js:36`); precedent of plain, non-checkbox bullets that relay leaves alone: 055's "Moved to Issue 158" lines (`055-*.md` criteria list), 004's "Historical" bullets (`004-*.md:63-69`).
- Fix: put the owner steps under a plain heading in Notes, "Owner check after delivery (not an acceptance criterion)", as plain `-` bullets, keep the 6-minute wait, and keep the config test (backgroundThrottling plus allow-hide, modeled on `src/tests/lib/architecture/fs-capabilities.test.ts`) as the real failing-first criterion. The existing `registerCloseHandler` tests mock `@tauri-apps/api/window` (`src/tests/lib/app/tauri-listeners.service.test.ts` mock list), so they prove only hide-versus-destroy, not that the hidden webview keeps running.

### H3 (high, 003 and 161; also 045 if it takes the Rust route): clippy is not in the relay checks, and 003's macOS-only arm cannot be caught locally

- What: relay runs `cargo test` only; CI runs `cargo clippy ... --all-targets --locked -- -D warnings` on ubuntu (`ci.yml:116`) after the merge. 003 adds a `#[cfg(target_os = "macos")] RunEvent::Reopen` arm (refute-003 Should-fix 2); any helper only that arm calls is dead code on Linux and fails `-D warnings`. Clippy run on this Mac compiles for macOS and will not see the Linux dead-code warning (inference: a Linux-target clippy here would need the Linux std target and the webkit2gtk sys libraries).
- Fix: in 003 and 161 add a criterion "`cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings` passes", and in 003 add "every item the Reopen arm uses carries the same `#[cfg(target_os = "macos")]`; the reviewer checks this by reading, since local clippy cannot see the Linux build". Do not launch 003 and 161 (or 045's Rust variant) at the same time: one cargo-heavy run at a time (memory `cargo-builds-throttled`).

### H4 (high, 094): the fatal-decode fix needs `fs:allow-read-file`, which the app does not grant, and vitest cannot see it

- What: `readTextFile` cannot decode fatally: plugin-fs 2.7.1 does `new TextDecoder(options?.encoding ?? 'utf-8').decode(bytes)` with no fatal flag (`node_modules/.pnpm/@tauri-apps+plugin-fs@2.7.1/.../dist-js/index.js:489-498`). The fix the validator endorses ("a fatal `TextDecoder` over the bytes", validate-s5+s6 094 row) needs `readFile`, which invokes `plugin:fs|read_file` (`index.js:466-475`). `src-tauri/capabilities/default.json` grants `fs:allow-read-text-file` (:66) and no `fs:allow-read-file` (identifier list :25-274). Every vitest file mocks `@tauri-apps/plugin-fs`, so the new tests pass while, in the app, every `openFileInEditor` call would fail with a permission error. That would break opening any note, in the core open path.
- Fix: make 094 `Blocked by: 038` (038 adds the permission on the vault roots, `ledger.md:75`), or fold the capability in and extend `fs-capabilities.test.ts` to assert `fs:allow-read-file` with the same scope as read-text-file. Either way `src-tauri/` changes, so the gate is "Both" (cargo test validates the capability at build). Add the missing Gate line (the Issue has none). See also the owner questions on 094 below.

### H5 (high for the image half, 039): the image test passes while image nodes still fail, for the same missing permission

- What: 039 criterion 1 asserts `resolveImageSrc('/vault/assets/pic.png')` calls `readFile` with the right path, in `canvas-image.service.test.ts`, which mocks `@tauri-apps/plugin-fs`. `readFile` is used only in `src/lib/features/canvas/canvas-image.service.ts:1,35`, and the capability is missing (H4 evidence). After 039 alone, image nodes still show a broken image in the app (validate-s1+s2, "Other points", 038/039). The file-node half (`readTextFile`) is real.
- Fix: run 038 first or in the same Issue, and add `Blocked by: 038` to 039, or narrow 039's title and criteria to file nodes and say images need 038. 039 also edits `CanvasInner.svelte`, so it runs after 004. Owner question: canvas bugs other than 004 are deferred in the brief; validate-s1+s2 says re-ask, validate-s5+s6 lists 039 as a confirmed addition. That conflict needs the owner.

### M1 (medium, cross-cutting): series groups miss real file overlaps, and the ledger encodes none of them

- What: the only enforced ordering is "Blocked by" (`ledger.md:30`); the "Run in series" list (`priority-2026-11-08.md:56-66`) is advisory, and auto-launch runs up to 3 at once. Overlaps not covered by any group or blocker (facts from the Issue texts and refutes):
  - `fs.service.ts` `duplicateItem` and `fs.service.test.ts`: 028 and 043 (043 What to build cites `fs.service.ts:345-365`; 028 is in the editor.service group, 043 in the RailNoteList group, so the list allows them in parallel). Also `path-change.service.ts`: 028 exports `saveDirtyTabsUnder`, 043 adds the prompt refresh to `applyPathChange`.
  - `link-updater.service.ts` and its test: 004 (refute-004 M3 hooks `updateTabAfterRenameOrMove`, `:93-109`) and 077 (self-link rewrite).
  - `tauri-listeners.service.ts` and `tauri-listeners.service.test.ts`: 003 (`registerCloseHandler`, `:48-65`) and 043 (criterion 3 in that test file).
  - `evaluator.ts`, `collection.logic.ts`, `collection-logic.test.ts`: 047 with 010, 067, 068 (047 is not a VE or VD Issue, so the RailNoteList group rule does not name it).
  - `CanvasInner.svelte`: 004 and 039.
  - live-preview `widgets.ts`: 061 part 2 with 062 (061 is not in the widgets.ts group).
  - 002 is listed in the properties group (`priority:60`) but touches `frontmatter-field.ts` and `live-preview.ts` (refute-002 S8).
- Fix: add `Blocked by` edges through `relay ledger` for the pairs that will both be queued (028 -> 043 or the reverse; 004 -> 077; 003 -> 043; 068 -> 047 or 010 -> 047; 004 -> 039; 062 -> 061), and fix the 002 group line. Or launch this queue strictly one at a time.

### M2 (medium, 002, 015, 004, 028, 042, 062, 068, 010, 067, 214): e2e is never run inside a relay run, so Issues that change e2e-pinned behavior must name the spec

- What: relay runs no e2e (see facts); only `main-checks.yml` does, after the merge to main. TESTING.md requires the matching spec for core areas (`docs/TESTING.md:146-164`: `core/editor/` -> `editor.spec.ts`; live preview -> the relevant `e2e/specs/live-preview/*.spec.ts`; rail-shell -> `rail-shell.spec.ts`).
  - **002 (must):** the fix makes `e2e/specs/live-preview/click-reveal/frontmatter.spec.ts:53-65` fail (it asserts ArrowUp lands on the hidden line, `:60-62`). The Gate line says check + vitest only (`002-*.md:15`) while AC says `bash scripts/e2e.sh e2e/specs/live-preview` (`:24`), the whole directory. Fix: Gate line "Frontend + E2E"; criterion: update that spec and run `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal/frontmatter.spec.ts` as a targeted check in build, report its result; the full live-preview directory is not needed.
  - **015 (should):** five specs auto-confirm the discard prompt (`tabs.spec.ts:74`, `tab-pinning.spec.ts:12`, `editor-empty-state.spec.ts:9` with the stale comment `:5-7`, `rail-shell.spec.ts:264` and `:856`, `file-operations.spec.ts:16`). After 015 a dirty close writes through the e2e fs mock (`e2e/mocks/tauri-fs.ts:8`) instead of discarding. Inference: they stay green, but nothing in the run checks it. Name `bash scripts/e2e.sh e2e/specs/editor.spec.ts e2e/specs/tabs.spec.ts e2e/specs/tab-pinning.spec.ts e2e/specs/editor-empty-state.spec.ts`.
  - **004 (should):** `e2e/specs/canvas-view.spec.ts` and `editor.spec.ts` (core/editor change).
  - **028 (should):** `rail-shell.spec.ts:232` exercises Duplicate from the row menu.
  - **042, 062, 068/010/067 (optional):** `quick-switcher.spec.ts`; `live-preview/tables.spec.ts`; `rail-list-toolbar.spec.ts:89`, `rail-shell.spec.ts:119,706` (DESC on `file.basename`, never null, so 068 should not move them), `collection-block.spec.ts`. These are low risk; name them only if the owner wants the run to catch it before main.
  - **214:** its failing-first tests are e2e only (`214-*.md:22-23`), so a relay run must run e2e or it cannot be red-first at all. Keep it out of relay unless the build is told to run those two specs.
- Fix: write the exact `bash scripts/e2e.sh <spec>` commands into the criteria of the "must" and "should" Issues, and say they run as targeted checks in build. One e2e run per checkout.

### M3 (medium, 043): criterion 3 cannot be written in the named file, and the fix reaches background moves the Issue wants throttled

- What (fact): `tauri-listeners.service.test.ts` mocks `#lib/core/filesystem/fs.service.js` (its `vi.mock` list), so "a rename followed by a vault-index-updated event" cannot run a real rename there. The prompt bypass already exists (`src/lib/app/tauri-listeners.service.ts:297-303`), so a version that calls `vaultStore.requestPromptIndexRefresh()` directly passes today and proves nothing new.
- What (fact): `applyPathChange` is reached by background writers too: auto-organize (`auto-organize.service.ts:4`, `:338` `moveItem`, `:473` `renameItem`) and vault mods (`mod-vault.service.ts:93`, `:100`). Requesting a prompt refresh inside `applyPathChange` therefore bypasses the throttle for them, against criterion 4 ("Background bursts ... still go through the throttle").
- Fix: mark criterion 3 as a guard that passes today, or drop it (criterion 1 in `fs.service.test.ts`, which uses the real `vaultStore`, proves the wiring). Decide where the request goes: at the user entry points (row menu, F2, Cmd+N, + New here), or in `applyPathChange` with auto-organize and mods accepted as one refresh per operation. Add a criterion for whichever is chosen. This touches core `path-change.service.ts`, so the indexing rules file applies (relay rule `config.json` last entry).

### M4 (medium, 061): one Issue, three fixes; only part 2 is a confirmed addition

- What: 061 bundles F101 (fence info string), F92 (checkbox button guard) and F121 (TSV paste context). validate-s3+s4 confirms only part 2 and defers part 1 (medium risk, `SPECIAL_LANGUAGES` keying) and part 3 (second pass, wrong trigger premise). The first criterion requires moving all three repro describes (`061-*.md` criteria list, first item), so a relay run implements all three, including the medium-risk ones.
- Fix: split. New 061 scope is part 2 only: the guard line in `widgets.ts:41-47` plus the two checkbox criteria (button 1/2 leave the doc unchanged; macOS Ctrl+click unchanged; plain click still toggles), with the F92 describe moved from the archived repro file. Parts 1 and 3 become their own Issues. Run after 062 (same `widgets.ts`). Drop `pnpm build` from its Gate (no dependency change).

### M5 (medium, 070): the planned logic test is green-while-broken, and the test flip has no real approval

- What: refute-070 shows the caller has no try/catch (`TypesNavigator.svelte:161-187`) and `IconPicker` does not await it, so a throw from the logic alone still shows the user nothing; only the TypesNavigator component test proves the fix. `TypesNavigator.test.ts` mocks `type-definitions.service.js` but keeps the real `ViewWriteError` through `importOriginal` (`TypesNavigator.test.ts:25-36`), so the proposed component test is writable as specified (fact). The refute's replacement text says the flip of `type-sidebar.logic.test.ts:886-892` is "owner-approved by this Issue". That is the Issue granting itself approval; the owner's rule needs the owner's own approval to change a check.
- Fix: make the TypesNavigator test the first failing criterion. Get the owner's one-line approval for flipping `:886-892` and for dropping the "refresh promptly" half (it changes the title and scope), and record it under Comments as 068 does.

### M6 (medium, 067): pinned-test rewrite has no recorded approval; Blocked-by contradicts the queue

- What: `collection-logic.test.ts:669-680` pins the literal-key behavior (refute-067 M2); 067 has no owner Comment approving the rewrite (068 has one). `Blocked by: 010` (`067-*.md:10`, `ledger.md:104`) while the queue runs 067 before 010. The `archived` criterion passes today; the `type` sort test passes in red unless the input is unsorted and goes through `executeQuery` (refute-067 Should-fix 1-2).
- Fix: owner approval in Comments; blocker changed through `relay ledger`; the two test wordings from refute-067.

### M7 (medium, 004): the merged Issue 49 section can mislead the reviewer

- What: `004-*.md` carries a second `**Status:** needs-triage` (`:39`) and the line "Flush a pending canvas persist before `closeTab` runs its dirty check, so a Cmd+W inside the 300 ms window either prompts or saves" (`:55`), plus a Historical bullet with the same "either prompts or saves" (`:66`). That accepts exactly the flush-only fix refute-004 M1 rejects. Relay's `review-ticks` sets only the first Status line: 030, delivered by relay, still has `**Status:** needs-triage` at `030-*.md:49` beside `resolved` at `:15` (fact).
- Fix: add a line above the merged section: "Context only, superseded by the criteria above: a close saves and does not prompt (Issue 015 owner decision)", and delete its Status line.

### M8 (medium, 010): not one relay run as written

- What: the count half touches the filter hot loop, `QueryResult`, `ViewQueryResult`/`ResolvedLens`, three UI surfaces and the inline block (live-preview rule 2), with no defined counting rule (refute-010 Must-fix 1). The validator half also changes the documented stable mod API (`help/documentation/mods/13-api-reference.md:136`, `10-querying-the-index.md:17`) and Auto Organize refusals.
- Fix: split the count into a `needs-info` Issue (refute-010 preferred edit). Before launching the validator half, the owner confirms that mod `query.*` calls with an unknown method may start rejecting (the owner's mods live outside the repo and were not checked). Fact checked here: no `.view` under `help/`, `e2e/` or `src/tests/fixtures/` calls a method missing from the registry (methods found: `endsWith`, `hasTag`, `hasProperty`, `format`, `title`, `relative`, `join`, all present in `methods.logic.ts`), so the shipped examples do not break.

### M9 (medium, 047): the evaluator change reaches a file-moving path with no test there

- What: `auto-organize.logic.ts:17` imports the same evaluator (validate-s1+s2, 047 row), so `<`/`>` rules that move files change which notes match. 047's criteria cover only `evaluator.test.ts` and `collection-logic.test.ts`.
- Fix: add a criterion in the auto-organize logic tests: a rule `priority < 3` does not match a note without `priority`. Put 047 in series with 010/067/068 (M1).

### M10 (medium, 161): one criterion cannot pass as written

- What: the tokenizer folds diacritics (`src-tauri/src/db/schema.rs:13`, `remove_diacritics 2`) while the query term is only lowercased (`fuzzy.rs:52`), so "A first letter outside ASCII (e.g. 'é') still finds its close matches" (`161-*.md:14`) fails after a correct range fix (validate-s7+s8; the folding behavior is from memory there). The range rewrite also depends on fts5vocab accepting range constraints on `term`, which was not checked in source.
- Fix: fold the query term the same way before building the range and say so, or change the example to an unaccented non-ASCII letter. Add clippy (H3).

### L1 (low, 004, 042, 039, 098, 061, 214): `pnpm build` in criteria that relay never runs

- What: CLAUDE.md rule 6 needs `pnpm build` only for dependency changes; TESTING.md `:198-204` still lists it for every frontend change (doc conflict). Relay does not run it; CI's frontend job does (`ci.yml:84`) after the merge. A criterion "pnpm build passes" is either ticked unrun or argued over in review.
- Fix: drop it from the checkboxes of Issues with no dependency change (keep it in the Gate line as "CI runs it" if wanted).

### L2 (low, 045): two Issues in one file, and the test location is left to the agent

- What: `045-*.md` has a merged second Issue with its own four criteria (`:21-28`), and criterion `:16` says "in search_fts_test.rs if Rust applies the filter, or in search.service.test.ts if the frontend widens the candidate list". Gate says "Both".
- Fix: pick the frontend variant (validate-s1+s2 rates it S, low), set Gate to frontend, and name the one test file. Second tier, so this can wait.

### L3 (low, 077): the toast criterion needs a mock the file does not have

- What: `link-updater.service.test.ts` mocks `debug.js`, `@tauri-apps/api/core` and `plugin-fs` only. Criterion 5 asserts a toast, so `svelte-sonner` must be mocked (allowed as a DOM service). Run after 004 (M1).
- Fix: say so in the criterion.

## Per-Issue table

"Red-first real" = the named failing test fails today through real code with only allowed mocks, after the refute edits. "Extra checks" = what the Issue must name because relay will not run it.

| Issue | Red-first real? | Mocks per TESTING.md | Extra checks to name | One relay run? | Owner decision before launch |
|---|---|---|---|---|---|
| 004 | Only with refute M1 (tab gone, `ask` not called); as written a flush-only fix passes | Yes (Tauri only; add `plugin-dialog` mock) | `canvas-view.spec.ts`, `editor.spec.ts` (M2) | Yes (S) | No (015 decision settles save-not-prompt); fix M7 text |
| 015 | Yes; rewrite of 3 pinned tests needed (refute M2) | Yes; set `writeTextFile` and `ask` per test (refute S4) | e2e tabs/editor specs (M2) | Yes, after 004 | Recorded 2026-11-06; delete the stale "owner confirms" sentence |
| 062 | AC1 yes; AC2 only via parent-spy rewrite (refute M3) | Yes (pure + jsdom widget) | optional `live-preview/tables.spec.ts` | Yes (M) after M1-M5 spec edits | Optional: confirm `***x***` reversal of `inline-markdown.test.ts:97-103` |
| 009 | Yes for the railed-view cases; others are guards (refute S1) | Yes (pure, real stores in view-writes test) | none | Yes (S) | No |
| 070 | Logic test green-while-broken; component test required (M5) | Yes | none | Yes (S) after rescope | Yes: approve test flip `:886-892` and dropping the refresh half |
| 067 | Yes for `note.`/`property.`/`type`; `archived` is a guard | Yes | none | Yes (S) | Yes: approve rewriting `collection-logic.test.ts:669-680`; blocker change |
| 068 | Yes (rewritten DESC test, limit case) | Yes (pure) | none | Yes (S) | Recorded; fix the wrong line cite |
| 028 | Only in a new disk-backed file (refute M1); not observable in `fs.service.test.ts` | Yes in the f165 pattern | `rail-shell.spec.ts` Duplicate (M2) | Yes (S) | No |
| 003 | Yes via config test (backgroundThrottling + allow-hide); listener tests are mocks | Yes | cargo test (relay runs it), clippy (H3) | Yes (S), owner check outside the run (H2) | No (2026-11-06 decision stands) |
| 010 | Validator half yes; count half undefined | Yes | none | Only the validator half (M8) | Yes: split the count; accept mod `query.*` rejection |
| 012 | Yes with open-menu-scoped query and Escape (refute M3) | Yes; existing delete tests need `ask` true | none | Yes (S) | No |
| 002 | Yes in jsdom for doc-level cases; ArrowUp only in e2e | Yes (real EditorView) | `frontmatter.spec.ts` must change and run (M2) | Yes (S-M) | Yes: Cmd+A selects body only (refute M3), or accept that default |
| 014 | Yes (real stores, invoke mocked) | Yes | none | Yes (S) | No |
| 042 | Yes (keydown Enter through bits-ui in jsdom) | Yes (`openFileInEditor` side-effect mock) | optional `quick-switcher.spec.ts` | Yes (S) | No |
| 043 | Criterion 1 yes; criterion 3 not writable / green today (M3) | Yes | `rail-shell.spec.ts`, `file-operations.spec.ts` per TESTING.md | Yes (S-M) | Yes: where the prompt request goes (user entry points vs `applyPathChange`) |
| 047 | Yes | Yes | none | Yes (S) | No; add auto-organize test (M9) |
| 061 | Part 2 yes | Yes | none | Only after split (M4) | No for part 2 |
| 064 | Yes (new jsdom file) | Yes | none | Yes (S) | No |
| 055 | Yes (pure logic) | Yes | none | Yes (S) | Recorded 2026-11-06 |
| 039 | File half yes; image half green-while-broken (H5) | Yes, but the mock hides the ACL | cargo test if the capability is folded in | Yes (S) with 038 | Yes: canvas deferral conflict between validators |
| 077 | Yes (pure) plus service self-link case | Yes; add `svelte-sonner` mock | none | Yes (S-M) | No |
| 094 | Tests would pass while the app breaks (H4) | Mocks hide the missing permission | cargo test, capability test | Only with 038 | Yes: refuse vs read-only (`094-*.md:41`), and the owner's "no core changes for corner cases" rule applies (bucket 4-corner, core open path) |
| 161 | Yes for the 600-word case; 'é' case cannot pass (M10) | n/a (Rust) | clippy (H3) | Yes (S) | No |
| 045 | Yes | Yes | cargo only if the Rust route | Yes after L2 | No |
| 098, 230, 141, 139, 013, 214 | per validators | per validators | 214: its two e2e specs | Yes | Yes: usage questions (link(), linear calendar, `!= true`, `.view` tables), 013 deferred re-ask, 214 optional rider |

## Owner decisions to collect before launch

1. 002: Cmd+A and menu Select All select the body only in live preview (copy leaves out the properties), or keep copying properties (then 002 goes to needs-info).
2. 010: split the per-note count into a needs-info Issue; accept that vault mods calling `query.*` with an unknown method start rejecting.
3. 067: approval to rewrite `collection-logic.test.ts:669-680`; change `Blocked by: 010` to none.
4. 070: approval to flip `type-sidebar.logic.test.ts:886-892` and to drop the refresh half.
5. 043: prompt refresh at the user entry points only, or in `applyPathChange` including auto-organize and mods.
6. 094: whether to do it at all under the corner-case rule; if yes, refuse with a toast or open read-only, and run 038 first.
7. 039 (with 038, 026): canvas is deferred except 004 in the brief; validators disagree. Re-ask.
8. Conditional usage questions already raised by the validators: 098 (`link()` in views), 230 (linear calendar), 141 (`!= true` in views), 139 (`.view` tables), 081 and 025 (vault greps), 013 (deferred .view filter bug).

No new owner decision is needed for 004, 015, 062 (optional `***x***` confirm), 009, 068, 028, 003, 012, 014, 042, 047, 061 part 2, 064, 055, 077, 161, 045.

## Not verified

- Nothing was executed. Every "fails today" and "passes today" above comes from reading code and the refutes.
- Whether a relay build agent runs an e2e spec it edits is inferred from the role text ("test files of every file you touched"); the role text also says the prompt, not CLAUDE.md, decides which tests run.
- How `review-ticks` treats an unticked criterion when setting `Status: resolved` was inferred from the review rule and the 030 precedent, not from the relay CLI source (outside the repo).
- That Linux-only dead code is invisible to clippy on this Mac is inference; no Linux target was tried.
- That the e2e specs that auto-confirm the discard prompt stay green after 015 is inference.
