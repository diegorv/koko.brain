# Issue 14: Pull grande deixa FTS5 e semantic desatualizados

Status: ready-for-agent
Severity: menor (pré-existente, fora do diff do PR)
Source: Integração com o app - REPORT.md

## What

Batch do watcher com mais de 10 arquivos .md falha o gate de
`watcher-handler.service.ts:58` e cai no ramo completo (`:71-86`), que chama rebuildIndex,
buildPropertyIndex, buildFrontmatterIconIndex e scanFilesForCalendar, e nada mais. Os invokes
de `update_search_index_file` e `update_semantic_file` só existem no ramo incremental
(`:139`, `:146`), e `scan_vault_v2_cached` não toca FTS.

Resultado: depois do primeiro sync de uma pasta, backlinks, tags, grafo e árvore mostram as
notas novas, mas a busca textual não as encontra até o próximo open do vault.

Ressalvas: não é introduzido por este PR (`watcher-handler.service.ts` não está no diff), o
mesmo já acontece com qualquer mudança externa em massa, e se cura sozinho no próximo open
(`app-lifecycle.service.ts:276`).

## How

Uma linha no ramo completo, `src/lib/core/app-lifecycle/watcher-handler.service.ts:71-86`:
chamar também `buildSearchIndex()` (e a contraparte semantic), já que a rota já é a cara.

Teste que falta: `watcher-handler.service.test.ts:292` afirma que os quatro builders foram
chamados e não afirma nada sobre `update_search_index_file`, então a omissão é invisível.
