# 01: Reject non-color values in theme JSON import

**Status:** ready-for-agent

**What to build:** Importing a theme JSON in the theme editor accepts only real color values. Today the import checks just that `name` is a string and `colors` is an object, and the theme service writes every value straight into a CSS custom property on the document root. Because the CSP allows `img-src https:`, a value such as `url(https://example.com/x)` in a shared theme would make the app fetch that URL. After this Issue, a JSON with any value that is not a color, with a key outside the known token groups, or that is too large, is refused with a message that names the first bad token. Everything the app itself produces still imports.

This is the prefactor for remote themes: Issue 03 runs the same validator on every theme that comes from the online catalog, and that catalog stores a palette plus overrides (see the plan's "Package format"), so the validator works on single values and on token maps, not only on a full `ThemeColors`.

**Blocked by:** None (can start immediately)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

- [ ] A pure validator accepts the color forms the themes use today: hex with 3, 4, 6 or 8 digits, `rgb()` / `rgba()`, `hsl()` / `hsla()`, `oklch()`, `transparent`, and the `color-mix(in srgb, <color> N%, transparent)` the theme builder emits. Arguments are numeric (and percentages) only.
- [ ] It rejects `url(...)`, `var(...)`, `expression`, any `;`, `{`, `}`, quotes or backslash, an empty string, a non-string, and values over a fixed length cap.
- [ ] Failing first: a test that every built-in theme's expanded colors pass the validator, and that export then import of every built-in theme round-trips unchanged.
- [ ] A partial file still imports: missing tokens keep filling from the defaults as today; only present values are validated.
- [ ] Import refuses unknown groups and unknown token keys, and a file over a size cap; the theme editor shows the refusal with the offending token path (for example `preview.embedBg`) instead of the current generic message.
- [ ] Tests cover happy path, empty / null input, malformed JSON and each rejection class above.

## Notes

- Plan: `.scratch/remote-themes/plan-2026-11-03.md` § Trust boundary.
- `utils/color` already parses colors for contrast checks; reuse it where it fits rather than writing a second parser, but the accept list above is the contract.
