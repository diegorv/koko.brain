# Issue 26: Comentários de sync.types.ts contradizem a semântica real

Status: ready-for-agent
Source: COMPARISON.md (kimi Task 10, confirmado e estreitado na refutação)

## What

Três comentários de `src/lib/plugins/sync/sync.types.ts` descrevem uma semântica que
o Rust não tem.

`:7` diz que `skipped` é "up-to-date or untracked". Os três incrementos reais são
`engine.rs:234` (UpToDate), `:238` (KeepLocal) e `:261`
(`Conflict { write_copy: false }`). Um run reportando
`{downloaded: 0, conflicts: 0, skipped: 40, skippedFolders: [], errors: []}` parece
limpo pelo comentário, mas os 40 podem ser todos `engine.rs:261`: 40 arquivos ainda
divergentes do peer, cada um já com uma cópia de conflito que o usuário nunca abriu.

`:9` diz que `skippedFolders` é "e.g., permissions, encoding issues". `engine.rs:118-122`
o preenche num único lugar, o ramo `!shares.contains(folder)`, isto é "o peer não
expõe mais esta pasta". Falhas de permissão e I/O vão para `errors`
(`engine.rs:191` no nível de pasta, `:219` no de arquivo). O doc comment do Rust em
`engine.rs:26-40` está certo; só o espelho TS está errado.

`:21` diz que `localIp` é "Local IP address the listener is bound to; null when not
listening". O listener faz bind em `0.0.0.0` (`server.rs:57`) e
`commands/sync.rs:76-78` popula `local_ip` fora do `Option` da porta, então o campo é
o IP da rota de saída e vem preenchido esteja o listener rodando ou não. Um teste de
`localIp !== null` como proxy de "listener no ar" é sempre verdadeiro.

Impacto vivo hoje é **zero**: os consumidores que sofreriam com isso não existem
(`SyncSection.svelte:236-243` imprime as contagens cruas e `:140` decide por
`status.listening`). É um comentário errado numa interface pública que vai enganar o
próximo leitor.

Nenhum teste pode discordar de um comentário aqui: `sync.service.test.ts:106-126` e
`sync.store.test.ts:5-11` montam o resumo a partir de um literal escrito à mão e
afirmam só encanamento de campo, e nenhum teste produz um resumo a partir do engine
Rust. Pior, `sync.service.test.ts:146-150` afirma
`{listening: false, port: null, localIp: null}`, que é o valor de reset do próprio
store (`sync.store.svelte.ts:3`) e não um valor que o comando Rust já devolveu, então
**reforça** a crença errada sobre `localIp`.

## How

Só comentários, em `src/lib/plugins/sync/sync.types.ts`:

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

Vale conferir junto o `lastSyncClean` de `sync.store.svelte.ts:36-39`, que A já
apontou em "Não coberto" como código morto cujo doc comment afirma considerar erros de
pasta enquanto só lê `errors`. Mesma família, mesmo commit.
