---
sidebar_position: 7
slug: /commands
title: Commands
---

# Commands

MdStyled adds four commands to the VS Code command palette (`Cmd`+`Shift`+`P` / `Ctrl`+`Shift`+`P`).

| Command | Description |
|---|---|
| **MdStyled: Open Preview** | Open the styled preview in the current editor area |
| **MdStyled: Open Preview to Side** | Open the styled preview beside the current editor |
| **MdStyled: Apply Template** | Create a starter `.mdstyled/` folder and insert directives |
| **MdStyled: Set Default Template** | Choose the global default template for files with no styling |

## Quick access

When you have a Markdown file open, the **MdStyled: Open Preview** button appears in the editor title bar.

## Settings

| Setting | Purpose | Default |
|---|---|---|
| `mdstyled.defaultTemplate` | Template used when a file has no styling | `""` (asked once) |
| `mdstyled.extensions.enabled` | Built-in extensions to enable | `["mermaid", "copy-code", "highlight"]` |

### Default template

```json
{
  "mdstyled.defaultTemplate": "editable-dark"
}
```

Valid values: `none`, `default-light`, `default-dark`, `interactive-light`, `interactive-dark`, `editable-light`, `editable-dark`.

Leaving it empty makes MdStyled ask once on the first preview of an unstyled file.

### Extensions

Toggle built-in preview extensions:

```json
{
  "mdstyled.extensions.enabled": ["mermaid", "copy-code", "highlight"]
}
```

See [Built-in Extras](./extras) for details.