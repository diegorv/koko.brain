# 25: A case-only rename is refused on a case-insensitive volume

**What to build:** Renaming `tasks` to `Tasks` shows `"Tasks.md" already exists in this folder` and renames nothing (`fs.service.ts:284`). On APFS, the existence check finds the file being renamed. This is not specific to views: it affects notes, views and folders.

Treat a target that differs from the source only by case as not taken, and make sure the rename reaches the disk on a case-insensitive volume.

**Blocked by:** none

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus Rust if the fix reaches `rename_note`.

- [ ] Reproduce in the app first. The behavior was inferred from a repo comment and the volume's case handling; `tauri-plugin-fs` `exists()` on a case-only path was not executed.
- [ ] A case-only rename of a note, a view and a folder works, and tabs, links and the index follow.
- [ ] A rename onto a truly different existing file is still refused.

## Notes

- Found by the view review on 2026-11-05, out of its scope. `needs-triage` until reproduced.
- **Size:** S.
