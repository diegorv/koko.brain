# 01: Inline math ignores escaped dollars and wikilink targets

**What to build:** A `$` that the user escaped (`\$`) or that sits inside a wikilink target never opens or closes inline math. Today the inline math parser (`src/lib/core/markdown-editor/extensions/lezer/math-extension.ts`) searches raw characters for the closing `$`, so an escaped `\$` closes math, and wikilinks are not parsed before math, so a `$` inside `[[...]]` can open it. A link with an alias to a note whose name contains `$` (for example `[[2026-09-02-$30 trillion|2026-09-02-$30 trillion]]`) renders as math instead of a link; the installed vault has 118 note files with `$` in the name, mostly under `vault/reading-list/`. Generated mod reports hit the same cases (Vault Health writes `[[path|basename]]` on every line).

**Blocked by:** none

**Status:** needs-triage

Low priority: visual only, no data changes. Source: mods repository `kokobrain-mods-src`, Issue 29 in `.scratch/mods-review/` and its triage notes; the mods side can stop linking `$` names until this lands and relax that afterwards.

- [ ] Tests: `\$` never closes math; a `$` inside a wikilink target or alias neither opens nor closes math; `$x$` and `$$` blocks still render as before.
- [ ] A linked note whose name contains `$`, with and without an alias, renders as a clickable link in Live Preview.
