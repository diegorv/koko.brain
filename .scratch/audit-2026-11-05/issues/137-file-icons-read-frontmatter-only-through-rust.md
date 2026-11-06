# 137: File icons read frontmatter only through Rust

**Migrated from:** `.scratch/architecture-stability/issues/70-icon-index-single-frontmatter-reader.md` (audit 2026-11-05). Priority: later (refactor, deferred, feature) (bucket 5-later). A refactor with the owner decision recorded (option A, 2026-11-05).

**Audit check at `5f8003d67`:** design_or_refactor (refactor, low). Two readers still exist at HEAD: buildFrontmatterIconIndex reads Rust entries (src/lib/features/file-icons/file-icons.service.ts:~199), while updateFrontmatterIconForFile (file-icons.service.ts:238-243) still parses raw text with extractIconFromFrontmatter / extractIconColorsFromFrontmatter (file-icons.logic.ts:130, :139). Owner chose option A on 2026-11-05; valid architectural work, not a defect on its own.

**What to build:** The frontmatter icon index (`fileIconsStore.frontmatterIcons`: `_icon`, `_color`, `_title_color`) has two readers that disagree. `buildFrontmatterIconIndex` reads what Rust parsed (`NoteEntryV2.frontmatter`), while the `file-icons` note-change consumer (`updateFrontmatterIconForFile`) parses the note's raw text in TypeScript on every save, debounced edit and watcher event. So an icon or color can show at vault open and change after a save, with no change to the file. Three review rounds on the file-icons fixes kept finding new shapes where the two differ, and each fix moved the disagreement instead of removing it.

Make Rust the only reader for this index, in line with "Vault metadata lives in Rust `VaultIndex`" (`CLAUDE.md`, Indexing & Watcher, rule 1): patch the index from the Rust entries the `vault-index-updated` listener already fetches through `get_index_delta` (Issue 65, `patchVaultEntries`), and delete the TypeScript reading of the raw text.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only, unless the discovery finds Rust must change: `pnpm check` + `pnpm vitest run` + `pnpm build`. E2E for the rail and file icon specs through `bash scripts/e2e.sh`.

- [ ] One reader: the `file-icons` note-change consumer no longer parses note text, and `extractIconFromFrontmatter`, `extractIconColorsFromFrontmatter` and their fallback are gone. `src/tests/lib/features/file-icons/` no longer holds a hand-written table imitating Rust's output.
- [ ] A test over the real store shows an icon and colors keep their value across vault open, a save and a watcher event, for frontmatter the `yaml` package rejects (`title: Meeting: Q3` next to `_icon: lucide:star`).
- [ ] A file edited outside the app (watcher path) updates its icon with no restart, and a removed `_icon` removes it.
- [ ] The Change icon dialog stays immediate, and a delayed index update cannot overwrite a color just picked with an older value.
- [ ] Folder notes: `X/X.md` still indexes under the directory `X/` too, on add, change and removal.
- [ ] `.view` files show the same icon and colors as today, aliases and rejected values included.
- [ ] A new note and a deleted note gain and lose their icon at the right moment, and `resetFileIcons` plus vault teardown leave nothing from the previous vault.

## Notes

- **Source:** owner decision on 2026-11-05, after the reviews of `fix/icon-review-fixes`: choose the single reader (option A) over a Rust parse command called per save (option B), which would keep a per-edit call to protect an immediacy the owner does not need.
- **Accepted cost:** editing `_icon` by hand inside the app appears after the throttled index refresh (about 2 s after an isolated event, at most 10 s in a burst; `tauri-listeners.service.ts`) instead of right after the save. The owner changes icons through the menu about 90% of the time. The other case they expect is an agent editing files outside the app, which goes through the watcher and Rust anyway.
- **To check in discovery, not yet verified:** the race in the fourth criterion (`setIconForPath` and `setIconColors` write the store directly); that `patchVaultEntries`'s windows cover this index, including the fallback to a whole-vault read over 200 paths or on a `fullRescan`; whether `.view` entries from Rust carry what `extractViewIcon` reads today, since Rust's line fallback and `extractViewIcon` differ on repeated keys; and whether `src/lib/app/lifecycle/watcher-handler.service.ts` and `note-change.service.ts` still need a call here once the consumer goes.
- **Consumers to keep working:** `resolveIconForPath` / `resolveIconForType` and everything reading them; `IconPicker` current values in `TypesNavigator`, `FilesNavigator`, `NoteRowMenu`.
- **Out of scope:** the Properties panel's own TypeScript parser (`parseFrontmatterProperties`), which `frontmatter-parity.test.ts` guards. It edits frontmatter as the user types, so it is a harder case; record any finding there separately.
- **Supersedes:** the low-severity save-time versus Rust disagreements left by the file-icons fixes (repeated keys mixed with aliases, `0x1F` and `.inf` scalars, wikilink values, escaped keys). They disappear with the reader.
- **Size:** M.

## Comments

- 2026-11-06: migrated from `.scratch/architecture-stability/issues/70-icon-index-single-frontmatter-reader.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
