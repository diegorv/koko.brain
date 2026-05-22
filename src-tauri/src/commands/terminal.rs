use crate::utils::logger::debug_log;
use portable_pty::{native_pty_system, CommandBuilder, Child, MasterPty, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

/// Masks a session ID for safe logging: shows first 8 chars + "…".
/// e.g., "a1b2c3d4-e5f6-..." → "a1b2c3d4…"
fn mask_session_id(id: &str) -> String {
	if id.len() > 8 {
		format!("{}…", &id[..8])
	} else {
		"***".to_string()
	}
}

/// Stateful UTF-8 decoder that buffers incomplete trailing sequences across
/// reads. Fixes the boundary-corruption bug (#122): the PTY reader thread
/// reads in fixed 4096-byte chunks, and a multibyte UTF-8 sequence whose
/// bytes straddle a chunk boundary used to be split — `from_utf8_lossy`
/// emitted `U+FFFD` at the cut and again on the next chunk, corrupting
/// emoji / CJK / accented output. `decode` retains the trailing incomplete
/// bytes and prepends them to the next chunk; only definitively-invalid
/// sequences (real corruption, not split-valid) are replaced with `U+FFFD`.
pub(crate) struct Utf8StreamDecoder {
	carry: Vec<u8>,
}

impl Utf8StreamDecoder {
	pub(crate) fn new() -> Self {
		Self { carry: Vec::new() }
	}

	/// Decodes a chunk, returning the longest valid UTF-8 string available
	/// right now. Trailing incomplete bytes are retained internally for
	/// the next call. Real corruption mid-buffer is replaced with `U+FFFD`.
	pub(crate) fn decode(&mut self, chunk: &[u8]) -> String {
		let mut buf: Vec<u8> = std::mem::take(&mut self.carry);
		buf.extend_from_slice(chunk);
		Self::decode_buffer(buf, &mut self.carry)
	}

	/// Final flush at EOF. Emits any remaining carry — bytes that never
	/// completed a UTF-8 sequence are lossy-replaced so trailing corruption
	/// is visible rather than silently dropped.
	pub(crate) fn flush(&mut self) -> String {
		if self.carry.is_empty() {
			return String::new();
		}
		let bytes = std::mem::take(&mut self.carry);
		String::from_utf8_lossy(&bytes).into_owned()
	}

	/// Decodes `buf` greedily: emits every valid run, replaces mid-buffer
	/// invalid sequences with `U+FFFD`, and stashes a trailing incomplete
	/// sequence into `carry_out`. Iterative (no recursion) so a buffer with
	/// many corrupt sequences cannot blow the stack.
	fn decode_buffer(buf: Vec<u8>, carry_out: &mut Vec<u8>) -> String {
		let mut out = String::with_capacity(buf.len());
		let mut bytes: &[u8] = &buf;
		loop {
			match std::str::from_utf8(bytes) {
				Ok(s) => {
					out.push_str(s);
					return out;
				}
				Err(e) => {
					let valid_up_to = e.valid_up_to();
					if valid_up_to > 0 {
						out.push_str(std::str::from_utf8(&bytes[..valid_up_to]).expect(
							"valid_up_to bytes are guaranteed valid UTF-8 by Utf8Error contract",
						));
					}
					match e.error_len() {
						None => {
							carry_out.extend_from_slice(&bytes[valid_up_to..]);
							return out;
						}
						Some(invalid_len) => {
							out.push('\u{FFFD}');
							bytes = &bytes[valid_up_to + invalid_len..];
						}
					}
				}
			}
		}
	}
}

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
    debug_log("TERMINAL", format!("Spawning session: {}, shell: {}, size: {}x{}", mask_session_id(&session_id), shell, rows, cols));

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
    // `decoder` carries incomplete UTF-8 trailing bytes across reads so
    // multibyte sequences split by the 4096-byte boundary are not corrupted
    // (issue #122).
    thread::spawn(move || {
        let mut reader = reader;
        let mut buf = [0u8; 4096];
        let mut decoder = Utf8StreamDecoder::new();
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break, // EOF — shell process exited
                Ok(n) => {
                    let data = decoder.decode(&buf[..n]);
                    if !data.is_empty() {
                        let _ = app.emit(
                            &format!("terminal:output:{}", sid_clone),
                            TerminalOutput {
                                session_id: sid_clone.clone(),
                                data,
                            },
                        );
                    }
                }
                Err(_) => break,
            }
        }
        // Final flush: emit any remaining bytes in the decoder's carry.
        // A trailing incomplete sequence becomes U+FFFD so corruption is
        // visible to the user rather than silently dropped.
        let tail = decoder.flush();
        if !tail.is_empty() {
            let _ = app.emit(
                &format!("terminal:output:{}", sid_clone),
                TerminalOutput {
                    session_id: sid_clone.clone(),
                    data: tail,
                },
            );
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
        .ok_or_else(|| format!("No session: {}", mask_session_id(&session_id)))?;
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
        .ok_or_else(|| format!("No session: {}", mask_session_id(&session_id)))?;
    debug_log("TERMINAL", format!("Resizing {}: {}x{}", mask_session_id(&session_id), rows, cols));
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
        debug_log("TERMINAL", format!("Killing session: {}", mask_session_id(&session_id)));
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

#[cfg(test)]
mod tests {
    use super::Utf8StreamDecoder;

    #[test]
    fn decoder_passes_through_pure_ascii() {
        let mut d = Utf8StreamDecoder::new();
        assert_eq!(d.decode(b"hello world"), "hello world");
        assert_eq!(d.flush(), "");
    }

    #[test]
    fn decoder_emits_complete_multibyte_in_single_call() {
        let mut d = Utf8StreamDecoder::new();
        // CJK glyph: 3 bytes
        let chunk = "日本".as_bytes();
        assert_eq!(d.decode(chunk), "日本");
        assert_eq!(d.flush(), "");
    }

    #[test]
    fn decoder_carries_split_multibyte_across_chunks() {
        // "🔥" = U+1F525, encoded as 4 bytes: 0xF0 0x9F 0x94 0xA5.
        // Split after the first 2 bytes to simulate a buffer boundary.
        let emoji = "🔥".as_bytes();
        let (left, right) = emoji.split_at(2);

        let mut d = Utf8StreamDecoder::new();
        let first = d.decode(left);
        // First chunk has no complete characters — must be empty, NOT U+FFFD.
        assert_eq!(first, "", "split-prefix must not emit replacement chars");
        let second = d.decode(right);
        assert_eq!(second, "🔥", "concatenated chunks must reconstruct the emoji");
        assert_eq!(d.flush(), "");
    }

    #[test]
    fn decoder_carries_split_multibyte_at_every_boundary() {
        // Verify the carry works for every possible split point of a 4-byte char.
        let s = "🔥";
        let bytes = s.as_bytes();
        for split in 1..bytes.len() {
            let mut d = Utf8StreamDecoder::new();
            let a = d.decode(&bytes[..split]);
            let b = d.decode(&bytes[split..]);
            assert_eq!(
                format!("{a}{b}"),
                s,
                "split at byte {split} must round-trip the original"
            );
            assert_eq!(d.flush(), "");
        }
    }

    #[test]
    fn decoder_handles_cjk_split_across_three_byte_boundary() {
        // "見" = U+898B, encoded as 3 bytes: 0xE8 0xA6 0x8B.
        let s = "見";
        let bytes = s.as_bytes();
        let mut d = Utf8StreamDecoder::new();
        let a = d.decode(&bytes[..1]);
        let b = d.decode(&bytes[1..2]);
        let c = d.decode(&bytes[2..]);
        assert_eq!(a, "");
        assert_eq!(b, "");
        assert_eq!(c, "見");
        assert_eq!(d.flush(), "");
    }

    #[test]
    fn decoder_emits_valid_prefix_with_pending_suffix() {
        // "abc🔥" — 3 ASCII bytes + 4-byte emoji. Cut after byte 5 (a, b, c, 0xF0, 0x9F).
        // First decode should emit "abc" and stash 0xF0 0x9F.
        let s = "abc🔥";
        let bytes = s.as_bytes();
        let mut d = Utf8StreamDecoder::new();
        let first = d.decode(&bytes[..5]);
        assert_eq!(first, "abc");
        let second = d.decode(&bytes[5..]);
        assert_eq!(second, "🔥");
        assert_eq!(d.flush(), "");
    }

    #[test]
    fn decoder_replaces_mid_buffer_invalid_byte() {
        // Real corruption (not a split): a lone 0xFF in the middle of valid text.
        let mut d = Utf8StreamDecoder::new();
        let mut buf: Vec<u8> = b"hi".to_vec();
        buf.push(0xFF);
        buf.extend_from_slice(b"bye");
        let out = d.decode(&buf);
        assert_eq!(out, "hi\u{FFFD}bye", "invalid mid-buffer byte must become U+FFFD");
        assert_eq!(d.flush(), "");
    }

    #[test]
    fn decoder_flush_emits_pending_incomplete_bytes_as_replacement() {
        // EOF with a stashed incomplete sequence — must surface as U+FFFD,
        // not silently drop.
        let mut d = Utf8StreamDecoder::new();
        let emoji = "🔥".as_bytes();
        let first = d.decode(&emoji[..2]);
        assert_eq!(first, "");
        // Stream ends without the completing bytes — flush must emit something.
        let flushed = d.flush();
        assert!(
            flushed.contains('\u{FFFD}'),
            "trailing incomplete sequence must surface as U+FFFD, got: {flushed:?}"
        );
    }

    #[test]
    fn decoder_flush_returns_empty_when_no_carry() {
        let mut d = Utf8StreamDecoder::new();
        assert_eq!(d.decode(b"complete"), "complete");
        assert_eq!(d.flush(), "");
    }

    #[test]
    fn decoder_handles_empty_chunk() {
        let mut d = Utf8StreamDecoder::new();
        assert_eq!(d.decode(b""), "");
        assert_eq!(d.flush(), "");
    }

    #[test]
    fn decoder_chains_many_chunks_with_random_split_points() {
        // Stream "ASCII日本emoji🔥end" through 1-byte chunks. Reconstructed
        // output must equal the original string with zero replacement chars.
        let s = "ASCII日本emoji🔥end";
        let bytes = s.as_bytes();
        let mut d = Utf8StreamDecoder::new();
        let mut out = String::new();
        for byte in bytes {
            out.push_str(&d.decode(std::slice::from_ref(byte)));
        }
        out.push_str(&d.flush());
        assert_eq!(out, s, "byte-by-byte decode must round-trip");
        assert!(!out.contains('\u{FFFD}'), "no replacement chars expected");
    }
}
