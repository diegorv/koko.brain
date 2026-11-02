# Issue 68 discovery

No `spec.md` exists for architecture-stability; the Issue file is the spec.

## Files that change

- `scripts/import-graph.mjs:53` `SCRIPT_RE` becomes `/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi`.
- `scripts/import-graph.mjs:58` `codeRegions` computes the content start as
  `m.index + m[0].length - m[1].length - '</script>'.length`, which is wrong once
  the closing tag can be longer (`</script >`, `</script\n>`). Replace it with the
  end of the opening tag: `m.index + m[0].indexOf('>') + 1` (`[^>]*` cannot hold a
  `>`, so the first `>` closes the opening tag). Same value for every form.
- `src/tests/lib/architecture/import-graph.test.ts` `extractImports` describe: new
  tests copied from "reads both script blocks of a .svelte file, with lines counted
  from the file start" (line 26).

## Plan

1. Failing tests: a fixture whose script block closes with `</script >` followed by
   a second block (so a missed close would swallow or drop imports), and one with
   `<SCRIPT>` ... `</SCRIPT>`; assert specs and 1-based line numbers.
2. Change the regex and the offset; run import-graph, layer-rules, feature-cycle and
   markdown-editor-imports tests, baselines untouched.

## Not changed

- `src/lib/utils/tag-extraction.ts` and `src-tauri/src/vault/parsing.rs` (alert 146
  is dismissed by the owner on GitHub; TS/Rust parity).

## Risks

- Case-insensitive matching could pick up a `<Script>` component in markup. None
  exists in `src/lib` (checked by the layer-rules run: baselines unchanged).
