
  /* ═══════════════════════════════════════
     HTML -> Markdown
     ═══════════════════════════════════════ */

  function repeatStr(s, n) {
    var out = '';
    for (var i = 0; i < n; i++) out += s;
    return out;
  }

  /* Only the characters that would otherwise turn into markup. `_` is left alone
     because CommonMark ignores it inside words and escaping it makes ugly source. */
  function escapeText(text) {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/([`*[\]<])/g, '\\$1');
  }

  function escapeLineStart(line) {
    return line.replace(/^(\s*)(#{1,6}\s|>|[-+]\s|\d+[.)]\s)/, '$1\\$2');
  }

  /* Inline HTML a person wrote in the Markdown is kept verbatim. Everything else that
     is not markup we understand gets unwrapped - that is what a browser leaves behind
     when you paste or format inside a contenteditable. */
  var KEEP_HTML = /^(KBD|SUP|SUB|MARK|ABBR|SMALL|U|VAR|SAMP|Q|CITE|TIME|INS|DFN|BDI|BDO|RUBY|RT|RP)$/;

  /* A <span> is only worth keeping for the colour it carries - everything else in a
     pasted style attribute is browser noise. */
  function spanColors(el) {
    var style = el.getAttribute('style') || '';
    var keep = [];
    var color = style.match(/(^|;)\s*color\s*:\s*([^;]+)/i);
    var background = style.match(/(^|;)\s*background(-color)?\s*:\s*([^;]+)/i);
    if (color) keep.push('color: ' + color[2].trim());
    if (background) keep.push('background-color: ' + background[3].trim());
    return keep.join('; ');
  }

  function originalUri(el) {
    return el.getAttribute('data-mdstyled-uri') || el.getAttribute('href') || el.getAttribute('src') || '';
  }

  /* CommonMark: a code span is fenced by a backtick run longer than any inside it,
     and needs padding spaces when it starts or ends with one. */
  function inlineCode(text) {
    if (!text) return '';
    var longest = 0;
    var runs = text.match(/`+/g) || [];
    runs.forEach(function (run) { longest = Math.max(longest, run.length); });
    var fence = repeatStr('`', longest + 1);
    var pad = (/^`/.test(text) || /`$/.test(text)) ? ' ' : '';
    return fence + pad + text + pad + fence;
  }

  function linkTitle(el) {
    var title = el.getAttribute('title');
    return title ? ' "' + title.replace(/"/g, '\\"') + '"' : '';
  }

  function hasContentAfter(node) {
    for (var next = node.nextSibling; next; next = next.nextSibling) {
      if (next.nodeType === 3 && next.nodeValue.trim()) return true;
      if (next.nodeType === 1 && next.tagName !== 'BR' && (next.textContent.trim() || next.tagName === 'IMG' || next.querySelector('img'))) return true;
    }
    return false;
  }

  function serializeInline(node) {
    var out = '';

    for (var i = 0; i < node.childNodes.length; i++) {
      var child = node.childNodes[i];

      if (child.nodeType === 3) {
        out += escapeText(child.nodeValue.replace(/\s+/g, ' '));
        continue;
      }
      if (child.nodeType !== 1) continue;

      var tag = child.tagName;

      if (tag === 'BR') {
        /* A trailing <br> is only the browser holding an empty line open, not a
           line break anyone typed - writing it would leave a stray backslash. */
        if (!hasContentAfter(child)) continue;
        out += '\\\n';
        continue;
      }
      if (tag === 'INPUT') continue;

      if (tag === 'STRONG' || tag === 'B') {
        var strong = serializeInline(child).trim();
        out += strong ? '**' + strong + '**' : '';
      } else if (tag === 'EM' || tag === 'I') {
        var em = serializeInline(child).trim();
        out += em ? '*' + em + '*' : '';
      } else if (tag === 'DEL' || tag === 'S' || tag === 'STRIKE') {
        var del = serializeInline(child).trim();
        out += del ? '~~' + del + '~~' : '';
      } else if (tag === 'CODE') {
        out += inlineCode(child.textContent);
      } else if (tag === 'A') {
        var label = serializeInline(child).trim();
        var href = originalUri(child);
        out += href ? '[' + label + '](' + href + linkTitle(child) + ')' : label;
      } else if (tag === 'IMG') {
        out += '![' + (child.getAttribute('alt') || '') + '](' + originalUri(child) + linkTitle(child) + ')';
      } else if (KEEP_HTML.test(tag)) {
        out += child.outerHTML;
      } else if (tag === 'SPAN' || tag === 'FONT') {
        var colors = spanColors(child);
        var inner = serializeInline(child);
        out += colors ? '<span style="' + colors + '">' + inner + '</span>' : inner;
      } else {
        out += serializeInline(child);
      }
    }

    return out;
  }

  function cellText(cell) {
    return serializeInline(cell).trim().replace(/\|/g, '\\|');
  }

  function serializeTable(table) {
    var rows = [];
    var alignments = [];

    var headRow = table.querySelector('thead tr');
    if (headRow) {
      var headCells = Array.prototype.slice.call(headRow.children);
      rows.push(headCells.map(cellText));
      alignments = headCells.map(function (th) {
        var align = (th.style && th.style.textAlign) || '';
        if (align === 'center') return ':---:';
        if (align === 'right') return '---:';
        if (align === 'left') return ':---';
        return '---';
      });
    }

    table.querySelectorAll('tbody tr').forEach(function (tr) {
      rows.push(Array.prototype.slice.call(tr.children).map(cellText));
    });

    if (rows.length === 0) return '';
    if (alignments.length === 0) {
      alignments = rows[0].map(function () { return '---'; });
    }

    var lines = ['| ' + rows[0].join(' | ') + ' |', '| ' + alignments.join(' | ') + ' |'];
    for (var i = 1; i < rows.length; i++) {
      lines.push('| ' + rows[i].join(' | ') + ' |');
    }
    return lines.join('\n');
  }

  function serializeList(list, depth) {
    var ordered = list.tagName === 'OL';
    var index = parseInt(list.getAttribute('start') || '1', 10);
    if (isNaN(index)) index = 1;

    var indent = repeatStr('  ', depth);
    var out = [];

    /* A loose list - blank lines between items - renders each item's text in <p>s. */
    var loose = Array.prototype.some.call(list.children, function (li) {
      return li.tagName === 'LI' && Array.prototype.some.call(li.children, function (c) { return c.tagName === 'P'; });
    });

    Array.prototype.slice.call(list.children).forEach(function (li) {
      if (li.tagName !== 'LI') return;

      var checkbox = li.querySelector('input[type="checkbox"]');
      var bullet = ordered ? (index++) + '. ' : '- ';
      var marker = bullet;
      if (checkbox) marker += checkbox.checked ? '[x] ' : '[ ] ';

      if (loose) {
        out.push(serializeLooseItem(li, indent, marker, repeatStr(' ', bullet.length), depth));
        return;
      }

      var inlineParts = [];
      var nested = [];

      Array.prototype.slice.call(li.childNodes).forEach(function (child) {
        if (child.nodeType === 1 && (child.tagName === 'UL' || child.tagName === 'OL')) {
          nested.push(serializeList(child, depth + 1));
        } else if (child.nodeType === 1 && child.tagName === 'P') {
          inlineParts.push(serializeInline(child).trim());
        } else if (child.nodeType === 1 && child.tagName === 'INPUT') {
          /* the task checkbox, already turned into a marker */
        } else if (child.nodeType === 3) {
          inlineParts.push(escapeText(child.nodeValue.replace(/\s+/g, ' ')));
        } else if (child.nodeType === 1) {
          inlineParts.push(serializeInline({ childNodes: [child] }));
        }
      });

      var text = inlineParts.join('').trim();
      out.push(indent + marker + text);
      nested.forEach(function (block) { out.push(block); });
    });

    return out.join(loose ? '\n\n' : '\n');
  }

  /* One item of a loose list: each paragraph on its own, indented under the marker,
     with a blank line before it - the way the Markdown was written. */
  function serializeLooseItem(li, indent, marker, pad, depth) {
    var blocks = [];
    var run = [];

    function flush() {
      var text = run.join('').trim();
      if (text) blocks.push({ text: text });
      run = [];
    }

    Array.prototype.slice.call(li.childNodes).forEach(function (child) {
      if (child.nodeType === 1 && (child.tagName === 'UL' || child.tagName === 'OL')) {
        flush();
        blocks.push({ nested: serializeList(child, depth + 1) });
      } else if (child.nodeType === 1 && child.tagName === 'P') {
        flush();
        var para = serializeInline(child).trim();
        if (para) blocks.push({ text: para });
      } else if (child.nodeType === 1 && child.tagName === 'INPUT') {
        /* the task checkbox, already turned into a marker */
      } else if (child.nodeType === 3) {
        run.push(escapeText(child.nodeValue.replace(/\s+/g, ' ')));
      } else if (child.nodeType === 1) {
        run.push(serializeInline({ childNodes: [child] }));
      }
    });
    flush();

    var lines = [];
    blocks.forEach(function (block, i) {
      if (block.nested) {
        if (i === 0) lines.push(indent + marker.replace(/\s+$/, ''));
        lines.push('', block.nested);
        return;
      }
      var paraLines = block.text.split('\n');
      if (i === 0) {
        lines.push(indent + marker + paraLines[0]);
        paraLines.slice(1).forEach(function (l) { lines.push(indent + pad + l); });
      } else {
        lines.push('');
        paraLines.forEach(function (l) { lines.push(indent + pad + l); });
      }
    });
    if (lines.length === 0) lines.push(indent + marker.replace(/\s+$/, ''));
    return lines.join('\n');
  }

  function serializeBlock(el, depth) {
    var tag = el.tagName;

    if (/^H[1-6]$/.test(tag)) {
      return repeatStr('#', parseInt(tag[1], 10)) + ' ' + serializeInline(el).trim();
    }
    if (tag === 'P') {
      return escapeLineStart(serializeInline(el).trim());
    }
    if (tag === 'UL' || tag === 'OL') {
      return serializeList(el, depth || 0);
    }
    if (tag === 'BLOCKQUOTE') {
      var inner = serializeChildren(el, depth);
      return inner.split('\n').map(function (line) {
        return line ? '> ' + line : '>';
      }).join('\n');
    }
    if (tag === 'PRE') {
      var codeEl = el.querySelector('code');
      var lang = '';
      if (codeEl) {
        var match = (codeEl.className || '').match(/language-([\w-]+)/);
        if (match) lang = match[1];
      }
      var body = (codeEl ? codeEl.textContent : el.textContent).replace(/\n$/, '');
      return '```' + lang + '\n' + body + '\n```';
    }
    if (tag === 'HR') return '---';
    if (tag === 'TABLE') return serializeTable(el);
    if (tag === 'BR') return '';

    /* div / section / anything the browser produced while editing */
    if (el.children.length > 0 && !isInlineOnly(el)) {
      return serializeChildren(el, depth);
    }
    return escapeLineStart(serializeInline(el).trim());
  }

  var BLOCK_TAGS = /^(P|DIV|SECTION|UL|OL|BLOCKQUOTE|PRE|TABLE|HR|H[1-6])$/;

  function isInlineOnly(el) {
    for (var i = 0; i < el.children.length; i++) {
      if (BLOCK_TAGS.test(el.children[i].tagName)) return false;
    }
    return true;
  }

  /* Runtime classes the template adds are not part of the document. */
  var RUNTIME_CLASS = /^(mdstyled-|accordion-|table-|task-|contains-task-list|hljs)/;

  function selectorComment(el) {
    var parts = [];

    var id = el.getAttribute('id');
    /* Headings get an id generated for the table of contents; that is not authored. */
    if (id && !el.hasAttribute('data-mdstyled-generated-id') && !/^H[1-6]$/.test(el.tagName)) {
      parts.push('#' + id);
    }

    (el.getAttribute('class') || '').split(/\s+/).forEach(function (name) {
      if (name && !RUNTIME_CLASS.test(name)) parts.push('.' + name);
    });

    return parts.length ? '<!-- ' + parts.join(' ') + ' -->\n' : '';
  }

  function serializeChildren(container, depth) {
    var blocks = [];
    var loose = [];

    function flushLoose() {
      var text = loose.join('').trim();
      loose = [];
      if (text) blocks.push(escapeLineStart(text));
    }

    Array.prototype.slice.call(container.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        if (child.nodeValue.trim()) loose.push(escapeText(child.nodeValue.replace(/\s+/g, ' ')));
        return;
      }
      if (child.nodeType !== 1) return;

      if (BLOCK_TAGS.test(child.tagName)) {
        flushLoose();
        var block = serializeBlock(child, depth || 0);
        if (block.trim()) blocks.push(selectorComment(child) + block);
      } else {
        loose.push(serializeInline({ childNodes: [child] }));
      }
    });

    flushLoose();
    return blocks.join('\n\n');
  }

  function htmlToMarkdown(container) {
    return serializeChildren(container, 0).replace(/\n{3,}/g, '\n\n').trim();
  }

  /* ═══════════════════════════════════════
     Block type conversion
     ═══════════════════════════════════════ */

  var LIST_OR_HEADING = /^(\s*)(#{1,6}\s+|>\s?|[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+)/;

  function plainLines(markdown) {
    var text = markdown.trim();

    var fence = text.match(/^```[\w-]*\n([\s\S]*?)\n?```$/);
    if (fence) text = fence[1];

    if (/^\|/.test(text)) {
      /* Strip the pipes and the delimiter row when leaving a table. */
      return text.split('\n')
        .filter(function (line) { return !/^\s*\|?[\s:|-]+\|?\s*$/.test(line); })
        .map(function (line) {
          return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|')
            .map(function (cell) { return cell.trim(); }).join(' ').trim();
        })
        .filter(function (line) { return line !== ''; });
    }

    return text.split('\n')
      .map(function (line) { return line.replace(LIST_OR_HEADING, '$1').trim(); })
      .filter(function (line, i, all) { return line !== '' || all.length === 1; });
  }

  function retypeMarkdown(markdown, type) {
    var lines = plainLines(markdown);
    if (lines.length === 0) lines = [''];

    if (type === 'p') return lines.join('\n');
    if (type === 'quote') return lines.map(function (l) { return '> ' + l; }).join('\n');
    if (type === 'ul') return lines.map(function (l) { return '- ' + l; }).join('\n');
    if (type === 'task') return lines.map(function (l) { return '- [ ] ' + l; }).join('\n');
    if (type === 'ol') return lines.map(function (l, i) { return (i + 1) + '. ' + l; }).join('\n');
    if (type === 'code') return '```\n' + lines.join('\n') + '\n```';
    if (type === 'hr') return '---';

    if (type === 'table') {
      /* First line becomes the header, the rest become rows. */
      var header = lines[0] || 'Column';
      var body = lines.slice(1);
      if (body.length === 0) body = ['Cell'];
      return ['| ' + header + ' |', '| --- |']
        .concat(body.map(function (l) { return '| ' + l.replace(/\|/g, '\\|') + ' |'; }))
        .join('\n');
    }

    var heading = type.match(/^h([1-6])$/);
    if (heading) return repeatStr('#', parseInt(heading[1], 10)) + ' ' + lines.join(' ');

    return lines.join('\n');
  }

  /* What the block currently is, so the type selector can show it. */
  function detectBlockType(markdown) {
    var first = markdown.trim().split('\n')[0] || '';
    if (/^```/.test(markdown.trim())) return 'code';
    var heading = first.match(/^(#{1,6})\s/);
    if (heading) return 'h' + heading[1].length;
    if (/^>\s?/.test(first)) return 'quote';
    if (/^[-*+]\s+\[[ xX]\]\s/.test(first)) return 'task';
    if (/^[-*+]\s/.test(first)) return 'ul';
    if (/^\d+[.)]\s/.test(first)) return 'ol';
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(first)) return 'hr';
    if (/^\|/.test(first)) return 'table';
    return 'p';
  }
