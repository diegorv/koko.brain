# 10: Images in notes display for a vault under ~/kokobrain-vaults: the asset-protocol scope adds that root and keeps the folders the README documents

**Note (2026-11-06):** only add `$HOME/kokobrain-vaults/**` (and its .kokobrain subtree) to the asset scope; do not narrow it. Any wording below about cutting the scope down is superseded by the title and the plan review.

**What to build:** The asset protocol that serves every embedded image is scoped in src-tauri/tauri.conf.json:30-44 to $DOCUMENT/**, $HOME/MyFiles/**, $HOME/kokobrain-vault/** (singular, a pre-standardization path), $DESKTOP, $PICTURE, $DOWNLOAD and the app cache. Commit c887921c7 moved the fs capability to the two roots ~/Documents/kokobrain-vaults and ~/kokobrain-vaults but never updated this list, so $HOME/kokobrain-vaults/** is missing and every convertFileSrc URL for a note image in such a vault is refused (broken image, no message). Fix direction: make the assetProtocol scope list exactly the two vault roots (with their .kokobrain subtrees) plus what is genuinely needed outside a vault (the app cache), and drop the stale entries ($HOME/MyFiles, $HOME/kokobrain-vault) unless something still needs them. Add a config test so the asset scope and the fs capability scope cannot drift apart again.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/architecture/fs-capabilities.test.ts (new file, same pattern as the default.json read in src/tests/lib/core/settings/theme-catalog.service.test.ts:139-150): read src-tauri/tauri.conf.json and src-tauri/capabilities/default.json; for every vault root in the fs:allow-read-text-file scope ($DOCUMENT/kokobrain-vaults/**, $HOME/kokobrain-vaults/**), assert app.security.assetProtocol.scope contains the same glob. It fails today for $HOME/kokobrain-vaults/**.
- [ ] An image embedded in a note of a vault at ~/kokobrain-vaults/<name> renders in live preview (manual check in the app, since the scope is enforced by Tauri at fetch time).
- [ ] A screenshot captured by Quick Capture into such a vault renders in the note it was embedded in.
- [ ] Images in a vault under ~/Documents/kokobrain-vaults still render.
- [ ] Both gates: cargo test --manifest-path src-tauri/Cargo.toml, then pnpm check and pnpm vitest run.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/high. The owner's vault is under ~/kokobrain-vaults, so no convertFileSrc image displays there. It is a one-line config fix with the largest daily impact.
- **Trigger:** Keep the vault at ~/kokobrain-vaults/<name> (one of the two locations the welcome screen and help 01 allow), then open a note with ![[pic.png]] or ![](pic.png), or capture a clipboard screenshot into it.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:170-175 (applyFileSrc -> host.assetUrl) and :557 -> src/lib/app/editor-host.ts:112-114 assetUrl = convertFileSrc(path) (the only convertFileSrc user, rg) -> src-tauri/tauri.conf.json:30-44 assetProtocol.scope has $HOME/kokobrain-vault/** (:37) but no $HOME/kokobrain-vaults/**; ~/kokobrain-vaults is not under $DOCUMENT -> src-tauri/capabilities/default.json:66-80 fs scope uses $HOME/kokobrain-vaults/** -> help/documentation/01-getting-started.md:11-12 and src/routes/(app)/+page.svelte:44 advertise both roots -> git show c887921c7 (standardize vault locations) changed capabilities and docs only; git log -S on tauri.conf.json shows the singular entry from 9c12174c3 was never updated. No runtime asset_protocol_scope grant exists (rg asset_protocol_scope src-tauri/src: none). A listing of the two roots on this machine shows only ~/kokobrain-vaults exists, so the owner's vault is very likely there.
- **Related Issues before the audit:** `.scratch/file-io-audit/issues/37-vault-outside-allowed-folders.md`
- **Second opinion:** upheld (ux, high). tauri.conf.json:32-43 assetProtocol.scope lists $HOME/kokobrain-vault/** (singular) but not $HOME/kokobrain-vaults/**. capabilities/default.json uses $HOME/kokobrain-vaults. There is no runtime asset scope grant, and tauri.conf.json is the only config file. ~/kokobrain-vaults exists on this machine and ~/Documents/kokobrain-vaults does not, so every convertFileSrc image in the owner's vault is refused. The image files on disk are intact; only the display fails. Corrections to apply while implementing: Category content -> ux: images fail to display, but nothing on disk is lost. Note: $DOCUMENT/** already covers the Documents root, so only the HOME root is missing.
- **Source:** audit 2026-11-05, domain `file-io`, finding `N-file-io-01` (from file-io-rust-3). Size S.
- **Plan review:** The Issue's what_to_build says to cut the assetProtocol scope down to the two vault roots plus the app cache, dropping $DOCUMENT/**, $DESKTOP/**, $PICTURE/** and $DOWNLOAD/**. help/documentation/README.md:50-62 documents those folders for file:// images, and deep-link kind=shot embeds absolute file:// paths (23-deep-links.md:207-209). As written, this ready-for-agent Issue removes documented behavior without saying so, and that contradicts the plan's own 'one-line config fix' rationale. Add the ~/kokobrain-vaults root; narrowing the scope is a separate owner decision, not part of this Issue.

## Comments
