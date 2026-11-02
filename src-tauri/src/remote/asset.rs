//! Rules for `GET /v1/asset/<rel>`, the vault files the browser loads into
//! `<img>`, `<audio>`, `<video>` and PDF embeds (`remote::server` serves them).
//!
//! On the desktop, assets come from the separate `asset:` origin. In the
//! browser they share the app's origin, so a vault `.html` or `.svg` opened
//! from this endpoint would run with the session's rights. Only types that
//! cannot run script are served inline; everything else is a sandboxed
//! download that is never typed or sniffed as HTML.

use super::access::header_values;

/// Content type of every file that is not served inline.
pub const DOWNLOAD_TYPE: &str = "application/octet-stream";

/// The inline allowlist: raster images (not SVG), audio, video and PDF, by
/// lowercased extension.
const INLINE: &[(&str, &str)] = &[
	("png", "image/png"),
	("jpg", "image/jpeg"),
	("jpeg", "image/jpeg"),
	("gif", "image/gif"),
	("webp", "image/webp"),
	("avif", "image/avif"),
	("bmp", "image/bmp"),
	("ico", "image/x-icon"),
	("mp3", "audio/mpeg"),
	("wav", "audio/wav"),
	("m4a", "audio/mp4"),
	("aac", "audio/aac"),
	("ogg", "audio/ogg"),
	("oga", "audio/ogg"),
	("opus", "audio/ogg"),
	("flac", "audio/flac"),
	("mp4", "video/mp4"),
	("m4v", "video/mp4"),
	("webm", "video/webm"),
	("mov", "video/quicktime"),
	("ogv", "video/ogg"),
	("pdf", "application/pdf"),
];

/// The `Content-Type` of a vault file and whether it is served inline,
/// decided by the file name's extension only (never by its bytes).
pub fn asset_type(path: &str) -> (&'static str, bool) {
	let name = path.rsplit('/').next().unwrap_or(path);
	let ext = name.rsplit_once('.').map(|(_, ext)| ext.to_ascii_lowercase());
	ext.and_then(|ext| INLINE.iter().find(|(e, _)| *e == ext))
		.map_or((DOWNLOAD_TYPE, false), |(_, mime)| (*mime, true))
}

/// Whether a request must be refused as cross-site: it carries a
/// `Sec-Fetch-Site` other than exactly one `same-origin`. A page in another
/// tab could otherwise tell which vault files exist from `<img>` load and
/// error events. A request without the header (no Fetch Metadata support)
/// is left to the Host and Origin checks.
pub fn is_cross_site(head: &str) -> bool {
	match header_values(head, "sec-fetch-site").as_slice() {
		[] => false,
		[site] => !site.eq_ignore_ascii_case("same-origin"),
		_ => true,
	}
}
