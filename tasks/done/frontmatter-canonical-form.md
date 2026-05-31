# Frontmatter Canonical Form: Spec + Hardening + Generator Rewrite

Codify Kokobrain's YAML frontmatter canonical form (quoting, empty handling, alias, list flow, key order) into a documented spec, tests, ADR, and machine-readable export. Harden the write path (warn on data loss, canonicalize on write). Rewrite the external Python generator at `koko.brain-os/vault/work/people/_generate.py` to match canonical form exactly. Goal: zero diff between generator output and post-app-save form.

Full plan: `~/.claude/plans/linked-honking-toast.md`.

## Tasks

- [x] Task 1: Pin `yaml` to `2.9.0` in `package.json` (drop caret). `pnpm install`.
- [x] Task 2: Extract `shouldQuoteScalar` + `canonicalizeScalar` to new `src/lib/features/properties/yaml-quoting.logic.ts`. Unit tests + parity test vs `yaml.stringify`.
- [x] Task 3: Apply `canonicalizeKey` on write path in `serializeProperties`. Update tests.
- [x] Task 4: Add `appendLog` warn on nested-object drop in `computeAndCache`. Test with `vi.spyOn`.
- [x] Task 5: Add canonical-form snapshot tests to `properties.logic.test.ts` (emails, URNs, wikilinks, empty, lists, reserved literals, key order, alias collapse).
- [x] Task 6: Write ADR `docs/adr/0029-frontmatter-yaml-canonical-form.md`. Update `docs/adr/README.md` index.
- [x] Task 7: Write `docs/specs/frontmatter-canonical-form.md` with JSON block enumerating rules.
- [x] Task 8: Rewrite `koko.brain-os/vault/work/people/_generate.py` using spec. **Two repos**: the OUTER repo (`koko.brain-os`) gitignores `vault/`, but `vault/` is itself a NESTED git repo with its own history. First run produced a legitimate one-time correction commit (`vault@0a3f38b "x1"`, 106 files / 1110 ins / 986 del) moving 105 person notes from the old-gen format (quoted URNs, quoted ISO dates, bare `key:` for empties) to the canonical form (bare URNs, bare ISO dates, `key: ""` for empties). After that commit, idempotence is stable: `python3 vault/work/people/_generate.py` followed by `git -C vault diff work/people/` returns empty.
- [x] Task 9: Add `_generate_test.py` parity test in `koko.brain-os`. 44 tests covering should_quote (mapping + flow), canonicalize_key, emit_scalar, emit_frontmatter (including the realistic person-note snapshot identical to the TS-side vitest). Committed inside the nested vault repo (`vault@d8198dd "Create _generate_test.py"`). Run via `python3 -m unittest _generate_test.py` -> 44/44 OK.

## Notes

- One commit per task per CLAUDE.md rule 10.
- Tasks 8-9 land in the NESTED vault git repo at `koko.brain-os/vault/` (outer `koko.brain-os` repo gitignores `vault/`). My earlier "zero diff in koko.brain-os" claim was misleading because I checked the outer repo (correctly clean by gitignore) instead of the nested repo; the user caught it. The nested repo had a legitimate one-time correction commit on first run, then stable idempotence after.
- Verification end-state: in the nested vault repo, `python3 _generate.py` then `git diff` returns empty.
