# Changelog

All notable changes to the "MdStyled" extension will be documented in this file.

## [1.0.1] - 2026-10-01

- The Marketplace page shows the editor demo animation, which did not load in 1.0.0.
- A shorter README focused on the editor; development notes and the template API moved to `CONTRIBUTING.md`.

## [1.0.0] - 2026-09-30

MdStyled 1.0 turns the preview into an editor: click any block of a Markdown file and edit it in place, in a styled page, while the file stays plain Markdown.

### Highlights

- **In-preview editing** with the new `editable-light` and `editable-dark` templates: click a paragraph, heading, list, quote, or code block and edit it in rich text, with the caret where you clicked.
- **Table designer**: edit a table as a grid of cells; insert, move, and delete rows and columns; align columns; paste cells from a spreadsheet. Saves as a padded Markdown table.
- **Card designer**: edit card grids visually; add, duplicate, reorder, and remove cards; choose 1 to 4 columns and add or remove rows.
- **MdStyled Edit**: right-click a Markdown file to open it straight into editing, with the editable theme in light or dark to match VS Code. Nothing is written to the file until you save an edit.
- **Export** a document as a self-contained HTML page or a print-ready PDF.

### Added

- Rich text formatting in the editor: bold, italic, strikethrough, inline code, links, text colour and highlight, and clear formatting.
- Emoji: an emoji panel in the editor, and `:name` suggestions while typing.
- Block type dropdown: turn a block into text, headings 1 to 6, bullet, numbered, and check lists, a quote, a code block, or a table; style it as a Note, Success, Warning, or Danger callout.
- A Markdown toggle on every block, to switch between rich text and the block's raw Markdown.
- Insert lines between blocks: hover any gap and click **+** to add a heading, text, list, checklist, callout, quote, card grid, code block, table, or divider exactly there.
- Lists: `Enter` adds the next item (with a fresh checkbox in a checklist) or splits an item at the caret; `Enter` on an empty item leaves the list, and numbered lists keep counting after it; `Tab` and `Shift`+`Tab` indent and outdent.
- Checkboxes can be ticked in edit mode, writing `- [x]` back to the file and changing nothing else.
- A **Source** button to edit the whole file as Markdown, and delete with a two-click confirm on every block.
- **MdStyled Templates** in the right-click menu of Markdown files (Explorer, editor, and editor tab): apply any of the six templates to the file and open the preview. Editable templates are listed first.
- **Export to...** in the right-click menus, the command palette, and the preview's top bar.
- A global default template: files with no styling of their own preview with a template chosen once and kept in user settings (`mdstyled.defaultTemplate`); MdStyled asks on the first preview of an unstyled file, and `none` keeps such files unstyled.
- `MdStyled: Set Default Template` to change the default later.
- Zoom from 60% to 200% in the preview, with `Ctrl`/`Cmd` and `+`, `-`, `0`.
- Links to other Markdown files open in the preview, with a Back button.
- A column count for `.cards` lists (`<!-- .cards .cols-3 -->`).
- `mdstyled.editing.enabled` (default `true`) to make previews read-only.
- `window.mdstyled.editor` lets any template read, render, and write the Markdown behind the preview; preview blocks carry `data-mdstyled-line`.
- A test suite (`npm test`) and a generator for the editable templates (`npm run build:templates`).

### Changed

- After a save, the preview keeps the edited block in the same place on screen instead of jumping.
- Loose lists (blank lines between items) now open in the rich editor and save with their original spacing.
- Blocks written in a style the rich editor cannot reproduce exactly (hard-wrapped paragraphs, setext headings, `_italic_`, `*` bullets) open as Markdown, so editing never silently restyles the source.
- The block style dropdown is simpler: Divider, Card, Hero, Endpoint, Lead paragraph, and Steps are no longer offered (existing blocks that use them still work), and the insert menu has a single **Cards** entry.
- Editing a heading replaces the whole accordion header row instead of being squeezed into it.
- The status bar item appears for any Markdown file once a global default template is set.
- The README and the documentation site show the editor, with an animated demo.

### Fixed

- Applying a template deleted the file's YAML frontmatter.
- Applying a template did not open or refresh the preview, and changes to files in `.mdstyled/` did not refresh it.
- The preview no longer re-renders over an open editor and discards unsaved text.
- A 3-column card grid wrapped its last card onto a second row in edit mode.
- `Enter` in a checklist put the new checkbox after the text, and in a loose list added a paragraph instead of an item.
- Clicking a list put the caret outside every item.
- An empty list item saved with a stray backslash.
- Rich text editing no longer drops inline HTML, backticks inside code spans, or link and image titles.
- Relative `src` and `href` values inside preview scripts were rewritten as webview URIs.

## [0.1.2] - 2026-05-26

- Fixed dark scrollbar appearing in the interactive-light template.

## [0.1.1] - 2026-05-25

- Added interactive-light and interactive-dark templates with client-side interactivity.
- Interactive tables: full-width search, column-specific filtering with autocomplete, sortable headers, and pagination.
- Collapsible accordion sections for all headings (h1-h6) with toggle buttons.
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
