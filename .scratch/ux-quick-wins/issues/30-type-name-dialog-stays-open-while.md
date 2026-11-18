# 30: The type name dialog stays open while it saves

**Origin:** design review 2026-11-17, proposal P90 (part), prototype `.scratch/design-review/prototypes/feedback-components.html`, research `.scratch/ux-quick-wins/research/verdict-feedback-b.md` (QB3, P90 slice) and `breakdown.md` (old ticket 38).

**What to build:**

1. **Busy confirm.** `TypeNameDialog` keeps itself open while `onConfirm` runs. Today `confirm()` sets `open = false` before `await onConfirm(name)` (`src/lib/features/type-definitions/TypeNameDialog.svelte:40-45`). The new shape is a local `busy` flag set before the await and cleared in a `finally` that also closes the dialog, so a future throw cannot leave it stuck.
2. **Button state.** While busy the confirm button (`:73`) is disabled and shows a busy label. A new optional `busyLabel` prop carries it; the rename passes "Updating notes..." (`src/lib/features/rail-shell/TypesNavigator.svelte:487-496`), the new-type dialog (`:465-472`) passes nothing and keeps its confirm label.
3. **All four exits blocked while busy.** Cancel (`:72`), the shadcn X (`dialog-content.svelte:15,36-42`), Escape and an outside click do nothing. Guard through the bound `open` (ignore a close request while `busy`), not by hiding the X.
4. **Frozen helper line.** The error line and the `Saved as "..."` line keep their pre-confirm state while busy. During the await `renameItem` and `createFile` put the new name into `typeDefinitionsStore`, so `existingTypeNames` (`TypesNavigator.svelte:128-134`) gains it and `validate(value)` (`:28`) would flash "already exists" under the input. Capture `error` and `savedName` at the moment of confirm and render those while busy.
5. **Double Enter.** `handleKeydown` ignores Enter while busy, so `onConfirm` runs once.

Not in this ticket: an inline-error branch for a rejected `onConfirm` (no caller rejects: `type-definitions.service.ts:173-196,220-246` catch and return), keeping the typed name after a failure (needs `createTypeDefinition` and `renameType` to report failure, a change to the type-rename write path), and any change to the rename write itself. The dialog only closes later; the write path is untouched.

**Size:** S.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh only when a selector or E2E surface changes (none expected).

- [ ] Failing test first, new `src/tests/lib/features/type-definitions/TypeNameDialog.test.ts` (real component, `onConfirm` a plain function returning a held promise): after Enter the dialog is still open, the confirm button is disabled and shows the busy label, and Cancel, the X and Escape do not close it; once the promise resolves the dialog closes.
- [ ] While busy, a `validate` that starts returning an error (simulating the store gaining the new name) renders no error line and keeps the last `Saved as` line.
- [ ] Enter twice while busy calls `onConfirm` once.
- [ ] `src/tests/lib/features/rail-shell/TypesNavigator.test.ts`: the new-type flow still creates a type and closes the dialog; the rename flow shows "Updating notes..." while `renameType` is held, then closes. Real stores, only the Tauri boundary mocked.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P90.** Async dialogs and actions have no pending-to-done loop. TypeNameDialog closes before its work finishes, so a failure loses the typed name, and a type rename shows no progress. Keep the dialog open with a busy confirm button until `onConfirm` resolves, and show failures inline. A rename shows "Updating notes...". Validation: revise, ViewDialog and Trash are already fine.

## Problem

Confirming a type name closes the dialog at once and the rename keeps rewriting member notes in the background with no sign of work. The person can start typing in the editor while open tabs are being rewritten.

## Evidence

Checked at 085b23c5d.

- `TypeNameDialog.svelte:40-45`: `open = false` before `await onConfirm(name)`. Two consumers, both in `TypesNavigator.svelte` (`:465-472` new type, `:487-496` rename).
- `type-definitions.service.ts:173-196` (`createTypeDefinition` catches and returns `null`), `:220-226` and `:242-246` (`renameType` catches both stages). No caller rejects, so the "stay open with an inline error" branch of the review is unreachable and is dropped.
- `TypesNavigator.svelte:128-134` builds `existingTypeNames` from the store; the store gains the new name mid-await, which is the stale-validation hazard in item 4.
- Side effect to record: a modal dialog during the rename keeps keystrokes out of the editor while `renameType` rewrites open tabs (`type-definitions.service.ts:231-238`). That narrows open-itens 089 (type-rename race) but does not fix it; 089 stays open.

## Sequence with

Shell-sidebars-ux 15 and 34 name `TypesNavigator.svelte`; this ticket adds one attribute line (`busyLabel`) at `:487-496`, so rebase only. Shell-sidebars-ux 10 touches `PropertiesView.svelte` and `PropertyField.svelte`, not this file. No other ticket in this folder edits `TypeNameDialog.svelte`.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping.
