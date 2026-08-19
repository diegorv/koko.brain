# Issue 10: Autosave reverte o download e o estado fica preso em KeepLocal

Status: ready-for-human
Severity: correção
Source: Integração com o app - REPORT.md

## What

O engine baixa a versão remota por cima do arquivo e grava `synced = seen_remote = hash remoto`
(`engine.rs:209-215`). O watcher chama `reloadExternallyChangedTabs`, que pula a aba porque
está suja (`editor.service.ts:366`). Dois segundos depois o autosave escreve o buffer por cima
da versão baixada. A partir daí o `decide` cai em `KeepLocal` (`decision.rs:33-35`),
`engine.rs:236-239` só sobe `seen_remote`, conta como `skipped` e nunca escreve cópia de
conflito.

Consequência estreitada pela refutação: nada único é destruído e o envenenamento não é
permanente (a próxima edição do peer produz hash novo e cai em Conflict com cópia). A
ordenação irmã é mais visível: o autosave cai antes da escrita do engine, o disco é
sobrescrito, a aba agora limpa é recarregada e o parágrafo do usuário some da tela
(recuperável pelo file-history).

## How

Não deixar o autosave reverter em silêncio. Em
`src/lib/core/editor/editor.service.ts:361-390` (`reloadExternallyChangedTabs`), quando a aba
está suja e o disco divergiu, marcar a aba para não sobrescrever o disco no próximo save e
avisar o usuário, em vez de só pular.

A forma do aviso (toast, badge na aba, cópia de conflito local) é decisão de UX do dono.
Relacionado a 04: os dois vêm de o engine escrever sem reconferir o estado do que está no
disco naquele instante.
