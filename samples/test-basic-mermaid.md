<!-- @style: ./.mdstyled/default-light.css -->
<!-- @script: ./.mdstyled/default-light.js -->

# Basic Mermaid Test

## Simple flowchart (should work)

```mermaid
flowchart LR
  A-->B
```

## Invalid diagram (should show error, not break others)

```mermaid
this is not a valid diagram
```

## Another valid chart (should still render)

```mermaid
pie title Test
  "Apples" : 40
  "Bananas" : 30
  "Cherries" : 30
```

## Sequence diagram (should work)

```mermaid
sequenceDiagram
  A->>B: Hello
  B-->>A: Hi
```
