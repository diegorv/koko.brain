# 09 discovery: templates point at the queryjs folder that exists

## Which side is wrong
- Templates call `kb.view("_system/queryjs/<name>")` (one underscore), 11 sites:
  `help/examples/templates/Daily Note.md:29`, `Weekly Note.md:37,42`, `Monthly Note.md:45,50`,
  `Quarterly Note.md:45,50`, `Yearly Note.md:48,53,60,65`. `One on One.md`, `Quick Note.md` have no queryjs.
- Every other `kb.view()` in `help/` uses `__system/queryjs/` (queryjs-features notes, triada, SCOPING.md),
  and both script folders are `help/examples/{queryjs-features,triada}/__system/queryjs/`.
- All 11 scripts the templates name exist in `queryjs-features/__system/queryjs/`.
- So the templates are wrong: change `_system/queryjs/` to `__system/queryjs/`. No script moves.

## Note created from a template
- `createFileFromTemplate` -> `openOrCreateNote` -> `processTemplate` (`src/lib/utils/template.ts:22`) only
  rewrites `<% %>`; queryjs blocks pass through unchanged.
- `KBAPI.resolveScriptPath` (`src/lib/plugins/queryjs/kb-api.ts:439`) joins the path to the vault root, so the
  note's own folder does not matter. A created note finds its scripts when `__system/queryjs/` sits at the vault
  root, the same setup every other example assumes (vault-root gap already recorded in SCOPING.md).

## Plan
1. Test first: `src/tests/help/templates-script-paths.test.ts`. For each template, run the text through the real
   `processTemplate`, extract every `kb.view("...")`/`dv.view("...")` path, and require a script
   `help/**/<path>.js` to exist (path matched as a suffix of a `.js` file's path under `help/`). Also require at
   least one path found, so the test cannot pass vacuously. Run it, see the 11 failures.
2. Fix the 11 paths in the templates. Re-run `./node_modules/.bin/vitest run src/tests/help`.

## Prior art
- `src/tests/help/examples-scoping.test.ts` (walk of `help/examples`, real file reads, no mocks).

## Risks / defaults
- "Exists under help/" read as: some `.js` under `help/` whose path ends with `/<path>.js`; the vault root is
  whichever example folder is copied to the root, which the test cannot know.
- Gate per Issue: `./node_modules/.bin/vitest run src/tests/help` only.
