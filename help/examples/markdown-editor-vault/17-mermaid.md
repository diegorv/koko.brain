# Teste: Diagramas Mermaid

%%
COMO TESTAR:
- Verifique que diagramas sao renderizados como SVG
- Header deve mostrar "mermaid"
- Mova cursor para dentro e verifique que source aparece
- Teste diferentes tipos de diagrama
%%

## 1. Flowchart (graph TD)

```mermaid
graph TD
    A[Inicio] --> B{Decisao}
    B -->|Sim| C[Acao 1]
    B -->|Nao| D[Acao 2]
    C --> E[Fim]
    D --> E
```

%%
ESPERADO:
- Diagrama de fluxo renderizado como SVG
- Nos com formas diferentes (retangulo, losango)
- Setas com labels
- Header com "mermaid"
%%

## 2. Flowchart (graph LR)

```mermaid
graph LR
    A[Input] --> B[Process]
    B --> C[Output]
    C --> D{Valid?}
    D -->|Yes| E[Save]
    D -->|No| A
```

%%
ESPERADO:
- Fluxo da esquerda para a direita (horizontal)
%%

## 3. Sequence Diagram

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant B as Backend
    participant D as Database

    U->>F: Click button
    F->>B: API Request
    B->>D: Query
    D-->>B: Results
    B-->>F: JSON Response
    F-->>U: Update UI
```

%%
ESPERADO:
- Diagrama de sequencia com participantes no topo
- Setas entre participantes
- Labels nas setas
%%

## 4. Class Diagram

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +fetch()
    }
    class Cat {
        +String color
        +purr()
    }
    Animal <|-- Dog
    Animal <|-- Cat
```

%%
ESPERADO:
- Diagrama de classes com caixas
- Atributos e metodos listados
- Setas de heranca
%%

## 5. Pie Chart

```mermaid
pie title Distribuicao de Linguagens
    "JavaScript" : 40
    "TypeScript" : 30
    "Python" : 20
    "Rust" : 10
```

%%
ESPERADO:
- Grafico de pizza com fatias proporcionais
- Titulo visivel
- Cores distintas por fatia
%%

## 6. State Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading : fetch
    Loading --> Success : resolve
    Loading --> Error : reject
    Success --> Idle : reset
    Error --> Loading : retry
    Error --> Idle : dismiss
```

%%
ESPERADO:
- Diagrama de estados com transicoes
- Estado inicial marcado com [*]
%%

## 7. Mermaid com Erro de Sintaxe

```mermaid
graph TD
    A --> B --> C
    invalid syntax here %%%
```

%%
ESPERADO:
- Erro visivel em vermelho (mensagem de erro do Mermaid)
- NAO deve crashar o editor
%%

## 8. Mermaid Vazio

```mermaid
```

%%
ESPERADO:
- Verificar comportamento com bloco mermaid vazio
%%
