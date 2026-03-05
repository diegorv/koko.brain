# Integrated Terminal

Run shell commands without leaving Kokobrain.

**Shortcut:** `` Cmd+` `` or Command Palette → **"Toggle Terminal"**

---

## Overview

Kokobrain includes a full integrated terminal powered by xterm.js with WebGL rendering. It opens as a panel at the bottom or side of the window, so you can run commands, use git, or execute scripts without switching to a separate terminal app.

![Integrated terminal](screenshots/terminal.png)

## Features

- **Multiple sessions**: Click **"+"** to add a new terminal session. Each session gets its own tab and runs independently.
- **Session titles**: Each session tab shows its title based on the running process.
- **Close sessions**: Click **"×"** on a session tab to close it. The underlying process is terminated.
- **Starts in vault directory**: Every new terminal session opens with the current vault folder as the working directory.
- **Clickable URLs**: URLs in terminal output are clickable and open in your default browser.
- **Full color support**: The terminal uses `xterm-256color` for proper color rendering, supporting colored output from tools like `git diff`, `ls --color`, and syntax-highlighted scripts.

## How It Works

Each terminal session is a real pseudo-terminal (PTY) process. This means:

- Your shell runs as a native process (not emulated), supporting all your shell features, aliases, and configuration.
- Interactive programs like `vim`, `top`, `htop`, and `ssh` work as expected.
- The terminal resizes dynamically when you resize the panel — the underlying PTY dimensions are synchronized.
- All sessions are automatically terminated when you close the vault or quit the app.

## Shell Detection

Kokobrain uses the `$SHELL` environment variable to determine which shell to launch. On most macOS systems, this is `/bin/zsh`. You can override this in Settings.

## Configuration

Terminal settings are available under **Settings → Terminal**:

| Setting | Description | Default |
|---------|-------------|---------|
| **Font family** | CSS font-family for the terminal | System monospace |
| **Font size** | Size in pixels (8–24) | 13 |
| **Line height** | Line spacing multiplier (1.0–2.0) | 1.2 |
| **Shell** | Shell executable path (empty = system `$SHELL`) | — |

> [!TIP]
> If you use a custom shell like `fish` or `nushell`, set its path in Settings → Terminal → Shell.

---

## Next Steps

- [Trash](18-trash.md) — How deleted files are managed
- [Settings](19-settings.md) — Full settings reference
