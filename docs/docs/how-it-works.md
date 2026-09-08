---
sidebar_position: 10
slug: /how-it-works
title: How It Works
---

# How It Works

Under the hood, MdStyled is a conversion engine: it transforms Markdown into a **real HTML document**, then lets you style and script that document with external CSS and JS. Think of it as *Markdown → HTML + your own CSS/JS*.

Templates, interactive tables, and editing are all built *on top* of this engine — the engine itself is completely open, so you can produce whatever you can build with HTML, CSS, and JavaScript.

## Pipeline

```mermaid
flowchart LR
    A[Markdown file] --> B[Parse comments]
    B --> C[Transform AST]
    C --> D[Render HTML]
    D --> E[Inject CSS/JS]
    E --> F[Live preview]
```

1. **Parse** — MdStyled reads the Markdown and finds comment directives (`@style`, `@script`, `@page`, `@section`) and selector comments (`.class`, `#id`, `[attr]`).
2. **Transform** — the Markdown AST is annotated: classes, IDs, and attributes attach to the next block; sections and page wrappers wrap content.
3. **Render** — the transformed AST renders to HTML.
4. **Inject** — the styles and scripts you attached are loaded from disk into the preview, making the result a fully styled, scriptable HTML document.
5. **Refresh** — editing the Markdown, CSS, or JS updates the preview live.

## It's an engine, not a template

The six bundled templates only demonstrate the engine. Because the output is real HTML driven by external CSS and JS, you can build anything you would build for the web — branding systems, dashboards, printable layouts, you name it. Whatever you attach with `@style` and `@script` runs at full power.

## Selectors on blocks

Selectors are applied to the next *renderable* block — paragraph, list, blockquote, heading, or code fence. The comment itself never reaches the output.

## Safe vs. trusted mode

MdStyled works in two modes:

- **Safe** — HTML is sanitized before injection to prevent unsafe content.
- **Trusted** — for documents you fully control, sanitization is relaxed.

## Security

MdStyled uses HTML sanitization when rendering previews. Your external CSS and JS are loaded with full power *in your own VS Code*, but the Markdown-to-HTML path is sanitized so untrusted Markdown cannot inject scriptable content into the preview. Treat the preview as `file://`-like local context, and only attach scripts you trust.