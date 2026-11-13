# Privacy

**Privacy is a core value of this project.** Kokobrain works entirely offline by default - your notes never leave your machine. Two optional features send your data only after you enable them: Sentry error reporting and Todoist sync (the table below lists every network call). Todoist sync sends the tasks you sync, never whole notes.

- All data is stored locally as plain Markdown files
- Search indexing (FTS5 + semantic embeddings) runs locally via SQLite and ONNX Runtime
- The semantic search model is downloaded once from HuggingFace and runs locally - no API calls, no telemetry, no cloud processing
- **No analytics, no tracking, no accounts, no sign-up**. Sentry error reporting and Todoist sync are the optional exceptions that send data from your device: both are disabled by default. Sentry only starts after a user enables it and provides their own project DSN; Todoist sync only after a user enables it with their own API token and chooses a root project.

The only external network calls in the entire codebase are:

| Call | Where | Why |
|------|-------|-----|
| HuggingFace model download (BGE-M3) | `src-tauri/src/semantic/model.rs` | One-time download of the BGE-M3 ONNX embedder and tokenizer for local semantic search. After download, everything runs offline. |
| HuggingFace model download (jina-reranker-v2-base-multilingual) | `src-tauri/src/semantic/model.rs` | One-time, opt-in download of the jina-reranker-v2-base-multilingual ONNX cross-encoder for higher-quality semantic and hybrid search. Only triggered when the user clicks "Download" in Settings. After download, everything runs offline. |
| Chart.js CDN | `src/lib/plugins/queryjs/dv-ui.ts` | Loads Chart.js for rendering charts in QueryJS results. |
| Theme catalog | `src/lib/core/settings/theme-catalog.service.ts` | A GET of the public [koko.brain-themes](https://github.com/diegorv/koko.brain-themes) `index.json` from raw.githubusercontent.com when Settings > Appearance opens. Sends nothing about the vault. Installed and built-in themes never need the network. |
| Sentry error reporting | `src/lib/core/settings/sentry.service.ts`, `src-tauri/src/error_monitoring.rs` | Explicit per-vault opt-in. Sends error events and stack traces to the user-provided Sentry Cloud DSN. Session replay, performance traces, breadcrumbs, user identity, request data, logs, metrics, and release-health sessions are disabled. Rust panics use the same opt-in client. |
| Todoist sync | `src/lib/features/todoist-sync/` (`todoist-client.ts`, `tauri-fetch-adapter.ts`, `sync-now.service.ts`) | Explicit per-vault opt-in: needs your own Todoist API token and a chosen root project, and nothing is synced until you turn on **Sync with Todoist** in Settings > Todoist (the connection check and **Load projects** only read from your account). Talks only to `api.todoist.com`, through one endpoint, the Sync API (`POST https://api.todoist.com/api/v1/sync`), from TypeScript via `@tauri-apps/plugin-http`; Rust never contacts Todoist. Runs when you press **Todoist: Sync now** or **Todoist: Check sync connection** (or **Load projects** in Settings > Todoist), and, once sync is on and after the first manual sync, when the vault opens, every few minutes, when the window regains focus and shortly after you save a note that holds a synced task. **Sends** only the tasks, projects and sections of the tree you chose: task text, due date, recurrence rule, priority, labels, completion state, moves, project names (taken from note file names), section names (from `##` headings) and, in each new task's description, a `kokobrain:td-...` back-link. Never sent: note bodies, note paths or the vault path. **Receives** the account's active projects, sections and tasks on each sync (Todoist offers no server-side filter); everything outside the chosen tree is dropped in memory on the device and never stored. The token is stored in plain text in the vault's `.kokobrain/settings.json`. |

A [Privacy Check](https://github.com/diegorv/koko.brain/actions/workflows/privacy.yml) workflow runs on every push and pull request, scanning all `.ts` and `.rs` source files for external network calls. Any new external call that is not explicitly approved will fail the build.

## Embedded Local Files

Markdown images that point at a local file with `file://` (e.g. `![shot](file:///Users/you/Desktop/x.png)`) only render when the path falls inside one of the directories declared in `tauri.conf.json` under `app.security.assetProtocol.scope`:

- `~/Documents/**`
- `~/MyFiles/**`
- `~/kokobrain-vault/**`
- `~/Desktop/**`
- `~/Pictures/**`
- `~/Downloads/**`
- `~/Library/Caches/com.diegorv.kokobrain/**`

Paths outside this list are blocked by Tauri's asset-protocol scope at fetch time and silently fail to load. `file://host/...` style URLs (SMB / UNC) are rejected before reaching the asset handler. Editing this scope is a security-sensitive change - keep it as narrow as the capture flow needs.
