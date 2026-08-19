# Issue 07: Nenhum timeout de escrita no servidor, com accept loop serial

Status: ready-for-human
Source: Concorrência, lifecycle e DoS - REPORT.md

## What

`write_frame` (`protocol.rs:77-86`) faz `write_all`, `write_all` e `flush` sem nenhum timeout,
e nenhum dos sends do servidor (`server.rs:126,130,136,142,145,202,204`) é envolvido. Um peer
que pare de ler no meio de um anexo grande enche o buffer de envio e estaciona o future. Como
`serve_connection` é awaitado inline no accept loop (`server.rs:74-81`), o listener para de
aceitar qualquer coisa, enquanto `commands/sync.rs:75-79` continua reportando `listening: true`
e a UI continua mostrando "Listening on ip:port".

Peer dormindo se cura no retransmit timeout do kernel (minutos). Só um peer pareado segurando
janela zero de propósito trava indefinidamente, e ele já tem a pairing key, então nega o
listener do próprio dono.

## How

Duas decisões que o dono precisa tomar:

1. Deadline de envio. Definir `SEND_TIMEOUT` em `src-tauri/src/sync/server.rs:19-21` e envolver
   os sends, ou colocar o timeout dentro do `write_frame` (`protocol.rs:82`):

```rust
	timeout(SEND_TIMEOUT, chan.send(&msg)).await.map_err(|_| "send timed out".to_string())??;
```

2. Serialização. `tokio::spawn` por conexão em `server.rs:76` impede que uma sessão travada
   bloqueie as outras, mas muda o modelo de concorrência do listener (hoje é uma sessão por vez
   por desenho).

Teste que falta: cliente que para de ler no meio, mais asserção de que uma segunda conexão é
aceita durante a primeira.
