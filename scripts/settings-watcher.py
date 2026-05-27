#!/usr/bin/env python3
"""
Kokobrain — Live settings.json diff watcher.

Watches <vault>/.kokobrain/settings.json for changes and shows colored diffs
in real-time.

Usage:
    python3 scripts/settings-watcher.py /path/to/vault
    python3 scripts/settings-watcher.py              # uses ~/Documents/Kokobrain
"""

import sys
import time
import json
import difflib
from pathlib import Path

RED = "\033[91m"
GREEN = "\033[92m"
CYAN = "\033[96m"
DIM = "\033[2m"
RESET = "\033[0m"
BOLD = "\033[1m"

DEFAULT_VAULT = Path.home() / "Documents" / "Kokobrain"


def read_formatted(path: Path) -> str:
	"""Read and pretty-print JSON for stable diffing."""
	try:
		with open(path) as f:
			data = json.load(f)
		return json.dumps(data, indent=2, ensure_ascii=False, sort_keys=True)
	except (json.JSONDecodeError, FileNotFoundError) as e:
		return f"<error: {e}>"


def show_diff(old: str, new: str) -> None:
	old_lines = old.splitlines(keepends=True)
	new_lines = new.splitlines(keepends=True)
	diff = difflib.unified_diff(old_lines, new_lines, fromfile="before", tofile="after")

	for line in diff:
		line = line.rstrip("\n")
		if line.startswith("+++") or line.startswith("---"):
			print(f"{BOLD}{line}{RESET}")
		elif line.startswith("@@"):
			print(f"{CYAN}{line}{RESET}")
		elif line.startswith("+"):
			print(f"{GREEN}{line}{RESET}")
		elif line.startswith("-"):
			print(f"{RED}{line}{RESET}")
		else:
			print(f"{DIM}{line}{RESET}")
	print()


def main() -> None:
	vault = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_VAULT
	settings_path = vault / ".kokobrain" / "settings.json"

	if not settings_path.exists():
		print(f"Not found: {settings_path}")
		sys.exit(1)

	print(f"{BOLD}Watching:{RESET} {settings_path}")
	print(f"{DIM}Polling every 500ms. Ctrl+C to stop.{RESET}\n")

	prev = read_formatted(settings_path)
	prev_mtime = settings_path.stat().st_mtime

	try:
		while True:
			time.sleep(0.5)
			try:
				mtime = settings_path.stat().st_mtime
			except FileNotFoundError:
				continue

			if mtime != prev_mtime:
				prev_mtime = mtime
				curr = read_formatted(settings_path)
				if curr != prev:
					ts = time.strftime("%H:%M:%S")
					print(f"{BOLD}[{ts}] settings.json changed:{RESET}")
					show_diff(prev, curr)
					prev = curr
	except KeyboardInterrupt:
		print(f"\n{DIM}Stopped.{RESET}")


if __name__ == "__main__":
	main()
