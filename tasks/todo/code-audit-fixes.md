# Auditoria de código TypeScript — Bugs e correções

## Context

Análise completa do código TypeScript em `src/` buscando bugs reais, falhas de segurança e problemas significativos. A análise cobriu `core/`, `features/`, `plugins/`, `utils/` e `routes/`. Muitos achados iniciais foram descartados após verificação manual como falsos positivos.

## Achados descartados (falsos positivos)

| Achado | Motivo da rejeição |
|--------|-------------------|
| XSS em `renderCanvasMarkdown` / `@html` | Usa DOMPurify com config restrita — sanitização correta |
| Race condition em `debouncedFileChangeHandler` | Handler é cancelado em `cleanupCurrentVault` (linhas 272-274) |
| Path traversal em `deep-link.logic.ts` | `normalizePath` + prefix check funciona corretamente |
| `innerHTML` com SVGs hardcoded | São constantes de compilação, não input do usuário |
| Race condition em semantic search init | Tem checks de `initVersion` em todos os caminhos |
| `new Function()` no QueryJS | Feature intencional (scripting em notas), não bug |

## Bugs confirmados

### 1. HIGH — Path traversal no meta-bind `createNote`

- **Arquivo**: `src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:139-140`
- **Problema**: `action.folderPath` vem de YAML no markdown (controlado pelo usuário) e é concatenado direto no path sem validação:
  ```typescript
  const folder = action.folderPath ? `${action.folderPath}/` : '';
  const filePath = `${vaultStore.path}/${folder}${action.fileName}.md`;
  ```
  Um note malicioso pode usar `folderPath: "../../../etc"` para criar arquivos fora do vault.
- **`openOrCreateNote`** em `note-creator.service.ts` também não valida containment no vault.

### 2. MEDIUM — Race condition no canvas FileNode

- **Arquivo**: `src/lib/features/canvas/FileNode.svelte:29-45`
- **Problema**: O `$effect` inicia `readTextFile` assíncrono, mas se `data.file` mudar antes da promise resolver, o `.then()` antigo sobrescreve `fileContent` e `loading` com dados stale.

### 3. MEDIUM — Race condition + blob URL leak no canvas ImageNode

- **Arquivo**: `src/lib/features/canvas/ImageNode.svelte:18-37`
- **Problema duplo**:
  1. Mesma race condition do FileNode — promise stale sobrescreve `imageSrc`
  2. Blob URL leak: cleanup roda quando `currentSrc` ainda é `null` (porque `.then()` não resolveu), então a URL nunca é revogada. Quando `.then()` resolve depois, seta `currentSrc` mas ninguém vai revogar.

## Tasks

- [x] Task 1: Extrair `resolveFilePath` e `normalizePath` para `src/lib/utils/path.ts`
- [ ] Task 2: Corrigir path traversal no meta-bind createNote
- [ ] Task 3: Corrigir race condition no FileNode.svelte
- [ ] Task 4: Corrigir race condition + blob leak no ImageNode.svelte

## Detalhes de implementação

### Task 1: Extrair path utility

**Criar** `src/lib/utils/path.ts`:
- Mover `normalizePath` (atualmente privada em `deep-link.logic.ts:171-184`) — exportar
- Mover `resolveFilePath` (atualmente em `deep-link.logic.ts:145-165`) — exportar

**Atualizar** `src/lib/features/deep-link/deep-link.logic.ts`:
- Remover as funções e re-exportar: `export { resolveFilePath } from '$lib/utils/path'`
- Manter backward compatibility com todos os imports existentes

**Criar** `src/tests/lib/utils/path.test.ts`:
- Mover/copiar os testes de `resolveFilePath` do `deep-link.logic.test.ts`
- Adicionar testes para `normalizePath` isoladamente
- Adicionar testes de path traversal explícitos (../../, .., paths absolutos)

### Task 2: Corrigir path traversal no meta-bind

**Arquivo**: `meta-bind-button-widget.ts`, case `createNote` (linhas 135-147)

Substituir concatenação manual por `resolveFilePath`:
```typescript
case 'createNote': {
    const { openOrCreateNote } = await import('$lib/core/note-creator/note-creator.service');
    const { vaultStore } = await import('$lib/core/vault/vault.store.svelte');
    const { resolveFilePath } = await import('$lib/utils/path');

    const relative = action.folderPath
        ? `${action.folderPath}/${action.fileName}`
        : action.fileName;
    const filePath = resolveFilePath(vaultStore.path!, relative);

    await openOrCreateNote({ filePath, title: action.fileName });
    break;
}
```

`resolveFilePath` já adiciona `.md` automaticamente, normaliza `..` e lança erro se o path sair do vault.

### Task 3: Corrigir race condition no FileNode

**Arquivo**: `src/lib/features/canvas/FileNode.svelte:29-45`

Adicionar flag `aborted` + cleanup function:
```typescript
$effect(() => {
    const filePath = data.file;
    if (!filePath) return;

    loading = true;
    error = false;
    fileContent = null;
    let aborted = false;

    const fullPath = vaultStore.path ? `${vaultStore.path}/${filePath}` : filePath;
    readTextFile(fullPath as string).then((content) => {
        if (aborted) return;
        fileContent = content;
        loading = false;
    }).catch(() => {
        if (aborted) return;
        error = true;
        loading = false;
    });

    return () => { aborted = true; };
});
```

### Task 4: Corrigir race condition + blob leak no ImageNode

**Arquivo**: `src/lib/features/canvas/ImageNode.svelte:18-37`

Reescrever o `$effect` com dual cleanup (aborted flag + revoke em ambos os timings):
```typescript
$effect(() => {
    const file = data.file;
    if (!file) return;
    imageSrc = null;
    error = false;

    let aborted = false;
    let blobUrl: string | null = null;

    resolveImageSrc(file)
        .then((src) => {
            if (aborted) {
                if (src.startsWith('blob:')) URL.revokeObjectURL(src);
                return;
            }
            blobUrl = src;
            imageSrc = src;
        })
        .catch(() => {
            if (aborted) return;
            error = true;
        });

    return () => {
        aborted = true;
        if (blobUrl && blobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(blobUrl);
        }
    };
});
```

## Verificação

- **Task 1-2**: `pnpm check` + `pnpm vitest run` — testes existentes de deep-link devem continuar passando, testes novos em `path.test.ts` devem cobrir traversal
- **Task 3-4**: `pnpm check` — componentes Svelte não têm testes unitários (dependem de Tauri FS), verificar manualmente abrindo canvas com FileNode/ImageNode e trocando arquivos rapidamente

## Notes

- `readTextFile` do Tauri não aceita `AbortSignal`, então o padrão de boolean flag é a solução correta
- `resolveFilePath` já trata `.md` extension, normalização de `/`, e containment check
- Os fixes são independentes entre si e podem ser implementados em qualquer ordem (exceto Task 2 que depende de Task 1)
