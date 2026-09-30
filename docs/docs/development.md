---
sidebar_position: 11
slug: /development
title: Development
---

# Development

MdStyled is written in TypeScript and bundled with esbuild.

## Setup

```bash
git clone https://github.com/OsamaAbuSitta/MDStyled.git
cd MDStyled
npm install
```

## Compile & watch

```bash
npm run compile    # one-time build
npm run watch      # rebuild on changes
```

## Run locally

Press `F5` in VS Code to launch an **Extension Development Host** for testing. The extension activates on Markdown files.

## Layout

```
src/
├── engine/
│   ├── config.ts        # mdstyled.config.json resolution
│   ├── extensions.ts    # built-in preview extensions
│   ├── index.ts
│   ├── parser.ts        # comment parsing (directives + selectors)
│   ├── renderer.ts      # markdown-it rendering
│   ├── transformer.ts   # AST annotation
│   └── types.ts
├── defaultTemplate.ts
├── extension.ts         # activation + commands
├── previewProvider.ts   # Webview preview
└── templates.ts
templates/               # bundled theme templates
samples/                 # example Markdown files
```

## Tests

```bash
npm test
```

## Docs

This documentation site lives in `docs/` and is built with [Docusaurus](https://docusaurus.io).

```bash
cd docs
npm install
npm start    # local dev server
npm run build
```

## License

[MIT](https://github.com/OsamaAbuSitta/MDStyled/blob/main/LICENSE)