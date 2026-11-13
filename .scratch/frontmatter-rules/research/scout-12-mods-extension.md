# Scout 12: the vault mods system and the frontmatter-rules feature

Scope: ADR-0036, `help/documentation/28-mods.md` and `help/documentation/mods/*`, `src/lib/plugins/mods/*`. Read-only; nothing was run. Everything is read at HEAD (`2e2cc5b60`). Two things were NOT verified: the 12 real mods live in `~/kokobrain-vaults/kokobrain-mods-src` (outside the working directory, not read, so whether one of them already does rule-like stamping is unknown), and the private `@kokobrain/mod-core` contract source (only its re-export and the docs were read).

## 1. Summary for the design

1. A mod can already do "when a note saves, set or fill a frontmatter property" today. The cookbook ships it as recipe 20 (`help/documentation/mods/14-cookbook.md:2568-2653`), built on `ctx.onNoteSaved` + `ctx.app.updateNoteFrontmatter`. "Fill only if missing" vs "always set" is a one-line difference inside `mutate`. Icons and colors are plain frontmatter keys (`_icon`, `_color`, `_title_color`), so the same call covers them, with no icon-specific API needed (the mod host has no `setIconForPath`; `MOD_APP` is listed at `mod-app.service.ts:26-68`).
2. A mod cannot reach the Collection expression engine. `MOD_APP` (`mod-app.service.ts:26-68`) has no `evaluateExpression`/`parse`, mods have no `import` (`28-mods.md:711`), and `KBAPI` has no expression surface (grep for "expression" in `kb-api.ts` returned nothing). A mod's rule is a JavaScript predicate, not a rule on the existing engine. This alone rules out "mod" as the answer to the owner's strong preference for ONE engine, unless the host exposes the engine.
3. A mod cannot get three of the four triggers the owner wants. Only "on save" exists. There is no create, move or rename hook (`07-events-and-reactivity.md:195`: `ctx.vault.create/rename/move/delete` do not fire `onNoteSaved`; external edits do not either, line 197), and the callback receives only the vault-relative path: no content, no previous content (`:179`). "On property change" can only be approximated by on-save, which for a properties-panel edit fires about 500 ms later (`:185`).
4. The caret blocker (`.scratch/open-itens/issues/001-...`) is already a documented, known app bug that mods work around by skipping the active note (`09-raw-app.md:676-683`, cookbook recipe 20 lines 2625-2628, 2650). A built-in feature must either fix it at the shared service (`updateNoteFrontmatter` is the single write path for both mods and the app) or accept the same "skip the active note until the user leaves it" limit. Fixing it once at the service benefits both.
5. A built-in feature gives what a mod structurally cannot: a Settings section (mods have only `ctx.ui` dialogs or hand-built DOM, `08-custom-ui.md:1-20`), on-by-default reliability (mods are off by default, per vault, per machine), synchronous observer position, visible errors, and the ability to add trigger hooks in core.
6. Recommendation (details in section 7): build it as a built-in feature on the shared engine; do NOT make "mod-contributed actions" part of v1; optionally expose the new trigger bus (and later a read-only rule evaluation helper) to mods as an additive, later change. Until the feature exists, recipe 20 is a valid interim stopgap for one hard-coded rule.

## 2. What a mod can do today toward this feature

| Needed | Mod capability today | Evidence |
|---|---|---|
| React to a note save | `ctx.onNoteSaved(cb)`, cb gets vault-relative path, runs in `setTimeout(0)` after the sync observer fan-out | `mods-host.service.ts:554-579`; guide `28-mods.md:170-180` |
| Read the saved note | `ctx.vault.read(path)` or the open tab content via `ctx.app.editorStore`; `ctx.kb()` for index records (lags up to ~2 s, 10 s in a burst for tasks/tags/links; frontmatter is current at once after a save) | `mod-vault.service.ts:79-82`; `28-mods.md:541-546` |
| Evaluate a condition | Any JavaScript, including QueryJS-style predicates over `kb.pages()`; NOT the Collection expression language | `mod-app.service.ts:80-94`; section 1 point 2 |
| Write frontmatter | `ctx.app.updateNoteFrontmatter(abs, mutate)`: open tab patched and saved at once, closed note read-written-then-`notifyAfterSave`; refuses lossy YAML (comments, nested maps, anchors, duplicate keys) with a typed `reason` | `mod-app.service.ts:49-53`; `frontmatter-write.service.ts:97-130, 161`; `09-raw-app.md:591-615` |
| "Fill if missing" / "always set" per property | Trivial inside `mutate` (find the key, branch). Nothing reverts, because a mod only writes when it runs | cookbook recipe 20, `14-cookbook.md:2605-2611` |
| Set icon / color | Write `_icon`, `_color`, `_title_color` as frontmatter properties through the same call | key names per the task brief (`frontmatter-icon.service.ts`); no icon API in `MOD_APP` |
| Create / move / rename trigger | None. The guide's own recipe 15 admits "Creating, renaming, moving or deleting a note is not a save: rebuild by hand after those" | `14-cookbook.md:2115, 2136`; `07-events-and-reactivity.md:195` |
| Property-change trigger (panel or YAML edit) | Only through the save it causes (autosave 500 ms after a frontmatter edit, 2 s / 10 s max for body typing); no diff, so the mod must keep its own last-seen snapshot | `07-events-and-reactivity.md:185, 179` |
| Loop safety | The mod's job. `ctx.vault.write` has no equality guard; `updateNoteFrontmatter` skips only when rebuilt text equals the file byte for byte, so a mod throws a sentinel from `mutate` to skip the write | `28-mods.md:180`; `07-events-and-reactivity.md:224-232`; `frontmatter-write.service.ts:128-129` |
| Persist rules | `ctx.loadData/saveData` to `<vault>/.kokobrain/mods/<id>/data.json` (atomic, FIFO per instance, corrupt file moved aside). Editing: only through `ctx.ui` dialogs or a custom DOM dialog | ADR-0036 amendment lines 9-25; `mod-vault.service.ts:149-225` |

Reentrancy facts a rules mod must handle (all verified):

- The mod's own write re-enters `notifyAfterSave` (`mod-vault.service.ts:135`, `frontmatter-write.service.ts:161`), which re-fires every observer, including the mod's own `onNoteSaved` and Auto Move's observer. Recipe 20 breaks the loop by comparing the value (`14-cookbook.md:2648`).
- A mod that stamps a note after Auto Move has moved it writes to the old path and fails quietly in the log (`14-cookbook.md:2653`). A built-in rule core that shares a note identity with Auto Move would not have this hole if it resolves the path at write time.
- Mod callbacks run in a `setTimeout(0)` AFTER all synchronous observers (`mods-host.service.ts:562-572`). Auto Move's observer debounces per path with a 3000 ms default (per scout-06, citing `auto-move.service.ts:96-126`; I did not re-read that file). So a mod fill lands first, and its write re-enters the observers; Auto Move's debounce timer is reset by that save (also per scout-06), which means Auto Move would see the filled properties. This ordering is a consequence of timers, not a contract, and a built-in feature should not copy it implicitly.

## 3. What a mod structurally cannot do (gaps a built-in closes)

1. **Triggers.** No create/move/rename/property-change hook, and `onNoteSaved` has no old content (section 2). A built-in feature can add real hooks in core (`editor.hooks.ts`, `fs.service`, `note-creator`) once; a mod can only poll with `ctx.watch` over stores, which costs per-change work on the main thread (`28-mods.md:168`).
2. **The one engine.** The expression engine is not exposed (section 1 point 2). To share it, the host must add it to `MOD_APP` (one line per `mod-app.service.ts:23-25`), which is feasible layer-wise: `plugins/mods` already imports `features/collection` (`mod-app.service.ts:9`) and `plugins -> features` is the allowed direction (`CLAUDE.md` layer table; the reverse, a feature importing `plugins/mods`, would be a new baseline violation per `layer-rules.test.ts:125-126`). But `ctx.app` is explicitly "no compatibility promise" (`28-mods.md:514`), so a rule mod built on it can break on any refactor of the engine.
3. **Settings UI.** Auto Move has `AutoMoveSection.svelte`/`AutoMoveRuleRow.svelte` and `settingsStore.autoMove` (`settings.store.svelte.ts:110-113, 179, 303-308`). A mod gets alert, confirm, prompt, pick and loading dialogs, or its own DOM (`08-custom-ui.md`); Labs lists status only. A rule editor with expression validation (`validateExpression`, `auto-move.logic.ts:87`) per action would be a hand-built dialog in a mod.
4. **Reliability.**
   - Mods are off by default and the flag is per vault AND per machine in `localStorage` (`mods-enabled.store.svelte.ts:12-19, 48-51`); a moved or renamed vault turns them off (ADR-0036 line 60). A rule that silently stops applying on a second machine, or after the vault is moved, is a bad failure mode for "things change right away".
   - Start is deferred: `startModsHost` runs in a `setTimeout(0)` after the vault open path (`app-lifecycle.service.ts:539-545`), so saves before the host is up are missed.
   - A save while the vault switches or the app quits may never reach the callback (`07-events-and-reactivity.md:186`).
   - Errors in a callback go only to the debug log, no toast, never Sentry (`07-events-and-reactivity.md:222`; `28-mods.md:656`); a broken rule is invisible. A built-in feature can surface errors in the UI and Sentry per project rules.
   - A synchronous infinite loop in mod code freezes the app and Stop cannot end it (ADR-0036 line 57); an engine-evaluated expression cannot loop forever because it is not arbitrary JS (not verified for every evaluator method; scout-01 owns that).
   - Mods are evaluated with `new Function` under full trust (ADR-0036 line 41); fine while only the owner writes them.
5. **Rule storage that travels with the vault.** Mod data lives in `.kokobrain/mods/<id>/data.json`, which the owner's vault ignores in git, so it has no history (ADR-0036 lines 22, accepted by the owner for Habits). Settings (`.kokobrain/settings.json`, ADR-0019 per ADR-0036 line 34) sit in the same folder, so this is not a differentiator against the settings route; it only matters if the design instead stores rules as a vault note.
6. **Test and doc coverage.** Mods have a conformance test against the contract (`src/tests/lib/plugins/mods/mod-api-contract.test.ts`, per `docs/MOD-CORE.md`); user rule logic written in a mod has none, while a `.logic.ts` rule core falls under the project's test rules.

## 4. Should the rule engine be exposed to mods (mods contributing actions)?

Two different ideas, with different answers.

**A. Mods contributing action types to the rule feature** (a mod registers "set icon from emoji map", the rule UI offers it). Not recommended for v1:

- The Settings UI would have to render config for an action it does not know, so each action needs a config schema plus an editor; no such seam exists in the app or the contract.
- A rule referencing a mod action is only valid on machines where mods are on and that mod is loaded (the flag is machine-local, section 3.4), so the same vault would behave differently per machine. This contradicts "things change right away".
- It adds the very duplicated rule machinery the owner wants to avoid (a registry, lifecycle of registration, failure handling), and it would sit on the unstable surface (`ctx.app`, `28-mods.md:514`) or need an additive contract v1 member (that means a commit in the private mods repo plus a SHA bump, `docs/MOD-CORE.md` § Updating the dependency, steps 1-6).
- v1 actions the owner named are all frontmatter writes (property, icon, color). A fixed built-in action set covers them with no extension seam.

**B. The new feature's trigger bus and/or evaluation helper exposed to mods** (e.g. an additive `ctx.onNoteChanged(cb)` with `{ path, kind: 'save' | 'create' | 'move' | 'rename' | 'property-change' }`). This is useful and low risk, but only after the core hook exists. It would close exactly the mod gaps in section 3.1, and the contract precedent for additive change without an `apiVersion` bump is the `loadData/saveData` amendment (ADR-0036 line 13). A read-only `evaluateExpression(expr, record)` on `MOD_APP` is the one-line option for sharing the engine, with the stability caveat above. Recommend: not in the first Issue; revisit once the trigger bus exists, and only if the owner has a concrete mod that needs it.

## 5. Mod route versus built-in feature versus Auto Move, as seen from mods

| Option | Engine | Triggers | UI | Reliability | Verdict from this scout |
|---|---|---|---|---|---|
| Rules as a mod (recipe 20 style) | JS predicates, not the Collection engine | save only | dialogs only | machine-local on/off flag, silent errors | Fine as a stopgap for one hard-coded rule; fails the "one engine" and trigger requirements |
| Mod that gets the engine through `MOD_APP` | Shared, but via an unstable seam | save only unless core adds hooks | dialogs only | same as above | Keeps the worst of both: still needs core hook work, still no Settings UI |
| Built-in feature (separate or shared core with Auto Move) | Shared | whatever core hooks are added | Settings section | on by setting, in-vault settings, visible errors | Matches the owner's requirements; the mod system is not on the critical path |

Whichever of "extend Auto Move", "separate feature" or "shared rule core" is chosen, the mods system needs no change for it to ship. Mods already coexist with it: a mod's `ctx.app.updateNoteFrontmatter` write fires the same after-save path, so Auto Move and any new rules observer will see a mod's writes, and the mod will see theirs. That is a loop surface for a mod author, documented in the guide.

## 6. Constraints a design must respect (from this area)

1. **One write path.** Both mods and the app write frontmatter through `updateNoteFrontmatter` (`frontmatter-write.service.ts:97-130`). It is documented as requiring a pure `mutate` ("runs a second time when a tab opens during the read", lines ~92-94 in the doc comment) and "callers must serialize writes per path". A rules observer that writes must serialize per path, or it races with a mod writing the same closed note ("last write wins", `09-raw-app.md:593`).
2. **Loop guard is property-level equality.** The convergence of any writer-observer relies on `next === base` returning early (`frontmatter-write.service.ts:128-129`). "Always set" with a changing value (a date, a counter) never converges and, with mods on, interacts with any mod that reacts to saves. Rules with "always set" semantics should compare against the target value and skip identical writes, and the design should say what happens for volatile values.
3. **Canonical-form rewrite.** The first write to a note's frontmatter rewrites it in canonical form (block lists to `[a, b]`, `type:` to `_type:`, quotes dropped, `\n` line breaks) and refuses lossy frontmatter (`09-raw-app.md:592`; `14-cookbook.md:2652`). A rule that "changes right away" on every matching note will rewrite YAML beyond the touched keys the first time; the feature needs a visible "skipped: frontmatter has comments / nested values" outcome, as mods log theirs.
4. **Active-note caret.** Same blocker as Issue 001 (`09-raw-app.md:680`): the editor puts the caret back at its old offset after the document is replaced. Mods avoid it by deferring the write until the user leaves the active note (`14-cookbook.md:2625-2640`); that is a viable fallback for the on-save trigger if the fix is not done first. It is not viable for the "on property change, immediately" trigger the owner asked for, since a properties-panel edit happens on the active note by definition.
5. **Mods are optional and machine-local.** Nothing in the feature may depend on a mod being loaded.
6. **Do not assume the hook order.** Mod `onNoteSaved` runs after all sync observers by design (`mods-host.service.ts:562`), and a settings toggle moves Auto Move's observer to the end of the array (scout-06 section 2.2). Neither is a contract.

## 7. Recommendation

1. Build the feature in core/features, on the Collection expression engine, with a Settings section; mods are not on its critical path and do not need to change for it to ship.
2. Do not add a mod-contributed action seam in v1 (section 4A). Keep the action set fixed and frontmatter-only.
3. If the trigger work produces a core hook for create/move/rename/property-change, consider exposing it to mods later as an additive `ctx` member (section 4B); do it as its own Issue so the private contract repo and its SHA bump are scheduled on purpose.
4. Update `help/documentation/28-mods.md` and `07-events-and-reactivity.md` ("Which writes fire it", lines 183-200) if the feature changes which writes fire `onNoteSaved`, since the table says "Anything else the app writes is not covered by this list". Specifically, if a rules observer writes frontmatter on create/move/rename, those writes would now fire `onNoteSaved` for mods, which changes the documented list and can start new loops in existing mods (for example recipe 20-style stampers).
5. Interim: the owner can run a recipe 20-style mod for one fixed rule today, accepting save-only, active-note-deferral and the machine-local flag.

## 8. Risks

- A built-in rules observer that writes frontmatter changes the set of writes that fire `onNoteSaved`. Existing mods that react to saves and write (the guide documents the loop hazard at `28-mods.md:180`) can loop or double-write with it. Unknown: whether any of the owner's 12 mods does (source not read).
- If rules apply on create/move/rename through paths that currently skip `notifyAfterSave` (scout-06: create, rename, move, restore do not fire it), the new writes will fire it for the first time, which is a behavior change for every after-save observer (File History rows, search incremental update, Todoist, Auto Move timers, mods).
- Exposing the engine through `MOD_APP` ties engine refactors to mod breakage with no compatibility promise; the guide already says raw access can break.

## 9. Open questions only the owner can answer

1. Does any of the 12 existing mods already stamp or fill frontmatter on save (for example an `updated`-style stamp)? If yes, the rules feature and that mod would double-write the same keys; decide which wins or retire the mod.
2. Do you want a rules feature to be visible to mods (a `ctx` hook for rule-applied events), or do you want rules and mods to stay independent? (Recommendation above: independent in v1.)
3. Is a stopgap mod (recipe 20 style, one hard-coded rule) acceptable while the built-in feature is designed, or should nothing ship before the built-in one?
4. Should rule definitions live in `.kokobrain/settings.json` (like Auto Move) or in a vault note/file that git and other tools can see? The mods route stores data in the git-ignored `.kokobrain/mods/<id>/data.json`, which has no history in the owner's vault.
5. For the "on property change" trigger on the ACTIVE note, is a short delay and "skip while the user is in the note until they leave" acceptable if Issue 001 is not fixed first, or must Issue 001 land before the trigger?
