---
sidebar_position: 3
slug: /syntax
title: Core Syntax
---

# Core Syntax

This is the control language for the [MdStyled engine](./how-it-works): how you attach CSS and JavaScript to your polished HTML output, and how you target blocks with classes, IDs, and attributes — all from invisible comments that never appear in the result.

## Directives — attach styles and scripts

```md
<!-- @style: ./theme.css -->
<!-- @script: ./behavior.js -->
```

You can also use frontmatter:

```md
---
mdstyled:
  styles:
    - ./theme.css
  scripts:
    - ./behavior.js
---
```

Use as many as you like — each one loads an additional asset.

## Selectors — style the next block

Selectors apply to the *next renderable block* and are removed from the preview.

```md
<!-- .callout -->
Important note

<!-- #hero -->
# Landing Page

<!-- [data-theme=dark] -->
## Themed section
```

| Syntax | Result |
|---|---|
| `<!-- .class -->` | Adds one or more classes to the next block |
| `<!-- #id -->` | Sets an `id` on the next block |
| `<!-- [key=value] -->` | Adds an attribute to the next block |

### Multiple selectors and combinations

You can combine them in one comment:

```md
<!-- .callout #special [role=note] -->
```

Or stack several comments — they all apply to the next block.

## Structural directives

Beyond styles and scripts, two directives shape your document structure:

```md
<!-- @section: intro -->
Wraps the following heading and content in a named `<section>`.

<!-- @page: report -->
Wraps the full document in `<div class="mdstyled-root report">`.
```

| Directive | Effect |
|---|---|
| `<!-- @section: name -->` | Wrap the following heading & content in a named `<section>` |
| `<!-- @page: name -->` | Wrap the whole document in `<div class="mdstyled-root name">` |

## Auto-discovery

If a Markdown file has matching companion files, MdStyled can load them automatically — no directives needed:

- `example.md` → `example.css`
- `example.md` → `example.js`
- `example.md` → `example.mdstyled`
- `example.md` → `example.mdjs`

You can also define shared defaults with `mdstyled.config.json`.

## Full reference

| Syntax | Result |
|---|---|
| `<!-- .class -->` | Add one or more classes to the next block |
| `<!-- #id -->` | Set an `id` on the next block |
| `<!-- [key=value] -->` | Add an attribute to the next block |
| `<!-- @style: ./file.css -->` | Load a CSS file into the preview |
| `<!-- @script: ./file.js -->` | Load a JS file into the preview |
| `<!-- @section: name -->` | Wrap the following heading and content in a named `<section>` |
| `<!-- @page: name -->` | Wrap the full document in `<div class="mdstyled-root name">` |

## Tips

- Comments are only treated as directives/selectors when they start with `.`, `#`, `@`, or `[`. A normal comment like `<!-- just a note -->` stays in place and is ignored.
- Selectors apply to the *next* renderable block — paragraphs, lists, blockquotes, code blocks, and headings.
- Combine with [templates](./templates) for instant structure, and add your own classes on top.