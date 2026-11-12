# 161: Fuzzy search finds a close spelling wherever it sits in the vocabulary, not only among the first 500 words with the same first letter

**Origin:** `audit-2026-11-05` Issue 50, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** expand_fuzzy_terms fetches candidates with expand_vocab_terms(conn, 'm%', 500) (src-tauri/src/search/fuzzy.rs:54-58), i.e. `SELECT DISTINCT term FROM notes_fts_vocab WHERE term LIKE ?1 LIMIT ?2` (src-tauri/src/db/fts_repo.rs:258). The vocab table (`fts5vocab(notes_fts, instance)`, src-tauri/src/db/schema.rs:148, one row per token occurrence) yields terms in alphabetical order, so the cap keeps the alphabetically first 500 terms for that letter, and Levenshtein runs only on those (fuzzy.rs:60-67). A target past that point never becomes a candidate; build_fts_query then searches only the misspelled term (src-tauri/src/commands/search_index.rs:388-397) and the user gets 'No results found'. LIKE also gives fts5vocab no term bound, so each fuzzy term walks every earlier letter. Fix direction: bound the candidate scan by term range (term >= first letter AND term < next code point) and by a length window from auto_distance, and drop or move the cap so it cannot cut candidates by alphabet. Exact-spelling queries are unaffected today and must stay so.

The vocab holds terms folded by the tokenizer (`unicode61 remove_diacritics 2`, schema.rs:13), while the query term is only lowercased (fuzzy.rs:52). Fold the query term the same way before building the range and before the Levenshtein comparison; otherwise a query that starts with an accented letter gets no candidates at all, and accents elsewhere in the word inflate the distance. No diacritic-folding helper exists in src-tauri today (hybrid.rs:56 notes that `query_terms` does not fold either), and Cargo.toml has no normalization crate.

**Blocked by:** none

**Status:** ready-for-agent

**Answered:** 2026-11-12 (owner): approved as an addition to the queue after the 2026-11-12 deep dive. Nothing open.

**Gate:** Rust only: `cargo test --manifest-path src-tauri/Cargo.toml` + `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings` (relay-lite runs neither; run both before delivery).

- [ ] Failing test first, in src-tauri/tests/search_fuzzy_test.rs: populate_vocab with 600 distinct words that start with 'm' and sort before 'meeting' (e.g. 'maa000' .. 'maa599') plus 'meeting'; expand_fuzzy_terms(conn, "meating") contains "meeting". It fails today.
- [ ] The query term is folded like the tokenizer (`remove_diacritics 2`, schema.rs:13) before the range is built: with 'exito' in the vocab, expand_fuzzy_terms(conn, "éxitp") contains "exito". It fails today.
- [ ] A test on a real SQLite connection shows that the bounded vocab query (the range on `term` plus the length window) returns every vocabulary term with that first letter inside the length window, and no term with another first letter or outside the window. This confirms that fts5vocab accepts the range constraint on `term`; the deep dive only had it from memory.
- [ ] The existing fuzzy tests (short terms, distance thresholds, original term first, no duplicates) stay green.
- [ ] Rust gate: cargo test --manifest-path src-tauri/Cargo.toml passes.
- [ ] `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings` passes.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Low to medium (validate-s7+s8): fuzzy is on by default, and in a vault of about 4.5k notes the 500 cap is passed for common letters, but search is not on the owner's daily list. The result is a missed search hit, not data loss.
- **Trigger:** Text mode with the fuzzy toggle on (the default), a misspelled word of 3+ characters such as `meating`, in a vault large enough to hold more than 500 distinct indexed words (content, titles, paths, headings, tags) that start with the same letter and sort before the intended word.
- **Evidence (re-read at `318b6e9b5` by the 2026-11-12 deep dive):** src-tauri/src/commands/search_index.rs:388-389 expand_fuzzy_terms per term when fuzzy is on (store default true at src/lib/features/search/search.store.svelte.ts:22) -> src-tauri/src/search/fuzzy.rs:55-58 pattern '<first char>%' and cap 500 -> src-tauri/src/db/fts_repo.rs:258 DISTINCT term ... LIKE ?1 LIMIT ?2 -> src-tauri/src/db/schema.rs:148 notes_fts_vocab USING fts5vocab(notes_fts, instance), iterated in term order -> fuzzy.rs:60-67 Levenshtein over the capped candidates only -> search_index.rs:390-397 falls back to the bare misspelled term when nothing expands. help/documentation/06-search-and-navigation.md:123 promises 'meating' finds 'meeting'. src-tauri/tests/search_fuzzy_test.rs uses small vocabularies only.
- **Latency:** the unbounded LIKE walk over the `instance` table may also slow every fuzzy text search (inference, not measured). Report any timing you see; latency is not a gate.
- **Series:** cargo-gated, so never run it beside 003 or another cargo run. It shares `fts_repo.rs`, `search_index.rs` and help/documentation/06-search-and-navigation.md with 045; run the two in series.
- **Second opinion:** upheld (ux, low). Confirmed. fuzzy.rs:55-58 builds '<first char>%' with a cap of 500, and expand_vocab_terms runs `SELECT DISTINCT term ... LIKE ?1 LIMIT ?2` over the fts5vocab instance table, which comes back in term order. Levenshtein runs only on that capped prefix, so a target past the first 500 terms for its letter is never a candidate. Corrections to apply while implementing: Category ux, not content.
- **Source:** audit 2026-11-05, domain `index`, finding `N-index-06` (from index-rust-2). Size S.

## Comments

- 2026-11-12: approved as a queue addition after the 2026-11-12 deep dive (validate-s7+s8, cross-tests-relay M10 and H3). The 'é' criterion, which could not pass because the vocab stores folded terms, is replaced by one that folds the query term like the tokenizer. Added a test that fts5vocab accepts the range on `term`, a clippy criterion and clippy in the Gate, the 045 and cargo series notes, and corrected line references (schema.rs:148, fts_repo.rs:258, help :123).
