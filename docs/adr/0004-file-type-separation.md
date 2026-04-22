---
type: ADR
id: "0004"
title: "File-type separation: .store.svelte.ts / .service.ts / .logic.ts / .svelte"
status: active
date: 2026-04-22
---

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

- `backlinks.logic.ts` — `parseWikilinks`, `buildResolutionCache`, `resolveWikilinkCached`, `findLinkedMentions*`, `findUnlinkedMentions`. Pure.
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
