//! Channel-aware in-app updater commands.
//!
//! The built-in `@tauri-apps/plugin-updater` JS API reads endpoints from
//! `tauri.conf.json` at build time and does not expose a runtime
//! endpoints override. To let the user flip between stable and nightly
//! channels from Settings, we construct the `Updater` programmatically
//! on the Rust side and inject the right `latest.json` URL based on the
//! channel argument.
//!
//! The `Update` returned from `check_for_update_on_channel` is stored in
//! the webview's resource table. The frontend then passes the returned
//! `rid` to the plugin's built-in `download_and_install` command, which
//! re-uses the same resource table and downloads the bundle URL baked
//! into the `Update` object — so only the metadata fetch needs to be
//! channel-aware, not the download.

use serde::Serialize;
use tauri::{Manager, ResourceId, Runtime, Webview};
use tauri_plugin_updater::UpdaterExt;
use url::Url;

/// Stable channel `latest.json` URL. Mirrors the endpoint baked into
/// `tauri.conf.json` so a user with `updates.channel = "stable"` follows
/// the same release stream the default updater config points at.
pub const STABLE_ENDPOINT: &str =
    "https://github.com/diegorv/koko.brain/releases/latest/download/latest.json";

/// Nightly channel `latest.json` URL. Published by
/// `.github/workflows/nightly.yml` on every push to `main`, overwritten
/// in-place against the fixed `nightly` pre-release tag.
pub const NIGHTLY_ENDPOINT: &str =
    "https://github.com/diegorv/koko.brain/releases/download/nightly/latest.json";

/// Map a channel name to its `latest.json` URL.
///
/// Unknown values fall back to the stable endpoint — same safe-default
/// policy as `parseReleaseChannel` on the frontend. Keeping the two
/// sides in lock-step means a future channel name leaking through the
/// IPC unnormalised still produces a usable URL rather than a panic.
pub fn endpoint_for_channel(channel: &str) -> &'static str {
    match channel {
        "nightly" => NIGHTLY_ENDPOINT,
        _ => STABLE_ENDPOINT,
    }
}

/// Metadata for an available update, returned to the frontend.
///
/// Mirrors the shape returned by the built-in
/// `plugin:updater|check` command for fields the frontend actually
/// reads (`version`, `body`, `rid`). The `currentVersion` field gives
/// the UI a way to display both versions side-by-side without re-reading
/// `__BUILD_INFO__`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMetadata {
    /// Resource id pointing at the cached `Update` object in the
    /// webview's resource table. The frontend hands this back to the
    /// built-in `download_and_install` plugin command to run the
    /// installation flow without re-fetching the metadata.
    pub rid: ResourceId,
    /// Version string of the currently running app (from
    /// `app.package_info().version`).
    pub current_version: String,
    /// Version string of the available update.
    pub version: String,
    /// Optional release notes body from the `latest.json`.
    pub body: Option<String>,
}

/// Check for an available update on the given release channel.
///
/// Returns `None` if no update is available (current version is up to
/// date) and `Some(metadata)` otherwise. The returned `rid` keeps the
/// `Update` alive in the webview's resource table so the frontend can
/// run the existing plugin's `download_and_install` command against it.
///
/// `allow_downgrades` (default `false`) overrides the default semver
/// comparator with `update.version != current.to_string()`, so a nightly
/// user can install a same-base stable release even though the stable
/// version sorts semver-LOWER. Used by the "Install Stable" downgrade
/// flow in UpdateSection. Errors are returned as strings so the
/// frontend can `try { ... } catch` the rejection — matches the
/// plugin's own error-handling convention.
#[tauri::command]
pub async fn check_for_update_on_channel<R: Runtime>(
    webview: Webview<R>,
    channel: String,
    allow_downgrades: Option<bool>,
) -> Result<Option<UpdateMetadata>, String> {
    let endpoint = endpoint_for_channel(&channel);
    let url = Url::parse(endpoint).map_err(|e| format!("Invalid updater endpoint URL: {e}"))?;

    let mut builder = webview
        .updater_builder()
        .endpoints(vec![url])
        .map_err(|e| format!("Failed to configure updater endpoint: {e}"))?;

    if allow_downgrades.unwrap_or(false) {
        // Replace the default `update.version > current` comparator with
        // an inequality check so a nightly user (`X.Y.Z-nightly.<count>.<sha>`)
        // can install the corresponding Stable release (`X.Y.Z`) even
        // though Stable sorts semver-lower.
        builder = builder.version_comparator(|current, update| update.version != current);
    }

    let updater = builder
        .build()
        .map_err(|e| format!("Failed to build updater: {e}"))?;

    let update = updater
        .check()
        .await
        .map_err(|e| format!("Update check failed: {e}"))?;

    if let Some(update) = update {
        let metadata = UpdateMetadata {
            current_version: update.current_version.clone(),
            version: update.version.clone(),
            body: update.body.clone(),
            rid: webview.resources_table().add(update),
        };
        Ok(Some(metadata))
    } else {
        Ok(None)
    }
}

