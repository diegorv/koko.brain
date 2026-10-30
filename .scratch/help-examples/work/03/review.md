VERDICT: CHANGES_REQUESTED

# Review: Issue 03, scope markdown-editor-vault and live-preview-regressions examples

Scope: `git diff main...HEAD` (44fe3eae, 09fdfe2b, 63ccf4fb, 6c0a35ca). The diff changes
`help/examples/markdown-editor-vault/{20,22,23,24}-*.md`, drops four allowlist entries from
`src/tests/help/examples-scoping.test.ts`, and adds the discovery note and Issue comments. No `src/lib`
code changes.

Test verdict rests on:
- `src/tests/help/examples-scoping.test.ts`. I ran it myself: 15/15 pass.
- A throwaway probe (`src/tests/help/zz-review-probe.test.ts`, deleted after the run, worktree
  clean). It parses every `collection` block in 20 and runs `executeQuery` on each view. It runs every
  `queryjs` block in 22, 23 and 24 through a real `KBAPI`, wrapped the way
  `queryjs-block-widget.ts:199-202` wraps them. The fixture holds notes in the example folder, in
  `collection-features/` and `queryjs-features/` subfolders, in `/v/personal/` and at the vault root.
  For QueryJS blocks the probe also ran the `main` version of each block for comparison.
- `pnpm check`: 0 errors, 0 warnings (211 files).
- I did not run the full gate.

## Acceptance criteria

- [x] **`24-queryjs-advanced.md` section 4 counts only notes in the example folder.**
  Met. Line 116 is ``kb.pages(`"${kb.current().file.folder}"`)``. Probe result: "All Items by Status (4)",
  listing only the notes in the folder and its subfolders. The `main` version listed the personal notes.
  `kb.current()` is the active tab (`queryjs-block-widget.ts:191`), and its `file.folder` is the absolute
  parent path (`collection.logic.ts:31-32`). `parseSource`'s substring match
  (`queryjs.logic.ts:188-192`) therefore scopes to the folder plus its subfolders. It also scopes to any
  sibling folder whose name extends this one, which is the SCOPING.md gotcha.
- [x] **Every collection block in `20-collection.md` is scoped to the folder.**
  Met. All 16 blocks that parse carry `file.folder.contains("/markdown-editor-vault")` at the top level
  or as an `and:` branch. That includes the limited section 10 and the nested `or:` (section 5) and
  `not:` (section 6) groups. Probe result: no view returns a personal or root note. Section 5 returns
  in-folder bugs and meetings only. Section 6 drops the in-folder `pessoal` note. Section 20 returns 0.
  The 4 error demos (16-19) fail `parseCollectionYaml` and render only an error.
- [x] **Allowlist entries for these folders removed.**
  Met. The four `markdown-editor-vault/*` entries are removed (`examples-scoping.test.ts:42-45` on main).
  `live-preview-regressions` never had any. Its only query is a `queryjs` fence nested in a ````md fence
  (`06-fenced-code.md:12-16`); it does not run and reads nothing. The guard skips nested fences.
- [x] **Every file in the folder reviewed.**
  Met for reads. Files 01-19 and 21 hold no `kb.`/`dv.`/`collection` reads. `19-meta-bind.md` section 14
  holds a `createNote` button that writes `Inbox/Nova Ideia.md` at the vault root (finding 4). It is a
  write, not a read, and does not violate any criterion.
- [x] **No regressions in the blocks.** The probe ran 37 QueryJS blocks. None raises a new error. The
  three that throw (22:339 syntax demo, 22:326 `isso_nao_existe`, 24:517 `crash`) are intentional error
  demos and are unchanged from `main`.

## Findings

1. **Medium: the expected-result notes and headings still say "vault", which this change made wrong.**
   The blocks now read only this folder, but the notes a manual tester checks against still describe
   vault-wide results. In one place the diff changed the output string and left the note under it:
   `24-queryjs-advanced.md:562` now prints "Total folder size", while its ESPERADO at `:575` still says
   "Total vault size em KB". The other stale lines are:
   - `20-collection.md:31` ("as notas do vault")
   - `22-queryjs.md:21` ("cada nota no vault")
   - `22-queryjs.md:223`, the heading "Tasks Pendentes de Todo o Vault"
   - `22-queryjs.md:235` ("TODAS as tasks ... do vault")
   - `23-queryjs-real-scripts.md:37`, `:243`, `:245`
   - `23-queryjs-real-scripts.md:332`, the output string "nao encontrado no vault": the lookup now searches only this folder
   - `24-queryjs-advanced.md:13`, the heading "Resumo do Vault"
   - `24-queryjs-advanced.md:178`, `:701`

   The user's CLAUDE.md §8 says: "When you change code, update or delete the comments it made wrong."
   Fix: reword each line to "desta pasta" / "this folder". Keep "vault" where it really means the vault
   root, as in the `__system/queryjs` script lines 64, 74 and 153 of 23.

2. **Low: in the shipped help vault, most data-driven sections now render empty until the user copies data in.**
   In the `help` vault, 20 sections 2-7, 11 and 14, 22 sections 3, 4 and 11d, 23 sections 1, 2, 4 and
   9, and 24 sections 2, 3 and 8 used to show rows from the sibling `collection-features/` and
   `queryjs-features/` folders. They now show nothing until those folders are copied into this one. The
   headers say so (`20-collection.md:5-7`, `22-queryjs.md:5-6`, `23-queryjs-real-scripts.md:5-8`,
   `24-queryjs-advanced.md:5-6`), and the Issue allows "say so at the top of the note". The examples
   still behave the same as their own vault and nested, which is the Issue's goal. The default is
   recorded in discovery.md. Fix: no code change. Name this trade-off and the alternative (small data
   notes inside `markdown-editor-vault/`) in the closing commit so the owner can decide.

3. **Low: the gaps must go into the closing commit, as the Issue requires.**
   - `23-queryjs-real-scripts.md` sections 3 and 5 load `kb.view("__system/queryjs/...")` from the vault
     root. The header at `:8` tells the user to copy `__system/` to the vault root. That installs
     `meeting-list.js`, which is still unscoped and allowlisted for issue 02 (`kb.pages()` at
     `queryjs-features/__system/queryjs/meeting-list.js:13`).
   - The collection filter depends on the folder name: a rename breaks it, and a
     `markdown-editor-vault-old` sibling also matches.
   - The folder source matches by substring.

   The build report says the closing commit will carry these. Fix: list all three in the deliver
   step's closing commit.

4. **Low (informational, out of scope): `19-meta-bind.md:199-207`, section 14 `createNote` with `folderPath: Inbox`.**
   Clicking the button creates `Inbox/Nova Ideia.md` at the vault root, outside the example folder. It
   is a write, not a read, so it is outside this Issue's criteria and the guard. Fix: none required
   here. Mention it in the closing commit if the owner wants example writes scoped too.

## Not checked

- I did not open the examples in the running app. The probe exercises the real `KBAPI` and
  `executeQuery`, but not CodeMirror rendering or the row cap.
- The query result cache is keyed by block content (`queryjs-session.store.svelte.ts:37`). If an
  identical scoped block exists in another folder, it could be served that folder's result until the
  next save. I did not find such a duplicate. This is a property of the issue 01 pattern, not of this
  diff.

## Resolution

1. Fixed: the 12 stale lines in 20, 22, 23 and 24 now say "desta pasta" / "nesta pasta" (24:575 says "Total folder size", matching its output). Lines that mean the vault root (23:8, 63, 64, 74, 81, 153 for `__system/queryjs`, and "Abra ESTE arquivo no vault") are kept.
2. Accepted, no code change: the empty-until-copied trade-off and the alternative (small data notes inside `markdown-editor-vault/`) are named in the closing commit.
3. Accepted, no code change: the three gaps are listed in the closing commit.
4. Accepted, no code change: the `createNote` write to `Inbox/` at the vault root is mentioned in the closing commit.
