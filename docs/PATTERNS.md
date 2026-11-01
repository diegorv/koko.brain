# Svelte 5 & UI Patterns

Technical patterns and gotchas specific to this project's Svelte 5 + PaneForge stack.

## Store Pattern (Svelte 5 Runes)

Stores use `$state` in `.svelte.ts` files. They hold **only reactive state** — no business logic.

**Stores expose state and computed values through getters** ([ADR-0034](adr/0034-derived-allowed-behind-store-getters.md)). Getters reading `$state` track reactively in Svelte components because Svelte 5 tracks fine-grained reads through property accessors. Svelte refuses to export derived state from a module (`derived_invalid_export`), so a `$derived` never leaves the module bare: a getter returns it.

- **Cheap values** (`items.length`, `map.get(x)`): a plain getter that computes on read. This is the default.
- **Costly values** (grouping, sorting, scanning a large collection): a getter may return a module-level `$derived` / `$derived.by`, which the app's client runtime memoizes between writes.
- **No mass migration.** Leave existing getters as they are; move one to a `$derived` only when a change touches it and caching pays off.

```typescript
// example.store.svelte.ts
let items = $state<Item[]>([]);
const byTag = $derived.by(() => groupByTag(items));

export const exampleStore = {
  get items() { return items; },
  get count() { return items.length; },       // plain getter
  get isEmpty() { return items.length === 0; },
  get byTag() { return byTag; },               // getter over a $derived
  setItems(v: Item[]) { items = v; },
};

// Does not compile: "Cannot export derived state from a module"
// export const byTag = $derived.by(() => groupByTag(items));
```

Under vitest, a derived read through a getter is fresh right after a `$state` write, with no `flushSync()`. In the default node environment vitest runs the Svelte server runtime, where a module-level derived re-runs on every read (fresh, not cached); under `// @vitest-environment jsdom` the client runtime memoizes it. `src/tests/lib/svelte-derived-sync.test.ts` and `svelte-derived-sync.client.test.ts` pin both.

Services are functions that call Tauri APIs and update stores.

## `$effect` + `untrack()` Pattern

When an `$effect` calls service functions (like `initializeVault`), Svelte 5 tracks **all** reactive reads that happen synchronously inside those functions — not just the ones you intend as dependencies. This silently creates unwanted dependencies that can cause infinite re-execution loops.

**Rule:** Read the intended dependencies first, then wrap service calls in `untrack()`:

```typescript
// WRONG — initializeVault internally reads settingsStore, backlinksStore, etc.
// which become unintended dependencies → infinite loop
$effect(() => {
  if (vaultStore.isOpen && vaultStore.path) {
    initializeVault(vaultStore.path);
  }
});

// CORRECT — only vaultStore.isOpen and vaultStore.path are tracked
$effect(() => {
  const isOpen = vaultStore.isOpen;
  const path = vaultStore.path;
  untrack(() => {
    if (isOpen && path) {
      initializeVault(path);
    }
  });
});
```

## PaneForge Conditional Panes

**Never use PaneForge's collapsible API (`collapse()`/`expand()` via `PaneAPI`) with `$effect` to toggle pane visibility.** It causes either infinite loops (without `untrack()`, since `isCollapsed()`/`expand()` read and write the same reactive state) or missed reactivity (with `untrack()` wrapping the pane API ref).

**Rule:** Use `{#if}` to conditionally render `<Resizable.Handle />` + `<Resizable.Pane>` based on a settings flag:

```svelte
{#if settingsStore.layout.rightSidebarVisible}
  <Resizable.Handle />
  <Resizable.Pane defaultSize={25} minSize={15} maxSize={30}>
    <SidebarContent />
  </Resizable.Pane>
{/if}
```

**When multiple conditional panes exist in the same direction**, use nested `PaneGroup`s to isolate them. Otherwise, toggling one pane causes PaneForge to recalculate all siblings and breaks the others:

```svelte
<!-- Main horizontal layout -->
<Resizable.PaneGroup direction="horizontal">
  <Resizable.Pane>
    <!-- Inner PaneGroup: file explorer + editor + sidebar -->
    <Resizable.PaneGroup direction="horizontal">
      <Resizable.Pane>...</Resizable.Pane>
      <Resizable.Handle />
      <Resizable.Pane>...</Resizable.Pane>
      {#if settingsStore.layout.rightSidebarVisible}
        <Resizable.Handle />
        <Resizable.Pane>...</Resizable.Pane>
      {/if}
    </Resizable.PaneGroup>
  </Resizable.Pane>
</Resizable.PaneGroup>
```

**Visibility defaults:** Store defaults for visibility flags (e.g., `rightSidebarVisible`) should be `false`. This prevents flash-of-content on startup -- the pane stays hidden until `loadSettings()` applies the user's saved preference.
