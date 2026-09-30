---
sidebar_position: 6
slug: /editing
title: In-Preview Editing
---

# In-Preview Editing

The **editable-light** and **editable-dark** templates add full Markdown editing right inside the preview. This is the headline MdStyled workflow: styling *and* editing without ever leaving the styled view.

## How it works

When you preview a file with an editable template, a small toolbar floats at the bottom-right of the preview:

- **✎ Edit**: toggles edit mode.
- **Source**: opens the whole Markdown file in a full-window editor.

## Editing a block

1. Click **Edit** to enter edit mode. Every editable block is outlined on hover.
2. Click any block: paragraph, heading, list, blockquote, code fence, or table.
3. A textarea opens with that block's Markdown source.
4. Make your edits, then **Save** (or press `Ctrl`/`Cmd`+`Enter`).

The preview re-renders instantly and your scroll position is preserved. Press **Cancel** or `Esc` to discard the edit.

## Editing the whole file

Click **Source** to open the entire Markdown document in a full-window textarea. Save with the button or `Ctrl`/`Cmd`+`Enter`. This is handy for large edits or restructuring.

## Edits are real

Edits are written back to the actual Markdown file on disk. This is not a throwaway preview mock. Reopen the file in the editor and your changes are there.

## What works with the editor

The editable templates inherit everything from the [interactive templates](./interactive):

- Interactive tables (search, sort, pagination): the table's controls belong to the block while you edit it.
- Collapsible sections: every heading is an accordion.
- Callouts, task progress bars, and card grids.

When you enter edit mode, interactive controls stay functional so you can tweak the surrounding document while editing.

## A note on checkboxes

Interactive task checkboxes don't write back to the source file; only the block and whole-file editors do. Use the **Edit** / **Source** tools to persist task list changes.

## Best workflow

1. Set an editable template as your [global default](./templates#set-a-default-template-in-settings), for example `editable-dark`.
2. Preview any Markdown file and it's instantly styled *and* editable.
3. Style with `@style` / `@script` directives, structure with selectors, and refine prose right in the preview.