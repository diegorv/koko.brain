# Test: Display Functions — badge(), progress(), color()

%%
COMO TESTAR:
- Abra este arquivo no vault junto com os arquivos collection-examples/
- Cada bloco ```collection deve renderizar uma tabela com elementos visuais
- badge() → pill colorida
- progress() → barra de progresso com percentual
- color() → texto colorido
%%

## 1. badge() — Colored Pill

```collection
formulas:
  statusBadge: "badge(status, if(status == 'active', 'green', if(status == 'completed', 'blue', if(status == 'planning', 'purple', 'gray'))))"
  priorityBadge: "badge(priority, if(priority == 'critical', 'red', if(priority == 'high', 'orange', 'yellow')))"

properties:
  formula.statusBadge:
    displayName: Status
  formula.priorityBadge:
    displayName: Priority

views:
  - type: table
    name: Badges
    filters: "status != null"
    order:
      - file.name
      - formula.statusBadge
      - formula.priorityBadge
    sort:
      - column: file.name
        direction: ASC
```

%%
ESPERADO:
- Coluna Status: pills coloridas (green=active, blue=completed, purple=planning)
- Coluna Priority: pills coloridas (red=critical, orange=high, yellow=medium)
- Cores: blue, green, red, orange, purple, yellow, gray
%%

## 2. progress() — Progress Bar

```collection
formulas:
  bar: "if(progress != null, progress(progress, 100), '')"
  barRed: "if(progress != null, progress(progress, 100, 'red'), '')"

properties:
  formula.bar:
    displayName: "Progress (green)"
  formula.barRed:
    displayName: "Progress (red)"

views:
  - type: table
    name: Progress Bars
    filters: "progress != null"
    order:
      - file.name
      - progress
      - formula.bar
      - formula.barRed
    sort:
      - column: progress
        direction: DESC
```

%%
ESPERADO:
- Coluna "Progress (green)": barra visual verde com percentual
- Coluna "Progress (red)": mesma barra mas vermelha
- Valores: projeto-alpha=75%, projeto-beta=20%, projeto-gamma=100%
- Sintaxe: progress(value, max) ou progress(value, max, color)
%%

## 3. color() — Colored Text

```collection
formulas:
  coloredPriority: "color(priority, if(priority == 'critical', 'red', if(priority == 'high', 'orange', if(priority == 'medium', 'yellow', 'gray'))))"
  coloredStatus: "color(status, if(status == 'active', 'green', if(status == 'completed', 'blue', 'purple')))"

properties:
  formula.coloredPriority:
    displayName: Priority
  formula.coloredStatus:
    displayName: Status

views:
  - type: table
    name: Colored Text
    filters: "priority != null"
    order:
      - file.name
      - formula.coloredPriority
      - formula.coloredStatus
    sort:
      - column: file.name
        direction: ASC
```

%%
ESPERADO:
- Coluna Priority: texto colorido (red=critical, orange=high, yellow=medium)
- Coluna Status: texto colorido (green=active, blue=completed, purple=planning)
- Cores disponiveis: blue, green, red, orange, purple, yellow, gray
%%

## 4. Combined — All Three Together

```collection
formulas:
  statusBadge: "badge(status, if(status == 'active', 'green', if(status == 'completed', 'blue', 'gray')))"
  progressBar: "if(progress != null, progress(progress, 100), '')"
  coloredPriority: "color(if(priority == 'critical', 'CRITICAL', if(priority == 'high', 'HIGH', if(priority == 'medium', 'MED', 'LOW'))), if(priority == 'critical', 'red', if(priority == 'high', 'orange', 'yellow')))"

properties:
  file.name:
    displayName: Item
  formula.statusBadge:
    displayName: Status
  formula.progressBar:
    displayName: Progress
  formula.coloredPriority:
    displayName: Priority

views:
  - type: table
    name: Dashboard
    filters: "status != null"
    order:
      - file.name
      - formula.statusBadge
      - formula.coloredPriority
      - formula.progressBar
    sort:
      - column: file.name
        direction: ASC
```

%%
ESPERADO:
- Tabela combinando badge (Status), color (Priority), e progress (Progress)
- Demonstra que as 3 funcoes funcionam lado a lado na mesma view
%%
