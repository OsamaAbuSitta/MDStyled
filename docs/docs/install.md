---
sidebar_position: 2
slug: /install
title: Installation
---

# Installation

## Install the extension

1. Open **VS Code**.
2. Go to the **Extensions** view (`Cmd`+`Shift`+`X` on macOS, `Ctrl`+`Shift`+`X` on Windows/Linux).
3. Search for **MdStyled**.
4. Click **Install**.

If you have the `.vsix` file from the repository, you can install it manually:

```bash
code --install-extension mdstyled-0.1.5.vsix
```

## Requirements

- VS Code `1.85.0` or newer.
- Node.js `18+` only needed for building from source (see [Development](./development)).

## Your first preview

1. Open any Markdown file.
2. Run **MdStyled: Open Preview** from the command palette (`Cmd`+`Shift`+`P`).

If your file has no styling of its own, MdStyled will ask you to choose a **default template** the first time. Pick `default-light`, `default-dark`, one of the interactive variants, or the **editable** templates — and from then on, unstyled Markdown previews beautifully with that theme.

:::tip
Choose an **editable** template (`editable-dark` or `editable-light`) and your preview becomes editable too — click **Edit** to change blocks right in the styled view. See [In-Preview Editing](./editing).
:::

## Try the starter

Run **MdStyled: Apply Template** to scaffold a starter theme into `.mdstyled/` and insert the `@style` / `@script` directives into your document. Now edit your CSS and watch the preview refresh live.

## What's next?

- Learn how to apply [classes, IDs, and attributes](./syntax) with comment selectors.
- Explore the [built-in templates](./templates).
- Enable the [interactive features](./interactive) for data-heavy documents.