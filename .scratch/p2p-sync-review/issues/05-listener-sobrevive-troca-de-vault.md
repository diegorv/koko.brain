# Issue 05: Listener sobe para um vault já fechado e continua servindo na LAN

Status: ready-for-agent
Severity: vaza dado (janela limitada)
Source: Concorrência, lifecycle e DoS / Integração com o app - REPORT.md

## What

O trecho final de `initializeVault` depois do `await ensureTemplatesFolder()`
(`app-lifecycle.service.ts:249`) não tem guard de `initVersion` (o último está na linha 237).
Numa troca rápida de vault, o init superado ainda executa a linha 293 e chama
`startSyncListener(vaultPath)` com o caminho antigo, enquanto `sync.service.ts:31-40` lê o
settingsStore atual. O teardown de entrada (`:122-129`) só roda quando `unsubscribeFileChange`
é truthy, o que não vale nessa janela, então `stopSyncListener` (único call site, `:406`)
nunca roda.

Consequência durável: um vault que o usuário fechou continua servindo as pastas expostas dele
na LAN, com a pairing key dele, até a próxima troca de vault ou restart, enquanto a UI mostra
outro vault.

O mesmo rabo sem guard também re-registra o hook de search-index (`:281`), o de auto-move
(`:283-288`) e o `startWatching(vaultPath)` (`:355`) para o vault superado.

## How

Uma linha em `src/lib/core/app-lifecycle/app-lifecycle.service.ts:291`, no padrão que os
blocos das linhas 310 e 315 já usam:

```typescript
	if (initVersion !== version) return;
	if (settingsStore.sync.exposeEnabled) {
```

Teste que falta: `app-lifecycle.service.test.ts` não referencia sync em lugar nenhum.
