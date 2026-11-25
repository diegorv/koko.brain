# Deferred findings and residual scope

This register preserves findings excluded from the severe implementation queue. Nothing here is represented as fixed merely because a mixed predecessor was superseded.

## Residual scope from 105

Source: [open-itens 105](../open-itens/issues/105-minor-write-races-are-closed-autosave-during.md). Its complete historical evidence remains in that file.

| Residual ID | Original subsection | Disposition |
| --- | --- | --- |
| R105-1 | Autosave during rename recreates the old path | Deferred, needs current production-flow reproduction. This deep dive proved related path-reuse effects for task settlement, not this entire original timing claim. Not declared fixed. |
| R105-2 | Unserialized editor saves and retry-chain stacking | Editor saves are already serialized. Direct backlink writers are covered by 07. Retry-chain accumulation is lower-priority operational noise; preserved for later triage. |
| R105-3 | Create competes with Trash restore destination | Deferred, needs real reachable orchestration proof. 19 covers move/rename no-clobber, not every restore/create path; do not claim automatic coverage. |
| R105-4 | Superseded initialization persistence | Migrated to 21 with both corruption directions and error cases. |
| R105-5 | Calendar rollback retains moved properties after failed save | Deferred product decision: preserving newer typing versus reverting fields. No bytes lost; not severe-only scope. |
| R105-6 | Successful create followed by refresh failure reports failure | Deferred recoverable duplicate/reporting issue. No source-content loss established. |
| R105-7 | Properties suppression, no-op and second-change variants | Migrated to 11 with 008. |

These residual entries are separately addressable tracking records, not `ready-for-agent` tickets. Future promotion must reproduce the current failure and define its expected outcome; the original mixed ticket is not runnable.

## Residual scope from 089

| Residual ID | Claim | Disposition |
| --- | --- | --- |
| R089-1 | Link rewrite erases edits | Migrated to 07, including real save-order coordination. |
| R089-2 | Final pre-delete save loses edits | Migrated to 08, including initially clean children and outstanding writes. |
| R089-3 | Type rename erases typing during member write | Service race exists, but the current busy modal blocks the proposed typing sequence. Hold until a reachable concurrent writer is demonstrated. |
| R089-4 | Watcher read overwrites intervening typing | Original evidence is stale: current reload rechecks saved baseline and dirtiness after awaiting. Do not ship a speculative fix. Canvas unpublished state is a distinct confirmed issue, covered by 04. |

## Existing lower-priority owners

| Finding | Disposition |
| --- | --- |
| Backlinks/outgoing panels empty or wrong after A → B → A | Mounted reproduction confirmed. Medium display correctness; already owned by [shell-sidebars 06](../shell-sidebars-ux/issues/06-backlinks-outgoing-stay-open-readable-rows.md), including broader valuable UI acceptance. That ticket and its blocker remain unchanged. |
| TSV/HTML conversion inside code and lost secondary selections | Real paste corruption, undoable, previously parked [open-itens 252](../open-itens/issues/252-tsv-paste-leaves-code-and-indented-lines.md). No silent reopening. Pending menu paste into another note is the distinct ticket 15. |
| Large external batches omit search updates | Confirmed source flow, no note-byte loss; [open-itens 106](../open-itens/issues/106-watcher-events-keep-fts5-semantic-rows-current.md) remains the owner with its existing dependency. |
| Recent-save path suppression drops genuine external indexing | Confirmed stale derived state; preserve for watcher triage, not a new grave-loss ticket. Expiration alone does not reconcile. |
| Semantic cleanup deletes valid new/renamed index entries | Distinct from late insertion after deletion; derived/rebuildable data. Keep as triage evidence, not automatic expansion of queue/deletion tickets 037/107. |
| Old FTS/semantic work mutates the next vault's DB | Mechanism source-confirmed with SQLite scheduling probes, no note-file loss. Existing archived index-isolation and incremental-ownership wontfix decisions remain. Switching feature approval does not silently reopen them. |
| Extensionless qualified wikilinks ignore folders | Explicitly documented/tested basename behavior, not an undisputed regression. Requires compatibility decision. |
| Root rename picks a nested namesake | Reproduced, but [archived root-link 20](../archived/audit-2026-11-04/issues/20-root-note-rename-link-form.md) explicitly declined new syntax for this rare case. No silent reopening. |
| Pure moves/folder renames leave qualified links | Documented limitation with wrong-identity cases under duplicate names; retain for semantics triage, separate from content-write settlement. |
| Unclosed math consumes downstream syntax | Reproduced parser failure; text remains editable and intact. Not grave-loss scope. |
| Code-fence language changes remove metadata; quote math includes prefixes | Smaller correctness defects; excluded from priority implementation. |
| Undo disappears on non-Markdown navigation | Explicitly tested lifecycle behavior. A history-persistence redesign needs a product decision. |
| Secondary cursors not drawn | Plausible/reproduced state-level exposure, but the final deep dive did not establish full rendered user interaction; not promoted. |
| Collection filter round-trip changes semantics | Confirmed for missing booleans and datetime-string values, not all Date operands; no destructive note operation established. |
| Calendar all-day conversion persists wrong times | Confirmed lower-priority form/serialization issue; outside this severe queue. |
| Weekly-note year/month reconstruction | Confirmed wrong-target dates; retained for periodic-note triage rather than mixed into save-boundary fixes. |
| Clipboard capture deduplicates failed delivery | Independent P2 failure; source clipboard remains recoverable, no native failure-injection probe in this round. |
| Inline code wikilinks, checkbox mouse buttons, Canvas color clearing, scalar newline fidelity | Listed smaller correctness findings; not implementation tickets in this group. |

## Historical accuracy

Initial audit summaries used some P1 labels too broadly and treated accepted limitations as new bugs. The deep dive corrected those classifications. Source probes prove mechanisms, not their frequency; induced race counts are not real-world failure probabilities. This register and the ticket statuses supersede those preliminary classifications.
