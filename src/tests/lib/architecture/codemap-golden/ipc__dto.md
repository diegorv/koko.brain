# ipc dto: one line per Rust type exported to TS by ts-rs
cols: dto dto:<Name> | rust <loc> | ts <file> | returned-by <ipc ids> | arg-of <ipc ids> | contains <dto ids> | in <dto ids> | used-by <module>(<n>) | e2e <locs> | doc <text> · grep: grep -F -- 'dto dto:<Name> ' codemap/ipc/dto.md
dto dto:TagAggregate | rust src-tauri/src/commands/notes.rs:9 | ts src/lib/contracts/generated/TagAggregate.ts | returned-by ipc:get_tags | arg-of - | contains - | in - | used-by src/lib/contracts(2) | e2e e2e/mocks/tauri-core.ts:1 | doc A tag with its note count.
