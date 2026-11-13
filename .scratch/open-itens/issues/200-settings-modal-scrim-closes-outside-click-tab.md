# 200: Settings is modal: a scrim closes it on outside click and Tab stays inside

**Origin:** `audit-2026-11-05` Issue 89, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/ux-polish/issues/30-settings-drawer-modal-scrim.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). It is design work that assumes an unrecorded owner decision, and it is blocked by 29.

**Audit check at `5f8003d67`:** design_or_refactor (ux, low). src/lib/app/SettingsPanel.svelte: no scrim element, no aria-modal, no Tab trap; the drawer is a non-modal fixed z-40 div with role=dialog (transition:fly). The Issue itself says it assumes the owner decision 'make the Settings drawer modal'. The Appearance live preview relies on the app behind staying visible.

**Stale in the text below:** Valid design work that depends on an owner decision; not a defect. Blocked by 29, which is not done. Drawer anatomy around it changed (a6b28484d, c1c126972), so the insertion point is now just before the root div inside {#if settingsPanelStore.isOpen}.

**Owner decision (2026-11-06):** Settings becomes modal: a scrim closes it on an outside click, and Tab stays inside. Any wording below that assumes this decision, calls it recommended or unconfirmed, or asks to confirm it with the owner is superseded: the owner confirmed it on 2026-11-06.

**What to build:** ASSUMES THE OWNER DECISION "make the Settings drawer modal" (recommended yes). While Settings is open, the app behind it is covered by a scrim, so it reads as a settings surface and not a third sidebar; clicking the scrim closes Settings; Tab and Shift+Tab cycle inside the drawer; and the dialog says `aria-modal="true"`. On the Appearance section the scrim is transparent, so the live theme preview behind it shows true colours, but it still catches the click and closes.

In `src/lib/app/SettingsPanel.svelte`:
- Inside the `{#if settingsPanelStore.isOpen}` block, before the drawer, render `<div data-settings-scrim class="fixed inset-0 z-30 {appearance ? 'bg-transparent' : 'bg-black/30'}" onclick={() => settingsPanelStore.close()} aria-hidden="true"></div>` (the drawer stays `z-40`; bits-ui portals stay above at `z-50`). Fade it with Svelte's `fade` (150 ms).
- The dialog root gets `aria-modal="true"`.
- A `keydown` handler on the dialog root wraps Tab: on Tab from the last tabbable element inside the root, focus the first; on Shift+Tab from the first, focus the last. Events from bits-ui portaled content do not reach this handler (they are outside the root in the DOM), so open Selects and Popovers keep their own keyboard behavior.

**Blocked by:** 199

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh e2e/specs/settings.spec.ts e2e/specs/event-calendar.spec.ts e2e/specs/note-action-bar.spec.ts`.

- [ ] Failing first, `src/tests/lib/app/SettingsPanel.test.ts`: open, the dialog has `aria-modal="true"`, a `[data-settings-scrim]` exists, clicking it sets `settingsPanelStore.isOpen` to false
- [ ] Same file: on `appearance` the scrim has `bg-transparent`, on `editor` it has `bg-black/30`
- [ ] Same file: dispatching Tab on the last tabbable element focuses the first, Shift+Tab on the first focuses the last
- [ ] E2E in `settings.spec.ts`: open Settings on Editor, click at a point left of the drawer, the panel closes; open it again, choose a value in a Select inside the panel (Release channel on Update, or Week starts on in Calendar) and the panel stays open
- [ ] Every E2E spec that opens Settings and then interacts with the app behind it is updated or confirmed unaffected; `note-action-bar.spec.ts:98-110` (fills Content width in Settings) stays green

## Notes

- Source: review section 2 "Settings row anatomy" (drawer recommendation: light scrim skipped on Appearance, `aria-modal`, outside-click close); `.scratch/archived/ux-polish/work/settings.md` P2 and section 3 point 1.
- Owner decision: if the owner keeps the app behind Settings interactive, drop this ticket; the focus ticket already covers the keyboard part.
- Cross-cluster: when the elevation cluster adds `--overlay-scrim` (review section 4 Issue 3), it may swap `bg-black/30` for that token; this ticket does not wait for it.
- Size: S.

## Comments

- 2026-11-06: migrated from `.scratch/archived/ux-polish/issues/30-settings-drawer-modal-scrim.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: owner decision recorded from the 2026-11-06 survey; status ready-for-agent.
