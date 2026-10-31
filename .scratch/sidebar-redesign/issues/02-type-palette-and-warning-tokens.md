# 02: Type palette and warning tokens in every theme

**What to build:** Every built-in theme gains a categorical palette, one token per palette name (red, orange, yellow, green, teal, blue, purple, pink, gray), and a `warning` token. `_color` is the icon picker's color key and is already rendered as a CSS color. When its value is a palette name it now resolves to that theme's token, so a type icon set to `green` looks right in every theme; any other value (a hex from the picker) renders as today. Notes and tabs that inherit their type's icon follow the same rule.

**Blocked by:** none

**Status:** ready-for-agent

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Theming, decision Q13.

- [ ] Logic test first: a palette name maps to its token; a hex or other CSS value passes through unchanged; no `_color` leaves the icon uncolored as today
- [ ] Every theme in `BUILTIN_THEMES` defines all ten tokens (a test iterates the list); user themes that lack them get defaults through the existing merge
- [ ] The theme editor shows the tokens in their own group, and the theme builder derives them and checks their contrast against the sidebar background
- [ ] A type definition with `_icon` and `_color: green` shows the theme's green in the Types sidebar, in its notes' rows and in their tabs, in each built-in theme
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
