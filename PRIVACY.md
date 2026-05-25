# Privacy

**Privacy is a core value of this project.** Kokobrain is designed to work entirely offline - your notes never leave your machine.

- All data is stored locally as plain Markdown files
- Search indexing (FTS5 + semantic embeddings) runs locally via SQLite and ONNX Runtime
- The semantic search model is downloaded once from HuggingFace and runs locally - no API calls, no telemetry, no cloud processing
- **No analytics, no tracking, no accounts, no sign-up**

The only external network calls in the entire codebase are:

| Call | Where | Why |
|------|-------|-----|
| HuggingFace model download (BGE-M3) | `src-tauri/src/semantic/model.rs` | One-time download of the BGE-M3 ONNX embedder and tokenizer for local semantic search. After download, everything runs offline. |
| HuggingFace model download (BGE-reranker-v2-m3) | `src-tauri/src/semantic/model.rs` | One-time, opt-in download of the BGE-reranker-v2-m3 ONNX cross-encoder for higher-quality semantic and hybrid search. Only triggered when the user clicks "Download" in Settings. After download, everything runs offline. |
| Chart.js CDN | `src/lib/plugins/queryjs/dv-ui.ts` | Loads Chart.js for rendering charts in QueryJS results. |

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
