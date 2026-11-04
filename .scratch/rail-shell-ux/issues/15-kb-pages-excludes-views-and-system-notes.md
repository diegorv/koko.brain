# 15: `kb.pages()` leaves out `.view` files and system-folder notes

**What to build:** QueryJS `kb.pages()` (and `dv.pages()`) returns notes only: `.view` files and notes under the system folder (Settings > Templates > System folder) are not pages. Archived notes stay in the result, as today, and help 13 says so and shows how to drop them (`.where(p => !p._archived)` or the documented equivalent). Counts in a dashboard then agree with the rail's lists, apart from archived notes.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: a KBAPI built over entries that include a `.view` and a `_system/template.md` returns neither from `kb.pages()`, `kb.pages('#tag')` or `kb.pages('"folder"')` (logic test, real `buildKBPage`)
- [ ] Archived notes are still returned (logic test)
- [ ] `kb.page(path)` on a `.view` path returns what the help says it returns after this change (decide: null, consistent with pages) (logic test)
- [ ] A blank system folder setting disables the system-folder exclusion, as elsewhere (logic test)
- [ ] `kbapi-firewall.test.ts` still passes; the contract file is unchanged
- [ ] Help 13: the `kb.pages()` section states what is and is not a page; the "API version and compatibility" section notes the change

## Notes

- **Owner decision (2026-11-04):** exclude `.view` and the system folder by default; keep archived notes and document it; QueryJS as a lens source is deferred.
- **Main-session decision:** treat this as a fix, not a contract change: no `kb.version` bump, because `.view` files and templates were never meant to be pages (their YAML keys leak in as page properties today). Flag in the help's compatibility notes.
- **Today (traced):** `plugins/queryjs/kb-api.ts:430-445` builds pages from every entry; `.view` files are entries (`src-tauri/src/utils/fs.rs:114-117`).
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F17.
- **Size:** S.

## Comments
