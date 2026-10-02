/**
 * `preview` opens a Markdown document in the VS Code-like preview harness and gives
 * tests the few moves they need: turn on editing, open a block, save and wait for the
 * re-render, and read the file back.
 */
const fs = require('fs');
const base = require('@playwright/test');
const { startPreview } = require('../harness/preview');

const test = base.test.extend({
  preview: async ({ page }, use, testInfo) => {
    let server = null;
    let file = null;

    const preview = {
      page,
      async open(markdown, options = {}) {
        file = testInfo.outputPath(options.name || 'doc.md');
        fs.writeFileSync(file, markdown);
        server = await startPreview({ file, ...options });
        await page.goto(server.url);
        await page.locator('.mdstyled-root').waitFor();
        return preview;
      },
      read: () => fs.readFileSync(file, 'utf8'),
      write: text => fs.writeFileSync(file, text),
      get server() { return server; },

      async edit() {
        const toggle = page.locator('.mdstyled-edit-toggle');
        if ((await toggle.getAttribute('aria-pressed')) !== 'true') await toggle.click();
        await base.expect(page.locator('body')).toHaveClass(/mdstyled-edit-mode/);
      },

      /** The rendered block holding `text`. */
      block(text) {
        return page.locator('.mdstyled-root .mdstyled-editable').filter({ hasText: text }).first();
      },

      /** Clicks `text` inside its block, opening the block editor with the caret there. */
      async openBlock(text) {
        await preview.edit();
        await page.locator('.mdstyled-root .mdstyled-editable').getByText(text, { exact: false }).first().click();
        await page.locator('.mdstyled-block-editor').waitFor();
        return page.locator('.mdstyled-block-editor');
      },

      /**
       * Clicks the middle of `text` on the rendered page (a real click on the characters,
       * not the centre of the row around them) and waits for the block editor.
       */
      async openText(text, { at = 0.5 } = {}) {
        await preview.edit();
        const point = await page.evaluate(({ text, at }) => {
          const walker = document.createTreeWalker(document.querySelector('.mdstyled-root'), NodeFilter.SHOW_TEXT);
          let node;
          while ((node = walker.nextNode())) {
            const i = node.nodeValue.indexOf(text);
            if (i === -1 || node.parentElement.closest('.mdstyled-block-editor')) continue;
            const range = document.createRange();
            range.setStart(node, i);
            range.setEnd(node, i + text.length);
            const box = range.getBoundingClientRect();
            return { x: box.x + box.width * at, y: box.y + box.height / 2 };
          }
          return null;
        }, { text, at });
        if (!point) throw new Error('No text "' + text + '" on the page');
        await page.mouse.click(point.x, point.y);
        await page.locator('.mdstyled-block-editor').waitFor();
        // the surface is filled and focused a moment later, once the block has been rendered into it
        await page.waitForFunction(() => {
          const a = document.activeElement;
          return a && a.closest('.mdstyled-block-editor') && (a.tagName === 'TEXTAREA' || (a.classList.contains('mdstyled-rich') && a.firstChild));
        });
        return page.locator('.mdstyled-block-editor');
      },

      /** Where the caret is in the open rich editor: its list item or block, and the text either side. */
      caret() {
        return page.evaluate(() => {
          const rich = document.querySelector('.mdstyled-block-editor .mdstyled-rich');
          const sel = getSelection();
          if (!rich || !sel.rangeCount || !rich.contains(sel.anchorNode)) return null;
          const range = sel.getRangeAt(0);
          const node = range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer;
          const block = node.closest('li') || node.closest('p, h1, h2, h3, h4, h5, h6, blockquote') || rich;
          const clean = t => t.replace(/\s+/g, ' ').trim();
          const before = document.createRange();
          before.selectNodeContents(block);
          before.setEnd(range.startContainer, range.startOffset);
          const after = document.createRange();
          after.selectNodeContents(block);
          after.setStart(range.startContainer, range.startOffset);
          const strip = frag => { const d = document.createElement('div'); d.appendChild(frag); d.querySelectorAll('input, ul, ol').forEach(n => n.remove()); return clean(d.textContent); };
          return { item: clean([...block.childNodes].filter(n => !(n.nodeType === 1 && /^(UL|OL|INPUT)$/.test(n.tagName))).map(n => n.textContent).join('')), before: strip(before.cloneContents()), after: strip(after.cloneContents()) };
        });
      },

      editor: () => page.locator('.mdstyled-block-editor'),
      rich: () => page.locator('.mdstyled-block-editor .mdstyled-rich'),

      /** Runs `action` (a save, an insert, a tick) and waits for the re-render it causes. */
      async rerender(action) {
        const loaded = page.waitForEvent('load', { timeout: 8000 });
        await action();
        await loaded;
        await page.locator('.mdstyled-root').waitFor();
      },

      /** Saves the open editor with the keyboard shortcut and waits for the re-render. */
      async save() {
        await preview.rerender(() => page.keyboard.press('ControlOrMeta+Enter'));
      },
    };

    await use(preview);
    if (server) await server.close();
  },
});

module.exports = { test, expect: base.expect };
