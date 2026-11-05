VERDICT: CHANGES_REQUESTED

Re-review (main session, opus sub-agent, adversarial) of the commit that landed after review.md: `git diff eb5d4eb98 68559ef95 -- . ':!.scratch'` (composer +page.svelte, composer-page.test.ts, ADR 0028 amendment).

## Findings

1. **major** src/routes/composer/+page.svelte:84, :115, :122-123. `saving = false` ran before the 180 ms saved flash while the written text was still in the textarea (stripped only after the flash), so a second Cmd+Enter during the flash (double-tap or key repeat) sent the same text again and wrote a duplicate note. Regression against main, where `saving` was cleared in a `finally` after the flash. Came from ad9beacb2; 68559ef95 rewrote the tail and kept it.
2. **minor** src/routes/composer/+page.svelte:32, :183, :106. One `pending` slot: once a new show starts a save, a late result for the earlier save is ignored, so the ADR sentence "only drops the written text from the new show" over-claims. And `pending?.settle(null)` in the submit's catch settled whatever save was pending, so a late rejection of the earlier submit resolved the newer show's save as unconfirmed.
3. **minor (test gap)** src/routes/composer/+page.svelte:125. The `show === savedShow` guard after the flash had no test; deleting it kept every test green.
4. **nit** src/routes/composer/+page.svelte:132-134. `withoutWritten` matches a prefix only: an edit inside the written text, or text typed before it, keeps the whole text (possible near-duplicate on resubmit); conservative, matches its JSDoc.

## Resolution

1. Fixed. `saving` stays set through the flash; after it, the written text is dropped first and only then `saving` is cleared and the composer hides (when the show did not change). Test: "sends one capture when Cmd+Enter is pressed again during the saved flash" (failed before: two submits).
2. Fixed in part. The submit's catch now settles only its own request (`pending?.requestId === requestId`). Test: "a submit that rejects late leaves the save of a newer show alone" (failed before: the newer save ended unconfirmed and did not hide). The single pending slot is kept on purpose: a map of pending saves would apply a late result after the new show had already submitted a text containing it, leaving the remainder behind as a draft of text already written. The ADR wording is narrowed to say a later result is ignored once the new show saves.
3. Fixed. Test: "does not hide a composer summoned again during the saved flash" (no second dismiss, written text dropped from the new show).
4. Accepted. The prefix-only rule is now stated in the ADR amendment.
