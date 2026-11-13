# 02: Mod writes find open tabs by normalized path

**What to build:** `ctx.vault.write` refuses to overwrite a note that has unsaved edits in an open tab, and syncs the written text into that tab, even when the tab's path and the mod's path are spelled differently. Today both look the tab up with an exact string match (`mod-vault.service.ts`, write and `syncExternalContentToEditor`). A periodic-notes folder with an edge slash (`Daily/`) opens tabs under a path with `//`, while mods pass the normalized path, so the guard misses and unsaved edits can be overwritten. On a case-insensitive disk, a path that differs only in case misses the same way.

**Blocked by:** none

**Status:** needs-triage

Not triggered by the current vault settings (the daily folder is `vault/notes`). Follow `docs/agents/indexing-watcher-rules.md`. Source: mods review finding H4 (`kokobrain-mods-src/.scratch/mods-review/report.md`); the mods side already normalizes in mod-core `editNote`.

- [ ] Tests: a dirty tab opened under `Daily//2026-11-08.md` blocks a mod write to `Daily/2026-11-08.md`; a clean one receives the synced text.
- [ ] The case-only difference is handled the way the editor already identifies files on a case-insensitive volume, or the decision not to is recorded here.
