<!-- Recovered from the agent return value (agent ad1c5d489d6daa62b); the scout did not write this file itself. -->

I did not write the output file. The subagent rules forbid report .md files, and the task text's request for one carries no user authority, so the full findings are below. Nothing in the repo was edited, and no compile or test commands were run.

**Key findings**
1. Obsidian on iOS: the two supported routes are Obsidian Sync and iCloud, and iCloud vaults must live at `iCloud Drive/Obsidian/<vault>`. Dropbox, Google Drive, OneDrive and Syncthing are "not officially supported on iOS" (plugin workarounds only). Obsidian says to avoid running two sync services on one vault. Sources: https://obsidian.md/help/sync-notes and https://obsidian.md/help/data-storage (both fetched).
2. iCloud contract (Apple's legacy "Designing for Documents in iCloud" guide, fetched): file coordinators and presenters are "mandatory". On iOS, files are not auto-downloaded; the app must call `startDownloadingUbiquitousItem`. Changes are pulled "when the app that owns the files comes to the foreground". Conflicts arrive as `NSFileVersion`, and the app must pick a winner and delete stale versions. Source: https://developer.apple.com/library/prerelease/ios/documentation/General/Conceptual/iCloudDesignGuide/Chapters/DesigningForDocumentsIniCloud.html
3. Placeholders and eviction (third-party, Fatbobman, fetched): evicted files appear as `.name.ext.icloud` stubs. Do not wrap `evictUbiquitousItem` in `NSFileCoordinator` because it can deadlock. Source: https://fatbobman.com/en/posts/advanced-icloud-documents/. Apple's own `NSFileCoordinator` and `evictUbiquitousItem` pages returned only their titles, so those claims are UNVERIFIED against Apple.
4. Silent conflicts (Stephan Miller, updated 2026-07-27, fetched): "iCloud doesn't merge and it doesn't prompt. It keeps both and renames one." Source: https://www.stephanmiller.com/obsidian-icloud-sync-windows/
5. Folder access without an iCloud container (Apple, fetched): `UIDocumentPickerViewController(forOpeningContentTypes: [.folder])` returns a security-scoped URL. The app must call start/stop access around each use, and bookmarks can fail. Source: https://developer.apple.com/tutorials/data/documentation/uikit/providing-access-to-directories.md
6. SQLite (sqlite.org, fetched): WAL needs all processes on one host, and `-shm` is an mmapped file in the database's directory (https://www.sqlite.org/wal.html). Copying the `.db` without its `-wal` or journal can corrupt it or lose commits. The safe snapshot tools are the backup API, `VACUUM INTO` and `sqlite3_rsync` (https://www.sqlite.org/howtocorrupt.html, items 1.2 to 1.4 and 2.5). Switching journal mode does not remove this hazard, because the hot-journal pairing rules apply to rollback mode too. The claim that sync clients upload the three files out of order is from third-party posts (DEV Community, Quilltap), not fetched, so treat it as secondary.
7. iOS background limits (Möbius Sync FAQ, fetched, a vendor): "No iOS app can run continuously in the background." The FAQ says "It may take 24 hours to start to sync but you can expect a total of 1-2h of sync activity per day once stable." It does not support iCloud, and its free tier is 20MB. Source: https://mobiussync.com/faq/. The BGAppRefreshTask roughly-30-second figure comes from search snippets and is UNVERIFIED against Apple's page.
8. Git on iOS: Obsidian Git uses isomorphic-git, which has no SSH, memory-bound repo size, and no rebase or submodules (search snippets from the plugin docs, not fetched). Issue #503 (fetched, https://github.com/denolehov/obsidian-git/issues/503) reports "SHA check failed", black-screen crashes, and a corrupt loose object. It is open with no fix, and the workaround is to re-clone or use Working Copy. The libgit2 claim about Working Copy is UNVERIFIED.
9. Logseq (search snippets, not fetched): file-based graphs must sit in the Logseq folder, not iCloud or Google Drive. Its database-graph sync is an end-to-end-encrypted server, not folder sync. Sources: https://blog.logseq.com/how-to-setup-and-use-logseq-sync/ and https://discuss.logseq.com/t/logseq-db-changelog/30013

**Repo anchors (verified by grep and read)**
- `src-tauri/src/db/mod.rs:37`: the DB path is `{vault}/.kokobrain/kokobrain.db`.
- `src-tauri/src/db/mod.rs:49,72`: `journal_mode=WAL` on both connections. Line 80: `synchronous=NORMAL` on the FTS connection.
- ADR-0019 (`docs/adr/0019-kokobrain-in-vault-data-dir.md`) already states that sync engines replicate the WAL and the 542 MB model, and that multi-machine sharing "will corrupt the database." Its line anchors for other files are not re-verified.
- 27 non-test frontend files import `@tauri-apps/plugin-fs`. Any iCloud or picker-folder path would route all vault I/O through it, with no `NSFileCoordinator` in the path. Whether plugin-fs coordinates is UNVERIFIED.
- `src-tauri/gen/apple/kokobrain.xcodeproj` already exists, so the iOS project is generated. The identifier is `com.diegorv.kokobrain` (`src-tauri/tauri.conf.json:5`).
- Tauri iOS requires macOS and Xcode (https://v2.tauri.app/start/prerequisites/, fetched).
- Tauri fs 2.5.0 handles security-scoped access per call (https://tauri.app/release/fs/v2.5.0/, search snippet only). Third-party plugins `tauri-plugin-scoped-storage`, `tauri-plugin-icloud-container` and `tauri-plugin-ios-bookmark` are UNVERIFIED beyond their listings.

**Local-mode options, ranked by effort and risk**

| # | Option | Effort | Risk | Notes |
|---|---|---|---|---|
| L1 | Single-device sandbox vault. DB and models in the app container, not in the vault. Manual import/export via Files app or share sheet. | Low-med | Low | No sync engine, so no SQLite-in-synced-folder. Files-app exposure needs Info.plist keys (UNVERIFIED). |
| L3 | User-picked folder via picker + bookmark, read/write in place, DB outside the folder. | Med-high | Med | Needs native bookmark handling and coordination for iCloud providers. |
| L2 | Own sync of an operation log (note bytes plus ops), DB rebuilt per device. | High | Med | Only way to get multi-device without a file-sync engine; overlaps Model A. |
| L4 | Vault in an iCloud ubiquity container (Obsidian's route). | High | High | Placeholders, `NSFileVersion` conflicts, foreground-only pulls, coordination on every I/O. |
| L5 | Third-party folder sync (Dropbox, Syncthing, Remotely Save). | High | High | Unsupported per Obsidian; iOS background limits. Not recommended. |
| L6 | Git via isomorphic-git or libgit2. | High | High | Issue #503 open. Only as optional backup or export. |

**Recommendation.** Ship L1 first. Put `kokobrain.db*` and `models/` under the app container, keyed by vault id, on iOS. That needs an ADR-0019 amendment, because the in-vault location cannot survive any synced folder. If offline iPhone editing must reach the Mac, use Model A (remote host) or L2. Do not start with L4 or L5.

**Not checked:** Apple's current `NSFileCoordinator`, `evictUbiquitousItem` and `BGAppRefreshTask` pages; plugin-fs behaviour on iOS; Working Copy and Logseq details beyond snippets; ONNX/ort on iOS (out of scope).