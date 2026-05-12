# Bundle cleanup — quick wins

Reduce client bundle and remove ~200 vite externalization warnings caused by `undici` and `lucide-svelte` barrel imports. Zero/near-zero behavior risk.

## Tasks

- [x] Task 1: Replace `isomorphic-dompurify` with `dompurify` (4 import sites). Removes jsdom + undici from dep graph. Same `DOMPurify.sanitize` API.
- [x] Task 2: Convert all `from 'lucide-svelte'` barrel imports to per-icon paths (`lucide-svelte/icons/<name>`). 46 files. Cuts ~2 MB initial chunk.
- [x] Task 3: Convert 3 dynamic `editor.service` imports to static (`fs.service.ts:171`, `meta-bind-button-widget.ts:119`, `wikilink-navigation.ts:19`). Run `pnpm madge --circular` first to confirm no cycles.

## Deferred (separate PR)

- Investigate why FontAwesome ~929 KB chunk lands in initial graph despite dynamic `await import()` in `file-icons.icon-data.ts`.
- Lazy-load icon packs so they only load when picker opens.
- Drop `vite-plugin-sveltekit-guard` if unused.
- Trim shiki grammars.
- Remove `@doist/todoist-sdk` (kills `undici` fully).

## Notes

- Branch: `chore/perf-bundle-cleanup`
- Tauri uses `adapter-static` + `ssr=false` — no SSR path, so node-only deps are pure waste.
- Baseline metrics (pre-change):
  - Largest chunks: mermaid 5.3 MB (already lazy), lucide barrel 2 MB, FA 929 KB, remix 1 MB, shiki(?) 932 KB
  - 200+ `node:*` externalization warnings from undici
  - Build time: vite ~30s client + 1m11s server
