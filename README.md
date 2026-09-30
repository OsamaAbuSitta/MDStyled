# MdStyled

**Edit Markdown visually, right inside a beautifully styled preview. Your `.md` files stay clean.**

<p align="center">
  <img src="https://raw.githubusercontent.com/OsamaAbuSitta/MDStyled/main/docs/static/img/editor-demo.gif" alt="Editing a Markdown file in the MdStyled preview: typing into a paragraph, adding a checklist item, adding a table row in the table designer, and adding a card in the card designer" width="800" />
</p>

MdStyled turns any Markdown file into a polished, interactive page inside VS Code, and lets you edit it right there. Every change is written straight back to plain, portable Markdown.

Right-click a `.md` file and choose **MdStyled Edit** to start.

## The editor

- **Click any block to edit it** in rich text: bold, italic, links, colour, emoji, callouts, and a one-click switch to the raw Markdown
- **Lists that behave**: `Enter` adds the next item (with a checkbox in a checklist), `Tab` indents, ticking a box writes `- [x]`
- **Table designer**: edit cells in a grid, add and move rows and columns, align columns, paste from a spreadsheet
- **Card designer**: build card grids, choose columns and rows, add and reorder cards
- **Insert anywhere**: hover between two blocks and click **+**
- **Safe**: edits go to the real file, stale saves are refused, and formatting the editor cannot reproduce opens as Markdown instead of being rewritten

## Themes

Right-click a Markdown file and open **MdStyled Templates**:

| Template | What you get |
|---|---|
| **Editable** (light, dark) | Everything below, plus the editor and designers |
| **Interactive** (light, dark) | Searchable, sortable tables; collapsible sections; callouts; task progress; card grids |
| **Default** (light, dark) | Documentation layout with a table of contents, copy buttons, highlighting, and Mermaid diagrams |

Or set a global default once with **MdStyled: Set Default Template**, and every unstyled file previews with it without any change to the file.

## Style it your way

Every theme is plain CSS and JavaScript, so you can bring your own with invisible comments:

```md
<!-- @style: ./theme.css -->
<!-- @script: ./behavior.js -->

<!-- .hero -->
Build polished Markdown documents with normal web tools.
```

| Syntax | Result |
|---|---|
| `<!-- .class -->` | Add classes to the next block |
| `<!-- #id -->` | Set an `id` on the next block |
| `<!-- [key=value] -->` | Add an attribute to the next block |
| `<!-- @style: ./file.css -->` | Load a CSS file |
| `<!-- @script: ./file.js -->` | Load a JavaScript file |

Frontmatter works too, and files named like the document (`guide.css`, `guide.js`) load automatically.

## Also included

- **Export** to a self-contained HTML page or a print-ready PDF
- **Mermaid diagrams**, copy buttons, and code highlighting
- **Links between documents** open in the preview, with a Back button
- **Zoom** from 60% to 200%

## Settings

| Setting | What it does |
|---|---|
| `mdstyled.defaultTemplate` | Template for files with no styling of their own |
| `mdstyled.editing.enabled` | Set to `false` for read-only previews |
| `mdstyled.extensions.enabled` | Built-in extras: `mermaid`, `copy-code`, `highlight` |

## Contributing

Issues and pull requests are welcome on [GitHub](https://github.com/OsamaAbuSitta/MDStyled). See [CONTRIBUTING.md](https://github.com/OsamaAbuSitta/MDStyled/blob/main/CONTRIBUTING.md) for development setup and the API for writing editable templates.

## License

MIT
