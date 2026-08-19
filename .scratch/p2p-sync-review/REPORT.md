# Revisão crítica do P2P sync (PR #143, `feature/p2p-sync` @ 1c988a18)

Origem: 6 agentes de busca, 31 achados, 6 agentes de refutação, 26 sobreviventes,
17 depois do dedup. Os três achados mais graves foram reverificados por leitura de
código e reproduzidos empiricamente nesta máquina (APFS, case-insensitive).

## Veredito

**Dá pra mergear desligado? Sim.** O default é `exposeEnabled: false`,
`subscriptions: []`, e o listener só sobe dentro de `if (settingsStore.sync.exposeEnabled)`
(`app-lifecycle.service.ts:291`): com a feature off nenhum byte é escrito no vault e
nenhum socket é aberto.

**Dá pra ligar? Não.** O achado 01 sozinho destrói notas em silêncio e repete a
destruição a cada sync, no filesystem padrão do macOS, sem cópia de conflito e sem erro.

## Achados confirmados

| # | Severidade | Arquivo:linha | Claim |
|---|---|---|---|
| 01 | destrói dado | `src-tauri/src/sync/engine.rs:205` | Lookup local é byte-exato mas o rename é resolvido pelo FS: nome que difere só por caixa ou normalização vira "não existe local" e é sobrescrito |
| 02 | destrói dado | `src-tauri/src/sync/engine.rs:317` | `write_atomic` atravessa diretório symlinkado e sobrescreve arquivo fora do vault |
| 03 | destrói dado | `src-tauri/src/sync/engine.rs:242` | Nome da cópia de conflito não é único por versão remota: segunda divergência no mesmo dia sobrescreve a cópia que o usuário já editou |
| 04 | destrói dado | `src-tauri/src/sync/engine.rs:187` | Snapshot de hashes locais é tirado uma vez por pasta; escrita local que cai na janela é sobrescrita sem cópia de conflito |
| 05 | vaza dado | `src/lib/core/app-lifecycle/app-lifecycle.service.ts:291` | Init superado não tem guard de `initVersion`: listener sobe para um vault já fechado e serve as pastas dele na LAN |
| 06 | trava | `src-tauri/src/sync/engine.rs:63` | Handshake Noise do cliente sem timeout: peer que aceita TCP e cala trava `sync_now` e o botão para sempre |
| 07 | trava | `src-tauri/src/sync/protocol.rs:82` | Nenhum timeout de escrita no servidor e accept loop serial: peer que para de ler trava o listener inteiro |
| 08 | trava | `src-tauri/src/sync/server.rs:196` | Arquivo lido inteiro em memória sem limite no servidor; no cliente o teto de 1 GiB é erro fatal que aborta o resto do sync |
| 09 | correção | `src-tauri/src/sync/engine.rs:21` | Timeout fixo de 30 s medido contra hashing síncrono da pasta inteira: acima do limiar a pasta nunca sincroniza |
| 10 | correção | `src-tauri/src/sync/engine.rs:209` | Download revertido pelo autosave do editor, mas `synced` já foi gravado com o hash remoto: vira `KeepLocal` para sempre |
| 11 | correção | `src-tauri/src/sync/manifest.rs:18` | `build_manifest` anuncia arquivos com `:` no nome que `validate_rel_path` recusa: nunca sincronizam e viram ruído de "path malicioso" |
| 12 | correção | `src-tauri/src/sync/manifest.rs:36` | Um arquivo ilegível aborta o manifest da pasta inteira, e o erro devolve o path absoluto do vault ao peer |
| 13 | menor | `src-tauri/src/sync/protocol.rs:23` | `ManifestPage` paginado por contagem e não por bytes: paths longos estouram `MAX_PLAINTEXT_LEN` |
| 14 | menor | `src/lib/core/app-lifecycle/watcher-handler.service.ts:71` | Pull grande cai no rebuild completo, que não atualiza FTS5 nem semantic |
| 15 | menor | `src/lib/core/editor/editor.service.ts:383` | Recheck pós-await não olha `isTabDirty`: teclas digitadas durante o read são descartadas |
| 16 | test-gap | `src-tauri/src/sync/server.rs:174` | O único guard que barra componente dot no serve path passa em todos os testes se for deletado |
| 17 | menor | `src-tauri/src/sync/protocol.rs:81` | Doc afirma "indistinguível de dados aleatórios"; tamanhos e fronteiras de frame são visíveis |

---

## 01. Colisão de caixa e normalização sobrescreve a nota local

Severidade: destrói dado. `src-tauri/src/sync/engine.rs:205`.

### Cenário

Volume APFS default (case-insensitive). A máquina A tem `Notes/Recipe.md` com as
notas do usuário. O peer B expõe `Notes` e tem o seu próprio `Notes/recipe.md`.
O usuário clica Sync now em A. O manifest remoto traz `Notes/recipe.md`; o mapa
`local` foi montado com a caixa do disco (`Notes/Recipe.md`), então
`local.get("Notes/recipe.md")` devolve `None`. `decide(None, ..)` retorna
`Download` sem sequer ler `state`, e o `rename` do `write_atomic` é resolvido pelo
kernel para o mesmo inode. A nota do usuário passa a ter o conteúdo do peer,
mantendo o nome original. O resumo reporta `downloaded: 1, conflicts: 0, errors: []`.

Pior: `peer_state` fica chaveado por `Notes/recipe.md` enquanto `build_manifest`
continua devolvendo `Notes/Recipe.md`, então **toda sync futura repete o
Download** e destrói de novo o que o usuário escreveu desde então.

O mesmo vale para NFD contra NFC (`café.md` criado no macOS antigo contra o nome
digitado no peer).

### Evidência

- `manifest.rs:74-79` monta `rel_path` a partir dos bytes que `read_dir` devolveu.
- `engine.rs:187-189` coleta isso em `HashMap<String, String>`.
- `engine.rs:205` `local.get(&meta.rel_path)`, comparação byte a byte.
- `decision.rs:23-25` `let Some(local) = local else { return Action::Download };` sem consultar `state`.
- `engine.rs:207` chama `download_file(.., &meta.rel_path, &meta.rel_path)`.
- `engine.rs:317-326` `write_atomic` faz `vault_root.join(rel_path)` e `std::fs::rename`, sem `canonicalize` e sem checar existência.
- `engine.rs:209-215` grava `synced = seen_remote = hash remoto`.

Reproduzido aqui: `Notes/Recipe.md` com "LOCAL USER CONTENT", `mv -f tmp Notes/recipe.md`,
resultado `ls` mostra um único `Recipe.md` cujo conteúdo é "remote".

### Por que os testes não pegam

Todo nome de arquivo da suíte é caixa única e sem colisão (`a.md`, `n.md`, `remote.md`,
`big.bin`; `sync_e2e_test.rs:44-132`, `sync_server_test.rs:17-22`). Nenhum teste cria
dois paths que difiram só por caixa, e nenhuma asserção de `Download` no e2e é contra
um path que o vault cliente já tinha. Os unit tests de `decision.rs:76-114` usam hashes
opacos e não modelam identidade de path.

### Menor correção

Antes de decidir, resolver identidade no FS em vez de na String. O mínimo:
em `engine.rs`, entre a linha 205 e o `decide`, quando `local_hash` for `None`,
checar se o destino já existe e, se existir, recusar em vez de baixar.

```rust
	let local_hash = local.get(&meta.rel_path).map(String::as_str);
	// O HashMap compara bytes; o FS pode ser case/normalization insensitive.
	if local_hash.is_none() && vault_root.join(&meta.rel_path).exists() {
		summary.errors.push(format!("name collision, skipped: {}", meta.rel_path));
		continue;
	}
```

Isso troca destruição silenciosa por um erro visível. A correção completa (mapear
`local` por nome canônico) é maior e exige decisão de desenho.

---

## 02. Escrita atravessa diretório symlinkado e sai do vault

Severidade: destrói dado, probabilidade baixa. `src-tauri/src/sync/engine.rs:317`.

### Cenário

O usuário tem `Vault/Notes/Archive` como symlink para `~/Documents`, e assina `Notes`.
`build_manifest` pula symlinks (`manifest.rs:60-62`, o `file_type` vem do `read_dir`,
isto é lstat, então o diretório inteiro some do mapa), logo `local` não tem chave para
`Notes/Archive/taxes.md`. `validate_rel_path` passa (não há `..`, não há dot component),
o prefixo `Notes/` bate, `decide(None, ..)` devolve `Download`, e `write_atomic` faz
`create_dir_all` (que segue o link e retorna Ok) mais `rename`, que resolve todos os
componentes menos o último. `~/Documents/taxes.md` é substituído pelo conteúdo do peer.

Reproduzido aqui: com `v/Notes/sub -> out/`, o `mv -f v/Notes/sub/.sync-tmp-y v/Notes/sub/a.md`
deixou `out/a.md` com "remote content" no lugar de "PRECIOUS".

Escopo real: só onde o próprio usuário criou um symlink dentro de uma pasta assinada,
e destruir conteúdo preexistente ainda exige que o peer tenha um arquivo no mesmo
nome relativo. A variante fraca (symlink de arquivo) **não** perde conteúdo: o rename
substitui o link, o alvo externo fica intacto (verificado pelo refutador).

### Evidência

`manifest.rs:60-62` -> `engine.rs:187-189` (sem chave) -> `engine.rs:205` `None` ->
`decision.rs:23-25` `Download` -> `engine.rs:305` -> `engine.rs:320-323`
`create_dir_all` + `std::fs::rename`. O listener defende exatamente esse caso na
leitura (`server.rs:185-195`, duplo `canonicalize` mais `starts_with(&folder_root)`);
o lado que escreve não canonicaliza nada.

### Por que os testes não pegam

Todos os testes de symlink são do lado da leitura: `manifest.rs:129-152` prova que o
manifest omite symlink, `sync_server_test.rs:177-240` prova que o listener recusa
servir um. Nenhum teste cria symlink dentro do vault **cliente**, e
`malicious_manifest_path_is_rejected_and_session_survives` (`sync_e2e_test.rs:199`) só
cobre escape visível na String.

### Menor correção

Espelhar no `write_atomic` o guard que o `serve_file` já tem: canonicalizar o
diretório de destino e exigir que ele esteja contido no vault.

```rust
	std::fs::create_dir_all(dir).map_err(|e| format!("create dir failed: {e}"))?;
	let root = vault_root.canonicalize().map_err(|e| format!("canonicalize vault failed: {e}"))?;
	let real_dir = dir.canonicalize().map_err(|e| format!("canonicalize dest failed: {e}"))?;
	if !real_dir.starts_with(&root) {
		return Err(format!("destination escapes vault: {rel_path}"));
	}
```

---

## 03. Cópia de conflito sobrescreve a cópia anterior no mesmo dia

Severidade: destrói dado. `src-tauri/src/sync/engine.rs:242`.

### Cenário

09:00, peer `Studio`. `Notes/plan.md` diverge dos dois lados, o sync escreve
`Notes/plan (conflict from Studio 2026-08-19).md` com a versão remota R1 e grava
`seen_remote = R1`. O usuário faz exatamente o que a cópia existe para permitir:
abre, mescla os parágrafos dele, salva. 15:00 o peer edita `plan.md` de novo para R2.
`decide(L, R2, {synced: base, seen: R1})` cai em `Conflict { write_copy: true }`
porque `seen != Some(remote)`, e `conflict_copy_rel_path` devolve **a mesma String**
(mesmo peer, mesmo `today`, calculado uma vez por sessão em `engine.rs:117`).
`write_atomic` renomeia R2 por cima da mescla do usuário. O resumo diz `conflicts: 1`,
indistinguível da primeira cópia.

Duas correções ao enunciado original, vindas da refutação: `docs/SYNC.md:89` promete
"never overwrites an existing conflict copy **for the same remote hash**", então o
código honra a promessa como escrita, isto é uma lacuna do desenho e não uma violação
de contrato documentado; e a mescla salva pelo editor fica no banco de file-history
(retenção default 7 dias), então é recuperável se o usuário notar.

### Evidência

`decision.rs:36-37` (`write_copy: seen != Some(remote)`) -> `decision.rs:43-62`
(nome derivado só de rel_path, peer sanitizado e data) -> `engine.rs:117` (`today`
único por sessão) -> `engine.rs:241-243` (passa `copy_rel` como destino, sem
`dest.exists()` e sem `local.contains_key(&copy_rel)`, embora `local` já contenha
essa chave) -> `engine.rs:305` -> `engine.rs:317-326` (rename incondicional).

Reproduzido aqui: rename por cima de `n (conflict from Studio 2026-08-19).md`
substituiu "MERGED BY USER" por "R2".

### Por que os testes não pegam

`both_changed_keeps_local_and_writes_one_conflict_copy` (`sync_e2e_test.rs:86-117`) é
o único teste de cópia de conflito e o segundo run repete a **mesma** divergência, o
que exercita só o ramo `write_copy: false`. Pior, a asserção é uma contagem
(`copies2 == 1`), e uma sobrescrita silenciosa mantém a contagem em 1.
`decision.rs:105-110` cobre só o caso de hash idêntico; `conflict_copy_naming`
(`decision.rs:118-136`) checa formato de String.

### Menor correção

Sufixar o nome com um discriminante da versão remota. Uma linha em `engine.rs:242`:

```rust
	let copy_rel = conflict_copy_rel_path(&meta.rel_path, peer_name, &format!("{today} {}", &meta.sha256[..8]));
```

Alternativa equivalente: em `download_file`, recusar escrever se `dest_rel != src_rel`
e o destino já existir.

---

## 04. Snapshot de hashes locais fica velho durante a sessão

Severidade: destrói dado, probabilidade baixa. `src-tauri/src/sync/engine.rs:187`.

### Cenário

`local` é montado uma vez por pasta, antes de qualquer round trip. Cada arquivo
baixado custa um `GetFile` completo. Se uma escrita local cair nessa janela, o
`decide` julga pelo hash congelado: com `synced == local_antigo` ele devolve
`Download` em vez de `Conflict`, e `write_atomic` sobrescreve sem cópia.

O caso afiado é um escritor que não passa pelo editor: `toggle_task_status_inner`
(`commands/vault.rs:662-682`) faz `read_to_string` mais `write_atomic` direto no disco,
sem buffer e sem snapshot de file-history. Marcar uma tarefa no painel Tasks durante um
sync grande apaga o toggle sem rastro no resumo. Escritas vindas do editor em geral se
curam sozinhas (o buffer sujo é reescrito pelo autosave e o file-history guarda a versão
anterior).

Janela real: segundos, não minutos, porque só arquivo que precisa de download custa
round trip.

### Evidência

`engine.rs:187-197` (snapshot único) -> `engine.rs:199-206` (loop lê só o snapshot) ->
`engine.rs:291-311` (um round trip por arquivo) -> `decision.rs:29-32`
(`if synced == Some(local) { return Action::Download }`) -> `engine.rs:317-326`
(`rename` sem reler nem rehashear `dest`).

### Por que os testes não pegam

Toda mutação do vault cliente no e2e acontece estritamente **antes** do `run_sync`
(`sync_e2e_test.rs:78`, `:94`, `:129`). Nenhum teste escreve no vault cliente com a
sessão em voo, e `write_atomic` não tem unit test nenhum.

### Menor correção

Rehashear o destino imediatamente antes de sobrescrever. Como o `write_atomic` não
conhece o hash esperado, o menor recorte é passar o hash do snapshot para o
`download_file` e checar lá, logo antes de `write_atomic`:

```rust
	// dest_rel == src_rel: é sobrescrita, não cópia de conflito.
	if dest_rel == src_rel {
		if let Ok(now) = std::fs::read(vault_root.join(dest_rel)) {
			if Some(hash_bytes(&now).as_str()) != expected_local {
				return Err(DownloadError::Recoverable("local changed during sync".into()));
			}
		}
	}
```

---

## 05. Listener sobrevive ao vault que ele serve

Severidade: vaza dado (janela limitada). `src/lib/core/app-lifecycle/app-lifecycle.service.ts:291`.

### Cenário

O trecho final de `initializeVault` depois do `await ensureTemplatesFolder()` (linha 249)
não tem `if (initVersion !== version) return;` (o último guard está na linha 237). Se o
usuário trocar de vault durante esse await, o init superado ainda executa a linha 293 e
chama `startSyncListener(vaultPath)` com o **caminho antigo**, enquanto
`sync.service.ts:31-40` lê o settingsStore **atual**. O teardown de entrada em
`app-lifecycle.service.ts:122-129` só roda quando `unsubscribeFileChange` é truthy, o que
não acontece nessa janela, então `stopSyncListener` (único call site, linha 406) nunca roda.

Variante durável, a que importa: o rabo do init de B roda antes das settings de C
chegarem, sobe um listener com o path, as pastas e a pairing key **de B**, e C (com
`exposeEnabled` false) nunca para ele. Um vault que o usuário fechou continua servindo
as pastas dele na LAN até troca de vault ou restart.

A variante mais alarmante (path de B com pastas e chave de C) precisa de um
entrelaçamento mais apertado e dura só até o init de C chegar na linha 293.

### Evidência

`app-lifecycle.service.ts:290-296` (fire and forget, sem guard; compare com os blocos
guardados em 310 e 315) -> `sync.service.ts:31-40` (lê o store no momento da chamada,
`vaultPath` é parâmetro) -> `commands/sync.rs:49-59` (guard do mutex é solto antes do
`start_server`) -> `server.rs:113` (o `vault_path` fica preso no `ServerConfig` pela vida
da task) -> `server.rs:120-125`, `:129` (ListShares e GetManifest respondem a partir dele).

Vale notar que o mesmo rabo sem guard também re-registra o hook de search-index (281),
o hook de auto-move (283-288) e `startWatching(vaultPath)` (355) para o vault superado.

### Por que os testes não pegam

`app-lifecycle.service.test.ts` não referencia sync em lugar nenhum (grep por 'sync'
devolve só `timeSync`/`timeAsync`). `sync.service.test.ts:50-84` testa `startListener`
isolado com `invoke` mockado. Os testes Rust montam `ServerConfig` na mão e nunca passam
pela camada de comando.

### Menor correção

Uma linha, no padrão que o resto do arquivo já usa:

```typescript
	if (initVersion !== version) return;
	if (settingsStore.sync.exposeEnabled) {
```

---

## 06. Handshake do cliente sem timeout trava o botão Sync now

Severidade: trava a feature. `src-tauri/src/sync/engine.rs:63`.

### Cenário

`engine.rs:59-62` envolve **só** o `TcpStream::connect` em `CONNECT_TIMEOUT`.
`engine.rs:63` chama `handshake_initiator` sem nenhum deadline: escreve a mensagem 1
(52 bytes, cabe no buffer do socket) e bloqueia em `read_frame` -> `protocol.rs:91`
`read_exact`, sem SO_KEEPALIVE e sem timeout. O `sync_now` nunca resolve, o `finally`
de `sync.service.ts:123-125` nunca roda, e `SyncSection.svelte:233` deixa o botão morto
até restart ou troca de vault (`syncStore.reset()` no teardown limpa).

Quem dispara na prática: um processo qualquer ocupando a porta persistida do peer, ou
uma conexão parada no backlog do Kokobrain do peer enquanto ele serve a sessão única
dele, ou um peer cujo `serve_connection` está travado por 07. Um serviço que manda
banner (SSH, MySQL) **não** trava: o cliente lê ASCII como u32 e estoura `MAX_FRAME_LEN`.

Não é DoS: nada cai, nada se perde, vaza uma task tokio e um socket.

### Evidência

`engine.rs:20-21` (constantes existem), `engine.rs:52-54` (`recv` aplica `RECV_TIMEOUT`,
usado em 71, 89, 110, 163, 294), `engine.rs:63` (a única leitura desprotegida),
`noise.rs:110-112`, `protocol.rs:89-97`. O responder acerta o mesmo passo em
`server.rs:91-93` com `HANDSHAKE_TIMEOUT`.

### Por que os testes não pegam

`unreachable_peer_fails_fast_with_clear_error` (`sync_e2e_test.rs:289-302`) usa
127.0.0.1:1, que dá RST no `connect`, exatamente o caso que `CONNECT_TIMEOUT` cobre.
`stop_unblocks_while_a_session_is_stalled` (`sync_server_test.rs:161-172`) trava o
**servidor**. `noise.rs:157-188` usa `tokio::io::duplex` com `tokio::join!`, onde um
lado parado é impossível.

### Menor correção

Uma linha, reusando a constante que o servidor já tem:

```rust
	let mut chan = timeout(HANDSHAKE_TIMEOUT, handshake_initiator(stream, &psk))
		.await
		.map_err(|_| "handshake timed out".to_string())??;
```

---

## 07. Servidor sem timeout de escrita, com accept loop serial

Severidade: trava a feature, probabilidade baixa. `src-tauri/src/sync/protocol.rs:82`.

### Cenário

O peer para de ler no meio de um anexo grande (laptop dormiu, ou peer pareado
malicioso segurando janela zero). `serve_file` está no loop de chunks
(`server.rs:201-203`), `chan.send` chega em `protocol.rs:82-84` `write_all` mais `flush`
sem timeout, o buffer de envio enche e o future estaciona. Como `serve_connection` é
awaitado **inline** dentro do accept loop (`server.rs:74-81`), o listener não aceita
mais nada, enquanto `commands/sync.rs:75-79` continua reportando `listening: true`.

O caso benigno (peer dormindo) se cura no retransmit timeout do kernel, na ordem de
minutos. Só um peer pareado mantendo janela zero de propósito trava indefinidamente,
e ele já tem a pairing key, logo o "ataque" nega o listener para o próprio dono.

### Evidência

`protocol.rs:77-86` (write_all, write_all, flush, nenhum envolvido em timeout),
`noise.rs:47-55`, sends do servidor em `server.rs:126,130,136,142,145,202,204`,
`server.rs:19-21` (só HANDSHAKE_TIMEOUT e RECV_TIMEOUT existem), `server.rs:74-81`
(sessão inline no accept loop).

### Por que os testes não pegam

Todo cliente de teste drena o canal até `FileEnd` (`sync_server_test.rs:84-98`, `227-236`)
e os peers falsos do e2e são o lado servidor. Nenhum teste para de ler no meio, e
`stop_closes_the_listener` (`sync_server_test.rs:151-159`) é a única asserção de
concorrência da suíte.

### Menor correção

Envolver o send do servidor no mesmo padrão do recv, ou colocar o deadline dentro do
`write_frame`:

```rust
	timeout(SEND_TIMEOUT, chan.send(&msg)).await.map_err(|_| "send timed out".to_string())??;
```

Um `tokio::spawn` por conexão no accept loop resolve o efeito colateral (uma sessão
travada não bloquear as outras), mas é decisão de desenho, não correção mínima.

---

## 08. Arquivo inteiro em memória e teto de 1 GiB que aborta o resto do sync

Severidade: trava/robustez. `src-tauri/src/sync/server.rs:196`.

### Cenário

Uma pasta exposta com um anexo grande. `hash_file` (`manifest.rs:35-38`) já faz
`std::fs::read` do arquivo inteiro durante o **manifest**, antes de qualquer `GetFile`;
`server.rs:196` lê de novo para servir. O cliente acumula tudo em um `Vec`
(`engine.rs:292-299`). Passando de `MAX_FILE_LEN` (1 GiB), `engine.rs:296` devolve
`DownloadError::Fatal`, `sync_folder` retorna false (`engine.rs:221-224`) e `run_sync`
dá `break` no loop de pastas (`engine.rs:123-127`): **todo arquivo ordenado depois dele
e toda pasta assinada seguinte nunca sincronizam**, de forma determinística
(`manifest.rs:82` ordena), em toda tentativa futura. O usuário só vê
"Sync finished with 1 issue(s)".

Isso contradiz `docs/SYNC.md:120` ("Recorded in the summary; sync continues with
remaining files").

A parte que **não** se sustenta é o crash: uma alocação de 3 GB num desktop 64 bits
quase sempre passa (commit preguiçoso). O que se vê é pico de RSS e pressão de memória,
não abort determinístico.

### Evidência

`server.rs:164-204` (nenhum check de tamanho), `manifest.rs:79` (grava `size` e nunca
filtra), `engine.rs:23`, `:292-299`, `:296-297`, `:221-224`, `:123-127`.

### Por que os testes não pegam

O maior arquivo da suíte tem 100_000 bytes (`sync_server_test.rs:20`), escolhido para
exercitar framing multi-chunk. Nenhum teste chega perto de `MAX_FILE_LEN` e nenhum
afirma que um erro Fatal deixa pastas seguintes sem sincronizar
(`corrupted_transfer_writes_nothing` usa a rota Recoverable).

### Menor correção

Não deixar um arquivo grande matar a sessão. Em `engine.rs:199-206`, pular antes de
pedir:

```rust
	if meta.size as usize > MAX_FILE_LEN {
		summary.errors.push(format!("{}: file too large, skipped", meta.rel_path));
		continue;
	}
```

Streaming direto para o arquivo temporário nos dois lados resolve o consumo de memória,
mas é reescrita, não correção mínima.

---

## 09. Timeout de 30 s contra hashing síncrono da pasta

Severidade: correção (borda). `src-tauri/src/sync/engine.rs:21`.

### Cenário

`server.rs:133` roda `build_manifest` inteiro antes de mandar a primeira página, e
`build_manifest` lê e SHA-256 cada arquivo sequencialmente. O cliente espera em
`engine.rs:163` com `RECV_TIMEOUT` de 30 s. Passando disso, o recv estoura, o erro vira
Fatal, `run_sync` dá `break` e a sessão acaba com `downloaded = 0`, idêntica em toda
retentativa. O espelho também morde: no caminho de volta o cliente hasheia a cópia dele
(`engine.rs:187-197`) enquanto o servidor espera em `server.rs:117`, que devolve `Ok(())`
e derruba o socket depois de 30 s ociosos.

Os limiares citados pelo finder estavam uma ordem de grandeza baixos: SHA-256 roda a
~2,2 GB/s nesta máquina, então "alguns GB" são 2 a 5 s. Os gatilhos reais são vault em
mount de rede ou NAS, disco externo mecânico, ou algo como 40 GB numa pasta exposta.

Nota secundária: `build_manifest` roda no worker tokio sem `spawn_blocking`, então
bloqueia uma thread do runtime por toda a duração.

### Evidência

`engine.rs:20-21`, `:52-54`, `:163`; `server.rs:21`, `:117`, `:133`;
`manifest.rs:35-38`, `:43-84`; rota de abort `engine.rs:179-182` -> `:123-127`.

### Por que os testes não pegam

Todo teste de integração usa dois ou três arquivos de poucos bytes, então os dois
manifests montam em microssegundos. Nenhum teste injeta peer lento nem afirma nada sobre
tempo decorrido.

### Menor correção

Tirar o hashing do worker e afrouxar o deadline do manifest:

```rust
	let files = tokio::task::spawn_blocking(move || build_manifest(&root, &folder)).await;
```

mais um `RECV_TIMEOUT` maior (ou dedicado) para a espera do primeiro `ManifestPage`.

---

## 10. Download revertido pelo autosave, com `synced` já envenenado

Severidade: correção. `src-tauri/src/sync/engine.rs:209`.

### Cenário

O engine baixa C1 por cima de C0 e grava `synced = seen_remote = C1` (`engine.rs:209-215`).
O watcher chama `reloadExternallyChangedTabs`, que pula a aba porque ela está suja
(`editor.service.ts:366`). Dois segundos depois o autosave escreve o buffer (C0 mais o
que o usuário digitou) por cima de C1. A partir daí `decide(C2, C1, {synced: C1})` cai em
`KeepLocal` (`decision.rs:33-35`), `engine.rs:236-239` só sobe `seen_remote`, conta como
`skipped` e **nunca** escreve cópia de conflito.

A refutação estreitou a consequência: nada único é destruído (A ficou com C2, B ainda tem
C1) e o envenenamento não é permanente, porque a próxima edição de B em `plan.md` produz
R3 diferente de `synced`, o que cai em `Conflict { write_copy: true }` e traz o conteúdo
acumulado como cópia. "Nunca mais chega em A" só vale se o peer nunca mais tocar o arquivo.

A refutação também **alargou** a causa raiz: existe a ordenação irmã, em que o autosave
cai antes da escrita do engine, o disco C2 é sobrescrito por C1, a aba agora limpa é
recarregada para C1 e o parágrafo do próprio usuário some da tela (recuperável pelo
file-history, que fez snapshot no save).

### Evidência

`engine.rs:187-197` -> `decision.rs:30-32` -> `engine.rs:207`, `:209-215`, `:130` ->
`app-lifecycle.service.ts:344-354` -> `editor.service.ts:363-368` (pula aba suja, sem
retry) -> `editor.service.ts:154-165`, `:132-149` (autosave sobrescreve) ->
`decision.rs:33-35` mais `engine.rs:236-239`.

### Por que os testes não pegam

O e2e Rust dirige o lado local com `std::fs::write` e não tem editor no circuito.
`sync.service.test.ts:106-126` mocka `invoke` e só olha campos do store.
`editor.service.test.ts:1131` prova que o buffer sujo sobrevive, mas nunca afirma o que
o autosave seguinte faz com o arquivo no disco. Nenhum teste atravessa
escrita Rust -> watcher -> autosave.

### Menor correção

Mesma família do achado 04: não gravar `synced` para um arquivo cuja aba está suja.
Como o Rust não conhece o estado do editor, o recorte menor é do lado TS: em
`reloadExternallyChangedTabs`, quando a aba está suja e o disco divergiu, marcar a aba
para não sobrescrever o disco no próximo save (ou emitir um toast de conflito), em vez
de deixar o autosave reverter em silêncio.

---

## 11. Arquivo com `:` no nome é anunciado e depois recusado para sempre

Severidade: correção. `src-tauri/src/sync/manifest.rs:18`.

### Cenário

`build_manifest` chama `validate_rel_path` só no argumento `folder` (`manifest.rs:44`);
cada entrada percorrida sai sem validação. Do lado do cliente, `engine.rs:201` roda
`validate_rel_path`, que falha em `rel.contains(':')`, e `engine.rs:202` empurra
"rejected remote path: ...", a **mesma** String que uma traversal real produz. O arquivo
nunca sincroniza, para sempre, e cada run reporta um ataque que não existe;
`sync.service.ts:110-113` transforma isso em um warning recorrente.

O gatilho é mais direto do que o cenário original supunha: o app não sanitiza nome de
arquivo em lugar nenhum (`fs.service.ts:210-220` interpola o nome digitado direto no
path), então uma nota renomeada para "Meeting: Q3 review" já basta. APFS aceita `:`
via POSIX (verificado).

### Evidência

`manifest.rs:18`, `:44`, `:53-79`; `engine.rs:200-204`; `server.rs:174-176`;
`sync.service.ts:110-113`.

### Por que os testes não pegam

Nenhum teste usa `:` em nome de arquivo. `manifest.rs:96-101` afirma que
`validate_rel_path` **rejeita** "C:/x", o que codifica a suposição de que `:` só aparece
em drive do Windows.

### Menor correção

Filtrar na origem, para não anunciar o que nunca será aceito:

```rust
	if validate_rel_path(&rel_path).is_err() {
		continue;
	}
	files.push(FileMeta { rel_path, size: meta.len(), sha256: hash_file(&path)? });
```

A pergunta de desenho que sobra (permitir `:` em vault que não é Windows) fica para o dono.

---

## 12. Um arquivo ilegível aborta o manifest da pasta, e o erro leva o path absoluto

Severidade: correção. `src-tauri/src/sync/manifest.rs:36`.

### Cenário

Qualquer arquivo sob a pasta exposta que não possa ser lido (modo 000, volume
desmontado, ou simplesmente removido entre o `read_dir` e o `hash_file`) faz `hash_file`
devolver `read {path absoluto} failed: {e}`. `manifest.rs:79` propaga com `?` e
`server.rs:145` manda verbatim como `Msg::Error`. Dois efeitos: a pasta inteira falha em
silêncio naquela sessão, e o peer recebe o caminho absoluto do vault (logo, o usuário do
SO).

A refutação derrubou a parte de vazamento como severa: quem recebe já completou o
handshake XXpsk3, isto é, tem a pairing key, que `SYNC.md:101` já assume conceder leitura
de toda pasta exposta, e qualquer nome no erro está dentro de uma pasta que o usuário
escolheu compartilhar. O que sobra de novo é o path absoluto. A substância real é
disponibilidade.

### Evidência

`manifest.rs:36`, `:47`, `:52`, `:79`; `server.rs:133-145`. Compare com a negação
genérica deliberada em `server.rs:170-198`.

### Por que os testes não pegam

`unshared_and_traversal_paths_are_refused` (`sync_server_test.rs:106-121`) casa em
`Msg::Error { .. }` e nunca inspeciona `message`. `build_manifest_missing_folder_errors`
só afirma `is_err()`. Nenhum teste torna um arquivo dentro de pasta exposta ilegível.

### Menor correção

Não deixar um arquivo derrubar a pasta, em `manifest.rs:79`:

```rust
	let Ok(sha256) = hash_file(&path) else { continue };
	files.push(FileMeta { rel_path, size: meta.len(), sha256 });
```

E trocar `path.display()` por `rel_path` nas mensagens de erro que saem pelo fio.

---

## 13. `ManifestPage` paginado por contagem, não por bytes

Severidade: menor. `src-tauri/src/sync/protocol.rs:23`.

### Cenário

`MANIFEST_PAGE_LEN = 200` com um comentário afirmando que isso limita bytes. Não limita.
Medido com rmp-serde 1.3.1: 200 entradas com rel_path de 234 bytes dão 65430 bytes
(passa); com 235 bytes dão 65630 (estoura `MAX_PLAINTEXT_LEN` = 65519). No estouro,
`noise.rs:48-51` devolve erro, o `?` de `server.rs:142` sai do `serve_connection`,
`server.rs:76-79` só loga e o stream cai; o cliente pega UnexpectedEof e dá `break` no
loop de pastas.

Pré-condição extrema: 200 arquivos **consecutivos** na ordenação, na mesma pasta exposta,
com path médio acima de 234 bytes. Em ASCII isso é título de 200 caracteres em cada um
dos 200; em CJK (3 bytes por caractere) cai para ~78 caracteres de path, a única variante
que eu chamaria de plausível.

### Evidência

`protocol.rs:16`, `:22-23`; `server.rs:135-143`, `:76-79`; `noise.rs:48-51`;
`engine.rs:163`, `:179-182`, `:123-127`.

### Por que os testes não pegam

O maior vault de teste tem 4 arquivos com paths de ~16 bytes, então `files.chunks(200)`
sempre dá uma página. O `assert!(chunks >= 2)` em `sync_server_test.rs:97` conta chunks de
**arquivo**, não páginas de manifest, e é fácil confundir com cobertura disto.

### Menor correção

Paginar por bytes acumulados, ou (mais preguiçoso e suficiente) baixar
`MANIFEST_PAGE_LEN` para 100 e limitar o comprimento de `rel_path` no
`validate_rel_path`.

---

## 14. Pull grande deixa FTS5 e semantic desatualizados

Severidade: menor, pré-existente. `src/lib/core/app-lifecycle/watcher-handler.service.ts:71`.

### Cenário

Qualquer batch do watcher com mais de 10 arquivos .md falha o teste de
`watcher-handler.service.ts:58` e cai no ramo completo (`:71-86`), que chama
rebuildIndex, buildPropertyIndex, buildFrontmatterIconIndex e scanFilesForCalendar, e
nada mais. Os invokes de `update_search_index_file` e `update_semantic_file` só existem
no ramo incremental (`:139`, `:146`). Resultado: backlinks, tags, grafo e árvore mostram
as notas novas, mas a busca textual não as encontra.

Duas ressalvas da refutação: isto **não** é introduzido por este PR
(`watcher-handler.service.ts` não está no diff) e o mesmo acontece hoje com qualquer
mudança externa em massa; e se cura sozinho no próximo open do vault
(`buildSearchIndex` em `app-lifecycle.service.ts:276`).

### Evidência

`watcher-handler.service.ts:16`, `:58`, `:71-86` contra `:139`, `:146`;
`commands/vault.rs:1058-1097` (não toca FTS); `search.service.ts:287-303`, `:309-312`.

### Por que os testes não pegam

O teste do ramo completo (`watcher-handler.service.test.ts:292`) afirma que os quatro
builders foram chamados e não afirma nada sobre `update_search_index_file`, então a
omissão é invisível.

### Menor correção

Uma linha no ramo completo: chamar também `buildSearchIndex` (e a contraparte semantic),
já que a rota já é a "cara".

---

## 15. Recheck pós-await não olha `isTabDirty`

Severidade: menor. `src/lib/core/editor/editor.service.ts:383`.

### Cenário

A aba está limpa quando o batch começa, passa pelo filtro de `:363-368` e o
`readTextFile` é disparado. Durante esse round trip o usuário digita. O recheck de
`:383-384` só compara `diskContent === tab.savedContent`, que é falso porque o sync
mudou o arquivo, então `:387` roda `syncExternalContentToEditor(..., true, 'none')` e
`updateTabContentByPath` sobrescreve `content` **e** `savedContent`. O que foi digitado
some, a aba fica limpa e nada agenda um save.

Tamanho da perda: exatamente as teclas digitadas dentro de um round trip de IPC, ou seja,
tipicamente zero a duas.

### Evidência

`editor.service.ts:363-368`, `:371-373`, `:382-384`, `:387`;
`editor.store.svelte.ts:130-136`; entrada em `app-lifecycle.service.ts:347`.

### Por que os testes não pegam

`editor.service.test.ts:1131` marca a aba suja **antes** da chamada, então exercita o
filtro pré-await e afirma `expect(readTextFile).not.toHaveBeenCalled()`. Nenhum teste
muta estado de aba durante o read.

### Menor correção

Adicionar a condição que o próprio comentário da linha 382 promete:

```typescript
	if (!tab || isTabDirty(tab) || diskContent === tab.savedContent) continue;
```

---

## 16. O guard de componente dot no serve path não tem teste

Severidade: test-gap. `src-tauri/src/sync/server.rs:174`.

### Cenário

Deletar `server.rs:174-176` e a suíte inteira continua verde. Prova, sonda por sonda de
`sync_server_test.rs:109-114`: `GetManifest{"Secret"}` morre em `server.rs:129`
(`exposed_folders.contains`); `GetFile{"secret.md"}` e `GetFile{"/etc/passwd"}` morrem em
`server.rs:161` (`matched_exposed_folder` exige o prefixo `Notes/`);
`GetFile{"Notes/../secret.md"}` morre no `canonicalize` de `server.rs:193`. Nenhuma das
quatro precisa da regra de dot component.

Sem o guard, um peer pareado que peça `GetFile{"Projects/repo/.git/config"}` casa a pasta
exposta, canonicaliza dentro do `folder_root` e recebe os bytes. O raio é menor do que
parece: a raiz do vault nunca pode ser exposta, então `.kokobrain` e `.obsidian` não são
alcançáveis, só dot entries **dentro** de uma subpasta exposta, pedidos por quem já tem
a pairing key e já pode ler aquela pasta.

### Evidência

`server.rs:174-176`, regra em `manifest.rs:21-24`; guards independentes em
`server.rs:129`, `:161`, `:185-195`; serve em `:196-204`. O gêmeo do lado cliente
(`engine.rs:201`) tem o mesmo buraco: `sync_e2e_test.rs:227` só manda "Notes/../evil.md".

### Menor correção

Um teste, não uma mudança de produção. Criar `Notes/.env` no `spawn_test_server` e
afirmar que `GetFile{"Notes/.env"}` é recusado.

---

## 17. A doc promete mais do que o fio entrega

Severidade: menor, só documentação. `src-tauri/src/sync/protocol.rs:81`.

### Cenário

O prefixo de 4 bytes fica fora da criptografia (`protocol.rs:81-83`) e
`frame_len = plaintext_len + 16` exatamente (`noise.rs:52-54`), então um observador
passivo lê o tamanho exato de cada arquivo, o comprimento do path pedido, e a assinatura
fixa de abertura 0x30 / 0x60 / 0x40 das três mensagens do XXpsk3. Como
`MAX_FRAME_LEN = 65535`, os bytes 2 e 3 de todo prefixo são sempre 0x00.

Não existe correção de código em escopo: prefixo de tamanho fora do AEAD é inerente a
qualquer stream cifrado delimitado por tamanho (TLS, SSH e o próprio Noise Socket vazam o
mesmo), e só padding por frame removeria o canal. Nenhum conteúdo de nota é exposto.

### Menor correção

Corrigir a redação em três lugares: `docs/SYNC.md:3`, `docs/SYNC.md:96` e o doc comment
de `noise.rs:7`, trocando "indistinguível de dados aleatórios" por algo como "o conteúdo
é opaco, mas tamanhos e fronteiras de frame são visíveis".

---

## Refutados

Investigado e descartado, com o motivo:

- **D2-06, fingerprint do listener com 32 bytes arbitrários.** Refutado empiricamente
  com um harness snow 0.10: a mensagem 1 do XXpsk3 tem 48 bytes, não 32 (a regra de PSK
  faz o token `e` também chamar MixKey, então o payload vazio carrega tag AEAD de 16
  bytes). Payload arbitrário devolve "decrypt error" e o responder não responde. A
  varredura de um pacote por porta não existe.
- **D5-03, file-history não cobre a escrita do sync.** O fato é verdadeiro, mas
  `Action::Download` só é devolvido quando não existe arquivo local ou quando
  `local == synced`, isto é, os bytes destruídos são por construção uma cópia de uma
  versão que o **peer** escreveu e ainda tem. A extensão da pista ("mesmo quando o
  arquivo veio de ferramenta externa") é falsa: escrita externa faz `local != synced` e a
  decisão vira KeepLocal ou Conflict. É a linha 3 da tabela de desenho
  (`docs/SYNC.md:83`), não um defeito.
- **D5-06, listener corrompendo o `settings.json` do vault antigo.** Precisa de
  `listenPort` ainda 0 com `exposeEnabled` já true no disco, estado que o fluxo de
  ativação apaga sozinho (o sucesso persiste a porta na mesma chamada, a falha reverte o
  toggle antes do debounce de 500 ms). A janela de corrida é um round trip de IPC contendo
  só um bind e um spawn.
- **D6-03, `corrupted_transfer_writes_nothing` não protege arquivo existente.** O teste
  cobre o guard que nomeia por completo: a checagem de hash em `engine.rs:302` retorna
  antes de `write_atomic`, e essa rota não lê o destino, então um arquivo preexistente
  não muda nenhum ramo. A atomicidade temp mais rename não é alcançável por falha de
  transferência nenhuma neste desenho. O cenário é um refactor hipotético.
- **D6-05, deleção local ressuscitada no próximo sync.** É o desenho acordado:
  `docs/SYNC.md:13` diz "Deletions: never propagated. Sync is additive", e a linha 1 da
  tabela é incondicional. Sem tombstones (fora de escopo por `SYNC.md:136`), um sync
  aditivo ressuscita o que o peer ainda tem.

Também checado e considerado **correto**, portanto não reportado: o uso do XXpsk3 (índice
do PSK, chave de sessão descartável, replay impossível), ausência de reuso de nonce (snow
só incrementa depois de decrypt bem sucedido), o limite de frame verificado **antes** do
`vec![0u8; len]`, a decodificação rmp-serde sobre entrada hostil (Msg não é recursivo,
sem preallocation por campo de tamanho), a impossibilidade de downgrade do
`protocol_version` (Hello roda dentro do transporte autenticado), o caminho de leitura do
`serve_file` (duplo canonicalize com containment derrota `..`, path absoluto, symlink
plantado e jogos de caixa), o `load_state` com arquivo corrompido (state ausente só
empurra a decisão para Conflict, o lado seguro), a ordem entre escrita e gravação de
estado (todo `synced` é gravado dentro do braço `Ok`), o mutex de `SyncServerState` (sem
await com o guard segurado, sem panic alcançável), e a ausência de loop watcher contra
sync (os temporários são dot-prefixados e o filtro de dot fica no Rust).

## Não coberto

Exclusões do próprio plano:

- Comportamento real com duas máquinas numa LAN. Isto é revisão de código, não teste de
  campo.
- Performance com vault grande, além do que o achado 09 tocou.
- Auditoria das dependências novas (`snow`, `getrandom`, `serde_bytes`) além de como o
  código as usa.
- Qualquer correção. Nenhum agente editou nada.

Lacunas que apareceram durante o run e ninguém fechou:

- **Pairing key em texto plano no `settings.json`.** Foi tratada como premissa aceita do
  desenho (`SYNC.md:101`), nunca auditada como decisão.
- **Estado chaveado pelo device name que o peer controla** (`engine.rs:107`,
  `decision.rs:43`): um peer que se renomeia zera todo o estado e dispara uma passada
  inteira de cópias de conflito. Ninguém avaliou o impacto.
- **Hardlinks.** Gap residual real do lado da escrita, mas exige acesso local prévio ao
  filesystem, não um peer hostil.
- **Durabilidade.** `write_atomic` não faz fsync nem antes nem depois do rename, então
  queda de energia pode deixar destino corrompido.
- **`lastSyncClean` é código morto** (definido no store, nenhum componente lê) e o doc
  comment dele afirma considerar erros de pasta enquanto só lê `errors`.
- **Falha de bind do listener não tem estado de erro na UI.** `sync.store.svelte.ts` não
  tem campo de erro; a falha é um toast transitório que `SyncSection.svelte:38-40`
  engole, apesar de `SYNC.md:116-121` prometer "error state shown in the settings section".
- **O disjunto `|| summary.skippedFolders.length > 0`** (`sync.service.ts:110`) nunca é
  exercitado: apagá-lo mantém a suíte verde enquanto um usuário cuja assinatura sumiu
  recebe um toast verde de "Sync complete".
