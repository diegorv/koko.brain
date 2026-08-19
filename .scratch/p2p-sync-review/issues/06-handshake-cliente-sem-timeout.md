# Issue 06: Handshake Noise do cliente sem timeout trava o botão Sync now

Status: ready-for-agent
Source: Cripto e protocolo / Traversal e vazamento / Concorrência, lifecycle e DoS - REPORT.md

## What

`engine.rs:59-62` envolve só o `TcpStream::connect` em `CONNECT_TIMEOUT`. A linha 63 chama
`handshake_initiator` sem deadline: escreve a mensagem 1 e bloqueia em `read_frame` ->
`protocol.rs:91` `read_exact`, sem SO_KEEPALIVE e sem timeout. O `sync_now` nunca resolve, o
`finally` de `sync.service.ts:123-125` nunca roda, e `SyncSection.svelte:233` deixa o botão
morto até restart ou troca de vault.

Gatilhos reais: processo qualquer ocupando a porta persistida do peer, conexão parada no
backlog do peer enquanto ele serve a sessão única dele, ou peer com `serve_connection` travado
(issue 07). Serviço que manda banner não trava (o ASCII estoura `MAX_FRAME_LEN`).

Nada cai e nada se perde. Vaza uma task tokio e um socket. O responder já protege o mesmo
passo em `server.rs:91-93`; é assimetria de uma linha.

## How

`src-tauri/src/sync/engine.rs:63`, reusando a constante que o servidor já tem:

```rust
	let mut chan = timeout(HANDSHAKE_TIMEOUT, handshake_initiator(stream, &psk))
		.await
		.map_err(|_| "handshake timed out".to_string())??;
```

O mesmo vale para `list_remote_shares` (`engine.rs:88-90`). Teste que falta: peer que aceita
TCP e não escreve nada (o teste atual usa 127.0.0.1:1, que dá RST no connect).
