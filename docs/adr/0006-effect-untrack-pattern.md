---
type: ADR
id: "0006"
title: "$effect + untrack() pattern for service calls"
status: active
date: 2026-04-22
---

## Context

A common pattern in the app is "when the vault is opened, initialize the index / load settings / rebuild caches":

```typescript
$effect(() => {
  if (vaultStore.isOpen && vaultStore.path) {
    initializeVault(vaultStore.path);
  }
});
```

This looks correct — read the flags, call the service. But in Svelte 5, `$effect` tracks **every** reactive read that occurs synchronously inside the effect, including reads inside `initializeVault`. `initializeVault` internally reads `settingsStore`, `backlinksStore`, `noteIndexStore`, etc. Those reads all register as dependencies of the outer effect. A mutation to any of them — even an internal, unrelated one caused by the initialization itself — re-fires the effect. The result is silent infinite re-execution that manifests as reloading spinners, duplicated IPC calls, or a completely frozen app.

The same issue appears with PaneForge's `collapse()`/`expand()` APIs, where reading and writing the same state inside an `$effect` causes loops.

The project needed a discipline for service calls inside effects.

## Decision

**When an `$effect` calls a service function, read the intended reactive dependencies first into local variables, then invoke the service inside `untrack(() => …)`.** This tells Svelte which reads are real dependencies and suppresses tracking for everything else.

Canonical pattern (`docs/PATTERNS.md:35-54`):

```typescript
// CORRECT — only vaultStore.isOpen and vaultStore.path are tracked
$effect(() => {
  const isOpen = vaultStore.isOpen;   // tracked
  const path = vaultStore.path;       // tracked
  untrack(() => {                     // everything inside is NOT tracked
    if (isOpen && path) {
      initializeVault(path);
    }
  });
});
```

Two related rules documented in the same guide:

- `CLAUDE.md` Quick Reference rule 2: *"Always wrap service calls in `$effect` with `untrack()`."*
- `docs/PATTERNS.md` §PaneForge Conditional Panes (lines 56-93): never drive PaneForge `collapse()`/`expand()` from `$effect`; use `{#if}` to mount/unmount panes instead. Same root cause.

## Alternatives considered

- **No `untrack()`**: the "just works" path, reliably produces infinite loops in practice. Rejected — silent bugs are the worst bugs.
- **Wrap the entire effect body in `untrack()`**: eliminates loops but also eliminates the intended reactivity; the effect never re-runs when `vaultStore.isOpen` flips. Rejected.
- **Move orchestration out of effects into explicit event handlers**: works but forces the caller to know when to dispatch; reactive state ceases to be the source of truth. Sometimes correct (e.g., a button click that calls `initializeVault`), but not a general replacement.
- **Read everything into a snapshot at the top of the effect**: equivalent to the chosen pattern without `untrack()`; still tracks everything the service reads internally. Rejected.
- **Svelte-side linting rule**: we don't have an automated enforcement today. Code review + `docs/PATTERNS.md` are the current enforcement; a future lint rule could catch raw service calls inside `$effect`.

## Consequences

- Every `$effect` that invokes a service must be audited for this pattern. The `$lib/core/vault/` and `$lib/core/app-lifecycle/` layers have the most dense occurrences.
- Developers learn a second reactivity mental model: "effects track what they read at the top level, `untrack` is explicit permission to read without binding."
- Occasionally a side effect inside `untrack()` still wants to be reactive (e.g., reading `settingsStore.theme` to decide rendering). In that case, read it outside `untrack()` as an additional tracked dep.
- Test coverage: effects are hard to unit test in vitest (see ADR-0005). The discipline is primarily code-review-enforced plus runtime log inspection (`appendLog`).
- Re-evaluation triggers: Svelte introduces a first-class "service call boundary" primitive; static analysis (Svelte lint plugin) can reliably catch missing `untrack()` wrappers; the pattern proves insufficient for a specific class of effect (e.g., async chains).
