# Comparação das duas auditorias do P2P sync (PR #143, `feature/p2p-sync` @ d6574998)

Confronto entre a auditoria A (Claude Opus 5, 13 agentes, executada, 17 achados
confirmados em `REPORT.md` + `issues/01..17.md`) e o plano B (kimi-k3,
`.scratch/p2p-sync-audit-kimi/audit-plan-kimi.md`, 128 linhas, 11 tarefas, nunca
executado). Toda hipótese de B entrou aqui como não verificada.

Método: 15 agentes. 7 verificadores por bloco de hipóteses, cada um seguido de um
adversário instruído a refutar por padrão, mais um agente de conferência do
mapeamento e um de cobertura reversa. O ônus da prova ficou com a hipótese.
Sete achados morreram ou foram estreitados na refutação e não estão aqui.

## Veredito

**O plano kimi não muda o veredito de A.** Mergear desligado continua seguro e
ligar continua fora de questão, pelo mesmo motivo: o achado 01 de A destrói notas
em silêncio no filesystem default do macOS e repete a destruição a cada sync, e
nada em B chega perto disso. O que B acrescenta é volume e largura, não um novo
bloqueador. A contribuição real são dez achados que A não tem, dos quais dois
importam de verdade: o achado 18 (nenhum limite no total de entradas do manifest)
é um vetor de OOM disparável por um peer pareado que A não cobre em lugar nenhum,
porque A limitou tamanho de arquivo no 08 e bytes de página no 13 e nunca perguntou
pelo agregado, e o achado 19 (estado chaveado pelo device name que o peer controla)
transforma renomear a própria máquina, que é manutenção trivial, em uma passada
inteira de cópias de conflito com as notas locais congeladas atrás de um toast
verde de sucesso. Os outros oito são menores: um race de rebind (21), duas lacunas
de teste (22, 23) e cinco defeitos de documentação, CI e conformidade com o spec
(24 a 27). Por outro lado, dezessete das hipóteses de B não sobreviveram ao
contato com o código, incluindo três das cinco que o próprio plano listou como
"mais fortes" na entrada. O saldo honesto: B teria produzido um documento mais
largo e mais auditável que A, cobrindo dependências, CI, superfície de bind e
conformidade com o spec, dimensões que A declarou fora de escopo, mas não teria
produzido o veredito de merge, porque o bloqueador de A é um MIGHT_FIND e o outro
caminho de destruição silenciosa (A02) é um WOULD_MISS.

## Tabela de hipóteses

| Hipótese kimi | Status | Achado A / novo |
|---|---|---|
| Task 0: rebase sobre main | resolvido | branch rebasado; vitest, check, build e cargo test verdes |
| Task 1: gates de baseline | parcial | `cargo clippy --all-targets -- -D warnings` falha, 42 erros, **zero** em código de sync (todos em arquivos que o PR não toca). Ver nota 1 |
| Task 2: matriz de conformidade com o spec | confirmado | **novo**: gerou 22, 24, 26, 27 |
| Task 3: uso de XXpsk3 contra a API do snow 0.10 | já coberto | A, lista "considerado correto" |
| Task 3: nada gravável antes de `into_transport_mode` | já coberto | A, lista "considerado correto" |
| Task 3: falha de handshake não vaza plaintext | refutado | `server.rs:90-93` derruba o TCP sem mensagem de aplicação |
| Task 3: higiene da pairing key nos logs | refutado | nenhum `debug_log`, `error()`, `toast` ou string de `Err` no diff interpola a chave |
| Task 3: `getrandom::fill` correto para 0.4 | refutado | API correta para a versão resolvida no lock; duplicação transitiva é normal |
| Task 3: envelope de `FILE_CHUNK_LEN` | refutado | margem medida com rmp-serde, folgada contra `MAX_PLAINTEXT_LEN` |
| Task 4: confinamento de path por caixa/NFD no servidor | refutado | reproduzido em APFS: `canonicalize` devolve o path real do disco, e `matched_exposed_folder` (`server.rs:161`) fecha antes, dando ao peer **menos** acesso, nunca mais |
| Task 4: TOCTOU canonicalize-depois-lê | não adjudicado | fora do escopo dos blocos desta rodada; o próprio plano já o classifica como risco aceito |
| Task 4: starvation do accept loop serial | já coberto | 07 (ver correção de mapeamento 3) |
| Task 4: bind em `0.0.0.0` contra a promessa LAN-only | confirmado | **novo, 24** |
| Task 5 H1: acumulação de manifest sem limite | confirmado | **novo, 18** |
| Task 5 H2: arquivo grande aborta a sessão inteira | já coberto | 08 (mapeamento exato) |
| Task 5 H3: colisão de cópia de conflito no mesmo dia | já coberto | 03 (mapeamento exato) |
| Task 5 H4: sem single-flight no `sync_now` | refutado | único call site (`sync.service.ts:100`), `setSyncing(true)` roda síncrono antes do await, janela única |
| Task 5 H5 (a): default `kokobrain` compartilhado | refutado | cada máquina tem seu próprio `sync-state.json`; dois peers com o mesmo nome nunca escrevem no mesmo arquivo |
| Task 5 H5 (b)(c): estado chaveado pelo nome que o peer controla | confirmado | **novo, 19** |
| Task 5 H5 (d): `device_name` do fio como componente de nome de arquivo | refutado | o sanitizador de `decision.rs:44-47` mais o formato do nome não produzem escape |
| Task 5 H6: falha de `save_state` depois de gravar tudo | confirmado | **novo, 20** |
| Task 6 H1: aba suja perde o download | já coberto | 10 (mapeamento exato) |
| Task 6 H2: anexos não-markdown somem do explorer | refutado | a cadeia do watcher atualiza a árvore para qualquer tipo de arquivo |
| Task 6 H3: cópias de conflito se propagam e acumulam | confirmado | **novo, 23** (fundido com Task 8) |
| Task 6 H4: `.sync-tmp-*` gera churn de índice | refutado | `is_inside_hidden_dir` (`watcher.rs:74-82`) casa qualquer segmento com ponto, **inclusive o nome do arquivo** |
| Task 6 H5: sync em massa força rebuild completo | mapeamento errado | a hipótese prevê "correto" e termina sem achar nada; 14 é um defeito diferente dentro do mesmo ramo (ver correção de mapeamento 2) |
| Task 7 H1: EADDRINUSE no restart rápido do listener | confirmado | **novo, 21** |
| Task 7 H2: race de teardown/start na troca de vault | já coberto | 05, parcial (ver correção de mapeamento 1) |
| Task 7 H3: falha silenciosa no start do listener | já coberto | `REPORT.md:874-876`, na lista de lacunas sem número |
| Task 7 H4: erros engolidos no `SyncSection` | refutado | o `.catch(() => {})` cobre um `refreshStatus` de montagem cujo único efeito é o status já renderizado condicionalmente |
| Task 7 H5: filtro de assinatura obsoleta | refutado | a tabela verdade fecha nos três casos (`null`, `[]`, lista) e não há linha duplicada |
| Task 7: conformidade `$effect`/`untrack`, sem `$derived` | refutado | os stores seguem o padrão do projeto |
| Task 8: lista de lacunas de teste | confirmado parcial | **novo, 22** e **23** |
| Task 9: `cargo audit` e diff do `Cargo.lock` | refutado | nada surpreendente nas +208 linhas; sem duplicação de major relevante |
| Task 9: ignores de quick-xml | obsoleto | `audit.toml` não os lista mais depois do rebase |
| Task 9: evasão do privacy scan pelo `8.8.8.8` | confirmado | **novo, 25** |
| Task 9: `clipboard-manager:allow-write-text` | refutado | único consumidor é o botão Copy do `SyncSection` |
| Task 10: drift de doc em `sync.types.ts` | confirmado | **novo, 26** |
| Task 10: JSDoc, tabs, inglês, higiene de commit | não adjudicado | não coberto nesta rodada; o diff não carrega mudanças alheias ao sync |
| F1: lockfile obsoleto | resolvido | resolvido pelo rebase |

Total: 10 achados novos (18 a 27), 6 já cobertos por A, 17 refutados, 2 não
adjudicados, 3 resolvidos ou obsoletos.

## Achados novos

### 18. Manifest sem limite total de entradas

Severidade: trava. `src-tauri/src/sync/engine.rs:161`.

**Cenário.** O usuário assina `Notes` e clica Sync now. O peer, pareado mas hostil
ou defeituoso, responde `GetManifest` com `ManifestPage` que sempre carrega
`done: false`. Cada página vem lotada de entradas degeneradas
`FileMeta { rel_path: "", size: 0, sha256: "" }`. Medido com rmp-serde 1.3.1, o
mesmo encoder de `protocol.rs:68`: 25 bytes por entrada no fio, 2619 entradas por
página de 65519 bytes de plaintext, e `size_of::<FileMeta>()` de 56 bytes no
cliente, o que dá amplificação de 2,24x de fio para RAM. O laço de `engine.rs:162-169`
só sai em `done: true`, `Msg::Error`, variante inesperada ou erro de transporte, e
o timeout de 30 s é aplicado a **cada** `recv` individualmente (`engine.rs:52-54`),
então um peer que continua mandando páginas nunca o dispara. Cerca de 7,1 GB de
tráfego colocam 16 GiB em um único `Vec`: aproximadamente 65 s em gigabit. O app
entra em swap e é morto pelo SO enquanto o botão continua dizendo "Syncing...".

A variante degenerada é pior de fechar: uma página **vazia** (`files: []`,
`done: false`) a cada 29 s não consome memória nenhuma e trava `sync_now` para
sempre, matando o botão pelo resto da vida do processo.

**Evidência.** `engine.rs:157` (envia `GetManifest`) -> `engine.rs:161`
(`Vec::new()`, sem capacidade e sem teto) -> `engine.rs:162-169`
(`remote_files.extend(files); if done { break; }`) -> `engine.rs:52-54`
(`timeout(RECV_TIMEOUT, chan.recv())`, por chamada) -> `engine.rs:199-204`
(`validate_rel_path` só roda **depois** que o vetor inteiro já foi montado, então
entradas lixo custam memória cheia antes de serem rejeitadas) -> `engine.rs:296`
(`MAX_FILE_LEN`, a única guarda de tamanho do cliente, não se aplica aqui).

Correção do adversário: `protocol.rs:93` e `noise.rs:49-51` **são** tetos reais,
mas de um frame, não do agregado. A formulação exata é que não existe nenhum limite
agregado no cliente. E o desfecho é swap thrash mais OOM kill, não `abort` por falha
de alocação.

**Por que os testes não pegam.** `corrupted_transfer_writes_nothing`
(`sync_e2e_test.rs:147`) e `malicious_manifest_path_is_rejected_and_session_survives`
(`sync_e2e_test.rs:199`) montam peers hostis à mão e parecem cobrir o caminho, mas
os dois mandam exatamente uma `ManifestPage` com `done: true`
(`sync_e2e_test.rs:172-176` e `:227-236`), então o ramo multi-página nunca é
exercitado. Nenhum teste manda `done: false` duas vezes, e nenhum afirma limite
sobre `remote_files.len()`, número de páginas ou duração de sessão.

**Menor correção.** Um contador e uma constante em `engine.rs`. O `.max(1)` faz
página vazia consumir orçamento, o que também mata a variante do gotejamento:

```rust
	/// Teto de entradas de manifest por pasta; um peer bem comportado nunca chega perto.
	const MAX_MANIFEST_ENTRIES: usize = 200_000;

	let mut budget: usize = 0;
	loop {
		match recv(chan).await {
			Ok(Msg::ManifestPage { files, done }) => {
				budget += files.len().max(1);
				if budget > MAX_MANIFEST_ENTRIES {
					summary.errors.push(format!("{folder}: manifest too large"));
					return false;
				}
				remote_files.extend(files);
				if done {
					break;
				}
			}
```

### 19. Estado de sync chaveado pelo device name que o peer controla

Severidade: correção. `src-tauri/src/sync/engine.rs:107`.

**Cenário.** Primeiro pareamento na ordem natural: ninguém digitou Device name, os
dois lados mandam o fallback `kokobrain` (`sync.service.ts:10-12`, default `''` em
`settings.store.svelte.ts:131`). A máquina A assina `Notes` com 500 arquivos, puxa
de B e fecha a sessão com uma entrada de `FileSyncState` por arquivo no balde
`kokobrain`. Uma semana depois o usuário faz a manutenção óbvia e digita `Studio`
no Device name de B. Nesse meio tempo B editou 40 notas que A não tocou. B reinicia
o listener e passa a responder `HelloAck` com `Studio`. A clica Sync now.
`state_map.entry("Studio").or_default()` devolve um mapa **vazio**; as 500 entradas
antigas nunca mais são lidas e nunca são apagadas. Para cada um dos 40 arquivos,
`local != remote` com `state = None`, então `decision.rs:22-37` cai em
`Conflict { write_copy: true }`, que é exatamente o caso que
`decision.rs:113-115` afirma. Resultado: 40 cópias de conflito, as 40 notas locais
continuam **desatualizadas**, e o resumo é `downloaded: 0, conflicts: 40`, que
`sync.service.ts:110-118` reporta com o toast **verde** "Sync complete", porque
`errors` e `skippedFolders` estão vazios.

Não se cura sozinho: `synced` só é gravado nos braços Download e UpToDate
(`engine.rs:209`, `:227`), e um arquivo cujo conteúdo local difere do remoto nunca
alcança nenhum dos dois. Cada nova edição de B produz mais uma cópia, para sempre,
até o usuário tornar o local byte a byte idêntico ao remoto na mão. Custo
secundário: cada rename duplica o estado inteiro em um balde novo que nada poda.

O segundo sintoma, mesma raiz: como o nome do peer entra no **nome do arquivo** da
cópia (`decision.rs:43-62`) e `today` é recalculado por sessão (`engine.rs:117`),
um rename produz uma segunda cópia com nome diferente para o **mesmo** hash remoto.
Verificado rodando a função: `Notes/plan (conflict from kokobrain 2026-08-19).md` e
depois `Notes/plan (conflict from Studio 2026-08-20).md`, byte a byte iguais.

Estreitamentos do adversário, reproduzidos: arquivos que estão idênticos nos dois
lados no momento do rename batem no braço UpToDate (`engine.rs:226-233`) na mesma
sessão e se recuperam sozinhos. O estrago fica restrito aos arquivos que divergiram.

**Evidência.** `settings.store.svelte.ts:131` -> `sync.service.ts:10-12` ->
`SyncSection.svelte:123-131` (campo livre, sem restart) ->
`app-lifecycle.service.ts:291-293` -> `server.rs:107-110` (`HelloAck`) ->
`engine.rs:72-78` (o cliente aceita o nome que chegar) -> `engine.rs:104`, `:107`
(`state_map.entry(peer_name.clone()).or_default()`, chave é o valor do fio) ->
`engine.rs:206` -> `decision.rs:22-37` -> `engine.rs:240-250` -> `engine.rs:209`/`:227`
(os dois únicos pontos onde `synced` é gravado, inalcançáveis enquanto local difere
de remoto) -> `sync.service.ts:110-118` (toast verde).

**Por que os testes não pegam.** `setup()` (`sync_e2e_test.rs:12-29`) constrói um
`ServerConfig` com `device_name: "Studio"` literal na linha 18, e todo teste
multi-sessão reusa o mesmo `Pair`. Nenhum teste chama `start_server` duas vezes com
`device_name` diferente, então `peer_name` é constante e o balde sempre acerta.
`save_then_load_roundtrips` (`state.rs:61-71`) prova serialização, nunca que a chave
seja uma identidade estável. `first_sync_with_differing_local_is_conflict_with_copy`
(`decision.rs:113-115`) afirma o comportamento errado como se fosse certo, o que é
correto naquela camada e é justamente por isso que não pode pegar um `state = None`
espúrio. No frontend, `sync.service.test.ts:60` e `:120` só afirmam o fallback
`kokobrain`; nenhum teste define um `deviceName` não vazio.

**Menor correção.** Chavear pela identidade de pareamento, que o usuário controla,
em vez do nome que o peer reporta. `hash_bytes` já está importado em `engine.rs:15`
e `peer_name` continua servindo para o nome da cópia e para o log:

```rust
	let (mut chan, peer_name) = connect(target).await?;
	let mut summary = SyncSummary::default();
	let mut state_map = load_state(vault_path);
	// A chave do balde tem que ser identidade estável, não uma String que o peer
	// muda: renomear o peer apagaria a baseline de todos os arquivos.
	let peer_key = hash_bytes(target.pairing_key.as_bytes());
	let peer_state = state_map.entry(peer_key).or_default();
```

Teste de regressão: rodar um `run_sync`, parar o servidor, subir de novo com
`device_name: "Renamed"` no mesmo vault e psk, editar só um arquivo remoto e afirmar
`(downloaded, conflicts) == (1, 0)`.

### 20. Falha de `save_state` vira falha total do sync depois do vault já estar gravado

Severidade: correção. `src-tauri/src/sync/engine.rs:130`.

**Cenário.** Vault em disco quase cheio, ou `.kokobrain/` sem permissão de escrita,
ou volume externo desmontado no meio. A sessão baixa `Notes/plan.md` (hash remoto
r1) e outros 40 arquivos com sucesso, todos já renomeados para o lugar por
`write_atomic`, e grava `synced = seen_remote = r1` no mapa em memória. Em
`engine.rs:130` o `save_state(vault_path, &state_map)?` falha e `run_sync` devolve
`Err`. `sync.service.ts:100` rejeita, então as linhas 107 e 108 nunca rodam e o
`catch` toasta `Sync failed`. O usuário vê um toast vermelho de falha e o painel
ainda mostrando a sessão anterior, enquanto 41 arquivos foram de fato gravados.

O efeito durável vem depois. O peer edita `Notes/plan.md` de novo (r2), o usuário
libera espaço e sincroniza. `load_state` não tem entrada para o path, então
`decide(local = r1, remote = r2, state = None)` desce toda a `decision.rs` até
`Conflict { write_copy: true }`. O engine mantém o r1 obsoleto em disco, escreve
uma cópia de conflito, e grava **só** `seen_remote` (`engine.rs:249`): `synced`
fica `None` para sempre. `Notes/plan.md` fica preso em r1 e toda revisão remota
futura vira mais uma cópia de conflito, para um arquivo que o usuário nunca editou.

Limite honesto: se o remoto não mudar antes do sync seguinte, `local == remote` e
`decision.rs:27-28` devolve UpToDate, então o caso comum se cura em silêncio. O
defeito só morde arquivos que o peer voltar a tocar.

**Evidência.** `engine.rs:207-217` -> `engine.rs:130` (o único `?` depois das
escritas) -> `state.rs:41-47` -> `commands/sync.rs:99-105` -> `sync.service.ts:100`
-> `sync.service.ts:107-108` puladas, `:119-122` toasta -> sessão seguinte:
`engine.rs:106` -> `engine.rs:206` -> `decision.rs:24,27,29-31,33-35,36-37` ->
`engine.rs:240-251`.

**Por que os testes não pegam.** `fresh_pull_downloads_everything_and_second_pull_skips`
(`sync_e2e_test.rs:49`) é o teste que parece cobrir o round-trip de estado, mas roda
em tempdir gravável, então o `?` de `engine.rs:130` nunca é tomado. Os testes de
`state.rs` cobrem load ausente (`:55`), round-trip (`:61`) e load corrompido (`:74`),
nunca um save que falha. No frontend, `syncNow clears syncing and rethrows on failure`
(`sync.service.test.ts:128-133`) **codifica a leitura errada**: afirma que
`lastSummary` continua null, isto é, que um `Err` de `sync_now` significa que nada
aconteceu, e continuaria passando exatamente para a falha pós-escrita que deveria
descrever.

**Menor correção.** Parar de tratar falha de bookkeeping como falha de sessão. Em
`engine.rs:130`:

```rust
	if let Err(e) = save_state(vault_path, &state_map) {
		summary.errors.push(format!("sync state not saved: {e}"));
	}
```

O usuário passa a ver `Sync finished with 1 issue(s)` com as contagens reais em vez
de um `Sync failed` seco, e pode tentar de novo antes do peer mexer no arquivo.

### 21. Restart do listener na porta persistida corre com o accept loop antigo

Severidade: correção. `src-tauri/src/commands/sync.rs:49`.

**Cenário.** O usuário liga Expose com `listenPort` 0, o backend escolhe uma porta
efêmera (digamos 64705) e `sync.service.ts:41-44` persiste, então a porta passa a
ser fixa e não zero. Depois ele digita `Notes/Public` em Exposed folders e aperta
Add. `handleAddExposedFolder` (`SyncSection.svelte:77-84`) chama
`restartListenerIfRunning`, que chama `sync_start_listener` com `port: 64705`.
`commands/sync.rs:49-54` tira o `RunningServer` do estado gerenciado e chama
`stop()`, que apenas manda `true` num canal watch (`server.rs:44-49`) e volta; o
socket pertence à task do accept loop e só é fechado quando ela é escalonada,
acorda e sai do `select!`. As linhas 56 a 59 fazem o bind da mesma porta no mesmo
comando, sem nenhum yield entre as duas coisas.

Quando a task antiga ainda não largou o socket, o bind devolve EADDRINUSE,
`start_server` devolve `Err`, o estado gerenciado já está `None` e o listener
simplesmente sumiu. `exposeEnabled` continua true, porque `restartListenerIfRunning`
(`:33-41`) engole e **não** reverte, ao contrário de `handleToggleExpose` (`:51-54`),
e como `startListener` só chama `refreshStatus` no caminho de sucesso
(`sync.service.ts:45`), `syncStore.status` mantém o `{listening: true, port: 64705}`
anterior e `SyncSection.svelte:140-145` continua renderizando "Listening on ...".
O peer passa a levar connection refused enquanto as duas UIs dizem que o
compartilhamento está no ar. Só sai disso desligando e religando Expose ou
reiniciando o app.

Correção de frequência do adversário, que é importante: a taxa de 193/200 do
verificador **não** reproduz. Dois harnesses independentes deram entre 1/200 e
25/200, isto é, algo entre 0,5% e 12,5% por restart, não quase certeza. Continua
sendo um defeito real, com estado final ruim e recuperação manual, mas é
intermitente. Confirmado à parte que `SO_REUSEADDR` não ajuda: ele cobre
`TIME_WAIT`, não um socket ainda em LISTEN no mesmo `addr:port`, e nem std/mio nem
tokio setam `SO_REUSEPORT`.

**Evidência.** `SyncSection.svelte:83` e `:91` -> `SyncSection.svelte:33-41` ->
`sync.service.ts:34-40` -> `sync.service.ts:41-44` mais
`settings.store.svelte.ts:130` -> `commands/sync.rs:49-54` (`guard.take()` mais
`running.stop()`, nada awaitado) -> `server.rs:44-49` -> `server.rs:62-86` ->
`server.rs:56-59` -> `sync.service.ts:45-50` -> `SyncSection.svelte:140-145`.

**Por que os testes não pegam.** `stop_closes_the_listener`
(`sync_server_test.rs:151-159`) e `stop_unblocks_while_a_session_is_stalled`
(`:161-172`) parecem cobrir o shutdown, mas os dois dormem 100 ms depois do `stop()`
antes de afirmar. O comentário da linha 156 diz literalmente "Give the accept loop a
moment to observe shutdown and drop the socket", que é exatamente a espera que o
caminho do comando não faz. Todo teste Rust faz bind com porta 0
(`sync_server_test.rs:30`, `:199`; `sync_e2e_test.rs:22`), então nenhum refaz bind
de porta fixa. Os testes de `commands/sync.rs` (`:112-128`) nunca constroem
`SyncServerState`, então a sequência stop-then-start nunca roda. Não existe teste de
componente para `SyncSection.svelte`.

**Menor correção.** Fazer o `stop()` de fato soltar o socket antes de voltar, o que
conserta todos os call sites de uma vez. Em `server.rs`:

```rust
pub struct RunningServer {
	/// Actually bound port (differs from the requested port when it was 0).
	pub port: u16,
	shutdown: watch::Sender<bool>,
	task: tokio::task::JoinHandle<()>,
}

impl RunningServer {
	/// Signal the accept loop to exit and wait until it drops the listening
	/// socket, so an immediate rebind on the same port cannot hit EADDRINUSE.
	pub async fn stop(self) {
		let _ = self.shutdown.send(true);
		let _ = self.task.await;
	}
}
```

e em `commands/sync.rs`, tirar o `take()` de dentro do escopo do guard:

```rust
	let previous = {
		let mut guard = state.0.lock().map_err(|e| format!("sync state lock poisoned: {e}"))?;
		guard.take()
	};
	if let Some(running) = previous {
		running.stop().await;
	}
```

### 22. O guard de contenção de pasta no cliente não tem teste

Severidade: test-gap. `src-tauri/src/sync/engine.rs:200`.

**Cenário.** O cliente assina só `Notes`. Um peer pareado hostil (a chave é
simétrica, então é um peer cuja chave vazou ou cuja máquina foi tomada) responde
`GetManifest{folder: "Notes"}` com `FileMeta { rel_path: "Private/secrets.md", .. }`,
um path relativo perfeitamente válido que passa em `validate_rel_path`. Hoje
`engine.rs:200` barra porque não começa com `Notes/`. Remova ou enfraqueça essa
condição, num refactor que extraia a validação para um helper ou numa mudança bem
intencionada para suportar manifests planos, e o engine chama
`download_file(.., "Private/secrets.md", "Private/secrets.md")` e o `write_atomic`
cria `<vault>/Private/` e grava bytes do peer numa pasta que o usuário nunca
assinou. **A suíte inteira continua verde.**

Nota do adversário: a consequência estava subestimada, não exagerada. Como `local` é
montado só a partir da pasta assinada (`engine.rs:187-189`), um path fora da pasta
não tem entrada ali, então `local_hash` é `None`, `decision.rs:23-25` devolve
`Download` incondicionalmente, e o `write_atomic` renomeia bytes do peer por cima de
`<vault>/<qualquer rel_path válido>`. Sem o guard, o peer não só suja uma pasta não
assinada: ele sobrescreve qualquer arquivo do vault que ele saiba nomear.

**Evidência.** `docs/SYNC.md:98` -> `engine.rs:200-201` -> `sync_e2e_test.rs:224-232`
(o único manifest hostil, com `Notes/a.md` e `Notes/../evil.md`) ->
`manifest.rs:21-25` (`..` reprova na regra de componente com ponto, então
`validate_rel_path` sozinho já rejeita) -> `engine.rs:207` -> `engine.rs:317-327`.

**Por que os testes não pegam.** `malicious_manifest_path_is_rejected_and_session_survives`
(`sync_e2e_test.rs:199`) parece ser o teste de contenção, e chega a afirmar em `:265`
que `evil.md` não existe no alvo do escape e em `:268-272` que `Notes/` só tem
`a.md`. As duas asserções são satisfeitas **só** pela metade `validate_rel_path`,
porque `"Notes/../evil.md"` começa com `"Notes/"` e portanto nunca alcança o ramo
`!inside`. `unshared_and_traversal_paths_are_refused` (`sync_server_test.rs:106`) é o
espelho do lado servidor e exercita `server.rs:161`, não `engine.rs:200`. Nenhum
teste constrói uma entrada de manifest fora da pasta pedida.

Mesma família do achado 16 de A: um guard cuja deleção deixa a suíte verde.

**Menor correção.** Uma entrada a mais no manifest falso e uma asserção, em
`sync_e2e_test.rs:224-232`:

```rust
		FileMeta { rel_path: "Private/secrets.md".into(), size: 4, sha256: hash_bytes(b"evil") },
```

mais `assert!(!pair.client_vault.path().join("Private/secrets.md").exists());`.

### 23. Cópias de conflito voltam pelo sync e não existe teste de convergência A para B

Severidade: menor. `src-tauri/src/sync/engine.rs:242`, `src-tauri/tests/sync_e2e_test.rs:12`.

**Cenário.** Setup de mão dupla, o que `docs/SYNC.md:26` descreve: A e B expõem
`Notes` e assinam `Notes`. `Notes/n.md` está em `base` nos dois lados com estado
acordado. A edita para `a1`, B edita para `b1` no mesmo dia.

A clica Sync now: `decide` cai em `Conflict { write_copy: true }` e A grava
`Notes/n (conflict from B 2026-08-19).md` com `b1`. B clica Sync now: o manifest de
A agora lista **os dois** arquivos. Para `n.md`, B grava
`Notes/n (conflict from A 2026-08-19).md`. Para a cópia de A, B não tem arquivo
local, então `decision.rs:23-25` devolve Download e B baixa uma duplicata byte a
byte do seu próprio texto, com um nome que diz "conflict from B". A sincroniza de
novo e baixa a cópia nomeada "conflict from A", contendo o próprio texto de A.

Estado final: os dois vaults com 3 arquivos onde havia 1, e duas cópias auto
nomeadas que são ruído puro, que entram em busca, backlinks, tags e grafo nas duas
máquinas. Apagar uma só de um lado não resolve, porque o outro ainda a tem e
`decision.rs:23-25` a traz de volta no sync seguinte.

Estreitamentos do adversário, ambos aceitos: **converge** (a partir do terceiro
sync tudo bate por hash e vira UpToDate, não há composição infinita) e o custo é
lixo mais poluição de índice, **não** perda de dados. O `n.md` nunca convergir é o
desenho, não sintoma. O que sobra de defeito real é que `docs/SYNC.md` é silencioso
sobre o round trip e que nada disso tem teste.

**Evidência.** `decision.rs:36-37` -> `engine.rs:240-243` -> `decision.rs:43-61` (o
nome não carrega marcador nenhum que a camada de sync reconheça; verificado
rodando a função inclusive sobre a própria saída) -> `manifest.rs:43-84`
(`build_manifest` anda por tudo, só pula ponto e symlink) -> `manifest.rs:14-27`
(`validate_rel_path` aceita o nome da cópia) -> `decision.rs:23-25` -> `engine.rs:207-217`.

**Por que os testes não pegam.** `setup()` (`sync_e2e_test.rs:12-29`) constrói
exatamente um `RunningServer` e um vault cliente, então `run_sync` só é chamado numa
direção e a cópia não tem como voltar.
`both_changed_keeps_local_and_writes_one_conflict_copy` (`:86-117`) afirma
`copies.len() == 1` e `copies2 == 1`, mas as duas contagens são tiradas de
`pair.client_vault` (`:98`, `:112`). `deletions_do_not_propagate_and_local_only_files_survive`
(`:120-133`) cobre só a direção do delete remoto. **Nenhum teste do repositório chama
`run_sync` com `pair.server_vault`**, então toda a classe "o que o peer vê depois que
eu escrevi uma cópia de conflito" é inalcançável.

**Menor correção.** Um teste e uma linha de doc. Em `sync_e2e_test.rs`:

```rust
#[tokio::test]
async fn conflict_copies_travel_back_to_the_peer() {
	let pair = setup(vec!["Notes"]).await;
	write(&pair.server_vault, "Notes/n.md", "base");
	let vault = pair.client_vault.path().to_str().unwrap();
	let subs = vec!["Notes".to_string()];
	run_sync(vault, &pair.target, &subs).await.unwrap();
	write(&pair.server_vault, "Notes/n.md", "remote edit");
	write(&pair.client_vault, "Notes/n.md", "local edit");
	run_sync(vault, &pair.target, &subs).await.unwrap();
	let copies: Vec<_> = std::fs::read_dir(pair.client_vault.path().join("Notes"))
		.unwrap()
		.map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
		.filter(|n| n.contains("conflict from"))
		.collect();
	assert_eq!(copies.len(), 1);
}
```

mais, depois de `docs/SYNC.md:89`: a cópia de conflito é um arquivo comum dentro da
pasta assinada, então o peer a puxa no sync seguinte e as duas máquinas terminam
com as duas cópias.

### 24. "Same LAN only" não é imposto: o listener escuta em `0.0.0.0`

Severidade: menor (conformidade com o spec). `src-tauri/src/sync/server.rs:57`.

**Cenário.** O usuário liga Expose em casa, expõe `Notes` e deixa o toggle ligado,
que é persistido e religado a cada abertura de vault. O laptop depois senta numa
rede com endereço roteável: subnet de universidade ou escritório com IPv4 público,
hotel com UPnP já mapeando a porta, ou desktop atrás de um port-forward existente.
`server.rs:57` faz bind em `0.0.0.0` e `server.rs:68` aceita a conexão
independentemente da origem, então o listener passa a ser alcançável de fora da LAN.

Enquadramento honesto, depois do adversário: **não é vetor de invasão.** A
autenticação é um PSK de 256 bits e um atacante sem a chave não passa do handshake.
`docs/SYNC.md:9` está numa tabela chamada "Decisions (agreed with the user)", ao
lado de "no NAT traversal, no relay", isto é, descreve topologia pretendida, não
controle de acesso. O que sobra é um descompasso real entre o que três textos
prometem e o que o código faz, agravado por `docs/SYNC.md:101` deixar a chave em
texto plano no `settings.json` do vault, que é o que o usuário coloca no backup.
O adversário também julgou o filtro por faixa de IP uma correção **prejudicial**,
porque quebraria setups legítimos, então a correção preferida é textual.

**Evidência.** `docs/SYNC.md:9` -> `server.rs:57` -> `server.rs:68-70` (`addr` só
alimenta um `debug_log`) -> `server.rs:90-93` (handshake direto, sem teste de
origem) -> grep por `is_private`, `is_loopback`, `link_local`, `RFC1918` em
`src-tauri/src/`: zero ocorrências -> `.github/workflows/privacy.yml:141` repete a
mesma promessa não imposta.

**Por que os testes não pegam.** Todo teste de servidor disca `127.0.0.1`
(`sync_server_test.rs:36`, `:127`, `:142`, `:167`, `:202`; `sync_e2e_test.rs:25`,
`:186`, `:251`, `:293`), então o accept só é exercitado a partir do loopback.
`list_shares_returns_only_existing_folders` e `symlink_within_exposed_folder_is_refused`
parecem testes de fronteira de exposição, mas delimitam **quais pastas** são
servidas, nunca **quem** pode pedir. Um filtro de origem podia ser adicionado ou
removido com a suíte verde dos dois jeitos.

**Menor correção.** Textual, em `docs/SYNC.md:9` e no comentário de
`.github/workflows/privacy.yml:141`: dizer que o listener escuta em toda interface e
que o escopo LAN é premissa de implantação, não controle. Se o dono preferir impor,
o guard cabe no braço de accept de `server.rs:68-70` usando os predicados de `std`,
mas isso é decisão de produto, não correção mínima.

### 25. IP do Google hardcoded passa por baixo do privacy scan

Severidade: menor (CI). `src-tauri/src/commands/sync.rs:25`.

**Cenário.** `local_lan_ip` faz `UdpSocket::bind("0.0.0.0:0")` e depois
`socket.connect("8.8.8.8:80")`. A lista de padrões Rust do `privacy.yml` traz os
literais `TcpStream::connect` e `UdpSocket::connect`, e o scan é um `grep -rnE` de
linha. Medido: **0 dos 13 padrões casam** com qualquer linha de `commands/sync.rs`.
O mesmo branch **adiciona** uma entrada de allowlist para o `TcpStream::connect` que
o scan pegou em `engine.rs:59`, o que prova que o autor sabia que o scan existe.
O job de privacidade passa verde reportando "no unknown external calls" sobre um
arquivo que contém um IP externo hardcoded, numa feature cujo próprio design doc e
cujo próprio comentário de allowlist prometem "Same LAN only" e "no hardcoded
address, no external server".

Estreitamentos do adversário, aceitos: nenhum pacote é enviado, porque `connect` em
socket UDP só registra o peer default e força um route lookup, então isto é higiene
de CI e um IP de terceiro no fonte, **não** vazamento de dado. E o ponto cego é
pré-existente, não criado aqui: `UdpSocket::connect` como regex de linha nunca
casaria uma chamada de método sobre handle.

**Evidência.** `.github/workflows/privacy.yml:100-120` ->
`.github/actions/scan-external-calls/action.yml:117` (`grep -rnE "$pattern" "$ROOT/"`)
-> `commands/sync.rs:23-27` -> 0/13 padrões casam (medido) ->
`git diff main...HEAD -- .github` mostra só as linhas 140-144 do `privacy.yml`.

**Por que os testes não pegam.** Não existe teste; a guarda **é** o job de CI.
`local_lan_ip_is_a_parseable_ip_when_present` (`commands/sync.rs:121-127`) parece
cobrir a função, mas só afirma que o que voltar parseia como `IpAddr`, nunca inspeciona
o destino, e sai cedo numa máquina sem rota.

**Menor correção.** Duas linhas. Trocar o endereço de terceiro por TEST-NET-1, que
seleciona a mesma rota e nunca é roteado, em `commands/sync.rs:25`:

```rust
	// RFC 5737 TEST-NET-1: never routed; connecting only selects the outbound interface.
	socket.connect("192.0.2.1:80").ok()?;
```

e fechar o buraco no `privacy.yml` depois da linha 118, adicionando `0\.0\.0\.0` ao
`skip:` do Rust (medido: só 4 ocorrências no fonte, das quais 2 são os binds):

```yaml
            # Bare IPv4 literals - catches hardcoded endpoints the client patterns miss
            \b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b
```

### 26. Comentários de `sync.types.ts` contradizem a semântica real

Severidade: menor. `src/lib/plugins/sync/sync.types.ts:7`.

**Cenário.** Um mantenedor liga um banner de "sync saudável" no resumo lendo
`sync.types.ts:7`, onde `skipped` significa "up-to-date or untracked": um run que
reporta `{downloaded: 0, conflicts: 0, skipped: 40, skippedFolders: [], errors: []}`
renderiza verde. Na verdade os 40 podem ser todos `engine.rs:261`, isto é, 40
arquivos ainda divergentes do peer, cada um já com uma cópia de conflito que o
usuário nunca abriu. Mesma armadilha do lado do status: um teste de
`localIp !== null` escrito contra `sync.types.ts:21` como proxy de "listener no ar"
é sempre verdadeiro, porque `commands/sync.rs:78` popula o campo esteja o listener
rodando ou não. `skippedFolders` está documentado como "permissions, encoding
issues" quando `engine.rs:118-122` só o preenche no ramo "o peer não expõe mais esta
pasta", e falhas de permissão e I/O vão para `errors` (`engine.rs:191`, `:219`).

Estreitamento do adversário: **nenhum** desses consumidores existe hoje. O impacto
vivo é zero; é um comentário errado numa interface pública que vai enganar o próximo
leitor, que é exatamente o que "menor" descreve.

**Evidência.** `sync.types.ts:5,7,9,21` -> `engine.rs:26-40` (doc Rust correto) ->
`engine.rs:234`, `:238`, `:261` (os três incrementos de `skipped`) ->
`engine.rs:118-122` -> `engine.rs:191`, `:219` -> `commands/sync.rs:12-19`, `:76-78`
-> `server.rs:57`.

**Por que os testes não pegam.** `sync.service.test.ts:106-126` e
`sync.store.test.ts:5-11` montam o resumo a partir de um literal escrito à mão e
afirmam só o encanamento de campo. Nenhum teste produz um resumo a partir do engine
Rust, então nenhum teste pode discordar de um comentário. No status,
`sync.service.test.ts:146-150` afirma `{listening: false, port: null, localIp: null}`,
mas isso é o valor de reset do próprio store (`sync.store.svelte.ts:3`), não um valor
que o comando Rust já devolveu, então o teste **reforça** a crença errada de que
`localIp` é null quando parado.

**Menor correção.** Só comentários, em `sync.types.ts`:

```typescript
	/** Files for which a new conflict copy was written this session. */
	conflicts: number;
	/** Files needing no action: up to date, local-only change kept, or an already-known conflict. */
	skipped: number;
	/** Subscribed folders the peer no longer exposes; per-folder failures go to `errors`. */
	skippedFolders: string[];
```

e

```typescript
	/** Best-effort outbound-route IP of this machine, for display; the listener itself binds 0.0.0.0. Reported even when not listening. */
	localIp: string | null;
```

### 27. Pasta exposta é campo de texto livre, não o folder picker que o spec pede

Severidade: menor (conformidade com o spec). `src/lib/core/settings/sections/SyncSection.svelte:184`.

**Cenário.** O usuário digita um nome que não resolve para um diretório, por
exemplo um typo como `Notse`, ou `notes/public` para uma pasta chamada
`Notes/Public` num filesystem case-sensitive. `handleAddExposedFolder`
(`SyncSection.svelte:77-84`) só faz trim e tira barras das pontas, e a entrada
aparece na lista em `:176-183` exatamente como uma válida. Do lado do servidor,
`server.rs:123` filtra silenciosamente qualquer entrada que não seja diretório: o
peer não vê compartilhamento nenhum, o usuário vê a pasta listada como exposta, e
não há erro em lugar nenhum. Ele conclui que o sync está quebrado, não que o nome
está errado.

Correção do adversário, incorporada: o enquadramento por caixa é subconjunto só do
Linux. No APFS default do macOS, `notes/public` **resolve**, lista e sincroniza; o
caso que vale em todo filesystem é o typo puro. Sem impacto de segurança:
`server.rs:128-132` e `manifest.rs:44` recusam entradas inválidas.

**Evidência.** `docs/SYNC.md:107` ("add/remove list backed by a vault folder
picker") -> `SyncSection.svelte:184-194` (um `<Input>` e um botão Add) ->
`SyncSection.svelte:77-84` -> `server.rs:119-126`.

**Por que os testes não pegam.** Não existe teste de `SyncSection.svelte`:
`find src/tests -iname '*sync*'` devolve só `sync.store.test.ts` e
`sync.service.test.ts`, e nenhum monta componente.
`list_shares_returns_only_existing_folders` (`sync_server_test.rs:52-58`) é o mais
próximo e afirma a metade oposta, que uma pasta configurada e inexistente é filtrada
no servidor. Prova que o descarte silencioso é intencional; não diz nada sobre como
um nome ruim entrou na lista.

**Menor correção.** Como o campo livre é seguro, o mais barato é corrigir
`docs/SYNC.md:107` para dizer que a pasta é digitada como path relativo ao vault e
que nomes que não resolvem para diretório são silenciosamente omitidos da lista do
peer. Se o picker for mesmo desejado, reusar a seleção de pasta que o app já tem.

## Correções ao mapeamento entregue

Três das seis linhas do mapeamento que veio com a tarefa não sobrevivem à leitura
do código.

1. **Task 7 H2 -> A05 é parcial, não exato, e a direção está invertida.** A05 é o
   race **oposto**: o rabo de `initializeVault` depois de `await ensureTemplatesFolder()`
   (`app-lifecycle.service.ts:249`) não tem guard de `initVersion`, então um init
   superado chama `startSyncListener` com o caminho **antigo**. A hipótese de kimi é
   sobre o `stopSyncListener()` fire-and-forget do `teardownVault` chegar depois do
   start do vault novo. Como `sync_start_listener` para qualquer listener anterior
   antes de subir (`commands/sync.rs:49-54`), o start superado produz o **desfecho**
   que kimi previu, mas por outro mecanismo. A hipótese acerta o sintoma e erra a
   causa.

2. **Task 6 H5 -> A14 está errado, e é o caso mais instrutivo.** H5 pergunta pelo
   gate de skip em `watcher-handler.service.ts:46` (`areAllRecentSaves`) e **prevê
   que está correto** ("that's correct; just verify no skip"). A premissa se
   confirma: `markRecentSave` só é chamado no caminho de save do editor
   (`editor.hooks.ts:73`) e escritas do sync vêm do `write_atomic` em Rust e nunca
   são marcadas, então o rebuild roda. Executar H5 como escrita termina com um
   "confirmado, sem defeito". A14 é outra coisa: uma omissão **dentro** do ramo que
   H5 acabou de declarar correto, a saber que o ramo completo não chama
   `update_search_index_file` nem `update_semantic_file`. Uma hipótese que já traz o
   veredito no enunciado ancora o agente e o faz parar antes.

3. **Task 4 (APFS/NFD) -> A01 está errado: componente diferente, direção diferente,
   consequência diferente.** O item de kimi vive dentro de "Task 4: Server security
   audit (server.rs)" e afirma que caixa e NFD podem derrotar a contenção de
   `serve_file`, isto é, um **escape de leitura no servidor**. A01 é destruição de
   dado **no cliente**, em `engine.rs:205`. E a hipótese do servidor foi **refutada
   empiricamente** nesta máquina APFS: `canonicalize` é `realpath(3)` e devolve o
   path verdadeiro do disco, não a grafia de quem pediu, então
   `canonicalize("<vault>/NOTES")` volta `"<vault>/Notes"` e a grafia NFC de
   `café.md` volta com os bytes NFD do disco. Caixa e normalização são **apagadas**
   antes da comparação de `server.rs:193`, não carregadas para dentro dela. Além
   disso todas as variantes fecham no **primeiro** portão, não no último:
   `matched_exposed_folder` (`server.rs:161`) exige que o pedido comece literalmente
   com `<folder>/`, então `NOTES/a.md` e `notes/a.md` são negados por não casarem
   pasta exposta nenhuma. Uma variante de caixa compra ao peer estritamente **menos**
   acesso, nunca mais. O servidor não tem o defeito. Uma execução fiel do plano kimi
   teria produzido uma refutação limpa aqui e **não** teria chegado a A01, que é o
   bloqueador do merge.

As outras três linhas conferem exatamente: Task 5 H3 -> A03, Task 5 H2 -> A08 (A08 é
superconjunto estrito), Task 6 H1 -> A10.

## O que A cobriu e o plano kimi não alcança

Contagem por achado de A, com o critério de saber se alguma tarefa de kimi levaria
um agente executor até ele: 3 WOULD_FIND (A03, A08, A10), 8 MIGHT_FIND (A01, A04,
A05, A07, A13, A14, A15, A17), 6 WOULD_MISS (A02, A06, A09, A11, A12, A16). O maior
balde é o do meio, e isso já é a manchete honesta: metade do relatório de A só é
alcançável pelo plano se o agente ler além da linha que a hipótese cita.

**O custo da costura, precisamente.** Não é que kimi ignore costuras: Task 6 e Task
7 existem exatamente para a costura TS/Rust, e A10, o achado de costura mais limpo do
relatório, é o melhor acerto de kimi, enunciado pelo menos tão bem quanto A o
enuncia. O custo é mais estreito: **costuras dentro de uma camada que o plano
dividiu por arquivo ficam sem dono.** A02 é o caso canônico. Toda instrução sobre
symlink está na Task 4, que é dona de `server.rs` e é enquadrada como segurança;
`engine.rs` pertence à Task 5, enquadrada como robustez com lista fechada de
hipóteses. O defeito não é propriedade de nenhum dos dois arquivos: é a **assimetria**
entre eles, `serve_file` canonicalizando duas vezes e checando contenção
(`server.rs:185-195`) enquanto `write_atomic` não canonicaliza nada
(`engine.rs:317-326`). Ver isso exige segurar os dois no mesmo pensamento, que é o
que uma divisão por arquivo ativamente impede. A06 é o mesmo modo de falha uma
camada acima: o próprio scope map de kimi registra "10s handshake / 30s idle
timeouts" como propriedade do servidor e a Task 4 reusa o número, então o plano leu a
proteção do responder e mesmo assim nunca perguntou se o initiator tem alguma. A11 é
uma costura produtor/consumidor com o agravante de que `manifest.rs` aparece só no
scope map e não é atribuído a tarefa nenhuma. A12 é um caminho de erro cruzando
`manifest.rs` e `server.rs`, e é o **mesmo formato** de bug que a Task 5 H2 de kimi:
o plano simplesmente colocou escrutínio de taxonomia de erro só na tarefa do engine.
Generalizando os seis WOULD_MISS: nenhum é propriedade de um arquivo. São assimetrias
entre dois arquivos, uma discordância entre produtor e consumidores, um deadline
comparado com um custo incorrido em outro lugar, e um teste cujo nome discorda do
comportamento.

**O custo da medição.** Os três `destrói dado` de A e seus dois achados menores mais
precisos exigiram rodar alguma coisa. A01, A02 e A03 foram reproduzidos em APFS com
renames reais. A fronteira de A13 foi medida contra rmp-serde 1.3.1. O limiar de A09
foi corrigido em uma ordem de grandeza depois de cronometrar SHA-256 a ~2,2 GB/s. A
etapa de refutação de A ainda **matou** um achado empiricamente (D2-06, a impressão
digital de 32 bytes, desmentida com um harness snow 0.10 mostrando que a mensagem 1
tem 48 bytes). O plano kimi tem exatamente uma instrução de medir em vez de estimar,
e ela aponta para `FILE_CHUNK_LEN`, a constante **segura**, e não para
`MANIFEST_PAGE_LEN` logo abaixo dela no mesmo arquivo carregando o mesmo comentário
não verificado. Os outros verbos de verificação do plano são confirmar, traçar,
grepar, conferir por amostragem. Confirmar é barato e enviesa a favor da hipótese
como escrita; medir é o que a corrige. E não há etapa adversarial: quem escreveu a
hipótese é quem a avalia.

**O custo do pré-julgamento.** As hipóteses nomeadas são a força real de kimi: A03,
A08 e A10 aparecem literalmente, em dois casos melhor especificadas que os próprios
writeups de A. Mas várias carregam o veredito no enunciado, e veredito em plano é
âncora. Task 6 H5 chama o ramo de rebuild completo de "acceptable ... that's correct".
Task 5 H3 oferece "Decide: accepted (day granularity documented) or finding" para o
que A graduou como destrói dado. O bullet de TOCTOU da Task 4 já vem escrito com
"likely accepted-risk". Task 5 H6 pré-responde "documented". O enquadramento por
dimensão de risco tem o viés oposto: pergunta o que pode acontecer com o dado do
usuário e deixa a resposta decidir a severidade.

**O custo em qualidade de teste, que é a divergência mais afiada.** A Task 8 de kimi
verifica lacunas "grepando nomes de teste", sobre uma lista de candidatos derivada
das próprias hipóteses anteriores. Isso é estruturalmente incapaz de produzir A16,
cujo conteúdo inteiro é que **um nome de teste mente**:
`unshared_and_traversal_paths_are_refused` grepa como cobertura, e A só achou o buraco
deletando `server.rs:174-176` e provando que cada uma das quatro sondas ainda falha em
outro guard. A mesma técnica produziu a observação de A03 de que o teste de conflito
afirma uma contagem que uma sobrescrita silenciosa preserva, e o aviso de A13 de que
`assert!(chunks >= 2)` conta chunks de arquivo e não páginas de manifest. A seção "por
que os testes não pegam" de A é um argumento de mutação; a de kimi é um inventário de
nomes. Os achados 22 e 23 acima são exatamente dessa família e foram produzidos aqui
pela técnica de A aplicada às dimensões de kimi.

**Crédito reverso honesto.** Lendo a seção "Não coberto" do próprio `REPORT.md`, o
plano kimi cobre boa parte dela, em vários casos como **verificação planejada** onde
A tem uma ponta solta admitida. Crédito cheio em três: a auditoria das dependências
novas, que A declara fora de escopo e que a Task 9 de kimi é literalmente; o estado
chaveado pelo device name, que A lista como "ninguém avaliou o impacto" e que virou o
achado 19 aqui; e a falta de estado de erro de bind na UI, que kimi cobre duas vezes
(Task 7 H3 e H4) com a regra do projeto citada. Crédito parcial em mais quatro:
a pairing key em texto plano (a Task 3 mira logs, não repouso, mas o grep diff-wide
passa pela persistência), o `lastSyncClean` morto (a Task 10 institucionaliza a
classe de doc drift, mas não detecção de código morto), o comportamento real com duas
máquinas (a Task 8 chega mais perto que ninguém com o teste de convergência A para B,
que virou o achado 23), e o disjunto morto de `sync.service.ts:110`. Sem crédito em
dois: hardlinks, e durabilidade, porque `fsync` não aparece em lugar nenhum do plano.
"Performance com vault grande" também fica descoberto, que é a mesma ausência que
produz o WOULD_MISS em A09.

**Resumo seco.** Executado com diligência, o plano kimi produz um documento mais
largo, mais auditável e com formato mais adequado a uma decisão de merge do que A:
responderia perguntas sobre dependências, CI, superfície de bind e conformidade com o
spec que A nunca faz, e nomeia três achados de A literalmente. O que ele não
produziria de forma confiável é o **veredito**. O bloqueador declarado de A é A01, e
A01 é um MIGHT_FIND que depende de um agente carregar uma nota sobre NFD e caixa
arquivada em `server.rs` até o lookup byte-exato de `HashMap` em `engine.rs`, sendo
que a linha 3 acima mostra que a hipótese, como escrita, teria terminado em refutação
limpa **do lado errado do fio**. A02, o outro caminho de destruição silenciosa, é um
WOULD_MISS. Organize por arquivo e você descobre se todo arquivo foi inspecionado;
organize por risco e você descobre o que a feature pode fazer com o dado do usuário.
Só a segunda pergunta responde "posso ligar isto?".

## Notas

1. **clippy.** `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
   sai com 101 e 42 erros (33 sem `--all-targets`). **Nenhum** está em `src/sync/` ou
   `src/commands/sync.rs`: todos vivem em `vault/index.rs`, `search/fts_logic.rs`,
   `vault/parsing.rs`, `commands/vault.rs`, `commands/semantic.rs`, `semantic/chunker.rs`
   e mais cinco arquivos que este PR não toca. O código de sync está limpo; o gate do
   repositório está vermelho de antes. Pelas regras do próprio plano kimi ("any failure
   here becomes a finding") isso vira achado, mas é pré-existente e fora do escopo do PR,
   então não recebeu número.

2. **`docs/SYNC.md:101` (raio de alcance da pairing key).** A frase de tranquilização
   ("it protects the very vault it sits in, so it adds no new at-rest exposure") está
   errada na direção que importa: a chave é simétrica, então a cópia que vive no vault
   de A é a que abre as pastas expostas de **B**. Um vazamento do vault de A concede
   leitura do vault de B, o que é exposição nova. Sobreviveu à refutação, mas foi
   julgado o mais fino do lote e A já nomeia o assunto em `REPORT.md:863-865` como
   premissa nunca auditada, então fica como nota e não como issue.

3. **Ajuste ao achado 07 de A.** A conclusão de A07 é que o gatilho exige um peer
   autenticado ("ele já tem a pairing key, logo o 'ataque' nega o listener para o
   próprio dono"), e A06 afirma "não é DoS". A metade **pré-handshake** não precisa de
   chave nenhuma: qualquer processo na rede abre o TCP, fica calado e segura o accept
   loop serial por `HANDSHAKE_TIMEOUT` (10 s, `server.rs:19`, `:91`), repetidamente. Isso
   não é achado novo, é a mesma linha e a mesma correção de A07, mas o modelo de ameaça
   do writeup de A merece a correção.

4. **Não adjudicado nesta rodada:** o TOCTOU de canonicalize-depois-lê em `serve_file`
   (a própria kimi já o classifica como risco aceito, pedindo só documentação) e a
   revisão de higiene de commit e JSDoc da Task 10. O diff foi conferido e não carrega
   mudanças alheias ao sync.
