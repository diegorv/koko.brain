VERDICT: APPROVED

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | blocker | An alias chain splices `Shared` subtrees past the depth limit and overflows the stack | resolved | 8d807206: `register` (parsing.rs:708-716) stores `height()` next to `size()`. `build_node` passes `depth + 1` to every child of a sequence or map (parsing.rs:752, 763-764), and the root starts at 0 (:786). `resolve(id, depth)` (parsing.rs:721-733) returns null when `depth + height > MAX_YAML_NESTING_DEPTH`. That uses the same count as `read_events` (:629-632: the root map plus 127 nested collections is the most allowed). `height()` returns the stored height for a `Shared` node, so a nested anchor chain is still walked once overall (linear), and a resolved alias's height already includes the aliases inside it. Drop is bounded too: the `Anchors` value is a temporary in the `build_node` call at :786, so it is dropped before `root`, and the last `Rc` holder sits either at its anchor (bounded by the event depth) or at an alias the check accepted. New test `alias_chain_cannot_nest_past_the_depth_limit` (parsing.rs:3458-3489) uses the reviewer's 13-anchor chain on a 1 MiB thread, checks that `a1` resolves to 126 nested lists, and checks that every projected value nests less than 128 deep. It passes. The 1 MiB stack instead of the 256 KiB the review asked for is acceptable: 256 KiB was a suggestion in a finding, not an acceptance criterion. 1 MiB is below the 2 MiB `spawn_blocking` stack that overflowed, and the unbounded chain projects to about 1,636 levels, so it would not fit in 1 MiB. I did not re-run the red step myself: changing the source is out of scope for this step. |
| 2 | minor | `.expect("parser thread did not overflow")` is misleading | resolved | parsing.rs:3384-3385 now reads `.expect("parser thread panicked")`, with a comment that an overflow aborts the binary. The new test uses the same wording. |

## Acceptance criteria re-checked

- [met] A failing test first: a frontmatter block nested well past the limit through a compact block sequence (`a: - - - … x`) returns without overflowing the stack and matches the subset parser's output. Run it in a thread with a small stack (`std::thread::Builder::new().stack_size(...)`) so the test cannot pass just because the test thread has a large stack. — the fix only rewords the `.expect` message of `block_nested_far_past_the_depth_limit_falls_back_without_overflowing`. The test still uses its 256 KiB thread and the same assertions, and it passes.
- [met] A block nested exactly at the limit still parses through yaml-rust2. — the alias check applies only to `YamlEvent::Alias`, so alias-free trees are unchanged. `block_nested_exactly_at_the_depth_limit_parses_through_yaml` passes, and the new test's `a1` (root map + 126 sequences + an alias of height 0) resolves.
- [met] Nested anchors (`&a1 [&a2 [&a3 ...]]`) at the limit build in time and memory linear in the input. Assert on the result; a test does not need to measure time. — `height()` stops at the stored height of a `Shared` node, so each node is walked once per registration, just as `size()` is. `nested_anchors_at_the_depth_limit_share_their_subtrees` still asserts `Rc::ptr_eq` and the stored sizes (adjusted only for the new tuple field), and it passes.
- [met] The alias budget behaviour is unchanged: the existing tests for it pass unedited. — the budget condition in `resolve` is unchanged and the depth check is added with `&&`. `vault_frontmatter_parity_test.rs` is not in `git diff main...HEAD`, and its 10 tests pass, `nested_alias_expansion_is_capped` included.
- [met] The depth fallback writes exactly one `FRONTMATTER` debug log, like the other fallbacks. — `read_events` and `parse_yaml_block` are unchanged by the fix. `vault_event_frontmatter_test` (12) passes. An alias over the depth limit resolves to null without a log, the same as an alias past the alias budget, and the ADR records this.
- [met] The ADR 0029 amendment lists the depth limit with the other fallback inputs. — docs/adr/0029-frontmatter-yaml-canonical-form.md:105 still lists the depth limit and adds that an alias whose subtree would go past it resolves to null.

## Findings

None open or new.

## Checks run (re-review)

- `cargo test --manifest-path src-tauri/Cargo.toml --lib vault::`: exit 0, 346 passed (includes `alias_chain_cannot_nest_past_the_depth_limit`).
- `cargo test --manifest-path src-tauri/Cargo.toml --test vault_frontmatter_parity_test --test vault_event_frontmatter_test`: exit 0, 10 + 12 passed.
- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/properties/frontmatter-parity.test.ts`: exit 0, 56 passed.
- Full `cargo test`, `pnpm vitest run` and `pnpm build` are deliver's to run.
- Scope: the fix commits touch only parsing.rs, the ADR 0029 line and review.md. No test was weakened or deleted, and nothing changed in the layer baseline or the composition roots.
