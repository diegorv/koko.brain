# 37: Mods: each mod says what it does; the run view shows status and progress clearly

**Origin:** design review 2026-11-17, proposals P169, P170 (part), prototype `.scratch/design-review/prototypes/settings-auto-organize.html`, research `.scratch/ux-quick-wins/research/verdict-settings-b.md` (Q8) and `breakdown.md` (old ticket 36).

**What to build:**

1. **Description in the list.** `ModStatusEntry.description?: string` (`src/lib/plugins/mods/mods.store.svelte.ts:4-24`), set from the manifest at `src/lib/plugins/mods/mods-host.service.ts:758,843,873` and from `previous?.description` at `:1126`; shown as a muted `text-meta` line under the name in `ModsStatusList.svelte` (`:94-102`). `ModManifest.description` already exists and is parsed (`mods.logic.ts:146,216,223`). An absent description renders no empty line. It survives `disableMod` and a load error that had a manifest.
2. **Load time to a tooltip.** The inline "Loaded · 42 ms" moves to a `title` on the state label ("Loaded in 42 ms", "< 1 ms" kept). `data-mod-load-ms` stays on a node so tests and tools can still read it. See owner question 37.1 (old 36.1): the inline load time was added on purpose on 2026-11-08 (59f88c7be, mods-load-time Issue 01, help `28-mods.md:55`); the validated P169 moves it.
3. **Run view status.** In `ModActionPicker.svelte` the status (`:107`, one muted span) is coloured: `text-success` for Done, `text-destructive` for Failed, muted otherwise. The text is unchanged because `e2e/specs/vault-mods.spec.ts:193,372-395` reads `[data-mod-run-status]`.
4. **Named progress and log.** The progressbar (`:109-118`) gets `aria-label` "<title>, <done> of <total>"; the log box (`:125-129`) gets `role="log"`.
5. **Help.** `help/documentation/28-mods.md:54-55` describes the description line and the tooltip.

Not in this ticket: a "Stopping..." state on Stop (dropped: the abort listener cancels the run synchronously, `mods-host.service.ts:425-430`, so there is no interval to show), any change to how mods load, run or report errors, a new status vocabulary.

**Size:** S.

**Blocked by:** none

**Status:** resolved

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh vault-mods.spec.ts (it reads the run status text).

- [x] Failing test first, `src/tests/lib/plugins/mods/mods-host.service.test.ts` and `ModsStatusList.test.ts` (real host, only fs mocked): a manifest `description` shows in the row after load; none gives no empty line; it survives `disableMod` and a load error that had a manifest.
- [x] The row no longer contains "Loaded · 42 ms"; the state label `title` is "Loaded in 42 ms"; `data-mod-load-ms="42"` is intact (`ModsStatusList.test.ts:116-133` updated on purpose).
- [x] `ModActionPicker.test.ts`: the progressbar name contains the run title and "<done> of <total>"; `[data-mod-run-status]` has the destructive class on Failed and the success class on Done with the same text; the log has `role="log"`.
- [x] Stop, focus and Enter tests unchanged.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass; `bash scripts/e2e.sh vault-mods.spec.ts` passes.

## Original proposal

- **P169.** The mods list shows load times, not what each mod does. Carry the manifest description into `ModStatusEntry`, show it under the name, move the load time to a tooltip.
- **P170 (part).** The mod run view's status, progress and Stop are not legible. Coloured status labels and `aria-label` on the progressbar ship; "Stopping..." does not.

## Problem

The manifest `description` is parsed and then dropped, so the list names mods but not their purpose. In the run view Running, Done and Failed look alike, the progressbar has no name and the log is not announced.

## Evidence

Checked at 085b23c5d.

- `ModStatusEntry` has no `description` (`mods.store.svelte.ts:4-24`); upsert sites `mods-host.service.ts:758,843,873,1126`; row `ModsStatusList.svelte:94-102`.
- `ModActionPicker.svelte:107` status span, `:109-118` unnamed progressbar, `:125-129` log without a role.
- The field is optional and additive; every reader of `entries` ignores unknown fields. No E2E reads `data-mod-load-ms` or "Loaded ·".
- Mods-host-robustness 01 to 04 touch none of these sites (grep at HEAD; re-check at the start of the run).

## Sequence with

Ticket 22 calls `startModsHost` and `stopModsHost` from `LabsSection.svelte` and does not edit the four object literals or the row. Mods-host-robustness 01 to 04 and the mods-load-time Issue 01 (59f88c7be, reversed in part by item 2). Vault-mods help is also read by the `kokobrain-mods` docs; only `28-mods.md:54-55` changes.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): 37.1 (old 36.1) move the load time into a tooltip, as the validated P169 says; if the owner wants it inline, the ticket keeps only the description line (items 1, 3, 4 and 5) and item 2 is dropped.
- 2026-11-18, deliver (branch issue/37-mods-each-mod-run-view-shows): Labs mod rows show the manifest description under the name and the load time moves to a `title` tooltip ("Loaded in N ms"); the run view colours Done/Failed, names the progress bar ("<title>, <done> of <total>") and gives the log `role="log"`. Help docs updated (also 01-anatomy-and-loading.md and 15-errors-and-debugging.md, which quoted the removed "Loaded · 42 ms"). Review round 1: APPROVED, three nits, no source change (nit 2, always mounting the log live region, left as a follow-up). Full suite: 661 files, 17690 passed, 56 skipped, 1 todo, exit 0. E2E not run in this step.
