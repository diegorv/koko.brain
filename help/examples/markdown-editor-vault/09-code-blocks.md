# Teste: Blocos de Codigo

%%
COMO TESTAR:
- Verifique que blocos sao substituidos por widgets com header + conteudo
- Verifique syntax highlighting por linguagem
- Teste botao de copiar (hover)
- Mova cursor para dentro do bloco e verifique que source aparece
%%

## 1. JavaScript

```js
function greet(name) {
  const message = `Hello, ${name}!`;
  console.log(message);
  return message;
}

// Arrow function
const add = (a, b) => a + b;

// Array methods
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
const sum = numbers.reduce((acc, n) => acc + n, 0);
```

%%
ESPERADO:
- Header com label "js"
- Botao de copiar visivel no hover
- Syntax highlighting: keywords (function, const, return), strings, template literals, comments
%%

## 2. TypeScript

```ts
interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

type Status = 'active' | 'inactive' | 'pending';

async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}
```

%%
ESPERADO:
- Header com label "ts"
- Highlighting: interface, type, async, await, Promise, generics
%%

## 3. Python

```python
from typing import List, Optional
import asyncio

class DataProcessor:
    def __init__(self, data: List[int]):
        self.data = data
        self._cache: Optional[dict] = None

    async def process(self) -> dict:
        """Process data asynchronously."""
        results = await asyncio.gather(
            *[self._transform(item) for item in self.data]
        )
        return {"results": results, "count": len(results)}

    @staticmethod
    def _transform(value: int) -> int:
        return value ** 2 + 1

# List comprehension
squares = [x**2 for x in range(10) if x % 2 == 0]
```

%%
ESPERADO:
- Header com label "python"
- Highlighting: class, def, async, await, import, from, decorators (@)
%%

## 4. Rust

```rust
use std::collections::HashMap;

#[derive(Debug, Clone)]
struct Config {
    name: String,
    values: HashMap<String, i32>,
}

impl Config {
    fn new(name: &str) -> Self {
        Config {
            name: name.to_string(),
            values: HashMap::new(),
        }
    }

    fn get(&self, key: &str) -> Option<&i32> {
        self.values.get(key)
    }
}

fn main() {
    let mut config = Config::new("app");
    config.values.insert("port".to_string(), 8080);
    println!("{:?}", config);
}
```

%%
ESPERADO:
- Header com label "rust"
- Highlighting: use, struct, impl, fn, let, mut, macros, derive attributes
%%

## 5. CSS

```css
:root {
  --primary: #3b82f6;
  --bg: #1e1e2e;
}

.container {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--bg);
}

.container > .item {
  flex: 1;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

@media (max-width: 768px) {
  .container {
    flex-direction: column;
  }
}
```

%%
ESPERADO:
- Header com label "css"
- Highlighting: seletores, propriedades, valores, variaveis, media queries
%%

## 6. HTML

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Teste</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app" class="container">
    <h1>Hello World</h1>
    <p data-testid="greeting">Welcome!</p>
    <button onclick="handleClick()">Click me</button>
  </div>
  <script src="app.js"></script>
</body>
</html>
```

%%
ESPERADO:
- Header com label "html"
- Highlighting: tags, atributos, valores de atributos, DOCTYPE
%%

## 7. JSON

```json
{
  "name": "kokobrain",
  "version": "1.0.0",
  "dependencies": {
    "svelte": "^5.0.0",
    "codemirror": "^6.0.0"
  },
  "config": {
    "port": 3000,
    "debug": true,
    "tags": ["svelte", "tauri", null]
  }
}
```

%%
ESPERADO:
- Header com label "json"
- Highlighting: chaves, strings, numeros, booleans, null
%%

## 8. Bash / Shell

```bash
#!/bin/bash

# Variables
APP_NAME="kokobrain"
PORT=${PORT:-3000}

# Function
deploy() {
    echo "Deploying $APP_NAME..."
    npm run build
    if [ $? -eq 0 ]; then
        echo "Build successful!"
        rsync -avz dist/ server:/var/www/
    else
        echo "Build failed!" >&2
        exit 1
    fi
}

# Execute
deploy "$@"
```

%%
ESPERADO:
- Header com label "bash"
- Highlighting: shebang, variaveis, funcoes, if/then/else, comandos
%%

## 9. YAML

```yaml
name: CI Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    types: [opened, synchronize]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: pnpm install
      - name: Run tests
        run: pnpm test
        env:
          NODE_ENV: test
```

%%
ESPERADO:
- Header com label "yaml"
- Highlighting: chaves, valores, listas, blocos
%%

## 10. SQL

```sql
SELECT
    u.name,
    u.email,
    COUNT(p.id) AS post_count,
    MAX(p.created_at) AS last_post
FROM users u
LEFT JOIN posts p ON p.author_id = u.id
WHERE u.is_active = true
    AND u.created_at > '2024-01-01'
GROUP BY u.id, u.name, u.email
HAVING COUNT(p.id) > 5
ORDER BY post_count DESC
LIMIT 10;
```

%%
ESPERADO:
- Header com label "sql"
- Highlighting: keywords (SELECT, FROM, WHERE, etc.), strings, operadores
%%

## 11. Bloco Sem Linguagem

```
Texto sem syntax highlighting.
Apenas codigo monospacado.
Sem label no header.
```

%%
ESPERADO:
- Header SEM label de linguagem
- Texto em monospace sem highlighting
- Botao de copiar ainda deve funcionar
%%

## 12. Bloco de Codigo Indentado (4 espacos)

    function indentedCode() {
        return "indented";
    }
    const x = 42;

%%
ESPERADO:
- Deve ser renderizado como widget de bloco de codigo (Lezer CodeBlock)
- Sem label de linguagem no header
- Indentacao de 4 espacos/1 tab removida ao renderizar
%%

## 13. Botao de Copiar

```js
const textToCopy = "Hello, World!";
```

%%
TESTE MANUAL:
1. Passe o mouse sobre o bloco de codigo
2. Botao de copiar deve aparecer no canto
3. Clique no botao
4. Texto do codigo deve ser copiado para o clipboard
5. Verifique colando em outro lugar
%%

## 14. Formatacao Inline NAO Deve Funcionar Dentro de Codigo

```
**nao negrito** *nao italico* ~~nao tachado~~ `nao codigo inline` ==nao highlight==
[[nao wikilink]] [nao link](url) ![nao imagem](url)
$nao math$ %%nao comentario%%
```

%%
ESPERADO:
- NENHUMA formatacao inline dentro do bloco de codigo
- Tudo deve aparecer como texto literal
- isInsideBlockContext() impede decoracoes
%%

## 15. Edge Cases

```
Bloco de codigo com apenas uma linha
```

```js
```

````
Bloco com 4 backticks
````

%%
ESPERADO:
- Bloco de uma linha: deve funcionar normalmente
- Bloco vazio: verificar se renderiza widget vazio
- 4 backticks: deve funcionar como delimitador
%%
