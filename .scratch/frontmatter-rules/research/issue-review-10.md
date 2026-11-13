# Adversarial review: Issue 10 (a rule can run a mod action)

Read-only review against main at 17892c5ed. Post-06 names map to today's `features/auto-move/` files. Owner decisions in the Issue's Notes (`{ notePath }` argument, loops documented only, manifest opt-in, registry in `core/`) are not reopened; every fix below keeps them.

## Findings

### 1. data-loss: Behavior 6 documents the wrong loop condition (Issue line 25)

The Issue says the loop needs an `always` rule on the same key. It does not. `ctx.vault.write` has no equality guard and runs the Auto Move check on every write, identical text included (`help/documentation/mods/04-vault-files.md`, `write` step 5, "There is no equality guard", and the "What each write updates" table; `help/documentation/28-mods.md:180`). The debounce is 3000 ms (`src/lib/core/settings/settings.store.svelte.ts:112`). The action does not change the filter's inputs, so the rule still matches: an action that writes the matched note re-invokes itself about every 3 s for as long as the app is open. An action that appends (a log line, an LLM summary) grows the note without bound. The only thing that breaks the cycle is the busy check (`src/lib/plugins/mods/mods-host.service.ts:336-339`), and only when the run is still live when the timer fires.

**Minimal fix (still documented, not prevented):** replace Behavior 6 with: "An action that writes the matched note runs again after each of its writes, as long as the note still matches. The help pages (`22-auto-organize.md`, `28-mods.md`, `mods/14-cookbook.md`) say so and give the fix: the action sets a marker property and the rule's filter excludes it (for example `ai_done != true`), or the action skips identical writes (`upsertNote`). With an `always` rule on the same key, the rule and the action also fight." Add to Acceptance: "A fake action that writes the note schedules one more evaluation of that note." This test pins the documented behavior.

### 2. spec-error: Behavior 4 does not say the action runs outside the skip set (Issue line 19)

"After the move and the property writes" can be read as inside the write phase. That phase holds the note's path in `writingPaths` (`src/lib/features/auto-move/auto-move.service.ts:257-267`), and the observer drops saves for those paths (`:128`). If the action is awaited inside that `try`:

- the mod's own writes are dropped, so Behavior 6 and the help text describe a loop that cannot happen;
- the path stays in the set for the whole action, which can be an LLM call that runs for minutes, so the user's own saves of that note run no rules during that time.

It also conflicts with PRD Decision 6 (`PRD.md:18`), which calls the skip set "the whole loop protection" for "the run's own writes". The Issue never says whether a mod action's writes count as the run's own writes.

The early return `if (!rule?.icon && owned.length === 0) return;` (`auto-move.service.ts:255`) also has to stop skipping a rule whose only consequence is `runAction`.

**Minimal fix:** in Behavior 4, add: "The action is invoked after the `finally` that releases the skip set (Issue 01, Behavior 9). Its saves are ordinary saves and are not 'the run's own writes' of PRD Decision 6." The acceptance test from finding 1 covers it.

### 3. data-loss / contradiction: PRD Decision 10 gates are not applied to the action (Issue line 19)

Today the gates (not Markdown, `_system`, templates folder, type definition, unsafe frontmatter) are checked only inside the property writer (`auto-move.service.ts:306-313`, `propertyWriteSkipReason` at `auto-move.logic.ts:251-269`). Matching runs for any after-saved file except `.view` (`auto-move.service.ts:129`; `mods/04-vault-files.md` table, "Auto Move evaluation: yes (any file but `.view`)"). Behavior 4 places no gate on the action, so a broad rule would pass these paths to a mod:

- a template;
- a type definition note;
- a `_system` note;
- a mod's own `Data/state.json`.

A mod that writes the path it gets then rewrites a template, which stamps every note created from it afterwards. That breaks PRD Decision 10 ("Never written by a rule", `PRD.md:22-27`).

**Minimal fix:** in Behavior 4, add: "The action is invoked only when `propertyWriteSkipReason` returns null for the note's final path (the PRD Decision 10 gates)." Add to Acceptance: "A matching note in the templates folder does not invoke the action."

### 4. spec-error: Behavior 2's opt-in place does not exist (Issue line 14)

`manifest.json` declares no actions. `ModManifest` has only `id`, `name`, `version`, `description`, `author`, `minAppVersion` and `color` (`src/lib/plugins/mods/mods.logic.ts:138-153`), and `parseModManifest` drops unknown keys (`:198-210`). Actions are registered at runtime by `ctx.addAction` inside `onload` (`mods-host.service.ts:472-512`), so "on that action in `manifest.json`" cannot be written. The fallback, "the equivalent field where actions are declared today (read the contract, `src/lib/plugins/mods/contract/mod-api.v1.ts`)", points at a two-line type re-export (`contract/mod-api.v1.ts:1-2`). A field on `ModActionV1` would also replace the owner's settled "manifest opt-in" decision.

**Minimal fix:** "`manifest.json` gets an optional `"ruleActions": ["<action id>", ...]`, with the mod's local action ids, validated by `parseModManifest` as a list of strings. Settings offers the actions that are both listed there and registered by the loaded mod." Delete the "or the equivalent field ..." clause. This needs no change to the mod contract.

### 5. spec-error: Behavior 3 gives the wrong path kind (Issue line 15)

The whole mod API takes vault-relative paths:

- `assertVaultPath` rejects a leading `/` (an empty first segment, `mods.logic.ts:69-73`);
- `run.target.path` is vault-relative (`node_modules/@kokobrain/mod-core/src/contract/mod-api.v1.ts:52-58`);
- `onNoteSaved` passes vault-relative paths (`help/documentation/28-mods.md:172`, `mods-host.service.ts:556`).

With an absolute `notePath`, the obvious `ctx.vault.read(notePath)` or `ctx.vault.write(notePath, ...)` throws `Invalid vault path`. The owner decided on a `{ notePath }` argument, not on absolute paths.

**Minimal fix:** "the vault-relative path of the matched note at the end of the run", in Behavior 3 and in the first Acceptance item.

### 6. spec-error: Behavior 3's contract steps and the Gate are wrong (Issue lines 9, 15-18; missing blocker on line 5)

- **No version bump.** "Bump the contract as ADR 0036 requires" is the opposite of the ADR: an additive change to contract v1 gets "no `apiVersion` bump" (`docs/adr/0036-vault-mods-trust-loader-storage.md:13`; contract header, `mod-api.v1.ts:15-16`). Bumping `apiVersion` (`mods-host.service.ts:453`) would change `ctx.apiVersion` for every existing mod.
- **The change is in another repository.** Passing a third argument means changing `ModActionV1.run` (contract line 103, `(input: string, run: ModRunV1) => unknown`), or the host call does not type-check. That contract lives in the private repo `diegorv/koko.brain-mods` (`docs/MOD-CORE.md:3`). The update steps (`docs/MOD-CORE.md:38-47`) are: commit and push there, re-pin the SHA in `package.json:81` and `pnpm-lock.yaml`, then run `pnpm build`. Changing `package.json` or the lockfile also requires `pnpm build` (CLAUDE.md rule 6).
- **Missing prerequisite.** A relay build in this repo's worktree cannot produce the mod-core commit, and the Issue does not list it as a prerequisite.

**Minimal fix:**

- Behavior 3: "Additive to contract v1, with no `apiVersion` bump: `ModActionV1.run` gets an optional third parameter `context?: { notePath: string }` in the canonical contract (`diegorv/koko.brain-mods`), adopted by SHA as described in `docs/MOD-CORE.md`. Amend ADR 0036 with a dated amendment."
- Gate: "`pnpm check` + `pnpm vitest run` + `pnpm build` (the lockfile changes)."
- Blocked by: "09, and the mod-core commit with the new `run` parameter (pushed by the owner; its SHA goes in Notes)."

### 7. contradiction: the PRD says nothing goes into `core/` (Issue line 20)

PRD line 5: "Nothing new is added to `core/`." Behavior 5 adds a registry in `core/`. The owner settled this for Issue 10, but the two texts now disagree.

**Minimal fix:** one line in Notes: "The `core/` registry supersedes PRD line 5, which scoped the MVP only."

### 8. contradiction: Issue 11 leaves the action out of its run order (Issue lines 15 and 19)

Issue 11 sets the run order to "rename first, then move, then write the properties at the final path" (`11-rule-action-rename-note.md:22`) and does not place the action. Issue 10 Behavior 3 says the path is the one "after the run's move", which becomes wrong once a rename runs.

**Minimal fix:**

- Issue 10, Behavior 3: "the note's final path in the run (after the move, and after Issue 11's rename once it lands)".
- Issue 11, Behavior 2: append "then the mod action (Issue 10), with the final path".

## Not blocking

- A rule-enabled action that declares `input` would open the picker's text field at save time if the runner goes through `openPicker` (`mods-host.service.ts:444-449`). Say that the runner calls the action with `''`, the lazy way, without the picker.
- "The host wrapper already handles" a busy action, but when busy it also opens the live run view (`mods-host.service.ts:336-339`, `modPickerStore.showRun`) during typing, and it drops the second note's call without a log.
- A failing action shows a toast on every save that matches (`mods-host.service.ts:420`), while PRD Decision 9 keeps rule errors out of toasts. One line should say which applies.
- `registerTypeIconLookup` is a plain slot in `features/file-icons/icon-resolver.ts:19-31`, not in `core/`. Settings needs a reactive action list (`$state.raw`, like `mod-commands.store.svelte.ts:14`) to update when a mod loads late. The rule-row select must keep showing a saved id that is not listed right now.
- When the first matching rule with `runAction` names a disabled or missing action, the Issue does not say whether a later rule's action runs instead.

## Tried and could not refute

- The id format `mod:<mod>:action:<action>` (`mod-commands.store.svelte.ts:4`, `actionKey` at `mods-host.service.ts:147`).
- The layering: `features -> core` and `plugins -> core` add no entry to `layer-baseline.json`, which holds only three `utils -> core` lines (`src/tests/lib/architecture/layer-baseline.json:2-4`).
- The final path is available (`targetPath`, `auto-move.service.ts:221,250`), and a failed move returns before any write (`:247,249`), consistent with PRD Decision 9.
- One live run per action (`mods-host.service.ts:336-339`; contract `ModActionV1` doc).
- A mod written for the old API keeps type-checking: a function with fewer parameters can be assigned to a function-typed member with an optional third parameter, so Acceptance item 4 can be written.
- The first Acceptance test fails today: there is no `runAction` field and no invocation path.
- The help files named exist: `help/documentation/28-mods.md`, `mods/13-api-reference.md`, `mods/14-cookbook.md`, and `22-auto-move.md`, which becomes `22-auto-organize.md` after Issue 06.
- "None of the owner's mods uses `onNoteSaved`": not checkable, because the mods source is outside the repo. It does not change any Behavior.
