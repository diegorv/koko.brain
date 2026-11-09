# 06: "Todoist: Sync now" pulls every project and its open tasks into project notes

**What to build:** With sync enabled, the palette command "Todoist: Sync now" creates one note per Todoist project in the sync folder (Inbox as `Inbox.md`) and writes each open task as an anchored line. Running it again changes nothing. Pull only: nothing goes to Todoist yet. Design: `.scratch/todoist-bisync/research/design.md` rules 1, 3, 8, 9, 10, 11, Project model, Anchor.

**Blocked by:** 04, 05

**Status:** ready-for-agent

- [ ] Failing tests first with the fake `/sync` from ticket 05 and real stores.
- [ ] Context filter (design rule 8c): only open tasks carrying this vault's context label (`Work` for a `work` vault, `personal` for a `personal` vault, case-insensitive) are adopted; others are skipped. Test: a work vault and a personal vault on the same fake account each get only their own tasks and only the project notes that hold them.
- [ ] Project note: filename = project name (illegal filename characters cleaned, collision gets a numeric suffix), frontmatter `todoist_project: <id>`; identity is the frontmatter id. The Inbox project (`inbox_project: true`) is `Inbox.md`. Parent projects ignored (flat).
- [ ] Pulled open task line: `- [ ] <content> <priority emoji> 📅 <date> 🔁 <due.string> #labels 🆔 td-<todoist id>`, only fields that exist. Labels per rule 8 (whole-name tag match; unmapped kept in `remote_base`). Content that fails ticket 02's round-trip check is written as-is but logged and flagged so later tickets never push it back.
- [ ] Inserted at the end of the project note (sections come in ticket 12) through the writer from 04. Bases (`local_base`, `remote_base`) and the `sync_token` committed together.
- [ ] Shared vault scan used by every later cycle: reads tasks with `get_all_tasks_v2` plus open-tab content (ticket 04's read helper), applies the scope exclusions from ticket 02, builds the anchor occurrence map; duplicated anchors freeze their link (logged).
- [ ] Re-running inserts nothing and rewrites nothing unchanged.
- [ ] Rebuild mode (rule 1): empty link table with anchored lines or remote items present -> pair by `td-<todoist id>` (and by a description `kokobrain:` line, see ticket 10), create nothing, log unmatched.
- [ ] Safety (rule 9): refuses before the index is ready; captures the vault path at start and rechecks it before every write; a vault switch mid-cycle writes nothing to the new vault.
- [ ] Gate: frontend, or Both if IPC changes.

## Notes

- Size: M.
