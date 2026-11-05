VERDICT: APPROVED

Re-review round 3 (main session, opus sub-agent, adversarial) of `git show abf7c0dac`, the fix for review-2.md.

## Checks

- `saving` cannot get stuck: success with the show unchanged clears it before `dismiss()` (which catches internally); a show change during the flash leaves it to `resetForShow`; failure and timeout clear it; a rejection after a newer show started returns without touching it.
- Summon after a successful save: `text` is cleared before `await dismiss()`, so the draft is gone before a summon can arrive; `resetForShow` resets the rest.
- The orphaned waitForResult timer of a rejected request that is no longer `pending` is harmless: it clears its own timer, skips the `pending` reset (ids differ) and resolves an unheld promise.
- Tests: the double-press and late-rejection tests fail on 3119b493f's page by reading; the summon-during-flash test passes there (the guard existed) and fails if the guard is deleted. Only `#lib/contracts/ipc.js` is mocked. The late-rejection test needs about 230 ms of real time inside `vi.waitFor`'s 1000 ms default. 22/22 pass.
- ADR 0028 amendment matches the code.

## Findings

1. **nit** +page.svelte:126-130, :152. Esc + summon + Cmd+Enter all within the 180 ms flash restores a draft that still holds the written text and can capture it again. Same duplicate class the ADR already accepts for a summon while a save waits. Accepted.
2. **nit** +page.svelte:127. The old call sets `saved = false` even when the show changed; it could cut a new show's own flash short only if that save also finished inside the old 180 ms. Cosmetic. Accepted.
3. **nit (test gap)** +page.svelte:132. Deleting `saving = false` there is visible only when `dismiss_composer` fails; the next summon resets it. Accepted.
