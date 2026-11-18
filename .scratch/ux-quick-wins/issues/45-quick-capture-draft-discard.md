# 45: Quick Capture keeps the draft until it is written, with Discard and a short hold

**Origin:** design review 2026-11-17, proposals P15 (draft restore and Discard) and P14 (the Saved hold), prototype `.scratch/design-review/prototypes/feedback-components.html` (the P15 "after" cell, hint markup at `:977`), research `.scratch/ux-quick-wins/research/verdict-feedback-a.md` (Q2, P14 and P15) and `breakdown.md` (old ticket 05, split by the owner on 2026-11-18: the copy and the Saving state are ticket 07, this is the rest).

**What to build:**

1. **"Draft restored" and Discard.** When a non-empty draft is restored, on mount (`src/routes/composer/+page.svelte:18`, `readDraft()`) or on summon (`resetForShow`, `:173`), a note "Draft restored · Discard" shows at the left of the hint row, beside the existing hint on the right (prototype `:977`). It is its own element, outside the `.hint` div, so the `hint().textContent` pins in `composer-page.test.ts` keep reading the hint alone. It goes away on the first user edit: `onDocChange` (`:207`) clears the flag when `next !== text` (the programmatic `setText` sets `text` first, so its echo is equal and does not clear it). Discard empties the editor and the stored draft (`setText('')`, which removes the key through `writeDraft`, `:41,:64-71`) and refocuses the editor. No confirm: the restored text is the person's own draft and `setComposerText` clears the undo history. With no draft there is no note.
2. **A Saved hold.** A confirmed save shows a check and "Saved" for about 600 ms before the window hides: `SAVE_FLASH_MS` goes from 180 to 600 (`:12`), and the `saved` class (`:241`, `.composer-root.saved` `:282-284`) stays for that time.
3. **The stored draft before the hold.** On `ok === true` the stored draft becomes `withoutWritten(text, body)` (`:155-158`) before the hold starts, written to storage directly while the editor still shows the text. Without it a summon during the hold would restore the already-saved draft (`resetForShow` reads it at `:173`) and capture the same text twice; 600 ms widens the 180 ms window that exists today. After the hold the existing `setText(withoutWritten(text, body))` (`:148`) stays.
4. **Esc during the hold.** Escape still dismisses at once (`dismiss`, `:89-99`, idempotent). A summon within the hold shows an empty editor and no "Draft restored", and Cmd+Enter sends no second `submit_composer_capture` (`handleSave` sees an empty body and only dismisses, `:105-109`).
5. **Drag region.** Discard sits inside the root's `data-tauri-drag-region` (`:241`): give it `data-tauri-drag-region="false"` like the editor (`:243`), and check by hand that a click on it is not taken as a window drag.

Not in this ticket: the hint copy and the "Saving..." state (ticket 07); "Saved to <folder>/<name>" (needs a Rust DTO change, `ComposerCaptureResult` is `{ requestId, ok }`); clipboard and deep-link capture feedback (needs `tauri-plugin-notification`, a new dependency); a clear-draft shortcut (dropped by the validation). The draft stays in `localStorage` (`DRAFT_STORAGE_KEY`); no Rust, no DTO change.

**Size:** S.

**Blocked by:** 07

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes (none expected: `composer-autocomplete.spec.ts` types and does not assert the hint).

- [ ] Failing test first, `src/tests/routes/composer-page.test.ts` (only the Tauri `call` and `on` boundary mocked, as in the file): mounting or summoning with a stored draft shows "Draft restored" and a Discard button; no stored draft shows neither; typing one character removes the note; a summon that restores the same text the editor already holds still shows it.
- [ ] Discard empties the editor and `localStorage` (`kokobrain:composer-draft` is gone), removes the note and leaves focus in the editor; the next summon shows an empty editor.
- [ ] A confirmed save keeps the `saved` class and "Saved" for 600 ms (fake timers, `setTimeout` and `clearTimeout` only) before `dismiss_composer` is called; at 599 ms it has not.
- [ ] At `ok === true` the stored draft holds only what was typed after the submit, checked before the hold ends (`localStorage.getItem`), while the editor still shows the text.
- [ ] Esc then summon during the hold: the editor is empty, there is no "Draft restored", and Cmd+Enter sends no second `submit_composer_capture`. The existing tests "sends one capture when Cmd+Enter is pressed again during the saved flash" and "does not hide a composer summoned again during the saved flash" (`:321-351`) advance 500 ms today and move to the new hold on purpose.
- [ ] A failed or unconfirmed save keeps the text and the stored draft as today (no `withoutWritten` write), and a summon then restores it.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass. By hand: a Discard click does not drag the window.

## Original proposal

- **P15 (draft restore and Discard).** The composer says "ESC cancels" but keeps the draft, and saving is hidden. Proposal: the hint reads "Esc hides (draft kept) · ⌘↩ saves", "Saving..." while waiting, and a restored draft shows "Draft restored" with a Discard link. Validation: revise, the clear-draft shortcut is dropped. Only the restore note and Discard are built here; the copy and "Saving..." are ticket 07.
- **P14 (the Saved hold).** Quick Capture success is invisible: the composer flashes a ring for 180 ms. Proposal: the composer shows a check and "Saved to <folder>/<name>" for about 600 ms before it hides; clipboard and deep-link captures get a toast or notification. Validation: revise, a main-window toast is not seen while the user works in another app. Only the check, "Saved" and the 600 ms hold are built here.

## Problem

A draft comes back silently on the next summon and there is no way to throw it away except selecting and deleting it, so a stale text can be sent by mistake. The success flash is 180 ms, too short to see. A longer hold makes a worse problem possible: the written text is still in the stored draft during it.

## Evidence

Checked at `085b23c5d`.

- `+page.svelte:12` `SAVE_FLASH_MS = 180`; `:16` the storage key; `:18` `text = $state(readDraft())`; `:41` `$effect(() => writeDraft(text))`; `:56-71` `readDraft` and `writeDraft`; `:101-153` `handleSave`; `:128-133` the summoned-again branch; `:141-153` the flash and `setText(withoutWritten(...))`; `:155-158` `withoutWritten`; `:166-186` `resetForShow` (`:173` restores the draft, `:182` sets `saving = false`); `:241-257` the markup.
- `composer-editor.ts:129` `onDocChange` runs on every doc change, including `setComposerText`'s dispatch (`:143-152`), which also clears the undo history.
- `src/tests/routes/composer-page.test.ts:321-351` hold the two flash tests; `:197-198` `hint()` reads the `.hint` element.
- Verdict refutation (feedback-a P14): during the flash the stored draft equals the written text, so a summon in that window restores and could capture it twice.

## Why blocked

- 07: same file and the same test file. It rewrites the hint strings, makes `saving` a `$state` and adds the "Saving..." hint in `+page.svelte:250-256` and `:26`, and moves the pins at `composer-page.test.ts:107-108,271,429`; this ticket then adds the restore note and the hold on top of that markup.

## Risk

This ticket changes when the composer's stored draft (`localStorage` key `kokobrain:composer-draft`) is rewritten and adds a control that empties it. What could be lost: typed capture text. If `withoutWritten` ran for a save that was not written, or on the wrong `body`, the draft would be trimmed and the text would vanish on the next summon; Discard empties the draft with no undo; and a keystroke typed during the 600 ms hold makes `$effect(() => writeDraft(text))` store the full text again, so a summon between that keystroke and the end of the hold could restore and capture the already-written part a second time. The write is guarded to `ok === true` only, with a test that a failed or unconfirmed save keeps the draft. It runs only when the owner names it (launch by number, never `--all`).

## Sequence with

Ticket 07 is the only other ticket in `src/routes/composer/+page.svelte` and must be merged first. Open-itens 003 (closing the main window never leaves a windowless app) names the composer page; it is not covered here, rebase only. The `.scratch/composer-autocomplete` folder holds research only and no live Issue.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping, the split of old ticket 05, and for this ticket "tickets at the end, run only when named". Defaults (not individually answered): 45.1 (written here): Discard has no confirm. Default: yes, because the restored text is the person's own draft and the note names the control.
