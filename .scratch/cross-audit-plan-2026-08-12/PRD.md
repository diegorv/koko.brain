# Spec: Cross-Audit Remediation Program (2026-08-12)

Status: ready-for-agent

Sources: `reverification-2026-08-12.md` (architecture re-verification, 22 findings + 8 live bugs), `../ponytail-audit-2026-08-12/review-2026-08-12.md` (over-engineering audit review, 71 findings + 4 bonus), and `plan-2026-08-12.md` in this directory (the merged, code-verified execution plan — the authority on ordering and per-item corrections). This spec is the intent contract; the plan is the execution order.

## Problem Statement

Kokobrain's owner ran two independent quality audits on the same day against the same clean HEAD. Together they establish three problems:

1. **Eight live, user-facing bugs** exist today: semantic/hybrid search "jump to match" lands at the top of the file instead of the match; the sidebar toggle buttons don't persist while the identical keybinding does; setting a note's icon or color loses the `_icon`/`_color` system metadata to the next autosave; the second vault opened in a session never shows the "Indexing vault..." placeholder and briefly shows empty backlinks; relational filters on non-numeric values corrupt `.collection` and `.view` files on every write; newly created kanban/collection/typed notes are indexed as empty and never re-indexed; deleted notes linger as phantom pages in collection views; and a renamed-then-recreated file is silently skipped by the index dedupe.

2. **Structural duplication keeps breeding these bugs.** Four responsibilities have no owning module — "a note's bytes changed" (four divergent fan-out lists), "a note's path changed" (four hand-picked subsets), settings persistence (a duty copied across ~82 mutation sites), and block decorator update discipline (eleven copied ViewPlugin bodies). Every one of the live bugs above is a drift symptom of one of these missing owners.

3. **Dead and over-engineered code obscures the live code.** Roughly 3,000+ lines of orphaned exports, superseded parsers, unused Tauri commands, and unneeded dependencies (npm and cargo) survive, several actively misleading: doc surfaces enumerate commands that nothing invokes, and six Troubleshooting decorator kill-switches are dead UI.

Naive cleanup makes things worse: in five verified cases the over-engineering audit proposes deleting the exact symbol the architecture audit needs wired in (collection eviction, view-parse-cache clears, decorator toggles, settings clamps, inbox predicates). The two audits must be executed as one program, in one order, or they destroy each other's fixes.

## Solution

Execute the merged remediation plan as a phased program:

- **P0** — the seven surgical live-bug fixes land first, each as a standalone commit with a failing regression test written before the fix, independent of any refactor.
- **P1** — the five conflict decisions (C01–C05) are taken and recorded: wire-vs-delete resolved in favor of wiring for decorator toggles, view-parse-cache clears, and collection eviction; clamp wrappers kept; one inbox predicate survives.
- **P2** — the safe deletion batch: confirmed dead code, dependencies, and corrected small partials, each commit carrying its test collateral, always landing **before** the refactor that rewrites the same file.
- **P3** — the four owner-module refactors (block decorator factory, typed open-note-at-position, the note-change owner, settings persistence owner) in five dependency-ordered tracks, interleaved with the remaining same-file deletions.
- **P4** — worth-exploring variants and heavy-collateral deletions.
- **P5** — deferred items with recorded reasons (refuted finding never applied; cargo `uuid` waits on the p2p-sync branch decision; the inline ViewPlugin fold waits on the freeze investigation).

The end state: the eight bugs are fixed with regression tests pinning them; each of the four duplicated responsibilities has exactly one owning module; the dead surface is gone; and the ADRs and doc surfaces describe the code as it actually is.

## User Stories

1. As a note-taker, I want clicking a semantic or hybrid search result to place my cursor at the actual match, so that search is usable for navigation instead of dumping me at the top of the file.
2. As a note-taker, I want the sidebar toggle buttons to persist my layout exactly like the keyboard shortcut does, so that the app doesn't forget my workspace between sessions.
3. As a note-taker, I want the icon or color I pick for a note to survive the next autosave of that note, so that visual organization doesn't silently evaporate.
4. As a note-taker with multiple vaults, I want the second vault I open to show "Indexing vault..." while its index builds, so that I don't see a false flash of empty backlinks and panels.
5. As a note-taker, I want filters comparing text properties (e.g. status >= "b") to round-trip through my `.collection` and `.view` files without corrupting them, so that saved views stay valid.
6. As a note-taker, I want a newly created kanban, canvas, collection, or typed note to be searchable and linkable immediately, so that new content participates in the vault from the first second.
7. As a note-taker, I want deleting a note to remove it from every collection view, so that phantom pages don't accumulate.
8. As a note-taker, I want a file I rename away and later recreate at the old path to be re-indexed, so that the index never silently skips real content.
9. As a note-taker, I want typing and scrolling in large notes to stay smooth, so that the editor never allocates the whole document per keystroke for no reason.
10. As a note-taker, I want the Troubleshooting pane's decorator kill-switches to actually disable their decorators, so that I can isolate a misbehaving live-preview feature myself.
11. As a note-taker, I want collection block widgets to refresh when the vault index updates, so that embedded query results don't go stale.
12. As a note-taker, I want kanban interactions that change nothing to write nothing, so that my files aren't dirtied by no-ops.
13. As a note-taker, I want restoring a file-history snapshot to work even when no markdown editor is mounted, so that restore never silently no-ops.
14. As a note-taker switching vaults quickly, I want update auto-checks and daily-note opening to fire once for the vault that actually opened, so that rapid switches don't double-fire side effects.
15. As a note-taker, I want wikilink completion to never suggest notes from the previously open vault, so that cross-vault leakage can't happen even for a few hundred milliseconds.
16. As a vault owner, I want every write of frontmatter to emit the canonical YAML form, so that diffs stay minimal and tools agree on quoting.
17. As the maintainer, I want one module to own "a note's bytes changed" — with explicit per-source policy for save, edit, watcher, create, and fs events — so that adding an index means editing one place instead of re-deriving four fan-out lists.
18. As the maintainer, I want one module to own "a note's path changed" (delete, rename, move, restore), so that every path-keyed consumer (collection records, file icons, calendar keys, index dedupe) is evicted consistently.
19. As the maintainer, I want persisting settings to be a property of the settings module rather than a duty of every mutation site, so that a forgotten save call can never again produce a persistence bug.
20. As the maintainer, I want the eleven block decorators defined through one factory with a registry, so that the copied update discipline (and its dead viewport guard) exists in exactly one place.
21. As the maintainer, I want opening a note at a position to go through one typed interface (offset vs line), so that unit mismatches like the search-jump bug become type errors.
22. As the maintainer, I want the ~3,000 lines of verified dead code deleted with their test collateral in the same commits, so that the commit gate stays green at every step.
23. As the maintainer, I want the three dead npm packages and the dead cargo dependencies removed with regenerated lockfiles, so that install size and supply-chain surface shrink.
24. As the maintainer, I want deletions to land before the refactor that rewrites the same file, so that shared test files are rewritten once, not twice.
25. As the maintainer, I want every conflict between the two audits resolved by an explicit recorded decision, so that no cleanup forecloses a planned fix.
26. As the maintainer, I want the ADRs and doc surfaces (command enumerations, settings toggle lists, watcher description) amended in the same commit series as the code they describe, so that the docs never assert commands or behaviors that don't exist.
27. As the maintainer, I want the ADR-0017 / ADR-0025 watcher overlap resolved by a single supersede/rewrite, so that two active ADRs stop describing the same subsystem differently.
28. As the maintainer, I want the refuted finding (watcher counters accessor) and the superseded finding (deleting decorator toggle names) explicitly marked not-to-apply, so that a future agent doesn't re-derive and apply them.
29. As the maintainer, I want the cargo `uuid` removal deferred until the p2p-sync branch decision, so that an unmerged branch isn't stranded compile-broken.
30. As the maintainer, I want the inline ViewPlugin fold deferred until the freeze investigation closes, so that the last per-plugin LP-PROFILE isolation labels survive while they're still needed.
31. As an agent executing this program, I want every work item to name its source findings and its per-surface gate (cargo test / pnpm check + vitest + build), so that I can verify each commit mechanically.
32. As an agent executing this program, I want each live bug pinned by a failing regression test before its fix, so that the later refactor that relocates the code cannot silently regress it.
33. As an agent executing this program, I want deletions specified by symbol rather than line range, so that off-by-a-few-lines ranges (which twice included live functions) cannot delete live code.

## Implementation Decisions

**Program shape**
- The merged plan's phase order (P0 → P5) is binding. Two global rules: every live bug gets a standalone commit with a regression test before any refactor that relocates it, and pure deletions land before the refactor that rewrites the same file.
- One commit per work item, full detailed commit format, per-surface test gate per commit (per the repo's commit and testing conventions).

**Conflict decisions (recorded, final)**
- Decorator kill-switches: wire, don't delete — the inline extension assembly accepts the disabled-decorators set and filters its handler registries; the six dead toggle names come back to life and the deletion finding is dropped as superseded.
- View parse cache: the dead accessors are deleted, but the two clear functions are wired into item deletion and vault teardown in the same commit — closing the stale-cache bug instead of deleting its fix.
- Collection eviction: the per-path removal functions are kept and wired into all removal sites by the note-change owner work — deleting them would have made the phantom-pages bug permanent.
- Settings clamps: the per-setting clamp wrappers survive (the load/save-time normalization pass becomes their second caller); their bodies shrink onto a single shared clamp utility.
- Inbox predicates: one predicate survives as the sole inbox counter; the system-folder helper with zero production callers is deleted, porting its unique edge-case tests to the surviving function.

**Owner modules (the four new seams)**
- Note-change owner: one function taking a discriminated change (`upsert` with content | `delete`) plus an explicit source (save / edit / watcher / create / fs), owning the index-dedupe policy per source, the single nullable FTS-key derivation (watcher semantics: skip, never fall back to the absolute path), the TS per-file updaters and their newly written removal counterparts, and the Rust index IPCs. Consumers register into it rather than being imported from core (respecting the four-layer taxonomy). Its first shipped slice is the forget-note operation (index-dedupe clear + Rust removal on rename/move), which closes the documented incremental-indexing invariant violation.
- Path-change owner: one function expressing move, delete, and restore (`from`/`to` nullable), owning per-operation ordering via a disk-op callback, the single folder-prefix walk, and the wiring of the three orphaned path-keyed consumers. The Rust half of folder re-keying lands as a native rename command per the Rust-index ADR, written after the dead-command cuts.
- Typed navigation: one core-editor function taking a path and a discriminated target (character offset | 1-indexed line), owning the await ordering, active-vs-switch branch, animation-frame layering, clamp, and focus. The scroll-position mailbox and editor view reference stay public.
- Settings persistence owner: a start/stop persistence routine hosted in the settings module using a root effect, started and stopped by vault lifecycle, with a hydration gate, teardown suppression (vault-switch teardown must not write defaults into the new vault), and an explicit flush on quit. Mutating the store *is* persisting; the per-section change-callback prop and all scattered save calls are deleted. The settings type remains purely persistent state.
- Block decorator factory: one definition module with separate settings-key and profile-label fields (they diverge and settings keys are persisted user data), rebuild triggers as parameters, landed in two commits — factory collapse first, registry + toggle unification second (the ~10 newly exposed toggles are an intentional feature change, reviewed as such).

**Index and readiness**
- Vault-index readiness becomes an additive store flag set on the first index-version bump and cleared on teardown; the process-global version counter is never reset (completion depends on its monotonicity).
- The Rust properties reverse index stays write-only after the dead property-lookup commands are cut; re-adding readers is a later decision, not part of this program.
- The vault-entries snapshot for scripting and completion becomes one version-keyed memo with explicit invalidation on vault open/close, documented as a cache, not a mirror.

**Deletion discipline**
- Deletions are specified by symbol, never by line range; two audited ranges included live functions.
- Every deletion carries its test collateral (own test files, shared combined-test surgery, helper patches) in the same commit; the combined live-preview test files are edited once, jointly with both parser deletions.
- Path-helper consolidation (basename/stem and vault-relative derivation) goes into the existing shared path utility as one change; file-history call sites are excluded (its keys are persisted snapshot identifiers).
- Doc surfaces are program deliverables, not cleanup: the architecture doc's command enumeration, the settings help page's toggle list, the stale throttle comments, and the affected ADRs are amended in the same series as their code.

## Testing Decisions

**What makes a good test here:** assert external behavior through the real stores — real store state and computed getters after the action, never a mock-call assertion alone. Mock only the Tauri IPC boundary and sanctioned side-effect services. Every P0 bug fix starts from a failing regression test that reproduces the user-visible symptom; the test survives the later refactor that relocates the code.

**Seams (confirmed with the owner):** the existing seams carry almost everything; the only new seams are the four owner modules themselves.

- Service-layer vitest seam (primary): per-file mock of the Tauri invoke boundary + real stores. Prior art: the backlinks service suite (mocks only invoke, resets real stores per test) and the bookmarks store suite (zero mocks, asserts getters).
- Autosave/debounce scheduling: real debounce + fake timers, discriminating the 500 ms frontmatter vs 2000 ms body paths. Prior art: the editor-service reset-timers suite (which exists precisely because the main editor suite mocks debounce fire-immediately).
- Ordering constraints in filesystem operations: the fs-service race-audit suite pattern (failing-first audit tests pinning "tabs close before trash move" and its siblings) extends to the path-change owner's per-operation ordering.
- Block decorator factory: exactly one new EditorView-mounting test exercising all four update gates once. Prior art: the seven existing jsdom EditorView-mounting suites in the live-preview area (widget and pipeline-DOM tests).
- Component-level checks where a panel's reactive contract matters: mount + flushSync with real stores, mocking only fetch services. Prior art: the backlinks panel suite.
- Rust: the existing flat integration-test crates; index behavior asserted against the real VaultIndex (prior art: the vault-index integration suite). The dead-command cut deletes its 19 orphaned test functions in the same commit or the crate does not compile.
- E2E: re-run only affected specs through the e2e script (embed widgets after the media merge; settings after the toggle unification); full suite only at program end.

**Constraints honored:** never mock stores or logic modules; getters not `$derived` in stores, and every new computed getter (e.g. the readiness flag) gets its own test; the settings persistence owner requires a spike proving the root-effect pattern is unit-testable in vitest **before** its refactor claims the test win — the pattern has zero existing uses in the codebase and the repo's own ADRs warn that rune scheduling misbehaves outside a mounted tree. The ~14 assertions currently pinned to a mocked save-settings call are rewritten against persisted output, not deleted.

## Out of Scope

- The refuted finding (deleting the watcher-counters accessor) — never applied as written; re-decidable only after the watcher ADR rewrite, and only as the honest full-block deletion.
- The decorator-toggle deletion finding — superseded by the wiring decision.
- The cargo `uuid` removal — deferred until the p2p-sync branch is merged or abandoned.
- The inline ViewPlugin fold (image/footnote/wikilink-embed/meta-bind-input into the handler registry) — gated on the freeze investigation closing; only its independent one-line perf fix ships now.
- The widget-cache barrel and the generic settings-merge collapse — optional follow-ups, taken last or never.
- The speculative architecture findings beyond their extracted surgical fixes (no new-module builds for note-creation, external-write protocol, sidebar resolution, or filter-mapping tables).
- Any new end-user features, the freeze investigation itself, and creating the missing domain-glossary file.

## Further Notes

- The plan file in this directory carries the per-item corrections (exact symbols, corrected ranges, test collateral, gates) and is the execution authority; when this spec and the plan disagree on a detail, the plan wins.
- Two documentation debts surfaced during synthesis and are folded into the program: the watcher is described by two active ADRs from different eras (the older one must be superseded as part of the watch-feature removal), and several doc surfaces enumerate the exact symbols this program deletes — each doc edit rides the commit that changes its subject.
- There is no curated domain glossary (the context file the domain docs point at was never created); this spec uses the de facto vocabulary from the project instructions and ADR decision statements.
- Both source audits were adversarially re-verified against the same clean HEAD on 2026-08-12; the overlap analysis re-verified the decisive claims a third time. Confidence in the conflict decisions is correspondingly high, but any item whose cited symbol has drifted by the time of execution must be re-checked before applying (deletions by symbol, never by stale line numbers).
