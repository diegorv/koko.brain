VERDICT: APPROVED

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | Typed 8443/10000 silently replaced with 4747 | resolved | `RemoteAccessSection.svelte:25-33` sets `portNote` whenever the trimmed typed text differs from the normalized port, and clears it on an accepted port; rendered at lines 80-82 as `[data-testid="port-note"]`. Test `RemoteAccessSection.test.ts:131-143` asserts no note at first, a note naming 10000 and 4747 after committing 10000, and no note after committing 5123. The test passes. |
| 2 | Owner login compare is exact, nothing says so | resolved | The description at `RemoteAccessSection.svelte:97` now says to enter the login exactly as `tailscale status --json` prints it and that the match is case-sensitive. `access.rs` is unchanged (`git diff 834f517a..HEAD` touches no `src-tauri/` file), so the check still fails closed. Text only, so no test is needed. |
| 3 | Any call slower than 30 s ends the session | rejection stands | The criterion explicitly asks a call timeout to show the disconnected banner. `remote-transport.ts` is unchanged by the fix commit. Leaving this to the owner check on a large vault is reasonable. |

## Acceptance criteria re-checked

- [met] Settings shows the exact commands to publish and unpublish the host (`tailscale serve --bg --https=<port> http://127.0.0.1:<port>`, the matching `off` command, and `tailscale serve status`), with a port outside 443, 8443 and 10000 (the Funnel ports) and different from t3code's — the fix only adds the port note and leaves the commands block (`serve-commands`) and `normalizeRemoteServerPort` (`settings.logic.ts:47-51`) unchanged. The existing exact-text and Funnel-port tests in `RemoteAccessSection.test.ts` still pass, next to the port-note test.

## Findings

1. nit, `src/lib/app/remote/RemoteAccessSection.svelte:32`: the note compares the raw typed text with `String(port)`, so an accepted port typed in another form (`4747.0`, `04747`) shows "Port 4747.0 cannot be used here, so 4747 is used instead." even though that port was accepted. This is harmless and rare. Fix (optional): compare `Number.parseFloat(typed)` with `port` instead of the strings.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/app/remote/RemoteAccessSection.test.ts src/tests/lib/core/settings`: exit 0, all passed.
- The fix commit (5d32b992) changes only `RemoteAccessSection.svelte`, its test and `review.md`. No test was weakened or removed, there is no scope creep, and the layer baseline, BASELINE_SIZE and the composition roots are untouched. No `src-tauri/` change, so no cargo run was needed.
- The full suite (`pnpm vitest run && pnpm build`) is deliver's to run.
