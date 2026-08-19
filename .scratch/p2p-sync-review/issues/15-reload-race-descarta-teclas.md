# Issue 15: Recheck pós-await não olha isTabDirty e descarta teclas digitadas

Status: ready-for-agent
Severity: menor (pré-existente, fora do diff do PR)
Source: Integração com o app - REPORT.md

## What

`reloadExternallyChangedTabs` filtra abas sujas antes do await (`editor.service.ts:363-368`),
mas o recheck depois do `readTextFile` (`:382-384`) só compara
`diskContent === tab.savedContent`, que é falso porque o sync mudou o arquivo. Então `:387`
roda `syncExternalContentToEditor(..., markSaved=true, 'none')` e `updateTabContentByPath`
sobrescreve `content` e `savedContent` (`editor.store.svelte.ts:130-136`). O que foi digitado
durante o round trip some da store e do CodeMirror, a aba fica limpa e nada agenda um save.

Perda: exatamente as teclas digitadas dentro de um round trip de IPC, tipicamente zero a duas,
e só quando um escritor externo toca justo o arquivo em que o usuário digita.

O comentário da linha 382 já afirma que o recheck existe porque o estado "pode ter mudado
durante os reads paralelos".

## How

Uma condição em `src/lib/core/editor/editor.service.ts:383`:

```typescript
	if (!tab || isTabDirty(tab) || diskContent === tab.savedContent) continue;
```

Teste que falta: `editor.service.test.ts:1131` marca a aba suja antes da chamada, então
exercita o filtro pré-await e afirma que `readTextFile` nem foi chamado.
