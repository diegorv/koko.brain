VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first: a FileNode with `data.file` '/vault/notes/a.md' and vaultStore opened at '/vault' calls readTextFile with '/vault/notes/a.md' (readTextFile mocked at the Tauri boundary). It fails today ('/vault//vault/notes/a.md'). Use a component test, or assert the readTextFile argument through the mounted canvas (harness in src/tests/lib/features/canvas/canvas-tab-switch.test.ts). — canvas-tab-switch.test.ts "a file node with an absolute path reads and opens that path" mounts EditorView with the canvas, vault opened at '/vault', and asserts readTextFile received '/vault/notes/a.md' and never '/vault//vault/notes/a.md'. Probe: I reverse-applied the src/lib diff, ran the file (4 failed, 8 passed, the 4 new tests failing), then restored src/lib (worktree clean).
- [met] A FileNode with a vault-relative `data.file` 'notes/a.md' reads '/vault/notes/a.md', and a click on its header calls openFileInEditor with '/vault/notes/a.md'. The absolute form opens the same path. — FileNode.svelte:40 and :55 go through resolveCanvasFilePath(…, vaultStore.path). Tests "a file node with a vault-relative path …" and "… absolute path …" assert the read and, after clicking `.file-header`, editorStore.activeTabPath === '/vault/notes/a.md' through the real openFileInEditor (no spy; the store result is the stronger check and follows the no-mock-services rule), plus no tab at 'notes/a.md'.
- [met] canvas.logic.test.ts covers both helpers: `resolveCanvasFilePath` with an absolute in-vault path, an absolute path outside the vault, a vault-relative path and a null vault path; `toVaultRelativePath` with an in-vault absolute path, a sibling path that only shares the prefix ('/vault2/a.md' stays unchanged), an already relative path and a path outside the vault. — Already on main from Issue 038: canvas.logic.test.ts:704-736 has all four resolveCanvasFilePath cases and all four toVaultRelativePath cases (sibling '/vault2/a.png' stays unchanged) plus a null-vault case. Helper bodies at canvas.logic.ts:379-392 match the Issue's contract. Passing.
- [met] A test that dropping an absolute `.md` path (text/plain, as FilesNavigator.svelte:256 and NoteRow.svelte:77 set it) and picking one in CanvasFilePicker store a vault-relative `file` in the canvas JSON passed to writeTextFile. — Tests "dropping an absolute note path …" (drop event with text/plain '/vault/notes/a.md') and "picking a note in the file picker …" (clicks "Add note from vault", then the `.picker-item`) both parse the last writeTextFile JSON for the canvas path and get ['notes/a.md']. Both fail on main (probe above). CanvasInner.svelte:498 and :590 are the only createFileNode callers in src/lib.
- [met] Frontend gate green. — I ran `pnpm check` (0 errors, 0 warnings, exit 0) and `pnpm build` (exit 0, adapter-static wrote the site). Targeted vitest: canvas-tab-switch.test.ts + canvas.logic.test.ts 91/91 passed (exit 0), radius-scale.test.ts (references both changed components) exit 0. The full `pnpm vitest run` is deliver's to run.

## Findings

1. nit, src/tests/lib/features/canvas/canvas-tab-switch.test.ts:412-430: the read tests assert only the readTextFile argument, not the user-visible outcome the Issue names ("shows its content, instead of 'Could not load file'"). The mock resolves '' so the node renders "Empty file"; adding `expect(document.body.querySelector('.canvas-file-node')?.textContent).not.toContain('Could not load file')` would pin the rendered state. Optional.
2. nit, .scratch/open-itens/work/039/discovery.md:21: the plan says "One commit for the reader, one for the writers", but the reader and writer changes landed in one fix commit (a35ae25bc). No action needed; the squash merges them anyway.

## Other checks

- Scope: the diff touches only FileNode.svelte (read + click), CanvasInner.svelte (handleFileSelected, `.md` branch of handleDrop), the test file and the workflow's discovery.md. Image writers and resolveImageSrc untouched (038). No layer-baseline or composition-root change.
- Reactivity: the FileNode `$effect` still reads vaultStore.path synchronously (now inside resolveCanvasFilePath), so it stays tracked exactly as before.
- Existing canvases with absolute paths are not rewritten; they resolve unchanged because absolute paths pass through resolveCanvasFilePath.
- Not in scope and not checked: e2e suite, the real app by hand, non-POSIX absolute paths (the helper from 038 tests only a leading '/', fine for the macOS target).
- Test verdict rests on: src/tests/lib/features/canvas/canvas-tab-switch.test.ts, src/tests/lib/features/canvas/canvas.logic.test.ts, src/tests/lib/radius-scale.test.ts.

## Resolution

1. Fixed: the two read tests in canvas-tab-switch.test.ts now call `expectFileNodeLoaded()`, which asserts the `.canvas-file-node` shows the "Empty file" state (the mocked read resolves '') and does not contain "Could not load file".
2. No change: the reader and writer changes share one commit; the squash merge makes the split moot.
