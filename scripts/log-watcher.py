#!/usr/bin/env python3
"""
Kokobrain — Live log watcher.

Watches ~/Library/Logs/com.diegorv.kokobrain/ for the most recent .log file,
tails it in real-time, and highlights ERROR lines in red.

Usage:
    python3 scripts/log-watcher.py            # watch latest log
    python3 scripts/log-watcher.py --all      # show all lines (default)
    python3 scripts/log-watcher.py --errors   # show only ERROR lines
"""

import os
import sys
import time
import argparse
from pathlib import Path

LOG_DIR = Path.home() / "Library" / "Logs" / "com.diegorv.kokobrain"

# ANSI colors
RED = "\033[1;31m"
YELLOW = "\033[0;33m"
DIM = "\033[2m"
RESET = "\033[0m"
CYAN = "\033[0;36m"
GREEN = "\033[0;32m"


def latest_log(log_dir: Path) -> Path | None:
    """Return the most recently modified .log file in the directory."""
    logs = sorted(log_dir.glob("*.log"), key=lambda p: p.stat().st_mtime)
    return logs[-1] if logs else None


def colorize(line: str) -> str:
    """Apply color based on line content."""
    stripped = line.rstrip()
    if not stripped:
        return line
    if "ERROR" in stripped:
        return f"{RED}{stripped}{RESET}"
    if "WARN" in stripped:
        return f"{YELLOW}{stripped}{RESET}"
    return f"{DIM}{stripped}{RESET}"


def tail_file(path: Path, errors_only: bool) -> None:
    """Tail a file, printing new lines as they appear."""
    with open(path, "r") as f:
        # Jump to end
        f.seek(0, 2)
        while True:
            line = f.readline()
            if line:
                if errors_only and "ERROR" not in line:
                    continue
                print(colorize(line), flush=True)
            else:
                time.sleep(0.1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Kokobrain log watcher")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--errors", action="store_true", help="Show only ERROR lines")
    group.add_argument("--all", action="store_true", default=True, help="Show all lines (default)")
    args = parser.parse_args()

    if not LOG_DIR.exists():
        print(f"{RED}Log directory not found: {LOG_DIR}{RESET}")
        sys.exit(1)

    print(f"{CYAN}Watching: {LOG_DIR}{RESET}")
    if args.errors:
        print(f"{YELLOW}Mode: errors only{RESET}")
    else:
        print(f"{DIM}Mode: all lines (errors highlighted in red){RESET}")
    print()

    current_log: Path | None = None
    current_file = None

    try:
        while True:
            newest = latest_log(LOG_DIR)

            # New log file appeared (app restarted, new session)
            if newest and newest != current_log:
                if current_file:
                    current_file.close()
                current_log = newest
                current_file = open(current_log, "r")
                # Jump to end — only show new lines going forward
                current_file.seek(0, 2)
                print(f"\n{GREEN}>>> Attached to: {current_log.name}{RESET}")

            if current_file:
                line = current_file.readline()
                if line:
                    if args.errors and "ERROR" not in line:
                        continue
                    print(colorize(line), flush=True)
                else:
                    time.sleep(0.1)
            else:
                print(f"{DIM}No log files yet… waiting{RESET}", end="\r")
                time.sleep(1)

    except KeyboardInterrupt:
        print(f"\n{DIM}Stopped.{RESET}")
    finally:
        if current_file:
            current_file.close()


if __name__ == "__main__":
    main()
