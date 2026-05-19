# Deep-link capture v2 schema

Evolve `kokobrain://capture` to consume a richer, fully-typed URI schema from the `koko/quick-capture` Tauri app. Every capture field travels as its own query param so the brain owns markdown rendering and can produce richer notes (citation footers, YAML metadata, attachment links) without quick-capture guessing the format.

## Schema

URI:
```
kokobrain://capture?v=2&kind=<note|clip|link|shot|file>&vault=<name>&...kind-specific...&...common...
```

Common params:
- `v=2` — required.
- `kind` — required.
- `vault` — required.
- `tags=<csv>` — optional. Merged with template tags via existing `injectTagsIntoContent`.
- `source_app`, `source_title`, `source_url`, `captured_at` — optional. Provenance.

Kind-specific:
- `kind=note` → `text` (required).
- `kind=clip` → `text` (required).
- `kind=link` → `url` (required), `title` (optional).
- `kind=shot` → `path` (required). Parser accepts; service shows "not yet supported" toast.
- `kind=file` → `path` (required). Same toast.

## Decisions (locked)

- **Discriminator**: nested `kind` inside `type: 'capture'`. Single outer variant, branches internally.
- **TS naming**: camelCase fields (`sourceApp`, `sourceTitle`, `sourceUrl`, `capturedAt`); URI parser maps snake → camel. `path` stays `path` (matches `FileTreeNode.path` / `NoteEntryV2.path` repo convention).
- **v1**: dropped entirely. No legacy variant in the union. Old `?content=` URIs toast `Missing required parameter: "kind"` post-ship.
- **Rendering helper**: pure `renderCaptureBody(action): string` in `logic.ts`. Pure (no Tauri), unit-testable.
- **Per-kind rendering**:
  - `note` / `clip`: body = `text`; if `sourceUrl` present, append `\n\n> Source: [<sourceTitle ?? sourceUrl>](<sourceUrl>)`.
  - `link`: body = `[<title ?? url>](<url>)`; if `sourceUrl` present AND different from `url`, append same `> Source: ...` footer. Service calls `injectTitleIntoContent` for `action.title` when present.
  - `shot` / `file`: service shows toast, returns early. No render path.
- **Tags + title injection**: `injectTagsIntoContent` runs for all kinds when `action.tags` non-empty. `injectTitleIntoContent` runs only for `link` kind when `action.title` present.
- **Filename**: still derived from `buildQuickNotePath(...)` for all renderable kinds. No filename customization in this slice.

## Tasks

- [x] Task 1: Replace capture schema across types + logic + service + tests in one atomic change. Update `types.ts` with `kind`-discriminated capture variants (note/clip/link/shot/file). Replace `capture` case in `parseDeepLinkUri` to require `v=2` + `kind`, validate per-kind required fields. Add pure `renderCaptureBody(action)` helper to `logic.ts`. Rewrite `executeCaptureAction` in `service.ts` to branch on `kind`, call `renderCaptureBody`, inject tags/title where applicable, throw "kind=X not yet supported" toast for shot/file. Rewrite the `capture` block in `deep-link.logic.test.ts` (parser + renderer coverage per kind, error cases). Rewrite the `capture` block in `deep-link.service.test.ts` (executeAction output per kind, shot/file toast, template + tags + title interaction). Test gate: `pnpm check` + `pnpm vitest run`. Commit.

- [x] Task 2: Documentation. Update inline TSDoc header for the `capture` action in `types.ts:61`. Rewrite the `capture` section in `help/documentation/23-deep-links.md` with the v2 schema, per-kind params, rendering behavior, and migration note (old URIs broken). Test gate: `pnpm check` (no test file changes but typecheck protects against doc-comment ref drift). Commit.

- [x] Task 3: Expose v2 capture provenance to the Quick Note template. Extend `executeCaptureAction` in `service.ts` to inject the new fields as template variables — `kind`, `sourceApp`, `sourceTitle`, `sourceUrl`, `capturedAt`, plus `url` (link kind only) — defaulting any absent field to `''` so `<% sourceUrl %>` does not fall through to the literal-name return path in `template.ts:204`. Update `help/examples/templates/Quick Note.md` to demonstrate the new vars (e.g. optional `source:`, `source_app:` frontmatter rows so a clip/link capture lands with provenance metadata). Add a service test that asserts the vars are passed for note/clip/link kinds and that absent provenance fields render as empty strings rather than literal `sourceUrl`. Test gate: `pnpm check` + `pnpm vitest run src/tests/lib/features/deep-link`. Commit.

## Notes

- v1 emitter on `koko/quick-capture` will break the moment this brain release ships. Coordinated rollout: brain v2 commit → version bump (`2.2.0-alpha` minor since schema break) → quick-capture v2 emitter targeting that brain version → quick-capture release with min-brain-version note. Smoke test step between brain ship and quick-capture impl: hand-craft `open "kokobrain://capture?v=2&kind=note&vault=brain&text=hi"` to verify parser before touching the emitter.
- The 6-task `deep-link-polish.md` plan is independent of this work. Polish items can ship before or after v2.
- Shot/file rendering deliberately deferred. Parser accepts the kinds so a future change only needs to flip the toast in `executeCaptureAction` to a real renderer.
- Field renaming: `path` is the chosen field name for shot/file because the repo convention for "file path on disk" type fields is `path` (FileTreeNode, NoteEntryV2, FileIconEntry). The earlier `filePath` consideration was dropped after grepping `path:` usage across `src/lib/`.
