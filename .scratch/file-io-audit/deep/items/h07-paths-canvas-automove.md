# Deep-dive group h07-paths-canvas-automove

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## feature-writers-8: Root-level lifecycle unarchive moves the note to a non-canonical 'vault//x.md' path in the tab and the Rust index
- claimed severity: stale-state
- anchor: src/lib/features/auto-move/auto-move.service.ts:173
- scenario: A type with archiveTo '{folder}/_archive' has a member at the vault root. Archive it, then set _archived false. The unarchive move targets vault//x.md, so the tab and the VaultIndex key differ from the tree and watcher path vault/x.md. A later rename or delete from the tree misses the tab, and its next autosave recreates the old path (ghost duplicate or resurrected note). The index may also hold duplicate entries.
- evidence given: type-lifecycle-rules.ts:48-55 sets the {parent} destination; auto-move.logic.ts:113-114,129 gives parent ''; isAlreadyInDestination :68-80 is false; auto-move.service.ts:173 destPath=vault+'/'; fs.service.ts:228-230 newPath=`${dir}/${name}`; path-change.service.ts:130,159 pass it unchanged; commands/vault.rs:1001-1019 keys by exact string. The downstream ghost and duplicate effects are inferred.

## feature-writers-11: Canvas picker and drop store absolute paths that FileNode and ImageNode prefix with the vault again
- claimed severity: minor
- anchor: src/lib/features/canvas/FileNode.svelte:40
- scenario: A file or image node added from the picker shows 'Could not load file' or a broken image, because the path read is /vault//vault/x.md. The .canvas file also stores non-portable absolute paths.
- evidence given: CanvasFilePicker.svelte:61 passes file.path (absolute, file-entries.logic.ts:21); CanvasInner.svelte:465-480,545; FileNode.svelte:40; canvas-image.service.ts:33-34.

## rename-move-delete-9: Auto-move destinations taken from frontmatter are not checked for '..'
- claimed severity: security
- anchor: src/lib/features/auto-move/auto-move.logic.ts:127
- scenario: A rule with destination 'Tasks/{status}' and a note with frontmatter status '../../Other'. Saving it creates the folder and moves the note out of the current vault, into a sibling vault or the vaults root. The note disappears from the app (it is still on disk), and its keys hold a path containing '..'.
- evidence given: READ: auto-move.logic.ts:116-128 fills in {status} and {type} from frontmatter and only cleans slashes. auto-move.service.ts:173-188 joins the result onto vaultPath, then calls mkdir(recursive) and moveItem. INFER, not checked: the plugin-fs scope at capabilities/default.json:40-61 (kokobrain-vaults/**) allows the normalized target.

## rust-writes-4: A vault outside the two allowed folders half-works: Rust writes succeed, frontend reads and writes fail
- claimed severity: stale-state
- anchor: src/lib/core/vault/vault.service.ts:26
- scenario: Open ~/Desktop/notes through the folder dialog. Root-level notes open and save, but notes in subfolders show in the tree and fail to open. Ctrl-N in a subfolder creates the file through Rust and then fails to open it. Renaming a root note silently leaves links in subfolder notes broken. After a restart, nothing opens, while the Tasks list and toggles still read and write through Rust.
- evidence given: vault.service.ts:26 calls open({directory:true}) with no recursive option. The upstream dialog plugin then calls fs_scope.allow_directory(path, false), and tauri scope/fs.rs turns that into dir/* (direct children only). Nothing persists that scope across restarts. The static ACL allows only the two kokobrain-vaults folders (capabilities/default.json:37-185), a limit the onboarding page states but nothing enforces (routes/(app)/+page.svelte:44). The Rust commands use std::fs with no ACL (commands/vault.rs:888-925, 664-737). link-updater.service.ts:55-59 only logs denied link rewrites.
