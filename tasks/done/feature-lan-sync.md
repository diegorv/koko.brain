# Feature: Built-in LAN Sync (v1 P2P)

Sincronização local entre dois Macs na mesma rede via P2P (mDNS/Bonjour), com canal criptografado usando **Noise Protocol (Noise_XXpsk3_25519_AESGCM_SHA256)**. A passphrase compartilhada é a raiz de confiança: sem ela é matematicamente impossível interceptar ou decifrar o tráfego, mesmo com acesso físico à rede. Sem servidor externo. Conflitos preservam ambos os arquivos.

## Decisões de Design

- **Modelo:** P2P via LAN, sem servidor central
- **Descoberta:** mDNS (`_noted._tcp`) — usa `mdns-sd` crate
- **Transporte:** TCP puro com Noise Protocol em cima (sem TLS, sem certificados, sem CA)
- **Protocolo de segurança:** `Noise_XXpsk3_25519_AESGCM_SHA256` via crate `snow` — PSK mode formalmente analisado no Noise Protocol whitepaper, padrão para autenticação por segredo compartilhado
  - Cada peer gera um par de chaves estáticas X25519 na primeira execução (via `snow::Builder::generate_keypair()` — sem dependência extra)
  - O `master_key` (derivado da passphrase via Argon2id) é a raiz; dele são derivadas duas chaves via HKDF-SHA256 (key separation): `psk_key` (info=`"noted-sync-psk"`) para o handshake Noise e `hmac_key` (info=`"noted-sync-hmac"`) para assinar manifests — cada chave usada para um único propósito
  - `builder.psk(3, psk_key)` — autenticação por passphrase via chave derivada
  - PSK autentica mutuamente ambos os peers dentro do handshake Noise — sem HMAC manual de chaves estáticas
  - `chave_mestre = Argon2id(passphrase, salt=SHA256(canonical_vault_uuid), m=64MB, t=3, p=1)` — memory-hard, resistente a GPU/ASIC bruteforce
  - MITM não conhece a passphrase → PSK inválido → handshake falha criptograficamente
  - Forward secrecy: chaves efêmeras X25519 descartadas após cada sessão
  - **Sem necessidade de TOFU, sem fingerprint manual** — a passphrase é a verificação
- **Autenticação de peer:** derivada da mesma passphrase — peer que não conhece a passphrase não consegue completar o handshake Noise
- **Sessão Noise persistente:** uma única conexão TCP + handshake PSK por ciclo de sync completo — manifest + todos os arquivos trafegam na mesma sessão; handshake não é refeito por arquivo
- **Passphrase:** 15 caracteres (letras, números, símbolos) exibidos em 3 grupos de 5 — `[A#k9@] - [mZ2!x] - [Bq7&P]`
- **Conflitos:** preservar ambos — arquivo perdedor renomeado para `note (conflicted YYYY-MM-DD HH-MM).md`
- **Detecção de conflitos via three-way diff:** comparação three-way (local vs remote vs baseline) em vez de depender de `mtime` do sistema — elimina falsos conflitos por clock skew entre Macs
  - Após cada sync bem-sucedido, o manifest reconciliado é salvo como `baseline_manifest` em `sync-state.json` (por peer)
  - Arquivo mudou no local vs baseline AND mudou no remote vs baseline → conflito real
  - Arquivo mudou apenas de um lado → pull ou push (sem ambiguidade)
  - Primeiro sync (sem baseline): tudo é "novo" — mesmo hash = skip, hashes diferentes = conflito, arquivo só de um lado = pull/push
  - `mtime` preservado como metadado (ex: qual versão é mais recente no conflito), mas **não é usado para detecção de conflitos**
- **Propagação de deletes via baseline:** arquivo presente no baseline mas ausente do manifest atual = deletado desde último sync — sem tombstones, sem delete_log
  - Delete local (arquivo no baseline + no remote, mas não no local) → enviar `file_delete` para o peer
  - Delete remoto (arquivo no baseline + no local, mas não no remote) → deletar localmente
  - Delete-modify conflict (um lado deletou, outro modificou) → manter a versão modificada, log warning — nunca perder conteúdo
  - Ambos deletaram → no-op
  - Delete de arquivo excluído por `excludedPaths` local → ignorar (o receptor decide o que aceitar)
- **Escopo do sync:** todos os arquivos `.md` do vault + `settings.json` + arquivos selecionados de `.noted/`, com as seguintes exclusões hardcoded:
  - `noted.db`, `noted.db-wal`, `noted.db-shm` — banco SQLite (regenerado localmente)
  - `.noted/trash/` — lixeira local, não sincronizada (v1)
  - `.noted/sync-identity` — par de chaves estáticas X25519, único por Mac
  - `.noted/sync-local.json` — configuração local de sync (excludedPaths), nunca sincronizada
  - `.noted/sync-state.json` — last_sync por peer + canonical_vault_uuid, local por Mac (sincronizá-lo causaria sobrescrita de timestamps entre peers e falsos conflitos)
- **Excluded folders/files (configurável pelo usuário):** lista de globs armazenada em `.noted/sync-local.json` — arquivo local por Mac, **nunca sincronizado**. Pastas ou arquivos que o usuário escolhe não sincronizar. Ex: `["private/", "drafts/", "journal/2024-*.md"]`. Exclusões hardcoded sempre se aplicam, independente desta lista. UI permite adicionar/remover pastas do vault via digitação manual.
  - **Exclusões aplicadas no remetente:** `build_manifest()` filtra `excludedPaths` — pastas excluídas nem aparecem no manifest enviado ao peer. O peer remoto nunca sabe que essas pastas existem.
  - **Exclusões aplicadas no receptor:** `sync_with_peer()` filtra o manifest remoto com `excludedPaths` local — arquivos que o receptor exclui não são pulled nem aceitos via `file_push`, mesmo que o peer os envie.
  - **Cada Mac tem suas próprias exclusões** — independentes. MacBook 1 pode excluir `private/` e MacBook 2 pode excluir `journal/`. Resultado: `private/` nunca sai do Mac 1, `journal/` nunca sai do Mac 2.
- **`settings.json` sincroniza como arquivo inteiro** — preferências de aparência, editor, etc. são compartilhadas. Sem merge por campo: última escrita vence (ver Limitações). Apenas `excludedPaths` é mantido fora do settings (em `sync-local.json`) por ser configuração local de infra.
- **Notificação de conflito de settings:** quando `settings.json` entra em conflito (modificado nos dois Macs), o arquivo de conflito é criado normalmente, mas adicionalmente o engine emite `sync:settings-conflict` — o frontend exibe toast: "Settings were updated on another device. Your local changes were saved as a conflict file." Sem merge automático (v2).
- **Troca de passphrase:** command `change_sync_passphrase` para rotação — para engine → re-deriva chaves com nova passphrase → reinicia engine. Ambos os peers precisam atualizar independentemente (handshake falha até que ambos tenham a nova passphrase). Útil para revogar acesso de ex-membro.
- **Recovery de sync:** se Keychain é resetado ou corrompido, o procedimento é: deletar `.noted/sync-identity` + `.noted/sync-state.json` → re-inserir passphrase em Settings → re-habilitar sync. Primeiro sync com peer re-estabelece `canonical_vault_uuid`. Botão "Reset Sync" na UI automatiza o cleanup.
- **Passphrase armazenada no Keychain** (macOS Keychain) — account: `"noted-sync-pass:{SHA256(canonical_vault_uuid)[0..8] hex}"` — nunca em disco
- **Chave de cifragem da sync-identity no Keychain** — account separada: `"noted-sync-id:{SHA256(canonical_vault_uuid)[0..8] hex}"` — 32 bytes aleatórios gerados uma vez; usados para cifrar a priv key estática com AES-256-GCM
- **Identidade do vault:** UUID v4 gerado na primeira abertura, salvo em `.noted/vault-id` — independente do path e nome da pasta. **Nunca sobrescrito via sync** — receptor usa `canonical_vault_uuid` de `sync-state.json`.
- **`canonical_vault_uuid`:** campo em `.noted/sync-state.json` — UUID acordado entre os peers para derivar o `master_key`. No primeiro sync com peer novo, o iniciador compartilha seu UUID via canal Noise autenticado; o receptor salva como `canonical_vault_uuid`. Ambos os Macs derivam `master_key` com o mesmo UUID → salt Argon2id consistente. **Imutável após primeiro sync:** uma vez salvo em `sync-state.json`, novas tentativas de alterá-lo via `vault_uuid_exchange` são rejeitadas — previne ataque de ex-membro que force UUID diferente para causar denial-of-sync. Reset manual requer deletar `sync-state.json`.
- **`last_sync` persistido:** timestamp do último sync por peer salvo em `.noted/sync-state.json` — evita falsos conflitos após restart. **`sync-state.json` é local por Mac (nunca sincronizado)** — cada Mac tem seus próprios timestamps; sincronizá-lo causaria sobrescrita de `last_sync` entre peers e falsos conflitos.
- **Manifest assinado:** após gerar o manifest, calcula `HMAC-SHA256(hmac_key, canonical_json(manifest))` e envia junto com `manifest_response`. O campo `generated_at` (timestamp unix) é incluído no input do HMAC — previne replay de manifests antigos. Receptor verifica HMAC + rejeita manifests com `generated_at` mais de 15 minutos no passado (tolerância ampla para clock drift moderado entre Macs; NTP recomendado) — rejeita manifest inteiro se inválido.
- **Body size limit:** mensagens de arquivo limitadas a 50MB no nível do protocolo — previne DoS
- **Path traversal prevention (anti-RCE):** todo path recebido via rede é validado com `canonicalize()` antes de qualquer leitura/escrita; resultado deve estar dentro do `vault_root`; symlinks também são rejeitados via `symlink_metadata()`
- **Porta padrão:** `39782` (configurável)
- **Intervalo:** configurável (padrão 5 min) + sync imediato ao detectar mudança local via watcher existente (sem criar segundo watcher)
- **Debounce no engine (Rust):** `SyncEngine::trigger_sync()` tem debounce interno de 2s — previne cascata de triggers durante sync ativo (ex: arquivos recebidos pelo sync disparam o watcher, que dispara novo sync). Debounce complementar de 2s no frontend (`sync.service.ts`) para filtrar eventos do watcher antes de chamar `invoke('trigger_sync')`.
- **Zeroizing:** todo material criptográfico (`master_key`, `static_priv`, chaves efêmeras) usa `Zeroizing<[u8; 32]>` — bytes são zerados na memória ao sair de escopo (previne cold boot attack, core dump leak, swap file leak). Crate `zeroize` já presente no `Cargo.toml`.
- **Chave privada estática protegida:** `.noted/sync-identity` armazena apenas a chave pública em plaintext; a chave privada X25519 é cifrada com AES-256-GCM usando a chave da account `noted-sync-id:*` do Keychain — processo local com acesso ao filesystem não consegue extrair a chave sem Touch ID
- **Anti-DoS no servidor:** conexões TCP limitadas a 10 simultâneas (`tokio::sync::Semaphore`), rate limiting de 3 handshakes/min por IP, timeout de 5s no handshake, idle timeout de 60s por sessão; shutdown graceful via `CancellationToken`
- **mDNS privacy:** vault UUID não é exposto diretamente no mDNS — TXT record usa `vault={SHA256(vault_uuid)[0..16]}` (hash truncado de 8 bytes hex); suficiente para matching, não revela o UUID real; UUID completo trocado dentro do canal Noise autenticado
- **Integridade de arquivos recebidos:** após receber `file_response` ou `file_push`, o receptor recalcula `SHA256(content)` e compara com o hash do manifest; mismatch → rejeita arquivo + emite `sync:error`
- **Limite de conflitos:** máximo 10 arquivos de conflito por arquivo original; ao atingir o limite, o mais antigo é removido (rotação) — previne disk fill por peer malicioso
- **TOCTOU-safe file ops:** arquivos recebidos via sync são abertos com `O_NOFOLLOW` flag (via `OpenOptions` + `custom_flags` no macOS) e verificados com `fstat()` após abertura — elimina race condition entre `canonicalize()` e a operação de I/O
- **Lock de sync por peer:** `SyncEngine` mantém `Arc<Mutex<HashSet<String>>>` de `peers_syncing` — evita dois syncs concorrentes com o mesmo peer (ex: sync periódico + trigger manual simultâneos)
- **Passphrase gerada no Rust:** botão [Generate] no frontend chama `invoke('generate_sync_passphrase')` — geração usa `rand::thread_rng()` (CSPRNG do OS), consistente com o padrão existente de geração de chaves AES em `security/crypto.rs`
- **macOS only:** implementação usa `libc::O_NOFOLLOW` e macOS Keychain via `security-framework`

---

## Arquitetura

```
Mac A (Noted)                          Mac B (Noted)
├── SyncEngine                    ←→   ├── SyncEngine
│   ├── SyncServer (TCP + Noise)        │   ├── SyncServer (TCP + Noise)
│   │   ├── MSG manifest_request        │   │   ├── MSG manifest_request
│   │   ├── MSG file_request            │   │   ├── MSG file_request
│   │   ├── MSG file_push              │   │   ├── MSG file_push
│   │   └── MSG file_delete            │   │   └── MSG file_delete
│   ├── SyncDiscovery (mDNS)           │   ├── SyncDiscovery (mDNS)
│   └── SyncClient (TCP + Noise)       │   └── SyncClient (TCP + Noise)
```

### Protocolo de Sync

1. Peer anuncia `_noted._tcp` via mDNS com: `ip:porta`, `vault_hash` (SHA-256 truncado do vault UUID — não expõe UUID real)
2. Peers com mesmo `vault_hash` se reconhecem como candidatos do mesmo vault — independente do path local
3. Ao descobrir peer via mDNS: `discovery` emite candidato para `engine`. O `engine` tenta handshake `Noise_XXpsk3` com PSK = `psk_key` (derivado do master_key via HKDF) — se falhar (passphrase errada), conexão recusada silenciosamente; se sucesso, troca vault UUID real dentro do canal autenticado para confirmar match e estabelecer `canonical_vault_uuid`. Evento `sync:peer-discovered` emitido **somente após** verificação do UUID. Separação de responsabilidades: discovery (mDNS) apenas descobre, engine (Noise) autentica.
4. A cada intervalo (ou ao detectar mudança via file watcher existente, com debounce de 2s no engine):
   - Peer A abre **uma sessão Noise** com B (handshake único por ciclo)
   - Dentro da sessão: envia `manifest_request`, recebe manifest assinado, verifica HMAC
   - A faz **three-way diff** (local vs remote vs baseline do último sync com B)
   - Arquivo mudou só no local → A envia `file_push` para B (na mesma sessão)
   - Arquivo mudou só no remote → A envia `file_request`, B responde com conteúdo (na mesma sessão)
   - Arquivo mudou nos dois (vs baseline) → conflito → ambos preservados
   - Arquivo deletado no local (no baseline mas não no local) → A envia `file_delete` para B
   - Arquivo deletado no remote (no baseline mas não no remote) → A deleta localmente
   - Delete-modify conflict (um deletou, outro modificou) → manter versão modificada
   - Após sync bem-sucedido: salva manifest reconciliado como novo baseline
   - Sessão Noise fechada ao término do ciclo
5. Lock por peer previne sync bidirecional simultâneo
6. Processo idempotente

### Handshake Noise_XXpsk3 (por que é seguro contra MITM)

```
Passphrase "A#k9@mZ2!xBq7&P" + canonical_vault_uuid
  → Argon2id(passphrase, salt=SHA256(canonical_vault_uuid), m=64MB, t=3, p=1) → master_key [32 bytes]
  → HKDF-SHA256(master_key, info="noted-sync-psk")  → psk_key  [32 bytes]  (Noise handshake)
  → HKDF-SHA256(master_key, info="noted-sync-hmac") → hmac_key [32 bytes]  (manifest signing)

Cada peer gera uma vez:
  (static_pub, static_priv) = snow::Builder::generate_keypair()
  Salvo em .noted/sync-identity (pub em plaintext, priv cifrada com AES-256-GCM via noted-sync-id:* Keychain account)

Handshake Noise_XXpsk3:
  → A envia ephemeral_pub_A
  ← B envia ephemeral_pub_B + static_pub_B cifrado
  → A envia static_pub_A cifrado + PSK(psk_key) aplicado no slot 3
  ← B verifica PSK → confirma que A conhece a passphrase
     B responde com autenticação PSK
  → A verifica PSK → confirma que B conhece a passphrase

Canal estabelecido: AES-256-GCM com chaves efêmeras descartadas (forward secrecy)

Troca de UUID dentro do canal autenticado:
  → A envia { vault_uuid: canonical_vault_uuid_A }
  ← B envia { vault_uuid: canonical_vault_uuid_B }
  → Primeiro sync: se divergem, o iniciador (A) é a fonte canônica
     Receptor salva canonical_vault_uuid_A em sync-state.json
  → Syncs subsequentes: canonical_vault_uuid é imutável
     Se peer tentar forçar UUID diferente → conexão recusada + sync:error

MITM não conhece a passphrase:
  → PSK inválido → handshake falha antes de qualquer dado ser trocado
  → mesmo capturando o tráfego completo: sem chaves efêmeras, não decifra nada
```

### Formato da Passphrase

- **15 caracteres** — letras, números e símbolos
- **Exibição:** 3 grupos de 5 separados por hífen: `[A#k9@] - [mZ2!x] - [Bq7&P]`
- Cada grupo = 1 `<input maxlength="5">` (3 inputs no total) — robusto para paste, password managers e acessibilidade
  - Focus avança automaticamente ao preencher 5 chars
  - Focus volta ao grupo anterior ao apagar (backspace em campo vazio)
  - Paste em qualquer campo distribui os 15 chars nos 3 grupos automaticamente
- Geração automática via Rust CSPRNG (`invoke('generate_sync_passphrase')`) — nunca no frontend
- Validação: mínimo 15 chars preenchidos antes de habilitar o sync

### Protocolo de Mensagens (sobre o canal Noise)

Após o handshake, o canal é um stream TCP bidirecional cifrado. Mensagens são frames simples:

```
[4 bytes: tipo_msg][4 bytes: tamanho_payload][payload]

Tipos:
  0x01  manifest_request   (sem payload)
  0x02  manifest_response  { files: [{path, sha256, mtime}], hmac: [u8; 32] }
  0x03  file_request       { path: String }
  0x04  file_response      { path: String, content: Vec<u8>, mtime: u64 }
  0x05  file_push          { path: String, content: Vec<u8>, mtime: u64 }
  0x06  file_push_ack      { path: String, ok: bool }
  0x07  vault_uuid_exchange { vault_uuid: String, protocol_version: u8 }
  0x08  file_delete        { path: String }
  0x09  file_delete_ack    { path: String, ok: bool }
  0xFF  error              { message: String }
```

### Eventos Tauri (Rust → Frontend)

```typescript
'sync:peer-discovered'  { peerId, name, ip, port }   // handshake + UUID verificados, peer autenticado
'sync:peer-lost'        { peerId }
'sync:started'          { peerId }
'sync:progress'         { peerId, filesTotal, filesDone }
'sync:completed'        { peerId, filesChanged, conflicts }
'sync:error'            { peerId, message }
'sync:conflict'         { originalPath, conflictedPath }
'sync:file-deleted'     { peerId, path }               // arquivo deletado localmente via sync
'sync:settings-conflict' { conflictedPath }             // settings.json em conflito → toast especial
```

> Não há `sync:peer-needs-approval` — a passphrase *é* a autenticação. Peer desconhecido que não sabe a passphrase simplesmente não consegue conectar.

---

## Tasks

### Fase 1 — Rust Backend

- [ ] Task 1: Adicionar dependências Rust para sync no `Cargo.toml`
  - `mdns-sd = "0.12"` — descoberta P2P via mDNS
  - `snow = "0.9"` — Noise Protocol (`Noise_XXpsk3_25519_AESGCM_SHA256`), PSK mode + keypair generation (substitui `x25519-dalek`)
  - `argon2 = "0.5"` — derivação de chave memory-hard (Argon2id) — resistente a GPU/ASIC bruteforce, substitui PBKDF2
  - `hkdf = "0.12"` — HKDF-SHA256 para key separation (derivar `psk_key` e `hmac_key` de `master_key`)
  - `hmac = "0.12"` — HMAC-SHA256 para assinar manifests
  - `subtle = "2"` — comparação de HMAC em tempo constante (anti timing-attack)
  - `globset = "0.4"` — matching de globs para `excludedPaths` (sem I/O, apenas pattern matching contra strings)
  - `tokio-util = { version = "0.7", features = ["sync"] }` — `CancellationToken` para shutdown graceful do servidor
  - `tracing = "0.1"` — logging estruturado para debug de sync P2P (prefixo `[sync]`)
  - Atualizar features do `tokio`: adicionar `"net"`, `"sync"`, `"time"` (atualmente só tem `"rt-multi-thread"`, `"fs"`, `"io-util"`)
  - **Nota:** `aes-gcm`, `sha2`, `rand`, `base64`, `uuid`, `zeroize`, `reqwest`, `tokio` já presentes no Cargo.toml
  - **Removidos vs plano original:** `x25519-dalek` (snow gera keypairs internamente), `pbkdf2` (substituído por argon2), `glob` (substituído por globset)

- [ ] Task 2: Criar `src-tauri/src/sync/mod.rs` — declaração do módulo sync
  - Declarar submódulos: `crypto`, `manifest`, `server`, `discovery`, `client`, `engine`, `conflict`, `noise_transport`
  - Exportar tipos públicos: `SyncEngine`, `SyncStatus`, `SyncPeer`

- [ ] Task 3: Criar `src-tauri/src/sync/crypto.rs` — criptografia e identidade de sync + testes unitários
  - `PROTOCOL_VERSION: u8 = 1` — versão do protocolo de sync; incluída no `vault_uuid_exchange`; peers com versão incompatível recusam sync com mensagem clara
  - Struct `SyncKeys { psk_key: Zeroizing<[u8; 32]>, hmac_key: Zeroizing<[u8; 32]> }` — par de chaves derivadas, ambas zeradas ao sair de escopo
  - `derive_master_key(passphrase: &str, canonical_vault_uuid: &str) -> Zeroizing<[u8; 32]>`
    - Argon2id com `m=64MB, t=3, p=1`, `salt = SHA-256(canonical_vault_uuid)`
    - Memory-hard: resistente a GPU/ASIC bruteforce — ~92 bits de entropia da passphrase + custo computacional alto
    - Retorna `Zeroizing<[u8; 32]>` — chave zerada automaticamente ao sair de escopo
  - `derive_sync_keys(master_key: &[u8; 32]) -> SyncKeys`
    - `psk_key = HKDF-SHA256(master_key, salt=None, info="noted-sync-psk")` — usada exclusivamente como PSK no Noise handshake
    - `hmac_key = HKDF-SHA256(master_key, salt=None, info="noted-sync-hmac")` — usada exclusivamente para HMAC de manifests
    - Key separation: cada chave derivada tem propósito único — boa prática criptográfica (evita cross-protocol attacks)
  - `validate_passphrase(passphrase: &str) -> Result<(), String>`
    - Verifica mínimo 15 caracteres (qualquer UTF-8 válido)
  - `generate_passphrase() -> String`
    - Gera 15 caracteres aleatórios (letras maiúsculas/minúsculas + números + símbolos)
    - Usa `rand::thread_rng()` (CSPRNG do OS) — **nunca gerar no frontend**
    - Charset: `A-Za-z0-9!@#$%&*`
  - `sign_manifest(hmac_key: &[u8; 32], manifest_bytes: &[u8]) -> [u8; 32]`
    - HMAC-SHA256(hmac_key, manifest_bytes) — autentica integridade + origem do manifest
    - **`generated_at` incluído no `manifest_bytes`** — previne replay de manifests antigos
    - Usa `hmac_key` derivada via HKDF (não `master_key` diretamente)
  - `verify_manifest(hmac_key: &[u8; 32], manifest_bytes: &[u8], mac: &[u8; 32], generated_at: u64) -> bool`
    - Verifica com `subtle::ConstantTimeEq` — anti timing-attack
    - Rejeita manifests com `generated_at` mais de 15 minutos no passado (anti-replay, tolerância ampla para clock drift; NTP recomendado)
  - `read_or_create_vault_id(vault_path: &str) -> Result<String, String>`
    - Lê `.noted/vault-id`; se não existir, gera UUID v4 e salva
  - `hash_vault_id_for_mdns(vault_id: &str) -> String`
    - `SHA256(vault_id)[0..8]` formatado como hex (16 chars) — usado no mDNS TXT record
    - Não expõe o UUID real na rede; suficiente para matching entre peers
  - `get_canonical_vault_uuid(vault_path: &str) -> Result<String, String>`
    - Lê campo `canonical_vault_uuid` de `.noted/sync-state.json`
    - Fallback: lê `.noted/vault-id` se campo não existir ainda
    - Usado como input do Argon2id — garante que ambos os Macs usam o mesmo salt
  - `get_or_create_sync_id_key(canonical_vault_uuid: &str) -> Result<Zeroizing<[u8; 32]>, String>`
    - Keychain account: `"noted-sync-id:{SHA256(canonical_vault_uuid)[0..8] hex}"`
    - Se não existir: gera 32 bytes aleatórios com `rand::thread_rng()`, armazena no Keychain
    - Retorna `Zeroizing<[u8; 32]>` — chave zerada ao sair de escopo
  - `load_or_generate_static_keypair(vault_path: &str, canonical_vault_uuid: &str) -> Result<([u8; 32], Zeroizing<[u8; 32]>), String>`
    - Lê `.noted/sync-identity` — formato: `{ pub: base64, priv_encrypted: base64, iv: base64 }`
    - Chave pública armazenada em plaintext; **chave privada cifrada** com AES-256-GCM via `get_or_create_sync_id_key()` (account `noted-sync-id:*`)
    - Requer acesso ao Keychain (Touch ID) para decifrar a chave privada
    - Se não existir, gera via `snow::Builder::new("Noise_XXpsk3_25519_AESGCM_SHA256".parse().unwrap()).generate_keypair()`, cifra priv com chave de `noted-sync-id:*`, salva
    - Retorna `(pub_key, Zeroizing<priv_key>)` — chave privada zerada ao sair de escopo
  - `load_sync_state(vault_path: &str) -> Result<SyncState, String>`
    - Lê `.noted/sync-state.json` → `SyncState { last_sync: HashMap<String, u64>, canonical_vault_uuid: Option<String>, baseline_manifests: HashMap<String, Vec<FileEntry>> }`
    - `baseline_manifests`: manifest reconciliado do último sync bem-sucedido por peer — usado para three-way diff e detecção de deletes
  - `save_sync_state(vault_path: &str, state: &SyncState) -> Result<(), String>`
  - `load_sync_local_config(vault_path: &str) -> Result<SyncLocalConfig, String>`
    - Lê `.noted/sync-local.json` → `SyncLocalConfig { excluded_paths: Vec<String> }`
    - Retorna config vazia se arquivo não existir
  - `save_sync_local_config(vault_path: &str, config: &SyncLocalConfig) -> Result<(), String>`
  - **Testes unitários** (em `#[cfg(test)] mod tests` no mesmo arquivo):
    - `test_derive_master_key_deterministic()` — mesma passphrase + canonical_vault_uuid → mesma chave
    - `test_derive_master_key_different_inputs()` — passphrase diferente → chave diferente
    - `test_master_key_is_zeroizing()` — key é zerada após drop (verificar com ptr unsafe em test)
    - `test_generate_passphrase_length()` — sempre 15 caracteres
    - `test_generate_passphrase_charset()` — apenas chars do charset definido (A-Za-z0-9!@#$%&*)
    - `test_generate_passphrase_randomness()` — duas chamadas consecutivas geram passphrases diferentes
    - `test_sign_manifest_deterministic()` — mesma chave + mesmo manifest → mesmo HMAC
    - `test_verify_manifest_valid()` — HMAC correto → `true`
    - `test_verify_manifest_tampered()` — manifest alterado → HMAC inválido → `false`
    - `test_verify_manifest_replay_rejected()` — manifest com `generated_at` > 15 min no passado → `false`
    - `test_derive_sync_keys_deterministic()` — mesma master_key → mesmas psk_key e hmac_key
    - `test_derive_sync_keys_different_from_master()` — psk_key ≠ master_key, hmac_key ≠ master_key
    - `test_derive_sync_keys_psk_differs_from_hmac()` — psk_key ≠ hmac_key (key separation)
    - `test_hash_vault_id_for_mdns_length()` — sempre 16 chars hex
    - `test_hash_vault_id_for_mdns_deterministic()` — mesmo UUID → mesmo hash
    - `test_hash_vault_id_for_mdns_different_uuids()` — UUIDs diferentes → hashes diferentes

- [ ] Task 4: Criar `src-tauri/src/sync/noise_transport.rs` — canal Noise Protocol
  - `NoiseTransport` — wrapper em torno de uma `TcpStream` com handshake `Noise_XXpsk3` completo
  - `NoiseTransport::connect(addr: SocketAddr, psk_key: &Zeroizing<[u8; 32]>, static_priv: &Zeroizing<[u8; 32]>) -> Result<NoiseTransport, String>`
    - Abre `TcpStream` com timeout de conexão de 5 segundos
    - Inicia handshake `Noise_XXpsk3_25519_AESGCM_SHA256` como **iniciador** via `snow::Builder`
    - Configura PSK: `builder.psk(3, psk_key.as_ref())` — autenticação por passphrase via chave derivada (HKDF)
    - **Timeout de 5 segundos** para completar o handshake inteiro — previne slow-handshake DoS
    - Transita para modo transporte — chaves efêmeras geridas internamente pelo `snow` e descartadas
  - `NoiseTransport::accept(stream: TcpStream, psk_key: &Zeroizing<[u8; 32]>, static_priv: &Zeroizing<[u8; 32]>) -> Result<NoiseTransport, String>`
    - Mesmo fluxo, role **respondedor**, mesmo timeout de 5 segundos
  - `NoiseTransport::send(&mut self, msg_type: u8, payload: &[u8]) -> Result<(), String>`
    - Cifra com `snow` transport state + envia frame `[tipo][tamanho][payload]` pelo TCP
    - Atualiza `last_activity`
  - `NoiseTransport::recv(&mut self) -> Result<(u8, Vec<u8>), String>`
    - Lê frame do TCP + decifra com `snow`
    - Valida tamanho máximo do payload (50MB) — rejeita e fecha conexão se exceder
    - Atualiza `last_activity`
  - `NoiseTransport::last_activity(&self) -> Instant`
    - Retorna timestamp da última mensagem — usado pelo server para idle timeout
  - **Testes unitários** (em `#[cfg(test)] mod tests`):
    - `test_noise_handshake_valid_passphrase()` — dois peers com mesma passphrase → handshake `Noise_XXpsk3` OK
    - `test_noise_handshake_wrong_passphrase()` — passphrases diferentes → PSK inválido → handshake falha
    - `test_noise_handshake_timeout()` — peer que não responde dentro de 5s → `Err` (não bloqueia indefinidamente)
    - `test_message_size_limit()` — payload > 50MB → `Err` na recepção

- [ ] Task 5: Criar `src-tauri/src/sync/manifest.rs` — manifests e diff + testes unitários
  - Struct `FileEntry { path: String, sha256: String, mtime: u64 }`
  - Struct `SyncManifest { files: Vec<FileEntry>, generated_at: u64 }`
    - Campo `hmac: [u8; 32]` populado por `sign_manifest()` antes de enviar; verificado pelo receptor
    - `generated_at` incluído no HMAC input — anti-replay (receptor rejeita manifests > 15 min)
  - `is_excluded(path: &str, excluded_paths: &[String]) -> bool`
    - Verifica se um path relativo ao vault bate com algum glob da lista `excludedPaths`
    - Usa `globset::GlobSet` para matching (sem I/O, apenas pattern matching contra strings)
    - Ex: `"private/"` → exclui tudo dentro de `private/`, `"journal/2024-*.md"` → exclui arquivos específicos
    - Exclusões hardcoded verificadas separadamente — **sempre se aplicam**
  - `build_manifest(vault_path: &str, excluded_paths: &[String]) -> Result<SyncManifest, String>`
    - **Coleta 1:** `collect_markdown_paths()` (já existe em `utils/fs.rs`) para todos os `.md` do vault
    - **Coleta 2:** varredura manual de `.noted/` via `std::fs::read_dir()` com allowlist explícita:
      - Incluídos: `vault-id`, `settings.json`
      - Excluídos hardcoded (sempre): `noted.db`, `noted.db-wal`, `noted.db-shm`, `sync-identity`, `sync-local.json`, `sync-state.json`, `trash/`
    - Filtra com `is_excluded()` usando a lista `excluded_paths` do usuário (aplicada em ambas as coletas)
    - Computa SHA-256 de cada arquivo via `sha2` (já no Cargo.toml)
    - Lê mtime via `std::fs::metadata`
    - `tracing::debug!("[sync] manifest built: {} files", files.len())` — log de debug
  - Enum `FileDiff`:
    - `PullFromPeer(FileEntry)` — arquivo mudou no remote vs baseline, local inalterado
    - `PushToPeer(FileEntry)` — arquivo mudou no local vs baseline, remote inalterado
    - `Conflict { local: FileEntry, remote: FileEntry }` — ambos modificados vs baseline
    - `DeleteLocal(String)` — arquivo deletado no remote (no baseline + local, mas não no remote) → deletar localmente
    - `DeleteRemote(String)` — arquivo deletado no local (no baseline + remote, mas não no local) → enviar file_delete ao peer
    - `DeleteModifyConflict { path: String, modified: FileEntry, modifier: Side }` — um lado deletou, outro modificou → manter versão modificada
    - `Identical` — mesmo hash em local e remote
  - Enum `Side { Local, Remote }` — indica qual lado modificou no `DeleteModifyConflict`
  - `diff_manifests(local: &SyncManifest, remote: &SyncManifest, baseline: Option<&[FileEntry]>) -> Vec<(String, FileDiff)>`
    - **Com baseline (syncs subsequentes):** comparação three-way
      - Arquivo em local + remote + baseline: compara hashes vs baseline para detectar qual lado mudou
      - Arquivo em baseline mas não em local: local deletou → `DeleteRemote` (ou `DeleteModifyConflict` se remote mudou)
      - Arquivo em baseline mas não em remote: remote deletou → `DeleteLocal` (ou `DeleteModifyConflict` se local mudou)
      - Arquivo em local e/ou remote mas não em baseline: novo → compara hashes, mesmo = skip, diferente = conflito, só um lado = pull/push
    - **Sem baseline (primeiro sync):** comparação two-way
      - Mesmo hash → `Identical`
      - Hashes diferentes → `Conflict` (sem baseline, impossível saber qual é "mais novo")
      - Arquivo só no remote → `PullFromPeer`
      - Arquivo só no local → `PushToPeer`
    - `mtime` **não é usado para detecção de conflitos** — apenas como metadado (tiebreaker em conflitos: versão com mtime mais recente fica no path original)
  - **Testes unitários** (em `#[cfg(test)] mod tests`):
    - `test_manifest_diff_identical()` — mesmo hash → `Identical`
    - `test_manifest_diff_local_changed()` — local hash ≠ baseline, remote hash = baseline → `PushToPeer`
    - `test_manifest_diff_remote_changed()` — remote hash ≠ baseline, local hash = baseline → `PullFromPeer`
    - `test_manifest_diff_both_changed()` — ambos hashes ≠ baseline → `Conflict`
    - `test_manifest_diff_delete_local()` — arquivo no baseline + local, não no remote → `DeleteLocal`
    - `test_manifest_diff_delete_remote()` — arquivo no baseline + remote, não no local → `DeleteRemote`
    - `test_manifest_diff_delete_modify_conflict()` — um lado deletou, outro modificou → `DeleteModifyConflict` (versão modificada preservada)
    - `test_manifest_diff_both_deleted()` — arquivo no baseline, nem no local nem no remote → nenhum diff emitido
    - `test_manifest_diff_no_baseline_first_sync()` — sem baseline: hashes diferentes → `Conflict`; só num lado → pull/push
    - `test_manifest_diff_new_file_after_baseline()` — arquivo não no baseline, só no remote → `PullFromPeer`
    - `test_is_excluded_folder()` — `"private/"` exclui `"private/note.md"` e `"private/sub/note.md"`
    - `test_is_excluded_glob()` — `"journal/2024-*.md"` exclui `"journal/2024-01-15.md"`, não exclui `"journal/2025-01-15.md"`
    - `test_is_excluded_empty_list()` — lista vazia → nada excluído
    - `test_is_excluded_hardcoded_always_applies()` — `noted.db` excluído mesmo com lista de usuário vazia
    - `test_build_manifest_excludes_sync_local_json()` — `.noted/sync-local.json` nunca aparece no manifest
    - `test_build_manifest_excludes_sync_state_json()` — `.noted/sync-state.json` nunca aparece no manifest
    - `test_build_manifest_includes_settings_json()` — `.noted/settings.json` aparece no manifest (sincroniza)

- [ ] Task 6: Criar `src-tauri/src/sync/conflict.rs` — resolução de conflitos + testes unitários
  - **Constante:** `MAX_CONFLICTS_PER_FILE: usize = 10` — limite de arquivos de conflito por original
  - `conflict_filename(original_path: &str, mtime: u64) -> String`
    - Formata: `"{stem} (conflicted {YYYY-MM-DD HH-MM}){ext}"`
    - Ex: `"note (conflicted 2026-02-18 14-30).md"`
  - `count_existing_conflicts(vault_path: &str, original_path: &str) -> Result<Vec<PathBuf>, String>`
    - Lista arquivos de conflito existentes para um dado original (glob `{stem} (conflicted *){ext}`)
    - Retorna ordenados por mtime ascendente (mais antigo primeiro)
  - `enforce_conflict_limit(vault_path: &str, original_path: &str) -> Result<(), String>`
    - Se `count_existing_conflicts() >= MAX_CONFLICTS_PER_FILE`: remove o(s) mais antigo(s) para manter dentro do limite
    - Previne disk fill por peer malicioso ou sync loops — rotação automática
  - `resolve_conflict(vault_path: &str, path: &str, remote_content: &[u8], remote_mtime: u64) -> Result<String, String>`
    - Lê arquivo local
    - Determina qual é mais novo (mtime) — mtime usado apenas como tiebreaker
    - Chama `enforce_conflict_limit()` antes de criar novo conflito
    - Salva versão mais antiga com nome de conflito
    - Salva versão mais nova no path original
    - Retorna o `conflict_path` gerado (para emitir evento ao frontend)
    - `tracing::info!("[sync] conflict resolved: {path} → {conflict_path}")`
  - `resolve_delete_modify_conflict(vault_path: &str, path: &str, modified_content: &[u8], modified_mtime: u64, modifier: Side) -> Result<(), String>`
    - Delete-modify conflict: um lado deletou, outro modificou
    - **Sempre preserva a versão modificada** no path original — nunca perde conteúdo
    - Se modifier = Remote: salva `modified_content` no path local
    - Se modifier = Local: arquivo já existe localmente (é o modificado), nada a fazer (engine skip file_delete para peer)
    - `tracing::warn!("[sync] delete-modify conflict for {path}: keeping modified version")`
  - `safe_delete_file(vault_path: &str, path: &str) -> Result<(), String>`
    - Valida path via `validate_vault_path()` — previne path traversal em deletes
    - Deleta o arquivo com `std::fs::remove_file()`
    - `tracing::info!("[sync] file deleted via sync: {path}")`
  - **Testes unitários** (em `#[cfg(test)] mod tests`):
    - `test_conflict_filename()` — formato correto do nome conflitado
    - `test_conflict_limit_enforced()` — 11º conflito remove o mais antigo (limite = 10)
    - `test_conflict_limit_not_triggered()` — 9 conflitos existentes → nenhum removido
    - `test_resolve_delete_modify_keeps_modified()` — versão modificada sempre preservada
    - `test_safe_delete_validates_path()` — path traversal em delete → `Err`

- [ ] Task 7: Criar `src-tauri/src/sync/server.rs` — servidor TCP/Noise
  - **Constantes de segurança:**
    - `MAX_CONCURRENT_CONNECTIONS: usize = 10` — semáforo tokio
    - `MAX_HANDSHAKES_PER_IP_PER_MIN: u32 = 3` — rate limiting por IP
    - `HANDSHAKE_TIMEOUT: Duration = 5s` — timeout do handshake Noise
    - `IDLE_TIMEOUT: Duration = 60s` — timeout de inatividade por sessão
  - Struct `SyncServer { addr: SocketAddr, cancel_token: CancellationToken, handle: JoinHandle<()> }`
    - Shutdown graceful: `cancel_token.cancel()` + `handle.await` com timeout de 5s (sem `abort()`)
  - `SyncServerState { vault_path: String, sync_keys: SyncKeys, static_priv: Zeroizing<[u8; 32]> }`
    - Chaves usam `Zeroizing` — zeradas automaticamente ao parar o servidor
  - Struct `RateLimiter { attempts: Arc<Mutex<HashMap<IpAddr, Vec<Instant>>>> }`
    - `check_rate_limit(ip: IpAddr) -> bool` — retorna `false` se IP excedeu `MAX_HANDSHAKES_PER_IP_PER_MIN`
    - Limpa entradas expiradas (> 1 min) a cada verificação
  - Função utilitária interna: `validate_vault_path(vault_root: &Path, requested: &str) -> Result<PathBuf, String>`
    - `canonicalize(vault_root.join(requested))` — resolve `..` e variantes encoded
    - Verifica que o resultado começa com `vault_root` canonicalizado — senão retorna `Err`
    - Verifica via `symlink_metadata()` que o path não é symlink — senão retorna `Err`
    - Usada em **todas** as operações de arquivo — sem exceção
  - Função utilitária interna: `safe_open_file(vault_root: &Path, requested: &str, write: bool) -> Result<File, String>`
    - Chama `validate_vault_path()` primeiro
    - Abre o arquivo com `OpenOptions` + `.custom_flags(libc::O_NOFOLLOW)` — **TOCTOU-safe** (macOS)
    - Se `write = true`: cria diretórios intermediários se necessário
    - `fstat()` após abertura para confirmar que não é symlink (belt-and-suspenders)
    - Previne race condition: entre `canonicalize()` e `open()`, um atacante local poderia substituir o arquivo por symlink; `O_NOFOLLOW` faz o `open()` falhar atomicamente nesse caso
  - `start_server(vault_path: String, port: u16, sync_keys: SyncKeys, static_priv: Zeroizing<[u8; 32]>) -> Result<SyncServer, String>`
    - Abre `TcpListener` na porta configurada
    - Cria `CancellationToken` para shutdown graceful
    - Cria `Semaphore(MAX_CONCURRENT_CONNECTIONS)` — limita conexões simultâneas
    - Cria `RateLimiter` compartilhado entre todas as tasks
    - Loop principal: `tokio::select!` entre `listener.accept()` e `cancel_token.cancelled()`
    - Para cada conexão:
      - Verifica `rate_limiter.check_rate_limit(peer_ip)` — se excedido, fecha TCP imediatamente
      - Adquire permit do semáforo (bloqueia se já em `MAX_CONCURRENT_CONNECTIONS`)
      - `tokio::spawn` → `NoiseTransport::accept()` (com timeout de `HANDSHAKE_TIMEOUT`) → loop de mensagens:
        - Cada iteração do loop verifica `last_activity()` — se > `IDLE_TIMEOUT`, fecha conexão
        - `manifest_request` → `build_manifest()` → `sign_manifest()` → `manifest_response`
        - `file_request` → `safe_open_file(read)` → lê conteúdo → `file_response`
        - `file_push` → `safe_open_file(write)` → salva conteúdo → `file_push_ack`
        - `file_delete` → `validate_vault_path()` → `safe_delete_file()` → `file_delete_ack`
        - `vault_uuid_exchange` → responde com UUID local, reconcilia `canonical_vault_uuid`
        - **Handshake falhou** → conexão fechada silenciosamente (peer não sabe a passphrase)
      - Permit do semáforo liberado automaticamente ao sair do spawn (via Drop)
    - **Path validation ocorre DEPOIS do handshake Noise** — conexão não autenticada nunca lê FS
    - Logging: `tracing::info!("[sync] server started on :{port}")`, `tracing::debug!("[sync] connection from {ip}")`, `tracing::warn!("[sync] rate limit exceeded for {ip}")`, `tracing::error!("[sync] handshake failed for {ip}")`
  - **Testes unitários** (em `#[cfg(test)] mod tests`):
    - `test_path_traversal_dotdot()` — `../../.zshrc` → `Err`
    - `test_path_traversal_encoded()` — `%2e%2e%2f.ssh/authorized_keys` → `Err`
    - `test_path_traversal_symlink()` — path que é symlink para fora do vault → `Err`
    - `test_path_valid_inside_vault()` — path legítimo dentro do vault → `Ok(PathBuf)`
    - `test_safe_open_file_nofollow()` — symlink criado entre validate e open → falha atomicamente (O_NOFOLLOW)
    - `test_rate_limiter_allows_under_limit()` — 3 tentativas → todas aceitas
    - `test_rate_limiter_blocks_over_limit()` — 4ª tentativa no mesmo minuto → rejeitada
    - `test_rate_limiter_resets_after_minute()` — tentativas antigas expiram após 60s

- [ ] Task 8: Criar `src-tauri/src/sync/discovery.rs` — mDNS P2P (apenas descoberta, sem autenticação)
  - Struct `SyncPeer { id: String, name: String, ip: String, port: u16 }`
  - Struct `DiscoveryCandidate { ip: String, port: u16, name: String }` — candidato não autenticado
  - Struct `DiscoveryHandle { cancel_token: CancellationToken, candidates_rx: mpsc::Receiver<DiscoveryEvent> }`
  - Enum `DiscoveryEvent { Found(DiscoveryCandidate), Lost(String) }`
  - `start_discovery(vault_uuid: String, port: u16) -> Result<DiscoveryHandle, String>`
    - Registra serviço `_noted._tcp` via `mdns-sd`
    - Anuncia com TXT record: `vault={hash_vault_id_for_mdns(vault_uuid)}` — **hash truncado, não o UUID real**
    - Escuta outros peers via browse
    - Filtra peers com mesmo vault hash (candidatos do mesmo vault)
    - **Apenas emite candidatos** via `candidates_tx.send(DiscoveryEvent::Found(...))` — **não faz handshake Noise**
    - Emite `DiscoveryEvent::Lost(name)` ao perder peer mDNS
    - Separação de responsabilidades: discovery descobre, engine autentica
    - `tracing::debug!("[sync] mDNS candidate found: {name} at {ip}:{port}")`

- [ ] Task 9: Criar `src-tauri/src/sync/client.rs` — cliente de sync
  - Struct `SyncSession` — wrapper sobre `NoiseTransport` aberta durante um ciclo de sync completo
  - `SyncClient { peer: SyncPeer, sync_keys: SyncKeys, static_priv: Zeroizing<[u8; 32]>, vault_path: String }`
  - `SyncClient::open_session(&self) -> Result<SyncSession, String>`
    - Abre `NoiseTransport::connect()` — **um único handshake por ciclo de sync**
    - Dentro do canal: troca `vault_uuid_exchange` para confirmar match e sincronizar `canonical_vault_uuid`
    - Retorna `SyncSession` pronta para uso
  - `fetch_manifest(session: &mut SyncSession) -> Result<SyncManifest, String>`
    - Envia `manifest_request` → aguarda `manifest_response`
    - Verifica `manifest.hmac` via `verify_manifest()` — rejeita inteiro se HMAC inválido
  - `fetch_file(session: &mut SyncSession, path: &str) -> Result<(Vec<u8>, u64), String>`
    - Envia `file_request { path }` → aguarda `file_response { content, mtime }`
  - `push_file(session: &mut SyncSession, path: &str, content: Vec<u8>, mtime: u64) -> Result<(), String>`
    - Envia `file_push { path, content, mtime }` → aguarda `file_push_ack`
  - `delete_file(session: &mut SyncSession, path: &str) -> Result<(), String>`
    - Envia `file_delete { path }` → aguarda `file_delete_ack`
    - Peer valida path e deleta localmente; retorna `ok: false` se arquivo não existe (idempotente)
  - `SyncSession` fechada automaticamente ao sair de escopo (Drop fecha a `TcpStream`)

- [ ] Task 10: Criar `src-tauri/src/sync/engine.rs` — orquestrador principal + testes unitários
  - Struct `SyncEngine`:
    - `vault_path: String`
    - `sync_keys: SyncKeys` — `psk_key` + `hmac_key`, ambas zeradas ao `stop()` / Drop
    - `static_priv: Zeroizing<[u8; 32]>` — zerada ao `stop()` / Drop
    - `server: Option<SyncServer>`
    - `discovery: Option<DiscoveryHandle>`
    - `peers: Arc<Mutex<HashMap<String, SyncPeer>>>`
    - `peers_syncing: Arc<Mutex<HashSet<String>>>` — lock por peer: evita sync bidirecional simultâneo
    - `sync_state: Arc<Mutex<SyncState>>` — carregado de `.noted/sync-state.json` no startup (inclui `baseline_manifests`)
    - `status: Arc<Mutex<SyncStatus>>`
    - `retry_backoff: Arc<Mutex<HashMap<String, RetryState>>>` — backoff por peer
    - `last_trigger: Arc<Mutex<Instant>>` — timestamp do último trigger para debounce (2s)
  - `SyncStatus` enum: `Idle`, `Syncing { peer_id, files_done, files_total }`, `Error(String)`
  - Struct `RetryState { attempts: u32, next_retry: Instant }` — backoff exponencial: 5s → 15s → 30s → 60s → volta ao intervalo normal
  - `SyncEngine::start(vault_path, port, passphrase, app_handle) -> Result<SyncEngine, String>`
    - Valida passphrase via `validate_passphrase()`
    - Lê/cria vault UUID via `read_or_create_vault_id()`
    - Resolve `canonical_vault_uuid` via `get_canonical_vault_uuid()` (sync-state.json → fallback vault-id)
    - Carrega/gera par de chaves estáticas via `load_or_generate_static_keypair(vault_path, canonical_vault_uuid)`
    - Deriva `master_key` via `derive_master_key(passphrase, canonical_vault_uuid)`
    - Deriva `sync_keys` via `derive_sync_keys(master_key)` — `psk_key` para Noise, `hmac_key` para HMAC
    - Carrega `sync_state` de `.noted/sync-state.json` (inclui `baseline_manifests` para three-way diff)
    - Carrega `excluded_paths` de `.noted/sync-local.json` via `load_sync_local_config()`
    - Inicia `SyncServer` (recebe `sync_keys.clone()` + `static_priv`)
    - Inicia `SyncDiscovery` — recebe candidatos via `candidates_rx`
    - Inicia loop principal (`tokio::select!`):
      - `candidates_rx.recv()` → `authenticate_candidate()` (handshake Noise + UUID exchange) → se sucesso, adiciona a `peers` + emite `sync:peer-discovered`
      - `tokio::time::interval` (periódico) → `trigger_sync()` — sem criar segundo file watcher
      - `sync_trigger_rx.recv()` → sync imediato (trigger do file watcher via `trigger_sync()`)
    - `tracing::info!("[sync] engine started for vault {vault_path}")`
  - `SyncEngine::authenticate_candidate(&self, candidate: DiscoveryCandidate) -> Result<SyncPeer, String>`
    - Abre `NoiseTransport::connect()` + troca `vault_uuid_exchange` (inclui `protocol_version`)
    - Verifica `protocol_version` — rejeita se incompatível com `PROTOCOL_VERSION`
    - Verifica `canonical_vault_uuid`:
      - Se `sync_state.canonical_vault_uuid` é `None` → primeiro sync: salva UUID do iniciador como canônico
      - Se já tem `canonical_vault_uuid` → UUID recebido deve ser igual, senão rejeita + `sync:error` (imutabilidade)
    - Sucesso → retorna `SyncPeer` autenticado
    - Falha → ignora silenciosamente (PSK errado ou UUID divergente)
  - `SyncEngine::stop(&mut self) -> Result<(), String>`
    - Para server (via `cancel_token`), para discovery, cancela loop principal
    - `sync_keys` (psk + hmac) e `static_priv` são `Zeroizing` — zerados automaticamente via Drop
  - `SyncEngine::reload_excluded_paths(&mut self) -> Result<(), String>`
    - Relê `.noted/sync-local.json` — chamado quando usuário atualiza exclusões na UI
    - Mudanças tomam efeito no próximo ciclo de sync sem restart
  - Função interna: `verify_file_integrity(content: &[u8], expected_sha256: &str) -> Result<(), String>`
    - Recalcula `SHA256(content)` e compara com `expected_sha256` do manifest
    - Se mismatch → `Err("File integrity check failed: hash mismatch")`
  - `SyncEngine::sync_with_peer(&self, peer_id: &str) -> Result<SyncStats, String>`
    - Verifica `retry_backoff` — se peer está em backoff e `Instant::now() < next_retry`, skip
    - Tenta inserir `peer_id` em `peers_syncing` — se já presente, retorna Ok (skip)
    - Remove de `peers_syncing` no final (sucesso ou erro) via defer pattern
    - Abre **uma sessão Noise** via `SyncClient::open_session()`
    - Na sessão: `fetch_manifest()` → verifica HMAC com `hmac_key` (inclui `generated_at` anti-replay 15 min) → three-way diff com manifest local e baseline
    - Carrega baseline de `sync_state.baseline_manifests[peer_id]` (None no primeiro sync)
    - Chama `diff_manifests(local, remote, baseline)` — three-way diff
    - Valida **todos os paths** dos manifests (local + remote) via `validate_vault_path()` antes de processar
      - Manifest com qualquer path inválido é rejeitado inteiro (log + `sync:error`)
    - Filtra diff: arquivos que batem com `excluded_paths` local são ignorados
    - **Skip de vault-id:** se path recebido é `.noted/vault-id` e já existe localmente → skip (nunca sobrescrever)
    - Para cada `FileDiff` (na mesma sessão):
      - `PullFromPeer` → `fetch_file()` → `verify_file_integrity()` → `safe_open_file(write)` → salva localmente
      - `PushToPeer` → `push_file()` para peer
      - `Conflict` → `resolve_conflict()` + emite `sync:conflict`
        - Se path é `.noted/settings.json` → emite adicionalmente `sync:settings-conflict` (toast especial no frontend)
      - `DeleteLocal(path)` → `safe_delete_file()` → emite `sync:file-deleted`
      - `DeleteRemote(path)` → `delete_file()` via session para peer
      - `DeleteModifyConflict` → `resolve_delete_modify_conflict()` → mantém versão modificada + log warning
    - Emite eventos de progresso
    - **Salva baseline:** gera manifest reconciliado (estado final após sync) e salva em `sync_state.baseline_manifests[peer_id]`
    - Atualiza `sync_state.last_sync[peer_id]` + persiste em `.noted/sync-state.json` (inclui baseline atualizado)
    - **Sucesso:** limpa `retry_backoff[peer_id]`
    - **Falha:** incrementa `retry_backoff[peer_id]` → próximo retry em 5s/15s/30s/60s (cap)
    - Sessão Noise fechada ao sair de escopo (Drop)
    - `tracing::info!("[sync] sync with {peer_id}: {files_changed} changed, {conflicts} conflicts")`
  - `SyncEngine::trigger_sync(&self) -> Result<(), String>`
    - **Debounce interno de 2s:** se `Instant::now() - last_trigger < 2s`, ignora (previne cascata durante sync ativo)
    - Dispara `sync_with_peer()` para todos os peers conhecidos
    - Atualiza `last_trigger`
  - **Testes unitários** (em `#[cfg(test)] mod tests`):
    - `test_verify_file_integrity_valid()` — conteúdo + hash correto → `Ok`
    - `test_verify_file_integrity_tampered()` — conteúdo alterado + hash original → `Err`
    - `test_sync_lock_prevents_concurrent_sync()` — segundo sync com mesmo peer enquanto primeiro em curso → skip
    - `test_retry_backoff_exponential()` — falhas consecutivas aumentam delay: 5s → 15s → 30s → 60s
    - `test_retry_backoff_resets_on_success()` — sync bem-sucedido limpa backoff
    - `test_trigger_sync_debounce()` — dois triggers em < 2s → segundo ignorado
    - `test_delete_propagation_via_baseline()` — arquivo deletado localmente + baseline tem o arquivo → `DeleteRemote` emitido
    - `test_settings_conflict_emits_event()` — conflito em `settings.json` → `sync:settings-conflict` emitido
    - `test_baseline_saved_after_sync()` — sync bem-sucedido → `baseline_manifests[peer_id]` atualizado em sync_state

- [ ] Task 11: Criar `src-tauri/src/commands/sync.rs` — Tauri commands
  - **Estado registrado como Tauri State** (não global estático): `Arc<Mutex<Option<SyncEngine>>>` registrado em `setup()` via `app.manage()`; commands recebem via `State<Arc<Mutex<Option<SyncEngine>>>>`
  - Commands de passphrase (Keychain):
    - `generate_sync_passphrase() -> Result<String, String>`
      - Chama `crypto::generate_passphrase()` — geração CSPRNG no Rust, nunca no frontend
      - Retorna string de 15 chars para o frontend preencher os inputs
    - `save_sync_passphrase(vault_path: String, passphrase: String) -> Result<(), String>`
      - Valida via `validate_passphrase()` (mínimo 15 chars)
      - Resolve `canonical_vault_uuid` via `get_canonical_vault_uuid()`
      - Salva no Keychain com account = `"noted-sync-pass:{SHA256(canonical_vault_uuid)[0..8] hex}"`
    - `has_sync_passphrase(vault_path: String) -> Result<bool, String>`
    - `delete_sync_passphrase(vault_path: String) -> Result<(), String>`
    - `change_sync_passphrase(vault_path: String, new_passphrase: String) -> Result<(), String>`
      - Valida nova passphrase via `validate_passphrase()`
      - Para engine se ativo (`stop_sync()`)
      - Atualiza passphrase no Keychain (account `noted-sync-pass:*`)
      - Re-deriva `master_key` → `sync_keys` com nova passphrase
      - Reinicia engine automaticamente se estava ativo
      - **Nota:** peer remoto precisa atualizar independentemente — handshake falha até que ambos tenham a nova passphrase
    - `reset_sync(vault_path: String) -> Result<(), String>`
      - Para engine se ativo
      - Deleta `.noted/sync-identity` (par de chaves estáticas)
      - Deleta `.noted/sync-state.json` (baselines, canonical UUID, last_sync)
      - Remove passphrase do Keychain via `delete_sync_passphrase()`
      - Remove chave de cifragem do Keychain (account `noted-sync-id:*`)
      - **Não deleta** `.noted/sync-local.json` (exclusões locais são preservadas)
      - Procedimento de recovery: após reset, usuário re-insere passphrase e re-habilita sync
  - Commands de configuração local (sync-local.json):
    - `get_sync_local_config(vault_path: String) -> Result<SyncLocalConfig, String>`
      - Lê `.noted/sync-local.json` via `crypto::load_sync_local_config()`
    - `save_sync_local_config(vault_path: String, config: SyncLocalConfig) -> Result<(), String>`
      - Escreve `.noted/sync-local.json` via `crypto::save_sync_local_config()`
      - Chama `engine.reload_excluded_paths()` se engine ativo — sem restart necessário
  - Commands de engine:
    - `start_sync(vault_path: String, port: u16, app_handle: AppHandle) -> Result<(), String>`
      - Lê passphrase do Keychain internamente
      - Engine lê `excluded_paths` de `.noted/sync-local.json` diretamente
    - `stop_sync() -> Result<(), String>`
    - `get_sync_peers() -> Result<Vec<SyncPeer>, String>`
    - `trigger_sync() -> Result<(), String>`
    - `get_sync_status() -> Result<SyncStatus, String>`

- [ ] Task 12: Registrar módulo sync e commands em `src-tauri/src/lib.rs`
  - Adicionar `mod sync;` na lista de módulos
  - Registrar `Arc<Mutex<Option<SyncEngine>>>` como Tauri State em `setup()`
  - Adicionar em `tauri::generate_handler![]`:
    - `commands::sync::generate_sync_passphrase`
    - `commands::sync::save_sync_passphrase`
    - `commands::sync::has_sync_passphrase`
    - `commands::sync::delete_sync_passphrase`
    - `commands::sync::change_sync_passphrase`
    - `commands::sync::reset_sync`
    - `commands::sync::get_sync_local_config`
    - `commands::sync::save_sync_local_config`
    - `commands::sync::start_sync`
    - `commands::sync::stop_sync`
    - `commands::sync::get_sync_peers`
    - `commands::sync::trigger_sync`
    - `commands::sync::get_sync_status`

- [ ] Task 12.1: Atualizar capabilities Tauri para sync em `src-tauri/capabilities/default.json`
  - O Tauri 2 bloqueia operações de rede por padrão — sem permissões explícitas, `TcpListener::bind()` e mDNS multicast falham silenciosamente
  - Adicionar permissões necessárias:
    - TCP bind/listen na porta configurável (default `39782`) para o `SyncServer`
    - TCP connect para o `SyncClient` (conexões de saída para peers)
    - mDNS multicast (porta `5353` UDP) para descoberta via `mdns-sd`
  - **Nota:** verificar se Tauri 2 requer plugin específico para raw TCP ou se as operações via `tokio::net` dentro do Rust backend passam sem restrição (o sandbox Tauri 2 restringe principalmente o frontend/webview, não o processo Rust). Se o Rust backend não é sandboxed para TCP, documentar que não são necessárias capabilities extras e remover esta task.

### Fase 2 — Frontend TypeScript/Svelte

- [ ] Task 13: Adicionar `SyncSettings` em `src/lib/core/settings/settings.types.ts`
  ```typescript
  export interface SyncSettings {
    enabled: boolean;
    port: number;            // padrão: 39782
    intervalMinutes: number; // padrão: 5
    // excludedPaths: NÃO está aqui — armazenado em .noted/sync-local.json (local por Mac)
    // passphrase: NÃO está aqui — armazenada no macOS Keychain via Tauri command
  }
  ```
  - Adicionar `sync: SyncSettings` em `AppSettings`
  - Adicionar `'sync'` em `SettingsSection` type

- [ ] Task 14: Adicionar `sync` ao store e defaults em `src/lib/core/settings/settings.store.svelte.ts`
  - Default:
    ```typescript
    sync: {
      enabled: false,
      port: 39782,
      intervalMinutes: 5,
    }
    ```
  - Getter: `get sync() { return settings.sync; }`
  - Updater: `updateSync(value: Partial<SyncSettings>) { ... }`

- [ ] Task 15: Atualizar `loadSettings()` em `src/lib/core/settings/settings.service.ts`
  - Adicionar merge de `SyncSettings` no bloco de merge profundo (apenas `enabled`, `port`, `intervalMinutes`)

- [ ] Task 16: Criar `src/lib/features/sync/sync.store.svelte.ts` — estado de runtime
  ```typescript
  interface SyncPeer { id: string; name: string; ip: string; port: number; }
  interface SyncStatusInfo {
    state: 'idle' | 'syncing' | 'error';
    peerId?: string;
    filesTotal?: number;
    filesDone?: number;
    error?: string;
    lastSyncAt?: number;
  }

  export const syncStore = {
    get peers(): SyncPeer[]
    get status(): SyncStatusInfo
    get isRunning(): boolean
    get excludedPaths(): string[]        // lidos de sync-local.json, não de settings
    setPeers(peers: SyncPeer[]): void
    addPeer(peer: SyncPeer): void
    removePeer(peerId: string): void
    setStatus(status: SyncStatusInfo): void
    setRunning(value: boolean): void
    setExcludedPaths(paths: string[]): void
    reset(): void
  }
  ```

- [ ] Task 17: Criar `src/lib/features/sync/sync.service.ts` — serviço de sync
  - `generatePassphrase(): Promise<string>`
    - Chama `invoke('generate_sync_passphrase')` — geração CSPRNG no Rust
    - **Nunca** gerar passphrase no frontend
  - `savePassphrase(vaultPath: string, passphrase: string): Promise<void>`
    - Chama `invoke('save_sync_passphrase', { vaultPath, passphrase })`
  - `hasPassphrase(vaultPath: string): Promise<boolean>`
    - Chama `invoke('has_sync_passphrase', { vaultPath })`
  - `deletePassphrase(vaultPath: string): Promise<void>`
    - Chama `invoke('delete_sync_passphrase', { vaultPath })`
  - `loadSyncLocalConfig(vaultPath: string): Promise<void>`
    - Chama `invoke('get_sync_local_config', { vaultPath })` → `syncStore.setExcludedPaths(config.excludedPaths)`
  - `saveSyncLocalConfig(vaultPath: string, paths: string[]): Promise<void>`
    - Chama `invoke('save_sync_local_config', { vaultPath, config: { excludedPaths: paths } })`
    - `syncStore.setExcludedPaths(paths)`
  - `initSync(vaultPath: string): Promise<void>`
    - Verifica `settingsStore.sync.enabled` — se false, retorna
    - Verifica `hasPassphrase(vaultPath)` — se false, mostra toast "Configure a passphrase first" e retorna
    - Carrega exclusões: `await loadSyncLocalConfig(vaultPath)`
    - Chama `invoke('start_sync', { vaultPath, port: settingsStore.sync.port })` — engine lê excluded_paths de sync-local.json
    - Registra listeners de eventos Tauri:
      - `sync:peer-discovered` → `syncStore.addPeer()`
      - `sync:peer-lost` → `syncStore.removePeer()`
      - `sync:started` → `syncStore.setStatus({ state: 'syncing', ... })`
      - `sync:progress` → `syncStore.setStatus({ filesDone, filesTotal, ... })`
      - `sync:completed` → `syncStore.setStatus({ state: 'idle' })`
      - `sync:error` → `syncStore.setStatus({ state: 'error', error })`
      - `sync:conflict` → toast notificando conflito resolvido
      - `sync:file-deleted` → log de debug (arquivo deletado via sync — sem toast, operação normal)
      - `sync:settings-conflict` → toast especial: "Settings were updated on another device. Your local changes were saved as a conflict file."
    - Escuta evento `tauri://plugin:fs:watch` do watcher existente (já inicializado em `app-lifecycle.service.ts` step 7) via `listen()` — ao receber mudança em `.md` ou `.noted/settings.json`, chama `triggerSync()` com debounce de 2s (evita trigger em cascata durante sync)
    - `syncStore.setRunning(true)`
  - `teardownSync(): Promise<void>`
    - Chama `invoke('stop_sync')`
    - Remove listeners de eventos
    - `syncStore.reset()`
  - `changePassphrase(vaultPath: string, newPassphrase: string): Promise<void>`
    - Chama `invoke('change_sync_passphrase', { vaultPath, newPassphrase })`
    - Engine é parado e reiniciado automaticamente pelo backend
    - Toast: "Passphrase updated. Update the same passphrase on your other devices."
  - `resetSync(vaultPath: string): Promise<void>`
    - Chama `invoke('reset_sync', { vaultPath })`
    - `syncStore.reset()`
    - Toast: "Sync has been reset. Re-enter your passphrase and enable sync to continue."
  - `triggerSync(): Promise<void>`
    - Chama `invoke('trigger_sync')`
  - `getSyncPeers(): Promise<SyncPeer[]>`
    - Chama `invoke('get_sync_peers')`

- [ ] Task 18: Criar `src/lib/core/settings/sections/SyncSection.svelte` — UI de settings
  ```
  ┌─────────────────────────────────────────────────┐
  │ Sync                                            │
  ├─────────────────────────────────────────────────┤
  │ Enable Sync              [Toggle]               │
  │ P2P sync via local network                      │
  ├─────────────────────────────────────────────────┤
  │ Passphrase                       [Generate]     │
  │ [A][#][k][9][@] - [m][Z][2][!][x] - [B][q][7][&][P]
  │ Same passphrase on all devices                  │
  ├─────────────────────────────────────────────────┤
  │ Excluded from sync                  [+ Add]     │
  │  private/                              [✕]      │
  │  journal/2024-*.md                     [✕]      │
  │ These folders/files won't be synced             │
  │ (local to this Mac — not synced)                │
  ├─────────────────────────────────────────────────┤
  │ Sync interval            [5 min ▾]              │
  │ How often to sync automatically                 │
  ├─────────────────────────────────────────────────┤
  │ Port                     [39782]                │
  │ Local server port                               │
  ├─────────────────────────────────────────────────┤
  │ Connected Peers                                 │
  │  • MacBook Pro   192.168.1.10    ✓ synced       │
  │  • (no peers found)                             │
  ├─────────────────────────────────────────────────┤
  │                              [Sync Now]         │
  ├─────────────────────────────────────────────────┤
  │ Danger Zone                                     │
  │  [Change Passphrase]  [Reset Sync]              │
  │ Change passphrase requires updating all devices │
  └─────────────────────────────────────────────────┘
  ```
  - **Passphrase input:** 3 `<input maxlength="5">` separados por hífens visuais
    - Focus avança automaticamente ao preencher 5 chars em cada grupo
    - Focus volta ao grupo anterior ao apagar (backspace em campo vazio)
    - Paste em qualquer campo distribui os 15 chars nos 3 grupos automaticamente
    - Campos usam `type="password"` por padrão; botão [Show] alterna para `type="text"`
    - Botão [Generate] chama `generatePassphrase()` (Rust CSPRNG via invoke) e preenche os 3 inputs
    - Compatível com password managers, paste, e acessibilidade (3 inputs vs 15 individuais)
  - **Excluded paths** (lidos/escritos via `loadSyncLocalConfig` / `saveSyncLocalConfig`):
    - Lista de strings editável — cada item é um glob relativo ao vault root
    - Botão [+ Add] abre input inline para digitar path/glob (ex: `private/`, `drafts/*.md`)
    - Cada item tem botão [✕] para remover da lista
    - Persiste em `.noted/sync-local.json` via `invoke('save_sync_local_config')` — **não** em `settings.json`
    - Exclusões hardcoded (SQLite, trash, sync-identity, sync-local.json) não aparecem na lista — sempre se aplicam
    - Mudanças tomam efeito no próximo ciclo de sync (sem restart)
    - Nota: exclusões são **locais por Mac** — cada dispositivo tem as suas
  - Ao salvar a passphrase: chama `savePassphrase()` → Keychain → toast de confirmação
  - Botão [Clear] remove do Keychain via `deletePassphrase()`
  - Campos sempre aparecem vazios ao abrir (nunca lidos do Keychain de volta para UI)
    - Indicador visual `✓ Passphrase saved` / `⚠ Not configured`
  - Toggle de `enabled` chama `initSync()` ou `teardownSync()` imediatamente
  - Toggle desabilitado se passphrase não configurada (`hasPassphrase() = false`)
  - Botão "Sync Now" chama `triggerSync()`
  - Lista de peers lida de `syncStore.peers` — todos já autenticados pela passphrase
  - **Danger Zone (seção inferior):**
    - Botão "Change Passphrase" → abre dialog com novo input de passphrase (mesmos 3 campos de 5) → chama `changePassphrase()` → toast "Passphrase updated. Update the same passphrase on your other devices."
    - Botão "Reset Sync" → confirmation dialog "This will remove all sync data. You'll need to re-enter your passphrase." → chama `resetSync()` → desabilita toggle + limpa indicador de passphrase
  - Props: `onchange: () => void`

- [ ] Task 19: Registrar `SyncSection` no `SettingsDialog.svelte`
  - Import no topo
  - Adicionar `case 'sync'` no bloco condicional de seções
  - Adicionar ícone (usar `RefreshCw` do lucide-svelte)

- [ ] Task 20: Adicionar seção `'sync'` em `settings.logic.ts`
  - Novo grupo `'Sync'` com `{ id: 'sync', label: 'Sync' }`
  - Posicionar após grupo `'Tools'`

- [ ] Task 21: Integrar sync no ciclo de vida em `app-lifecycle.service.ts`
  - Import `{ initSync, teardownSync }` de `sync.service.ts`
  - Em `initializeVault()`: adicionar `await initSync(vaultPath);` após `await initTodoist()`
  - Em `teardownVault()`: adicionar `await teardownSync();` com os outros resets

### Fase 3 — Testes de Integração e Status Bar

- [ ] Task 22: Criar `src-tauri/tests/sync_integration_test.rs` — testes de integração Rust
  - **Nota:** testes unitários estão distribuídos em cada módulo (Tasks 3-7, 10). Este arquivo contém apenas testes de **integração** que envolvem múltiplos módulos juntos.
  - **Testes de integração end-to-end:**
    - `test_full_sync_cycle_two_peers()` — dois SyncEngines locais sincronizam um arquivo `.md` via loopback
    - `test_delete_propagation_two_peers()` — deletar arquivo em peer A → após sync → arquivo deletado em peer B
    - `test_delete_modify_conflict_keeps_modified()` — peer A deleta, peer B modifica → versão modificada preservada em ambos
    - `test_three_way_diff_no_false_conflicts()` — apenas peer A modifica um arquivo → sem conflito (baseline detecta que B não mudou)
    - `test_idle_timeout()` — conexão sem mensagens por 60s → fechada pelo servidor
    - `test_vault_id_never_overwritten()` — receptor com vault-id existente → sync não sobrescreve o arquivo
    - `test_baseline_persists_across_restarts()` — baseline salvo em sync-state.json → sobrevive restart do engine

- [ ] Task 23: Criar `src/lib/core/status-bar/SyncStatus.svelte` — indicador de sync na status bar
  - Componente leve que lê `syncStore.isRunning`, `syncStore.status`, e `syncStore.peers`
  - Comportamento por estado:
    - **Sync desativado:** nada exibido (componente não renderiza)
    - **Sync ativo, sem peers:** `↕ No peers` com ícone muted
    - **Sync ativo, peer(s) conectado(s), idle:** `↕ Synced` com ícone verde
    - **Syncing em andamento:** `↕ Syncing…` com ícone animado (spin)
    - **Erro:** `↕ Sync error` com ícone vermelho — tooltip com mensagem de erro
  - Clique no indicador abre o `SettingsDialog` na seção `'sync'`
  - Usar `RefreshCw` do lucide-svelte como ícone base
  - Integrar no `AppShell.svelte` no slot `right` do `StatusBar`

- [ ] Task 24: Criar `src/tests/sync.service.test.ts` e `src/tests/sync-status.test.ts` — testes frontend
  - Mock de `invoke` do Tauri
  - `initSync` com `enabled: false` → não chama `invoke('start_sync')`
  - `initSync` com `enabled: true` + passphrase configurada → chama `invoke('start_sync')` (sem `excludedPaths` no payload)
  - `loadSyncLocalConfig` → chama `invoke('get_sync_local_config')` → `syncStore.setExcludedPaths()`
  - `saveSyncLocalConfig` → chama `invoke('save_sync_local_config')` → atualiza `syncStore.excludedPaths`
  - `syncStore` getters: `peers`, `status`, `isRunning`, `excludedPaths`
  - `syncStore.addPeer()` / `removePeer()` funcionam corretamente
  - `teardownSync()` chama `invoke('stop_sync')` e reseta store
  - `changePassphrase()` chama `invoke('change_sync_passphrase')` → toast de sucesso
  - `resetSync()` chama `invoke('reset_sync')` → reseta store + toast
  - `sync:settings-conflict` listener → toast especial sobre settings
  - `SyncStatus`: isRunning=false → não renderiza; isRunning=true + peers=[] → "No peers"; peers=[x] + idle → "Synced"

---

## Arquivos a Criar (novos)

| Arquivo | Descrição |
|---------|-----------|
| `src-tauri/src/sync/mod.rs` | Declaração do módulo |
| `src-tauri/src/sync/crypto.rs` | Derivação de chave, HMAC de manifest, identidade cifrada, passphrase, canonical UUID, sync-local.json |
| `src-tauri/src/sync/noise_transport.rs` | Canal TCP + `Noise_XXpsk3_25519_AESGCM_SHA256`, sessão persistente por ciclo |
| `src-tauri/src/sync/manifest.rs` | Geração de manifest (2 coletas) + diff + HMAC |
| `src-tauri/src/sync/conflict.rs` | Resolução de conflitos |
| `src-tauri/src/sync/server.rs` | Servidor TCP/Noise com CancellationToken |
| `src-tauri/src/sync/discovery.rs` | mDNS anúncio + descoberta + verificação UUID |
| `src-tauri/src/sync/client.rs` | Cliente TCP/Noise com SyncSession persistente |
| `src-tauri/src/sync/engine.rs` | Orquestrador do sync com lock por peer |
| `src-tauri/src/commands/sync.rs` | Tauri commands (passphrase, sync-local.json, engine) |
| `src-tauri/tests/sync_integration_test.rs` | Testes de integração Rust (end-to-end entre módulos) |
| `src/lib/features/sync/sync.store.svelte.ts` | Store de runtime do sync (incl. excludedPaths) |
| `src/lib/features/sync/sync.service.ts` | Serviço de inicialização/controle + sync-local.json |
| `src/lib/core/settings/sections/SyncSection.svelte` | UI de settings |
| `src/lib/core/status-bar/SyncStatus.svelte` | Indicador de sync na status bar |
| `src/tests/sync.service.test.ts` | Testes frontend do serviço de sync |
| `src/tests/sync-status.test.ts` | Testes do componente SyncStatus |

## Arquivos a Modificar (existentes)

| Arquivo | O que muda |
|---------|-----------|
| `src-tauri/Cargo.toml` | Adicionar `snow`, `argon2`, `hkdf`, `hmac`, `subtle`, `mdns-sd`, `globset`, `tokio-util`, `tracing`; atualizar features do `tokio` |
| `src-tauri/src/lib.rs` | `mod sync;` + registrar Tauri State + registrar todos os commands |
| `src-tauri/src/commands/mod.rs` | `pub mod sync;` |
| `src/lib/core/settings/settings.types.ts` | `SyncSettings` (sem excludedPaths) + `AppSettings.sync` + `SettingsSection` |
| `src/lib/core/settings/settings.store.svelte.ts` | Default + getter + `updateSync()` |
| `src/lib/core/settings/settings.service.ts` | Merge de `SyncSettings` no `loadSettings()` |
| `src/lib/core/settings/settings.logic.ts` | Grupo `'Sync'` na navegação |
| `src/lib/core/settings/SettingsDialog.svelte` | Import + case `'sync'` + ícone |
| `src/lib/core/app-lifecycle/app-lifecycle.service.ts` | `initSync` + `teardownSync` |
| `src/lib/core/layout/AppShell.svelte` | Adicionar `SyncStatus` no slot `right` do `StatusBar` |

---

## Exclusões Hardcoded (lista final)

Arquivos/pastas que **NUNCA** sincronizam, independente de `excludedPaths` do usuário:

```
noted.db
noted.db-wal
noted.db-shm
.noted/trash/
.noted/sync-identity      — par de chaves estáticas X25519, único por Mac
.noted/sync-local.json    — excludedPaths e configuração local de sync
.noted/sync-state.json    — last_sync por peer + canonical_vault_uuid + baseline_manifests (local por Mac — sincronizá-lo causaria sobrescrita de timestamps e baselines entre peers)
```

Arquivos de `.noted/` que **sincronizam** (allowlist explícita — coleta manual em `build_manifest()`):

```
.noted/vault-id           — UUID do vault (somente-leitura no receptor se já tiver vault-id)
.noted/settings.json      — preferências de aparência, editor, etc. (sync como arquivo inteiro, sem merge por campo — ver Limitações)
```

> **Nota sobre vault-id:** sincroniza para que dispositivos novos recebam o UUID canônico. O receptor **nunca sobrescreve** seu próprio `vault-id` se já tiver um — usa `canonical_vault_uuid` de `sync-state.json` como fonte de verdade para o Argon2id. Dispositivos sem vault-id local (primeira sincronização) recebem o vault-id do iniciador.

---

## Notas

- **Noise Protocol PSK mode (`snow` crate):** `Noise_XXpsk3_25519_AESGCM_SHA256` — PSK mode formalmente analisado no Noise Protocol whitepaper. PSK no slot 3 autentica mutuamente ambos os peers dentro do handshake padrão, sem HMAC externo de chaves estáticas. Sem TLS, sem certificados, sem CA, sem TOFU.
- **Garantia matemática contra MITM:** a passphrase é derivada em `master_key` via Argon2id (memory-hard); o `psk_key` (derivado do `master_key` via HKDF) é o PSK no handshake Noise; um interceptador sem a passphrase tem PSK inválido → handshake falha antes de qualquer dado ser trocado.
- **Key separation via HKDF-SHA256:** `master_key` (Argon2id) → `psk_key` (info=`"noted-sync-psk"`, para Noise handshake) + `hmac_key` (info=`"noted-sync-hmac"`, para assinatura de manifests). Cada chave derivada tem propósito único — boa prática criptográfica, previne cross-protocol attacks teóricos.
- **Argon2id vs PBKDF2:** Argon2id é memory-hard (64MB por derivação) — resistente a bruteforce via GPU/ASIC, que é o principal vetor de ataque contra KDFs. PBKDF2 com 100K iterações é vulnerável a GPUs modernas (~1M/s). Argon2id é o padrão recomendado (vencedor do Password Hashing Competition, RFC 9106).
- **Manifest assinado com anti-replay:** `HMAC-SHA256(hmac_key, canonical_json(manifest))` onde `manifest` inclui `generated_at` — receptor rejeita manifests com timestamp > 15 min no passado (tolerância ampla para clock drift moderado; NTP recomendado).
- **Sessão persistente:** um único handshake TCP + Noise por ciclo de sync completo — manifest + todos os arquivos na mesma sessão. Sem overhead de Argon2id por arquivo.
- **Forward secrecy:** chaves efêmeras X25519 são geradas por sessão e descartadas — mesmo que a passphrase vaze no futuro, sessões passadas não são decifráveis.
- **Zeroizing:** todo material criptográfico sensível (`master_key`, `static_priv`) usa `Zeroizing<[u8; 32]>` — zerado na memória ao sair de escopo. Previne leak via core dump, swap file, ou cold boot attack.
- **Chave privada estática protegida:** `.noted/sync-identity` armazena a priv key cifrada com AES-256-GCM via Keychain account `noted-sync-id:*` (Touch ID necessário para decifrar).
- **Keypair via `snow`:** `snow::Builder::generate_keypair()` gera pares X25519 internamente — sem necessidade de `x25519-dalek` como dependência separada.
- **Keychain accounts:** `noted-sync-pass:{hash}` para passphrase, `noted-sync-id:{hash}` para chave de cifragem da sync-identity — accounts separadas, sem conflito com a encryption key do vault (`vault-{hash}`).
- **Anti-DoS:** servidor limita 10 conexões simultâneas, 3 handshakes/min por IP, timeout de 5s no handshake, idle timeout de 60s por sessão, shutdown graceful via `CancellationToken`.
- **TOCTOU-safe:** operações de arquivo usam `O_NOFOLLOW` + `fstat()` após abertura — elimina race condition entre validação de path e operação de I/O.
- **Integridade de arquivos:** `SHA256(content)` recalculado após receber cada arquivo e comparado com hash do manifest — rejeita conteúdo adulterado.
- **Limite de conflitos:** máximo 10 por arquivo original com rotação automática — previne disk fill.
- **Lock de sync por peer:** `peers_syncing` HashSet previne sync bidirecional simultâneo (A→B e B→A ao mesmo tempo).
- **Retry com backoff exponencial:** falhas de sync com um peer → retry em 5s → 15s → 30s → 60s (cap). Reset ao ter sucesso. Previne flood em redes instáveis.
- **Protocol versioning:** `vault_uuid_exchange` inclui `protocol_version: u8` — peers com versão incompatível recusam sync com mensagem clara. Previne comportamento undefined entre versões futuras do protocolo.
- **`canonical_vault_uuid` imutável:** após primeiro sync, o UUID canônico salvo em `sync-state.json` não pode ser alterado por peers remotos — previne ataque de ex-membro forçando UUID diferente para causar denial-of-sync.
- **Tauri State:** `SyncEngine` registrado como Tauri State (não global estático) — padrão idiomático do Tauri 2, facilita testes.
- **Three-way diff com baseline:** detecção de conflitos e deletes via comparação three-way (local vs remote vs baseline do último sync). Elimina dependência de `mtime` para conflict detection — sem falsos conflitos por clock skew entre Macs. `mtime` preservado apenas como metadado (tiebreaker em conflitos). Baseline salvo em `sync-state.json` por peer.
- **Propagação de deletes sem tombstones:** arquivo presente no baseline mas ausente do manifest atual = deletado desde último sync. O baseline É a referência — sem necessidade de `delete_log` ou tombstones, que complicam cleanup e expiração. Mensagem `file_delete` (0x08) + `file_delete_ack` (0x09) no protocolo.
- **Delete-modify conflict:** quando um lado deleta e o outro modifica, a versão modificada é preservada (nunca perde conteúdo). Log warning emitido para o usuário via `tracing::warn`.
- **Debounce duplo:** engine Rust tem debounce interno de 2s em `trigger_sync()` (previne cascata: sync recebe arquivo → watcher detecta → trigger → loop). Frontend tem debounce complementar de 2s antes de chamar `invoke('trigger_sync')`.
- **Notificação de conflito de settings:** conflito em `settings.json` emite `sync:settings-conflict` adicionalmente ao `sync:conflict` — frontend mostra toast dedicado informando que settings foram atualizados no outro dispositivo. Sem merge automático (v2).
- **Troca de passphrase:** command `change_sync_passphrase` para engine → re-deriva chaves → reinicia. Ambos peers devem atualizar (handshake falha até lá). Permite revogar acesso de ex-membro.
- **Recovery de sync:** `reset_sync` command deleta `sync-identity` + `sync-state.json` + remove Keychain entries. Preserva `sync-local.json` (exclusões). Após reset, re-inserir passphrase e re-habilitar. Primeiro sync re-estabelece tudo.
- **Watcher único:** sem segundo file watcher — `sync.service.ts` escuta o evento `tauri://plugin:fs:watch` do watcher existente (inicializado em `app-lifecycle.service.ts` step 7). Trigger de sync com debounce de 2s. Loop periódico Rust via `tokio::time::interval`.
- **Discovery separado de autenticação:** `discovery.rs` apenas emite candidatos mDNS via channel; `engine.rs` consome candidatos e faz handshake Noise + UUID exchange. Previne blocking do mDNS browse por handshakes lentos.
- **Logging estruturado:** `tracing` crate em todos os módulos sync com prefixo `[sync]` — essencial para debug de sync P2P em produção. Pontos: handshake success/fail, manifest diff results, file transfer, conflicts, rate limiting.
- **Testes distribuídos:** cada módulo Rust (`crypto.rs`, `noise_transport.rs`, `manifest.rs`, `conflict.rs`, `server.rs`, `engine.rs`) contém `#[cfg(test)] mod tests` com testes unitários. Testes de integração em `tests/sync_integration_test.rs`.
- O banco SQLite (`.noted/noted.db`, `-wal`, `-shm`) é **excluído** do sync — cada Mac regenera localmente
- `.noted/trash/` é **excluída** do sync — lixeira é local por Mac
- `.noted/sync-identity` é **excluído** do sync — par de chaves estáticas X25519, único por Mac
- `.noted/sync-local.json` é **excluído** do sync — excludedPaths são locais por Mac
- `.noted/sync-state.json` é **excluído** do sync — last_sync, canonical_vault_uuid e baseline_manifests são locais por Mac
- `settings.json` **sincroniza como arquivo inteiro** — aparência, editor, etc. são compartilhados entre Macs (ver Limitações)
- **File history** não sincroniza (vive no SQLite) — cada Mac tem seu próprio histórico; limitação v1
- **`canonical_vault_uuid`:** campo em `sync-state.json` — UUID acordado no primeiro handshake; garante que ambos os Macs derivam o mesmo `master_key` via Argon2id com o mesmo salt
- **`baseline_manifests`:** campo em `sync-state.json` — manifest reconciliado do último sync bem-sucedido por peer; usado para three-way diff (detecta qual lado mudou) e propagação de deletes (arquivo no baseline mas não no manifest atual = deletado)
- Passphrase armazenada no macOS Keychain — nunca em disco, nunca sincronizada
- Passphrase gerada via Rust CSPRNG (`rand::thread_rng()`) — nunca no frontend

---

## Limitações Conhecidas (v1)

- **`settings.json` sincroniza como arquivo inteiro (sem merge por campo):** se Mac A muda a font e Mac B muda o theme ao mesmo tempo, conflito é criado + toast `sync:settings-conflict` notifica o usuário. Merge field-by-field de JSON é complexo e pode ser adicionado em v2. Workaround v1: fazer mudanças de settings em um Mac de cada vez.
- **File history** não sincroniza — vive no SQLite local; cada Mac tem seu próprio histórico
- **`.noted/trash/`** não sincroniza — lixeira é local por Mac; deletar em um Mac não deleta no outro
- **Apenas 2 peers (P2P):** o design suporta múltiplos peers, mas v1 é testado e otimizado para 2 Macs
- **macOS only:** `libc::O_NOFOLLOW`, macOS Keychain, `security-framework` são específicos de macOS
- **Troca de passphrase requer atualização manual nos dois devices:** ao trocar passphrase em Mac A, Mac B não sabe — handshake falha até que B também atualize. UI mostra toast orientando o usuário.

---

## Melhorias Futuras — v2 (fora do escopo v1)

Estas melhorias foram identificadas durante o design de v1 mas deliberadamente adiadas para manter o escopo controlado. Documentadas aqui para referência futura.

### Protocolo & Performance

- **Batching de `file_push`:** atualmente cada arquivo é um `file_push` separado. Para vaults com muitos arquivos pequenos (.md curtos), o overhead por mensagem é significativo. v2: batch message que agrupa múltiplos arquivos em um único frame (ex: `0x0A batch_push { files: Vec<{path, content, mtime}> }`). Threshold: arquivos < 4KB agrupados em batches de até 1MB.
- **Compressão de conteúdo:** markdown comprime ~70% com zstd. v2: flag no header de mensagem indicando compressão + `zstd` crate. Negotiated durante `vault_uuid_exchange` (campo `features: Vec<String>` com `"zstd"`). Descompressão no receptor. Reduz tráfego significativamente em redes lentas.
- **Progresso por arquivo:** evento `sync:file-progress { path, bytesTotal, bytesDone }` para arquivos grandes (atualmente apenas `sync:progress` com contagem de arquivos). Útil para feedback visual em uploads > 1MB.
- **Bandwidth throttling:** limitar velocidade de sync para não saturar redes lentas. Configurável na UI (ex: "Limit: 5 MB/s"). `tokio::io::BufReader` com rate limiter customizado.
- **Sync status persistence:** mostrar "Last synced: 5 min ago" mesmo após restart. Ler `last_sync` de `sync-state.json` ao iniciar a UI.

### UX & Features

- **Relay para WAN:** sync fora da rede local via relay server (e.g., WebSocket relay com Noise Protocol mantido end-to-end). O canal Noise é ponto-a-ponto — relay vê apenas ciphertext. Requer infraestrutura de servidor (relay.noted.app).
- **Diff visual de conflitos:** interface para comparar e resolver conflitos manualmente (atualmente apenas preserva ambos). Integrar com o editor markdown existente — split view mostrando ambas versões com highlights de diferenças.
- **Merge field-by-field de `settings.json`:** detectar mudanças por campo e mergear em vez de sobrescrever arquivo inteiro. Ex: Mac A muda font + Mac B muda theme → merge preserva ambas as mudanças. Requer diff JSON estrutural.
- **Selective sync on-demand:** pull específico de um arquivo em vez de sync completo. UI: botão "Sync this file" no editor. Útil quando o usuário quer uma nota específica atualizada imediatamente.
- **Sync de `.noted/trash/`:** propagação de lixeira entre Macs. Requer protocolo de "soft delete" com timestamp — não trivial com o modelo atual de delete via baseline. Opção: metadata de "deleted_at" no manifest em vez de ausência.

### Infraestrutura

- **Sync de file history:** propagar snapshots do SQLite entre Macs. Complexo: SQLite WAL mode não é sync-friendly. Alternativa: exportar history entries como JSON e sincronizar como arquivo regular.
- **Suporte multi-plataforma:** abstrair `O_NOFOLLOW` (Linux: flags diferentes, Windows: sem equivalente direto) e Keychain (Linux: `libsecret`/`keyring`, Windows: `Credential Manager`). Requer feature flags no Cargo.toml + implementações condicionais.
- **Manual peer addition:** adicionar peers por IP:port sem mDNS — para redes onde multicast é bloqueado (corporativas, VPNs). UI: campo "Add peer manually" com IP:port. Engine tenta handshake direto.
- **Stealth mode:** desativar anúncio mDNS mas manter sync ativo via peers manuais. Para ambientes onde revelar o uso de Noted via `_noted._tcp` é indesejável (redes corporativas/públicas).
