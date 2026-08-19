# Issue 27: Pasta exposta é campo de texto livre, não o folder picker que o spec pede

Status: ready-for-agent
Severity: menor (conformidade com o spec)
Source: COMPARISON.md (kimi Task 2 matriz de conformidade, confirmado e estreitado na refutação)

## What

`docs/SYNC.md:107` diz "**Exposed folders:** add/remove list backed by a vault folder
picker." `SyncSection.svelte:184-194` é um `<Input>` cru com um botão Add, e
`handleAddExposedFolder` (`:77-84`) só faz `trim()` e tira barras das pontas: sem
checagem de existência, sem validação.

Uma entrada que não resolve para um diretório aparece na lista em `:176-183`
exatamente como uma válida, e do lado do servidor `server.rs:119-126` a filtra
silenciosamente do `ListShares`. O peer não vê compartilhamento nenhum, o usuário vê
a pasta listada como exposta, e não há erro em lugar nenhum. Ele conclui que o sync
está quebrado, não que o nome está errado.

Enquadramento correto, depois da refutação: o caso que vale em **todo** filesystem é
o typo puro (`Notse` para `Notes`). O caso de caixa (`notes/public` para
`Notes/Public`) é subconjunto só de filesystem case-sensitive: no APFS default do
macOS `vault_root.join("notes/public").is_dir()` é verdadeiro, a pasta lista e
sincroniza normalmente.

Sem impacto de segurança: `server.rs:128-132` e `manifest.rs:44` recusam entradas
inválidas, então o campo livre é seguro. O defeito é de conformidade com o spec e de
feedback ao usuário.

Não existe teste de `SyncSection.svelte`: `find src/tests -iname '*sync*'` devolve só
`sync.store.test.ts` e `sync.service.test.ts`, e nenhum monta componente.
`list_shares_returns_only_existing_folders` (`sync_server_test.rs:52-58`) é o mais
próximo e afirma a metade oposta, que uma pasta configurada e inexistente é filtrada
no servidor: prova que o descarte silencioso é intencional, e não diz nada sobre como
um nome ruim entrou na lista.

## How

Mais barato, corrigir o doc, já que o campo livre é seguro. Em `docs/SYNC.md:107`:

```markdown
- **Exposed folders:** add/remove list; the folder is typed as a vault-relative path. Names that do not resolve to a directory are silently omitted from the peer's share list.
```

Se o picker for mesmo desejado, reusar a seleção de pasta que o app já tem em vez de
construir um diálogo novo. Um meio-termo barato, se o dono quiser feedback sem
picker: marcar visualmente na lista de `SyncSection.svelte:176-183` as entradas que
não aparecem em `syncStore.status`, ou validar a existência via IPC no `Add`.
