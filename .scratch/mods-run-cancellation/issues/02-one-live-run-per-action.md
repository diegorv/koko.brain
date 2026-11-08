# 02: One live run per action across rail, palette and menus

**What to build:** Starting a mod action that is already running, from any entry point, reveals the existing run instead of starting a second one. Today rail buttons and non-rail invocations (palette, note menu, folder menu) use separate run keys. One action can therefore run twice at once, for example Bulk Tag from the rail and from the Files context menu on the same folder. Both runs then rewrite the same notes' frontmatter and one silently loses the other's change. Weekly Review started twice races on creating the same report.

This changes documented behaviour. The mods documentation says "Rail and non-rail invocations use separate run keys, so the same action can run through both at once". Triage should decide whether that is still wanted. Alternatives: serialize per action in the host, refuse the second start with a notice, or keep the current behaviour and leave serialization to each mod (Bulk Tag, Inbox Triage and Weekly Review would each need their own guard).

**Blocked by:** none

**Status:** needs-triage

Source: review of the mods repository (`kokobrain-mods-src`, `.scratch/mods-review/report.md`, findings H8, bulk-tag-D3, inbox-triage-D2; ticket 19 there).

- [ ] With the chosen rule, starting the same action from the rail while it runs from the palette (and the reverse) behaves as decided, and a test covers both directions.
- [ ] A button with several actions can still run two different actions side by side, if that remains the rule.
- [ ] Run-trace records (busy-key reinvocation, run IDs) stay consistent with the new key.
- [ ] Mod documentation and the contract describe the guarantee.

## Comments
