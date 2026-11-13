---
type: ADR
id: "0004"
title: "File-type separation: .store.svelte.ts / .service.ts / .logic.ts / .svelte"
status: active
date: 2026-04-22
---

## Amendment (2026-11-05): one vault file kind, `.view`

This replaces the two-kinds rule of the 2026-11-04 amendment below. `.view` is the only vault file that holds the collection YAML format; an inline ` ```collection ` block embeds the same format in a note. Where a view shows and how it opens are properties of the file, not of its extension: `_visible: false` keeps it out of Types > Views and the palette's Open view, and `_open_in_editor: true` makes a click open it in the collection editor. The Files navigator's folder menu offers New table (`Untitled.view` with both keys) next to New view, and a hidden view's row offers Show in Views, which removes both keys. `.collection` is retired by owner decision with no conversion, migration code or legacy read path: the editor opens it as plain text, the rail lists it as a plain file, Rust does not index it (`src-tauri/src/utils/fs.rs`), and Convert to view is removed. The owner migrates by hand: rename to `.view`, add `_visible: false` and `_open_in_editor: true`. Internal names stay (`features/collection`, the editor tab type `fileType: 'collection'`). The user documentation is `help/documentation/12-views.md` and `help/documentation/25-types-and-relationships.md` § View Files.

## Amendment (2026-11-04): the `.view` and `.collection` vault files

This ADR is about source file kinds; the two vault file extensions that share the collection YAML format get their roles recorded here. `.view` is the one file that defines a menu entry: Types > Views lists `.view` files only, and Rust indexes only `.view` (`src-tauri/src/utils/fs.rs`). `.collection` stays an editor-only table/calendar file, opened in the editor or embedded as a ` ```collection ` block, and is never listed in the menu. A `.collection` row in the rail's note list offers Convert to view, a rename through `renameItem` with the same bytes; the Files navigator's folder menu offers New view next to New Collection. The user documentation is `help/documentation/12-views.md` and `help/documentation/25-types-and-relationships.md` § View Files.

## Context

A feature like `features/backlinks/` has to do at least three different things: hold reactive state (what the UI reads), call Tauri IPC and mutate that state on responses, and transform data (parse wikilinks, compute unlinked mentions). If all three live in the same file, tests either require a full DOM + Tauri runtime or drown in mocks; if they are split arbitrarily, each feature invents its own boundary.

The project needed a predictable file-type boundary that:

- Lets pure data transformations be unit-tested without any framework.
- Lets services be tested with real stores and only Tauri APIs mocked.
- Keeps components thin — the UI should read store getters and dispatch events, nothing more.
- Avoids creating files preemptively when a feature is still small.

## Decision

Split feature code into **four file kinds with explicit rules**:

| File kind | When to create | Rules |
|-----------|----------------|-------|
| `<feat>.logic.ts` | Real pure logic exists (parsing, transformations, validations) | **No framework imports.** May import other `.logic.ts` files and `utils/` only. |
| `<feat>.store.svelte.ts` | Feature needs shared reactive state | **Reactive state only.** `$state` + getters (see ADR-0005). May call `.logic.ts`. |
| `<feat>.service.ts` | Tauri IPC calls need to be mockable in tests | Orchestrates: calls Tauri APIs, calls `.logic.ts`, writes to stores. |
| `<Feat>.svelte` | UI | Reads store getters, renders, dispatches events. Inline logic is allowed while the feature is small. |

Reference implementation: `src/lib/features/backlinks/`

- `backlinks.logic.ts` — `findLinkedMentions*`, `findUnlinkedMentions`. Pure. (`parseWikilinks`, `buildResolutionCache` and `resolveWikilinkCached` live in `core/filesystem/wikilink-resolution.logic.ts`.)
- `note-index.store.svelte.ts` — holds `noteIndex`, `noteContents`, `reverseIndex`; exposes getters + setters; contains the invariant "`setNoteContents` MUST precede `setNoteIndex`" (`note-index.store.svelte.ts:80-89`).
- `backlinks.service.ts` — `buildIndex`, `rebuildIndex`, `updateIndexForFile`, `removeFileFromIndex`, `updateBacklinksForFile`, `computeUnlinkedMentionsForFile`, `resetBacklinks`. All Tauri `invoke()` calls live here (`backlinks.service.ts:40,51`).
- `BacklinksPanel.svelte`, `LinkItem.svelte` — UI only.

**Start simple, extract later.** A brand-new feature may live as `<Feat>.svelte` only. Extract a `.logic.ts` when there's a real function worth testing in isolation. Extract a `.store.svelte.ts` when more than one component reads the state. Extract a `.service.ts` when Tauri calls appear.

## Alternatives considered

- **Single `<feat>.ts` per feature**: trivial to navigate but mixes Tauri-dependent code with pure functions; tests need to mock `@tauri-apps/api` even for pure utilities. Rejected.
- **Layer-by-tech folders** (`stores/backlinks.ts`, `services/backlinks.ts`, `components/BacklinksPanel.svelte`): loses feature cohesion, covered in ADR-0003.
- **Class-based feature module** (one big class with injected dependencies): imposes a heavyweight DI pattern that Svelte's module-scoped reactive state already obviates.
- **Always extract all four files on feature creation**: creates empty shells and dead files for trivial features (e.g., `features/file-icons/`). Rejected — extract when complexity justifies it.

## Consequences

- Reading a feature folder instantly tells a new contributor where state lives, where IPC happens, and which functions are safe to call from anywhere.
- Tests follow the file kinds: `.logic.ts` → `*.logic.test.ts` with no mocks; `.store.svelte.ts` → `*.store.test.ts` exercising getters; `.service.ts` → `*.service.test.ts` with only Tauri APIs mocked and real stores. See ADR-0007.
- Some small features still have everything inline in their `.svelte` files — that's fine and intentional. Resist extracting preemptively.
- Orchestrators that only dispatch to other services (e.g., `utils/index-dedupe.ts` consumers) are allowed to mock sub-services; this is the only case where mocking a service is acceptable.
- Re-evaluation triggers: Svelte 6 changes `.svelte.ts` semantics; a repeated pattern of "three similar `.logic.ts` files" suggests a shared utility belongs in `utils/`; services grow so large that feature-local service sub-files become necessary.
