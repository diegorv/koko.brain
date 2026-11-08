## Verdict
CHANGES PLAN (minor, wording and one candidate member; EP-12 itself is unaffected, the recovered report touches only the template-variable row and EP-01).

Scope of what I read: `core/note-creator/note-creator.service.ts`, `plugins/mods/mod-app.service.ts`, `plugins/mods/mod-vault.service.ts`, `features/type-definitions/type-definitions.service.ts`, `plugins/quick-capture/note-composer.logic.ts`, `app/deep-link-actions.ts`, `utils/template.ts`, plus a grep of every `processTemplate(` / `loadNoteTemplate(` / `openOrCreateNote(` caller. Nothing run.

## Verified changes

1. Plan section 5 row 25 ("Template variables"), and sonnet-editor.md fact 9 / E3 ("`loadNoteTemplate` is the single expansion point"). Wrong in part. Expansion has two entry points:
   - `loadNoteTemplate` (`note-creator.service.ts:49-64`), called only from `openOrCreateNote` (`:100`) and `createTypedNote` (`type-definitions.service.ts:139`).
   - `processCaptureTemplate` calls `processTemplate` directly (`note-composer.logic.ts:124,132`), used by the capture execution path `app/deep-link-actions.ts:~185`. That path does not touch `loadNoteTemplate`.
   So E3's design (a registry merged inside `loadNoteTemplate`) would never reach Quick Capture templates from deep links or the capture shortcut. Cmd+N capture does use `openOrCreateNote` (`quick-capture/note-composer.service.ts:44`), so it is split by entry. A `utils/template.ts` registry is not an option (utils: no state).
   Proposed change: in row 25 reason, replace "A throw would break daily and typed note creation; no mod uses `<%`" with "...; a global provider reaches only `loadNoteTemplate` callers (not capture templates, which call `processTemplate` directly); no mod uses `<%`". No change to the verdict "Not scheduled".

2. Plan EP-01 API list (`addAfterSaveObserver, renameItem, ... syncExternalContentToEditor`). Missing an easier route to what E3 wanted. `openOrCreateNote` already takes per-call `customVariables`, `contextDate`, `buildContent`, `templatePath`, `inlineTemplate` (`note-creator.service.ts:14-39`), and `MOD_APP` does not expose it (`mod-app.service.ts:23-53`; imports at `:1-17` show core imports are already normal there). Typed notes only accept `buildContent` (`type-definitions.service.ts`, `CreateTypedNote` options `typeName, title, contextDate, buildContent`), so no per-call variables there. Adding `openOrCreateNote` (and optionally `loadNoteTemplate`) to `MOD_APP` is one import and one line, zero core, and covers "a mod creates a note from a vault template with its own variables" with no registry and no throw-breaks-daily-notes risk (the mod's own call fails, not everyone's).
   Proposed change: add `openOrCreateNote` to the EP-01 raw member list, with the doc line "absolute `filePath`; `templatePath` absolute; the mod validates paths (full trust, so no vault-root check)". Add to section 5 row 25: "per-call variables: `ctx.app.openOrCreateNote` after EP-01".

3. Not in the plan, optional: `app/deep-link-actions.ts:195` is a bare `catch {` around `readTextFile`, `buildCaptureVariables` and `processCaptureTemplate`; a throw in expansion silently saves the raw body. It is real (read), unrelated to mod seams, and violates the "never silently swallow" rule. Only worth a one-line follow-up Issue note; not a plan change.

## Scout claims refuted
- "Four creators of new notes ... only `openOrCreateNote` gets templates": partly. `createTypedNote` also gets templates (via `loadNoteTemplate`) and explicit organization (`type-definitions.service.ts:~145`); capture gets templates via its own expansion. Only `ModVaultV1.create` (`mod-vault.service.ts:71-88`) and the silent `new` branch lack them.
- "`ModVaultV1.create` copies the `openOrCreateNote` steps": true for markRecentSave, applyNoteChange, addToTree (`mod-vault.service.ts:80-91`); it is a deliberate copy (comment says "Same steps"), not a bug.
- "Mod `templatePath` would read any file the process can reach" as a new risk: only if a new contract member is built without a check; irrelevant for a raw `ctx.app` member under full trust.
- API sketch `ctx.notes.onBeforeCreate(...)`: not needed; `buildContent` per call already exists, and a global hook would hit the same two-entry-point problem as item 1 plus the daily/typed throw risk.

## Still unverified
- Whether `deep-link.service.ts:340` (the `new` action) and `editor-host.ts:161` (wikilink create) use templates; I saw only that both call `openOrCreateNote`.
- Palette reactivity, `docs/28-mods.md`, the real mods (not read by the scout or by me for this task).
- Test coverage of the touched files.
- Rust `create_note` / `create_folder` behavior.
