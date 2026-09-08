---
sidebar_position: 9
slug: /extras
title: Built-in Extras
---

# Built-in Extras

MdStyled ships with a few preview extensions that work out of the box.

| Extension | What it does |
|---|---|
| `mermaid` | Renders ` ```mermaid ` blocks as diagrams |
| `copy-code` | Adds copy buttons to code blocks |
| `highlight` | Applies basic code block styling |

## Enabling / disabling

All three are enabled by default. Control them in VS Code settings:

```json
{
  "mdstyled.extensions.enabled": ["mermaid", "copy-code", "highlight"]
}
```

For example, to disable Mermaid rendering but keep copy buttons and highlighting:

```json
{
  "mdstyled.extensions.enabled": ["copy-code", "highlight"]
}
```

## Mermaid

Renders ` ```mermaid ` fenced blocks as inline diagrams — flowcharts, sequence, Gantt, pie, class, and more.

## Copy code

Adds a copy button to every code block. The button stays fixed while scrolling horizontally, so it's always reachable.

## Highlight

Applies basic code block styling using theme-appropriate colors.

:::tip
Templates build on these extras. The [interactive templates](./interactive) layer interactive tables, accordions, callouts, and progress bars on top.
:::