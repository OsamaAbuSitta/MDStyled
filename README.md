# MdStyled

**Style Markdown previews with external CSS/JS and comment selectors.**

MdStyled is a VS Code extension that lets you style Markdown previews using normal CSS and JavaScript, while keeping the Markdown clean, portable, and AI-friendly.

## Quick start

```bash
npm run compile        # build
```

Press **F5** (or run `code --extensionDevelopmentPath=.`) to launch the Extension Host.

Open any `.md` file, then right-click in the editor → **MdStyled: Apply Template** → select `default-light` or `default-dark`. This creates a `.mdstyled/` folder with the template files and inserts the necessary directives. Click the `MdStyled` status bar button (appears when the file contains MdStyled markers) to preview.

## How it works

Reference CSS and JS files using comment directives at the top of your Markdown:

```md
<!-- @style: ./theme.css -->
<!-- @script: ./behavior.js -->

# My Document

<!-- .cover -->
Welcome to styled Markdown.
```

Invisible HTML comments (`<!-- .cover -->`) act as selectors — they apply classes to the next block element without polluting the output.

You can also use YAML frontmatter instead of comment directives:

```md
---
mdstyled:
  styles:
    - ./theme.css
  scripts:
    - ./behavior.js
---

# My Document
```

### Comment selectors

| Comment | Effect |
|---|---|
| `<!-- .class -->` | Adds `class` to the next block element |
| `<!-- #id -->` | Sets `id` on the next block element |
| `<!-- [key=value] -->` | Sets attribute on the next block element |
| `<!-- .foo .bar -->` | Applies multiple classes |
| `<!-- @section: name -->` | Wraps the following heading + content in `<section class="name">` until the next same-or-higher heading |
| `<!-- @page: name -->` | Wraps entire doc in `<div class="mdstyled-root name">` |

### File references

- `<!-- @style: ./path.css -->` — inject a CSS file
- `<!-- @script: ./path.js -->` — inject a JavaScript file
- Files with the same stem as the `.md` are auto-discovered (`.css`, `.mdstyled`, `.js`, `.mdjs`)

### Configuration priority

When multiple sources define styles or scripts, they merge in this order (later sources win via normal CSS cascade):

1. Workspace config (`mdstyled.config.json`)
2. Frontmatter (`mdstyled:` block)
3. Comment directives (`<!-- @style: ... -->`, `<!-- @script: ... -->`)
4. Auto-discovered matching files

## Extensions

MdStyled ships with built-in extensions that add interactive features to the preview. They're enabled by default — you can disable them or add your own.

| Extension | What it does |
|---|---|
| `mermaid` | Renders ` ```mermaid ` blocks as diagrams (loads Mermaid from local `node_modules`, falling back to CDN) |
| `copy-code` | Adds copy buttons to all code blocks |
| `highlight` | Basic code block font styling |

### Configure in VS Code settings

Open **Settings (JSON)** and add:

```json
{
  "mdstyled.extensions.enabled": ["mermaid", "copy-code"]
}
```

This disables `highlight` while keeping diagram rendering and copy buttons.

### Adding custom extensions

To add your own extension, place CSS/JS files in your project and inject them via comment directives:

```md
<!-- @style: ./.mdstyled/my-ext/style.css -->
<!-- @script: ./.mdstyled/my-ext/script.js -->
```

Or for project-wide defaults, create a `mdstyled.config.json` next to your `.md` file:

```json
{
  "styles": [".mdstyled/my-ext/style.css"],
  "scripts": [".mdstyled/my-ext/script.js"]
}
```

## Commands

| Command | What it does |
|---|---|
| `MdStyled: Open Preview` | Opens styled preview in current tab |
| `MdStyled: Open Preview to Side` | Opens styled preview in a split editor |
| `MdStyled: Apply Template` | Creates `.mdstyled/` folder with template assets and inserts directives |

All commands also available via the M icon in the editor toolbar (when an MdStyled file is open), the status bar, and the right-click context menu.

## Samples

| File | What it shows |
|---|---|
| `samples/basic.md` | Minimal styled document with paired CSS |
| `samples/test-all.md` | Every Markdown element styled with comment selectors |
| `samples/docusaurus.md` | Documentation theme with TOC sidebar via JS |
| `samples/rcm-deployment.md` | Styled deployment guide with section wrappers |
| `samples/test-diagram.md` | Mermaid diagram rendering |

Open any sample and click the `MdStyled` status bar button to preview.

## Development

```bash
npm run compile    # build once
npm run watch      # auto-rebuild on save
```

Press **F5** to launch the Extension Host with debugger attached.

## License

MIT
