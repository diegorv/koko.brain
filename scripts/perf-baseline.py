#!/usr/bin/env python3
"""
Kokobrain — PERF-BASELINE log parser.

Parses a session log file produced with settingsStore.perfBaseline = true
and aggregates PERF-BASELINE timings by "<TAG> <label>". Reports sample
count, median (p50), p95, min, and max per key.

Usage:
    python3 scripts/perf-baseline.py                      # latest log in ~/Library/Logs/com.diegorv.kokobrain/
    python3 scripts/perf-baseline.py path/to/session.log  # specific file
    python3 scripts/perf-baseline.py --json               # JSON output
    python3 scripts/perf-baseline.py --since 10:30:00     # lines with timestamp >= HH:mm:ss
    python3 scripts/perf-baseline.py --grep TAB_SWITCH    # keep only keys matching substring

Input line format (as produced by perfEnd when perfBaseline is on):
    [HH:mm:ss.SSS] [PERF-BASELINE] <TAG> <label>: <elapsed>ms [<meta>]

Meta is kept in the aggregation key only if --with-meta is passed. Otherwise
meta is stripped so repeated events group together.
"""

from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
from pathlib import Path
from typing import Optional

LOG_DIR = Path.home() / "Library" / "Logs" / "com.diegorv.kokobrain"

# [HH:mm:ss.SSS] [PERF-BASELINE] <TAG> <label>: <elapsed>ms [<meta>]
LINE_RE = re.compile(
    r"^\[(?P<ts>\d{2}:\d{2}:\d{2}\.\d{3})\] "
    r"\[PERF-BASELINE\] "
    r"(?P<key>\S+ \S+?): "
    r"(?P<ms>\d+(?:\.\d+)?)ms"
    r"(?: (?P<meta>.+))?$"
)


def find_latest_log() -> Optional[Path]:
    if not LOG_DIR.is_dir():
        return None
    logs = sorted(LOG_DIR.glob("*.log"))
    return logs[-1] if logs else None


def parse(
    path: Path,
    since: Optional[str],
    grep: Optional[str],
    with_meta: bool,
) -> dict[str, list[float]]:
    samples: dict[str, list[float]] = {}
    with path.open("r", errors="replace") as fh:
        for raw in fh:
            m = LINE_RE.match(raw.rstrip("\n"))
            if not m:
                continue
            if since and m["ts"] < since:
                continue
            key = m["key"]
            if with_meta and m["meta"]:
                key = f"{key} [{m['meta']}]"
            if grep and grep not in key:
                continue
            samples.setdefault(key, []).append(float(m["ms"]))
    return samples


def percentile(sorted_values: list[float], p: float) -> float:
    if not sorted_values:
        return 0.0
    # Linear interpolation, standard "closest rank"
    k = (len(sorted_values) - 1) * p
    lo = int(k)
    hi = min(lo + 1, len(sorted_values) - 1)
    frac = k - lo
    return sorted_values[lo] * (1 - frac) + sorted_values[hi] * frac


def summarize(samples: dict[str, list[float]]) -> list[dict]:
    rows = []
    for key, values in samples.items():
        values.sort()
        rows.append({
            "key": key,
            "n": len(values),
            "median_ms": round(statistics.median(values), 2),
            "p95_ms": round(percentile(values, 0.95), 2),
            "min_ms": round(values[0], 2),
            "max_ms": round(values[-1], 2),
            "total_ms": round(sum(values), 2),
        })
    rows.sort(key=lambda r: r["median_ms"], reverse=True)
    return rows


def render_table(rows: list[dict]) -> str:
    if not rows:
        return "(no PERF-BASELINE lines matched)"
    headers = ("key", "n", "median_ms", "p95_ms", "min_ms", "max_ms", "total_ms")
    widths = {h: max(len(h), max(len(str(r[h])) for r in rows)) for h in headers}
    out = []
    out.append(" | ".join(h.ljust(widths[h]) for h in headers))
    out.append("-+-".join("-" * widths[h] for h in headers))
    for r in rows:
        out.append(" | ".join(str(r[h]).ljust(widths[h]) for h in headers))
    return "\n".join(out)


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("path", nargs="?", help="Log file (default: latest in system log dir)")
    ap.add_argument("--json", action="store_true", help="Output JSON instead of a table")
    ap.add_argument("--since", metavar="HH:MM:SS", help="Drop lines before this timestamp")
    ap.add_argument("--grep", metavar="SUBSTR", help="Keep only keys containing this substring")
    ap.add_argument("--with-meta", action="store_true", help="Include meta suffix in aggregation key")
    args = ap.parse_args(argv)

    if args.path:
        path = Path(args.path)
    else:
        latest = find_latest_log()
        if not latest:
            print(f"error: no logs found in {LOG_DIR}", file=sys.stderr)
            return 1
        path = latest
        print(f"# log: {path}", file=sys.stderr)

    if not path.is_file():
        print(f"error: not a file: {path}", file=sys.stderr)
        return 1

    samples = parse(path, args.since, args.grep, args.with_meta)
    rows = summarize(samples)

    if args.json:
        json.dump({"path": str(path), "rows": rows}, sys.stdout, indent=2)
        sys.stdout.write("\n")
    else:
        print(render_table(rows))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
