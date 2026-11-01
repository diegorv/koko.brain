# 12: Type the E2E mock against CommandMap and cover every invoked command

**What to build:** Type `HANDLERS` in e2e/mocks/tauri-core.ts as an exhaustive mapped type over CommandMap.
- **Remove and add:** delete `search_vault`, which does not exist in Rust, and add the 12 remaining missing handlers (issue 36 adds `scan_vault_v2_cached`).
- **Fix return shapes:**
  - build_search_index -> full IndexStats
  - scan_vault_v2 -> NoteEntry[]
  - download_*_model -> boolean
  - cleanup_history -> number
- **Events:** type the event-bus emits in e2e/mocks/tauri-event.ts against EventMap.
- **Typecheck:** bring e2e/mocks under typecheck. Either add "e2e/mocks" to tsconfig include, or add a tsconfig.e2e.json that the CI frontend job runs. Add `e2e/**` to the frontend paths filter, so a mock-only change runs the typecheck.

**Blocked by:** 10, 11, 36

**Status:** needs-triage

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh`

**Source:** e2e/mocks/tauri-core.ts:1-12,199,321-385, e2e/mocks/vault-index.ts, vite.config.js:49-57, tsconfig.json include, src/lib/features/backlinks/backlinks.service.ts:101, src/lib/core/app-lifecycle/app-lifecycle.service.ts:300-336

- [ ] `pnpm check` fails when a CommandMap key has no handler or a handler returns the wrong shape (prove it by removing one handler)
- [ ] Issue 36's unknown-command allowlist is empty, so its console fixture fails on any unknown command

## Notes

- **The `scan_vault_v2_cached` null and the console fixture are issue 36**, which lands first with no blockers.
- **`scan_vault_v2 -> NoteEntry[]`** has no runtime value (the command is never invoked); only exhaustiveness forces it.
- **Missing commands:**
  - Updater: check_for_update_on_channel
  - Composer: dismiss_composer, submit_composer_capture
  - Semantic and search models: download_reranker_model, get_semantic_file_status, is_reranker_model_available, remove_semantic_file, search_hybrid, shutdown_semantic
  - Index: propagate_type_rename, remove_from_search_index, save_vault_cache
- **The mock is never typechecked today:** `tsconfig.json` includes only `src` and `vite.config.js`.
- **Size:** M.
