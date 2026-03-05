# Encryption & Security

Protect sensitive notes with AES-256-GCM encryption, secured by your Mac's Keychain and Touch ID.

---

## Overview

Kokobrain can encrypt individual notes so they are completely unreadable without your Mac's authentication. Encrypted notes are stored as JSON on disk — the original Markdown content is replaced with ciphertext that can only be decrypted with a key stored in your macOS Keychain.

## Encrypting a Note

1. Open the note you want to encrypt.
2. Open the Command Palette (`Cmd+P`) and select **"Toggle Note Encryption"**.
3. On first use, Touch ID or your macOS password is required to create and store the encryption key.
4. Once encrypted, a lock icon appears in the status bar to indicate the note is protected.

## Decrypting a Note

Open the Command Palette (`Cmd+P`) and select **"Toggle Note Encryption"** again. The same command toggles encryption on and off. You will be prompted for Touch ID or your macOS password if the key is not already cached.

## Locking All Encrypted Notes

Open the Command Palette and select **"Lock Encrypted Notes"**. This clears the in-memory key — the next time you open an encrypted note, Touch ID will be required again. Use this when stepping away from your computer.

## What the Encrypted File Looks Like on Disk

When a note is encrypted, the `.md` file content is replaced with a JSON payload containing the ciphertext:

```json
{
  "kokobrain_encrypted": "1.0",
  "iv": "base64-encoded-initialization-vector",
  "data": "base64-encoded-ciphertext"
}
```

The original Markdown content is completely gone from the file — it exists only inside the `data` field, which cannot be read without the decryption key.

## Security Architecture

### Encryption Algorithm

- **Algorithm:** AES-256-GCM (Galois/Counter Mode) — authenticated encryption that provides both confidentiality and integrity.
- **Key size:** 256-bit (32 bytes), cryptographically generated once per vault.
- **IV (Initialization Vector):** A fresh random 12-byte IV is generated for every encryption operation, so encrypting the same content twice produces different ciphertext.
- **Authentication tag:** GCM includes a 16-byte authentication tag that detects any tampering with the ciphertext.

### Key Management

- **One key per vault:** Each vault has its own unique encryption key.
- **macOS Keychain storage:** The key is stored in the macOS Keychain under the service identifier `com.kokobrain.app`.
- **In-memory caching:** After the first successful authentication, the key is cached in memory for the session. This means Touch ID is only required once (or after locking).
- **Secure cleanup:** When you lock encrypted notes or close the app, the in-memory key is securely zeroed.

### Biometric Authentication

- **Touch ID** is used as the primary authentication method when available.
- **Fallback:** If Touch ID is not available (e.g., Mac without Touch ID sensor), the system falls back to the macOS login password.
- **Prompt:** A system authentication dialog appears, reading "Kokobrain wants to access the encryption key for this vault."

> [!WARNING]
> If you lose access to your Mac's Keychain (e.g., factory reset without backup), encrypted notes are **permanently unreadable**. There is no recovery mechanism. Make sure your Keychain is backed up.

> [!NOTE]
> Note encryption is currently a **macOS-only** feature. It relies on the macOS Keychain and LocalAuthentication framework (Touch ID).

---

## Next Steps

- [Terminal](17-terminal.md) — Run commands without leaving Kokobrain
- [Settings](19-settings.md) — Full settings reference
