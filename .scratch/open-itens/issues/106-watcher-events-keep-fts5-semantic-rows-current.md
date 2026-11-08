# 106: Watcher events keep FTS5 and semantic rows current, and a read error is not treated as a delete

**Origin:** `audit-2026-11-05` Issue 157, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Split from Issue 124 on 2026-11-06: the owner kept only its cheap part in the first wave. Read Issue 124 first; its Details and evidence apply here. Its sections "Read error on an existing note is treated as a delete", "Self-save skip drops a real external write", "Bulk external change (>10 .md files) never refreshes FTS5 or semantic rows" and "Folder rename or move drops the moved notes from FTS5 and semantic search".

**Blocked by:** 020

**Status:** needs-triage

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`.

- [ ] Triage writes criteria for each section before this runs; each section names its red test in Issue 124.

## Notes

- The read-error kind changes a ts-rs-exported IPC DTO; follow the indexing-watcher rules.

## Comments

- 2026-11-06: split off by the owner after the first-wave challenge review (`raw/first-wave-challenge.json`).
