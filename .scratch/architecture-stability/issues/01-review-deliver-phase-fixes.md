# 01: Close the relay-lite deliver-phase review gap

**What to build:** When a review comes back APPROVED with findings, deliver fixes those findings and merges them, and nothing reviews the fix. The launch script says so at `.agent-relay-lite/launch/*.js:226-227` ("APPROVED with minor findings goes straight to deliver"). In the 21 squash deliveries of 2026-10-31 and 2026-11-01, 14 contain a non-test app-code commit made after the final review (3a6e41da, 66efe12c, 0f98b77b, ab63c4a2, a57a47c3, 08bdb76e, efee8558, 55fa9292, f559fcc8, d2d9b50d, 21dc14e5, 41bfc731, 4adbe9fc, 5cd4a497). Squashing also leaves those sub-commits unreachable, so git gc will eventually delete them. The owner picks one of two options:

- (A) Config only. Add a `rules` bullet saying the deliver role may apply only test, doc or copy changes for findings. Any finding that needs a non-test source change becomes a follow-up `.scratch` Issue, listed in the squash body. Rules bullets are appended to every role's prompt, and the deliver prompt still says "Fix every finding that is correct", so the bullet must state that it takes precedence.
- (B) Main session. Right after each `/relay-lite:run` delivery, and before gc can drop the sub-commits, run an opus adversarial review (written to refute) of the diff from the last review commit to the deliver head.

Record the choice in CLAUDE.md § Implementation process. Ask the plugin author whether a re-review-after-deliver option exists. Do not edit the generated launch scripts.

**Blocked by:** none

**Status:** needs-triage

**Gate:** docs/config only: `node -e "JSON.parse(require('fs').readFileSync('.agent-relay-lite/config.json'))"`. Inspect the next relay run by hand.

**Source:** .agent-relay-lite/config.json, .agent-relay-lite/launch/sidebar-redesign-13.js:97-98,226-261, .scratch/sidebar-*/work/*/review*.md, owner memory notes on unreviewed workflow fix commits (calendar issue 24 regression)

- [ ] Chosen option recorded in CLAUDE.md § Implementation process
- [ ] (A) the next delivered Issue's squash has no non-test source commit after the final review, or (B) its post-delivery review file exists with a non-null verdict

## Notes

- **Measurement:** the line-level fix-of-fix rate (a fix rewriting lines another `fix:` wrote in the previous 7 days) went from 9.5% of code fixes before August to 39% from August on. The rise happened under the old `implement-brain-issue` workflow (the 2026-10-28 calendar run), whose deliver step had the same gap. Relay-lite squashes hide such fixes from this metric, so the 14 of 21 count above is the direct evidence. The cause is inferred, not proven: in-run fixes like f98118d3 (10 minutes after 4e07625f) are partly the review loop doing its job.
- **No config setting already solves this:** `reReviews` loops only on CHANGES_REQUESTED. `delivery: "pr"` is the only built-in pause, and it is manual.
- **Why first:** this is the largest measured source of re-fixes, and every later issue in this plan goes through relay-lite.
- **Size:** S.
