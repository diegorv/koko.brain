# 14: Normalize a create-note target before its gates run

**What to build:** `createTargetProblem` (`src/lib/features/auto-organize/auto-organize.logic.ts:361-376`) checks the raw resolved target. A `.` segment or a doubled slash slips past the protected-folder check, and the file system then resolves it into the protected folder. For example, `./_system/x.md` does not start with `_system/`, so a rule creates a note inside `_system/`. A `{variable}` from a note's frontmatter can bring in the same shape. Normalize the target first, then run every gate on the normalized path, and create the note at exactly that path.

Found by the automated security review of Issue 09's squash (`a58f6b696`) on 2026-11-11. Severity is low: the note is created inside the vault, only when it does not exist yet, and `..` is already refused. But it breaks PRD Decision 10's gates.

**Blocked by:** 11

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

### Behavior

1. **A pure `normalizeVaultRelativePath(target)` helper** in `auto-organize.logic.ts`:
   - split on `/`, and drop empty segments and `.` segments;
   - return null when any segment is `..`;
   - join the rest with `/`.
2. **`createTargetProblem`** normalizes first. A null result is "leaves the vault". The protected-folder check, the excluded-folder check and the file-name check all use the normalized path.
3. **Same path for the file system.** The service passes the normalized path, not the raw one, to the folder creation and to `createFile` (`auto-organize.service.ts:405`). It also uses it for the in-flight set and the existence check (Issue 09, amendment 2). A target and its `./` twin are then the same target.
4. **Rename (Issue 11):** if its delivered code builds a path from a template, check that it already refuses `/`, so it cannot create these shapes. If it does not, apply the same helper.
5. **Move destinations** (`resolveDestination`) are out of scope. Open-itens Issue 096 tracks `..` in destinations.

### Acceptance

- [ ] Failing test first, in `auto-organize.logic.test.ts`: `createTargetProblem('./_system/x.md', '/vault', ['_system'], [])` returns `inside _system/`. It returns null today.
- [ ] `_system//x.md`, `a/./../x.md` and `./Excluded/x.md` (with `Excluded` excluded) are refused.
- [ ] `notes/./x.md` is accepted and normalized to `notes/x.md`.
- [ ] A service test: a create rule whose target is `./notes/x.md` creates `/vault/notes/x.md`. A second rule with `notes/x.md` in the same run does not create a second note.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Notes

- Ordered after 11, because 11 edits the same file; 12 now waits for 14.

## Comments
