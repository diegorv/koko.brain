# Migration and prior decisions

Owner instruction: after completing the deep dive, create this group and mark replaced predecessors `wontfix`. Original bodies, comments, and decisions remain intact. No implementation is claimed by a status transition.

## Superseded active tickets

All links below identify exact files; numeric IDs alone are ambiguous across groups.

| Predecessor | Successor | Coverage disposition |
| --- | --- | --- |
| [open-itens 006 Kanban](../open-itens/issues/006-kanban-card-lane-title-being-edited-saved.md) | [05](issues/05-kanban-draft-publication.md) | Own-board draft preservation, blur/no-blur cases, navigation and exit; retain explicit Escape cancellation. |
| [open-itens 008 Properties no-op](../open-itens/issues/008-properties-panel-commit-that-changes-nothing-does.md) | [11](issues/11-properties-freshness.md) | Retain the accepted no-op case and include same-note intervening changes. |
| [open-itens 016 History baseline](../open-itens/issues/016-file-history-keeps-snapshot-pre-save-bytes.md) | [18](issues/18-history-baseline-retention.md) | First editor baseline, clean/closed deep-link overwrite, and approved keep-last retention policy. |
| [open-itens 019 External save](../open-itens/issues/019-every-tab-write-checks-disk-first-so.md) | [17](issues/17-preserve-observed-external-version.md) | Keep-both policy retained; honest observed-version guarantee and unresolved failure policy make readiness triage. |
| [open-itens 023 History target](../open-itens/issues/023-file-history-restore-writes-snapshot-into-note.md) | [09](issues/09-history-restore-target.md) | Guard-first approved scope, target/session ownership, current undo, and truthful failures. |
| [open-itens 063 Relative images](../open-itens/issues/063-standard-markdown-images-vault-relative-path-load.md) | [24](issues/24-relative-markdown-images.md) | Existing host-based vault-relative semantics; no new source-folder contract. |
| [open-itens 064 Completion](../open-itens/issues/064-wikilink-autocomplete-inserts-non-markdown-file-extension.md) | [23](issues/23-image-completion-extension.md) | Full non-Markdown filename, Markdown stem, aliases unchanged. |
| [open-itens 089 Mixed async writes](../open-itens/issues/089-keystrokes-typed-during-link-rewrite-type-rename.md) | [07](issues/07-backlink-rewrite-settlement.md), [08](issues/08-trash-save-boundary.md) | Link rewriting and deletion migrated. Watcher subsection is stale/fixed; modal-concurrent type typing is unproven. Both are explicitly retained in deferred dispositions. |
| [open-itens 093 Type rename](../open-itens/issues/093-type-rename-reports-partial-failure-also-updates.md) | [12](issues/12-type-yaml-and-partial-results.md) | Preserve exact YAML, creation, trailing-value recognition, continue-after-failure and toast/log policy; no rollback. |
| [open-itens 101 Path restore](../open-itens/issues/101-file-history-restores-into-board-view-closed.md) | [10](issues/10-history-restore-by-path.md) | Visual/closed-file restoration and missing-target refusal; still depends on target safety. |
| [open-itens 105 Mixed races](../open-itens/issues/105-minor-write-races-are-closed-autosave-during.md) | [11](issues/11-properties-freshness.md), [21](issues/21-vault-settings-isolation.md), [residual register](deferred.md#residual-scope-from-105) | Every residual subsection is accounted for rather than silently declared fixed or transferred into a severe ticket. |
| [open-itens 233 Collision numbering](../open-itens/issues/233-auto-organize-move-collision-numbers-the-note.md) | [19](issues/19-no-clobber-path-changes.md) | Ordinary numbering already delivered; retain broader one-path/self-identity/exclusion criteria and explicitly triage reopening the accepted race. |

## Dependency repairs

- [open-itens 099](../open-itens/issues/099-deep-link-prepend-append-daily-capture-closed.md) now points to 18 rather than the superseded 016.
- [open-itens 082](../open-itens/issues/082-failed-auto-move-tells-user-which-note.md) retains blocker 031. Its ordinary collision-numbering prerequisite was delivered in [vault-organization-v2 01](../vault-organization-v2/issues/01-move-collision-is-silent.md); exclusive rename is not required for its failure-toast work. Shared move-service files alone do not establish a new dependency on 19.
- Historical dependency fields in terminal predecessor tickets are retained as history. The new ledger expresses the active graph.

## Resolved history remains resolved

The delivered close-tab, Canvas close-flush, task preflight, composer draft, clipboard-menu, Todoist sync, and hidden-frontmatter keyboard tickets are provenance, not duplicate open work. Their status is not rewritten.

In particular, [open-itens 002](../open-itens/issues/002-keyboard-edits-next-hidden-frontmatter-never-change.md) explicitly excludes the hidden-input paths reproduced here. Ticket 20 requests a new policy. It must not be presented as failure to implement that original ticket.

## Existing wontfix decisions

[Archived deep-link 26](../archived/file-io-audit/issues/26-cross-vault-deep-link-dropped.md) remains `wontfix` and gains a link to reconsideration ticket 22. Its one-vault-per-session decision is preserved.

Archived root-link syntax and search-build isolation decisions are not silently reopened. See [deferred findings](deferred.md). The later switch-menu approval supplies context, not automatic authorization of unrelated policies.

## Scope retained outside this group

No parent PRD or unrelated feature ticket is closed. In particular, the broad shell-sidebars link-panel ticket remains with its current owner and acceptance. Parked TSV paste work, derived search-index races, and minor rendering problems are listed outside the runnable audit queue.
