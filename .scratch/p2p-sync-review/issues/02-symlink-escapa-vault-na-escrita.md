# Issue 02: write_atomic atravessa diretório symlinkado e escreve fora do vault

Status: ready-for-agent
Source: Perda de dados / Traversal e vazamento - REPORT.md

## What

`build_manifest` pula symlinks (`manifest.rs:60-62`, `file_type` vem do `read_dir`, isto é
lstat), então nada abaixo de um diretório symlinkado dentro de uma pasta assinada aparece no
mapa `local`. O `decide` devolve `Action::Download` e o `write_atomic` faz `create_dir_all`
(que segue o link) mais `rename` (que resolve todos os componentes menos o último): o
arquivo destruído fica fora do vault, fora de qualquer pasta exposta ou assinada, sem cópia
de conflito e sem erro.

Reproduzido nesta máquina: com `vault/Notes/sub -> outside/`, o rename deixou
`outside/a.md` com o conteúdo remoto.

O listener já defende exatamente isso na leitura (`server.rs:185-195`, duplo `canonicalize`
mais containment). O lado que escreve não canonicaliza nada.

## How

Espelhar o guard do `serve_file` dentro do `write_atomic`, em
`src-tauri/src/sync/engine.rs:320`, logo depois do `create_dir_all`:

```rust
	let root = vault_root.canonicalize().map_err(|e| format!("canonicalize vault failed: {e}"))?;
	let real_dir = dir.canonicalize().map_err(|e| format!("canonicalize dest failed: {e}"))?;
	if !real_dir.starts_with(&root) {
		return Err(format!("destination escapes vault: {rel_path}"));
	}
```

Teste que falta: symlink dentro do vault **cliente** (todos os testes de symlink hoje são do
lado da leitura).
