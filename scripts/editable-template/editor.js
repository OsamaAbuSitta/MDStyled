
  /* ═══════════════════════════════════════
     In-preview editor
     ═══════════════════════════════════════ */

  var SCROLL_SAVE_MS = 250;

  var BLOCK_TOOLS = [
    { type: 'p', icon: 'text', label: 'Text' },
    { type: 'h1', glyph: 'H1', label: 'Heading 1' },
    { type: 'h2', glyph: 'H2', label: 'Heading 2' },
    { type: 'h3', glyph: 'H3', label: 'Heading 3' },
    { type: 'h4', glyph: 'H4', label: 'Heading 4' },
    { type: 'h5', glyph: 'H5', label: 'Heading 5' },
    { type: 'h6', glyph: 'H6', label: 'Heading 6' },
    { type: 'ul', icon: 'bullet', label: 'Bullet list', quick: true },
    { type: 'ol', icon: 'numbered', label: 'Numbered list' },
    { type: 'task', icon: 'checklist', label: 'Checklist', quick: true },
    { type: 'quote', icon: 'quote', label: 'Quote' },
    { type: 'code', icon: 'code', label: 'Code block' },
    { type: 'table', icon: 'table', label: 'Table' },
    { type: 'hr', icon: 'divider', label: 'Divider', hidden: true }
  ];

  /* Everything the templates style, applied with the `<!-- .class -->` comment on the
     line above the block. `on` narrows an entry to the blocks it actually works on.
     `hidden` keeps an entry out of the dropdown but still managed, so a block that
     already has it can be restyled or cleared. */
  var STYLE_TOOLS = [
    { cls: 'note', icon: 'callout', label: 'Note', group: 'Callouts' },
    { cls: 'warning', icon: 'callout', label: 'Warning', group: 'Callouts' },
    { cls: 'danger', icon: 'close', label: 'Danger', group: 'Callouts' },
    { cls: 'success', icon: 'check', label: 'Success', group: 'Callouts' },
    { cls: 'card', icon: 'card', label: 'Card', group: 'Cards', hidden: true },
    { cls: 'doc-hero', icon: 'text', label: 'Hero', group: 'Layout', hidden: true },
    { cls: 'steps-list', icon: 'numbered', label: 'Steps', group: 'Layout', on: ['ul', 'ol', 'task'], hidden: true },
    { cls: 'endpoint', icon: 'code', label: 'Endpoint', group: 'Layout', hidden: true },
    { cls: 'lead', icon: 'text', label: 'Lead paragraph', group: 'Layout', hidden: true }
  ];

  /* Only these are the dropdown's to rewrite; any other class on the block is left be. */
  var MANAGED_CLASSES = (function () {
    var all = [];
    STYLE_TOOLS.forEach(function (tool) {
      tool.cls.split(/\s+/).forEach(function (c) { if (all.indexOf(c) === -1) all.push(c); });
    });
    return all;
  })();

  var INLINE_TOOLS = [
    { action: 'bold', command: 'bold', marker: '**', icon: 'bold', label: 'Bold', shortcut: 'Ctrl/Cmd+B' },
    { action: 'italic', command: 'italic', marker: '*', icon: 'italic', label: 'Italic', shortcut: 'Ctrl/Cmd+I' },
    { action: 'strike', command: 'strikeThrough', marker: '~~', icon: 'strike', label: 'Strikethrough' },
    { action: 'code', marker: '`', icon: 'code', label: 'Inline code' },
    { action: 'link', icon: 'link', label: 'Link' },
    { action: 'color', icon: 'color', label: 'Colour', className: 'mdstyled-format-color' },
    { action: 'emoji', icon: 'emoji', label: 'Emoji', className: 'mdstyled-format-emoji' },
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
        /* Opens straight into the card designer. */
        {
          label: 'Cards', icon: 'card', focusOffset: 2,
          markdown: '<div class="mdstyled-cards cols-3">\n\n' +
            ['First', 'Second', 'Third'].map(function (n) {
              return '<!-- .card -->\n> ### ' + n + ' card\n>\n> What this card is about.\n\n';
            }).join('') + '</div>'
        },
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
    zoomIn: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M11 8v6M8 11h6',
    zoomOut: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M8 11h6',
    back: 'M19 12H5M11 6l-6 6 6 6',
    print: 'M7 9V4h10v5M7 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 15h10v5H7z',
    chevron: 'M7 10l5 5 5-5',
    emoji: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 10h.01M15 10h.01M8.3 13.8a4.6 4.6 0 0 0 7.4 0',
    eye: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12zM12 9.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z',
    divider: 'M3 12h18',
    plus: 'M12 5v14M5 12h14',
    pencil: 'M12 20h9M16.4 3.6a2.1 2.1 0 0 1 3 3L7.5 18.5 3.5 20l1.5-4z',
    trash: 'M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14',
    check: 'M4 12l5 5L20 6',
    close: 'M6 6l12 12M18 6L6 18',
    minus: 'M5 12h14',
    arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
    arrowRight: 'M5 12h14M13 6l6 6-6 6',
    copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
    grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
    arrowUp: 'M12 19V5M6 11l6-6 6 6',
    arrowDown: 'M12 5v14M6 13l6 6 6-6',
    alignLeft: 'M4 6h16M4 12h10M4 18h14',
    alignCenter: 'M4 6h16M7 12h10M5 18h14',
    alignRight: 'M4 6h16M10 12h10M6 18h14'
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
    if (!state.place && typeof state.scrollY === 'number' && state.scrollY > 0) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { window.scrollTo(0, state.scrollY); });
      });
    }

    /* A checkbox is only tickable while editing - the preview is a document to read,
       and a tick that could not be written to the file would be a lie. */
    function setCheckboxesEditable(on) {
      var boxes = root.querySelectorAll('input[type="checkbox"]');
      Array.prototype.forEach.call(boxes, function (box) {
        box.disabled = !on;
        box.title = on ? 'Tick to update the Markdown file' : 'Turn on Edit to change this';
      });
    }

    var api = window.mdstyled && window.mdstyled.editor;
    if (!api || !api.available) {
      /* No way to write the file, so nothing here is tickable. */
      setCheckboxesEditable(false);
      return;
    }

    setCheckboxesEditable(false);

    /* Where a block sits in the viewport. A save re-renders the whole preview, and
       everything above can move as it settles (tables paginate, diagrams render
       late), so the next render puts this block back here rather than trusting a
       raw scroll offset. */
    /* How many visible characters come before the point clicked inside `host`.
       Whitespace is left out of the count, so it survives the block being re-rendered
       into the editor with different line breaks and spacing. */
    function textOffsetAt(host, x, y) {
      var range = null;
      try {
        if (document.caretRangeFromPoint) {
          range = document.caretRangeFromPoint(x, y);
        } else if (document.caretPositionFromPoint) {
          var pos = document.caretPositionFromPoint(x, y);
          if (pos) {
            range = document.createRange();
            range.setStart(pos.offsetNode, pos.offset);
          }
        }
      } catch (err) { range = null; }
      if (!range || !host.contains(range.startContainer)) return null;

      var before = document.createRange();
      before.selectNodeContents(host);
      before.setEnd(range.startContainer, range.startOffset);
      return before.toString().replace(/\s+/g, '').length;
    }

    /* The place in Markdown source that textOffsetAt's count points at: the same
       count of visible characters, skipping syntax that never shows - list and
       quote markers, heading hashes, emphasis marks, link targets, table pipes. */
    function sourceIndexForOffset(source, offset) {
      var LINE_START = /^(\s*(?:(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?|>\s?|#{1,6}\s+))+/;
      var seen = 0;
      var i = 0;
      var lineStart = true;

      while (i < source.length) {
        if (lineStart) {
          var lead = source.slice(i).match(LINE_START);
          if (lead) i += lead[0].length;
          lineStart = false;
          if (i >= source.length) break;
        }
        var ch = source.charAt(i);
        if (ch === '\n') { lineStart = true; i++; continue; }
        if (/\s/.test(ch) || /[*_`~|[\\]/.test(ch)) { i++; continue; }
        if (ch === ']' && source.charAt(i + 1) === '(') {
          var close = source.indexOf(')', i);
          i = close === -1 ? i + 1 : close + 1;
          continue;
        }
        if (ch === ']') { i++; continue; }
        if (seen === offset) return i;
        seen++;
        i++;
      }
      return source.replace(/\s+$/, '').length;
    }

    function placeOf(line, node) {
      return { line: line, top: Math.round(node.getBoundingClientRect().top) };
    }

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
    toggleBtn.insertBefore(icon('pencil'), toggleBtn.firstChild);

    var sourceBtn = button('Source', 'mdstyled-edit-source', 'Edit the whole Markdown file');

    /* The bare text node inside a button cannot be targeted by CSS, and these labels
       need to collapse to icons when the bar runs out of room. */
    function withLabel(btn) {
      var text = btn.lastChild;
      if (!text || text.nodeType !== 3) return btn;
      btn.replaceChild(el('span', 'mdstyled-btn-label', text.nodeValue), text);
      return btn;
    }

    var backBtn = button('Back', 'mdstyled-edit-back', 'Back to the previous document');
    backBtn.insertBefore(icon('back'), backBtn.firstChild);
    backBtn.hidden = !api.canGoBack;
    backBtn.addEventListener('click', function () {
      api.goBack().catch(reportError);
    });

    var exportBtn = button('Export', 'mdstyled-edit-export', 'Export this document as PDF or HTML');
    exportBtn.insertBefore(icon('print'), exportBtn.firstChild);
    exportBtn.addEventListener('click', function () {
      api.exportDocument().catch(reportError);
    });

    /* ── Zoom ── */

    var ZOOM_STEPS = [0.6, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
    var zoomIndex = ZOOM_STEPS.indexOf(1);

    var zoomBox = el('div', 'mdstyled-zoom');
    var zoomOutBtn = el('button', 'mdstyled-tool mdstyled-zoom-out');
    zoomOutBtn.type = 'button';
    zoomOutBtn.title = 'Zoom out';
    zoomOutBtn.setAttribute('aria-label', 'Zoom out');
    zoomOutBtn.appendChild(icon('zoomOut'));

    var zoomLabel = el('button', 'mdstyled-zoom-level', '100%');
    zoomLabel.type = 'button';
    zoomLabel.title = 'Reset zoom';
    zoomLabel.setAttribute('aria-label', 'Reset zoom');

    var zoomInBtn = el('button', 'mdstyled-tool mdstyled-zoom-in');
    zoomInBtn.type = 'button';
    zoomInBtn.title = 'Zoom in';
    zoomInBtn.setAttribute('aria-label', 'Zoom in');
    zoomInBtn.appendChild(icon('zoomIn'));

    zoomBox.appendChild(zoomOutBtn);
    zoomBox.appendChild(zoomLabel);
    zoomBox.appendChild(zoomInBtn);

    /* `zoom` reflows the column, unlike a transform, so long lines still wrap.
       The contents sidebar is part of the page, so it scales with it. */
    function zoomTargets() {
      var targets = [root];
      var toc = document.querySelector('.mdstyled-toc');
      if (toc) targets.push(toc);
      return targets;
    }

    function applyZoom(index, remember) {
      zoomIndex = Math.max(0, Math.min(ZOOM_STEPS.length - 1, index));
      var factor = ZOOM_STEPS[zoomIndex];
      zoomTargets().forEach(function (node) {
        node.style.zoom = factor === 1 ? '' : String(factor);
      });
      zoomLabel.textContent = Math.round(factor * 100) + '%';
      zoomOutBtn.disabled = zoomIndex === 0;
      zoomInBtn.disabled = zoomIndex === ZOOM_STEPS.length - 1;
      if (remember !== false) patchState({ zoom: factor });
    }

    zoomOutBtn.addEventListener('click', function () { applyZoom(zoomIndex - 1); });
    zoomInBtn.addEventListener('click', function () { applyZoom(zoomIndex + 1); });
    zoomLabel.addEventListener('click', function () { applyZoom(ZOOM_STEPS.indexOf(1)); });

    document.addEventListener('keydown', function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === '=' || e.key === '+') { e.preventDefault(); applyZoom(zoomIndex + 1); }
      else if (e.key === '-') { e.preventDefault(); applyZoom(zoomIndex - 1); }
      else if (e.key === '0') { e.preventDefault(); applyZoom(ZOOM_STEPS.indexOf(1)); }
    });

    var storedZoom = ZOOM_STEPS.indexOf(state.zoom);
    applyZoom(storedZoom === -1 ? ZOOM_STEPS.indexOf(1) : storedZoom, false);

    /* ── Following links to other Markdown files ── */

    root.addEventListener('click', function (e) {
      /* In edit mode a click means "edit this block", not "follow this link". */
      if (editing) return;
      var anchor = e.target.closest ? e.target.closest('a') : null;
      if (!anchor) return;

      var href = anchor.getAttribute('data-mdstyled-uri') || anchor.getAttribute('href') || '';
      if (!/\.(md|markdown)(#|\?|$)/i.test(href) || /^[a-z][a-z0-9+.-]*:/i.test(href)) return;

      e.preventDefault();
      e.stopPropagation();
      api.openDocument(href).catch(reportError);
    }, true);

    [backBtn, toggleBtn, exportBtn, sourceBtn].forEach(withLabel);

    bar.appendChild(backBtn);
    bar.appendChild(toggleBtn);
    bar.appendChild(el('span', 'mdstyled-bar-spacer'));
    bar.appendChild(zoomBox);
    bar.appendChild(el('span', 'mdstyled-bar-divider'));
    bar.appendChild(exportBtn);
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
          insertBlock(line, item.markdown, item.focusOffset);
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
      if (!e.target.closest('.mdstyled-select, .mdstyled-select-menu, .mdstyled-color-popover, .mdstyled-format-color')) {
        document.querySelectorAll('.mdstyled-select-menu, .mdstyled-color-popover').forEach(function (panel) {
          panel.hidden = true;
        });
        document.querySelectorAll('.mdstyled-select[aria-expanded="true"]').forEach(function (trigger) {
          trigger.setAttribute('aria-expanded', 'false');
        });
      }
      if (menu.hidden) return;
      if (e.target.closest('.mdstyled-insert-menu, .mdstyled-insert-line')) return;
      hideMenu();
    });

    /* An insert line sits in the gap above and below every block, so a new block can
       go exactly where it is wanted. They are laid out with negative margins, so
       showing them does not move the document. */
    function makeInsertLine(line) {
      var strip = el('div', 'mdstyled-insert-line');

      var plus = el('button', 'mdstyled-insert-plus');
      plus.type = 'button';
      plus.title = 'Insert a block here';
      plus.setAttribute('aria-label', 'Insert a block here');
      plus.appendChild(icon('plus', 14));
      strip.appendChild(plus);

      plus.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!editing) setEditing(true);
        showMenu(plus, line);
      });

      return strip;
    }

    function buildInsertLines() {
      var points = [];

      if (hosts.length === 0) {
        /* The same affordance as anywhere else, just held open - there is nothing to
           hover between on a blank page. */
        var only = makeInsertLine(0);
        only.classList.add('mdstyled-insert-line-empty');
        root.appendChild(only);
        return;
      }

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

      points = points.map(outsideCardGrid).filter(Boolean);

      points.forEach(function (point) {
        if (isNaN(point.line)) return;

        var strip = makeInsertLine(point.line);

        if (point.position === 'append') {
          point.anchor.appendChild(strip);
        } else if (point.position === 'before') {
          point.anchor.parentNode.insertBefore(strip, point.anchor);
        } else {
          point.anchor.parentNode.insertBefore(strip, point.anchor.nextSibling);
        }
      });
    }

    /* A card grid is one CSS grid, so an insert line inside it would take a cell of
       its own and push the cards along. Cards are added from the card designer; the
       grid only gets lines before and after the whole of it. */
    function outsideCardGrid(point) {
      var grid = point.anchor.parentNode;
      if (!grid || !grid.classList || !grid.classList.contains('mdstyled-cards')) return point;

      var cards = grid.querySelectorAll(':scope > .mdstyled-editable');
      var edge = point.position === 'before' ? cards[0] : cards[cards.length - 1];
      if (point.anchor !== edge) return null;

      var range = findCardGrid(
        parseInt(edge.getAttribute('data-mdstyled-start'), 10),
        parseInt(edge.getAttribute('data-mdstyled-end'), 10));
      if (!range) return null;

      return {
        line: point.position === 'before' ? range.open : range.close + 1,
        anchor: grid,
        position: point.position
      };
    }

    /* Text goes in at the start of `line`, so it needs a blank line on whichever side
       does not already have one - otherwise the new block merges with its neighbour. */
    function insertBlock(line, markdown, focusOffset) {
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
        patchState({ focusLine: focusLine + (focusOffset || 0), editMode: true, scrollY: window.scrollY });
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
        patchState({ scrollY: window.scrollY, place: placeOf(start, list) });
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
      setCheckboxesEditable(on);
      document.body.classList.toggle('mdstyled-edit-mode', on);
      toggleBtn.classList.toggle('active', on);
      toggleBtn.setAttribute('aria-pressed', String(on));
      /* The label names where the button takes you, not the state you are in. */
      toggleBtn.lastChild.textContent = on ? 'Preview' : 'Edit';
      toggleBtn.title = on ? 'Back to reading the document' : 'Click any block to edit it in place';
      toggleBtn.replaceChild(icon(on ? 'eye' : 'pencil'), toggleBtn.firstChild);
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
      openBlockEditor(host, e.target, { x: e.clientX, y: e.clientY });
    });

    function openBlockEditor(host, clickTarget, clickPoint) {
      if (open && open.host === host) return;
      /* Where in the text the click landed, measured before the block is swapped out. */
      var clickOffset = clickPoint ? textOffsetAt(host, clickPoint.x, clickPoint.y) : null;
      closeBlockEditor();
      hideMenu();

      var start = parseInt(host.getAttribute('data-mdstyled-start'), 10);
      var end = parseInt(host.getAttribute('data-mdstyled-end'), 10);

      /* A `<!-- .note -->` line belongs to the block it decorates, and the Style
         section of the dropdown rewrites it. Depending on whether a blank line
         separates the two, it falls either inside the block's own range or on the
         line above, so look in both places. */
      var CLASS_COMMENT = /^\s*<!--\s*((?:\.[A-Za-z0-9_-]+\s*)+)-->\s*$/;

      var rangeStart = start;
      var blockClasses = [];
      var bodySource = api.getSource(start, end);

      var bodyLines = bodySource.split('\n');
      var inside = bodyLines[0].match(CLASS_COMMENT);
      var above = start > 0 ? api.getSource(start - 1, start).match(CLASS_COMMENT) : null;

      if (inside) {
        blockClasses = inside[1].trim().split(/\s+/).map(function (c) { return c.slice(1); });
        bodySource = bodyLines.slice(1).join('\n');
      } else if (above) {
        blockClasses = above[1].trim().split(/\s+/).map(function (c) { return c.slice(1); });
        rangeStart = start - 1;
      }

      var original = api.getSource(rangeStart, end);
      var group = groupFor(host);

      /* A card in a grid, or a `.cards` list, opens the card designer instead. */
      var design = cardDesignFor(host, start, end, rangeStart, blockClasses);
      if (design) {
        openCardDesigner(host, design, clickTarget);
        return;
      }

      /* Tables get the table designer, unless they are too irregular to round-trip. */
      if (detectBlockType(bodySource) === 'table') {
        var tableModel = parseMarkdownTable(bodySource);
        if (tableModel) {
          openTableDesigner(host, {
            model: tableModel, from: rangeStart, to: end, classes: blockClasses, nodes: group
          }, clickTarget);
          return;
        }
      }

      var CARD_MARKDOWN = '<!-- .card -->\n> ### New card\n>\n> What this card is about.';

      var wrap = el('div', 'mdstyled-block-editor');

      /* toolbar */
      var toolbar = el('div', 'mdstyled-editor-toolbar');

      /* Nine block types is too many to keep on the bar. The two people reach for
         most stay as icons; the rest live in the dropdown, which doubles as the
         readout of what this block currently is. */
      var typeGroup = el('div', 'mdstyled-tool-group mdstyled-type-group');
      typeGroup.setAttribute('role', 'group');
      typeGroup.setAttribute('aria-label', 'Block type');

      var typeSelect = el('button', 'mdstyled-select');
      typeSelect.type = 'button';
      typeSelect.title = 'Turn this block into';
      typeSelect.setAttribute('aria-haspopup', 'menu');
      typeSelect.setAttribute('aria-expanded', 'false');
      var typeSelectIcon = el('span', 'mdstyled-select-icon');
      var typeSelectLabel = el('span', 'mdstyled-select-label', 'Text');
      typeSelect.appendChild(typeSelectIcon);
      typeSelect.appendChild(typeSelectLabel);
      typeSelect.appendChild(icon('chevron', 14));

      var typeMenu = el('div', 'mdstyled-select-menu');
      typeMenu.hidden = true;
      typeMenu.setAttribute('role', 'menu');

      function menuSection(title) {
        typeMenu.appendChild(el('div', 'mdstyled-select-title', title));
      }

      function menuItem(config, role) {
        var item = button(config.label, 'mdstyled-select-item');
        item.setAttribute('role', role);
        item.insertBefore(
          config.glyph ? el('span', 'mdstyled-tool-glyph', config.glyph) : icon(config.icon),
          item.firstChild
        );
        item.addEventListener('mousedown', function (e) { e.preventDefault(); });
        typeMenu.appendChild(item);
        return item;
      }

      menuSection('Turn into');
      var typeItems = BLOCK_TOOLS.filter(function (tool) { return !tool.hidden; }).map(function (tool) {
        var item = menuItem(tool, 'menuitemradio');
        item.addEventListener('click', function () {
          closeTypeMenu();
          changeType(tool.type);
        });
        return { button: item, tool: tool };
      });

      /* Template components. These are classes on the block, not a different block. */
      menuSection('Style');
      var styleItems = STYLE_TOOLS.filter(function (tool) { return !tool.hidden; }).map(function (tool) {
        var item = menuItem(tool, 'menuitemcheckbox');
        item.addEventListener('click', function () {
          closeTypeMenu();
          toggleStyle(tool);
        });
        return { button: item, tool: tool };
      });

      var clearStyle = menuItem({ label: 'No style', icon: 'clear' }, 'menuitem');
      clearStyle.classList.add('mdstyled-select-clear');
      clearStyle.addEventListener('click', function () {
        closeTypeMenu();
        setBlockClasses(blockClasses.filter(function (c) { return MANAGED_CLASSES.indexOf(c) === -1; }));
      });

      function closeTypeMenu() {
        typeMenu.hidden = true;
        typeSelect.setAttribute('aria-expanded', 'false');
      }

      function setBlockClasses(classes) {
        blockClasses = classes;
        syncToolbar();
      }

      /* One style at a time: picking another replaces the one that was on the block. */
      function toggleStyle(tool) {
        var wanted = tool.cls.split(/\s+/);
        var kept = blockClasses.filter(function (c) { return MANAGED_CLASSES.indexOf(c) === -1; });
        var alreadyOn = wanted.every(function (c) { return blockClasses.indexOf(c) !== -1; }) &&
          blockClasses.filter(function (c) { return MANAGED_CLASSES.indexOf(c) !== -1; }).length === wanted.length;

        setBlockClasses(alreadyOn ? kept : kept.concat(wanted));
      }

      typeSelect.addEventListener('mousedown', function (e) { e.preventDefault(); });
      typeSelect.addEventListener('click', function (e) {
        e.stopPropagation();
        var opening = typeMenu.hidden;
        colorPopover.hidden = true;
        typeMenu.hidden = !opening;
        typeSelect.setAttribute('aria-expanded', String(opening));
      });

      typeGroup.appendChild(typeSelect);
      typeGroup.appendChild(typeMenu);

      /* Quick block types, kept on the bar. */
      var typeButtons = BLOCK_TOOLS.filter(function (tool) { return tool.quick; }).map(function (tool) {
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

      /* ── A lone card can grow into a grid ── */

      if (blockClasses.indexOf('card') !== -1 && !findCardGrid(start, end)) {
        var cardBar = el('div', 'mdstyled-card-bar');
        cardBar.appendChild(el('span', 'mdstyled-card-count', 'Single card'));

        var addCardBtn = button('Add card', 'mdstyled-card-add');
        addCardBtn.insertBefore(icon('plus', 14), addCardBtn.firstChild);
        addCardBtn.title = 'Turn this card into a card grid with a second card';
        addCardBtn.addEventListener('click', function () { addCard(); });
        cardBar.appendChild(addCardBtn);

        wrap.appendChild(cardBar);
      }

      /* One write: this card as edited, a new card, and the grid around both. The
         designer opens on the grid once the preview has re-rendered. */
      function addCard() {
        var text = '<div class="mdstyled-cards cols-2">\n\n' + composed() + '\n\n' + CARD_MARKDOWN + '\n\n</div>';
        patchState({ scrollY: window.scrollY, editMode: true, focusLine: rangeStart + 2 });
        api.saveBlock(rangeStart, end, text, original).catch(reportError);
      }

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

      /* emoji picker */
      var emojiPopover = el('div', 'mdstyled-popover mdstyled-emoji-popover');
      emojiPopover.hidden = true;

      var emojiSearch = document.createElement('input');
      emojiSearch.type = 'text';
      emojiSearch.className = 'mdstyled-emoji-search';
      emojiSearch.placeholder = 'Search emoji';
      emojiSearch.setAttribute('aria-label', 'Search emoji');
      emojiPopover.appendChild(emojiSearch);

      var emojiBody = el('div', 'mdstyled-emoji-body');
      emojiPopover.appendChild(emojiBody);

      function emojiButton(entry) {
        var b = el('button', 'mdstyled-emoji', entry.char);
        b.type = 'button';
        b.title = ':' + entry.name + ':';
        b.setAttribute('aria-label', entry.name);
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function () {
          emojiPopover.hidden = true;
          insertEmoji(entry.char);
        });
        return b;
      }

      function renderEmoji(query) {
        emojiBody.textContent = '';

        if (query) {
          var matches = searchEmoji(query, 48);
          if (matches.length === 0) {
            emojiBody.appendChild(el('p', 'mdstyled-emoji-none', 'Nothing matches ' + query));
            return;
          }
          var grid = el('div', 'mdstyled-emoji-grid');
          matches.forEach(function (entry) { grid.appendChild(emojiButton(entry)); });
          emojiBody.appendChild(grid);
          return;
        }

        EMOJI_GROUPS.forEach(function (group) {
          emojiBody.appendChild(el('div', 'mdstyled-emoji-title', group.name));
          var grid = el('div', 'mdstyled-emoji-grid');
          group.items.forEach(function (item) {
            grid.appendChild(emojiButton({ char: item[0], name: item[1].split(' ')[0] }));
          });
          emojiBody.appendChild(grid);
        });
      }

      emojiSearch.addEventListener('input', function () { renderEmoji(emojiSearch.value.trim()); });
      emojiSearch.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); emojiPopover.hidden = true; }
        else if (e.key === 'Enter') {
          e.preventDefault();
          var first = emojiBody.querySelector('.mdstyled-emoji');
          if (first) first.click();
        }
      });

      wrap.appendChild(emojiPopover);

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
      var status = el('span', 'mdstyled-edit-status', 'Ctrl/Cmd+Enter to save, Esc to cancel');

      /* Destructive, so it sits away from Save and stays quiet until it is armed. */
      var deleteBtn = button('', 'mdstyled-delete');
      deleteBtn.appendChild(icon('trash', 15));
      var deleteLabel = el('span', 'mdstyled-btn-label', 'Delete');
      deleteBtn.appendChild(deleteLabel);
      deleteBtn.title = 'Delete this block';
      deleteBtn.setAttribute('aria-label', 'Delete this block');

      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      actions.appendChild(status);
      actions.appendChild(el('span', 'mdstyled-actions-spacer'));
      actions.appendChild(deleteBtn);
      wrap.appendChild(actions);

      group[0].parentNode.insertBefore(wrap, group[0]);
      group.forEach(function (node) { node.classList.add('mdstyled-editable-hidden'); });
      open = { host: host, group: group, wrap: wrap };
      api.setEditorOpen(true);

      /* ── modes ── */

      var mode = 'rich';
      var blockType = detectBlockType(bodySource);

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
          /* The first time in, the caret goes where the block was clicked. */
          if (clickOffset != null) {
            var at = sourceIndexForOffset(ta.value, clickOffset);
            ta.setSelectionRange(at, at);
            clickOffset = null;
          }
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
          normaliseTaskLists();
          rich.focus();
          /* The first time in, the caret goes where the block was clicked. */
          if (clickOffset != null) {
            placeCaretAtOffset(rich, clickOffset);
            clickOffset = null;
          } else {
            placeCaretAtEnd();
          }
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
      /* `*` and `**` share a character, so a marker only counts when the run of that
         character stops where the marker does. Without this, italic on `**bold**`
         peels one star off each side and turns it into `*bold*`. */
      function markerInside(value, from, to, marker) {
        var width = marker.length;
        var ch = marker.charAt(0);
        var selected = value.slice(from, to);

        return selected.length >= width * 2 &&
          selected.slice(0, width) === marker &&
          selected.charAt(width) !== ch &&
          selected.slice(-width) === marker &&
          selected.charAt(selected.length - width - 1) !== ch;
      }

      function markerOutside(value, from, to, marker) {
        var width = marker.length;
        var ch = marker.charAt(0);

        return from >= width &&
          value.slice(from - width, from) === marker &&
          value.slice(to, to + width) === marker &&
          value.charAt(from - width - 1) !== ch &&
          value.charAt(to + width) !== ch;
      }

      function toggleMarkers(marker) {
        var from = ta.selectionStart;
        var to = ta.selectionEnd;
        var value = ta.value;
        var selected = value.slice(from, to);
        var width = marker.length;

        if (markerInside(value, from, to, marker)) {
          var unwrapped = selected.slice(width, -width);
          ta.value = value.slice(0, from) + unwrapped + value.slice(to);
          setSelection(from, from + unwrapped.length);
        } else if (markerOutside(value, from, to, marker)) {
          ta.value = value.slice(0, from - width) + selected + value.slice(to + width);
          setSelection(from - width, from - width + selected.length);
        } else {
          var text = selected || 'text';
          ta.value = value.slice(0, from) + marker + text + marker + value.slice(to);
          setSelection(from + width, from + width + text.length);
        }

        autosize(ta);
        syncToolbar();
      }

      function markersActive(marker) {
        var from = ta.selectionStart;
        var to = ta.selectionEnd;
        var value = ta.value;

        return markerInside(value, from, to, marker) || markerOutside(value, from, to, marker);
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

        if (tool.action === 'emoji') {
          colorPopover.hidden = true;
          typeMenu.hidden = true;
          typeSelect.setAttribute('aria-expanded', 'false');

          var opening = emojiPopover.hidden;
          if (opening) {
            emojiSearch.value = '';
            renderEmoji('');
          }
          emojiPopover.hidden = !opening;
          if (opening) emojiSearch.focus();
          return;
        }

        if (tool.action === 'color') {
          typeMenu.hidden = true;
          typeSelect.setAttribute('aria-expanded', 'false');
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

        /* Looked up in the full list, so a hidden type still reads out correctly. */
        var current = null;
        BLOCK_TOOLS.forEach(function (tool) { if (tool.type === type) current = tool; });
        typeItems.forEach(function (entry) {
          var active = entry.tool.type === type;
          entry.button.classList.toggle('active', active);
          entry.button.setAttribute('aria-checked', String(active));
        });

        var styled = null;
        styleItems.forEach(function (entry) {
          var wanted = entry.tool.cls.split(/\s+/);
          var active = wanted.every(function (c) { return blockClasses.indexOf(c) !== -1; }) &&
            blockClasses.filter(function (c) { return MANAGED_CLASSES.indexOf(c) !== -1; }).length === wanted.length;

          if (active) styled = entry.tool;
          entry.button.classList.toggle('active', active);
          entry.button.setAttribute('aria-checked', String(active));

          var applies = !entry.tool.on || entry.tool.on.indexOf(type) !== -1;
          entry.button.disabled = !applies;
          entry.button.title = applies ? '' : 'Only applies to a list';
        });
        clearStyle.disabled = blockClasses.filter(function (c) {
          return MANAGED_CLASSES.indexOf(c) !== -1;
        }).length === 0;

        typeSelectLabel.textContent = styled
          ? styled.label
          : (current ? current.label : 'Block');
        typeSelectIcon.textContent = '';
        if (current) {
          typeSelectIcon.appendChild(
            current.glyph ? el('span', 'mdstyled-tool-glyph', current.glyph) : icon(current.icon)
          );
        }

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

      /* Enter in a checklist produces a bare <li>; give it its checkbox straight away. */
      rich.addEventListener('input', normaliseTaskLists);

      ['input', 'keyup', 'mouseup'].forEach(function (event) {
        rich.addEventListener(event, updateSuggestions);
        ta.addEventListener(event, updateSuggestions);
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

      /* The class comment plus the block body, as it will sit in the file. */
      function composed() {
        var body = currentMarkdown();
        if (blockClasses.length === 0) return body;
        return '<!-- ' + blockClasses.map(function (c) { return '.' + c; }).join(' ') + ' -->\n' + body;
      }

      function commit() {
        var markdown = composed();
        saveBtn.disabled = true;
        cancelBtn.disabled = true;
        deleteBtn.disabled = true;
        status.classList.remove('error');
        status.textContent = 'Saving...';
        patchState({ scrollY: window.scrollY, editMode: true, place: placeOf(rangeStart, wrap) });

        api.saveBlock(rangeStart, end, markdown, original).then(function () {
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

      function closeEmojiUi() {
        emojiPopover.hidden = true;
        hideSuggestions();
      }

      function disarmDelete() {
        if (!deleteArmed) return;
        deleteArmed = false;
        deleteBtn.classList.remove('armed');
        deleteLabel.textContent = 'Delete';
        deleteBtn.title = 'Delete this block';
        deleteBtn.setAttribute('aria-label', 'Delete this block');
        if (status.textContent === 'Click again to remove this block.') {
          status.textContent = 'Ctrl/Cmd+Enter to save, Esc to cancel';
        }
      }

      /* Anything else you do in the editor puts the safety back on. */
      wrap.addEventListener('click', function (e) {
        if (!e.target.closest('.mdstyled-delete')) disarmDelete();
        if (!e.target.closest('.mdstyled-emoji-popover, .mdstyled-format-emoji')) emojiPopover.hidden = true;
      }, true);
      wrap.addEventListener('keydown', disarmDelete, true);

      deleteBtn.addEventListener('click', function () {
        if (!deleteArmed) {
          deleteArmed = true;
          deleteBtn.classList.add('armed');
          deleteLabel.textContent = 'Delete?';
          deleteBtn.title = 'Click again to delete this block';
          deleteBtn.setAttribute('aria-label', 'Confirm delete');
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

        patchState({ scrollY: window.scrollY, editMode: true, place: placeOf(rangeStart, wrap) });
        api.saveBlock(rangeStart, deleteEnd, '', original + trailing).then(function () {
          closeBlockEditor();
        }, function (err) {
          disarmDelete();
          status.classList.add('error');
          status.textContent = (err && err.message) ? err.message : 'Delete failed.';
        });
      });

      /* ── Emoji ── */

      /* Drops the character in wherever the caret is, in either surface. */
      function insertEmoji(char, replaceLength) {
        var back = replaceLength || 0;

        if (mode === 'markdown') {
          var from = ta.selectionStart - back;
          var to = ta.selectionEnd;
          ta.value = ta.value.slice(0, from) + char + ta.value.slice(to);
          ta.focus();
          ta.setSelectionRange(from + char.length, from + char.length);
          autosize(ta);
          syncToolbar();
          return;
        }

        focusRich();
        if (back > 0) {
          /* Take the `:query` the character replaces with it. */
          var selection = window.getSelection();
          if (selection && selection.rangeCount) {
            var range = selection.getRangeAt(0);
            var offset = range.startOffset;
            if (range.startContainer.nodeType === 3 && offset >= back) {
              range.setStart(range.startContainer, offset - back);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
        if (!exec('insertText', char)) {
          var current = window.getSelection();
          if (current && current.rangeCount) {
            var at = current.getRangeAt(0);
            at.deleteContents();
            at.insertNode(document.createTextNode(char));
            at.collapse(false);
          }
        }
        syncToolbar();
      }

      /* ── `:shortcode` autocomplete ── */

      var SHORTCODE = /(?:^|[\s(>])(:([a-z0-9_+-]{1,24}))$/;

      var suggestBar = el('div', 'mdstyled-emoji-suggest');
      suggestBar.hidden = true;
      suggestBar.setAttribute('role', 'listbox');

      /* Sits directly under the surface being typed in, above the actions. */
      wrap.insertBefore(suggestBar, actions);

      var suggestions = [];
      var suggestIndex = 0;
      var suggestQuery = '';

      /* The text immediately before the caret, in whichever surface is showing. */
      function textBeforeCaret() {
        if (mode === 'markdown') return ta.value.slice(0, ta.selectionStart);

        var selection = window.getSelection();
        if (!selection || !selection.rangeCount) return '';
        var range = selection.getRangeAt(0);
        if (range.startContainer.nodeType !== 3) return '';
        return range.startContainer.nodeValue.slice(0, range.startOffset);
      }

      function hideSuggestions() {
        suggestBar.hidden = true;
        suggestions = [];
        suggestQuery = '';
      }

      function highlightSuggestion() {
        Array.prototype.forEach.call(suggestBar.children, function (node, i) {
          node.classList.toggle('active', i === suggestIndex);
          node.setAttribute('aria-selected', String(i === suggestIndex));
        });
      }

      function updateSuggestions() {
        var match = textBeforeCaret().match(SHORTCODE);
        if (!match) { hideSuggestions(); return; }

        var found = searchEmoji(match[2], 8);
        if (found.length === 0) { hideSuggestions(); return; }

        suggestions = found;
        suggestQuery = match[1];
        suggestIndex = 0;
        suggestBar.textContent = '';

        found.forEach(function (entry, i) {
          var b = el('button', 'mdstyled-emoji-option');
          b.type = 'button';
          b.setAttribute('role', 'option');
          b.appendChild(el('span', 'mdstyled-emoji-glyph', entry.char));
          b.appendChild(el('span', 'mdstyled-emoji-name', ':' + entry.name + ':'));
          b.addEventListener('mousedown', function (e) { e.preventDefault(); });
          b.addEventListener('click', function () { chooseSuggestion(i); });
          suggestBar.appendChild(b);
        });

        suggestBar.hidden = false;
        highlightSuggestion();
      }

      function chooseSuggestion(i) {
        var entry = suggestions[i === undefined ? suggestIndex : i];
        var back = suggestQuery.length;
        hideSuggestions();
        if (entry) insertEmoji(entry.char, back);
      }

      /* Arrow keys, Enter and Tab belong to the list while it is open. */
      function suggestionKeydown(e) {
        if (suggestBar.hidden) return false;

        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          suggestIndex = (suggestIndex + 1) % suggestions.length;
          highlightSuggestion();
          return true;
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          suggestIndex = (suggestIndex - 1 + suggestions.length) % suggestions.length;
          highlightSuggestion();
          return true;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          chooseSuggestion();
          return true;
        }
        if (e.key === 'Escape') {
          hideSuggestions();
          return true;
        }
        return false;
      }

      /* ── Caret ── */

      /* Land where typing continues, not before the first character. */
      /* Down to the innermost first or last place text can go - so a caret put "at the
         end of a list" ends up in its last item, not loose between the <li>s. */
      function editableEdge(node, atEnd) {
        while (node && node.nodeType === 1) {
          var child = atEnd ? node.lastChild : node.firstChild;
          while (child && (
            (child.nodeType === 3 && !child.nodeValue.trim()) ||
            (child.nodeType === 1 && (child.getAttribute('contenteditable') === 'false' || child.tagName === 'BR' || child.tagName === 'INPUT'))
          )) {
            child = atEnd ? child.previousSibling : child.nextSibling;
          }
          if (!child) return node;
          node = child;
        }
        return node;
      }

      function placeCaretIn(node, atEnd) {
        var selection = window.getSelection();
        if (!selection || !node) return;
        try {
          var target = editableEdge(node, atEnd);
          var range = document.createRange();
          if (target.nodeType === 3) {
            range.setStart(target, atEnd ? target.nodeValue.length : 0);
          } else {
            range.selectNodeContents(target);
            range.collapse(!atEnd);
          }
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (err) { /* nothing worth breaking the editor over */ }
      }

      /* Puts the caret after the `offset`-th visible character, as textOffsetAt counts them. */
      function placeCaretAtOffset(root, offset) {
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        var seen = 0;
        var node;
        while ((node = walker.nextNode())) {
          if (node.parentElement && node.parentElement.closest('[contenteditable="false"]')) continue;
          var text = node.nodeValue;
          for (var i = 0; i < text.length; i++) {
            if (/\s/.test(text.charAt(i))) continue;
            if (seen === offset) { setCaret(node, i); return; }
            seen++;
          }
          if (seen === offset && text.trim()) { setCaret(node, text.replace(/\s+$/, '').length); return; }
        }
        placeCaretAtEnd();
      }

      function setCaret(node, offset) {
        var selection = window.getSelection();
        if (!selection) return;
        var range = document.createRange();
        range.setStart(node, offset);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      function placeCaretAtEnd() {
        placeCaretIn(rich.lastElementChild || rich.lastChild || rich, true);
      }

      /* Clicking the empty space around the text still has to give you a caret -
         otherwise the editor looks unresponsive everywhere but on a character. */
      rich.addEventListener('mousedown', function (e) {
        if (e.target !== rich) return;
        e.preventDefault();
        rich.focus();

        var blocks = rich.children;
        if (blocks.length === 0) {
          placeCaretIn(rich, true);
          return;
        }

        /* Above the first block puts the caret at its start, below the last at its
           end, and anywhere else lands in whichever block the click was nearest. */
        var y = e.clientY;
        var first = blocks[0].getBoundingClientRect();
        if (y < first.top) {
          placeCaretIn(blocks[0], false);
          return;
        }

        var target = blocks[blocks.length - 1];
        for (var i = 0; i < blocks.length; i++) {
          var box = blocks[i].getBoundingClientRect();
          if (y <= box.bottom) { target = blocks[i]; break; }
        }
        placeCaretIn(target, true);
      });

      /* ── Checklists in the rich surface ── */

      /* The browser splits an <li> on Enter but knows nothing about task lists, so the
         new item comes out without its checkbox. Put one back on any item that is
         missing it, which is what makes Enter in a checklist feel right. */
      function normaliseTaskLists() {
        var lists = rich.querySelectorAll('ul');

        Array.prototype.forEach.call(lists, function (list) {
          if (!list.querySelector('input[type="checkbox"]')) return;
          list.classList.add('contains-task-list');

          Array.prototype.forEach.call(list.children, function (item) {
            if (item.tagName !== 'LI') return;
            item.classList.add('task-list-item');

            var box = null;
            for (var i = 0; i < item.children.length; i++) {
              if (item.children[i].tagName === 'INPUT' && item.children[i].type === 'checkbox') {
                box = item.children[i];
                break;
              }
            }

            if (!box) {
              box = document.createElement('input');
              box.type = 'checkbox';
              box.className = 'task-list-item-checkbox';
              item.insertBefore(box, item.firstChild);
              /* The renderer puts a space after the box; keep the markup identical. */
              var after = box.nextSibling;
              if (!after || after.nodeType !== 3 || !/^\s/.test(after.nodeValue)) {
                item.insertBefore(document.createTextNode(' '), box.nextSibling);
              }
            }

            /* markdown-it renders task boxes disabled. Inside the editor they are
               the control you tick, so re-enable them. */
            box.disabled = false;
            box.removeAttribute('disabled');
            /* Atomic as far as the caret is concerned. */
            box.setAttribute('contenteditable', 'false');
          });
        });
      }

      /* ── Typing in lists ── */

      /* indent · bullet · gap · optional `[ ]` · the rest of the line */
      var LIST_LINE = /^(\s*)([-*+]|\d+[.)])(\s+)(\[[ xX]\]\s+)?(.*)$/;
      var QUOTE_LINE = /^(\s*>\s?)(.*)$/;

      function lineAround(pos) {
        var value = ta.value;
        var from = value.lastIndexOf('\n', pos - 1) + 1;
        var to = value.indexOf('\n', pos);
        return { from: from, to: to === -1 ? value.length : to, text: value.slice(from, to === -1 ? value.length : to) };
      }

      function replaceRange(from, to, text, caret) {
        ta.value = ta.value.slice(0, from) + text + ta.value.slice(to);
        var at = caret === undefined ? from + text.length : caret;
        ta.setSelectionRange(at, at);
        autosize(ta);
        syncToolbar();
      }

      /**
       * Enter inside a list carries the marker down to the next line - including the
       * `[ ]` of a checklist, always unchecked. On an item that is still empty it
       * clears the marker instead, which is how every editor lets you leave a list.
       */
      function continueList() {
        if (ta.selectionStart !== ta.selectionEnd) return false;

        var pos = ta.selectionStart;
        var line = lineAround(pos);
        var list = line.text.match(LIST_LINE);

        if (list) {
          var indent = list[1];
          var bullet = list[2];
          var gap = list[3];
          var task = list[4];
          var body = list[5];

          /* Caret still inside the marker: Enter should push the item down, not
             stamp a second marker in front of the first. */
          var prefix = indent + bullet + gap + (task || '');
          if (pos - line.from < prefix.length) return false;

          if (body.trim() === '') {
            /* Step out one level, or drop the marker entirely at the top level. */
            replaceRange(line.from, line.to, indent.length >= 2 ? indent.slice(2) + bullet + gap + (task ? '[ ] ' : '') : '');
            return true;
          }

          var next = bullet;
          if (/^\d/.test(bullet)) {
            next = (parseInt(bullet, 10) + 1) + bullet.replace(/^\d+/, '');
          }

          /* Splitting an item mid-text: the remainder becomes the next item, without
             inheriting the space the caret was sitting on. */
          var tail = ta.value.slice(pos, line.to);
          var lead = tail.length - tail.replace(/^ +/, '').length;

          replaceRange(pos, pos + lead, '\n' + indent + next + gap + (task ? '[ ] ' : ''));
          return true;
        }

        var quote = line.text.match(QUOTE_LINE);
        if (quote) {
          if (quote[2].trim() === '') {
            replaceRange(line.from, line.to, '');
            return true;
          }
          replaceRange(pos, pos, '\n' + quote[1]);
          return true;
        }

        return false;
      }

      /* Tab moves a list item in and out a level, the way it does in the rich surface. */
      function indentListLine(outdent) {
        var line = lineAround(ta.selectionStart);
        if (!LIST_LINE.test(line.text)) return false;

        var caret = ta.selectionStart;
        if (outdent) {
          if (!/^\s{2}/.test(line.text)) return false;
          replaceRange(line.from, line.to, line.text.slice(2), Math.max(line.from, caret - 2));
        } else {
          replaceRange(line.from, line.to, '  ' + line.text, caret + 2);
        }
        return true;
      }

      /* ── Enter in rich-text lists ── */

      function taskBox(item) {
        for (var i = 0; i < item.children.length; i++) {
          var child = item.children[i];
          if (child.tagName === 'INPUT' && child.type === 'checkbox') return child;
        }
        return null;
      }

      function newTaskBox() {
        var box = document.createElement('input');
        box.type = 'checkbox';
        box.className = 'task-list-item-checkbox';
        box.setAttribute('contenteditable', 'false');
        return box;
      }

      /* The item's own text, leaving out any list nested inside it. */
      function itemIsEmpty(item) {
        for (var i = 0; i < item.childNodes.length; i++) {
          var child = item.childNodes[i];
          if (child.nodeType === 1 && (child.tagName === 'UL' || child.tagName === 'OL')) return false;
          if (child.textContent.trim()) return false;
        }
        return true;
      }

      /* An empty item or paragraph still needs something for the caret to sit on. */
      function keepOpen(node) {
        if (node.textContent.trim() || node.querySelector('br, img')) return;
        var blocks = node.querySelectorAll ? node.querySelectorAll('p') : [];
        var target = blocks.length ? blocks[blocks.length - 1] : node;
        target.appendChild(document.createElement('br'));
      }

      /* Caret at the start of an item's text, after its checkbox. */
      function caretToItemStart(item) {
        var walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT, null);
        var node;
        while ((node = walker.nextNode())) {
          if (node.parentElement.closest('[contenteditable="false"]')) continue;
          if (!node.nodeValue.trim()) continue;
          setCaret(node, node.nodeValue.length - node.nodeValue.replace(/^\s+/, '').length);
          return;
        }
        var br = item.querySelector('br');
        var range = document.createRange();
        if (br) range.setStartBefore(br);
        else { range.selectNodeContents(item); range.collapse(false); }
        range.collapse(true);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }

      function blankItemLike(item) {
        var fresh = document.createElement('li');
        if (item.className) fresh.className = item.className;
        if (taskBox(item)) {
          fresh.appendChild(newTaskBox());
          fresh.appendChild(document.createTextNode(' '));
        }
        return fresh;
      }

      /* Everything after the caret moves into a new item below; a checklist item gets
         a fresh, unticked box. At the very start of the text, the new item goes above. */
      function splitItem(item) {
        var selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        var range = selection.getRangeAt(0);
        if (!range.collapsed) range.deleteContents();

        var head = document.createRange();
        head.selectNodeContents(item);
        head.setEnd(range.startContainer, range.startOffset);

        if (!head.toString().trim()) {
          var above = blankItemLike(item);
          if (item.querySelector(':scope > p')) above.appendChild(document.createElement('p'));
          keepOpen(above);
          item.parentNode.insertBefore(above, item);
          return;
        }

        var tail = document.createRange();
        tail.setStart(range.startContainer, range.startOffset);
        tail.setEndAfter(item.lastChild);
        var moved = tail.extractContents();
        Array.prototype.forEach.call(moved.querySelectorAll('input[type="checkbox"]'), function (box) {
          box.parentNode.removeChild(box);
        });

        var next = blankItemLike(item);
        next.appendChild(moved);
        /* Leading whitespace carried over from the split would sit before the text. */
        var first = next.firstChild;
        while (first && first.nodeType === 1 && first.tagName === 'INPUT') first = first.nextSibling;
        if (first && first.nodeType === 3 && first.nextSibling && first.nextSibling.nodeType === 3) {
          first.nextSibling.nodeValue = first.nextSibling.nodeValue.replace(/^\s+/, '');
        }

        /* A loose item splits inside its paragraph; drop paragraphs the split emptied. */
        [item, next].forEach(function (li) {
          Array.prototype.forEach.call(li.querySelectorAll(':scope > p'), function (para) {
            if (!para.textContent.trim() && !para.querySelector('br, img') && li.querySelectorAll(':scope > p').length > 1) {
              li.removeChild(para);
            }
          });
          keepOpen(li);
        });

        item.parentNode.insertBefore(next, item.nextSibling);
        caretToItemStart(next);
      }

      /* Enter on an empty item ends the list there with a new paragraph; the items
         after it carry on as a list of their own. A nested item moves out a level. */
      function leaveList(item) {
        var list = item.parentNode;
        if (list.parentNode !== rich) {
          exec('outdent');
          return;
        }

        var items = Array.prototype.slice.call(list.children);
        var index = items.indexOf(item);
        var after = items.slice(index + 1);

        var para = document.createElement('p');
        para.appendChild(document.createElement('br'));
        list.removeChild(item);
        list.parentNode.insertBefore(para, list.nextSibling);

        if (after.length) {
          var rest = list.cloneNode(false);
          if (list.tagName === 'OL') {
            var start = parseInt(list.getAttribute('start') || '1', 10);
            rest.setAttribute('start', String(start + index));
          }
          after.forEach(function (li) { rest.appendChild(li); });
          list.parentNode.insertBefore(rest, para.nextSibling);
        }
        if (!list.children.length) list.parentNode.removeChild(list);

        var range = document.createRange();
        range.setStartBefore(para.firstChild);
        range.collapse(true);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }

      function caretElement() {
        var selection = window.getSelection();
        if (!selection || !selection.anchorNode) return null;
        var node = selection.anchorNode;
        return node.nodeType === 1 ? node : node.parentElement;
      }

      function onKeydown(e) {
        if (suggestionKeydown(e)) {
          e.preventDefault();
          return;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          closeBlockEditor();
          return;
        }

        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          commit();
          return;
        }

        if (e.key === 'Enter' && !e.shiftKey && mode === 'markdown' && e.target === ta) {
          if (continueList()) e.preventDefault();
          return;
        }

        if (e.key === 'Enter' && !e.shiftKey && mode === 'rich' && e.target === rich) {
          var current = caretElement();
          var item = current && current.closest ? current.closest('li') : null;
          if (!item || !rich.contains(item)) return;

          /* Handled here rather than by the browser, which knows nothing about task
             checkboxes and, in a loose list, adds a paragraph instead of an item. */
          e.preventDefault();
          if (itemIsEmpty(item)) leaveList(item);
          else splitItem(item);
          syncToolbar();
          return;
        }

        if (e.key === 'Tab') {
          if (mode === 'markdown' && e.target === ta) {
            if (indentListLine(e.shiftKey)) e.preventDefault();
            return;
          }
          if (mode === 'rich' && e.target === rich) {
            /* Tab indents list items; everywhere else it should still move focus. */
            var element = caretElement();
            if (element && element.closest && element.closest('li')) {
              e.preventDefault();
              exec(e.shiftKey ? 'outdent' : 'indent');
            }
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
        api.render(bodySource).then(function (html) {
          var probe = document.createElement('div');
          probe.innerHTML = html;

          if (htmlToMarkdown(probe) === bodySource.trim()) {
            setMode('rich', bodySource, html);
          } else {
            setMode('markdown', bodySource);
            modeBtn.title = 'Rich text editing would restyle this block\u2019s Markdown';
            wrap.classList.add('mdstyled-prefers-markdown');
            status.textContent = 'Opened as Markdown to keep this block\u2019s formatting.';
          }
        }, function () {
          setMode('markdown', bodySource);
        });
      } else {
        setMode('markdown', bodySource);
        modeBtn.disabled = blockType === 'table' || blockType === 'hr';
        if (modeBtn.disabled) modeBtn.title = 'This block is edited as Markdown';
      }
    }

    /* ── Card designer ── */

    /* Walks out from a block to the `<div class="mdstyled-cards">` around it. */
    function findCardGrid(start, end) {
      var openLine = -1;
      for (var up = start - 1; up >= 0; up--) {
        var line = api.getSource(up, up + 1);
        if (CARD_GRID_CLOSE.test(line)) return null;
        if (CARD_GRID_OPEN.test(line)) { openLine = up; break; }
      }
      if (openLine === -1) return null;

      for (var down = end; down < api.lineCount; down++) {
        if (CARD_GRID_CLOSE.test(api.getSource(down, down + 1))) return { open: openLine, close: down };
      }
      return null;
    }

    /* What the designer would edit for this block, or null to use the block editor. */
    function cardDesignFor(host, start, end, rangeStart, blockClasses) {
      var grid = findCardGrid(start, end);
      if (grid) {
        var gridModel = parseCardGrid(api.getSource(grid.open, grid.close + 1));
        if (!gridModel) return null;
        var gridNode = host.closest('.mdstyled-cards');
        return {
          model: gridModel,
          from: grid.open,
          to: grid.close + 1,
          nodes: gridNode ? [gridNode] : groupFor(host),
          focus: gridNode
            ? Array.prototype.indexOf.call(gridNode.querySelectorAll(':scope > .mdstyled-editable'), host)
            : 0
        };
      }

      if (blockClasses.indexOf('cards') !== -1) {
        var lines = api.getSource(rangeStart, end).split('\n');
        if (parseClassComment(lines[0])) lines = lines.slice(1);
        var listModel = parseCardList(blockClasses, lines.join('\n'));
        if (!listModel) return null;
        return { model: listModel, from: rangeStart, to: end, nodes: groupFor(host), focus: -1 };
      }

      return null;
    }

    /* Reads the designer's own Markdown back, for the Markdown/Designer toggle. */
    function parseCardSource(kind, text) {
      if (kind === 'grid') return parseCardGrid(text.replace(/\s+$/, ''));
      var lines = text.replace(/\s+$/, '').split('\n');
      var classes = parseClassComment(lines[0] || '');
      if (!classes || classes.indexOf('cards') === -1) return null;
      return parseCardList(classes, lines.slice(1).join('\n'));
    }

    function openCardDesigner(host, design, clickTarget) {
      var model = design.model;
      var original = api.getSource(design.from, design.to);
      var isList = model.kind === 'list';
      var mode = 'design';

      /* Start on the card that was clicked. */
      var focusIndex = design.focus;
      if (focusIndex < 0 && clickTarget && clickTarget.closest) {
        var li = clickTarget.closest('li');
        while (li && li.parentElement !== host) li = li.parentElement ? li.parentElement.closest('li') : null;
        focusIndex = li ? Array.prototype.indexOf.call(host.children, li) : 0;
      }

      var wrap = el('div', 'mdstyled-block-editor mdstyled-card-designer');
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', 'Card designer');

      /* layout bar */
      var bar = el('div', 'mdstyled-editor-toolbar mdstyled-designer-bar');

      var heading = el('span', 'mdstyled-designer-heading');
      heading.appendChild(icon('card', 15));
      heading.appendChild(el('span', null, 'Card designer'));
      bar.appendChild(heading);

      var count = el('span', 'mdstyled-designer-count');
      bar.appendChild(count);
      bar.appendChild(el('span', 'mdstyled-toolbar-spacer'));

      var layout = el('div', 'mdstyled-designer-layout');

      layout.appendChild(el('span', 'mdstyled-card-label', 'Columns'));
      var colGroup = el('div', 'mdstyled-col-group');
      colGroup.setAttribute('role', 'group');
      colGroup.setAttribute('aria-label', 'Columns');
      var colButtons = (isList ? [0, 1, 2, 3, 4] : [1, 2, 3, 4]).map(function (n) {
        var b = el('button', 'mdstyled-col-btn' + (n === 0 ? ' mdstyled-col-auto' : ''), n === 0 ? 'Auto' : String(n));
        b.type = 'button';
        b.title = n === 0 ? 'As many columns as fit' : n + ' column' + (n === 1 ? '' : 's');
        b.addEventListener('click', function () { model.cols = n; render(); });
        colGroup.appendChild(b);
        return { button: b, cols: n };
      });
      layout.appendChild(colGroup);

      layout.appendChild(el('span', 'mdstyled-card-label', 'Rows'));
      var rowGroup = el('div', 'mdstyled-stepper');
      rowGroup.setAttribute('role', 'group');
      rowGroup.setAttribute('aria-label', 'Rows');
      var rowLess = toolButton({ icon: 'minus', label: 'Remove the last row', className: 'mdstyled-stepper-btn' });
      var rowValue = el('span', 'mdstyled-stepper-value');
      var rowMore = toolButton({ icon: 'plus', label: 'Add a row of cards', className: 'mdstyled-stepper-btn' });
      rowLess.addEventListener('click', function () { setRows(rowCount() - 1); });
      rowMore.addEventListener('click', function () { setRows(rowCount() + 1); });
      rowGroup.appendChild(rowLess);
      rowGroup.appendChild(rowValue);
      rowGroup.appendChild(rowMore);
      layout.appendChild(rowGroup);

      bar.appendChild(layout);
      bar.appendChild(el('span', 'mdstyled-toolbar-sep'));

      var modeBtn = toolButton({ icon: 'braces', label: 'Edit as Markdown', className: 'mdstyled-mode-toggle' });
      var modeLabel = el('span', 'mdstyled-tool-text', 'Markdown');
      modeBtn.appendChild(modeLabel);
      modeBtn.addEventListener('click', function () { setMode(mode === 'design' ? 'markdown' : 'design'); });
      bar.appendChild(modeBtn);
      wrap.appendChild(bar);

      /* canvas */
      var canvas = el('div', 'mdstyled-designer-grid');
      wrap.appendChild(canvas);

      var ta = document.createElement('textarea');
      ta.className = 'mdstyled-edit-textarea';
      ta.spellcheck = false;
      ta.hidden = true;
      ta.setAttribute('aria-label', 'Markdown source for this card grid');
      ta.addEventListener('input', function () { autosize(ta); });
      wrap.appendChild(ta);

      /* actions */
      var actions = el('div', 'mdstyled-edit-actions');
      var saveBtn = button('Save', 'primary');
      var cancelBtn = button('Cancel');
      var HINT = 'Ctrl/Cmd+Enter to save, Esc to cancel';
      var status = el('span', 'mdstyled-edit-status', HINT);

      var deleteBtn = button('', 'mdstyled-delete');
      deleteBtn.appendChild(icon('trash', 15));
      var deleteLabel = el('span', 'mdstyled-btn-label', 'Delete');
      deleteBtn.appendChild(deleteLabel);
      deleteBtn.title = 'Delete all of these cards';
      deleteBtn.setAttribute('aria-label', 'Delete all of these cards');

      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      actions.appendChild(status);
      actions.appendChild(el('span', 'mdstyled-actions-spacer'));
      actions.appendChild(deleteBtn);
      wrap.appendChild(actions);

      design.nodes[0].parentNode.insertBefore(wrap, design.nodes[0]);
      design.nodes.forEach(function (node) { node.classList.add('mdstyled-editable-hidden'); });
      open = { host: host, group: design.nodes, wrap: wrap };
      api.setEditorOpen(true);

      /* ── the model ── */

      function newCard() {
        return {
          title: 'New card',
          level: model.level,
          body: 'What this card is about.',
          classes: isList ? [] : ['card']
        };
      }

      function rowCount() {
        return model.cols ? Math.max(1, Math.ceil(model.cards.length / model.cols)) : 0;
      }

      /* Rows are whole rows of cards: more fills the grid out, fewer trims from the end. */
      function setRows(rows) {
        if (!model.cols || rows < 1) return;
        var target = rows * model.cols;
        while (model.cards.length < target) model.cards.push(newCard());
        if (model.cards.length > target) model.cards.length = target;
        render({ index: Math.min(model.cards.length - 1, (rows - 1) * model.cols), field: 'title' });
      }

      function moveCard(from, to) {
        if (to < 0 || to >= model.cards.length || from === to) return;
        var card = model.cards.splice(from, 1)[0];
        model.cards.splice(to, 0, card);
        render({ index: to, field: 'title' });
      }

      function say(text, isError) {
        status.textContent = text;
        status.classList.toggle('error', !!isError);
      }

      /* ── rendering ── */

      var dragFrom = null;

      function render(focus) {
        /* Hold the height while the tiles are rebuilt: emptying the canvas would
           shorten the page for a moment and make the browser scroll it. */
        canvas.style.minHeight = canvas.offsetHeight + 'px';
        canvas.textContent = '';
        canvas.style.gridTemplateColumns = model.cols
          ? 'repeat(' + model.cols + ', minmax(0, 1fr))'
          : 'repeat(auto-fill, minmax(200px, 1fr))';

        model.cards.forEach(function (card, index) { canvas.appendChild(cardTile(card, index)); });

        var add = el('button', 'mdstyled-designer-add');
        add.type = 'button';
        add.appendChild(icon('plus', 18));
        add.appendChild(el('span', null, 'Add card'));
        add.addEventListener('click', function () {
          model.cards.push(newCard());
          render({ index: model.cards.length - 1, field: 'title', select: true });
        });
        canvas.appendChild(add);

        var n = model.cards.length;
        count.textContent = n + ' card' + (n === 1 ? '' : 's');
        colButtons.forEach(function (entry) {
          var on = entry.cols === model.cols;
          entry.button.classList.toggle('active', on);
          entry.button.setAttribute('aria-pressed', String(on));
        });
        rowValue.textContent = model.cols ? String(rowCount()) : '-';
        rowLess.disabled = !model.cols || rowCount() <= 1;
        rowMore.disabled = !model.cols;
        rowGroup.title = model.cols ? '' : 'Pick a column count to set rows';
        canvas.style.minHeight = '';

        if (focus) {
          var tile = canvas.children[focus.index];
          var field = tile && tile.querySelector(focus.field === 'body' ? '.mdstyled-designer-body' : '.mdstyled-designer-title-input');
          if (field) {
            field.focus();
            if (focus.select && field.select) field.select();
          }
        }
      }

      /* The field is border-box, so its height has to include the border. */
      function fitBody(field) {
        field.style.height = 'auto';
        field.style.height = Math.max(field.scrollHeight + field.offsetHeight - field.clientHeight, 72) + 'px';
      }

      function cardTile(card, index) {
        var tile = el('div', 'mdstyled-designer-card');
        var total = model.cards.length;

        var head = el('div', 'mdstyled-designer-card-head');
        var grip = el('span', 'mdstyled-designer-grip');
        grip.title = 'Drag to move this card';
        grip.appendChild(icon('grip', 14));
        head.appendChild(grip);
        head.appendChild(el('span', 'mdstyled-designer-card-index', String(index + 1)));
        head.appendChild(el('span', 'mdstyled-card-spacer'));

        function tileButton(iconName, label, onClick, disabled) {
          var b = toolButton({ icon: iconName, label: label, className: 'mdstyled-designer-card-btn' });
          b.disabled = !!disabled;
          b.addEventListener('click', onClick);
          head.appendChild(b);
          return b;
        }

        tileButton('arrowLeft', 'Move earlier', function () { moveCard(index, index - 1); }, index === 0);
        tileButton('arrowRight', 'Move later', function () { moveCard(index, index + 1); }, index === total - 1);
        tileButton('copy', 'Duplicate card', function () {
          var copy = { title: card.title, level: card.level, body: card.body, classes: card.classes.slice() };
          model.cards.splice(index + 1, 0, copy);
          render({ index: index + 1, field: 'title' });
        });
        tileButton('trash', 'Remove card', function () {
          model.cards.splice(index, 1);
          render({ index: Math.min(index, model.cards.length - 1), field: 'title' });
        }, total <= 1).classList.add('mdstyled-designer-remove');
        tile.appendChild(head);

        var title = document.createElement('input');
        title.type = 'text';
        title.className = 'mdstyled-designer-title-input';
        title.placeholder = 'Card header';
        title.value = card.title;
        title.setAttribute('aria-label', 'Header of card ' + (index + 1));
        title.addEventListener('input', function () { card.title = title.value; });
        title.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !(e.metaKey || e.ctrlKey)) { e.preventDefault(); body.focus(); }
        });
        tile.appendChild(title);

        var body = document.createElement('textarea');
        body.className = 'mdstyled-designer-body';
        body.placeholder = 'Card content - Markdown works here';
        body.value = card.body;
        body.rows = 3;
        body.setAttribute('aria-label', 'Content of card ' + (index + 1));
        body.addEventListener('input', function () { card.body = body.value; fitBody(body); });
        tile.appendChild(body);
        /* Sized once the grid has its final column widths. */
        requestAnimationFrame(function () { fitBody(body); });
        setTimeout(function () { fitBody(body); }, 60);

        /* Only the grip starts a drag, so text in the fields stays selectable. */
        grip.addEventListener('mousedown', function () { tile.draggable = true; });
        tile.addEventListener('dragstart', function (e) {
          dragFrom = index;
          tile.classList.add('mdstyled-dragging');
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            try { e.dataTransfer.setData('text/plain', String(index)); } catch (err) { /* some hosts refuse */ }
          }
        });
        tile.addEventListener('dragend', function () {
          tile.draggable = false;
          dragFrom = null;
          canvas.querySelectorAll('.mdstyled-dragging, .mdstyled-drop-target').forEach(function (node) {
            node.classList.remove('mdstyled-dragging', 'mdstyled-drop-target');
          });
        });
        tile.addEventListener('dragover', function (e) {
          if (dragFrom === null) return;
          e.preventDefault();
          tile.classList.toggle('mdstyled-drop-target', dragFrom !== index);
        });
        tile.addEventListener('dragleave', function () { tile.classList.remove('mdstyled-drop-target'); });
        tile.addEventListener('drop', function (e) {
          e.preventDefault();
          if (dragFrom === null) return;
          var from = dragFrom;
          dragFrom = null;
          moveCard(from, index);
        });

        return tile;
      }

      wrap.addEventListener('mouseup', function () {
        canvas.querySelectorAll('.mdstyled-designer-card[draggable="true"]').forEach(function (tile) {
          if (!tile.classList.contains('mdstyled-dragging')) tile.draggable = false;
        });
      });

      /* ── Markdown mode ── */

      function setMode(next) {
        if (next === 'markdown') {
          ta.value = serializeCards(model);
          mode = 'markdown';
          canvas.hidden = true;
          layout.hidden = true;
          ta.hidden = false;
          autosize(ta);
          ta.focus();
          modeLabel.textContent = 'Designer';
          modeBtn.setAttribute('aria-label', 'Back to the card designer');
          say(HINT);
          return;
        }

        var parsed = parseCardSource(model.kind, ta.value);
        if (!parsed) {
          say('The designer cannot read this Markdown as cards. Fix it, or save it as it is.', true);
          return;
        }
        model = parsed;
        mode = 'design';
        ta.hidden = true;
        canvas.hidden = false;
        layout.hidden = false;
        modeLabel.textContent = 'Markdown';
        modeBtn.setAttribute('aria-label', 'Edit as Markdown');
        say(HINT);
        render({ index: 0, field: 'title' });
      }

      /* ── save, cancel, delete ── */

      function setBusy(busy) {
        saveBtn.disabled = busy;
        cancelBtn.disabled = busy;
        deleteBtn.disabled = busy;
      }

      function commit() {
        var text;
        if (mode === 'markdown') {
          text = ta.value;
        } else {
          if (model.cards.every(cardIsEmpty)) {
            say('Every card is empty. Give one a header or content, or use Delete.', true);
            return;
          }
          text = serializeCards(model);
        }
        if (text === original) { closeBlockEditor(); return; }

        setBusy(true);
        say('Saving...');
        patchState({ scrollY: window.scrollY, editMode: true, place: placeOf(design.from, wrap) });

        api.saveBlock(design.from, design.to, text, original).then(function () {
          say('Saved');
          closeBlockEditor();
        }, function (err) {
          setBusy(false);
          say((err && err.message) ? err.message : 'Save failed.', true);
        });
      }

      saveBtn.addEventListener('click', commit);
      cancelBtn.addEventListener('click', closeBlockEditor);

      var deleteArmed = false;

      function disarmDelete() {
        if (!deleteArmed) return;
        deleteArmed = false;
        deleteBtn.classList.remove('armed');
        deleteLabel.textContent = 'Delete';
        say(HINT);
      }

      wrap.addEventListener('click', function (e) {
        if (!e.target.closest('.mdstyled-delete')) disarmDelete();
      }, true);

      deleteBtn.addEventListener('click', function () {
        if (!deleteArmed) {
          deleteArmed = true;
          deleteBtn.classList.add('armed');
          deleteLabel.textContent = 'Delete?';
          say('Click again to remove every card here.');
          return;
        }

        var deleteEnd = design.to;
        var trailing = '';
        if (deleteEnd < api.lineCount && api.getSource(deleteEnd, deleteEnd + 1).trim() === '') {
          deleteEnd++;
          trailing = '\n';
        }

        setBusy(true);
        patchState({ scrollY: window.scrollY, editMode: true, place: placeOf(design.from, wrap) });
        api.saveBlock(design.from, deleteEnd, '', original + trailing).then(function () {
          closeBlockEditor();
        }, function (err) {
          setBusy(false);
          disarmDelete();
          say((err && err.message) ? err.message : 'Delete failed.', true);
        });
      });

      wrap.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeBlockEditor();
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          commit();
        } else {
          disarmDelete();
        }
      });

      render({ index: Math.max(0, Math.min(focusIndex, model.cards.length - 1)), field: 'title' });
    }

    /* ── Table designer ── */

    var ALIGN_TOOLS = [
      { value: 'left', icon: 'alignLeft', label: 'Align left' },
      { value: 'center', icon: 'alignCenter', label: 'Align centre' },
      { value: 'right', icon: 'alignRight', label: 'Align right' }
    ];

    /* Rendered text and Markdown differ only by the inline markers, which is close
       enough to find the row that was clicked even after the template sorted it. */
    function plainCell(text) {
      return String(text)
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/[*_`~]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function openTableDesigner(host, design, clickTarget) {
      var model = design.model;
      var original = api.getSource(design.from, design.to);
      var classPrefix = design.classes.length ? classComment(design.classes) + '\n' : '';
      var baseline = classPrefix + serializeMarkdownTable(model);
      var mode = 'design';

      /* Start in the cell that was clicked: row -1 is the header. */
      var focusAt = { row: 0, col: 0 };
      var cell = clickTarget && clickTarget.closest ? clickTarget.closest('th, td') : null;
      if (cell && cell.parentElement) {
        focusAt.col = Math.min(Math.max(0, cell.cellIndex), model.header.length - 1);
        if (cell.closest('thead')) {
          focusAt.row = -1;
        } else {
          var clicked = Array.prototype.map.call(cell.parentElement.children, function (td) { return plainCell(td.textContent); });
          var found = -1;
          model.rows.some(function (row, r) {
            var same = row.every(function (text, c) { return plainCell(text) === (clicked[c] || ''); });
            if (same) found = r;
            return same;
          });
          focusAt.row = found === -1 ? 0 : found;
        }
      } else if (!model.rows.length) {
        focusAt.row = -1;
      }

      var wrap = el('div', 'mdstyled-block-editor mdstyled-table-designer');
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', 'Table designer');

      /* bar */
      var bar = el('div', 'mdstyled-editor-toolbar mdstyled-designer-bar');
      var heading = el('span', 'mdstyled-designer-heading');
      heading.appendChild(icon('table', 15));
      heading.appendChild(el('span', null, 'Table designer'));
      bar.appendChild(heading);
      var size = el('span', 'mdstyled-designer-count');
      bar.appendChild(size);
      bar.appendChild(el('span', 'mdstyled-toolbar-spacer'));

      var layout = el('div', 'mdstyled-designer-layout');
      function barButton(iconName, label, onClick) {
        var b = button(label, 'mdstyled-card-add');
        b.insertBefore(icon(iconName, 14), b.firstChild);
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', onClick);
        layout.appendChild(b);
        return b;
      }
      barButton('plus', 'Row', function () { insertRow(model.rows.length); }).title = 'Add a row at the bottom';
      barButton('plus', 'Column', function () { insertColumn(model.header.length); }).title = 'Add a column on the right';
      bar.appendChild(layout);
      bar.appendChild(el('span', 'mdstyled-toolbar-sep'));

      var modeBtn = toolButton({ icon: 'braces', label: 'Edit as Markdown', className: 'mdstyled-mode-toggle' });
      var modeLabel = el('span', 'mdstyled-tool-text', 'Markdown');
      modeBtn.appendChild(modeLabel);
      modeBtn.addEventListener('click', function () { setMode(mode === 'design' ? 'markdown' : 'design'); });
      bar.appendChild(modeBtn);
      wrap.appendChild(bar);

      /* canvas */
      var scroller = el('div', 'mdstyled-tdesign-scroll');
      var grid = el('table', 'mdstyled-tdesign');
      scroller.appendChild(grid);
      wrap.appendChild(scroller);

      var ta = document.createElement('textarea');
      ta.className = 'mdstyled-edit-textarea';
      ta.spellcheck = false;
      ta.hidden = true;
      ta.setAttribute('aria-label', 'Markdown source for this table');
      ta.addEventListener('input', function () { autosize(ta); });
      wrap.appendChild(ta);

      /* actions */
      var actions = el('div', 'mdstyled-edit-actions');
      var saveBtn = button('Save', 'primary');
      var cancelBtn = button('Cancel');
      var HINT = 'Enter for the next row, paste cells from a spreadsheet. Ctrl/Cmd+Enter saves, Esc cancels';
      var status = el('span', 'mdstyled-edit-status', HINT);
      var deleteBtn = button('', 'mdstyled-delete');
      deleteBtn.appendChild(icon('trash', 15));
      var deleteLabel = el('span', 'mdstyled-btn-label', 'Delete');
      deleteBtn.appendChild(deleteLabel);
      deleteBtn.title = 'Delete this table';
      deleteBtn.setAttribute('aria-label', 'Delete this table');
      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      actions.appendChild(status);
      actions.appendChild(el('span', 'mdstyled-actions-spacer'));
      actions.appendChild(deleteBtn);
      wrap.appendChild(actions);

      design.nodes[0].parentNode.insertBefore(wrap, design.nodes[0]);
      design.nodes.forEach(function (node) { node.classList.add('mdstyled-editable-hidden'); });
      open = { host: host, group: design.nodes, wrap: wrap };
      api.setEditorOpen(true);

      function say(text, isError) {
        status.textContent = text;
        status.classList.toggle('error', !!isError);
      }

      /* ── the model ── */

      function blankRow() {
        return model.header.map(function () { return ''; });
      }

      function insertRow(at) {
        model.rows.splice(at, 0, blankRow());
        render({ row: at, col: 0 });
      }

      function removeRow(r) {
        model.rows.splice(r, 1);
        render({ row: Math.min(r, model.rows.length - 1), col: 0 });
      }

      function moveRow(from, to) {
        if (to < 0 || to >= model.rows.length) return;
        model.rows.splice(to, 0, model.rows.splice(from, 1)[0]);
        render({ row: to, col: 0 });
      }

      function insertColumn(at) {
        model.header.splice(at, 0, 'Column');
        model.align.splice(at, 0, '');
        model.rows.forEach(function (row) { row.splice(at, 0, ''); });
        render({ row: -1, col: at, select: true });
      }

      function removeColumn(c) {
        if (model.header.length <= 1) return;
        model.header.splice(c, 1);
        model.align.splice(c, 1);
        model.rows.forEach(function (row) { row.splice(c, 1); });
        render({ row: -1, col: Math.min(c, model.header.length - 1) });
      }

      function moveColumn(from, to) {
        if (to < 0 || to >= model.header.length) return;
        [model.header, model.align].concat(model.rows).forEach(function (list) {
          list.splice(to, 0, list.splice(from, 1)[0]);
        });
        render({ row: -1, col: to });
      }

      function setAlign(c, value) {
        model.align[c] = model.align[c] === value ? '' : value;
        render({ row: -1, col: c });
      }

      /* Tab-separated text from a spreadsheet fills cells from here, growing the table. */
      function pasteGrid(row, col, text) {
        var lines = text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
        var cells = lines.map(function (line) { return line.split('\t'); });
        var wide = cells.reduce(function (max, r) { return Math.max(max, r.length); }, 0);

        while (model.header.length < col + wide) {
          model.header.push('Column');
          model.align.push('');
          model.rows.forEach(function (r) { r.push(''); });
        }

        cells.forEach(function (values, i) {
          var r = row + i;
          var target;
          if (r < 0) {
            target = model.header;
          } else {
            while (model.rows.length <= r) model.rows.push(blankRow());
            target = model.rows[r];
          }
          values.forEach(function (value, j) { target[col + j] = value.trim(); });
        });

        render({ row: row + cells.length - 1, col: col + wide - 1 });
      }

      /* ── rendering ── */

      function tool(iconName, label, onClick, disabled) {
        var b = toolButton({ icon: iconName, label: label, className: 'mdstyled-tdesign-btn' });
        b.disabled = !!disabled;
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', onClick);
        return b;
      }

      function cellInput(value, row, col) {
        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'mdstyled-tdesign-input' + (row < 0 ? ' mdstyled-tdesign-head' : '');
        input.value = value;
        input.placeholder = row < 0 ? 'Header' : '';
        input.style.textAlign = model.align[col] || '';
        input.setAttribute('data-row', String(row));
        input.setAttribute('data-col', String(col));
        input.setAttribute('aria-label', row < 0
          ? 'Header of column ' + (col + 1)
          : 'Row ' + (row + 1) + ', column ' + (col + 1));

        input.addEventListener('input', function () {
          if (row < 0) model.header[col] = input.value;
          else model.rows[row][col] = input.value;
        });

        input.addEventListener('paste', function (e) {
          var text = e.clipboardData && e.clipboardData.getData('text/plain');
          if (!text || !/[\t\n]/.test(text.replace(/\n$/, ''))) return;
          e.preventDefault();
          pasteGrid(row, col, text);
        });

        input.addEventListener('keydown', function (e) {
          if (e.metaKey || e.ctrlKey || e.altKey) return;
          var down = (e.key === 'Enter' && !e.shiftKey) || e.key === 'ArrowDown';
          var up = (e.key === 'Enter' && e.shiftKey) || e.key === 'ArrowUp';
          if (!down && !up) return;
          e.preventDefault();
          var next = row + (down ? 1 : -1);
          if (next >= model.rows.length) {
            if (e.key === 'Enter') insertRow(model.rows.length);
            return;
          }
          if (next < -1) return;
          focusCell({ row: next, col: col });
        });

        return input;
      }

      function focusCell(at) {
        var input = grid.querySelector('input[data-row="' + at.row + '"][data-col="' + at.col + '"]');
        if (!input) return;
        input.focus();
        if (at.select && input.select) input.select();
      }

      function render(focus) {
        /* As in the card designer: keep the height so rebuilding never scrolls the page. */
        scroller.style.minHeight = scroller.offsetHeight + 'px';
        grid.textContent = '';
        var cols = model.header.length;
        var rows = model.rows.length;
        size.textContent = cols + ' column' + (cols === 1 ? '' : 's') + ' × ' + rows + ' row' + (rows === 1 ? '' : 's');

        var thead = el('thead');

        /* column tools */
        var toolRow = el('tr', 'mdstyled-tdesign-tools');
        toolRow.appendChild(el('th', 'mdstyled-tdesign-corner'));
        model.header.forEach(function (text, c) {
          var th = el('th', 'mdstyled-tdesign-coltools');
          var alignGroup = el('span', 'mdstyled-tdesign-align');
          ALIGN_TOOLS.forEach(function (a) {
            var b = tool(a.icon, a.label, function () { setAlign(c, a.value); });
            var on = model.align[c] === a.value;
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', String(on));
            alignGroup.appendChild(b);
          });
          th.appendChild(alignGroup);
          th.appendChild(el('span', 'mdstyled-card-spacer'));
          th.appendChild(tool('arrowLeft', 'Move column left', function () { moveColumn(c, c - 1); }, c === 0));
          th.appendChild(tool('arrowRight', 'Move column right', function () { moveColumn(c, c + 1); }, c === cols - 1));
          th.appendChild(tool('plus', 'Insert column to the right', function () { insertColumn(c + 1); }));
          var del = tool('trash', 'Delete column', function () { removeColumn(c); }, cols <= 1);
          del.classList.add('mdstyled-designer-remove');
          th.appendChild(del);
          toolRow.appendChild(th);
        });
        thead.appendChild(toolRow);

        /* header row */
        var headRow = el('tr', 'mdstyled-tdesign-header');
        var headTools = el('th', 'mdstyled-tdesign-rowtools');
        headTools.appendChild(tool('plus', 'Insert row at the top', function () { insertRow(0); }));
        headRow.appendChild(headTools);
        model.header.forEach(function (text, c) {
          var th = el('th');
          th.appendChild(cellInput(text, -1, c));
          headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        grid.appendChild(thead);

        /* body */
        var tbody = el('tbody');
        model.rows.forEach(function (row, r) {
          var tr = el('tr');
          var tools = el('td', 'mdstyled-tdesign-rowtools');
          tools.appendChild(el('span', 'mdstyled-tdesign-rownum', String(r + 1)));
          tools.appendChild(tool('arrowUp', 'Move row up', function () { moveRow(r, r - 1); }, r === 0));
          tools.appendChild(tool('arrowDown', 'Move row down', function () { moveRow(r, r + 1); }, r === rows - 1));
          tools.appendChild(tool('plus', 'Insert row below', function () { insertRow(r + 1); }));
          var del = tool('trash', 'Delete row', function () { removeRow(r); });
          del.classList.add('mdstyled-designer-remove');
          tools.appendChild(del);
          tr.appendChild(tools);
          row.forEach(function (text, c) {
            var td = el('td');
            td.appendChild(cellInput(text, r, c));
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        grid.appendChild(tbody);
        scroller.style.minHeight = '';

        if (focus) focusCell(focus.row < 0 || model.rows.length ? focus : { row: -1, col: focus.col });
      }

      /* ── Markdown mode ── */

      function setMode(next) {
        if (next === 'markdown') {
          ta.value = serializeMarkdownTable(model);
          mode = 'markdown';
          scroller.hidden = true;
          layout.hidden = true;
          ta.hidden = false;
          autosize(ta);
          ta.focus();
          modeLabel.textContent = 'Designer';
          modeBtn.setAttribute('aria-label', 'Back to the table designer');
          say(HINT);
          return;
        }

        var parsed = parseMarkdownTable(ta.value);
        if (!parsed) {
          say('The designer cannot read this Markdown as a table. Fix it, or save it as it is.', true);
          return;
        }
        model = parsed;
        mode = 'design';
        ta.hidden = true;
        scroller.hidden = false;
        layout.hidden = false;
        modeLabel.textContent = 'Markdown';
        modeBtn.setAttribute('aria-label', 'Edit as Markdown');
        say(HINT);
        render({ row: -1, col: 0 });
      }

      /* ── save, cancel, delete ── */

      function setBusy(busy) {
        saveBtn.disabled = busy;
        cancelBtn.disabled = busy;
        deleteBtn.disabled = busy;
      }

      function commit() {
        var text = classPrefix + (mode === 'markdown' ? ta.value.replace(/\s+$/, '') : serializeMarkdownTable(model));
        /* Untouched: leave the file exactly as it was written, padding and all. */
        if (text === baseline || text === original) { closeBlockEditor(); return; }

        setBusy(true);
        say('Saving...');
        patchState({ scrollY: window.scrollY, editMode: true, place: placeOf(design.from, wrap) });
        api.saveBlock(design.from, design.to, text, original).then(function () {
          say('Saved');
          closeBlockEditor();
        }, function (err) {
          setBusy(false);
          say((err && err.message) ? err.message : 'Save failed.', true);
        });
      }

      saveBtn.addEventListener('click', commit);
      cancelBtn.addEventListener('click', closeBlockEditor);

      var deleteArmed = false;
      function disarmDelete() {
        if (!deleteArmed) return;
        deleteArmed = false;
        deleteBtn.classList.remove('armed');
        deleteLabel.textContent = 'Delete';
        say(HINT);
      }

      wrap.addEventListener('click', function (e) {
        if (!e.target.closest('.mdstyled-delete')) disarmDelete();
      }, true);

      deleteBtn.addEventListener('click', function () {
        if (!deleteArmed) {
          deleteArmed = true;
          deleteBtn.classList.add('armed');
          deleteLabel.textContent = 'Delete?';
          say('Click again to remove this table.');
          return;
        }
        var deleteEnd = design.to;
        var trailing = '';
        if (deleteEnd < api.lineCount && api.getSource(deleteEnd, deleteEnd + 1).trim() === '') {
          deleteEnd++;
          trailing = '\n';
        }
        setBusy(true);
        patchState({ scrollY: window.scrollY, editMode: true, place: placeOf(design.from, wrap) });
        api.saveBlock(design.from, deleteEnd, '', original + trailing).then(function () {
          closeBlockEditor();
        }, function (err) {
          setBusy(false);
          disarmDelete();
          say((err && err.message) ? err.message : 'Delete failed.', true);
        });
      });

      wrap.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeBlockEditor();
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          commit();
        } else {
          disarmDelete();
        }
      });

      render(focusAt);
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
        if (!state.place && typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'center' });
      }
    }

    if (state.place) {
      patchState({ place: null });
      restorePlace(state.place);
    }

    /* Puts the saved block back where it was on screen, and keeps it there while the
       page settles - until the reader scrolls for themselves. */
    function restorePlace(place) {
      var stopped = false;
      function stop() { stopped = true; }
      ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (type) {
        window.addEventListener(type, stop, { once: true, passive: true });
      });

      /* The block that was saved, or whatever now starts at or after its line. */
      function anchorNode() {
        if (open && open.wrap && open.wrap.isConnected) return open.wrap;
        var host = null;
        for (var i = 0; i < hosts.length; i++) {
          var start = parseInt(hosts[i].getAttribute('data-mdstyled-start'), 10);
          if (start >= place.line) { host = hosts[i]; break; }
        }
        if (!host) host = hosts[hosts.length - 1];
        if (!host) return null;
        var grid = host.parentElement && host.parentElement.classList.contains('mdstyled-cards') ? host.parentElement : null;
        return grid || groupFor(host)[0];
      }

      function apply() {
        if (stopped) return;
        var node = anchorNode();
        if (!node) return;
        var delta = node.getBoundingClientRect().top - place.top;
        if (Math.abs(delta) >= 1) window.scrollTo(0, window.scrollY + delta);
      }

      apply();
      requestAnimationFrame(apply);
      [60, 150, 350, 700, 1200].forEach(function (ms) { setTimeout(apply, ms); });
      window.addEventListener('load', apply);
    }
  }
