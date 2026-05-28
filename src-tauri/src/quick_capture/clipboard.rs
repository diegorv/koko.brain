//! Clipboard adapter.
//!
//! Ported verbatim from quick-capture. The only place in this module
//! tree that talks to the OS clipboard is this file; the
//! trait-plus-fake split keeps `commands::capture_clipboard_now`
//! testable without a real pasteboard.
//!
//! Read priority is files -> image -> text: a Finder copy advertises
//! both file URLs and a thumbnail image on `NSPasteboard`, and we
//! want to keep the file list because dropping to image would lose
//! paths and original names. Image bytes returned by `arboard` are
//! raw RGBA + dimensions; we re-encode to PNG inside this module so
//! callers receive a known mime and a self-describing byte stream.

use std::io::Cursor;
use std::path::PathBuf;

/// What `Clipboard::read` returns. Closed set so `kind_detect` can
/// match exhaustively.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ClipboardSnapshot {
    Text(String),
    Image { bytes: Vec<u8>, mime: String },
    Files(Vec<PathBuf>),
}

#[derive(Debug)]
pub enum ClipboardError {
    /// The clipboard is empty or contains a format we did not request.
    Empty,
    /// The clipboard holds a format we cannot decode (e.g. an image we
    /// cannot encode as PNG).
    UnsupportedFormat,
    /// The underlying OS-level read failed.
    Backend(String),
}

impl std::fmt::Display for ClipboardError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ClipboardError::Empty => write!(f, "clipboard is empty"),
            ClipboardError::UnsupportedFormat => {
                write!(f, "clipboard holds an unsupported format")
            }
            ClipboardError::Backend(msg) => write!(f, "clipboard backend error: {msg}"),
        }
    }
}

impl std::error::Error for ClipboardError {}

/// Adapter trait. One method so tests stay trivial.
pub trait Clipboard {
    fn read(&self) -> Result<ClipboardSnapshot, ClipboardError>;
}

/// Real backend, backed by `arboard`. Reads in priority order:
/// file references -> image -> text. A Finder copy publishes both file
/// URLs and a preview image to `NSPasteboard`, so files must win.
pub struct SystemClipboard;

impl SystemClipboard {
    pub fn new() -> Self {
        SystemClipboard
    }
}

impl Default for SystemClipboard {
    fn default() -> Self {
        Self::new()
    }
}

impl Clipboard for SystemClipboard {
    fn read(&self) -> Result<ClipboardSnapshot, ClipboardError> {
        let mut cb = arboard::Clipboard::new()
            .map_err(|e| ClipboardError::Backend(e.to_string()))?;

        // 1. Files first: Finder copies publish file URLs alongside a
        //    preview image, and we want the paths, not the thumbnail.
        match cb.get().file_list() {
            Ok(paths) if !paths.is_empty() => return Ok(ClipboardSnapshot::Files(paths)),
            Ok(_) | Err(arboard::Error::ContentNotAvailable) => {}
            Err(arboard::Error::ClipboardNotSupported) => {
                return Err(ClipboardError::Backend("clipboard not supported".into()));
            }
            Err(e) => return Err(ClipboardError::Backend(e.to_string())),
        }

        // 2. Image bytes: arboard returns raw RGBA + dimensions. Re-
        //    encode as PNG so downstream code has a known mime.
        match cb.get_image() {
            Ok(img) => return image_to_png_snapshot(img),
            Err(arboard::Error::ContentNotAvailable) => {}
            Err(arboard::Error::ClipboardNotSupported) => {
                return Err(ClipboardError::Backend("clipboard not supported".into()));
            }
            Err(arboard::Error::ConversionFailure) => {
                return Err(ClipboardError::UnsupportedFormat);
            }
            Err(e) => return Err(ClipboardError::Backend(e.to_string())),
        }

        // 3. Fall back to text.
        match cb.get_text() {
            Ok(text) => Ok(ClipboardSnapshot::Text(text)),
            Err(arboard::Error::ContentNotAvailable) => Err(ClipboardError::Empty),
            Err(arboard::Error::ClipboardNotSupported) => {
                Err(ClipboardError::Backend("clipboard not supported".into()))
            }
            Err(_) => Err(ClipboardError::UnsupportedFormat),
        }
    }
}

/// Re-encode arboard's RGBA8 buffer as PNG. Kept private to the
/// `clipboard` module so the image dependency does not leak out.
fn image_to_png_snapshot(
    img: arboard::ImageData<'_>,
) -> Result<ClipboardSnapshot, ClipboardError> {
    let width = u32::try_from(img.width)
        .map_err(|_| ClipboardError::UnsupportedFormat)?;
    let height = u32::try_from(img.height)
        .map_err(|_| ClipboardError::UnsupportedFormat)?;
    let buffer: image::ImageBuffer<image::Rgba<u8>, Vec<u8>> =
        image::ImageBuffer::from_raw(width, height, img.bytes.into_owned())
            .ok_or(ClipboardError::UnsupportedFormat)?;
    let mut bytes = Vec::new();
    buffer
        .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Png)
        .map_err(|e| ClipboardError::Backend(format!("png encode: {e}")))?;
    Ok(ClipboardSnapshot::Image {
        bytes,
        mime: "image/png".to_string(),
    })
}

/// Test-support fake. Lives at module scope (not `#[cfg(test)]`) so
/// integration tests under `src-tauri/tests/` can reach it; integration
/// tests link against the public library and cannot see `#[cfg(test)]`
/// items. The fake is harmless in release builds — it is a plain struct
/// with no OS access.
pub struct FakeClipboard {
    result: std::sync::Mutex<Option<Result<ClipboardSnapshot, ClipboardError>>>,
}

impl FakeClipboard {
    pub fn with(snapshot: Result<ClipboardSnapshot, ClipboardError>) -> Self {
        FakeClipboard {
            result: std::sync::Mutex::new(Some(snapshot)),
        }
    }
}

impl Clipboard for FakeClipboard {
    fn read(&self) -> Result<ClipboardSnapshot, ClipboardError> {
        self.result
            .lock()
            .expect("fake clipboard mutex poisoned")
            .take()
            .expect("FakeClipboard::read called more than once")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fake_clipboard_surfaces_text_snapshot() {
        let fake = FakeClipboard::with(Ok(ClipboardSnapshot::Text("hello".into())));
        let got = fake.read().expect("fake should return Ok");
        assert_eq!(got, ClipboardSnapshot::Text("hello".into()));
    }

    #[test]
    fn fake_clipboard_surfaces_image_snapshot() {
        let fake = FakeClipboard::with(Ok(ClipboardSnapshot::Image {
            bytes: vec![0xDE, 0xAD, 0xBE, 0xEF],
            mime: "image/png".into(),
        }));
        let got = fake.read().expect("fake should return Ok");
        match got {
            ClipboardSnapshot::Image { bytes, mime } => {
                assert_eq!(bytes, vec![0xDE, 0xAD, 0xBE, 0xEF]);
                assert_eq!(mime, "image/png");
            }
            other => panic!("expected Image, got {other:?}"),
        }
    }

    #[test]
    fn fake_clipboard_surfaces_files_snapshot() {
        let paths = vec![PathBuf::from("/tmp/a.png"), PathBuf::from("/tmp/b.pdf")];
        let fake = FakeClipboard::with(Ok(ClipboardSnapshot::Files(paths.clone())));
        let got = fake.read().expect("fake should return Ok");
        assert_eq!(got, ClipboardSnapshot::Files(paths));
    }

    #[test]
    fn fake_clipboard_surfaces_error() {
        let fake = FakeClipboard::with(Err(ClipboardError::Empty));
        let err = fake.read().expect_err("fake should return Err");
        assert!(matches!(err, ClipboardError::Empty));
    }
}
