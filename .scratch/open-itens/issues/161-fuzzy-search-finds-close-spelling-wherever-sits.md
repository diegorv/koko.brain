# 161: Fuzzy search finds a close spelling wherever it sits in the vocabulary, not only among the first 500 words with the same first letter

**Origin:** `audit-2026-11-05` Issue 50, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** expand_fuzzy_terms fetches candidates with expand_vocab_terms(conn, 'm%', 500) (src-tauri/src/search/fuzzy.rs:55-58), i.e. `SELECT DISTINCT term FROM notes_fts_vocab WHERE term LIKE ?1 LIMIT ?2` (src-tauri/src/db/fts_repo.rs:251-258). The vocab table (fts5vocab instance, src-tauri/src/db/schema.rs:109) yields terms in alphabetical order, so the cap keeps the alphabetically first 500 terms for that letter, and Levenshtein runs only on those (fuzzy.rs:60-67). A target past that point never becomes a candidate; build_fts_query then searches only the misspelled term (src-tauri/src/commands/search_index.rs:388-397) and the user gets 'No results found'. LIKE also gives fts5vocab no term bound, so each fuzzy term walks every earlier letter. Fix direction: bound the candidate scan by term range (term >= first letter AND term < next code point) and by a length window from auto_distance, and drop or move the cap so it cannot cut candidates by alphabet. Exact-spelling queries are unaffected today and must stay so.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** Rust only: `cargo test --manifest-path src-tauri/Cargo.toml`.

- [ ] Failing test first, in src-tauri/tests/search_fuzzy_test.rs: populate_vocab with 600 distinct words that start with 'm' and sort before 'meeting' (e.g. 'maa000' .. 'maa599') plus 'meeting'; expand_fuzzy_terms(conn, "meating") contains "meeting". It fails today.
- [ ] A first letter outside ASCII (e.g. 'é') still finds its close matches.
- [ ] The existing fuzzy tests (short terms, distance thresholds, no duplicates) stay green.
- [ ] Rust gate: cargo test --manifest-path src-tauri/Cargo.toml passes (clippy is gated in CI).

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/low. It needs a vocabulary of more than 500 words for one letter.
- **Trigger:** Text mode with the fuzzy toggle on (the default), a misspelled word of 3+ characters such as `meating`, in a vault large enough to hold more than 500 distinct indexed words (content, titles, paths, headings, tags) that start with the same letter and sort before the intended word.
- **Evidence (verified by reading code at `5f8003d67`):** src-tauri/src/commands/search_index.rs:388-389 expand_fuzzy_terms per term when fuzzy is on (store default true at src/lib/features/search/search.store.svelte.ts:22) -> src-tauri/src/search/fuzzy.rs:55-58 pattern '<first char>%' and cap 500 -> src-tauri/src/db/fts_repo.rs:251-258 DISTINCT term ... LIKE ?1 LIMIT ?2 -> src-tauri/src/db/schema.rs:109 notes_fts_vocab USING fts5vocab(notes_fts, instance), iterated in term order -> fuzzy.rs:60-67 Levenshtein over the capped candidates only -> search_index.rs:390-397 falls back to the bare misspelled term when nothing expands. help/documentation/06-search-and-navigation.md:122 promises 'meating' finds 'meeting'. src-tauri/tests/search_fuzzy_test.rs uses small vocabularies only.
- **Second opinion:** upheld (ux, low). Confirmed. fuzzy.rs:55-58 builds '<first char>%' with a cap of 500, and expand_vocab_terms runs `SELECT DISTINCT term ... LIKE ?1 LIMIT ?2` over the fts5vocab instance table, which comes back in term order. Levenshtein runs only on that capped prefix, so a target past the first 500 terms for its letter is never a candidate. It needs a large vocabulary for one letter, and the result is a missed search hit, not data loss. Corrections to apply while implementing: Category ux, not content.
- **Source:** audit 2026-11-05, domain `index`, finding `N-index-06` (from index-rust-2). Size S.

## Comments
