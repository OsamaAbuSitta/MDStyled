---
sidebar_position: 4
slug: /templates
title: Templates
---

# Templates

Templates give you an instant, polished documentation layout — without writing a single line of CSS.

## Two ways to use a template

### Global default

Set once, used by every Markdown file that has no styling of its own. Nothing is written to your files.

The first time you preview an unstyled Markdown file, MdStyled asks which template should be the default. Change it any time with **MdStyled: Set Default Template**, or in settings:

```json
{
  "mdstyled.defaultTemplate": "default-dark"
}
```

Pick `none` to keep unstyled files unstyled.

:::note
A file that declares its own styles or scripts always wins — the global default only applies when nothing else resolves.
:::

### Per-file

Run **MdStyled: Apply Template** to copy the theme into `.mdstyled/` and insert `@style` / `@script` directives into that Markdown file. You can then edit the theme freely.

## Available templates

MdStyled ships with four templates:

| Template | Style | Extras |
|---|---|---|
| `default-light` | Light | TOC, copy buttons, syntax highlighting, Mermaid |
| `default-dark` | Dark | TOC, copy buttons, syntax highlighting, Mermaid |
| `interactive-light` | Light | All defaults + interactive tables, collapsible sections, callouts, task progress |
| `interactive-dark` | Dark | All defaults + interactive tables, collapsible sections, callouts, task progress |

### What the default templates include

- **TOC sidebar** — all heading levels (H1–H6) with hierarchical indentation and scroll-aware active highlighting.
- **Copy buttons** — fixed-position copy button on every code block that stays put while scrolling horizontally.
- **Syntax highlighting** — code block styling with theme-appropriate colors.
- **Mermaid diagrams** — renders ` ```mermaid ` blocks inline.

### Interactive templates

The **interactive-light** and **interactive-dark** templates add client-side interactivity on top of the defaults:

- **Interactive tables** — search, sort, and paginate every Markdown table.
- **Collapsible sections** — every heading becomes an accordion.
- **Callout blocks** — note, warning, danger, and success callouts.
- **Task progress bars** — live progress above checkbox lists.
- **Cards** — turn lists into a responsive card grid.

Dive into the details on the [Interactivity](./interactive) page.

## Set a default template in settings

```json
{
  "mdstyled.defaultTemplate": "interactive-dark"
}
```

Or run **MdStyled: Set Default Template** to choose interactively.