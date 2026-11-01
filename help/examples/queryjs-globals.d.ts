// Editor tooling for QueryJS scripts: the `kb` / `dv` globals a script sees,
// typed by the v1 contract. It sits outside the tsconfig `include` on purpose,
// so the app build never reads it. A script opts in with
// `/// <reference path="<relative path>/queryjs-globals.d.ts" />`.
// The `import()` paths are relative to this repository, so this works only
// from a checkout of it: a copy of help/examples in a vault leaves `kb` untyped.
// src/tests/help/queryjs-globals.test.ts type-checks a probe against it.
//
// `input` is not declared here: it exists only inside scripts loaded by
// `kb.view(path, input)`, so a view script declares it itself.
//
// This file must stay a global script (no top-level import/export), hence the
// inline `import()` types.

declare const kb: import('../../src/lib/plugins/queryjs/contract/kb-api.v1').KBScriptApiV1;
declare const dv: import('../../src/lib/plugins/queryjs/contract/kb-api.v1').KBScriptApiV1;
