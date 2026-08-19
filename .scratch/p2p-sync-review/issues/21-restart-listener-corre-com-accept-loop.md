# Issue 21: Restart do listener na porta persistida corre com o accept loop antigo

Status: ready-for-agent
Severity: correção
Source: COMPARISON.md (kimi Task 7 H1, confirmado e sobreviveu à refutação)

## What

`commands/sync.rs:49-54` tira o `RunningServer` do estado gerenciado e chama
`stop()`, que apenas manda `true` num canal watch (`server.rs:44-49`) e volta. O
socket em LISTEN pertence à task do accept loop (`server.rs:62-86`) e só é fechado
quando ela é escalonada, acorda e sai do `select!`. As linhas 56 a 59 fazem o bind da
mesma porta no mesmo comando, sem nenhum yield entre as duas coisas.

A porta é fixa depois do primeiro start bem sucedido: o default é 0
(`settings.store.svelte.ts:130`), mas `sync.service.ts:41-44` persiste a porta
efêmera escolhida. E `restartListenerIfRunning` é disparado em **toda** adição e
remoção de pasta exposta (`SyncSection.svelte:83`, `:91`).

Quando a task antiga ainda não largou o socket, o bind devolve EADDRINUSE,
`start_server` devolve `Err`, o estado gerenciado já está `None` e o listener sumiu.
Estado final ruim em três eixos: `exposeEnabled` continua true, porque
`restartListenerIfRunning` (`:33-41`) engole e **não** reverte, ao contrário de
`handleToggleExpose` (`:51-54`); `syncStore.status` mantém o `{listening: true}`
anterior, porque `startListener` só chama `refreshStatus` no caminho de sucesso
(`sync.service.ts:45`); e `SyncSection.svelte:140-145` continua renderizando
"Listening on ...". O peer leva connection refused enquanto as duas UIs dizem que o
compartilhamento está no ar. Recuperação exige desligar e religar Expose ou
reiniciar o app.

Frequência: dois harnesses independentes deram entre 1/200 e 25/200, isto é, algo
entre 0,5% e 12,5% por restart. É intermitente, não quase certo. `SO_REUSEADDR` não
ajuda: cobre `TIME_WAIT`, não um socket ainda em LISTEN no mesmo `addr:port`, e nem
std/mio nem tokio setam `SO_REUSEPORT`.

## How

Fazer o `stop()` de fato soltar o socket antes de voltar, o que conserta todos os
call sites de uma vez em vez de remendar o comando. Em
`src-tauri/src/sync/server.rs:38-49`:

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

Em `start_server` (`server.rs:62-87`), guardar o spawn: `let task = tokio::spawn(...)`
e devolver `Ok(RunningServer { port, shutdown: tx, task })`.

Em `src-tauri/src/commands/sync.rs`, tirar o `take()` de dentro do escopo do guard
(que não é `Send`) nos dois comandos:

```rust
	let previous = {
		let mut guard = state.0.lock().map_err(|e| format!("sync state lock poisoned: {e}"))?;
		guard.take()
	};
	if let Some(running) = previous {
		running.stop().await;
	}
```

`sync_stop_listener` vira `pub async fn` com a mesma forma, e as três chamadas de
`stop()` nos testes ganham `.await`.

Teste que falta: `stop_closes_the_listener` (`sync_server_test.rs:151-159`) e
`stop_unblocks_while_a_session_is_stalled` (`:161-172`) parecem cobrir shutdown, mas
dormem 100 ms depois do `stop()` antes de afirmar. O comentário da linha 156 diz
literalmente "Give the accept loop a moment to observe shutdown and drop the socket",
que é exatamente a espera que o caminho do comando não faz. Todo teste Rust faz bind
com porta 0, então nenhum refaz bind de porta fixa, e os testes de `commands/sync.rs`
(`:112-128`) nunca constroem `SyncServerState`. Falta um teste que rode a sequência
stop-then-start numa porta fixa.
