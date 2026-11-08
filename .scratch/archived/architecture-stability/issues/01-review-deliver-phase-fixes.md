# 01: Close the relay-lite deliver-phase review gap

**What to build:** When a review comes back APPROVED with findings, deliver fixes those findings and merges them, and nothing reviews the fix. The launch script says so at `.agent-relay-lite/launch/*.js:226-227` ("APPROVED with minor findings goes straight to deliver"). In the 21 squash deliveries of 2026-10-31 and 2026-11-01, 14 contain a non-test app-code commit made after the final review (3a6e41da, 66efe12c, 0f98b77b, ab63c4a2, a57a47c3, 08bdb76e, efee8558, 55fa9292, f559fcc8, d2d9b50d, 21dc14e5, 41bfc731, 4adbe9fc, 5cd4a497). Squashing also leaves those sub-commits unreachable, so git gc will eventually delete them. The owner chose option (B) on 2026-11-01. Both options are kept below for the record:

- (A) Config only. Add a `rules` bullet saying the deliver role may apply only test, doc or copy changes for findings. Any finding that needs a non-test source change becomes a follow-up `.scratch` Issue, listed in the squash body. Rules bullets are appended to every role's prompt, and the deliver prompt still says "Fix every finding that is correct", so the bullet must state that it takes precedence.
- (B) Main session, **chosen**. Right after each `/relay-lite:run` delivery, and before gc can drop the sub-commits, run an opus adversarial review (written to refute) of the diff from the last review commit to the deliver head. Skip it when that diff changes only tests, docs or copy. Findings become a follow-up `.scratch` Issue, or go into an open one that touches the same code.

Record option (B), with its skip rule and the follow-up rule, in CLAUDE.md § Implementation process. Ask the plugin author whether a re-review-after-deliver option exists. Do not edit the generated launch scripts.

**Blocked by:** none

**Status:** resolved

**Gate:** docs/config only: `node -e "JSON.parse(require('fs').readFileSync('.agent-relay-lite/config.json'))"`. Inspect the next relay run by hand.

**Source:** .agent-relay-lite/config.json, .agent-relay-lite/launch/sidebar-redesign-13.js:97-98,226-261, .scratch/sidebar-*/work/*/review*.md, owner memory notes on unreviewed workflow fix commits (calendar issue 24 regression)

- [x] Chosen option recorded in CLAUDE.md § Implementation process
- [ ] The next delivered Issue whose deliver diff changes source code gets a post-delivery review with a non-null verdict, and its findings are filed

## Notes

- **Measurement:** the line-level fix-of-fix rate (a fix rewriting lines another `fix:` wrote in the previous 7 days) went from 9.5% of code fixes before August to 39% from August on. The rise happened under the old `implement-brain-issue` workflow (the 2026-10-28 calendar run), whose deliver step had the same gap. Relay-lite squashes hide such fixes from this metric, so the 14 of 21 count above is the direct evidence. The cause is inferred, not proven: in-run fixes like f98118d3 (10 minutes after 4e07625f) are partly the review loop doing its job.
- **No config setting already solves this:** `reReviews` loops only on CHANGES_REQUESTED. `delivery: "pr"` is the only built-in pause, and it is manual.
- **Why first:** this is the largest measured source of re-fixes, and every later issue in this plan goes through relay-lite.
- **Already practised:** on 2026-11-01 the main session ran (B) by hand on sidebar-redesign 26's fix 56d9c6df. It found three low issues, now in sidebar-redesign Issue 30. The deliveries of 34 and 38 needed none: their fixes were a comment and tests.
- **Size:** S.
- **Open owner action:** ask the relay-lite plugin author whether a re-review-after-deliver option exists. An agent cannot do this; deliver must carry it into the squash body and the delivery comment so it outlives this file.

## Comments

- 2026-11-01, branch `issue/01-review-deliver-phase-fixes`: recorded option (B), a by-hand post-delivery adversarial review of deliver-phase source fixes, in CLAUDE.md § Implementation process, with the review range anchored on the review file. Review round 1: CHANGES_REQUESTED (fixed); round 2: APPROVED, no findings. Full suite: 373 files, 9071 tests passed, build ok. The second criterion stays open until the next source-changing delivery gets its post-delivery review. Open owner action: ask the relay-lite plugin author whether a re-review-after-deliver option exists.
