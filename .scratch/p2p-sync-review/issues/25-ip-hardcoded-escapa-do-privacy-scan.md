# Issue 25: IP do Google hardcoded passa por baixo do privacy scan

Status: ready-for-agent
Source: COMPARISON.md (kimi Task 9, confirmado e estreitado na refutação)

## What

`commands/sync.rs:23-27`:

```rust
	let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
	socket.connect("8.8.8.8:80").ok()?;
```

A lista de padrões Rust do `privacy.yml` (`:103-120`) traz os literais
`TcpStream::connect` e `UdpSocket::connect`, e o scan é um `grep -rnE` de linha
(`.github/actions/scan-external-calls/action.yml:117`). Medido rodando os 13 padrões
contra a árvore: **0 casam** com qualquer linha de `commands/sync.rs`, porque
`UdpSocket::connect` como regex de linha nunca casa uma chamada de método sobre
handle, e não há padrão de IP literal.

O mesmo branch **adiciona** uma entrada de allowlist para o `TcpStream::connect` que
o scan pegou em `engine.rs:59` (`git diff main...HEAD -- .github` mostra só as linhas
140-144), o que prova que o autor sabia do scan. O job passa verde reportando "no
unknown external calls" sobre um arquivo com um IP externo hardcoded, numa feature
cujo design doc e cujo próprio comentário de allowlist prometem "Same LAN only",
"zero broadcast" e "no hardcoded address and no external server".

Escopo honesto: **nenhum pacote é enviado**, porque `connect` em socket UDP só
registra o peer default e força um route lookup. Isto é higiene de CI e um IP de
terceiro no fonte, não vazamento de dado. E o ponto cego do regex é pré-existente,
não criado por este PR; o que é novo é a primeira linha de código que cai nele.

Não há teste porque a guarda **é** o job de CI.
`local_lan_ip_is_a_parseable_ip_when_present` (`commands/sync.rs:121-127`) parece
cobrir a função, mas só afirma que o retorno parseia como `IpAddr`, nunca inspeciona
o destino, e sai cedo numa máquina sem rota.

## How

Duas linhas, em dois arquivos. Trocar o endereço de terceiro por TEST-NET-1, que
seleciona a mesma rota de saída e nunca é roteado, em `src-tauri/src/commands/sync.rs:25`:

```rust
	// RFC 5737 TEST-NET-1: never routed; connecting only selects the outbound interface.
	socket.connect("192.0.2.1:80").ok()?;
```

E fechar o buraco em `.github/workflows/privacy.yml`, depois da linha 118, somando
`0\.0\.0\.0` ao `skip:` do Rust (medido: só 4 ocorrências de IPv4 literal no fonte,
das quais 2 são os binds em `0.0.0.0`):

```yaml
            # Bare IPv4 literals - catches hardcoded endpoints the client patterns miss
            \b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b
```

A segunda metade sozinha já tornaria o achado visível em CI; a primeira remove a
dependência de um serviço de terceiro na string.
