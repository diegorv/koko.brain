# Scoping examples to their folder

These examples get copied into real vaults. A query that reads the whole
vault then lists every personal note, or freezes the app on a large vault.
Every query in `help/examples/` reads only its own example folder, or caps
its rows with an explicit limit. The guard test
`src/tests/help/examples-scoping.test.ts` enforces this.

Paths in the index are absolute (`file.folder` is the parent folder's
absolute path), so a scope is either derived from the note that runs the
query or matched by the example folder's name.

## QueryJS (`queryjs` blocks and `kb.view()` scripts)

Derive the folder from the note that runs the block. Inside a `kb.view()`
script `kb.current()` is still the calling note.

```js
const here = kb.current().file.folder;
const pages = kb.pages(`"${here}"`); // this folder and its subfolders
```

For a note one level below the example root:

```js
const root = kb.current().file.folder.split('/').slice(0, -1).join('/');
const pages = kb.pages(`"${root}"`);
```

Narrow further with `.where(...)` or `.whereTag(...)` on the result; a tag
source alone (`kb.pages('#project')`) is not a scope. `kb.ui.*` helpers only
render the data they are given.

Gotchas:
- Do not fall back to an empty folder (`kb.current()?.file.folder ?? ''`):
  `kb.pages('""')` is not a folder source and returns every page.
- The folder source matches by substring, so `/x/notes` also matches a
  sibling `/x/notes-old`.

## Collection blocks, `.collection` and `.view` files

Gap: a filter cannot refer to the note or file that holds it, and
`file.inFolder("name")` compares against the absolute folder, so a relative
name never matches. The closest scope is the example folder's name:

```yaml
filters:
  and:
    - 'file.folder.contains("/collection-features")'
views:
  - type: table
    name: Projects
```

Use `file.path.contains("/collection-features/")` to include subfolders.
This breaks if the folder is renamed and matches any other folder with the
same name. Where a view must stay vault-wide, give it a `limit:`.

## Type definitions (`_types/*.md`)

Gap: a type definition has no filter; the type sidebar lists every note
whose `type` matches, across the vault, and type names are global. Example
types merge with the vault's own types of the same name. A `.view` file
with a filter is the scoped alternative (see above).

## Auto-move rules (`auto-move-rules.json`)

Rules run on every note in the vault. Scope the expression by folder name
and make the destination relative to the note with `{folder}` or
`{parent}`:

```json
{
  "name": "Move recipes to Cooking folder",
  "expression": "file.hasTag('recipe') && file.folder.contains('/auto-move-features')",
  "destination": "{parent}/Cooking"
}
```

For a note in `auto-move-features/Inbox/` this moves it to
`auto-move-features/Cooking/`.

## Kanban, canvas

Nothing to scope: a board reads only its own file and a canvas only the
files it embeds.

## Search

Scope a search with the `path:` operator, which matches notes whose path
contains the text: `standup path:search-types`.

## Guard

The guard test scans `queryjs` / `dataviewjs` blocks and `.js` scripts that
call `kb.pages` / `kb.pagePaths`, every view of `collection` blocks,
`.collection` and `.view` files, and every auto-move rule. A site passes
with a folder source, a `file.folder` / `file.path` predicate or a limit.
Files not yet scoped are in its allowlist, each naming the issue that
scopes it.
