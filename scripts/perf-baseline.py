#!/usr/bin/env python3
"""
Kokobrain - Perf baseline parser.

Reads `[PERF-BASELINE] <label>: <ms>ms` entries from the most recent kokobrain
log file (or a specific one via --log) and computes count / median / p95 / min
/ max per label. Used to capture before/after numbers for the multi-phase
performance refactor (see tasks/todo/performance-architecture-refactor.md).

Pair with `docs/perf/baseline-template.md`'s manual repro sequence: enable
debug logging in Settings, run the sequence, then run this script.

Usage:
    python3 scripts/perf-baseline.py                      # parse latest log
    python3 scripts/perf-baseline.py --log path/to.log    # parse specific log
    python3 scripts/perf-baseline.py --json               # JSON output
    python3 scripts/perf-baseline.py --filter switchTab   # only labels containing
"""

from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
from pathlib import Path

LOG_DIR = Path.home() / "Library" / "Logs" / "com.diegorv.kokobrain"

# Matches `[HH:mm:ss.SSS] [PERF-BASELINE] <label>: <ms>ms`.
# Label is greedy `.+` so it tolerates colons inside labels (e.g. `switchTab:sync`);
# the regex backtracks until the trailing `: <number>ms` anchored at end-of-line matches.
LINE_RE = re.compile(
    r"^\[\d{2}:\d{2}:\d{2}\.\d{3}\] \[PERF-BASELINE\] (?P<label>.+): (?P<ms>[0-9]+(?:\.[0-9]+)?)ms\s*$"
)


def latest_log(log_dir: Path) -> Path | None:
    """Return the most recently modified .log file in the directory."""
    logs = sorted(log_dir.glob("*.log"), key=lambda p: p.stat().st_mtime)
    return logs[-1] if logs else None


def parse_log(path: Path) -> dict[str, list[float]]:
    """Parse a log file and group PERF-BASELINE samples by label."""
    samples: dict[str, list[float]] = {}
    with open(path, "r") as f:
        for line in f:
            m = LINE_RE.match(line)
            if not m:
                continue
            label = m.group("label").strip()
            ms = float(m.group("ms"))
            samples.setdefault(label, []).append(ms)
    return samples


def percentile(values: list[float], pct: float) -> float:
    """Compute pct-th percentile (0-100) using linear interpolation."""
    if not values:
        return 0.0
    if len(values) == 1:
        return values[0]
    s = sorted(values)
    k = (len(s) - 1) * (pct / 100.0)
    lo = int(k)
    hi = min(lo + 1, len(s) - 1)
    frac = k - lo
    return s[lo] * (1 - frac) + s[hi] * frac


def summarize(samples: dict[str, list[float]]) -> list[dict[str, object]]:
    """Compute count / median / p95 / min / max per label, sorted by label."""
    rows: list[dict[str, object]] = []
    for label in sorted(samples.keys()):
        values = samples[label]
        rows.append({
            "label": label,
            "count": len(values),
            "median_ms": round(statistics.median(values), 1),
            "p95_ms": round(percentile(values, 95), 1),
            "min_ms": round(min(values), 1),
            "max_ms": round(max(values), 1),
        })
    return rows


def print_table(rows: list[dict[str, object]], log_path: Path) -> None:
    """Print a fixed-width table to stdout."""
    if not rows:
        print(f"No PERF-BASELINE entries found in {log_path}")
        print("Hint: enable Settings -> Debug -> 'Log to file' and re-run the repro.")
        return

    headers = ("label", "count", "median_ms", "p95_ms", "min_ms", "max_ms")
    label_w = max(len("label"), max(len(str(r["label"])) for r in rows))
    num_w = 10

    line = f"{headers[0]:<{label_w}}  " + "  ".join(f"{h:>{num_w}}" for h in headers[1:])
    print(f"Source: {log_path}")
    print(f"Samples: {sum(int(r['count']) for r in rows)} across {len(rows)} labels")
    print()
    print(line)
    print("-" * len(line))
    for r in rows:
        print(
            f"{str(r['label']):<{label_w}}  "
            f"{r['count']:>{num_w}}  "
            f"{r['median_ms']:>{num_w}}  "
            f"{r['p95_ms']:>{num_w}}  "
            f"{r['min_ms']:>{num_w}}  "
            f"{r['max_ms']:>{num_w}}"
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Kokobrain perf-baseline parser")
    parser.add_argument("--log", type=Path, help="Path to a specific .log file (default: latest in ~/Library/Logs/com.diegorv.kokobrain/)")
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of a table")
    parser.add_argument("--filter", type=str, help="Only include labels containing this substring")
    args = parser.parse_args()

    if args.log:
        log_path = args.log
        if not log_path.exists():
            print(f"Log file not found: {log_path}", file=sys.stderr)
            sys.exit(1)
    else:
        if not LOG_DIR.exists():
            print(f"Log directory not found: {LOG_DIR}", file=sys.stderr)
            print("Hint: run the app at least once with debug logging enabled.", file=sys.stderr)
            sys.exit(1)
        latest = latest_log(LOG_DIR)
        if not latest:
            print(f"No .log files in {LOG_DIR}", file=sys.stderr)
            sys.exit(1)
        log_path = latest

    samples = parse_log(log_path)
    if args.filter:
        needle = args.filter
        samples = {k: v for k, v in samples.items() if needle in k}

    rows = summarize(samples)

    if args.json:
        print(json.dumps({"source": str(log_path), "rows": rows}, indent=2))
    else:
        print_table(rows, log_path)


if __name__ == "__main__":
    main()
