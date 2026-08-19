# Issue 12: Um arquivo ilegível aborta o manifest da pasta e vaza o path absoluto

Status: ready-for-agent
Source: Traversal e vazamento - REPORT.md

## What

Qualquer arquivo sob a pasta exposta que não possa ser lido (modo 000, volume desmontado, ou
removido entre o `read_dir` e o `hash_file`) faz `hash_file` devolver
`read {path absoluto} failed: {e}`. `manifest.rs:79` propaga com `?` e `server.rs:145` manda
verbatim como `Msg::Error`.

Dois efeitos. O principal é disponibilidade: a pasta inteira falha em silêncio naquela sessão.
O secundário é divulgação: o peer recebe o caminho absoluto do vault, logo o usuário do SO.
O peer já tem a pairing key e já pode ler toda a pasta, então o vazamento é pequeno, mas
contraria a disciplina que o próprio `serve_file` aplica (`server.rs:170-198`, uma negação
genérica sem texto de erro do SO).

## How

Em `src-tauri/src/sync/manifest.rs:79`, não deixar um arquivo derrubar a pasta:

```rust
	let Ok(sha256) = hash_file(&path) else { continue };
	files.push(FileMeta { rel_path, size: meta.len(), sha256 });
```

E trocar `path.display()` por `rel_path` nas mensagens que saem pelo fio
(`manifest.rs:36`, `:52`).

Teste que falta: nenhum teste inspeciona o corpo de `Msg::Error`, e nenhum torna um arquivo
dentro de pasta exposta ilegível.
