# Unify `.collection` into `.view`

`.view` and `.collection` share one YAML format and one editor. The extension decides three things that should be properties or one rule: whether a file is in the menu, how it opens, and which rows it may list. A review on 2026-11-05 also found that a `.view` is indexed as if it were a note, which is the root of most `.view` bugs.

This feature retires `.collection` and leaves one file kind, `.view`. It fixes the existing `.view` bugs first, then removes `.view` from every note surface, then unifies.

## Owner decisions (2026-11-05)

**One file kind**
- `.collection` is retired. There is **no migration code and no conversion**: once Issue 23 ships, a `.collection` opens as plain text. Convert to view is removed. The owner migrates by hand: rename to `.view` and add `_visible: false` and `_open_in_editor: true`.
- Where a view shows and how it opens are properties: `_visible`, `_open_in_editor`.
- The folder menu's New Collection becomes **New table**. It writes `Untitled.view` with both keys. New view stays.
- A hidden table reaches the menu through a **Show in Views** row item, which removes both keys.

**A `.view` is not a note.** It stays in the Rust `VaultIndex`, because menus read it there, and leaves every note surface:

| Surface | `.view` |
|---|---|
| Text, semantic and hybrid search, embeddings, `tag:` / `path:` queries | Out |
| Wikilinks | Never a target, never a source. YAML creates no backlink |
| Graph, tags, tasks, unlinked mentions | Out |
| Property suggestions in filter, sort and column pickers | Out |
| Favorites, people rows | Out |
| Auto Move | Never moves a view |
| Rows of a view or an inline block, `kb.pages()` | Out |
| Types > Views | Unless `_visible: false` |
| Palette Open view | Unless `_visible: false` |
| Rail pin | With `_rail: true`, whatever `_visible` says |
| Files navigator, Quick Switcher | In. The switcher matches the file name only |
| `kb.page("x.view")` | Keeps working, so property records stay |

**Links**
- A click on `[[Projects]]` where only a view has that name creates `Projects.md`, like any unresolved link.
- A note opens a view through a new `openView` meta-bind button action (Issue 16). It takes a vault-relative path, behaves like a click in the menu, and shows an error if the view is gone. References are not rewritten on rename.
- A `[[Foo]]` written in a view's YAML is not rewritten on rename.

**Row rule**
- Type definitions, system-folder notes and `.view` files are always out, in views and inline blocks.
- Archived notes are out by default. A filter citing `archived` or `_archived` takes control.
- A new note reaches a view's rows after the entries refresh, about 2 s and up to 10 s in a burst. This is accepted. A false "0 results" while entries load is not.

**Writes**
- A toolbar write sends only the key it changed. If that key changed on disk since it was read, the write is refused and the toolbar shows the file's value.
- A view writer waits for a tab save in flight on that path.
- `_rail_view` wrong-name marks stay and are validated against the parsed file.
- A picked or pinned view follows a rename. The owner approved changing the test that pins the old behavior (`lens.logic.test.ts:1620`).

**Left as they are**
- A pin whose `_rail` is removed by hand stays until the next vault open.
- The Edit view dialog keeps writing the filters it opened with.
- The owner runs the search eval after delivery. It does not block merge.

## Order

1. Issues 01 to 11: bugs that do not wait for the unification.
2. Issues 12 to 18: `.view` leaves the note surfaces.
3. Issues 19 to 21: the row rule.
4. Issues 22 to 24: unification and cleanup.

Issue 25 is unrelated to views and came out of the same review.

## Evidence

Everything here comes from reading code: 30 Haiku scouts and 5 Opus validators, then 4 Opus deep dives and 3 Opus refuters. Nothing was run. Line numbers are from `4e382ea1e` and will drift. Each Issue starts with a failing test, and a failing test that does not fail is a finding to report, not something to patch around.
