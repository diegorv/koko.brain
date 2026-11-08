# 222: PowerShell, Dockerfile, Elixir, Haskell and Scala code blocks are syntax-highlighted

**Origin:** `audit-2026-11-05` Issue 159, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Split from Issue 73 on 2026-11-06: the owner kept only its cheap part in the first wave. Read Issue 73 first; its Details and evidence apply here. Register the five grammars (highlight.js as a direct dependency, past the quarantine policy) and put them back in COMMON_LANGUAGES and the guide.

**Blocked by:** 221

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`. Dependency change: also `pnpm build`.

- [ ] Failing test first, in src/tests/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.test.ts: highlightCode('Get-ChildItem -Path .', 'powershell').html contains an `hljs-` class span; it fails today (plain escaped text).
- [ ] The same holds for dockerfile, elixir, haskell and scala samples.
- [ ] They are back in COMMON_LANGUAGES and help/documentation/04-markdown.md:424.
- [ ] Gate: pnpm check, pnpm vitest run and pnpm build.

## Notes


## Comments

- 2026-11-06: split off by the owner after the first-wave challenge review (`raw/first-wave-challenge.json`).
