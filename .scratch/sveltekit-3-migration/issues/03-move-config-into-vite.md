# 03: Move Svelte/kit config into the Vite config on kit 2

**What to build:** the app builds and tests with all Svelte/kit configuration living in the Vite config and no standalone Svelte config file, while still on kit 2. Vitest gets its own preprocess since it no longer finds a config file. The Tauri before-build fingerprint stops tracking the removed file.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Standalone Svelte config file removed; adapter (with SPA fallback) and preprocess configured inline
- [x] Vitest compiles components with preprocess
- [x] Before-build fingerprint updated
- [x] pnpm check + pnpm vitest run + pnpm build green and the built SPA fallback page exists
