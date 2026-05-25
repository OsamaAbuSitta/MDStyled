<!-- @style: ./default.css -->
<!-- @script: ./default.js -->

<!-- .doc-hero -->
# MDStyled

A reference sample showing MdStyled styled like a documentation site.

## Getting Started

MdStyled lets you style Markdown with plain CSS while keeping the source clean.

<!-- .admonition .admonition-tip -->
> **TIP**
>
> Comment selectors like `<!-- .class -->` apply styles to the next block element without polluting the Markdown source.

## Typography

This sample demonstrates headings, paragraphs, links, and inline code.

The `markdown-it` library handles all the parsing. You can write **bold**, *italic*, ~~strikethrough~~, and `inline code` naturally.

## Admonitions

<!-- .admonition .admonition-note -->
> **NOTE**
>
> This is a standard info note. Use it for supplementary context.

<!-- .admonition .admonition-warning -->
> **WARNING**
>
> This is a warning. Use it for important cautions.

<!-- .admonition .admonition-danger -->
> **DANGER**
>
> This is a danger alert. Reserve it for critical issues.

## Code Blocks

```js
function greet(name) {
  const message = `Hello, ${name}!`;
  console.log(message);
  return message;
}

greet('MdStyled');
```

## Tables

| Feature | Status | Priority |
|---|---|---|
| Comment selectors | Done | High |
| CSS auto-discovery | Done | High |
| JS support | Planned | Medium |
| PDF export | Planned | Low |

## Cards

<!-- @section: doc-card -->
### Why MdStyled?

MdStyled keeps your Markdown clean and AI-friendly while giving you full control over the preview. No HTML soup, no custom syntax.

<!-- @section: doc-card -->
### How it works

Reference CSS in frontmatter, use `<!-- .class -->` comments as selectors, and the engine handles the rest. Simple as that.

## Feature Grid

<!-- @section: doc-card -->
### Clean Markdown

No HTML or custom syntax in your source files.

<!-- @section: doc-card -->
### Standard CSS

Use the CSS you already know.

<!-- @section: doc-card -->
### Auto-discovery

CSS files next to your `.md` are picked up automatically.

<!-- @section: doc-card -->
### Live Preview

See changes instantly in the VS Code Webview.

## API Endpoints

<!-- .endpoint -->
`GET /api/v1/users` — List all users

<!-- .endpoint -->
`POST /api/v1/users` — Create a user

<!-- .endpoint -->
`GET /api/v1/users/:id` — Get user by ID

## Ordered Steps

<!-- @section: steps-list -->
### How to use MdStyled

<!-- .step -->
Open a Markdown file with MdStyled frontmatter.

<!-- .step -->
Click the **MdStyled** button in the status bar.

<!-- .step -->
Watch your styled preview appear.

## Blockquotes

> MdStyled is not a new Markdown format and not a new CSS language.
> It is a bridge between Markdown and normal web technologies.
>
> — MdStyled Specification

## Conclusion

This sample shows what MdStyled can do with just a CSS file and comment selectors. The Markdown source stays perfectly clean — no inline HTML, no custom syntax, no clutter.
