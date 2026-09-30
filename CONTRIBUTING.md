# Contributing to MdStyled

Issues and pull requests are welcome on [GitHub](https://github.com/OsamaAbuSitta/MDStyled).

## Development

```bash
npm install
npm run compile          # one-shot build
npm run watch            # rebuild on change
npm test                 # serializer, write-back, editor, and designer suites
npm run build:templates  # regenerate templates/editable-*
```

The `editable-*` templates are generated from `interactive-*` plus the shared editor in `scripts/editable-template/`. Edit those sources and run `npm run build:templates`; do not hand-edit `templates/editable-*`.

Press `F5` in VS Code to launch the Extension Development Host. `.vscode/launch.json` provides:

| Configuration | What it does |
|---|---|
| **Run Extension** | Builds once, then opens a development host on the current folder |
| **Run Extension (open samples)** | Same, with `samples/` already open so there is Markdown to preview |
| **Run Extension (watch)** | Starts the esbuild watcher first, so edits rebuild while the host runs |

Debugging must go through one of these (`type: extensionHost`). Running `out/extension.js` with the plain Node debugger fails with `Cannot find module 'vscode'`, because that module only exists inside the Extension Host.

## Writing an editable template

Every preview exposes `window.mdstyled`, so any template can offer editing of its own:

```js
var api = window.mdstyled.editor;

if (api.available) {
  // Markdown source for lines [start, end) of the file
  var text = api.getSource(4, 7);

  // render a snippet with the preview's own pipeline
  api.render('## A heading').then(function (html) { /* ... */ });

  // write it back and save the file
  api.saveBlock(4, 7, text + '\n\nAdded from the preview.', text)
    .then(function () { /* the preview re-renders */ });
}
```

| Member | Purpose |
|---|---|
| `available` | Whether this preview can write to the file |
| `lineCount` | Lines in the Markdown file |
| `getSource(start, end)` | The file's lines `[start, end)` |
| `getDocument()` | The whole file |
| `render(markdown)` | Render a snippet to HTML with the preview's pipeline |
| `saveBlock(start, end, text, original)` | Replace lines `[start, end)`; a zero-length range inserts and an empty `text` deletes. `original` is what you loaded: the save is refused if the file no longer matches |
| `setEditorOpen(bool)` | Ask the preview not to re-render over an open editor |

Every top-level block carries `data-mdstyled-line="start,end"` pointing at the lines it came from, and links and images carry `data-mdstyled-uri` with their authored path. `window.mdstyled.getState()` and `setState()` keep small values (scroll position, UI state) across the re-render that follows a save. Writing is gated by `mdstyled.editing.enabled`, which is worth knowing if you run template JavaScript you did not write.
