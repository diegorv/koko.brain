# Fix: reverseIndex vazio após buildIndex (ordenação)

Backlinks não aparecem ao abrir um arquivo referenciado porque `buildIndex` chama
`setNoteIndex` antes de `setNoteContents`. `rebuildReverseIndex` disparado pelo
primeiro setter usa `noteContents.keys()` — ainda vazio — e monta um cache de
resolução vazio, deixando `reverseIndex = Map{}`. Isso faz o `updateBacklinksForFile`
cair na fast path `findLinkedMentionsFromReverse` assim que a primeira edição
incremental ocorre, retornando `[]` e apagando backlinks que o fallback havia
encontrado.

## Tasks

- [x] Inverter ordem em `src/lib/features/backlinks/backlinks.service.ts:60-61` (setNoteContents antes de setNoteIndex) + JSDoc em `setNoteIndex` do store + teste de regressão que verifica `reverseIndex` após `buildIndex`.

## Notes

- Fix cirúrgico: duas linhas trocadas em `buildIndex`.
- Guardrail: JSDoc curta em `setNoteIndex` tornando o acoplamento explícito.
- Teste faltante: `backlinks.service.test.ts` nunca verificou `reverseIndex`.
