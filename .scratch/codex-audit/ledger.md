# Ledger: codex-audit

No implementation has started. Ledger progress is `todo`; issue-file readiness remains authoritative for `relay pick`. Issues 16, 17, 19, 20 and 22 are `needs-triage` and cannot launch until their decisions are recorded.

## Issues

| # | Issue | Blocked by | Status | Branch / PR | Merged |
|---|---|---|---|---|---|
| 01 | [Preserve the final edit when closing a tab with a pending save](issues/01-close-pending-save.md) | none | todo | | |
| 02 | [Authorize exit only after the final accepted editor state is safe](issues/02-final-exit-save-boundary.md) | none | todo | | |
| 03 | [Save pending Canvas edits before exit or vault switching](issues/03-canvas-exit-publication.md) | 02 | todo | | |
| 04 | [Preserve unpublished Canvas edits during external reload](issues/04-canvas-external-reload.md) | none | todo | | |
| 05 | [Commit Kanban drafts to their own board before navigation](issues/05-kanban-draft-publication.md) | 03 | todo | | |
| 06 | [Preserve newer editor changes when task writes settle](issues/06-task-write-settlement.md) | none | todo | | |
| 07 | [Preserve typing and backlink updates during overlapping renames](issues/07-backlink-rewrite-settlement.md) | none | todo | | |
| 08 | [Preserve accepted edits when moving files or folders to Trash](issues/08-trash-save-boundary.md) | none | todo | | |
| 09 | [Never restore file history into another note](issues/09-history-restore-target.md) | none | todo | | |
| 10 | [Restore history into visual views and closed notes by path](issues/10-history-restore-by-path.md) | 09 | todo | | |
| 11 | [Preserve newer note properties across panel commits](issues/11-properties-freshness.md) | none | todo | | |
| 12 | [Preserve exact type names and report partial rename results](issues/12-type-yaml-and-partial-results.md) | none | todo | | |
| 13 | [Preserve newer composer drafts when earlier saves finish](issues/13-composer-draft-ownership.md) | none | todo | | |
| 14 | [Recover remote task completion after a duplicate-anchor freeze](issues/14-todoist-frozen-completion.md) | none | todo | | |
| 15 | [Cancel a pending menu paste when its editor target changes](issues/15-clipboard-paste-target.md) | none | todo | | |
| 16 | [Define and enforce external-change protection for task writes](issues/16-task-external-write-contract.md) | none | todo | | |
| 17 | [Preserve an observed external version before autosave replaces it](issues/17-preserve-observed-external-version.md) | none | todo | | |
| 18 | [Keep a recoverable pre-save baseline and each note's last snapshot](issues/18-history-baseline-retention.md) | none | todo | | |
| 19 | [Prevent colliding moves and renames from replacing notes](issues/19-no-clobber-path-changes.md) | none | todo | | |
| 20 | [Decide whether to protect hidden metadata from implicit input](issues/20-hidden-frontmatter-policy.md) | none | todo | | |
| 21 | [Keep settings isolated when vault initialization is superseded](issues/21-vault-settings-isolation.md) | none | todo | | |
| 22 | [Reconsider reliable deep-link delivery across vault switches](issues/22-cross-vault-action-policy.md) | none | todo | | |
| 23 | [Preserve non-Markdown extensions in wikilink completion](issues/23-image-completion-extension.md) | none | todo | | |
| 24 | [Load relative Markdown images through the vault asset host](issues/24-relative-markdown-images.md) | none | todo | | |
| 25 | [Preserve pre-write history for append, daily capture and closed-note metadata writes](issues/25-history-baseline-other-writers.md) | 18 | todo | | |

## Log

- 2026-11-25 — Published 24 audit tickets; no implementation started.
- 2026-11-25 — Corrected relay metadata and ledger schema; preserved issue readiness and dependency chains.
- 2026-11-25 — Migrated open-itens/099 to 25 at the owner's request; predecessor wontfix, successor ready-for-agent and blocked by 18. Total: 25 issues, 20 ready and 5 triage.
