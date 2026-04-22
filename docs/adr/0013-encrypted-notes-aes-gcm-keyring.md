---
type: ADR
id: "0013"
title: "Encrypted notes with AES-256-GCM and macOS Keychain + Touch ID"
status: active
date: 2026-04-22
---

## Context

Some users want individual notes (journals, credentials, sensitive research) encrypted at rest, so that a stolen device or leaked backup does not expose the content. The rest of the vault stays in plain markdown for sync, grep, and interoperability with other tools.

The encryption layer must:

- Be authenticated — reject tampered ciphertext rather than silently producing garbage plaintext.
- Keep the symmetric key out of app memory when not in use, and out of cleartext storage permanently.
- Gate access with the platform's built-in authentication (Touch ID on Mac) when the OS supports it.
- Zero-cost for users who don't use encryption — decryption should only ever happen when opening an encrypted file.

## Decision

**Encrypt note content with AES-256-GCM and store the 32-byte key in the macOS Keychain, with Touch ID / authentication required on retrieval. Zeroize the key in memory immediately after use.** The on-disk payload is a JSON file with a version tag, base64 IV, and base64 ciphertext.

On-disk format (`src-tauri/src/security/crypto.rs:10-17`):

```rust
pub struct EncryptedPayload {
    pub kokobrain_encrypted: String,  // version, currently "1.0"
    pub iv: String,                    // base64-encoded 12-byte nonce
    pub data: String,                  // base64 AES-256-GCM ciphertext (incl. 16-byte auth tag)
}
```

Crypto primitives:

- **`aes-gcm` crate** (`src-tauri/Cargo.toml:45`): AES-256-GCM via the `Aes256Gcm` type.
- **`rand` crate** (`Cargo.toml:46`): 12-byte random nonce per encryption (`crypto.rs:25-26`). Never reused across encryptions with the same key.
- **`base64` crate** (`Cargo.toml:47`): payload serialization.
- **`zeroize` crate** (`Cargo.toml:48`): `Zeroizing<[u8; 32]>` wipes the decrypted key from memory on drop (`keychain.rs:31`).

Key storage (`src-tauri/src/security/keychain.rs`):

- Backed by the **`security-framework` crate** (`Cargo.toml:67`), which wraps the macOS Security framework. All keychain code is behind `#[cfg(target_os = "macos")]` — **macOS-only** today.
- Service identifier: `"com.diegorv.kokobrain"` (matches `tauri.conf.json`'s bundle ID).
- `store_key(account, key)` deletes any existing entry then calls `set_generic_password` — keys are account-scoped, so different vaults or users share one keychain cleanly.
- `retrieve_key(account)` triggers the Touch ID / password prompt via the standard Keychain access policy.
- Errors modeled as `KeychainError::{NotFound, UserCanceled, Internal}` so the UI can distinguish "no key yet" from "user canceled Touch ID."

Biometric gate (`src-tauri/src/security/biometric.rs`): uses `objc2-local-authentication` (`Cargo.toml:68`) to surface the LAContext API; the app can choose whether decryption requires biometric auth per session or per open.

Command surface: `src-tauri/src/commands/crypto.rs` exposes `encrypt_note`, `decrypt_note`, `store_encryption_key`, etc. as `#[tauri::command]` functions. Frontend code lives in `src/lib/plugins/encrypted-notes/`.

## Alternatives considered

- **Passphrase-derived key (PBKDF2/Argon2 + prompt on every open)**: no OS dependency, portable across platforms, but every open requires the user to type a passphrase — kills the "quick journal entry" UX. Rejected for the primary path; acceptable as a future fallback on non-Mac platforms.
- **Platform-agnostic `keyring` crate**: unified API across macOS/Windows/Linux, but each backend has very different UX (Linux Secret Service dialogs, Windows Credential Manager). We would need platform-specific authentication prompts anyway. We chose the macOS-native `security-framework` first and will add other backends when we target those platforms.
- **XChaCha20-Poly1305 / AES-GCM-SIV / other AEADs**: all credible. AES-256-GCM was chosen for hardware acceleration on macOS (AES-NI) and ubiquity.
- **Cloud-synced key (iCloud Keychain, Keybase)**: useful but out of scope for v1; would expand the threat model significantly.
- **File-level encryption vs full-vault encryption**: vault-wide encryption would break sync, grep, and third-party tool compatibility. File-level keeps the rest of the vault plain-text.
- **Key in a plain config file**: trivially defeats the purpose.

## Consequences

- **Platform coverage is macOS-only today.** Linux and Windows builds cannot open encrypted notes. Explicit `#[cfg(target_os = "macos")]` gates in `keychain.rs` make the absence compile-clean; a future ADR will introduce an equivalent platform backend.
- IV reuse is catastrophic for AES-GCM — the code generates a fresh 12-byte IV per encryption via `rand::rng().fill(&mut iv_bytes)`. Any future change to that path must preserve randomness; adding a "deterministic IV" shortcut would break confidentiality.
- The 16-byte auth tag is appended to the ciphertext by `aes-gcm`, so tampering always produces `Err("Decryption failed: wrong key or corrupted data")`. The UI surfaces that directly; there is no silent corruption.
- Users who lose their keychain lose access to encrypted notes — no recovery key. This is by design; adding recovery would add attack surface. Documented explicitly in the encrypted-notes docs.
- Unit tests (`src-tauri/tests/crypto_test.rs`) cover encrypt/decrypt round-trips and tamper-rejection; keychain tests are manual / integration only because they require a logged-in macOS keychain.
- Re-evaluation triggers: cross-platform support becomes required (add `keyring` or per-platform modules); FIPS compliance is requested (need ring-based crypto); a cryptanalytic advance against AES-GCM at 2^32 message boundaries becomes a practical concern.
