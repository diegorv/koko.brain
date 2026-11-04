# 07: Meta-bind writes typed values and reads alias keys

**What to build:** Meta-bind controls write the same YAML types the Properties panel writes: a toggle writes `done: true` / `done: false`, a number input writes `count: 7`, and a button's `updateMetadata` accepts number and boolean `value`s and writes them typed. A control bound to an alias key (`INPUT[toggle():archived]`, `favorite`, `type`, `order`) shows the stored value of the canonical key (`_archived`, ...). As a result, a toggle on `_favorite` or `_archived` changes the Favorites and Archive lenses like the action bar does.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: the meta-bind writer test expects `count: 7` and `done: true` (update `meta-bind-writers.test.ts:120,124`, which today expects the quoted strings; this changes the asserted behaviour on purpose, per the owner's decision recorded below)
- [ ] Text inputs and selects still write strings; a select option that looks like a number or boolean (`"1"`, `"yes"`) is written as typed by the same rule the Properties panel uses (logic test, shared helper rather than a second rule)
- [ ] A toggle reads `true` from a YAML boolean and from the legacy string `"true"` (old notes keep working) (widget test)
- [ ] `INPUT[toggle():archived]` on a note with `_archived: true` renders checked; writing through it updates `_archived`, not a new `archived` key (plugin test, real frontmatter parser)
- [ ] Button `updateMetadata` with `value: 3` and `value: true` passes validation and writes typed values; an invalid config names the reason instead of "Invalid configuration" (logic test)
- [ ] The help page's `INPUT[toggle():archived]` example and sample 15 in `help/examples/markdown-editor-vault/19-meta-bind.md` work as written; help 24 says controls write typed values

## Notes

- **Owner decision (2026-11-04):** fix meta-bind writes and reads; no new meta-bind features in this round.
- **Cause (traced):** the toggle dispatches `'true'`/`'false'` strings (`core/markdown-editor/extensions/live-preview/widgets.ts:917-924`), and `dispatchMetaBindUpdate` writes them quoted through `properties.logic.ts:636-648`. Rust reads `_favorite` / `_archived` with `as_bool()` (`src-tauri/src/vault/entry.rs:246-251`), so a quoted string is ignored. The alias read looks up the raw bind target (`plugins/meta-bind-input-plugin.ts:76`, `widgets.ts:257`) while parsed properties carry canonical keys (`properties.logic.ts:296`, `utils/frontmatter-aliases.ts`). Button validation: `meta-bind-button.logic.ts:69-118`.
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F67, F68, F84.
- **Size:** S.

## Comments
