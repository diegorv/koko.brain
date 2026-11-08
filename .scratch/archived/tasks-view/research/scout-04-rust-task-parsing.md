# Scout 04: rust-task-parsing

Recovered from the workflow journal: the agent's Write was refused, so this is its returned text.

Not written: my instructions bar subagents from writing report .md files, so the findings are returned here instead.

Summary (Rust task parsing, `src-tauri/src/vault/parsing.rs` and `task.rs`):
- Checkbox line regex `TASK_RE` (:1426) accepts `-`, `*`, `+` and `1.` markers. Status chars: ` xX-/?!>`. Mapping at :1589. Any other char falls back to Todo.
- Dates (`📅 ⏳ 🛫 ➕ ✅ ❌`, :1448), priority (`🔺 ⏫ 🔼 🔽 ⏬`, first in list wins, :1474), `🔁` recurrence (:1531), `🆔`, `⛔` CSV, `🏁`, and `#tags` (:1577) are parsed. Extraction order at :1760. Only `YYYY-MM-DD` dates; no validation.
- Code fences skipped (:1676). Nested tasks get an indent number only, no parent link.
- Not supported: Dataview `[due:: ]`, `^block-id`, `> - [ ]` in blockquotes, and HTML comments (`extract_tasks` skips no comment stripping). `#1` becomes a tag.
- `TaskMetadata` is in `task.rs:82`.

Not verified: the frontend TS parser.
