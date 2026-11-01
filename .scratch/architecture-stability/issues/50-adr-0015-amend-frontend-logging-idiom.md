# 50: Amend ADR-0015 for the debug()/error() frontend logging idiom

**What to build:** `docs/adr/0015-dual-logging-frontend-rust.md` (title, Decision, Consequences) and its index row in `docs/adr/README.md` still present `appendLog` from `#lib/utils/log.service.js` as the frontend logging path. `CLAUDE.md` § Frontend logging now names `debug()` / `error()` from `#lib/utils/debug.js` as the idiom, with `appendLog` as the raw writer underneath. Add a dated amendment to 0015 that records this, citing `src/lib/utils/debug.ts` and `CLAUDE.md` § Frontend logging, and update the README index row. The ADR body above the amendment stays as written.

**Blocked by:** none

**Status:** needs-triage

**Gate:** docs only; no test reads these files.

**Source:** Issue 03 review (`.scratch/architecture-stability/work/03/review.md`, finding 5), branch `issue/03-adr-0034-derived-in-stores-and-doc-drift`.

- [ ] ADR-0015 has a dated amendment naming `debug()` / `error()` as the frontend idiom and `appendLog` as the raw writer, with paths
- [ ] The `docs/adr/README.md` row for 0015 no longer presents `appendLog` alone as the frontend path

## Comments
