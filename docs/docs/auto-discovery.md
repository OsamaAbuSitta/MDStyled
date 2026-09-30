---
sidebar_position: 8
slug: /auto-discovery
title: Auto-discovery
---

# Auto-discovery

MdStyled can load companion files automatically when they share a name with your Markdown document:

| Companion file | What it does |
|---|---|
| `example.md` → `example.css` | Loads the stylesheet automatically |
| `example.md` → `example.js` | Loads the script automatically |
| `example.md` → `example.mdstyled` | Legacy companion styles |
| `example.md` → `example.mdjs` | Legacy companion scripts |

No directives, no frontmatter. Just match the filename and MdStyled wires it up.

## Example

```
docs/
├── product-brief.md
├── product-brief.css
└── product-brief.js
```

Opening `product-brief.md` automatically applies `product-brief.css` and `product-brief.js` to the preview.

## Shared defaults with mdstyled.config.json

Define default styles and scripts that apply across your project:

```json
{
  "styles": ["./site.css", "./brand.css"],
  "scripts": ["./site.js"]
}
```

MdStyled keeps resolution predictable:

1. Explicit `@style` / `@script` directives in the file
2. Frontmatter `mdstyled` block
3. `mdstyled.config.json`
4. Auto-discovered companion files
5. Global default template (only if everything above resolves to nothing)