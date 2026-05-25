---
type: Topic
tags:
  - programming
  - frontend
  - javascript
_organized: true
---

# Svelte

Compiler-based UI framework. Svelte 5 introduces runes for fine-grained reactivity.

## Why Svelte for Kokobrain
- Compiled output is small and fast
- Runes ($state, $derived, $effect) replace stores
- First-class TypeScript support
- SvelteKit for routing and SSR (used for dev server)

## Key patterns
- `$effect` + `untrack()` for service calls
- Getter-based stores instead of `$derived` in tests
- PaneForge for resizable panels
