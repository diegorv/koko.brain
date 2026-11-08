# 25: Deep-link overwrite can replace .kokobrain files, and name=. writes outside the vault

**Status:** wontfix

**Blocked by:** none
Priority: P2
Severity: security
Source: file I/O audit, deep-dive group(s) o03-deep-link (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Deep-link overwrite can replace any vault file, including .kokobrain trash manifest and settings.json, without confirmation

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity security)
- Claims covered: feature-writers-9, recovery-7

**How a user hits it.** Any local process (open kokobrain://...), or a browser page once the scheme is allowed, sending new&overwrite=true&file=.kokobrain/... No user action in the app.

**Recoverable from.** Notes: File History if saved in the app in the last 7 days. App JSON (.kokobrain/*.json): none.

**Root cause.** src/lib/features/deep-link/deep-link.service.ts:292-306 together with src/lib/utils/path.ts:46-50

**Evidence.** resolveFilePath keeps the path in the vault, but a segment with a dot is not suffixed with .md, so .kokobrain/trash/trash-manifest.json resolves as is. The overwrite branch writes unconditionally, and resolveAndDispatch/handleDeepLinkUrl (:118-169) has no confirmation. capabilities/default.json allows write-text-file on kokobrain-vaults/** and **/.kokobrain/**. The downstream effects in recovery-7 (orphaned trash, settings reset) were not verified here.

**Repro test.** `.scratch/file-io-audit/repro/o03-deep-link/deep-link-path-safety.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected '[]' to be '[{"id":"1"}]' (overwrite refuses to rewrite app-owned files under .kokobrain)
```

**Fix sketch.** Reject deep-link write targets under .kokobrain (and dot-dirs) and non-markdown extensions. Optionally confirm before overwriting an existing note.

## Deep-link name that normalizes to the vault root (name=.) writes <vault>.md outside the vault

- Verdict: CONFIRMED_BY_TEST (deep dive priority P3, severity security)
- Claims covered: feature-writers-10

**How a user hits it.** Needs a crafted URL such as kokobrain://new?vault=Work&name=.&silent=true. The escape is limited to a sibling .md inside kokobrain-vaults (static fs scope; no runtime scope grants exist).

**Recoverable from.** none for an overwritten sibling <vault>.md, which rarely exists

**Root cause.** src/lib/utils/path.ts:41-50

**Evidence.** normalizePath('/…/Work/.') returns '/…/Work', which equals base and is accepted at :41. The last segment has no dot, so :47-49 returns '/…/kokobrain-vaults/Work.md'. The silent branch (deep-link.service.ts:309-315) writes it. $HOME/kokobrain-vaults/** allows it, and no allow_directory/allow_file exists in src-tauri/src.

**Repro test.** `.scratch/file-io-audit/repro/o03-deep-link/deep-link-path-safety.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected [ '/Users/me/kokobrain-vaults/Work.md' ] to deeply equal []; AssertionError: expected false to be true (resolveFilePath(VAULT,'.') under VAULT/)
```

**Fix sketch.** In resolveFilePath, reject normalized === base (require startsWith(base + '/')).

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/078-deep-link-names-resolve-safely-md-added.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
