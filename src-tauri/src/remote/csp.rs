//! The Content-Security-Policy the loopback host sends with the bundle's HTML.
//!
//! Tauri's own header is not forwarded: it hashes every bundled script and
//! sits close to WebKit's 16 KiB header limit. This one allows bundle files
//! by `'self'` and the inline bootstrap script(s) by hash, computed from the
//! HTML actually served.

use std::sync::OnceLock;

use base64::Engine;
use regex::Regex;
use sha2::{Digest, Sha256};

fn script_tag() -> &'static Regex {
	static RE: OnceLock<Regex> = OnceLock::new();
	RE.get_or_init(|| Regex::new(r"(?is)<script\b([^>]*)>(.*?)</script\s*>").expect("valid regex"))
}

fn src_attr() -> &'static Regex {
	static RE: OnceLock<Regex> = OnceLock::new();
	RE.get_or_init(|| Regex::new(r"(?i)(^|\s)src\s*=").expect("valid regex"))
}

/// `'sha256-<base64>'` CSP sources for every inline `<script>` in `html`, in
/// document order. Scripts with a `src` attribute are skipped.
pub fn inline_script_hashes(html: &str) -> Vec<String> {
	script_tag()
		.captures_iter(html)
		.filter(|c| !src_attr().is_match(&c[1]))
		.map(|c| {
			let digest = Sha256::digest(c[2].as_bytes());
			format!("'sha256-{}'", base64::engine::general_purpose::STANDARD.encode(digest))
		})
		.collect()
}

/// The CSP header value for one served HTML document. Scripts, styles, fonts
/// and fetches come from this origin only (`connect-src 'self'`: none of the
/// `https://` hosts the desktop policy in `tauri.conf.json` allows); scripts
/// also by `'unsafe-eval'` and the hash of each inline script; styles also
/// inline; images also from `data:`, `blob:` and any `https:` URL; fonts also
/// from `data:`. Plugins (`object-src`), `<base>` to another origin and
/// framing by any page are refused.
pub fn browser_csp(html: &str) -> String {
	let mut script_src = String::from("'self' 'unsafe-eval'");
	for hash in inline_script_hashes(html) {
		script_src.push(' ');
		script_src.push_str(&hash);
	}
	format!(
		"default-src 'self'; script-src {script_src}; style-src 'self' 'unsafe-inline'; \
		 img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; \
		 object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
	)
}
