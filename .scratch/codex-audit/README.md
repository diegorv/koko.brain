# Codex audit

Functional correctness and content-preservation audit of Kokobrain. No security/exploit review and no application fixes.

## Outcome

- 24 tickets: **19 ready-for-agent**, **5 needs-triage**.
- Primary queue: lost edits, wrong-target writes, persistence boundaries, and recovery.
- Two lower-priority editor-feature tickets retain already-approved image behavior. Cosmetic findings, recoverable derived-index drift, and unrelated UI work stay outside this implementation queue.
- Initial discovery used 24 investigators and 16 validators. The subsequent deep dive used **20 additional agents**, each with a distinct assignment. All completed before ticket publication.
- Baseline: `2eaff3d00588dd5a84c4b2cd7c7d05dee1fb5675`.
- Owner authorized this group and superseding predecessor tickets on 2026-11-25.

## Navigation

- [Ticket ledger](ledger.md): status and genuine blocking edges.
- [Evidence](evidence.md): reproduction strength, source anchors, and verification limits.
- [Migration](migration.md): predecessor-to-successor mapping and retained decisions.
- [Deferred findings](deferred.md): exclusions, accepted limitations, and residual mixed-ticket scope.

## Execution rules

Each ticket is a user-verifiable vertical slice. Read the linked evidence and applicable repository ADRs before implementation. Start with a failing behavioral test, use real stores/logic, and mock only permitted external boundaries.

`ready-for-agent` does not override a blocker. The active frontier consists of ready tickets whose predecessors have been completed. Do not launch `needs-triage` tickets until their recorded decisions are answered.

Relay metadata follows `agent-relay-lite`'s `docs/format.md` and `src/ledger.ts`: `Blocked by` is lowercase `none` or same-feature IDs separated by commas; `Files` is a comma-separated list of repository-relative paths without Markdown quoting or globs. These paths describe expected edit surfaces for overlap scheduling, not a requirement to modify every listed file. Directory entries cover test additions or conditional implementation surfaces. Ledger progress uses `todo`, while readiness remains in each issue's `Status` field. `relay pick` excludes the five triage tickets.

Dependency chains:

- **02 → 03 → 05**: final exit boundary, pending-view publication, Kanban draft integration.
- **09 → 10**: history target safety, then supported path-based restoration.

Other shared files require scheduling coordination, not artificial blocking edges. In particular, 01/02/06/07/08/17/18 touch persistence surfaces, but their independently reproducible outcomes do not require a mandatory linear refactor.

Gate terminology follows the project: Frontend means `pnpm check` and `pnpm vitest run`; Both also means `cargo test --manifest-path src-tauri/Cargo.toml`. Targeted UI/native checks named in tickets supplement those implementation gates. This audit publication changes Markdown only and does not claim those full application gates were rerun.

## Decisions awaiting triage

| Ticket | Decision |
| --- | --- |
| 16 | Honest external-writer guarantee and retry/refusal policy; a reread is not atomic compare-and-swap. |
| 17 | Preservation destination and behavior when history is disabled or preservation fails. |
| 19 | Reopen the previously accepted collision race; platform/filesystem support and safe refusal. |
| 20 | Reopen explicit hidden-frontmatter input exemptions and choose visible/redirected/refused input behavior. |
| 22 | Reconsider one-vault-per-session closure; define multi-request and failed-initialization action delivery. |

Prior approved decisions were not silently reversed. Resolved historical tickets remain resolved. Superseded active tickets become `wontfix` with a migration explanation; that means replaced, not fixed.

## Verification limits

The deep dive includes actual mounted Svelte/CodeMirror probes, real-store service tests, real filesystem collision probes, and source-only investigations. These are distinguished in the evidence. Passing characterization tests assert observed faulty behavior; failing preservation tests assert desired safety. Neither means the bug was fixed.

Native Tauri end-to-end operation, arbitrary external-writer timing, and full suites were not comprehensively exercised. Temporary reproduction files are local evidence artifacts, not committed regression tests. Before implementation, recreate the relevant failing test in the repository's supported test harness.
