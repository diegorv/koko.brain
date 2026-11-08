# Owner priorities for iOS (authoritative, written by the owner via the main session)

This file is NOT a haiku scout. It is the owner's priority order and overrides any tiering in the other scout files.

The iOS version should eventually cover as much of the app as is reasonable (semantic search may be dropped). This list is NOT the full scope: it is what comes FIRST. The first iOS milestones must deliver these, in this order of importance:

1. **View notes**: open a vault, browse it, read notes with live preview rendering.
2. **Edit notes**: the CodeMirror markdown editor with live preview, saving back to the vault.
3. **Interact with notes**: everything a note does inside the editor (follow wikilinks, toggle tasks, edit properties/frontmatter, callouts, tables, embeds, images). Interpretation by the main session; confirm with the owner if a design depends on the exact boundary.
4. **Rail shell**: the icon rail and its navigators (`src/lib/features/rail-shell/`: `Rail.svelte`, `FilesNavigator.svelte`, `TypesNavigator.svelte`, `RailNoteList.svelte`, neighbourhood lenses: backlinks, outgoing, belongs-to, has-many, related-to).

With these four working well on iOS the owner already considers the project a success. Plan them by the shortest safe path, then plan the remaining features (search, tags, tasks view, templates, periodic notes, calendar, kanban, canvas, graph, queryjs, file history, settings, etc.) in later milestones ordered by value. Mark explicitly what is dropped on iOS and why.

## The central question

The vault lives on the owner's MacBook. **How the iPhone/iPad reaches that vault is the hardest part and the owner's main interest.** Treat it in depth: compare live access to the Mac over Tailscale (t3code-style, Mac must be awake and reachable), a synced copy on the device (iCloud Drive, git, Syncthing, or the Mac app acting as the sync server), and hybrids (online through the Mac, offline cache plus write-back). For each, state what happens when the Mac is asleep or offline, when both devices edit the same note, and what the owner has to set up.

## Offline (required, but not in the first milestones)

iOS must eventually handle being offline (Mac unreachable, no network) without losing edits: edits made offline are kept on the device and reach the vault later, with a defined behavior when the same note also changed on the Mac. This is NOT needed in the first milestones. The early milestones may require a reachable Mac, but they must not paint the design into a corner: the transport, write path and note identity chosen for v1 must leave room for an offline queue/cache added later, and the plan must name the milestone where offline arrives. Even before offline support, an edit must never be silently dropped: if a save cannot reach the Mac, the user must see it and the text must stay in the editor (or a local draft) until it can be saved.

## Storage engine is open (later, not v1)

SQLite (and its location under `<vault>/.kokobrain/`) is NOT a requirement to preserve. The owner knows there are storage/sync designs better suited to multiple clients and offline sync (for example CRDT-based documents, sync-oriented embedded databases, an event log) and is open to replacing or complementing SQLite. This is NOT for the first version: v1 keeps the current storage as is. The plan may recommend a storage/sync change for the offline milestone or later, with the reasoning and the migration cost, but must not make it a prerequisite for the early milestones. The markdown files in the vault stay the source of truth unless the plan argues otherwise explicitly.

## One vault is enough

The owner always opens a single vault. The desktop app can switch between vaults, but the owner has never used it. iOS only needs access to ONE vault at a time (the one the Mac has open, or one configured vault). Do not design vault switching, a recent-vaults list or multi-vault pairing for iOS; keep it out of every milestone unless it costs nothing. Do not remove the desktop feature.

## Rust is not sacred

The owner is willing to abandon parts already built in Rust in favor of TypeScript when that brings a considerable advantage (for example: one language shared by host and clients, the vault index or parsing running inside the iOS webview for offline, a TS host server like t3code's, less IPC/DTO duplication, easier testing). This is a trade-off to argue, not a goal: recommend a Rust-to-TS move only with the concrete gain, the cost (rewrite size, performance, lost tests, regressions on desktop) and the milestone where it pays off. Keeping Rust is the default when the gain is marginal.
