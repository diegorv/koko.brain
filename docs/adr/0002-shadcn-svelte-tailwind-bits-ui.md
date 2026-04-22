---
type: ADR
id: "0002"
title: "shadcn-svelte + Tailwind 4 + bits-ui for UI primitives"
status: active
date: 2026-04-22
---

## Context

Kokobrain needs a consistent set of accessible, themeable UI primitives (buttons, dialogs, dropdowns, menus, tooltips, sliders, selects, resizable panes, etc.) across a desktop app with dense editor chrome. The primitives must:

- Be owned by this repo (not a black-box dependency) so theme tweaks, accessibility fixes, and keyboard bindings stay in-tree.
- Compose well with bits-ui's headless behavior (focus trapping, ARIA, portals).
- Use the same Tailwind tokens as the rest of the app so dark/light/zinc/etc. themes come for free.

## Decision

Use **shadcn-svelte generated components + Tailwind CSS 4 + bits-ui as the headless primitive layer**, with components copied into `src/lib/components/ui/` and customized locally. `components.json:2-14` configures the shadcn-svelte CLI with `baseColor: zinc`, `css: src/app.css`, and alias `$lib/components/ui`.

Related pins:

- `package.json:67` — `bits-ui ^2.16.5`
- `package.json:97,111` — `@tailwindcss/vite ^4.2.2`, `tailwindcss ^4.2.2`
- `package.json:85-86` — `tailwind-merge`, `tailwind-variants` for class composition
- `vite.config.js:61` — `tailwindcss()` Vite plugin registered

## Alternatives considered

- **Off-the-shelf component library (e.g., Flowbite-Svelte, Skeleton, Svelte Material UI)**: faster start, but primitives live in `node_modules` so theme tweaks and accessibility fixes require either forks or wrappers. Rejected — we need edit-in-place.
- **Raw bits-ui without shadcn-svelte**: possible, but we would reinvent the set of styled wrappers (Button, DropdownMenuItem, Dialog with close button, etc.) that shadcn-svelte ships as copy-paste templates.
- **Custom components only**: maximum control but prohibitive maintenance cost for accessibility (focus management, ARIA, keyboard navigation). Rejected — bits-ui already does this work.
- **Tailwind 3.x**: proven and stable, but Tailwind 4 moves configuration to CSS (`@theme`) and removes JIT-specific setup; we accepted the early-adopter risk to avoid an inevitable migration later.

## Consequences

- UI components are in-repo assets (`src/lib/components/ui/*`), not dependencies — they show up in diffs, get reviewed, and can be modified freely.
- Adding a new primitive means running the shadcn-svelte CLI (`pnpm dlx shadcn-svelte@next add …`) rather than `pnpm install`. The generated file is then edited in place to match project conventions.
- Dark mode, radii, and color scales are driven from `src/app.css` Tailwind theme tokens — components should read tokens, not hardcode colors.
- Custom primitives (e.g., Tree View in the file explorer) may still be built from scratch when no shadcn-svelte template fits. Document those as feature-local components, not in `components/ui/`.
- Re-evaluation triggers: shadcn-svelte stalls or diverges significantly from shadcn/ui; bits-ui changes maintainers or its API; Tailwind 4 introduces incompatibilities we cannot absorb.
