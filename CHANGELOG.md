# Changelog

All notable changes to the "MdStyled" extension will be documented in this file.

## [Unreleased]

- Added a global default template: Markdown files with no `@style` / `@script` of their own now preview with a template chosen once and stored in user settings (`mdstyled.defaultTemplate`), without writing anything to the Markdown file or the workspace.
- MdStyled asks which template to use as the default on the first preview of an unstyled file; `none` keeps such files unstyled.
- Added the `MdStyled: Set Default Template` command to change the default later.
- Added the `editable-light` and `editable-dark` templates: the interactive templates plus a full in-preview editor.
- Block editing with a rich text surface, a block-type dropdown (text, headings, bullet/numbered/check lists, quote, code), bold / italic / strikethrough / inline code / link buttons, and a toggle to the block's raw Markdown.
- A **+** menu inserts new blocks - headings, text, lists, checklists, quotes, code, tables, dividers - before or after any block, and **Add block** appends at the end of the file.
- Blocks can be deleted from the editor, and a **Source** button still edits the whole file as Markdown.
- Preview blocks now carry `data-mdstyled-line`, and `window.mdstyled.editor` lets any template read, render, and write the Markdown behind the preview.
- Fixed relative `src` / `href` values inside preview scripts being rewritten as webview URIs.

## [0.1.2] - 2026-05-26

- Fixed dark scrollbar appearing in the interactive-light template.

## [0.1.1] - 2026-05-25

- Added interactive-light and interactive-dark templates with client-side interactivity.
- Interactive tables: full-width search, column-specific filtering with autocomplete, sortable headers, and pagination.
- Collapsible accordion sections for all headings (h1–h6) with toggle buttons.
- Table of contents sidebar now includes all heading levels with hierarchical indentation.
- Task progress bars for checkbox lists.
- Callout variants (note, warning, danger, success) with icons.
- Responsive TOC hiding on narrow viewports.
- Improved focus-visible rings and keyboard accessibility across interactive elements.

## [0.1.0] - 2026-05-25

- Initial release of MdStyled.
- Support for external CSS and JS in Markdown previews.
- Comment selectors (`<!-- .class -->`) for styling block elements.
- Built-in extensions for Mermaid, Copy Code, and Highlight.
- Apply Template command for quick setup.
