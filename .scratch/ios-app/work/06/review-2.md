VERDICT: APPROVED

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | minor | `docs/REMOTE-ACCESS.md:33` said video plays but may not seek | resolved | Line 33 now says the host does not answer byte-range requests, so a video may not play at all in Safari (iOS, iPadOS, Mac) and may not seek where it plays. `research/next-phases.md` moved the Range 206/416 + ETag item out of "Host hardening" into a new section 3b, to land before X4. Docs only, so no test applies. |
| 2 | nit | `asset_path` copied `require_vault_path` | resolved | `dispatch.rs:116-146`: both now call `vault_path_rule(root, path, allow_root)`. I traced it against the old bodies. `require_vault_path` (allow_root=true) keeps the root exception on the client and canonical spellings, plus the settings-file check. `asset_path` (allow_root=false) is unchanged and still returns `canon`. Covered by `remote_containment_test`, `remote_ws_test` and `remote_asset_test`, which all pass. |
| 3 | nit | HEAD read the whole file | resolved | `server.rs:444-454`: on HEAD the length comes from `fs::metadata`, and only for `is_file()`; otherwise 404. `Response.length` feeds `Content-Length` in `write_response` (`server.rs:506`), with `body.len()` as the fallback, so other responses are unchanged. Type and security headers are still added on HEAD. Tests: `head_returns_the_headers_without_the_body` now asserts `Content-Length` = `PNG.len()`; `head_on_a_folder_is_not_found` is new (the fixture creates `media/`). |
| 4 | nit | Stand-in doc comment not rewrapped | resolved | `tauri-bridge-stand-in.ts:12-16` is rewrapped. Comment-only change. |

## Acceptance criteria re-checked

- [met] An asset endpoint on the host serves a vault file by vault-relative path, through the containment from 03 and the same access rules as the page (and the identity rule from 04 once that is merged) — the fix moved the containment into `vault_path_rule` (`dispatch.rs:132-146`) without changing what it does: the client and canonical spellings are both checked, plus `is_settings_file`, and the canonical path is returned. `asset_response` still runs after `request_allowed` and the Origin check. `remote_asset_test` (21) and `remote_containment_test` (14) pass.
- [met] Tests: `.kokobrain/**` and paths outside the vault refused; an `.html` asset gets the sandbox and attachment headers; a cross-site request refused — all the tests round 1 cited are still in `remote_asset_test.rs`, none weakened. The diff only adds one assertion and one test. All 21 pass.

## Findings

1. nit — `src-tauri/src/remote/server.rs:444-448`: HEAD and GET can now disagree on a file that exists but cannot be read (for example mode 000). HEAD answers 200 from `fs::metadata`, while GET's `fs::read` fails and answers 404. This is harmless: browsers do not use HEAD for `<img>` or `<video>`. Fix (optional): accept it, or call `File::open` on HEAD to check that the file can be read without reading it.

## Checks run by this review

- `pnpm check`: 0 errors, 0 warnings (exit 0).
- `pnpm vitest run src/tests/lib/app/remote/tauri-bridge-stand-in.test.ts`: 29/29 pass (exit 0).
- `cargo test --manifest-path src-tauri/Cargo.toml --test remote_asset_test --test remote_server_test --test remote_ws_test --test remote_containment_test --test remote_policy_test --test remote_access_test`: all pass (exit 0): asset 21, server 23, ws 28, containment 14, policy 11, access 7.
- Not run: the full vitest suite, `pnpm build`, full `cargo test` and clippy (deliver's gate).
- Scope: the fix commit touches only the four files the findings named, the asset test and the `.scratch` records. No `#[ts(export)]` type, layer baseline or composition root changed. No test was removed or weakened.
