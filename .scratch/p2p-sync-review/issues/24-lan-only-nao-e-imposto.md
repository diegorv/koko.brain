# Issue 24: "Same LAN only" não é imposto: o listener escuta em 0.0.0.0

Status: ready-for-human
Severity: menor (conformidade com o spec)
Source: COMPARISON.md (kimi Task 4 / Task 2, confirmado como defeito de spec, estreitado na refutação)

## What

`server.rs:57` faz `TcpListener::bind(("0.0.0.0", port))` e `server.rs:68-70` aceita
a conexão independentemente da origem (`addr` só alimenta um `debug_log`).
`serve_connection` (`server.rs:90-93`) vai direto para o handshake, sem teste de
origem. Grep por `is_private`, `is_loopback`, `link_local` e `RFC1918` em
`src-tauri/src/`: zero ocorrências.

Três textos prometem outra coisa: `docs/SYNC.md:9` ("Same LAN only. Direct TCP, no
NAT traversal, no relay."), `docs/SYNC.md:3` e o comentário de allowlist em
`.github/workflows/privacy.yml:141`. O toggle é persistido e religado a cada abertura
de vault (`app-lifecycle.service.ts:291-295`), então um laptop que ligou Expose em
casa continua escutando ao sentar numa subnet de universidade com IPv4 público, num
hotel com UPnP mapeando a porta, ou atrás de um port-forward existente.

**Isto não é vetor de invasão** e o issue não deve ser lido como tal: a autenticação
é um PSK de 256 bits e quem não tem a chave não passa do handshake. `docs/SYNC.md:9`
está numa tabela chamada "Decisions (agreed with the user)", ao lado de "no NAT
traversal, no relay", isto é, descreve topologia pretendida e não controle de acesso.
O que sobra é descompasso real entre texto e código, agravado por `docs/SYNC.md:101`
deixar a chave em texto plano no `settings.json` do vault, que é o que o usuário
coloca no backup.

Marcado `ready-for-human` porque a escolha entre corrigir o texto e impor o escopo é
decisão de produto: um filtro por faixa de IP quebraria setups legítimos (VPN, LAN
roteada, IPv6 público interno) e foi julgado a correção **prejudicial** das duas.

## How

Preferida, textual. Em `docs/SYNC.md:9` e no comentário de
`.github/workflows/privacy.yml:141`, dizer que o listener escuta em toda interface e
que o escopo LAN é premissa de implantação, não controle imposto pelo código. A cópia
da UI (`SyncSection.svelte:133-144`) hoje diz apenas "Listen for incoming connections
from the paired machine", que é verdade e não precisa mudar.

Alternativa, se o dono quiser impor. Um guard no braço de accept de
`src-tauri/src/sync/server.rs:68-70`, sem dependência nova:

```rust
					accepted = listener.accept() => {
						let Ok((stream, addr)) = accepted else { continue };
						let ip = addr.ip();
						let lan = match ip {
							std::net::IpAddr::V4(v4) => v4.is_private() || v4.is_loopback() || v4.is_link_local(),
							std::net::IpAddr::V6(v6) => v6.is_loopback() || (v6.segments()[0] & 0xfe00) == 0xfc00,
						};
						if !lan {
							debug_log("SYNC", format!("refused non-LAN peer {addr}"));
							continue;
						}
```

Teste que falta em qualquer um dos caminhos: todo teste de servidor disca
`127.0.0.1` (`sync_server_test.rs:36`, `:127`, `:142`, `:167`, `:202`;
`sync_e2e_test.rs:25`, `:186`, `:251`, `:293`), então o accept só é exercitado a
partir do loopback. `list_shares_returns_only_existing_folders` e
`symlink_within_exposed_folder_is_refused` parecem testes de fronteira de exposição,
mas delimitam **quais pastas** são servidas, nunca **quem** pode pedir. Um filtro de
origem podia ser adicionado ou removido com a suíte verde dos dois jeitos.
