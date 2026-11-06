# 138: File icon saves that cannot happen tell the user, and clicking the current icon writes nothing

**Migrated from:** `.scratch/architecture-stability/issues/71-icon-save-edge-cases.md` (audit 2026-11-05). Priority: later (refactor, deferred, feature) (bucket 5-later). Low-severity edge cases. The Issue says to do it after 70, because 70 changes case 1's symptom.

**Audit check at `5f8003d67`:** still_present (corner, low). Case 1: removeFrontmatterIcon returns true without writing when parseFrontmatterProperties yields no icon keys for a block yaml rejects (src/lib/features/file-icons/frontmatter-icon.service.ts:84-90), and removeIconForPath then drops the store entry (file-icons.service.ts:173-177). Case 3: extractViewIcon uses a plain parseYaml (file-icons.logic.ts:190-200), so a repeated key yields null. Case 4: updateViewIconYaml casts parseYaml to a record with no non-mapping guard (src/lib/features/type-definitions/type-sidebar.logic.ts:533-542), unlike updateViewColorsYaml (:553-561). Case 2 not re-run; the no-op guard at type-sidebar.logic.ts:521-531 compares against extractViewIcon's canonical name, consistent with the Issue's description.

**Stale in the text below:** No line numbers in the Issue; nothing stale. Still depends on the Issue 70 decision for case 1.

**What to build:** The reviews of the file-icons fixes (`9daad1a04`, `c5d24d748`, `6dba1e8d9`) left a few low-severity cases that are about writing, not about which reader parses frontmatter, so Issue 70 does not remove them. All were reproduced or traced by reviewers, none on a real vault:

1. **Remove on invalid frontmatter looks like success:** `removeFrontmatterIcon` (`src/lib/features/file-icons/frontmatter-icon.service.ts`) sees no properties in a block `yaml` rejects, returns true without writing, and the store drops the icon. The file keeps `_icon`, no toast shows, and the icon returns on the next save.
2. **Clicking the highlighted icon rewrites the file:** on a `.view` holding an old Lucide spelling (`# c\n_icon: lucide:trash2\n`), the grid highlights it as current and hands back the canonical name, so the guard in `updateViewIconYaml` sees a change and the comment is lost.
3. **`.view` with a repeated key:** `extractViewIcon` uses a plain parse, so `_color: red\n_color: blue\n_icon: star` yields null where Rust's last wins, and a picked color is dropped with no write and no toast. A two-document `.view` does the same.
4. **`.view` that is not a mapping:** `updateViewIconYaml` has no non-mapping guard, unlike `updateViewColorsYaml`, so picking an icon on `- a\n- b\n` saves nothing with no message.

**Blocked by:** 137

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Each case has a failing test first, through the real stores and logic.
- [ ] A save that cannot happen tells the user, as other refused frontmatter writes do (`toastFrontmatterWriteError`), and leaves the store matching the file.
- [ ] Clicking the icon a file already resolves to writes nothing.

## Notes

- **Source:** the three review rounds on `fix/icon-review-fixes`, 2026-11-05.
- **Check first:** Issue 70 may change case 1's symptom, since the icon would then come back from Rust's index rather than from a TypeScript read. Do this one after deciding on Issue 70, or confirm it still applies.
- **Also noticed, unverified:** the Octicons pack loaded 0 icons under vitest, possibly the same silent-empty class of bug the Lucide loader had. Check the picker's Octicons tab in the app; if it is empty, file it separately.
- **Out of scope:** `_title_color` palette names skipping theme tokens, left as is by the owner's review. Save-time versus Rust parse disagreements belong to Issue 70.
- **Size:** S.

## Comments

- 2026-11-06: migrated from `.scratch/architecture-stability/issues/71-icon-save-edge-cases.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
