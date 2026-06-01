# Bug Hunt Fixes (src-tauri/)

Output of a multi-agent bug hunt across the Rust backend with adversarial verification (default-refute skeptic per finding), then a deep second pass over the 4 largest files split into 17 function clusters.

- Pass 1 (13 module finders): 2 raised -> 1 confirmed, 1 false-positive.
  - DONE: watcher debounce starvation (`vault/watcher.rs:149`) fixed in commit `dac9bd0`.
- Pass 2 (17 cluster finders, lower conservatism): 12 raised -> 9 confirmed, 1 uncertain, 2 false-positive.

All 9 confirmed findings below were re-verified by hand against the real code. Ordered by ROI (impact / fix-complexity). Batch 1 = the three quick wins (#5, #4, #2).

Workflow per item (Rust-only -> `cargo test --manifest-path src-tauri/Cargo.toml`): test-first where practical (add/extend the test, confirm RED), fix, confirm GREEN, run the suite, one commit each with the full detailed format. Mark `[x]` and update this file immediately after each commit.

## Batch 1 — quick wins (LOW-ish complexity, high ROI)

- [ ] #5 scan_dir aborts the whole file tree on a transient per-file stat error. `commands/vault.rs:103`. Impact HIGH (file explorer goes empty when any file is deleted/renamed mid-scan — common during editing). Complexity LOW. Fix: replace `fs::symlink_metadata(&file_path).map_err(...)?` with `match ... { Ok(m) => m, Err(_) => continue }`, mirroring sibling `walk_dir` (`utils/fs.rs:123-126`). Test: scan a dir, assert a vanished entry is skipped not fatal.
- [ ] #4 incremental save embeds raw `content` (no heading prefix); bulk index embeds `embed_text()` (with prefix). `commands/semantic.rs:949`. Impact MED (silent semantic-search quality degradation on every save of a note with headings). Complexity LOW. Fix: build `texts` from `chunk.embed_text()` (owned `Vec<String>` + refs, like build path `:458-461`). Caveat: already-corrupted chunks won't self-heal because `content_hash` already matches — note an optional re-embed/model-hash bump migration. Test: assert update path uses the embed_text projection.
- [ ] #2 resolves_to ignores wikilink path prefix -> false-positive relationship backlinks on basename collisions. `vault/index.rs:620`. Impact MED (phantom `belongs_to`/`related_to`/`has_many` backlinks when 2+ notes share a basename). Complexity LOW-MED. Fix: delegate to `resolve_with_cache(target, &self.by_path)` then `== expected_path`, basename string-compare only as final fallback for unresolvable targets. Note: `by_path` has no path-qualified keys, so this cuts false positives to at most the first-wins peer rather than truly honoring the prefix. Test: two notes same basename in different dirs + a `_belongs_to` pointing at one; assert the other gets no backlink.

## Batch 2 — solid mediums

- [ ] #1 unlinked-mention search under-counts when a byte-length-changing uppercase char (İ, ẞ, Ⱥ, Ⱦ) precedes the term. `vault/parsing.rs:946` (root: callers `vault/index.rs:130,692` apply `.to_lowercase()` on top of byte-length-preserving `strip_non_body_content`). Impact MED (Turkish/Azeri notes silently lose mentions; İ ubiquitous there). Complexity MED. Fix: build `stripped_lower` with a byte-length-preserving lowercase (ASCII-only lowercase, non-ASCII left as-is) in both callers, and lowercase `term` the same way inside `find_plain_text_mention_positions` so the schemes match. Test: `content="İ Note end"`, term `Note` -> 1 match; cover ẞ/Ⱥ/Ⱦ.
- [ ] #6 create_note / create_folder perform no vault-boundary check -> path traversal writes outside the vault. `commands/vault.rs:777,803`. Impact MED (security; plant files anywhere writable via a crafted `[[../../x]]` wikilink + user click). Complexity MED-HIGH (cross-language). The doc comment claiming plugin-fs ACL covers it is wrong — `std::fs` in a custom command bypasses plugin-fs ACL. Sibling `read_files_batch` (`commands/files.rs:30-59`) validates. Fix: thread the vault root into both commands (new `vault_path` param updating the TS invoke sites, or read managed vault state if one exists), canonicalize `path.parent()` + assert `starts_with(vault_root)`, reject on escape. Test: reject a `..`-escaping path; allow an in-vault path.
- [ ] #3 full-build path leaves stale embeddings for a file emptied below the chunk threshold, and re-reads it on every startup. `commands/semantic.rs:406`. Impact MED (orphan vectors surface in search; perpetual re-read/re-chunk). Complexity MED-HIGH (orchestration — write a regression test FIRST per the orchestration rule). Fix: after Phase 2, compute changed-files paths that produced zero chunks (`changed_files` paths minus `all_chunks` source_paths) and, in a transaction, `delete_chunks_for_path` + upsert their mtime — mirroring the zero-chunk handling already in `update_semantic_file:896-904`. Test: file with prior chunks edited to empty -> old chunks gone, mtime persisted, not re-read next build.

## Batch 3 — low / niche

- [ ] #9 toggle_task_in_content matches `[ ]` anywhere on the line -> toggling a checked task whose description contains a literal `[ ]` corrupts the description and leaves the checkbox unchanged. `vault/parsing.rs:1542`. Impact LOW (niche). Complexity MED. Fix: locate the checkbox at the task-marker position (reuse `TASK_RE`/`ORDERED_TASK_RE` group, or anchor `^(\s*(?:[-*+]|\d+\.)\s)\[([ xX\-/?!>])\]`) and flip only that char; leave description brackets untouched. Test: `- [x] document the [ ] empty checkbox` toggled -> checkbox flips, description intact.

## Batch 4 — parity divergences (DEBATABLE — skip unless the TS parity gate matters)

Both diverge from `tags.logic.ts` only on MALFORMED YAML, and in both cases the Rust output is arguably MORE correct than the TS mirror. Listed for completeness; not recommended unless byte-for-byte parity is contractually required (ADR 0025 / parity gate).

- [ ] #7 unterminated inline-array `tags: [a, b` -> Rust keeps whole inner, TS `slice(1,-1)` drops last char. `vault/parsing.rs:296`. Impact LOW. Complexity LOW (~3 LOC). Fix (if pursued): drop last char of `rest` on the `None` branch to match TS, or document the intentional divergence.
- [ ] #8 block-array stray `- ` (dash + only whitespace) item -> Rust continues, TS breaks. `vault/parsing.rs:323`. Impact LOW. Complexity LOW (~2 LOC). Fix (if pursued): `break` when `after_dash.is_empty()`.

## Notes

- Uncertain (NOT a confirmed bug): `commands/semantic.rs:131` — idle-unload timer can null the embedder between `ensure_embedder_loaded()` and use. Recoverable (returns `Err`, no panic). Revisit only if it surfaces.
- Rejected false-positives: `commands/semantic.rs:172` (reranker variant of the above — same recoverable shape), `commands/vault.rs:777` create_note exists()-then-write TOCTOU (separate from the #6 traversal gap; low value).
- Test command for all of these (Rust only): `cargo test --manifest-path src-tauri/Cargo.toml`.
