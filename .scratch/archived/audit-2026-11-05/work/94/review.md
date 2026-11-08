VERDICT: APPROVED

## Acceptance criteria

- [met] All four sections render through the wrapper; a component test asserts the shared header structure — `PropertiesView.svelte:155`, `TableOfContentsPanel.svelte` (`<SidebarSection title="Table of contents" bind:open={() => expanded, setExpanded}>`), `BacklinksPanel.svelte:55` and `OutgoingLinksPanel.svelte` all render through `src/lib/core/layout/SidebarSection.svelte`. `SidebarSection.test.ts` `expectSharedHeader()` asserts the `pane-toolbar` header, the `size-3.5 shrink-0` chevron slot as first child and the `text-title` h2 for both the static and the collapsible form. `AppShell.test.ts` "draws all four through one shared section header" mounts the real shell and asserts the four titles in order, each header carrying `pane-toolbar` with the chevron slot first. Each panel test asserts its header is `[data-sidebar-section-header]`, an attribute only the wrapper emits.
- [met] Section contents align on one left edge in both themes (screenshot check noted in the commit) — commit 3c637e4ab body records the Playwright check at 1440x900 in KokoBrain Default and Lavender Haze: titles at x=30, first content icon at x=16, 40px headers for all four. The classes agree: every body is `p-2` (8px) with rows at `px-2` (Properties, Backlinks, Outgoing) or `padding-left: 8px` at depth 0 (TOC), so 16px; every title sits after `px-3` + 14px slot + `gap-1` = 30px. I did not re-run the screenshot.
- [met] Existing panel tests stay green — I ran `pnpm vitest run` on `src/tests/lib/core/layout/SidebarSection.test.ts`, `src/tests/lib/features/backlinks/`, `src/tests/lib/features/outgoing-links/`, `src/tests/lib/plugins/table-of-contents/`, `src/tests/lib/features/properties/`, `src/tests/lib/app/AppShell.test.ts`, `src/tests/lib/pane-toolbar.test.ts` and `src/tests/lib/architecture/`: 45 files, 504 tests passed (exit 0). The full suite and `pnpm build` from the Issue's Gate line belong to deliver.

## Checks run

- `taskpolicy -c background pnpm check`: 0 errors, 0 warnings (exit 0).
- Targeted vitest: the files listed under the third criterion, 504/504 passed. My test verdict rests on those files only.
- Traced the fetch-on-open change in Backlinks and Outgoing: bits-ui calls `onOpenChange` from the Root's open setter after the bound value changes, and `fetchData()` sets `lastFetchedPath` in the same handler, so the path-change effect (which runs later) sees a matching path and does not collapse the panel. The behavior matches the old `onclick={handleExpand}` with `if (!expanded)`.
- The footer "Add property" row (`PropertiesView.svelte:233-239`) shows under the same condition the removed header `+` did (active markdown tab), so removing the `+` leaves exactly one entry point. E2E selectors use `button` with `hasText: 'Add property'`, which never matched the text-less header `+`.
- Dividers: the header's `pane-toolbar` draws `border-b`, an open body draws `border-b`, and nothing draws `border-t`, so exactly one line separates two sections whether open or collapsed. The removed AppShell and NoteInfo `Separator`s would have doubled it. No layer-baseline entry or BASELINE_SIZE change.

## Findings

1. minor — `src/lib/features/properties/PropertiesView.svelte:244` — The "Relationships" sub-heading now uses the same `section-label text-right-sidebar-muted-fg` recipe as each relationship kind label under it (`:249`, "Belongs to", "Related to"). The heading reads as a sibling of its own children, not as their parent. The Issue asked for `section-label`, so this follows the letter. Fix: leave it, or have the owner pick a distinction (e.g. drop the heading, since the kind labels already name themselves, or give it `mb-2` plus a stronger weight). Follow-up, not a blocker.
2. minor — `src/lib/features/properties/NoteInfo.svelte:43-46` — NoteInfo still draws its own title recipe: an icon-led `text-title` h2 with the icon at 16px and the text at about 36px, while the four section titles sit at 30px. The sidebar still has two title edges. NoteInfo is not one of the Issue's four sections, so this is out of scope. Fix: a follow-up Issue that renders NoteInfo through `SidebarSection` (static) or records why it stays different.
3. nit — `src/lib/features/properties/NoteInfo.svelte:42` — The new markup comment states a fact owned by another file ("NoteInfo shows only with Properties", which is true only because `AppShell.svelte` wraps it in `propertiesVisible`). It goes stale if AppShell changes, and CLAUDE.md § 8 asks for no such cross-file facts. Fix: say only why there is no divider ("the section above draws the bottom edge"), or drop the comment.
4. nit — `src/lib/core/layout/SidebarSection.svelte:110-122` — The collapsible header renders an `h2` inside a `button`, which is invalid HTML (a button allows phrasing content only). This was already the case before (the old `Collapsible.Trigger` wrapped the h2), so it is carried over, not introduced. Fix, optional: put the `button` inside the `h2` (the WAI-ARIA accordion pattern) in a later pass.

## Resolution

1. Not fixed here: which distinction the Relationships heading gets (drop it, or make it weightier) is an owner choice. Left for a follow-up Issue.
2. Not fixed here: NoteInfo is not one of the Issue's four sections, so moving it onto `SidebarSection` is out of scope. Left for a follow-up Issue.
3. Fixed: the NoteInfo markup comment now gives only the reason ("the section above draws its own bottom edge").
4. Not fixed here: the `h2` inside the header `button` is carried over from the old `Collapsible.Trigger` and the review marks the fix optional. Left for a later pass.
