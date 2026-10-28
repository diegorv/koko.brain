# 43: Event colors in the theme editor

**What to build:** the twelve event color tokens become editable theme colors (`ThemeColors`, `src/lib/core/settings/theme.types.ts:205`) instead of being derived from each theme's editor background and foreground.

**Blocked by:** None

**Status:** needs-triage

- Plan Open questions item 11 and D-notes: "Rejected adding 12 tokens to `ThemeColors` now: that is the theme-editor follow-up."
- Open: whether users need this, and whether derived defaults stay as the fallback for themes that set none.

- [ ] Decision recorded
- [ ] If accepted: twelve tokens in `ThemeColors`, theme editor UI, derived values as defaults, tests for the fallback
