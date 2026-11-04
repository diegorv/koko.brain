# 11: A type name typed in lowercase is normalized, so it never splits into two rows

**What to build:** New type and Rename type store the type name the way the index groups notes: first letter uppercase, rest as typed (the rule `normalize_type_casing` applies in Rust). Typing `book` creates the type `Book` (definition `Book.md`, label `Books`), so notes created from it land in the same Types row with its icon, folder, template and pills. Renaming a type matches notes by the normalized old name, so notes written `_type: book` are rewritten too. Type metadata is keyed by the normalized name, so an existing definition named `book.md` still attaches to the `Book` row.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: `validateTypeName` / the New type path given `book` produces the name `Book` (logic test)
- [ ] `buildTypeMetadataMap` keys a definition entry titled `book` under `Book` (logic test)
- [ ] The Types navigator shows one `Book` row, with the definition's icon, for a vault with `book.md` (definition) and notes with `_type: book` and `_type: Book` (component test, real row builder)
- [ ] Rename type from `book` passes the normalized old name and rewrites notes with `_type: book` and `_type: Book` (Rust test on `rename_type` / `rewrite_type_in_frontmatter`, plus the TS call site test)
- [ ] The duplicate check treats `book` and `Book` as the same name (logic test)

## Notes

- **Cause (traced):** `features/type-definitions/type-definitions.logic.ts:96-100,157-166` accept and key by the raw name (`entry.title`), while Rust derives `is_a` with `normalize_type_casing` (`src-tauri/src/vault/parsing.rs:83-93`) and the rename command matches the literal old name (`src-tauri/src/commands/vault.rs:397-401`).
- **Main-session decision:** normalize silently (no error) and show the normalized name in the dialog preview; do not rename existing `book.md` files on disk.
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F69.
- **Size:** S.

## Comments
