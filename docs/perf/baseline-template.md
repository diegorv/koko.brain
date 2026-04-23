# Perf Baseline — `<YYYY-MM-DD>` on `<vault-name>` (`<N>` notes)

<!--
Template for capturing a PERF-BASELINE snapshot. Copy this file to
`docs/perf/baseline-<YYYY-MM-DD>.md`, run the reproduction sequence against
the real vault, and commit. Subsequent phase commits reference these numbers
for before/after comparisons.
-->

## Environment

- **Vault size**: `<N>` notes (from Settings → Vault stats, or `find <vault> -name '*.md' | wc -l`)
- **Machine**: `<model>`, `<cpu>`, `<ram>`
- **OS**: `<macos version>`
- **App build**: `<git rev-parse --short HEAD>` on `<branch>`
- **Background state**: daemon running? yes/no; file watcher active? yes/no
- **Date**: `<YYYY-MM-DD>`, local time `<HH:MM>`

## Reproduction Sequence

1. Quit the app fully.
2. Open Settings (before opening the vault) and toggle **Perf Baseline** on (`settingsStore.perfBaseline = true`). If no UI toggle exists yet, set it from devtools:
   ```js
   window.settingsStore?.updatePerfBaseline?.(true)
   ```
   or edit `.kokobrain/settings.json` in the vault root to add `"perfBaseline": true` and restart.
3. Open the real vault.
4. **Wait 10 seconds** for startup indexing to settle (watch for idle CPU).
5. Note the wall-clock time — you'll pass it to `--since`.
6. Execute the sequence (reproducibly, same files, same order):
   - Open 10 notes of varying size via the file explorer (mix small and large).
   - Switch between them with Cmd+1..Cmd+9 for 20 switches total.
   - Close 5 of the tabs (middle-click or Cmd+W).
   - Focus the largest remaining tab, click into the body, type 500 characters of plain prose (no commands / shortcuts).
   - Save (Cmd+S) — or let the auto-save 2s debounce fire.
7. Quit the app (this flushes the log write chain).

## Extract Numbers

```bash
python3 scripts/perf-baseline.py --since <HH:MM:SS> > docs/perf/baseline-<YYYY-MM-DD>.txt
```

Or pin a specific log file explicitly:

```bash
python3 scripts/perf-baseline.py "~/Library/Logs/com.diegorv.kokobrain/<file>.log" --since <HH:MM:SS>
```

Paste the resulting table into the `Results` section below. Also run `--json` once and commit the JSON next to the markdown for machine comparison across commits.

## Results

```
key                              | n  | median_ms | p95_ms | min_ms | max_ms | total_ms
---------------------------------+----+-----------+--------+--------+--------+---------
<paste table here>
```

### Key aggregates (human summary)

Fill in the median per key for the six headline hot paths. Phases 1–11 will track these against this baseline.

| Hot path                            | Median (ms) | p95 (ms) | n  |
|-------------------------------------|-------------|----------|----|
| `EDITOR openFileInEditor:fresh`     | …           | …        | …  |
| `EDITOR closeTab`                   | …           | …        | …  |
| `TAB_SWITCH tabSwitchEffect:total`  | …           | …        | …  |
| `CONTENT_SYNC externalSync:noop`    | …           | …        | …  |
| `ACTIVE-TAB updateActiveTabLinks`   | …           | …        | …  |
| `INDEX updateIndexesForFile(total)` | …           | …        | …  |

### Notes & observations

- Startup (cold open to first interactive): `<s>` seconds (stopwatch).
- Was the UI visibly janky during the typing step? Y/N, and on which character count?
- Any probe key you expected but didn't see (indicates a dead code path)? Any unexpected keys?
- Is the daemon running? Did it commit during the reproduction (check `git log --since="<HH:MM>"`)?

## Comparison with previous baseline

Link the previous `docs/perf/baseline-*.md`, list the deltas for the headline table above. Flag any regression >10% on any key as a blocker for the current phase.
