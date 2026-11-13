//! Who may talk to the browser host: the Host and Origin allowlists and the
//! identity rule for requests that come through Tailscale Serve.
//!
//! The host listens on `127.0.0.1` only. A request is local when it names
//! the loopback Host and carries no proxy marker; anything else is treated
//! as arriving through Serve and must carry the owner's
//! `Tailscale-User-Login`. Serve sets that header itself and strips any
//! copy the client sent (https://tailscale.com/kb/1312/serve), and Funnel
//! traffic carries none, so a missing or different login is refused.
//! ADR-0038 records the model.

/// Where the host is reachable and who may use it.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Route {
	/// The loopback port, also the Serve HTTPS port on the tailnet.
	pub port: u16,
	/// The Mac's tailnet name (`mac.tailnet.ts.net`); `None` when the host
	/// is not published.
	pub tailnet_host: Option<String>,
	/// The owner's Tailscale login; `None` refuses every proxied request.
	pub owner_login: Option<String>,
}

impl Route {
	/// A route for loopback only (no tailnet name, no owner).
	pub fn local(port: u16) -> Self {
		Self { port, tailnet_host: None, owner_login: None }
	}

	fn loopback_host(&self) -> String {
		format!("127.0.0.1:{}", self.port)
	}

	fn tailnet_authority(&self) -> Option<String> {
		self.tailnet_host.as_deref().map(|name| format!("{name}:{}", self.port))
	}
}

/// The values of every header named `name` (case-insensitive) in a request
/// head (request line first, lines split by CRLF).
pub fn header_values<'a>(head: &'a str, name: &str) -> Vec<&'a str> {
	head.split("\r\n")
		.skip(1)
		.filter_map(|l| l.split_once(':'))
		.filter(|(n, _)| n.trim().eq_ignore_ascii_case(name))
		.map(|(_, v)| v.trim())
		.collect()
}

/// Whether a header name marks a request that went through a proxy.
fn is_proxy_marker(name: &str) -> bool {
	let name = name.trim().to_ascii_lowercase();
	matches!(name.as_str(), "x-forwarded-for" | "x-forwarded-host" | "x-forwarded-proto")
		|| name.starts_with("tailscale-")
}

/// Whether the head carries any proxy marker header.
pub fn has_proxy_marker(head: &str) -> bool {
	head.split("\r\n").skip(1).filter_map(|l| l.split_once(':')).any(|(n, _)| is_proxy_marker(n))
}

/// Whether a request may be served at all (page, WebSocket upgrade or
/// asset). Exactly one Host header, on the allowlist. Local (Host
/// `127.0.0.1:<port>` and no proxy marker): allowed. Otherwise exactly one
/// `Tailscale-User-Login`, equal to the configured owner login.
pub fn request_allowed(head: &str, route: &Route) -> bool {
	let hosts = header_values(head, "host");
	let [host] = hosts.as_slice() else { return false };
	let loopback = route.loopback_host();
	let is_loopback = *host == loopback;
	let is_tailnet = route.tailnet_authority().is_some_and(|a| host.eq_ignore_ascii_case(&a));
	if !is_loopback && !is_tailnet {
		return false;
	}
	if is_loopback && !has_proxy_marker(head) {
		return true;
	}
	let Some(owner) = route.owner_login.as_deref().filter(|o| !o.is_empty()) else { return false };
	header_values(head, "tailscale-user-login") == [owner]
}

/// Whether `origin` is one the page can have been loaded from:
/// `http://127.0.0.1:<port>` or `https://<tailnet name>:<port>`.
pub fn origin_allowed(origin: &str, route: &Route) -> bool {
	if origin == format!("http://{}", route.loopback_host()) {
		return true;
	}
	route.tailnet_authority().is_some_and(|a| origin.eq_ignore_ascii_case(&format!("https://{a}")))
}
