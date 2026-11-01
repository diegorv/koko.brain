# 02: Type palette and warning tokens in every theme

**What to build:** Every built-in theme gains a categorical palette, one token per palette name (red, orange, yellow, green, teal, blue, purple, pink, gray), and a `warning` token. `_color` is the icon picker's color key and is already rendered as a CSS color. When its value is a palette name it now resolves to that theme's token, so a type icon set to `green` looks right in every theme; any other value (a hex from the picker) renders as today. Notes and tabs that inherit their type's icon follow the same rule.

**Blocked by:** none

**Status:** resolved

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Theming, decision Q13.

- [x] Logic test first: a palette name maps to its token; a hex or other CSS value passes through unchanged; no `_color` leaves the icon uncolored as today
- [x] Every theme in `BUILTIN_THEMES` defines all ten tokens (a test iterates the list); user themes that lack them get defaults through the existing merge
- [x] The theme editor shows the tokens in their own group, and the theme builder derives them and checks their contrast against the sidebar background
- [x] A type definition with `_icon` and `_color: green` shows the theme's green in the Types sidebar, in its notes' rows and in their tabs, in each built-in theme
- [x] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [x] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme

## Comments

- 2026-10-31, branch `issue/02-type-palette-and-warning-tokens`: nine `--type-*` palette tokens and `--warning` derived in every built-in theme (contrast-checked on the sidebar background, own group in the theme editor); a palette-name `_color` renders as `var(--type-<name>)`, any other value as before. Deliver fixed review findings 1 (static fallbacks in `:root` / `.dark` of app.css, with a contract test) and 2 (TypeNoteList note-row color test); nit 3 (gray close to a hue in Graphite Violet / Twilight Violet) left for a by-eye check. Tests: `pnpm check` 0 errors; full suite 350 files, 8476 passed, 1 todo; `pnpm build` ok. Review: round 1 APPROVED (claude).
