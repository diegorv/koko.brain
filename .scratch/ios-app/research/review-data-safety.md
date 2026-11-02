# Review: synthesis-draft.md, data safety and security lens

Reviewer stance: assume the plan loses notes or exposes the vault, then try to prove it. Read-only review, 2026-11-02, repo at `main` 2a937e57. Nothing was compiled or run.
Scope read: `synthesis-draft.md` (all), `design-A-remote.md` §3-§9, `design-B-local.md` §4-§7, `scout-00`, plus the code cited below (every `path:line` here was re-read in this pass unless marked UNVERIFIED).
Draft locations are given as `draft:<line>` (line numbers in `synthesis-draft.md`).

## Verdict

The direction holds: CAS before phone writes (D4), deny-by-default policy, loopback plus Serve, hashed pairing grants. But the draft overstates what the CAS covers. As written, M2 + M5 still loses edits through at least five code paths it does not name, and M3 leaks the Mac clipboard to the phone. M9's sync rules infer deletes from absence and have no mass-delete guard. 4 blockers, 14 major, 11 minor.

## Summary

| ID | Sev | Draft location | Finding |
|---|---|---|---|
| B1 | blocker | draft:74-75, :200 (M2 exit), :196 (2.4) | CAS and the per-path lock cover only 2 of about 20 note writers. The rest still write blindly, on desktop and, from M5-M7, from the phone |
| B2 | blocker | draft:260 (6.1), :193 | `toggle_task_status` is keyed by line number, has no rev, runs outside the lock, and its TS follow-up throws away a dirty buffer |
| B3 | blocker | draft:212 (3.5) | The event hub forwards every `EventMap` name. `qc:capture-detected` carries the Mac clipboard text, the frontmost app and the browser URL |
| B4 | blocker | draft:304-307 (9.7-9.10), design B §5.2 | Sync infers deletes from absence and has no mass-delete guard. A host-side DELETE is a hard delete, not Trash |
| M1 | major | draft:90-91, :214 (3.7), :244-246 | `reloadExternallyChangedTabs` drops keystrokes typed while its read is in flight. Over RPC the window grows from ms to seconds |
| M2 | major | draft:195 (opId ring), :214 ("never replay"), :244 (5.1) | Self-conflicts: there is no single-flight save per path, the opId ring is never hit, and a lost ack turns the next save into a conflict with its own earlier write |
| M3 | major | draft:96, :110 (D6), :195-196 | Rev definition: "rev of savedContent" (a decoded JS string) differs from the disk bytes. BOM and non-UTF-8 files then conflict forever, or get rewritten silently |
| M4 | major | draft:195-196 | The editor save's write mode is not specified. A dirty tab resurrects a file that was deleted or renamed elsewhere |
| M5 | major | draft:246 (5.3), :219 (3.12) | Draft journal: clear-on-ack race, unspecified debounce, separate Safari and home-screen stores, 7-day cap in a Safari tab |
| M6 | major | draft:244 (5.1), :90 | The index, FTS and snapshot commands take content from the client. With two clients the index can drift from disk, and task toggles then hit stale line numbers |
| M7 | major | draft:193 (2.1), :213 (3.6) | The `VaultScope` deny-list works on files only. `remove`/`rename` of the vault root, `.kokobrain/` or `.git/` passes. Dot-file reads expose secrets |
| M8 | major | draft:213 (3.6), design A §5.2 | `/v1/asset` serves `.html` and other active types inline on the app origin: stored XSS with full RPC |
| M9 | major | draft:200 ("log-only release"), :372 (Q1) | A log-only `VaultScope` must never cover remote calls. With no vault open, every path command must be denied |
| M10 | major | draft:61, :159, design A §8.1-8.2 | Port 8443 can carry Funnel. `--bg` serve config persists until turned `off`. The identity-header check is optional, so the design does not fail closed |
| M11 | major | draft:284 (M8.1) | META writes: the desktop rewrites whole files from memory, and `emptyTrash` deletes the whole items dir, including items the phone trashed that the desktop list does not show |
| M12 | major | draft:108 (D5) | The draft says conflicts are rare. Drafts held while the Mac is unreachable make them common (daily notes). The sheet loop also re-fires every 5 s |
| M13 | major | draft:304-307 (M9) | iOS APFS is case-sensitive and macOS is not. Case-only renames and case collisions can delete a note on the Mac during sync |
| M14 | major | draft:209 (3.2) | Revoke does not close live sockets, the session lifetime is not specified, and a per-IP rate limit means nothing behind Serve |
| m1 | minor | draft:197 (2.5), :266 (6.7) | `createOnly`/`create_note` is exists-then-rename, so it can overwrite. Conflict-copy names collide, and `deviceName` is not sanitized |
| m2 | minor | draft:195 | `write_atomic` has no fsync. The `*.tmp-<pid>-<seq>` files it leaves must be excluded from sync and the watcher |
| m3 | minor | draft:211-212 | `seq` has no epoch, so after a host restart (auto-update) a client can falsely resume |
| m4 | minor | draft:178-179 (1.6-1.7) | Check-then-write callers depend on `exists()`. The remote `exists` must throw on transport errors, never return `false` |
| m5 | minor | draft:305 (9.8) | Keychain attributes for the M9 bearer are not specified, and the bearer must never reach JS |
| m6 | minor | draft:209 | Cookies are not port-isolated. `kb_session` is sent to every Serve port on the same `*.ts.net` host, t3code's included |
| m7 | minor | draft:313-315 (M10) | The per-path lock is per process. A dev build plus the release host, or `kokobrain serve` plus the desktop, can race |
| m8 | minor | draft:44, :219 | With no service worker, drafts cannot be shown at all after a reload or kill while the Mac is unreachable |
| m9 | minor | draft:307 (9.10), :108 | An auto-applied merge3 has no snapshot and no frontmatter validity check |
| m10 | minor | draft:374 (Q3) | Q3 (where the vault lives) affects M2/M3, not only M9. Dataless iCloud files must surface as errors |
| m11 | minor | draft:219, design A §5.3 | queryjs plus `'unsafe-eval'`: JS in vault content can drive every remote Write method |

---

## Blockers

### B1. CAS covers 2 writers; the rest bypass the lock and the rev check

- **Draft claims.** draft:74-75: "CAS write (per-path lock): desktop editor save, phone RPC save, sync PUT all go through it". draft:200: "an external change to a dirty tab is never overwritten", "other plugin-fs writes (META, trash) are unchanged". 2.4 (draft:196) changes only `saveFileByPath` and the frontmatter writer.
- **Evidence: these note writers stay blind after M2**, all through plugin-fs `writeTextFile` with no rev and no lock:
  - `core/filesystem/link-updater.service.ts:35,39` (rename link rewrite: reads disk or the dirty buffer, writes over it)
  - `features/type-definitions/type-definitions.service.ts:218,291,309`
  - `features/deep-link/deep-link.service.ts:260,279,296,313`, `app/deep-link-actions.ts:61,173`
  - `features/file-icons/file-icons.service.ts:65,98`, `plugins/templates/templates.service.ts:116`
- **Rust writers outside the planned lock:** `toggle_task_status_inner` (`commands/vault.rs:669-683`, read then `write_atomic`), `propagate_type_rename_inner` (`vault.rs:341-370`, a loop of read then `write_atomic` over many notes), `create_note` (`vault.rs:896-899`).
- **Failure scenario (M6, phone renames a note):**
  1. The phone runs `updateLinksAfterRename`. For each backlink source it reads the file over RPC.
  2. The desktop saves an edit to one of those sources through CAS.
  3. The phone's `writeTextFile` lands blind and wipes the desktop edit. No conflict is shown anywhere.
  - The same holds in reverse for desktop link rewrites against phone CAS writes.
- **Fix:**
  1. In M2, make the VaultFs `writeText` contract require `expectedRev` for every existing `.md`/`.markdown` path (mode `mustExist`). The only allowed blind mode is `createOnly`.
  2. Add a ratchet test listing every `writeTextFile(` call on a note path, extending `raw-write-ratchet.test.ts`.
  3. Route the Rust writers (`toggle_task_status`, `propagate_type_rename`, `create_note`, the sync PUT) through the same `api/fs.rs` lock-and-compare function.
  4. Reword the M2 exit to name the writers covered, and make "every note writer" the gate for M5.

### B2. `toggle_task_status` is not safe for a second client

- **Location.** draft:260 (6.1) adds it to the remote Write class with only the scope check.
- **Evidence:**
  - It is keyed by `lineNumber` (`contracts/commands.ts:84`). It reads and writes with no rev (`vault.rs:669-683`), and that line number comes from the Tasks index, which can be stale (see M6).
  - The TS follow-up, `tasks.service.ts:114`, calls `syncExternalContentToEditor(filePath, updatedContent, true, 'none')`, which sets both `content` and `savedContent` (`editor.store.svelte.ts:130-135`). If that client has the note open and dirty, its unsaved edits are replaced with the disk content plus the toggle. This is silent loss, and it is already a desktop bug: Tasks view toggle with a dirty tab.
- **Failure scenarios:**
  - The desktop inserts 3 lines above a task and saves. The phone's Tasks view still shows the old line N. A tap toggles a different checkbox, or nothing, with no error.
  - The phone has the note open and dirty, the user taps a task in the Tasks view, and the phone edits are lost.
- **Fix:**
  - Change the args to `{path, lineNumber, expectedLineText | expectedRev}`. The command fails with a conflict on mismatch and runs under the per-path lock.
  - In `toggleTask`, when the tab is dirty, apply the toggle to the buffer instead (or save first through CAS). Never use `markSaved=true` over a dirty tab.
  - The same `markSaved=true`-over-dirty pattern is at `type-definitions.service.ts:220`, `deep-link.service.ts:262,281,298` and `deep-link-actions.ts:63`. Audit them in the same Issue.
  - Write a failing test first (rule 11).

### B3. The event hub leaks the Mac clipboard and debug log to every paired device

- **Location.** draft:212 (3.5): "`listen_any` per `EventMap` name -> broadcast".
- **Evidence:** `EventMap` includes `qc:capture-detected`, `qc:open-composer`, `tauri-debug-log` and `menu:settings` (`src/lib/contracts/events.ts:14-17, 33-42`). `capture_clipboard_now` emits `qc:capture-detected` with:
  - the clipboard `text` (`quick_capture/commands.rs:157-168`);
  - the frontmost app and browser tab `sourceTitle`/`sourceUrl` (`:225-228`);
  - screenshot file paths (`:176-184`).
- **Failure scenarios:**
  - A password copied from a password manager on the Mac goes out over WS to the phone and every other paired session.
  - If the quick-capture plugin's listener runs in the remote bundle, the phone also acts on the capture, which can write a duplicate inbox note.
- **Fix:**
  - Use an explicit allowlist in `hub.rs`: `vault-index-updated`, `vault-files-changed`, `semantic-index-progress`, plus the new remote events.
  - Add a parity test that fails when a new `EventMap` name is not classified (`remote` or `host-only`), mirroring `COMMAND_POLICY`.
  - Never forward `qc:*`, `tauri-debug-log` or `menu:*`.

### B4. M9 sync: deletes inferred from absence, no mass-delete guard, hard delete on the Mac

- **Location.** draft:304-307. Design B §5.2: "deleted on one side, unchanged on other -> delete (iOS: move to sync/deleted/ for 30 d)". Nothing defines what the host does on `DELETE /v1/sync/file`.
- **Failure scenarios:**
  - **Phone scan error.** A scan that returns empty or partial (vault dir missing after a container change, a read error, a bug in `scan()`) makes `L` absent while `B` and `R` are present for every file. The planner then issues `DeleteRemote` for the whole vault. On the Mac the files are removed outright: the Mac Trash manifest is not synced (design B §5.1), so nothing is restorable from the app.
  - **Host-side absence.** The vault root is on an unmounted disk, or iCloud has made files dataless (Q3) and they fail to read. Every file then becomes `DeleteLocal` on the phone. The phone keeps them in `sync/deleted/` for 30 days but shows nothing.
- **Fix:**
  1. On iOS the app is the only writer (design B §6). Record every local delete in an explicit op journal, and never infer a local delete from absence. An unexpected local absence means re-pull, not DELETE.
  2. Host: if the manifest scan has any error or the root is missing, fail the request (5xx). Never return an empty manifest.
  3. Mass-delete breaker on both sides: more than 10 files or more than 5% in one cycle halts sync and asks the user.
  4. The host executes a sync DELETE as a move to Kokobrain Trash, not `remove`. That depends on M11 being fixed first.
  5. Add tests: empty local scan, missing host root, and an unreadable file on each side, each yielding zero deletes.

## Major

### M1. Reload race drops keystrokes, and remote latency makes it likely

- **Evidence:**
  - `editor.service.ts:380` checks `isTabDirty` before the async read (`:385-388`).
  - After the read, `:398` re-checks only `!tab || diskContent === tab.savedContent`, then `:401` calls `syncExternalContentToEditor(..., true, 'none')`, which overwrites `content` and `savedContent` (`editor.store.svelte.ts:130-135`).
  - Keystrokes update the store synchronously (`editor.service.ts:224-227`, `editor-extensions.ts:170-171`), so text typed during the read is lost and the tab looks clean.
  - On desktop the read takes ms. On the phone (3.7, 3.8 remote VaultFs over WS, cellular), it takes hundreds of ms to seconds. 3.9's resync "reload of clean open tabs" uses the same path.
- **Scenario.** The phone has the daily note open and clean. The desktop saves it. The hub event arrives, and the phone starts the RPC read. The user types a sentence before the read returns, and the sentence disappears.
- **Fix.**
  - Re-check `isTabDirty(tab)` and `tab.content === contentAtReadStart` after the await. With CAS, also compare the rev.
  - Add a failing unit test with a deferred read and a keystroke in between.
  - Put it in M2. It is a one-line `fix:` that also helps desktop.

### M2. Self-conflicts from lost acks and overlapping saves

- **Evidence.**
  - 3.7 says pending calls are rejected on loss and never replayed (draft:214).
  - The editor's retry is a new `saveFileByPath` call (`editor.service.ts:184-194`), so the opId ring in 2.3/5.1 (draft:195, :244) is never hit for the cases it was meant for. It also does not survive a host restart.
  - `saveDirtyTabs` can start a second save for a path while the first is still in flight. The debounce fires again, and the 5 s retry, `saveAllDirtyTabs` (on `visibilitychange`) and the frontmatter path (`frontmatter-write.service.ts:129`) can each start one too. Each sends the same stale `baseRev`.
- **Scenario.**
  1. The phone sends v1 with `expectedRev = r0`.
  2. The socket drops after the host wrote v1 (rev r1), so the ack is lost.
  3. The tab stays dirty, and the retry sends v1 or v1+ with `expectedRev = r0`. The host answers `conflict{currentRev: r1}`.
  4. The sheet's "theirs" is the user's own earlier text. "Keep theirs" silently drops the latest keystrokes, and "keep both" litters the vault with conflict copies.
- **Fix.**
  - Idempotency by content: if `sha256(newBytes) == currentRev`, return success.
  - The client keeps `lastSentRev = sha256(sentBytes)`. On a conflict where `currentRev == lastSentRev`, it adopts the rev and retries silently.
  - Single-flight per path: at most one in-flight write per tab, and later saves coalesce behind it.
  - Drop the opId ring or keep it only as a log aid. Test the lost-ack case against the fake host.

### M3. Revision token: bytes vs a decoded string

- **Evidence.**
  - draft:96 says "expectedRev = rev of savedContent", which is a JS string.
  - plugin-fs 2.7.1 decodes with `new TextDecoder('utf-8').decode(bytes)` (`node_modules/@tauri-apps/plugin-fs/dist-js/index.js:498`). That decoder strips a leading BOM and replaces invalid UTF-8 with U+FFFD, so `sha256(utf8(savedContent))` differs from `sha256(disk)`.
  - The reads that seed tab state still use plugin-fs after M2:
    - `editor.service.ts:124` (open)
    - `:387` (reload)
    - `frontmatter-write.service.ts:117`
    - `link-updater.service.ts:35`
- **Scenario.**
  - A note with a BOM (common from Windows editors) conflicts on every save.
  - A Latin-1 note is rewritten with U+FFFD on the first edit. That second case is already true on desktop today.
- **Fix.**
  - The rev is defined only over bytes and only by the host. `fs_read_text` returns `{content, rev}` and refuses lossy decodes, raising an error instead of U+FFFD. Decide BOM handling explicitly (keep it in `content`).
  - Every read that sets `savedContent` goes through `fs_read_text`, and the tab stores the rev it got. Never hash on the client.
  - Add a test with BOM and invalid-UTF-8 fixtures.

### M4. Editor save mode on a deleted or renamed file

- **Evidence.** Today `saveFileByPath` uses `writeTextFile` (`editor.service.ts:168`), which creates the file. A delete made on another client closes no tabs on this one: `closeTabsForDeletedPath` runs only in the local `applyPathChange` (`path-change.service.ts:125`). 2.3 defines `mustExist`, but 2.4 does not say the editor uses it.
- **Scenario.**
  1. The phone moves `a.md` to Trash (M8) or renames it (M7.4).
  2. The desktop tab for `a.md` is dirty, autosaves, and recreates `a.md`.
  3. The result is a resurrected duplicate, wrong links, and a Trash entry whose original path is now taken.
- **Fix.** The editor save uses `mustExist` plus `expectedRev`. A missing file returns `conflict{kind:'missing'}`, and the sheet offers "Save as new file" (default) or "Discard". Same on the phone.

### M5. Draft journal holes

All at draft:246 (5.3).

- **Clear-on-ack race.**
  1. The user types "abc", the draft holds abc, and the save of abc is in flight.
  2. The user types "d", and the draft debounce writes abcd.
  3. The ack for abc arrives and clears the draft.
  4. The app is killed before the 2 s autosave. "d" is gone.
  - Fix: compare-and-delete, so a draft is cleared only if `draft.content === ackedContent`.
- **Debounce is not specified.** If the draft write shares the 2 s autosave debounce (`editor.service.ts:198`), up to 2 s of typing dies with the process.
  - Fix: throttle draft writes to 250-300 ms, and also write one on `visibilitychange: hidden`/`pagehide` before `saveAllDirtyTabs`. Note that an IndexedDB transaction started in `pagehide` may not commit (UNVERIFIED).
- **Separate stores.**
  - A home-screen web app has its own IndexedDB, separate from Safari. Since iOS 17.2 only cookies are copied, once, when the app is created (Safari 17.2 notes via https://news.ycombinator.com/item?id=38604180; WWDC23 https://developer.apple.com/videos/play/wwdc2023/10120/).
  - Drafts made in a Safari tab are therefore invisible in the home-screen app, and the reverse. They are also subject to Safari's 7-day script-writable storage cap (third-party summary, UNVERIFIED against a primary source).
  - Fix: allow editing only under `display-mode: standalone`. In a Safari tab, show read-only mode with an "Add to Home Screen" banner.
- **Reload.** The once-only `location.reload()` on a `serverVersion` change (draft:219) must flush drafts first. Same for any resync reload.
- **Key.** Key drafts by `(instanceId, vaultRoot, rel)`, not `rel` alone. If the host vault changed, list the drafts instead of applying them to a different vault with the same relative path.

### M6. Index commands trust content from the client

- **Evidence.** These take `content` from the caller: `update_note_in_index {path, content}` (`commands.ts:74`), `save_snapshot {filePath, content}` (`:41`) and `update_search_index_file`. In draft:90 the phone runs `notifyAfterSave` over RPC after the ack.
- **Scenario.**
  1. The phone write lands, then a desktop write lands.
  2. The phone's `update_note_in_index(phoneContent)` arrives after the desktop's own update.
  3. The Rust index, FTS and the Tasks line numbers now reflect content that is not on disk, until the next edit. B2's toggle then targets the wrong line.
- **Fix.**
  - In remote mode, the host indexes inside `fs_write_text` under the per-path lock (Rust index, FTS, semantic, snapshot).
  - The remote Write class for `update_note_in_index`, `update_search_index_file` and `update_semantic_file` ignores the client content and re-reads disk (or becomes Virtual).
  - Add a test with two writers, out-of-order index calls, and index == disk at the end.

### M7. `VaultScope` deny-list gaps

- **Root and directory operations.** design A §3.5's rule is "canonicalize, `starts_with(root)`". The vault root itself passes it. The deny-list is file-level: `.kokobrain/kokobrain.db*`, `models/**`, `vault-index.msgpack`, `.git/**`. So these pass:
  - `fs.remove {path: root, recursive:true}`
  - `fs.remove {path: root/.kokobrain, recursive:true}`
  - `fs.rename {from: root/.kokobrain}`, which moves the live WAL DB
  - Fix: deny Write/Create/Remove/Rename on the root and on the `.kokobrain` and `.git` directories themselves, not just their children. Add one test per operation. This matters from M7.4 (`moveItem`) and M8 (trash).
- **Case and normalization.** Apply the deny-list to the canonical path with a case-insensitive, NFC comparison: on case-insensitive APFS, `.Kokobrain/KOKOBRAIN.DB` is the same file. Whether `canonicalize` returns the on-disk case on macOS is UNVERIFIED.
- **Reads.** The asset route denies `.kokobrain/**` (draft:213), but these stay open:
  - `fs.readText` of `.kokobrain/settings.json`, which returns the Todoist token in plaintext (`settings.types.ts:220-221`) and the Sentry DSN (`:230-231`);
  - `.git/config`, which can embed HTTPS credentials, through both RPC and assets.
  - Fix: deny dot-dir reads except an allowlist of `.kokobrain/*.json` files the client needs, and redact `todoist.apiToken` in the settings the host returns to remote sessions.

### M8. Same-origin active content from `/v1/asset`

- **Evidence.** draft:213 and design A §5.2 apply "MIME sniff then extension", `Content-Disposition: inline` everywhere, and a `sandbox` CSP only for SVG. A vault `.html` file (web clips are common) is then served as `text/html` on `https://<mac>.ts.net:8443`, the same origin as the app. On desktop, assets come from the separate `asset:` origin, so this is a new escalation.
- **Scenario.** The user opens or embeds `clip.html`. Its script opens `/ws` (the cookie rides along, and the Origin check passes because it is same-origin) and calls `fs_write_text` or reads the whole vault.
- **Fix.**
  - Inline only an allowlist: images (not SVG), audio, video, PDF.
  - Everything else, `.html`/`.htm`/`.xhtml`/`.svg` included, gets `Content-Security-Policy: sandbox` plus `Content-Disposition: attachment`, or `application/octet-stream`.
  - Never sniff up to `text/html`.
  - Add a test: `.html` asset, assert CSP sandbox, not inline HTML.

### M9. Log-only scope (Q1) and "no vault open"

- **Evidence.** draft:200 and draft:372 offer "a log-only release first".
- **Risk.** If M3 ships while `VaultScope` is in log-only mode, remote callers reach any path (`toggle_task_status` and `create_note` today: `vault.rs:664-683`, `:862-874`).
- **Fix.**
  - The remote server refuses to start unless the scope is enforcing.
  - Log-only applies only to Tauri IPC from the desktop webview.
  - When no vault is open (welcome screen, or between vault switches), every path command from remote is denied (`-32015`).
  - Add a test for each.

### M10. Tailscale route does not fail closed

- **Port 8443 can carry Funnel.** "Funnel can only listen on ports 443, 8443, and 10000", and on a port the last serve/funnel command wins (https://tailscale.com/kb/1223/funnel, https://tailscale.com/kb/1312/serve). One `tailscale funnel 8443 ...`, for example while testing t3code or T3 Connect, makes the vault host public. The token still guards it, but `/pair`, the static bundle and `/.well-known` become internet-facing.
- **`--bg` persists.** "runs persistently in the background until you disable it", including across reboots (https://tailscale.com/kb/1242/tailscale-serve). When remote access is off or Kokobrain is not running, the tailnet route still points at `127.0.0.1:<port>`. Any local process that binds that port (for example another macOS user's process) then receives the phone's cookie and its edits.
- **The identity header is optional** (design A §8.1 step 4). Serve adds `Tailscale-User-Login` for user devices only. It is absent for Funnel, tagged devices and direct loopback (https://tailscale.com/kb/1312/serve).
- **Fix:**
  1. Use a port Funnel cannot use. That Serve accepts arbitrary `--https=<port>` values is UNVERIFIED: check it in M0 S1.
  2. Require `Tailscale-User-Login` on every request (including the pairing login) to equal the login stored at pairing. A missing header is denied, which also rejects Funnel traffic.
  3. On disable, run `tailscale serve --https=<port> off` (same flags, per kb/1242), and show `serve status` in Settings.
  4. At server start, verify through `tailscale serve status --json` that the port is not on Funnel (UNVERIFIED flag shape).

### M11. META writes and Trash (M8.1)

- **Evidence.**
  - `saveManifest` writes the whole manifest from the in-memory list (`trash.service.ts:275`).
  - `emptyTrash` runs `remove(itemsDir, {recursive:true})` on the whole items directory (`:205-210`), whatever the manifest says.
  - The desktop never reloads `.kokobrain/*.json` (watcher drops dot-dirs, CLAUDE.md Indexing §5).
  - draft:284 adds `expectedRev` on the phone side, but does not say the desktop writes become CAS too.
- **Scenarios.**
  - The phone trashes a note, and the desktop's next manifest write (any trash or restore action) drops that entry. The file sits orphaned in `trash/items/`.
  - "Empty trash" on the desktop permanently deletes phone-trashed notes the user never saw in the list.
- **Fix.**
  - Desktop META writes go through the same CAS, re-reading and retrying on conflict.
  - `emptyTrash` deletes only the item dirs listed in a freshly re-read manifest.
  - The host emits `vault-meta-changed` and the desktop reloads on it.
  - Gate M8.1 on these.

### M12. Conflicts are not rare, and the sheet loops

- **Evidence.** D5 (draft:108) reasons from the 2 s autosave window. But 5.3 deliberately keeps drafts dirty while the Mac is unreachable (lid closed, draft:32). On reconnect, every note edited on both sides in the meantime conflicts: daily notes, inbox. That is offline-lite in phase 1.
- **The retry loop.** A failed save returns `false` and re-arms `setTimeout(saveDirtyTabs, 5000)` indefinitely (`editor.service.ts:190-193`). If a conflict counts as a failure, the sheet and `save_snapshot` (2.5) fire every 5 s.
- **Fix:**
  - Move `merge3` (9.7) into M5, ahead of the sheet.
  - Show a diff in the sheet (design A §7.2 already proposes `compute_diff`).
  - Make a conflict a distinct save result that pauses autosave and the retry for that tab until it is resolved.
  - Snapshot "mine" before "keep theirs" (2.5 has it; keep it a hard requirement).

### M13. Case sensitivity across iOS and macOS (M9)

- **Evidence.** "APFS ... is case-sensitive on iOS and is available in case-sensitive and case-insensitive variants on macOS, with case-insensitive being the default" (Apple APFS FAQ, https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/APFS_Guide/FAQ/FAQ.html). Design B §5.1 normalizes NFC but not case.
- **Scenario.**
  1. On the phone the user renames `note.md` to `Note.md`. v1 treats a rename as delete + create.
  2. The phone sends `PUT Note.md If-None-Match:*`. The Mac resolves it to the existing file and returns 412.
  3. `DELETE note.md If-Match:<hash>` succeeds, because it is the same file on the Mac. The note is now gone on the Mac until the next cycle re-pushes it, and that happens only if the 412 was handled as "retry later" rather than as a conflict copy.
  - Two phone files that differ only in case cannot both exist on the Mac.
- **Fix.**
  - Key collision detection on `casefold(NFC(rel))`.
  - Reject phone-side creates or renames that collide case-insensitively.
  - Treat a case-only rename as a dedicated op (a host rename via a temp name).
  - Order a cycle as PUTs before DELETEs, and abort a DELETE whose path casefolds to a path just PUT.

### M14. Session lifecycle

- **Revocation.** Revoke must close open `/ws` connections and stop in-flight asset streams for that session. As written, a lost phone keeps a live socket until it reconnects.
- **Expiry.** Define one: for example a sliding 90 days, `Max-Age` on the cookie, a server-side `expiresAt`, and a device list showing `lastSeen`.
- **Rate limit.** Behind Serve, every request arrives from `127.0.0.1`, so "rate-limited" per IP is meaningless. Use a global limit per grant (design A §8.3's "close the grant after 5 failures" is the real control) and per `Tailscale-User-Login`.
- **Tests:** revoke closes the socket; an expired session is rejected at upgrade.

## Minor

- **m1. Atomic create.**
  - Evidence: `create_note` checks `exists()` then calls `write_atomic`, whose `rename` replaces the target (`vault.rs:896-899`, `utils/fs.rs:28`). Phone and desktop creating the same daily note can therefore both "succeed", the second clobbering the first.
  - Fix: implement `createOnly` with `OpenOptions::create_new(true)` on the temp file plus a no-replace rename (`renamex_np(RENAME_EXCL)` on macOS, UNVERIFIED in Rust std; or `link()` then `unlink(tmp)`). Same for 6.7.
  - Conflict-copy names (2.5) need a uniqueness suffix: two conflicts in the same minute from the same device collide. Sanitize `deviceName` (`/`, `..`, NUL, length) before using it in a filename.
- **m2. Durability and temp files.**
  - `write_atomic` has no `fsync`/`F_FULLFSYNC` before the rename (`utils/fs.rs:16-32`). After power loss on a MacBook, a renamed but empty file is possible (UNVERIFIED for APFS).
  - The temp files `<path>.tmp-<pid>-<seq>` live in the note's folder. Exclude `*.tmp-*` from the M9 manifest and from `scan()`, or a crash leftover syncs as a note.
  - Fix: fsync the temp file and the parent dir for note writes.
- **m3. Epoch.** `seq` is per host process (design A §3.3). After an auto-update restart, a client's `lastSeq` can fall inside the new process's ring and resume falsely. Add `instanceId`/`epoch` to `welcome` and `hello`, and resume only when both match (design B §5.1 already has `epoch`).
- **m4. `exists()` semantics on remote.**
  - Evidence: `templates.service.ts:111-116` and `file-icons.service.ts:95-98` call `exists()` and then write blindly.
  - Fix: the remote VaultFs `exists` must reject on transport errors (never resolve `false`), and these writes must use `createOnly`. Add both to the 1.6 conformance suite.
- **m5. Keychain (9.8).** Store the bearer with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`, not synchronizable, so a backup restored onto another device does not clone the credential (attribute names from memory, UNVERIFIED). Keep it in Rust (`sync_client`) and never return it to JS: queryjs runs vault JS in that webview.
- **m6. Cookie scope.** Cookies are scoped by host, not port. t3code on the same Mac is very likely served from the same `<mac>.<tailnet>.ts.net` (UNVERIFIED), so `kb_session` reaches t3code's server and any other Serve port on the host. Also `SameSite=Strict` treats other ports as same-site.
  - The Origin check (design A §8.3) must compare scheme, host and port exactly, and also run on `/v1/asset` (or check `Sec-Fetch-Site: same-origin`).
  - Name the cookie `__Host-kb_session`.
- **m7. Two host processes.** The per-path `Mutex` is per process. A `pnpm tauri dev` build on the real vault while the release app hosts, or M10 `kokobrain serve` plus the desktop, gives two lock domains over the same files and two `VaultIndex`es. Fix: take an advisory `flock` on `.kokobrain/host.lock` at `vault_session_open`, and refuse to start the remote server while another process holds it.
- **m8. No service worker.** With the Mac unreachable, a reload or an iOS relaunch gets a Safari error page. Drafts survive but cannot be seen, which contradicts the "clear 'Mac unreachable' state" in draft:44 once the page is gone. Fix: either a minimal SW that caches only an offline shell plus a read-only drafts list, or state this limit to the owner under Q2.
- **m9. merge3 safety (9.10, D5).** Before writing a clean merge, `save_snapshot` the base, ours and theirs. If `parseFrontmatterProperties` fails on the merged result while both inputs parsed, treat it as a conflict.
- **m10. Ask Q3 at M0.**
  - If the Mac vault is in iCloud or Dropbox today, phase 1 already sees external writers (sync tools' own conflict copies) and dataless files. Host reads must return an error, never empty content or "not found" (this matters for M3 reads and the M9 manifest).
  - ADR-0019 already warns about the DB in synced folders across machines (`docs/adr/0019-kokobrain-in-vault-data-dir.md:59`).
- **m11. queryjs on remote.** `'unsafe-eval'` stays in the CSP (design A §5.3). JS in vault notes gets every remote Write method. That is the same trust as desktop, but vault content arriving through sync or web clips is less trusted. Consider defaulting `autoRunQueries` to `manual` on the remote and iOS kinds.

## Checked and found sound

- Bind `127.0.0.1` plus an exact Host allowlist plus an Origin check on `/ws` and POSTs blocks DNS rebinding and cross-site WS hijacking from Mac browser pages. The cookie for `*.ts.net` is not sent to `127.0.0.1`.
- Pairing: a SHA-256 hashed grant, 5 min TTL, single atomic consume, token in the URL fragment, `HttpOnly; Secure; SameSite=Strict`. Since iOS 17.2 the cookie is copied into the home-screen app when it is created (sources in M5).
- `remote.json` lives in the app config dir, mode 0600, never in the vault.
- Phase 1 keeps a single SQLite process (Virtual `open_vault_db`/`close_vault_db`), and in M9 S1 the iOS DB is on local container disk. The WAL single-host rule holds (https://www.sqlite.org/wal.html).
- Avoiding WS query-string auth (tailscale#18651).
- The `read_files_batch` canonicalize + `starts_with` pattern (`commands/files.rs:31-60`) is the right base for `VaultScope`.

## Not verified

- No build, test or device run.
- UNVERIFIED:
  - whether Serve accepts arbitrary HTTPS ports (M10);
  - whether macOS `canonicalize` returns the on-disk case (M7);
  - whether a `pagehide` IndexedDB commit completes (M5);
  - the APFS fsync behaviour (m2);
  - the Keychain attribute names (m5);
  - whether t3code shares the hostname (m6);
  - Safari's 7-day cap applying to Safari tabs and not home-screen apps (third-party summary only).
- Design C/D and the scouts not listed in "Scope read" were not re-read.

## Sources

- Tailscale Serve, identity headers, Funnel lacks them: https://tailscale.com/kb/1312/serve
- Tailscale serve CLI, `--bg` persistence, `off`: https://tailscale.com/kb/1242/tailscale-serve
- Funnel ports 443/8443/10000: https://tailscale.com/kb/1223/funnel
- WebKit storage policy, `persist()` heuristics: https://webkit.org/blog/14403/updates-to-storage-policy/
- Home-screen web app storage separation (WWDC23): https://developer.apple.com/videos/play/wwdc2023/10120/
- Safari 17.2 cookie copy on Add to Home Screen (release notes quoted): https://news.ycombinator.com/item?id=38604180
- WebKit bug 181849, home-screen storage not shared: https://bugs.webkit.org/show_bug.cgi?id=181849
- Apple APFS FAQ, case sensitivity on iOS: https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/APFS_Guide/FAQ/FAQ.html
- SQLite WAL: https://www.sqlite.org/wal.html
