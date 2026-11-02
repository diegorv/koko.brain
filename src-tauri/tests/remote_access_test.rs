//! The identity rule and the Host / Origin allowlists of the browser host
//! (`remote::access`). Heads are written by hand, so each case names exactly
//! the headers it sends.

use kokobrain_lib::remote::access::{origin_allowed, request_allowed, Route};

const PORT: u16 = 4747;
const OWNER: &str = "owner@example.com";

fn route() -> Route {
	Route { port: PORT, tailnet_host: Some("mac.tail1234.ts.net".into()), owner_login: Some(OWNER.into()) }
}

fn head(headers: &[&str]) -> String {
	let mut text = String::from("GET / HTTP/1.1");
	for h in headers {
		text.push_str("\r\n");
		text.push_str(h);
	}
	text
}

fn local_host() -> String {
	format!("Host: 127.0.0.1:{PORT}")
}

fn tailnet_host() -> String {
	format!("Host: mac.tail1234.ts.net:{PORT}")
}

#[test]
fn a_local_request_is_allowed_without_a_login() {
	assert!(request_allowed(&head(&[&local_host()]), &route()));
	assert!(request_allowed(&head(&[&local_host()]), &Route::local(PORT)));
}

#[test]
fn a_proxied_request_with_the_owner_login_is_allowed() {
	let h = head(&[&tailnet_host(), "X-Forwarded-For: 100.64.0.2", &format!("Tailscale-User-Login: {OWNER}")]);
	assert!(request_allowed(&h, &route()));
	// The tailnet name is DNS: case does not matter.
	let upper = head(&[&format!("Host: MAC.tail1234.ts.net:{PORT}"), &format!("Tailscale-User-Login: {OWNER}")]);
	assert!(request_allowed(&upper, &route()));
}

#[test]
fn a_proxied_request_with_a_wrong_or_missing_login_is_refused() {
	let wrong = head(&[&tailnet_host(), "Tailscale-User-Login: intruder@example.com"]);
	assert!(!request_allowed(&wrong, &route()));
	let case = head(&[&tailnet_host(), "Tailscale-User-Login: OWNER@example.com"]);
	assert!(!request_allowed(&case, &route()), "login compare is exact");
	let missing = head(&[&tailnet_host(), "X-Forwarded-For: 100.64.0.2"]);
	assert!(!request_allowed(&missing, &route()), "Funnel traffic carries no login");
	let bare = head(&[&tailnet_host()]);
	assert!(!request_allowed(&bare, &route()));
	let empty = head(&[&tailnet_host(), "Tailscale-User-Login: "]);
	assert!(!request_allowed(&empty, &route()));
	let twice = head(&[&tailnet_host(), &format!("Tailscale-User-Login: {OWNER}"), "Tailscale-User-Login: x@y"]);
	assert!(!request_allowed(&twice, &route()));
}

#[test]
fn a_proxied_request_whose_host_was_rewritten_to_loopback_still_needs_the_login() {
	for marker in [
		"X-Forwarded-For: 100.64.0.2",
		"X-Forwarded-Host: mac.tail1234.ts.net",
		"X-Forwarded-Proto: https",
		"Tailscale-User-Name: Someone",
		"tailscale-user-profile-pic: x",
	] {
		assert!(!request_allowed(&head(&[&local_host(), marker]), &route()), "{marker}");
		let with_login = head(&[&local_host(), marker, &format!("Tailscale-User-Login: {OWNER}")]);
		assert!(request_allowed(&with_login, &route()), "{marker}");
	}
	let wrong = head(&[&local_host(), "Tailscale-User-Login: intruder@example.com"]);
	assert!(!request_allowed(&wrong, &route()));
}

#[test]
fn no_owner_configured_refuses_every_proxied_request() {
	let mut no_owner = route();
	no_owner.owner_login = None;
	let h = head(&[&tailnet_host(), &format!("Tailscale-User-Login: {OWNER}")]);
	assert!(!request_allowed(&h, &no_owner));
	no_owner.owner_login = Some(String::new());
	assert!(!request_allowed(&head(&[&tailnet_host(), "Tailscale-User-Login: "]), &no_owner));
}

#[test]
fn a_host_off_the_allowlist_is_refused_even_with_the_login() {
	let login = format!("Tailscale-User-Login: {OWNER}");
	for host in [
		"Host: mac.tail1234.ts.net".to_string(),
		"Host: other.tail1234.ts.net:4747".to_string(),
		"Host: localhost:4747".to_string(),
		"Host: 127.0.0.1:4748".to_string(),
	] {
		assert!(!request_allowed(&head(&[&host, &login]), &route()), "{host}");
	}
	// No tailnet name configured: the tailnet Host is not on the list.
	assert!(!request_allowed(&head(&[&tailnet_host(), &login]), &Route::local(PORT)));
	assert!(!request_allowed(&head(&[]), &route()), "no Host");
	assert!(!request_allowed(&head(&[&local_host(), &local_host()]), &route()), "two Hosts");
}

#[test]
fn origins_on_the_allowlist() {
	assert!(origin_allowed(&format!("http://127.0.0.1:{PORT}"), &route()));
	assert!(origin_allowed(&format!("https://mac.tail1234.ts.net:{PORT}"), &route()));
	assert!(!origin_allowed(&format!("http://mac.tail1234.ts.net:{PORT}"), &route()));
	assert!(!origin_allowed("https://mac.tail1234.ts.net", &route()));
	assert!(!origin_allowed(&format!("https://127.0.0.1:{PORT}"), &route()));
	assert!(!origin_allowed(&format!("https://mac.tail1234.ts.net:{PORT}"), &Route::local(PORT)));
	assert!(!origin_allowed("null", &route()));
}
