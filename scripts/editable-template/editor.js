
  /* ═══════════════════════════════════════
     In-preview editor
     ═══════════════════════════════════════ */

  var SCROLL_SAVE_MS = 250;

  var BLOCK_TOOLS = [
    { type: 'p', icon: 'text', label: 'Text' },
    { type: 'h1', glyph: 'H1', label: 'Heading 1' },
    { type: 'h2', glyph: 'H2', label: 'Heading 2' },
    { type: 'h3', glyph: 'H3', label: 'Heading 3' },
    { type: 'ul', icon: 'bullet', label: 'Bullet list' },
    { type: 'ol', icon: 'numbered', label: 'Numbered list' },
    { type: 'task', icon: 'checklist', label: 'Checklist' },
    { type: 'quote', icon: 'quote', label: 'Quote' },
    { type: 'code', icon: 'code', label: 'Code block' }
  ];

  var INLINE_TOOLS = [
    { action: 'bold', command: 'bold', marker: '**', icon: 'bold', label: 'Bold', shortcut: 'Ctrl/Cmd+B' },
    { action: 'italic', command: 'italic', marker: '*', icon: 'italic', label: 'Italic', shortcut: 'Ctrl/Cmd+I' },
    { action: 'strike', command: 'strikeThrough', marker: '~~', icon: 'strike', label: 'Strikethrough' },
    { action: 'code', marker: '`', icon: 'code', label: 'Inline code' },
    { action: 'link', icon: 'link', label: 'Link' },
    { action: 'color', icon: 'color', label: 'Colour' },
    { action: 'clear', icon: 'clear', label: 'Clear formatting' }
  ];

  var SWATCH_GROUPS = [
    {
      title: 'Text',
      property: 'color',
      colors: [
        { label: 'Red', value: '#e11d48' },
        { label: 'Orange', value: '#ea580c' },
        { label: 'Green', value: '#15803d' },
        { label: 'Blue', value: '#2563eb' },
        { label: 'Purple', value: '#7c3aed' },
        { label: 'Grey', value: '#64748b' }
      ]
    },
    {
      title: 'Highlight',
      property: 'background-color',
      colors: [
        { label: 'Yellow', value: '#fef08a' },
        { label: 'Green', value: '#bbf7d0' },
        { label: 'Blue', value: '#bfdbfe' },
        { label: 'Pink', value: '#fbcfe8' },
        { label: 'Orange', value: '#fed7aa' },
        { label: 'Grey', value: '#e2e8f0' }
      ]
    }
  ];

  /* Starting content for a block added from a + menu. */
  var INSERT_GROUPS = [
    {
      title: 'Text',
      items: [
        { label: 'Text', icon: 'text', markdown: 'Write something.' },
        { label: 'Heading 1', glyph: 'H1', markdown: '# Heading' },
        { label: 'Heading 2', glyph: 'H2', markdown: '## Heading' },
        { label: 'Heading 3', glyph: 'H3', markdown: '### Heading' }
      ]
    },
    {
      title: 'Lists',
      items: [
        { label: 'Bullet list', icon: 'bullet', markdown: '- First item\n- Second item' },
        { label: 'Numbered list', icon: 'numbered', markdown: '1. First item\n2. Second item' },
        { label: 'Checklist', icon: 'checklist', markdown: '- [ ] First task\n- [ ] Second task' }
      ]
    },
    {
      title: 'Callouts',
      items: [
        { label: 'Note', icon: 'callout', markdown: '<!-- .note -->\n> **Note** - something worth knowing.' },
        { label: 'Success', icon: 'check', markdown: '<!-- .success -->\n> **Done** - this worked.' },
        { label: 'Warning', icon: 'callout', markdown: '<!-- .warning -->\n> **Careful** - read this first.' },
        { label: 'Danger', icon: 'close', markdown: '<!-- .danger -->\n> **Stop** - this will break something.' }
      ]
    },
    {
      title: 'Blocks',
      items: [
        { label: 'Quote', icon: 'quote', markdown: '> Quoted text' },
        { label: 'Card', icon: 'card', markdown: '<!-- .card -->\n> ### Card title\n>\n> What this card is about.' },
        { label: 'Half card', icon: 'card', markdown: '<!-- .card .half -->\n> ### Card title\n>\n> Two of these sit side by side.' },
        { label: 'Code block', icon: 'code', markdown: '```js\nconsole.log("hello");\n```' },
        { label: 'Table', icon: 'table', markdown: '| Column | Column |\n| --- | --- |\n| Cell | Cell |' },
        { label: 'Divider', icon: 'divider', markdown: '---' }
      ]
    }
  ];


  /* ═══════════════════════════════════════
     Icons
     ═══════════════════════════════════════ */

  var ICONS = {
    text: 'M13 4v16M17 4H9.5a4 4 0 0 0 0 8H13M17 4v16',
    bullet: 'M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01',
    numbered: 'M10 6h11M10 12h11M10 18h11M4 4h1v4M4 8h2M6 14H4v2h2v2H4',
    checklist: 'M3 7l1.8 1.8L8 5.5M3 17l1.8 1.8L8 15.5M12 6.5h9M12 17.5h9',
    quote: 'M7 15H4.5A1.5 1.5 0 0 1 3 13.5V11a4 4 0 0 1 4-4M17 15h-2.5a1.5 1.5 0 0 1-1.5-1.5V11a4 4 0 0 1 4-4M7 15l-2 5M17 15l-2 5',
    code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
    braces: 'M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1',
    bold: 'M7 4h7a4 4 0 0 1 0 8H7zM7 12h8a4 4 0 0 1 0 8H7z',
    italic: 'M19 4h-8M13 20H5M15 4L9 20',
    strike: 'M4 12h16M16.5 7A4 4 0 0 0 13 5h-2a3 3 0 0 0-1.2 5.7M8 16a4 4 0 0 0 3.5 2h1.5a3 3 0 0 0 2.2-5',
    link: 'M10 13a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1L11.4 4.6M14 11a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1l1.5-1.5',
    color: 'M5 18l6-13 6 13M8 13h6',
    clear: 'M8 6h13M11 6l-2 12M4 20h8M17 13l5 5M22 13l-5 5',
    callout: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 8h.01M11.5 12h.5v4h.5',
    card: 'M4 5h16v14H4zM4 9.5h16',
    table: 'M3 5h18v14H3zM3 10h18M9.5 5v14',
    divider: 'M3 12h18',
    plus: 'M12 5v14M5 12h14',
    pencil: 'M12 20h9M16.4 3.6a2.1 2.1 0 0 1 3 3L7.5 18.5 3.5 20l1.5-4z',
    trash: 'M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14',
    check: 'M4 12l5 5L20 6',
    close: 'M6 6l12 12M18 6L6 18'
  };

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function icon(name) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.9');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'mdstyled-icon');

    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', ICONS[name] || '');
    svg.appendChild(path);
    return svg;
  }

  /* A button that shows an icon (or a short glyph like H1) and reads as its label. */
  function toolButton(config) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'mdstyled-tool' + (config.className ? ' ' + config.className : '');
    b.title = config.label + (config.shortcut ? ' (' + config.shortcut + ')' : '');
    b.setAttribute('aria-label', config.label);

    if (config.icon) {
      b.appendChild(icon(config.icon));
    } else {
      b.appendChild(el('span', 'mdstyled-tool-glyph', config.glyph));
    }
    return b;
  }

  function patchState(patch) {
    if (!window.mdstyled || !window.mdstyled.setState) return;
    var next = window.mdstyled.getState();
    Object.keys(patch).forEach(function (k) { next[k] = patch[k]; });
    window.mdstyled.setState(next);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function button(label, className, title) {
    var b = el('button', 'mdstyled-edit-btn' + (className ? ' ' + className : ''), label);
    b.type = 'button';
    if (title) b.title = title;
    return b;
  }

  /* execCommand is deprecated but is still the only practical rich-text primitive
     in a webview. It is missing in some hosts, so never let it break the editor. */
  function exec(command, value) {
    try {
      if (typeof document.execCommand !== 'function') return false;
      return document.execCommand(command, false, value === undefined ? null : value);
    } catch (err) {
      return false;
    }
  }

  function autosize(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.max(ta.scrollHeight, 72) + 'px';
  }

  function initEditing() {
    var root = document.querySelector('.mdstyled-root');
    if (!root) return;

    var state = (window.mdstyled && window.mdstyled.getState) ? window.mdstyled.getState() : {};

    /* Every save re-renders the preview, so keep the reading position across reloads. */
    var scrollTimer = null;
    window.addEventListener('scroll', function () {
      if (scrollTimer) return;
      scrollTimer = setTimeout(function () {
        scrollTimer = null;
        patchState({ scrollY: window.scrollY });
      }, SCROLL_SAVE_MS);
    });
    if (typeof state.scrollY === 'number' && state.scrollY > 0) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { window.scrollTo(0, state.scrollY); });
      });
    }

    var api = window.mdstyled && window.mdstyled.editor;
    if (!api || !api.available) return;

    /* ── Editable blocks ── */

    var hosts = [];
    root.querySelectorAll('[data-mdstyled-line]').forEach(function (node) {
      var parts = (node.getAttribute('data-mdstyled-line') || '').split(',');
      var start = parseInt(parts[0], 10);
      var end = parseInt(parts[1], 10);
      if (isNaN(start) || isNaN(end)) return;

      /* A fence carries the attribute on <code>, and tables have been wrapped by now. */
      var host = node;
      if (host.tagName === 'CODE' && host.parentElement && host.parentElement.tagName === 'PRE') {
        host = host.parentElement;
      }
      if (host.tagName === 'TABLE' && host.parentElement && host.parentElement.classList.contains('table-wrapper')) {
        host = host.parentElement;
      }

      host.classList.add('mdstyled-editable');
      host.setAttribute('data-mdstyled-start', String(start));
      host.setAttribute('data-mdstyled-end', String(end));
      hosts.push(host);
    });

    /* Controls the interactive template adds around a block belong to it while editing. */
    function groupFor(host) {
      /* The interactive template moves headings into a flex `.accordion-header` row.
         Editing one has to replace that whole row, not just the heading inside it. */
      var header = host.closest ? host.closest('.accordion-header') : null;
      var group = [header || host];
      host = header || host;
      var prev = host.previousElementSibling;
      if (prev && (prev.classList.contains('table-interactive-controls') || prev.classList.contains('task-progress'))) {
        group.unshift(prev);
      }
      var next = host.nextElementSibling;
      if (next && next.classList.contains('table-pagination')) group.push(next);
      return group;
    }

    buildInsertLines();

    /* ── Toolbar ── */

    var bar = el('div', 'mdstyled-edit-bar');

    var toggleBtn = button('Edit', 'mdstyled-edit-toggle', 'Click any block to edit it in place');
    toggleBtn.setAttribute('aria-pressed', 'false');
    var pencil = el('span', 'mdstyled-edit-icon', '✎');
    pencil.setAttribute('aria-hidden', 'true');
    toggleBtn.insertBefore(pencil, toggleBtn.firstChild);

    var sourceBtn = button('Source', 'mdstyled-edit-source', 'Edit the whole Markdown file');

    bar.appendChild(toggleBtn);
    bar.appendChild(sourceBtn);
    document.body.appendChild(bar);

    /* ── Insert menu ── */

    var menu = el('div', 'mdstyled-insert-menu');
    menu.hidden = true;
    menu.setAttribute('role', 'menu');
    document.body.appendChild(menu);

    var menuTargetLine = null;

    INSERT_GROUPS.forEach(function (group) {
      menu.appendChild(el('div', 'mdstyled-insert-title', group.title));

      group.items.forEach(function (item) {
        var b = toolButton({ icon: item.icon, glyph: item.glyph, label: item.label, className: 'mdstyled-insert-item' });
        b.appendChild(el('span', 'mdstyled-tool-text', item.label));
        b.setAttribute('role', 'menuitem');
        b.addEventListener('click', function () {
          var line = menuTargetLine;
          hideMenu();
          if (line == null) return;
          insertBlock(line, item.markdown);
        });
        menu.appendChild(b);
      });
    });

    function showMenu(anchor, line) {
      menuTargetLine = line;
      menu.hidden = false;
      var rect = anchor.getBoundingClientRect();
      var top = rect.bottom + window.scrollY + 6;
      var left = Math.max(8, Math.min(rect.left + window.scrollX, window.scrollX + window.innerWidth - menu.offsetWidth - 8));
      /* Flip above the anchor when there is no room below. */
      if (rect.bottom + menu.offsetHeight + 16 > window.innerHeight) {
        top = rect.top + window.scrollY - menu.offsetHeight - 6;
      }
      menu.style.top = Math.max(8, top) + 'px';
      menu.style.left = left + 'px';
    }

    function hideMenu() {
      menu.hidden = true;
      menuTargetLine = null;
    }

    document.addEventListener('click', function (e) {
      if (menu.hidden) return;
      if (e.target.closest('.mdstyled-insert-menu, .mdstyled-insert-line')) return;
      hideMenu();
    });

    /* An insert line sits in the gap above and below every block, so a new block can
       go exactly where it is wanted. They are laid out with negative margins, so
       showing them does not move the document. */
    function buildInsertLines() {
      var points = [];

      if (hosts.length === 0) {
        points.push({ line: 0, anchor: root, position: 'append' });
      } else {
        var firstGroup = groupFor(hosts[0]);
        points.push({
          line: parseInt(hosts[0].getAttribute('data-mdstyled-start'), 10),
          anchor: firstGroup[0],
          position: 'before'
        });

        hosts.forEach(function (host) {
          var group = groupFor(host);
          points.push({
            line: parseInt(host.getAttribute('data-mdstyled-end'), 10),
            anchor: group[group.length - 1],
            position: 'after'
          });
        });
      }

      points.forEach(function (point) {
        if (isNaN(point.line)) return;

        var strip = el('div', 'mdstyled-insert-line');
        var plus = button('+', 'mdstyled-insert-plus');
        plus.setAttribute('aria-label', 'Insert a block here');
        plus.title = 'Insert a block here';
        strip.appendChild(plus);

        plus.addEventListener('click', function (e) {
          e.stopPropagation();
          showMenu(plus, point.line);
        });

        if (point.position === 'append') {
          point.anchor.appendChild(strip);
        } else if (point.position === 'before') {
          point.anchor.parentNode.insertBefore(strip, point.anchor);
        } else {
          point.anchor.parentNode.insertBefore(strip, point.anchor.nextSibling);
        }
      });
    }

    /* Text goes in at the start of `line`, so it needs a blank line on whichever side
       does not already have one - otherwise the new block merges with its neighbour. */
    function insertBlock(line, markdown) {
      var lineCount = api.lineCount;
      var prefix, suffix, focusLine;

      if (line >= lineCount) {
        /* Straight onto the end of the file. Its final empty line, if it has one, is
           the trailing newline rather than a blank separator. */
        var fileEndsBlank = lineCount > 0 && api.getSource(lineCount - 1, lineCount).trim() === '';
        prefix = fileEndsBlank ? '\n' : '\n\n';
        suffix = '';
        focusLine = fileEndsBlank ? line : line + 1;
      } else {
        var prevBlank = line <= 0 || api.getSource(line - 1, line).trim() === '';
        var nextBlank = api.getSource(line, line + 1).trim() === '';
        prefix = prevBlank ? '' : '\n';
        suffix = nextBlank ? '' : '\n\n';
        focusLine = prevBlank ? line : line + 1;
      }

      api.saveBlock(line, line, prefix + markdown + suffix, '').then(function () {
        patchState({ focusLine: focusLine, editMode: true, scrollY: window.scrollY });
      }, function (err) {
        reportError(err);
      });
    }

    function reportError(err) {
      var message = (err && err.message) ? err.message : 'Something went wrong.';
      var toast = el('div', 'mdstyled-edit-toast', message);
      document.body.appendChild(toast);
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 5000);
    }

    /* ── Task checkboxes ── */

    /* Rewrite just the one marker so nothing else about the list's source changes. */
    var TASK_MARKER = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\].*)$/;

    root.addEventListener('change', function (e) {
      var box = e.target;
      if (!box || box.type !== 'checkbox' || !box.closest) return;

      var list = box.closest('[data-mdstyled-start]');
      if (!list) return;

      var start = parseInt(list.getAttribute('data-mdstyled-start'), 10);
      var end = parseInt(list.getAttribute('data-mdstyled-end'), 10);
      if (isNaN(start) || isNaN(end)) return;

      var boxes = Array.prototype.slice.call(list.querySelectorAll('input[type="checkbox"]'));
      var index = boxes.indexOf(box);
      if (index < 0) return;

      var original = api.getSource(start, end);
      var lines = original.split('\n');
      var seen = -1;

      for (var i = 0; i < lines.length; i++) {
        var parts = lines[i].match(TASK_MARKER);
        if (!parts) continue;
        seen++;
        if (seen !== index) continue;

        lines[i] = parts[1] + (box.checked ? 'x' : ' ') + parts[3];
        patchState({ scrollY: window.scrollY });
        api.saveBlock(start, end, lines.join('\n'), original).catch(reportError);
        return;
      }
    });

    /* ── Block editor ── */

    var editing = false;
    var open = null;

    function closeBlockEditor() {
      if (!open) return;
      open.group.forEach(function (node) { node.classList.remove('mdstyled-editable-hidden'); });
      if (open.wrap.parentNode) open.wrap.parentNode.removeChild(open.wrap);
      open = null;
      api.setEditorOpen(false);
    }

    function setEditing(on) {
      editing = on;
      document.body.classList.toggle('mdstyled-edit-mode', on);
      toggleBtn.classList.toggle('active', on);
      toggleBtn.setAttribute('aria-pressed', String(on));
      toggleBtn.lastChild.textContent = on ? 'Done' : 'Edit';
      if (!on) {
        closeBlockEditor();
        hideMenu();
      }
      patchState({ editMode: on });
    }

    toggleBtn.addEventListener('click', function () { setEditing(!editing); });

    root.addEventListener('click', function (e) {
      if (!editing) return;
      if (e.target.closest('.mdstyled-block-editor')) return;
      /* Leave the template's own controls working while editing. */
      if (e.target.closest('button, input, select, textarea, label')) return;

      var host = e.target.closest('.mdstyled-editable');
      if (!host) return;
      e.preventDefault();
      openBlockEditor(host);
    });

    function openBlockEditor(host) {
      if (open && open.host === host) return;
      closeBlockEditor();
      hideMenu();

      var start = parseInt(host.getAttribute('data-mdstyled-start'), 10);
      var end = parseInt(host.getAttribute('data-mdstyled-end'), 10);
      var original = api.getSource(start, end);
      var group = groupFor(host);

      var wrap = el('div', 'mdstyled-block-editor');

      /* toolbar */
      var toolbar = el('div', 'mdstyled-editor-toolbar');

      var typeGroup = el('div', 'mdstyled-tool-group');
      typeGroup.setAttribute('role', 'group');
      typeGroup.setAttribute('aria-label', 'Block type');

      var typeButtons = BLOCK_TOOLS.map(function (tool) {
        var b = toolButton(tool);
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function () { changeType(tool.type); });
        typeGroup.appendChild(b);
        return { button: b, type: tool.type };
      });
      toolbar.appendChild(typeGroup);
      toolbar.appendChild(el('span', 'mdstyled-toolbar-sep'));

      var formatGroup = el('div', 'mdstyled-tool-group');
      formatGroup.setAttribute('role', 'group');
      formatGroup.setAttribute('aria-label', 'Formatting');

      var formatButtons = INLINE_TOOLS.map(function (tool) {
        var b = toolButton(tool);
        if (tool.command) b.setAttribute('aria-pressed', 'false');
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function () { applyInline(tool); });
        formatGroup.appendChild(b);
        return { button: b, tool: tool };
      });
      toolbar.appendChild(formatGroup);
      toolbar.appendChild(el('span', 'mdstyled-toolbar-spacer'));

      var modeBtn = toolButton({ icon: 'braces', label: 'Edit as Markdown', className: 'mdstyled-mode-toggle' });
      var modeLabel = el('span', 'mdstyled-tool-text', 'Markdown');
      modeBtn.appendChild(modeLabel);
      toolbar.appendChild(modeBtn);
      wrap.appendChild(toolbar);

      /* colour swatches */
      var colorPopover = el('div', 'mdstyled-color-popover');
      colorPopover.hidden = true;

      SWATCH_GROUPS.forEach(function (group) {
        colorPopover.appendChild(el('div', 'mdstyled-color-title', group.title));
        var row = el('div', 'mdstyled-color-row');
        group.colors.forEach(function (color) {
          var swatch = document.createElement('button');
          swatch.type = 'button';
          swatch.className = 'mdstyled-swatch';
          swatch.title = color.label;
          swatch.setAttribute('aria-label', group.title + ': ' + color.label);
          swatch.style.background = group.property === 'color' ? color.value : color.value;
          if (group.property === 'color') {
            swatch.style.background = 'transparent';
            swatch.style.color = color.value;
            swatch.appendChild(el('span', 'mdstyled-swatch-letter', 'A'));
          }
          swatch.addEventListener('mousedown', function (e) { e.preventDefault(); });
          swatch.addEventListener('click', function () {
            applyColor(group.property, color.value);
            colorPopover.hidden = true;
          });
          row.appendChild(swatch);
        });
        colorPopover.appendChild(row);
      });

      var clearColor = button('Remove colour', 'mdstyled-color-clear');
      clearColor.addEventListener('mousedown', function (e) { e.preventDefault(); });
      clearColor.addEventListener('click', function () {
        applyColor(null, null);
        colorPopover.hidden = true;
      });
      colorPopover.appendChild(clearColor);
      wrap.appendChild(colorPopover);

      /* link input */
      var linkRow = el('div', 'mdstyled-link-row');
      linkRow.hidden = true;
      var linkInput = document.createElement('input');
      linkInput.type = 'text';
      linkInput.className = 'mdstyled-link-input';
      linkInput.placeholder = 'https://example.com or ./page.md';
      var linkApply = button('Add link', 'primary');
      var linkCancel = button('Cancel');
      linkRow.appendChild(linkInput);
      linkRow.appendChild(linkApply);
      linkRow.appendChild(linkCancel);
      wrap.appendChild(linkRow);

      /* surfaces */
      var rich = el('div', 'mdstyled-rich');
      rich.contentEditable = 'true';
      rich.setAttribute('role', 'textbox');
      rich.setAttribute('aria-multiline', 'true');
      rich.setAttribute('aria-label', 'Rich text editor for this block');

      var ta = document.createElement('textarea');
      ta.className = 'mdstyled-edit-textarea';
      ta.spellcheck = false;
      ta.hidden = true;
      ta.setAttribute('aria-label', 'Markdown source for this block');

      wrap.appendChild(rich);
      wrap.appendChild(ta);

      /* actions */
      var actions = el('div', 'mdstyled-edit-actions');
      var saveBtn = button('Save', 'primary');
      var cancelBtn = button('Cancel');
      var deleteBtn = button('Delete', 'danger');
      var status = el('span', 'mdstyled-edit-status', 'Ctrl/Cmd+Enter to save, Esc to cancel');
      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      actions.appendChild(deleteBtn);
      actions.appendChild(status);
      wrap.appendChild(actions);

      group[0].parentNode.insertBefore(wrap, group[0]);
      group.forEach(function (node) { node.classList.add('mdstyled-editable-hidden'); });
      open = { host: host, group: group, wrap: wrap };
      api.setEditorOpen(true);

      /* ── modes ── */

      var mode = 'rich';
      var blockType = detectBlockType(original);

      /* Tables, dividers and anything unusual are clearer as Markdown. */
      var richSupported = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'task', 'quote'].indexOf(blockType) !== -1;

      function currentMarkdown() {
        return mode === 'rich' ? htmlToMarkdown(rich) : ta.value;
      }

      function changeType(type) {
        var next = retypeMarkdown(currentMarkdown(), type);
        if (mode === 'markdown') {
          ta.value = next;
          autosize(ta);
          syncToolbar();
        } else {
          setMode('rich', next).then(syncToolbar, reportError);
        }
      }

      function setMode(next, markdown, prerendered) {
        if (next === 'markdown') {
          ta.value = markdown != null ? markdown : currentMarkdown();
          mode = 'markdown';
          rich.hidden = true;
          ta.hidden = false;
          autosize(ta);
          modeLabel.textContent = 'Rich text';
          modeBtn.setAttribute('aria-label', 'Edit as rich text');
          ta.focus();
          syncToolbar();
          return Promise.resolve();
        }

        function show(html) {
          rich.innerHTML = html;
          mode = 'rich';
          ta.hidden = true;
          rich.hidden = false;
          modeLabel.textContent = 'Markdown';
          modeBtn.setAttribute('aria-label', 'Edit as Markdown');
          rich.focus();
          syncToolbar();
        }

        if (prerendered != null) {
          show(prerendered);
          return Promise.resolve();
        }
        return api.render(markdown != null ? markdown : ta.value).then(show);
      }

      modeBtn.addEventListener('click', function () {
        setMode(mode === 'rich' ? 'markdown' : 'rich').catch(reportError);
      });

      /* ── inline formatting ── */

      /* Only take focus if we do not already have it - focusing an element that already
         holds the selection can collapse it. */
      function focusRich() {
        if (document.activeElement !== rich) rich.focus();
      }

      function setSelection(from, to) {
        ta.focus();
        ta.setSelectionRange(from, to);
      }

      /* A real toggle: markers already around the selection come off again, whether
         they are inside it or just outside it. */
      function toggleMarkers(marker) {
        var from = ta.selectionStart;
        var to = ta.selectionEnd;
        var value = ta.value;
        var selected = value.slice(from, to);
        var width = marker.length;

        if (selected.length >= width * 2 &&
            selected.slice(0, width) === marker &&
            selected.slice(-width) === marker) {
          var unwrapped = selected.slice(width, -width);
          ta.value = value.slice(0, from) + unwrapped + value.slice(to);
          setSelection(from, from + unwrapped.length);
        } else if (from >= width &&
                   value.slice(from - width, from) === marker &&
                   value.slice(to, to + width) === marker) {
          ta.value = value.slice(0, from - width) + selected + value.slice(to + width);
          setSelection(from - width, from - width + selected.length);
        } else {
          ta.value = value.slice(0, from) + marker + selected + marker + value.slice(to);
          setSelection(from + width, from + width + selected.length);
        }

        autosize(ta);
        syncToolbar();
      }

      function markersActive(marker) {
        var from = ta.selectionStart;
        var to = ta.selectionEnd;
        var value = ta.value;
        var width = marker.length;
        var selected = value.slice(from, to);

        if (selected.length >= width * 2 &&
            selected.slice(0, width) === marker &&
            selected.slice(-width) === marker) return true;

        return from >= width &&
          value.slice(from - width, from) === marker &&
          value.slice(to, to + width) === marker;
      }

      /* Wraps the rich-text selection in one element - used for code and colour,
         neither of which execCommand does usefully. */
      function wrapSelection(tagName, style) {
        var selection = window.getSelection();
        if (!selection || !selection.rangeCount || selection.isCollapsed) return false;

        var range = selection.getRangeAt(0);
        var node = document.createElement(tagName);
        if (style) node.setAttribute('style', style);

        try {
          range.surroundContents(node);
        } catch (err) {
          node.appendChild(range.extractContents());
          range.insertNode(node);
        }

        selection.removeAllRanges();
        var after = document.createRange();
        after.selectNodeContents(node);
        selection.addRange(after);
        return true;
      }

      function selectionElement(match) {
        var selection = window.getSelection();
        if (!selection || !selection.rangeCount) return null;
        var node = selection.getRangeAt(0).commonAncestorContainer;
        var element = node.nodeType === 1 ? node : node.parentElement;
        if (!element || !element.closest || !rich.contains(element)) return null;
        return element.closest(match);
      }

      function unwrap(element) {
        if (!element || !element.parentNode) return;
        while (element.firstChild) element.parentNode.insertBefore(element.firstChild, element);
        element.parentNode.removeChild(element);
      }

      function applyColor(property, value) {
        if (mode === 'markdown') {
          var from = ta.selectionStart;
          var to = ta.selectionEnd;
          var selected = ta.value.slice(from, to) || 'text';
          var replacement = property
            ? '<span style="' + property + ': ' + value + '">' + selected + '</span>'
            : selected;
          ta.value = ta.value.slice(0, from) + replacement + ta.value.slice(to);
          setSelection(from, from + replacement.length);
          autosize(ta);
          return;
        }

        focusRich();
        var existing = selectionElement('span[style]');
        if (existing) unwrap(existing);
        if (property) wrapSelection('span', property + ': ' + value);
        syncToolbar();
      }

      function applyInline(tool) {
        if (tool.action === 'link') { openLinkRow(); return; }

        if (tool.action === 'color') {
          colorPopover.hidden = !colorPopover.hidden;
          return;
        }

        if (tool.action === 'clear') {
          if (mode === 'markdown') {
            var from = ta.selectionStart;
            var to = ta.selectionEnd;
            var plain = ta.value.slice(from, to).replace(/(\*\*|~~|[*`])/g, '');
            ta.value = ta.value.slice(0, from) + plain + ta.value.slice(to);
            setSelection(from, from + plain.length);
            autosize(ta);
          } else {
            focusRich();
            exec('removeFormat');
            unwrap(selectionElement('span[style]'));
            unwrap(selectionElement('code'));
          }
          syncToolbar();
          return;
        }

        if (mode === 'markdown') {
          if (tool.marker) toggleMarkers(tool.marker);
          return;
        }

        focusRich();

        if (tool.action === 'code') {
          var inCode = selectionElement('code');
          if (inCode) unwrap(inCode);
          else wrapSelection('code');
          syncToolbar();
          return;
        }

        exec(tool.command);
        syncToolbar();
      }

      /* ── toolbar state ── */

      var RICH_TYPE_TAGS = {
        P: 'p', H1: 'h1', H2: 'h2', H3: 'h3', H4: 'h4', H5: 'h5', H6: 'h6',
        BLOCKQUOTE: 'quote', PRE: 'code', OL: 'ol'
      };

      function currentType() {
        if (mode === 'markdown') return detectBlockType(ta.value);

        var first = rich.firstElementChild;
        if (!first) return 'p';
        if (first.tagName === 'UL') {
          return first.querySelector('input[type="checkbox"]') ? 'task' : 'ul';
        }
        return RICH_TYPE_TAGS[first.tagName] || 'p';
      }

      function syncToolbar() {
        var type = currentType();
        typeButtons.forEach(function (entry) {
          var active = entry.type === type;
          entry.button.classList.toggle('active', active);
          entry.button.setAttribute('aria-pressed', String(active));
        });

        formatButtons.forEach(function (entry) {
          var tool = entry.tool;
          var active = false;

          if (mode === 'markdown') {
            if (tool.marker) active = markersActive(tool.marker);
          } else if (tool.action === 'code') {
            active = !!selectionElement('code');
          } else if (tool.action === 'color') {
            active = !!selectionElement('span[style]');
          } else if (tool.command) {
            try { active = document.queryCommandState(tool.command); } catch (err) { active = false; }
          }

          if (tool.command || tool.action === 'code' || tool.action === 'color') {
            entry.button.classList.toggle('active', active);
            entry.button.setAttribute('aria-pressed', String(active));
          }
        });
      }

      ['keyup', 'mouseup', 'input', 'focus'].forEach(function (event) {
        rich.addEventListener(event, syncToolbar);
        ta.addEventListener(event, syncToolbar);
      });

      var savedRange = null;

      function openLinkRow() {
        if (mode === 'rich') {
          var selection = window.getSelection();
          savedRange = (selection && selection.rangeCount) ? selection.getRangeAt(0).cloneRange() : null;
        }
        colorPopover.hidden = true;
        linkRow.hidden = false;
        linkInput.value = '';
        var existingLink = mode === 'rich' ? selectionElement('a') : null;
        if (existingLink) linkInput.value = existingLink.getAttribute('data-mdstyled-uri') || existingLink.getAttribute('href') || '';
        linkInput.focus();
      }

      function closeLinkRow() {
        linkRow.hidden = true;
        savedRange = null;
      }

      linkApply.addEventListener('click', function () {
        var href = linkInput.value.trim();
        if (!href) { closeLinkRow(); return; }

        if (mode === 'markdown') {
          var from = ta.selectionStart;
          var to = ta.selectionEnd;
          var label = ta.value.slice(from, to) || 'link';
          var markdown = '[' + label + '](' + href + ')';
          ta.value = ta.value.slice(0, from) + markdown + ta.value.slice(to);
          setSelection(from, from + markdown.length);
          autosize(ta);
        } else {
          focusRich();
          if (savedRange) {
            var selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedRange);
          }
          var current = window.getSelection();
          if (!current || current.isCollapsed) {
            exec('insertHTML', '<a href="' + href.replace(/"/g, '&quot;') + '">' + href + '</a>');
          } else {
            exec('createLink', href);
          }
        }
        closeLinkRow();
      });

      linkCancel.addEventListener('click', closeLinkRow);
      linkInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); linkApply.click(); }
        else if (e.key === 'Escape') { e.preventDefault(); closeLinkRow(); }
      });

      /* ── save / cancel / delete ── */

      function commit() {
        var markdown = currentMarkdown();
        saveBtn.disabled = true;
        cancelBtn.disabled = true;
        deleteBtn.disabled = true;
        status.classList.remove('error');
        status.textContent = 'Saving...';
        patchState({ scrollY: window.scrollY, editMode: true });

        api.saveBlock(start, end, markdown, original).then(function () {
          status.textContent = 'Saved';
          closeBlockEditor();
        }, function (err) {
          saveBtn.disabled = false;
          cancelBtn.disabled = false;
          deleteBtn.disabled = false;
          status.classList.add('error');
          status.textContent = (err && err.message) ? err.message : 'Save failed.';
        });
      }

      saveBtn.addEventListener('click', commit);
      cancelBtn.addEventListener('click', closeBlockEditor);

      var deleteArmed = false;
      deleteBtn.addEventListener('click', function () {
        if (!deleteArmed) {
          deleteArmed = true;
          deleteBtn.textContent = 'Confirm delete';
          status.textContent = 'Click again to remove this block.';
          return;
        }

        /* Take the blank line after the block too, but only if it really is blank. */
        var deleteEnd = end;
        var trailing = '';
        if (end < api.lineCount && api.getSource(end, end + 1).trim() === '') {
          deleteEnd = end + 1;
          trailing = '\n';
        }

        patchState({ scrollY: window.scrollY, editMode: true });
        api.saveBlock(start, deleteEnd, '', original + trailing).then(function () {
          closeBlockEditor();
        }, function (err) {
          deleteArmed = false;
          deleteBtn.textContent = 'Delete';
          status.classList.add('error');
          status.textContent = (err && err.message) ? err.message : 'Delete failed.';
        });
      });

      function onKeydown(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeBlockEditor();
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          commit();
        } else if (e.key === 'Tab' && mode === 'rich' && e.target === rich) {
          /* Tab indents list items; everywhere else it should still move focus. */
          var selection = window.getSelection();
          var node = selection.anchorNode;
          var inList = node && (node.nodeType === 1 ? node : node.parentElement).closest('li');
          if (inList) {
            e.preventDefault();
            exec(e.shiftKey ? 'outdent' : 'indent');
          }
        }
      }

      rich.addEventListener('keydown', onKeydown);
      ta.addEventListener('keydown', onKeydown);
      ta.addEventListener('input', function () { autosize(ta); });

      /* ── open in the right mode ── */

      exec('styleWithCSS', false);
      exec('defaultParagraphSeparator', 'p');

      if (richSupported) {
        /* Rich text can only round-trip Markdown written the way we emit it. When this
           block is written some other way - hard wrapped, setext heading, `_italic_`,
           `*` bullets - editing it richly would silently restyle the source, so it
           opens as Markdown instead and the toggle says why. */
        api.render(original).then(function (html) {
          var probe = document.createElement('div');
          probe.innerHTML = html;

          if (htmlToMarkdown(probe) === original.trim()) {
            setMode('rich', original, html);
          } else {
            setMode('markdown', original);
            modeBtn.title = 'Rich text editing would restyle this block\u2019s Markdown';
            wrap.classList.add('mdstyled-prefers-markdown');
            status.textContent = 'Opened as Markdown to keep this block\u2019s formatting.';
          }
        }, function () {
          setMode('markdown', original);
        });
      } else {
        setMode('markdown', original);
        modeBtn.disabled = blockType === 'table' || blockType === 'hr';
        if (modeBtn.disabled) modeBtn.title = 'This block is edited as Markdown';
      }
    }

    /* ── Whole-file editor ── */

    function openSourceEditor() {
      if (document.querySelector('.mdstyled-source-editor')) return;
      setEditing(false);

      var overlay = el('div', 'mdstyled-source-editor');
      overlay.appendChild(el('div', 'mdstyled-source-title', 'Markdown source'));

      var original = api.getDocument();
      var ta = document.createElement('textarea');
      ta.className = 'mdstyled-edit-textarea mdstyled-source-textarea';
      ta.spellcheck = false;
      ta.value = original;
      ta.setAttribute('aria-label', 'Markdown source for this file');

      var actions = el('div', 'mdstyled-edit-actions');
      var saveBtn = button('Save', 'primary');
      var cancelBtn = button('Cancel');
      var status = el('span', 'mdstyled-edit-status', 'Ctrl/Cmd+Enter to save, Esc to close');
      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      actions.appendChild(status);

      overlay.appendChild(ta);
      overlay.appendChild(actions);

      document.body.classList.add('mdstyled-source-open');
      document.body.appendChild(overlay);
      api.setEditorOpen(true);
      ta.focus();

      function close() {
        document.body.classList.remove('mdstyled-source-open');
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        api.setEditorOpen(false);
      }

      function commit() {
        saveBtn.disabled = true;
        cancelBtn.disabled = true;
        status.classList.remove('error');
        status.textContent = 'Saving...';
        patchState({ scrollY: window.scrollY });

        api.saveBlock(0, api.lineCount, ta.value, original).then(function () {
          status.textContent = 'Saved';
          close();
        }, function (err) {
          saveBtn.disabled = false;
          cancelBtn.disabled = false;
          status.classList.add('error');
          status.textContent = (err && err.message) ? err.message : 'Save failed.';
        });
      }

      saveBtn.addEventListener('click', commit);
      cancelBtn.addEventListener('click', close);
      ta.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
      });
    }

    sourceBtn.addEventListener('click', openSourceEditor);

    /* ── Restore what the last render was doing ── */

    if (state.editMode) setEditing(true);

    if (typeof state.focusLine === 'number') {
      var target = root.querySelector('[data-mdstyled-start="' + state.focusLine + '"]');
      patchState({ focusLine: null });
      if (target) {
        if (!editing) setEditing(true);
        openBlockEditor(target);
        if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'center' });
      }
    }
  }
