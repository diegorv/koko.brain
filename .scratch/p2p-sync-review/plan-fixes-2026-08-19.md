# Correções do P2P sync: plano priorizado dos 27 achados

Ordem de execução das correções dos achados 01 a 27 das duas auditorias do PR #143
(`REPORT.md` para 01-17, `COMPARISON.md` para 18-27). O detalhe de cada item vive em
`issues/NN-*.md`: cada arquivo tem `Status`, `Severity`, a cadeia de evidência com
file:line, por que os testes atuais não pegam, e o fix mínimo. Este plano só define a
**ordem** e o **agrupamento**; não repete o conteúdo.

## O critério de ordenação

Não é severidade pura. A ordem responde a uma pergunta de cada vez:

1. **P0** o que destrói dado do usuário. Enquanto qualquer um destes estiver aberto,
   a feature não pode ser ligada, e é isso que sustenta o veredito das duas
   auditorias.
2. **P1** o que vaza dado ou impede a feature de funcionar. Depois de P0 ela é
   segura; depois de P1 ela é utilizável.
3. **P2** correções de comportamento que produzem resultado errado mas recuperável.
4. **P3** os guards que existem e não têm teste. Vêm depois das correções de
   propósito: um guard sem teste é dívida, um guard errado é bug.
5. **P4** documentação, conformidade com o spec e CI.

Dentro de cada faixa, ordenado por (consequência vezes probabilidade) dividido por
custo do fix. Um one-liner que evita destruição vem antes de um refactor que evita a
mesma coisa com probabilidade menor.

## Antes de começar

- **Não misturar com o merge.** O PR pode ser mergeado com a feature desligada
  (default `exposeEnabled: false`, `subscriptions: []`). P0 e P1 são pré-requisito
  para **ligar**, não para mergear. Decida qual dos dois você está fazendo antes da
  primeira task.
- **Três achados corrigem arquivos fora do diff do PR**: 10 (`editor.service.ts`),
  14 (`watcher-handler.service.ts`) e 15 (`editor.service.ts`). São bugs
  pré-existentes que o sync **expõe**, não que ele introduz. Se o objetivo for
  fechar o PR, eles saem deste plano e viram issues próprias no tracker.
- **Regra de commit do repo:** uma task, um commit, com o gate de teste que
  corresponde ao que mudou (Rust -> `cargo test`; frontend -> `pnpm check` +
  `pnpm vitest run` + `pnpm build`; os dois -> os quatro). Ver `docs/COMMITS.md`.
- **19 fecha dois sintomas com uma mudança** (baseline zerada e cópia duplicada por
  rename). Uma task, um commit, dois testes.

## Tasks

### P0: destrói dado do usuário

- [ ] Task 1: `issues/01-case-collision-sobrescreve-nota.md` (destrói dado, ready-for-human)
      Certeza no APFS default, repete a cada sync, sem cópia de conflito e sem erro.
      É o bloqueador declarado. O fix mínimo troca destruição silenciosa por erro
      visível; a correção completa (mapear `local` por nome canônico) é decisão de
      desenho e por isso está marcado ready-for-human.
- [ ] Task 2: `issues/03-copia-conflito-sobrescrita-mesmo-dia.md` (destrói dado)
      Uma linha em `engine.rs:242`. Destrói exatamente o merge que o usuário fez à
      mão dentro da cópia de conflito. Melhor razão valor/custo do plano.
- [ ] Task 3: `issues/02-symlink-escapa-vault-na-escrita.md` (destrói dado, probabilidade baixa)
      Espelha no `write_atomic` o guard que o `serve_file` já tem. Probabilidade
      menor que 01, mas é o único achado que grava **fora** do vault.
- [ ] Task 4: `issues/04-snapshot-local-obsoleto-toctou.md` (destrói dado, probabilidade baixa, ready-for-human)
      Rehash do destino antes de sobrescrever. Janela de segundos; o caso afiado é
      marcar uma task no painel durante um sync grande.

### P1: vaza dado, ou impede a feature de funcionar

- [ ] Task 5: `issues/05-listener-sobrevive-troca-de-vault.md` (vaza dado)
      Uma linha, no padrão de guard que o resto do arquivo já usa. Vault fechado
      continua servindo as pastas dele na LAN.
- [ ] Task 6: `issues/06-handshake-cliente-sem-timeout.md` (trava)
      Uma linha, reusando a constante que o servidor já tem. Sem isso o botão Sync
      now morre até restart.
- [ ] Task 7: `issues/18-manifest-sem-limite-total.md` (trava)
      Contador e constante. Fecha OOM remoto (~16 GiB em ~65 s) e a variante que
      trava `sync_now` para sempre com zero memória.
- [ ] Task 8: `issues/08-arquivo-inteiro-em-memoria-e-abort-fatal.md` (trava)
      Pular por `meta.size` antes de pedir. Hoje um arquivo grande mata todas as
      pastas seguintes de forma determinística, contra o que `SYNC.md:120` promete.
- [ ] Task 9: `issues/07-servidor-sem-timeout-de-escrita.md` (trava, probabilidade baixa, ready-for-human)
      Timeout no send. O `tokio::spawn` por conexão resolve o efeito colateral mas é
      decisão de desenho. Ver também a nota 3 do `COMPARISON.md`: a metade
      pré-handshake não precisa de chave nenhuma.

### P2: comportamento errado, recuperável

- [ ] Task 10: `issues/19-estado-chaveado-por-device-name.md` (correção)
      Chavear pela identidade de pareamento. Fecha os dois sintomas de uma vez.
      Renomear a própria máquina hoje produz uma passada inteira de cópias de
      conflito atrás de um toast **verde** de sucesso.
- [ ] Task 11: `issues/20-save-state-falha-vira-falha-total.md` (correção)
      Trocar o `?` por um push em `summary.errors`. Hoje uma falha de bookkeeping
      vira "Sync failed" depois de dezenas de arquivos já gravados.
- [ ] Task 12: `issues/21-restart-listener-corre-com-accept-loop.md` (correção)
      Fazer o `stop()` esperar a task soltar o socket. Conserta todos os call sites
      de uma vez, em vez de remendar o comando.
- [ ] Task 13: `issues/11-nome-com-dois-pontos-nunca-sincroniza.md` (correção, ready-for-human)
      Filtrar na origem. Fica de pé a pergunta de desenho: permitir `:` em vault que
      não é Windows.
- [ ] Task 14: `issues/12-arquivo-ilegivel-aborta-manifest.md` (correção)
      Não deixar um arquivo derrubar a pasta, e trocar o path absoluto por
      `rel_path` nas mensagens que saem pelo fio.
- [ ] Task 15: `issues/09-timeout-30s-vs-hashing-do-manifest.md` (correção, borda, ready-for-human)
      `spawn_blocking` no `build_manifest` mais deadline dedicado para a primeira
      página. Gatilhos reais são NAS, disco mecânico e pastas muito grandes.
- [ ] Task 16: `issues/13-manifest-page-por-contagem.md` (menor)
      Paginar por bytes, ou baixar a constante e limitar o comprimento do path.
      Fica junto de 14 e 15 porque é o mesmo arquivo e a mesma cabeça.

### P3: guards sem teste

- [ ] Task 17: `issues/22-guard-contencao-pasta-cliente-sem-teste.md` (test-gap)
      Uma entrada a mais no manifest falso que já existe. Sem o guard, um peer
      pareado sobrescreve qualquer arquivo do vault que ele saiba nomear.
- [ ] Task 18: `issues/16-guard-dot-component-sem-teste.md` (test-gap)
      Mesma família: o guard existe e some sem quebrar nada. Um teste, não uma
      mudança de produção.
- [ ] Task 19: `issues/23-copias-conflito-voltam-e-sem-teste-de-convergencia.md` (menor)
      Abre a direção que nenhum teste do repo cobre: `run_sync` no vault servidor.
      Mais a linha de doc sobre o round trip da cópia.

### P4: documentação, spec e CI

- [ ] Task 20: `issues/25-ip-hardcoded-escapa-do-privacy-scan.md` (menor, CI)
      Duas linhas: TEST-NET-1 no lugar do 8.8.8.8, e padrão de IPv4 literal no
      `privacy.yml`. Primeiro do bloco porque é o único que fecha um buraco de gate.
- [ ] Task 21: `issues/26-sync-types-doc-drift.md` (menor)
      Só comentários. Conferir junto o `lastSyncClean` morto que A apontou.
- [ ] Task 22: `issues/24-lan-only-nao-e-imposto.md` (menor, ready-for-human)
      Decisão de produto: corrigir o texto ou impor o escopo. O filtro por faixa de
      IP foi julgado a correção prejudicial das duas.
- [ ] Task 23: `issues/27-pasta-exposta-e-texto-livre.md` (menor)
      Corrigir `SYNC.md:107`, ou construir o picker. O campo livre é seguro.
- [ ] Task 24: `issues/17-doc-superestima-opacidade-do-fio.md` (menor, só documentação)
      Três lugares afirmam opacidade total. Sem mudança de comportamento.

### Fora do escopo do PR (bugs pré-existentes que o sync expõe)

Estes três corrigem arquivos que o diff do PR não toca. Não bloqueiam nem o merge
nem o ligar; movê-los para issues próprias é legítimo.

- [ ] Task 25: `issues/10-autosave-reverte-download-envenena-synced.md` (correção, ready-for-human)
      Fix é em `reloadExternallyChangedTabs`, fora do diff. O único achado que
      atravessa Rust, watcher e autosave.
- [ ] Task 26: `issues/15-reload-race-descarta-teclas.md` (menor)
      Uma condição que o próprio comentário da linha 382 já promete.
- [ ] Task 27: `issues/14-fts-desatualizado-apos-pull-grande.md` (menor, pré-existente)
      Uma linha no ramo completo do watcher handler. Acontece hoje com qualquer
      mudança externa em massa, não só com sync.

## Notas

- **Não confundir com `plan-2026-08-19.md`**, que é o plano de execução da
  auditoria A e é histórico. Este arquivo é o plano de correção.
- **Fechamento:** cada issue concluída sai com um commit próprio que **deleta** o
  arquivo `issues/NN-*.md`, com o feito registrado na mensagem. Quando os 27
  fecharem, este plano é deletado no commit de encerramento.
- **`cargo clippy -- -D warnings` está vermelho na main** com 42 erros
  pré-existentes, nenhum em código de sync. Não é deste plano, mas se você adicionar
  clippy ao gate vai precisar limpar antes. Ver nota 1 do `COMPARISON.md`.
- **Achados que dependem uns dos outros:** 22 e 16 são o mesmo padrão (guard sem
  teste) e valem ser feitos em sequência pela mesma cabeça. 12, 13 e 15 mexem em
  `manifest.rs` e `protocol.rs` e conflitam entre si se forem paralelizados.
