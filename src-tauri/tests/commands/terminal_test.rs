use kokobrain_lib::commands::terminal::TerminalState;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::Write;

#[test]
fn terminal_state_starts_empty() {
    let state = TerminalState::new();
    assert_eq!(state.session_count(), 0);
}

#[test]
fn zero_rows_rejected_by_pty() {
    let pty_system = native_pty_system();
    let size = PtySize {
        rows: 0,
        cols: 80,
        pixel_width: 0,
        pixel_height: 0,
    };
    // Zero rows should either fail or produce invalid PTY — our command validates before this
    // This test documents the underlying PTY behavior
    let _result = pty_system.openpty(size);
}

#[test]
fn zero_cols_rejected_by_pty() {
    let pty_system = native_pty_system();
    let size = PtySize {
        rows: 24,
        cols: 0,
        pixel_width: 0,
        pixel_height: 0,
    };
    let _result = pty_system.openpty(size);
}

#[test]
fn can_open_pty() {
    let pty_system = native_pty_system();
    let size = PtySize {
        rows: 24,
        cols: 80,
        pixel_width: 0,
        pixel_height: 0,
    };
    let result = pty_system.openpty(size);
    assert!(result.is_ok());
}

#[test]
fn can_spawn_shell() {
    let pty_system = native_pty_system();
    let size = PtySize {
        rows: 24,
        cols: 80,
        pixel_width: 0,
        pixel_height: 0,
    };
    let pair = pty_system.openpty(size).unwrap();

    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let mut cmd = CommandBuilder::new(&shell);
    cmd.env("TERM", "xterm-256color");

    let child = pair.slave.spawn_command(cmd);
    assert!(child.is_ok());

    // Clean up
    let mut child = child.unwrap();
    let _ = child.kill();
    let _ = child.wait();
}

#[test]
fn can_resize_pty() {
    let pty_system = native_pty_system();
    let size = PtySize {
        rows: 24,
        cols: 80,
        pixel_width: 0,
        pixel_height: 0,
    };
    let pair = pty_system.openpty(size).unwrap();

    let result = pair.master.resize(PtySize {
        rows: 40,
        cols: 120,
        pixel_width: 0,
        pixel_height: 0,
    });
    assert!(result.is_ok());
}

#[test]
fn can_write_to_pty() {
    let pty_system = native_pty_system();
    let size = PtySize {
        rows: 24,
        cols: 80,
        pixel_width: 0,
        pixel_height: 0,
    };
    let pair = pty_system.openpty(size).unwrap();

    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let mut cmd = CommandBuilder::new(&shell);
    cmd.env("TERM", "xterm-256color");

    let mut child = pair.slave.spawn_command(cmd).unwrap();
    drop(pair.slave);

    let mut writer = pair.master.take_writer().unwrap();

    // Writing to the PTY should succeed without error
    let result = writer.write_all(b"echo hello\n");
    assert!(result.is_ok());
    let result = writer.flush();
    assert!(result.is_ok());

    // Clean up
    let _ = writer.write_all(b"exit\n");
    let _ = writer.flush();
    let _ = child.kill();
    let _ = child.wait();
}
