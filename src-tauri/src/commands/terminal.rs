use crate::utils::logger::debug_log;
use portable_pty::{native_pty_system, CommandBuilder, Child, MasterPty, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

/// Holds a running terminal session's resources.
/// The reader thread stops when `child.kill()` causes the PTY read to return EOF/error.
struct TerminalSession {
    /// Writer handle to send input to the PTY stdin
    writer: Box<dyn Write + Send>,
    /// Master PTY handle (needed for resize operations)
    master: Box<dyn MasterPty + Send>,
    /// The child shell process handle (needed for kill/wait)
    child: Box<dyn Child + Send + Sync>,
}

/// App-wide state managing all terminal sessions.
/// Registered as Tauri managed state via `app.manage()`.
pub struct TerminalState {
    sessions: Mutex<HashMap<String, TerminalSession>>,
}

impl TerminalState {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    /// Returns the number of active terminal sessions.
    /// Logs a warning if the mutex is poisoned (a thread panicked while holding it).
    pub fn session_count(&self) -> usize {
        match self.sessions.lock() {
            Ok(s) => s.len(),
            Err(e) => {
                eprintln!("WARNING: terminal sessions mutex poisoned: {e}");
                e.into_inner().len()
            }
        }
    }
}

/// Payload emitted to frontend when terminal produces output
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct TerminalOutput {
    session_id: String,
    data: String,
}

/// Creates a new PTY session, spawns the user's shell, and starts a
/// background reader thread that emits output events to the frontend.
/// Returns the unique session ID.
#[tauri::command]
pub fn spawn_terminal(
    app: AppHandle,
    state: State<'_, TerminalState>,
    cwd: String,
    rows: u16,
    cols: u16,
) -> Result<String, String> {
    // Validate cwd is an existing directory
    let cwd_path = std::path::Path::new(&cwd);
    if !cwd_path.is_dir() {
        return Err(format!("Working directory does not exist or is not a directory: {}", cwd));
    }

    // Validate PTY dimensions (zero values cause undefined behavior)
    if rows == 0 || cols == 0 {
        return Err(format!("Invalid PTY dimensions: rows={}, cols={} (both must be >= 1)", rows, cols));
    }

    let session_id = Uuid::new_v4().to_string();

    let pty_system = native_pty_system();
    let size = PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    };

    let pair = pty_system
        .openpty(size)
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    // Detect user's default shell
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    debug_log("TERMINAL", format!("Spawning session: {}, shell: {}, size: {}x{}", session_id, shell, rows, cols));

    let mut cmd = CommandBuilder::new(&shell);
    cmd.cwd(&cwd);
    // Set TERM for proper color support
    cmd.env("TERM", "xterm-256color");

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    // Drop slave — we only need the master side
    drop(pair.slave);

    let reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone PTY reader: {}", e))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to take PTY writer: {}", e))?;

    let sid_clone = session_id.clone();

    // Spawn background reader thread: reads PTY output and emits events.
    // The loop exits on EOF (child exited) or read error (child killed).
    thread::spawn(move || {
        let mut reader = reader;
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break, // EOF — shell process exited
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app.emit(
                        &format!("terminal:output:{}", sid_clone),
                        TerminalOutput {
                            session_id: sid_clone.clone(),
                            data,
                        },
                    );
                }
                Err(_) => break,
            }
        }
        // Emit exit event so frontend knows the process ended
        let _ = app.emit(
            &format!("terminal:exit:{}", sid_clone),
            sid_clone.clone(),
        );
    });

    // Store session in state
    let session = TerminalSession {
        writer,
        master: pair.master,
        child,
    };

    state
        .sessions
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?
        .insert(session_id.clone(), session);

    Ok(session_id)
}

/// Sends input data (keystrokes) to a terminal session's PTY stdin.
#[tauri::command]
pub fn write_terminal(
    state: State<'_, TerminalState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    let session = sessions
        .get_mut(&session_id)
        .ok_or_else(|| format!("No session: {}", session_id))?;
    session
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("Write error: {}", e))?;
    session
        .writer
        .flush()
        .map_err(|e| format!("Flush error: {}", e))?;
    Ok(())
}

/// Resizes a terminal session's PTY to the given dimensions.
#[tauri::command]
pub fn resize_terminal(
    state: State<'_, TerminalState>,
    session_id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    if rows == 0 || cols == 0 {
        return Err(format!("Invalid PTY dimensions: rows={}, cols={} (both must be >= 1)", rows, cols));
    }

    let sessions = state
        .sessions
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    let session = sessions
        .get(&session_id)
        .ok_or_else(|| format!("No session: {}", session_id))?;
    debug_log("TERMINAL", format!("Resizing {}: {}x{}", session_id, rows, cols));
    session
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Resize error: {}", e))?;
    Ok(())
}

/// Kills a single terminal session: stops the reader thread,
/// kills the child process, and removes the session from state.
#[tauri::command]
pub fn kill_terminal(
    state: State<'_, TerminalState>,
    session_id: String,
) -> Result<(), String> {
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    if let Some(mut session) = sessions.remove(&session_id) {
        debug_log("TERMINAL", format!("Killing session: {}", session_id));
        // Kill child process — causes PTY read to return EOF, stopping the reader thread
        let _ = session.child.kill();
        let _ = session.child.wait();
    }
    Ok(())
}

/// Kills all terminal sessions. Called during vault teardown or app close.
#[tauri::command]
pub fn kill_all_terminals(
    state: State<'_, TerminalState>,
) -> Result<(), String> {
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    debug_log("TERMINAL", format!("Killing all sessions ({})", sessions.len()));
    for (_, mut session) in sessions.drain() {
        let _ = session.child.kill();
        let _ = session.child.wait();
    }
    Ok(())
}
