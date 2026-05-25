<!-- @style: ./.mdstyled/default-dark.css -->
<!-- @script: ./.mdstyled/default-dark.js -->


<!-- .diagram-hero -->
# Mermaid Diagrams

A showcase of every Mermaid diagram type rendered by MdStyled.

---

## Flowchart

```mermaid
flowchart TB
  subgraph IDE[VS Code]
    A[Edit .md file] --> B[Save]
  end
  B --> C{Has MdStyled?}
  C -->|Yes| D[MdStyled Engine]
  C -->|No| E[Default Preview]
  D --> F[Resolve Config]
  F --> G[Parse Markdown]
  G --> H[Apply Selectors]
  H --> I[Inject CSS/JS]
  I --> J[Render Webview]
  J --> K[Styled Preview]
  E --> K
```

## Sequence Diagram

```mermaid
sequenceDiagram
  actor User
  participant Editor
  participant MdStyled
  participant Webview

  User->>Editor: Writes markdown
  Editor->>MdStyled: File changed
  MdStyled->>MdStyled: Parse + transform
  MdStyled->>Webview: Send HTML
  Webview-->>User: Show styled preview
  User->>Webview: Scroll / interact
  Webview-->>User: TOC highlights
```

## Class Diagram

```mermaid
classDiagram
  class MdStyledConfig {
    +String[] styles
    +String[] scripts
    +String mode
    +resolve()
  }
  class Parser {
    +parseSelectorComment()
    +parseDirectiveComment()
    +isMdStyledComment()
  }
  class Transformer {
    +applyMdStyledDirectives()
    -applySelectorToToken()
  }
  class Renderer {
    +buildPreviewHtml()
    +loadCssFiles()
    +loadJsFiles()
  }

  MdStyledConfig --> Parser : uses
  MdStyledConfig --> Transformer : feeds
  Transformer --> Renderer : outputs
  Renderer --> Webview : delivers
```

## State Diagram

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Parsing : File saved
  Parsing --> Transforming : Tokens ready
  Transforming --> Rendering : Selectors applied
  Rendering --> Loading : HTML ready
  Loading --> Preview : CSS/JS loaded
  Preview --> Idle : File changed
  Loading --> Error : File not found
  Error --> Idle : Retry
```

## Entity Relationship Diagram

```mermaid
erDiagram
  MARKDOWN ||--o{ COMMENT : contains
  MARKDOWN ||--|| FRONTMATTER : has
  FRONTMATTER ||--o{ STYLESHEET : references
  FRONTMATTER ||--o{ SCRIPT : references
  COMMENT ||--|| SELECTOR : defines
  SELECTOR ||--|| TOKEN : targets
  STYLESHEET ||--|| PREVIEW : styles
  SCRIPT ||--|| PREVIEW : enhances
```

## Git Graph

```mermaid
gitGraph
  commit id: "Init"
  commit id: "Config"
  branch feature
  checkout feature
  commit id: "Add CSS"
  commit id: "Add JS"
  checkout main
  merge feature
  commit id: "TOC"
  branch fix
  checkout fix
  commit id: "Fix CSP"
  checkout main
  merge fix
```

## Pie Chart

```mermaid
pie title MdStyled Feature Distribution
  "Core Engine" : 40
  "CSS Themes" : 25
  "JS Runtime" : 20
  "Documentation" : 15
```

## Gantt Chart

```mermaid
gantt
  title MdStyled Development Roadmap
  dateFormat  YYYY-MM-DD

  section Core
  Engine               :done, 2025-01-01, 30d
  Parser               :done, 2025-01-15, 20d
  Renderer             :done, 2025-02-01, 25d

  section Themes
  Docusaurus           :active, 2025-03-01, 20d
  Dark Mode            :2025-04-01, 15d

  section Runtime
  Mermaid Support      :done, 2025-03-15, 10d
  Copy Button          :done, 2025-03-20, 5d
  TOC Sidebar          :done, 2025-03-10, 8d
```

## Mindmap

```mermaid
mindmap
  root((MdStyled))
    Engine
      Parser
      Transformer
      Renderer
    Features
      Comment Selectors
      CSS Injection
      JS Runtime
    Output
      Webview Preview
      Export HTML
    Templates
      Docusaurus
      Minimal
      Custom
```

---

<!-- .diagram-footer -->
*All diagrams rendered live by Mermaid via MdStyled.*
