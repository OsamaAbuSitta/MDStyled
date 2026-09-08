---
sidebar_position: 1
slug: /intro
title: Introduction
---

# Introduction

**MdStyled** is a VS Code extension that lets you style Markdown previews with real CSS and JavaScript — all while keeping your source files clean, portable, and AI-friendly.

## The idea

Markdown is the perfect format for portable, version-controlled documents. But when you want rich, branded, or interactive previews, you usually end up doing one of two things:

- Students of **cramming** — inline HTML, inline styles, and noisy markup inside the Markdown.
- Or students of **leaving** — exporting to another tool entirely, and losing portability.

MdStyled gives you a third option: *keep writing clean Markdown, and move your styling to external assets.*

```md title="your-document.md"
<!-- @style: ./theme.css -->
<!-- @script: ./behavior.js -->

# Product Brief

<!-- .hero -->
Build polished Markdown documents with normal web tools.
```

```css title="theme.css"
.hero {
  padding: 1rem 1.25rem;
  border-left: 4px solid #2563eb;
  background: #eff6ff;
  font-size: 1.1rem;
}
```

Open the preview with **MdStyled: Open Preview** and the paragraph under `# Product Brief` renders with the `hero` class applied — no markup pollution in your document.

## What you can build

| Use case | Example |
|---|---|
| **Documentation** | Branded, styled docs with real themes |
| **Slide-like pages** | Sectioned, styled layouts for presentations |
| **Reports** | Data-heavy pages with styled tables and diagrams |
| **Interactive notes** | Live, searchable, sortable note-taking |
| **Internal wikis** | Consistent visual identity across many files |

## Philosophy

- **Keep Markdown clean** — style the preview, not the document.
- **Use real web tools** — CSS and JS you already know.
- **Stay portable & AI-friendly** — source files remain simple and tool-agnostic.
- **Preview in VS Code** — no context switching, live refresh.

## Next steps

- [Install MdStyled](./install) and open your first preview.
- Learn the [core syntax](./syntax) — selectors and directives.
- Explore [templates](./templates) for instant documentation layouts.
- See the [interactive templates](./interactive) in action.