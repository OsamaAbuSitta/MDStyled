---
sidebar_position: 4
slug: /templates
title: Templates
---

# Templates

Templates give you an instant, polished documentation layout without writing a single line of CSS. They're ready-made examples of the [MdStyled engine](./how-it-works): the output is real HTML you can override, extend, or throw away in favor of your own CSS and JS.

MdStyled ships with three families: **default**, **interactive**, and **editable**. The **editable** templates are the headline option: they combine everything from the interactive templates with in-preview Markdown editing.

## Two ways to use a template

### Two ways to use a template

Templates are just CSS/JS files; applying one is the same as writing your own. You can start from a template, then edit freely or replace it entirely with your own styles and scripts.

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
A file that declares its own styles or scripts always wins; the global default only applies when nothing else resolves.
:::

### Per-file

Run **MdStyled: Apply Template** to copy the theme into `.mdstyled/` and insert `@style` / `@script` directives into that Markdown file. You can then edit the theme freely.

## Available templates

MdStyled ships with six templates:

| Template | Style | Extras |
|---|---|---|
| `default-light` | Light | TOC, copy buttons, syntax highlighting, Mermaid |
| `default-dark` | Dark | TOC, copy buttons, syntax highlighting, Mermaid |
| `interactive-light` | Light | All defaults + interactive tables, collapsible sections, callouts, task progress |
| `interactive-dark` | Dark | All defaults + interactive tables, collapsible sections, callouts, task progress |
| `editable-light` | Light | Everything in interactive + in-preview Markdown editing |
| `editable-dark` | Dark | Everything in interactive + in-preview Markdown editing |

### What the default templates include

- **TOC sidebar**: all heading levels (H1-H6) with hierarchical indentation and scroll-aware active highlighting.
- **Copy buttons**: fixed-position copy button on every code block that stays put while scrolling horizontally.
- **Syntax highlighting**: code block styling with theme-appropriate colors.
- **Mermaid diagrams**: renders ` ```mermaid ` blocks inline.

### Interactive templates

The **interactive-light** and **interactive-dark** templates add client-side interactivity on top of the defaults:

- **Interactive tables**: search, sort, and paginate every Markdown table.
- **Collapsible sections**: every heading becomes an accordion.
- **Callout blocks**: note, warning, danger, and success callouts.
- **Task progress bars**: live progress above checkbox lists.
- **Cards**: turn lists into a responsive card grid.

Dive into the details on the [Interactivity](./interactive) page.

### Editable templates (the main option)

The **editable-light** and **editable-dark** templates are the most complete offering. They include everything from the interactive templates (interactive tables, collapsible sections, callouts, task progress, cards), **plus in-preview Markdown editing**:

- Click **Edit** (the floating button in the corner) to enter edit mode.
- Click any block (paragraph, heading, list, code fence, or table) to edit its Markdown source right in the preview.
- Use **Source** to open the whole Markdown file in a full-window editor.
- Save your changes and the preview re-renders instantly, keeping your scroll position.

Everything is documented on the [Editing](./editing) page. To try it, apply `editable-dark` (or `editable-light`) as your default template, or per file.

## Set a default template in settings

```json
{
  "mdstyled.defaultTemplate": "interactive-dark"
}
```

Or run **MdStyled: Set Default Template** to choose interactively.