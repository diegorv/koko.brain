# 35: ADR-0032 recorded and ADR-0029 and ADR-0009 amended

**What to build:** the calendar's architecture decision is on record. ADR-0032 explains why calendar events are event-typed notes and why sidecar JSON and plugin promotion were rejected. It names the configurable event type and the `event_title` key, lists every cross-layer import the feature added (found by grep on the final tree), and records the new `restore` note-change source and how the calendar's refuse-instead-of-drop writer relates to ADR-0029. ADR-0029 and ADR-0009 carry amendment notes, so neither one silently contradicts the shipped behaviour.

**Plan reference:** Task 34 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 803-817). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 25, 31, 32, 33

**Status:** ready-for-agent

**Touches:**
- `docs/adr/0032-calendar-events-are-event-typed-notes.md` (new)
- `docs/adr/README.md` (modify)
- `docs/adr/0029-frontmatter-yaml-canonical-form.md` (modify)
- `docs/adr/0009-incremental-indexing-reverse-index.md` (modify)

**Gate:** none (docs only). `git diff --cached --stat` lists only docs.

- [ ] `docs/adr/0032-calendar-events-are-event-typed-notes.md` states the decision (events are event-typed notes) and the rejected alternatives: sidecar JSON and plugin promotion
- [ ] ADR-0032 records the configurable event type name (D25) and the `event_title` key (D6)
- [ ] ADR-0032 has a cross-layer import inventory built from `grep -rn "features/event-calendar" src/lib` and `grep -rn "\$lib/features/" src/lib/features/event-calendar` run on the final tree. If any event-calendar file uses `#lib/...` (Notes > Dependencies, line 932: new files written after sveltekit-3 ticket 05 closes), the second grep does not match it, so the inventory also covers the `#lib/features/` form
- [ ] The inventory groups the imports as the plan expects: core to event-calendar (`EditorView.svelte`, `global-keybindings.ts`, `app-lifecycle.service.ts`, `tauri-listeners.service.ts`, `SettingsPanel.svelte`); feature to feature (`command-palette.service.ts` to event-calendar; event-calendar to `features/properties` (logic and writer) and `features/type-definitions` (`type-sidebar.logic.ts`, store, `createTypedNote`)); plugin to feature, allowed (`plugins/calendar/CalendarPanel.svelte` to event-calendar). `EditorTabs.svelte` imports only a lucide icon and is not listed
- [ ] ADR-0032 records the new `restore` note-change source
- [ ] ADR-0032 has a "Relation to ADR-0029" section: `updateNoteFrontmatter` and calendar creation refuse lossy frontmatter instead of dropping it, while the existing writers keep the drop behaviour
- [ ] `docs/adr/README.md` has the ADR-0032 row after the ADR-0031 row (`:138`)
- [ ] ADR-0029's Consequences ends with an amendment note that says the same as the "Relation to ADR-0029" section (`docs/agents/domain.md:31`, "Flag ADR conflicts")
- [ ] ADR-0009 has an amendment note at "The five sources" (`docs/adr/0009-incremental-indexing-reverse-index.md:48`): there are now six, and `restore` has `rust: 'always'` because no `create_note` ran for the restored file
- [ ] Gate green (`git diff --cached --stat` lists only docs); one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)
