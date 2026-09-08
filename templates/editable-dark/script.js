(function () {
  'use strict';

  /* ── Table of contents ── */

  function buildTOC() {
    var root = document.querySelector('.mdstyled-root');
    if (!root) return;

    var headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length < 2) return;

    var toc = document.createElement('nav');
    toc.className = 'mdstyled-toc';
    toc.setAttribute('aria-label', 'On this page');

    var title = document.createElement('div');
    title.className = 'mdstyled-toc-title';
    title.textContent = 'On this page';
    toc.appendChild(title);

    var list = document.createElement('ul');
    list.className = 'mdstyled-toc-list';

    var items = [];
    headings.forEach(function (h) {
      if (!h.id) {
        h.id = h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }

      var level = parseInt(h.tagName[1], 10);

      var li = document.createElement('li');
      li.className = 'mdstyled-toc-item mdstyled-toc-level-' + level;

      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);

      list.appendChild(li);
      items.push({ el: li, id: h.id, heading: h });
    });

    if (items.length === 0) return;

    toc.appendChild(list);
    root.parentNode.insertBefore(toc, root.nextSibling);

    var scrollLocked = false;

    function setActive(id) {
      items.forEach(function (item) {
        item.el.classList.toggle('active', item.id === id);
      });
    }

    function updateActive() {
      if (scrollLocked) return;
      var current = items[0].id;
      items.forEach(function (item) {
        if (item.heading.getBoundingClientRect().top <= 100) {
          current = item.id;
        }
      });
      setActive(current);
    }

    // Immediately activate clicked TOC item; suppress scroll handler briefly
    items.forEach(function (item) {
      item.el.querySelector('a').addEventListener('click', function () {
        setActive(item.id);
        scrollLocked = true;
        setTimeout(function () { scrollLocked = false; }, 800);
      });
    });

    updateActive();
    window.addEventListener('scroll', updateActive);
  }

  /* ── Accordions ── */

  function initAccordions() {
    var root = document.querySelector('.mdstyled-root');
    if (!root) return;

    var headings = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    if (headings.length === 0) return;

    function wrapHeading(heading) {
      var level = parseInt(heading.tagName[1], 10);
      var parent = heading.parentNode;

      // Mark insertion point before any DOM moves
      var placeholder = document.createComment('accordion');
      parent.insertBefore(placeholder, heading);

      // Collect siblings that belong to this section
      var contentNodes = [];
      var el = heading.nextSibling;
      while (el) {
        var stop = false;
        if (el.nodeType === 1) {
          if (/^H[1-6]$/.test(el.tagName)) {
            if (parseInt(el.tagName[1], 10) <= level) stop = true;
          } else if (el.classList && el.classList.contains('accordion-section')) {
            var storedLevel = parseInt(el.getAttribute('data-accordion-level'), 10);
            if (!isNaN(storedLevel) && storedLevel <= level) stop = true;
          }
        }
        if (stop) break;
        contentNodes.push(el);
        el = el.nextSibling;
      }

      var section = document.createElement('div');
      section.className = 'accordion-section';
      section.setAttribute('data-accordion-level', String(level));

      var header = document.createElement('div');
      header.className = 'accordion-header';

      var toggleBtn = document.createElement('button');
      toggleBtn.className = 'accordion-toggle';
      toggleBtn.innerHTML = '<span class="accordion-chevron"></span>';
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.setAttribute('aria-label', 'Collapse section');

      header.appendChild(toggleBtn);
      header.appendChild(heading);
      section.appendChild(header);

      var content = document.createElement('div');
      content.className = 'accordion-content';
      contentNodes.forEach(function (node) { content.appendChild(node); });
      section.appendChild(content);

      // Preserve spacing by moving heading margins to the wrapper
      var computed = window.getComputedStyle(heading);
      section.style.paddingTop = computed.marginTop;
      header.style.marginBottom = computed.marginBottom;
      heading.style.margin = '0';

      parent.replaceChild(section, placeholder);

      toggleBtn.addEventListener('click', function () {
        var isCollapsed = toggleBtn.classList.contains('collapsed');
        if (isCollapsed) {
          content.style.display = '';
          toggleBtn.classList.remove('collapsed');
          toggleBtn.setAttribute('aria-expanded', 'true');
        } else {
          content.style.display = 'none';
          toggleBtn.classList.add('collapsed');
          toggleBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    for (var i = headings.length - 1; i >= 0; i--) {
      wrapHeading(headings[i]);
    }
  }

  /* ── Interactive Tables ── */

  function initInteractiveTables() {
    var root = document.querySelector('.mdstyled-root');
    if (!root) return;

    var tables = root.querySelectorAll('table');
    tables.forEach(function (table) {
      var wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);

      var rowsPerPage = 10;

      var tbody = table.querySelector('tbody') || table;
      var originalRows = Array.from(tbody.querySelectorAll('tr'));

      var dataRows = originalRows.filter(function(row) {
          return !row.querySelector('th');
      });

      var headers = table.querySelectorAll('th');
      var columnNames = Array.from(headers).map(function(th) {
        return th.textContent.trim();
      });

      var searchContainer = document.createElement('div');
      searchContainer.className = 'table-interactive-controls';

      var searchWrapper = document.createElement('div');
      searchWrapper.className = 'table-search-wrapper';
      searchWrapper.style.position = 'relative';
      searchWrapper.style.width = '100%';

      var searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search table...';
      searchInput.className = 'table-search-input';

      var autocompleteList = document.createElement('div');
      autocompleteList.className = 'table-search-autocomplete';
      autocompleteList.style.display = 'none';

      searchWrapper.appendChild(searchInput);
      searchWrapper.appendChild(autocompleteList);
      searchContainer.appendChild(searchWrapper);
      wrapper.parentNode.insertBefore(searchContainer, wrapper);

      var filteredRows = dataRows.slice();
      var currentPage = 1;

      var paginationContainer = document.createElement('div');
      paginationContainer.className = 'table-pagination';
      wrapper.parentNode.insertBefore(paginationContainer, wrapper.nextSibling);

      var activeIndex = -1;

      function showAutocomplete(query) {
        var matches = columnNames.filter(function(name) {
          return name.toLowerCase().indexOf(query.toLowerCase()) > -1;
        });

        if (matches.length === 0 || query === '') {
          autocompleteList.style.display = 'none';
          activeIndex = -1;
          return;
        }

        autocompleteList.innerHTML = '';
        matches.forEach(function(name, index) {
          var item = document.createElement('div');
          item.className = 'table-search-autocomplete-item';
          item.textContent = name + ':';
          item.addEventListener('click', function() {
            searchInput.value = name + ': ';
            autocompleteList.style.display = 'none';
            activeIndex = -1;
            searchInput.focus();
            doSearch();
          });
          item.addEventListener('mouseenter', function() {
            activeIndex = index;
            updateActiveItem();
          });
          autocompleteList.appendChild(item);
        });

        autocompleteList.style.display = 'block';
        searchInput.classList.add('has-autocomplete');
        activeIndex = 0;
        updateActiveItem();
      }

      function updateActiveItem() {
        var items = autocompleteList.querySelectorAll('.table-search-autocomplete-item');
        items.forEach(function(item, idx) {
          if (idx === activeIndex) item.classList.add('active');
          else item.classList.remove('active');
        });
      }

      function hideAutocomplete() {
        autocompleteList.style.display = 'none';
        searchInput.classList.remove('has-autocomplete');
        activeIndex = -1;
      }

      searchInput.addEventListener('keydown', function(e) {
        if (autocompleteList.style.display === 'none') return;

        var items = autocompleteList.querySelectorAll('.table-search-autocomplete-item');
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          activeIndex = (activeIndex + 1) % items.length;
          updateActiveItem();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          activeIndex = (activeIndex - 1 + items.length) % items.length;
          updateActiveItem();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (activeIndex >= 0 && items[activeIndex]) {
            items[activeIndex].click();
          }
        } else if (e.key === 'Escape') {
          hideAutocomplete();
        }
      });

      searchInput.addEventListener('input', function() {
        var val = searchInput.value;
        if (val.indexOf(':') === -1 && val.length > 0) {
          showAutocomplete(val);
        } else {
          hideAutocomplete();
        }
        doSearch();
      });

      function doSearch() {
        var raw = searchInput.value;
        var colonIdx = raw.indexOf(':');

        if (colonIdx > -1) {
          var colName = raw.substring(0, colonIdx).trim().toLowerCase();
          var query = raw.substring(colonIdx + 1).trim().toLowerCase();

          var colIndex = -1;
          headers.forEach(function(th, idx) {
            if (colIndex === -1 && th.textContent.trim().toLowerCase().indexOf(colName) > -1) {
              colIndex = idx;
            }
          });

          if (colIndex > -1) {
            filteredRows = dataRows.filter(function(row) {
              var cell = row.cells[colIndex];
              var text = cell ? cell.textContent.toLowerCase() : '';
              return text.indexOf(query) > -1;
            });
          } else {
            filteredRows = dataRows.filter(function(row) {
              return row.textContent.toLowerCase().indexOf(raw.toLowerCase()) > -1;
            });
          }
        } else {
          var q = raw.toLowerCase();
          filteredRows = dataRows.filter(function(row) {
            return row.textContent.toLowerCase().indexOf(q) > -1;
          });
        }

        currentPage = 1;
        renderPage();
      }

      function renderPage() {
        var total = filteredRows.length;
        var totalPages = Math.ceil(total / rowsPerPage);
        if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
        if (totalPages === 0) currentPage = 1;

        var start = (currentPage - 1) * rowsPerPage;
        var end = start + rowsPerPage;

        dataRows.forEach(function(row) { row.style.display = 'none'; });
        filteredRows.forEach(function(row, index) {
          if (index >= start && index < end) row.style.display = '';
        });

        updatePaginationControls(total, totalPages);
      }

      function updatePaginationControls(total, totalPages) {
        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;

        var start = (currentPage - 1) * rowsPerPage + 1;
        var end = Math.min(currentPage * rowsPerPage, total);

        var info = document.createElement('span');
        info.className = 'table-pagination-info';
        info.textContent = 'Showing ' + start + '-' + end + ' of ' + total;
        paginationContainer.appendChild(info);

        var btnGroup = document.createElement('div');
        btnGroup.className = 'table-pagination-buttons';

        function makeBtn(label, disabled, onClick) {
          var btn = document.createElement('button');
          btn.textContent = label;
          btn.disabled = disabled;
          btn.className = disabled ? 'table-page-btn disabled' : 'table-page-btn';
          btn.addEventListener('click', onClick);
          return btn;
        }

        btnGroup.appendChild(makeBtn('Prev', currentPage === 1, function() {
          if (currentPage > 1) { currentPage--; renderPage(); }
        }));

        var maxVisible = 7;
        var pages = [];
        if (totalPages <= maxVisible) {
          for (var i = 1; i <= totalPages; i++) pages.push(i);
        } else {
          pages.push(1);
          if (currentPage > 3) pages.push('...');
          var rangeStart = Math.max(2, currentPage - 1);
          var rangeEnd = Math.min(totalPages - 1, currentPage + 1);
          for (var i = rangeStart; i <= rangeEnd; i++) pages.push(i);
          if (currentPage < totalPages - 2) pages.push('...');
          pages.push(totalPages);
        }

        pages.forEach(function(p) {
          if (p === '...') {
            var span = document.createElement('span');
            span.className = 'table-page-ellipsis';
            span.textContent = '...';
            btnGroup.appendChild(span);
          } else {
            (function(page) {
              var btn = makeBtn(String(page), false, function() {
                currentPage = page;
                renderPage();
              });
              if (page === currentPage) btn.classList.add('active');
              btnGroup.appendChild(btn);
            })(p);
          }
        });

        btnGroup.appendChild(makeBtn('Next', currentPage === totalPages, function() {
          if (currentPage < totalPages) { currentPage++; renderPage(); }
        }));

        paginationContainer.appendChild(btnGroup);
      }

      headers.forEach(function(th, colIndex) {
        th.classList.add('sortable-header');
        th.setAttribute('tabindex', '0');
        th.setAttribute('role', 'button');

        function doSort() {
          var ascending = !th.classList.contains('sort-asc');
          headers.forEach(function(h) { h.classList.remove('sort-asc', 'sort-desc'); });
          th.classList.add(ascending ? 'sort-asc' : 'sort-desc');

          filteredRows.sort(function(a, b) {
            var aCol = a.cells[colIndex] ? a.cells[colIndex].textContent.trim() : '';
            var bCol = b.cells[colIndex] ? b.cells[colIndex].textContent.trim() : '';
            var aNum = parseFloat(aCol.replace(/[^0-9.-]/g, ''));
            var bNum = parseFloat(bCol.replace(/[^0-9.-]/g, ''));
            if (!isNaN(aNum) && !isNaN(bNum)) return ascending ? aNum - bNum : bNum - aNum;
            return ascending ? aCol.localeCompare(bCol) : bCol.localeCompare(aCol);
          });

          filteredRows.forEach(function(row) { tbody.appendChild(row); });
          renderPage();
        }

        th.addEventListener('click', doSort);
        th.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            doSort();
          }
        });
      });

      renderPage();
    });
  }

  /* ── Task list progress bar ── */

  function initTaskProgress() {
    var root = document.querySelector('.mdstyled-root');
    if (!root) return;

    root.querySelectorAll('.contains-task-list').forEach(function(list) {
      var boxes = Array.from(list.querySelectorAll('.task-list-item-checkbox'));
      if (boxes.length === 0) return;

      boxes.forEach(function(cb) { cb.removeAttribute('disabled'); });

      var wrap = document.createElement('div');
      wrap.className = 'task-progress';

      var bar = document.createElement('div');
      bar.className = 'task-progress-bar';
      var fill = document.createElement('div');
      fill.className = 'task-progress-fill';
      bar.appendChild(fill);

      var label = document.createElement('span');
      label.className = 'task-progress-label';

      wrap.appendChild(bar);
      wrap.appendChild(label);
      list.parentNode.insertBefore(wrap, list);

      function update() {
        var checked = boxes.filter(function(cb) { return cb.checked; }).length;
        var pct = Math.round((checked / boxes.length) * 100);
        fill.style.width = pct + '%';
        fill.className = 'task-progress-fill' + (checked === boxes.length ? ' done' : '');
        label.textContent = checked + ' / ' + boxes.length + ' done';
      }

      boxes.forEach(function(cb) { cb.addEventListener('change', update); });
      update();
    });
  }

  document.addEventListener('click', function(e) {
    document.querySelectorAll('.table-search-autocomplete').forEach(function(el) {
      var wrapper = el.parentElement;
      if (wrapper && !wrapper.contains(e.target)) el.style.display = 'none';
    });
  });


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

      if (tag === 'BR') { out += '\\\n'; continue; }
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

    Array.prototype.slice.call(list.children).forEach(function (li) {
      if (li.tagName !== 'LI') return;

      var checkbox = li.querySelector('input[type="checkbox"]');
      var marker = ordered ? (index++) + '. ' : '- ';
      if (checkbox) marker += checkbox.checked ? '[x] ' : '[ ] ';

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

    return out.join('\n');
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
        if (block.trim()) blocks.push(block);
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

  /* ═══════════════════════════════════════
     In-preview editor
     ═══════════════════════════════════════ */

  var SCROLL_SAVE_MS = 250;

  var BLOCK_TYPES = [
    { value: 'p', label: 'Text' },
    { value: 'h1', label: 'Heading 1' },
    { value: 'h2', label: 'Heading 2' },
    { value: 'h3', label: 'Heading 3' },
    { value: 'h4', label: 'Heading 4' },
    { value: 'ul', label: 'Bullet list' },
    { value: 'ol', label: 'Numbered list' },
    { value: 'task', label: 'Checklist' },
    { value: 'quote', label: 'Quote' },
    { value: 'code', label: 'Code block' }
  ];

  /* Starting content for a block added from the + menu. */
  var INSERTABLE = [
    { label: 'Heading 1', markdown: '# Heading' },
    { label: 'Heading 2', markdown: '## Heading' },
    { label: 'Heading 3', markdown: '### Heading' },
    { label: 'Text', markdown: 'Write something.' },
    { label: 'Bullet list', markdown: '- First item\n- Second item' },
    { label: 'Numbered list', markdown: '1. First item\n2. Second item' },
    { label: 'Checklist', markdown: '- [ ] First task\n- [ ] Second task' },
    { label: 'Quote', markdown: '> Quoted text' },
    { label: 'Code block', markdown: '```js\nconsole.log("hello");\n```' },
    { label: 'Table', markdown: '| Column | Column |\n| --- | --- |\n| Cell | Cell |' },
    { label: 'Divider', markdown: '---' }
  ];

  var INLINE_ACTIONS = [
    { cmd: 'bold', label: 'B', title: 'Bold (Ctrl/Cmd+B)', wrap: '**' },
    { cmd: 'italic', label: 'I', title: 'Italic (Ctrl/Cmd+I)', wrap: '*' },
    { cmd: 'strikeThrough', label: 'S', title: 'Strikethrough', wrap: '~~' },
    { cmd: 'code', label: '</>', title: 'Inline code', wrap: '`' },
    { cmd: 'link', label: 'Link', title: 'Insert link' }
  ];

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
      var group = [host];
      var prev = host.previousElementSibling;
      if (prev && (prev.classList.contains('table-interactive-controls') || prev.classList.contains('task-progress'))) {
        group.unshift(prev);
      }
      var next = host.nextElementSibling;
      if (next && next.classList.contains('table-pagination')) group.push(next);
      return group;
    }

    /* ── Toolbar ── */

    var bar = el('div', 'mdstyled-edit-bar');

    var toggleBtn = button('Edit', 'mdstyled-edit-toggle', 'Click any block to edit it in place');
    toggleBtn.setAttribute('aria-pressed', 'false');
    var pencil = el('span', 'mdstyled-edit-icon', '✎');
    pencil.setAttribute('aria-hidden', 'true');
    toggleBtn.insertBefore(pencil, toggleBtn.firstChild);

    var appendBtn = button('Add block', 'mdstyled-edit-append', 'Add a block at the end of the document');
    var sourceBtn = button('Source', 'mdstyled-edit-source', 'Edit the whole Markdown file');

    bar.appendChild(toggleBtn);
    bar.appendChild(appendBtn);
    bar.appendChild(sourceBtn);
    document.body.appendChild(bar);

    /* ── Insert menu ── */

    var addFloat = button('+', 'mdstyled-add-float', 'Add a block below');
    addFloat.hidden = true;
    document.body.appendChild(addFloat);

    var menu = el('div', 'mdstyled-insert-menu');
    menu.hidden = true;
    menu.setAttribute('role', 'menu');
    document.body.appendChild(menu);

    var menuTargetLine = null;

    INSERTABLE.forEach(function (item) {
      var b = button(item.label, 'mdstyled-insert-item');
      b.setAttribute('role', 'menuitem');
      b.addEventListener('click', function () {
        var line = menuTargetLine;
        hideMenu();
        if (line == null) return;
        insertBlock(line, item.markdown);
      });
      menu.appendChild(b);
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
      if (e.target.closest('.mdstyled-insert-menu, .mdstyled-add-float, .mdstyled-edit-append')) return;
      hideMenu();
    });

    /* The floating + follows whichever block is hovered while edit mode is on. */
    var hoveredHost = null;
    root.addEventListener('mouseover', function (e) {
      if (!editing || open) return;
      var host = e.target.closest('.mdstyled-editable');
      if (!host || host === hoveredHost) return;
      hoveredHost = host;
      var rect = host.getBoundingClientRect();
      addFloat.hidden = false;
      addFloat.style.top = (rect.top + window.scrollY - 10) + 'px';
      addFloat.style.left = (rect.right + window.scrollX - 12) + 'px';
    });

    addFloat.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!hoveredHost) return;
      showMenu(addFloat, parseInt(hoveredHost.getAttribute('data-mdstyled-end'), 10));
    });

    appendBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!editing) setEditing(true);
      showMenu(appendBtn, api.lineCount);
    });

    function insertBlock(line, markdown) {
      var atEnd = line >= api.lineCount;
      var fileEndsBlank = api.lineCount > 0 && api.getSource(api.lineCount - 1, api.lineCount).trim() === '';
      var nextLineBlank = atEnd || api.getSource(line, line + 1).trim() === '';

      /* Blank lines around the new block, so it never merges with its neighbours.
         Appending to a file with no trailing newline needs one more. */
      var prefix = (atEnd && !fileEndsBlank) ? '\n\n' : '\n';
      var suffix = nextLineBlank ? '' : '\n\n';
      var focusLine = (atEnd && fileEndsBlank) ? line : line + 1;

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

    /* ── Block editor ── */

    var editing = false;
    var open = null;

    function closeBlockEditor() {
      if (!open) return;
      open.group.forEach(function (node) { node.classList.remove('mdstyled-editable-hidden'); });
      if (open.wrap.parentNode) open.wrap.parentNode.removeChild(open.wrap);
      open = null;
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
        addFloat.hidden = true;
        hoveredHost = null;
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
      addFloat.hidden = true;

      var start = parseInt(host.getAttribute('data-mdstyled-start'), 10);
      var end = parseInt(host.getAttribute('data-mdstyled-end'), 10);
      var original = api.getSource(start, end);
      var group = groupFor(host);

      var wrap = el('div', 'mdstyled-block-editor');

      /* toolbar */
      var toolbar = el('div', 'mdstyled-editor-toolbar');

      var typeSelect = document.createElement('select');
      typeSelect.className = 'mdstyled-block-type';
      typeSelect.title = 'Block type';
      BLOCK_TYPES.forEach(function (t) {
        var option = document.createElement('option');
        option.value = t.value;
        option.textContent = t.label;
        typeSelect.appendChild(option);
      });
      toolbar.appendChild(typeSelect);
      toolbar.appendChild(el('span', 'mdstyled-toolbar-sep'));

      var inlineButtons = INLINE_ACTIONS.map(function (action) {
        var b = button(action.label, 'mdstyled-format-btn mdstyled-format-' + action.cmd, action.title);
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function () { applyInline(action); });
        toolbar.appendChild(b);
        return b;
      });

      toolbar.appendChild(el('span', 'mdstyled-toolbar-spacer'));

      var modeBtn = button('Markdown', 'mdstyled-mode-toggle', 'Switch between rich text and Markdown source');
      toolbar.appendChild(modeBtn);
      wrap.appendChild(toolbar);

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

      /* ── modes ── */

      var mode = 'rich';
      var blockType = detectBlockType(original);

      /* Tables, dividers and anything unusual are clearer as Markdown. */
      var richSupported = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'task', 'quote'].indexOf(blockType) !== -1;

      typeSelect.value = BLOCK_TYPES.some(function (t) { return t.value === blockType; }) ? blockType : 'p';
      typeSelect.disabled = !richSupported && blockType !== 'code';

      function currentMarkdown() {
        return mode === 'rich' ? htmlToMarkdown(rich) : ta.value;
      }

      function setMode(next, markdown) {
        if (next === 'markdown') {
          ta.value = markdown != null ? markdown : currentMarkdown();
          mode = 'markdown';
          rich.hidden = true;
          ta.hidden = false;
          autosize(ta);
          modeBtn.textContent = 'Rich text';
          inlineButtons.forEach(function (b) { b.disabled = false; });
          ta.focus();
          return Promise.resolve();
        }

        var source = markdown != null ? markdown : ta.value;
        return api.render(source).then(function (html) {
          rich.innerHTML = html;
          mode = 'rich';
          ta.hidden = true;
          rich.hidden = false;
          modeBtn.textContent = 'Markdown';
          inlineButtons.forEach(function (b) { b.disabled = false; });
          rich.focus();
        });
      }

      modeBtn.addEventListener('click', function () {
        setMode(mode === 'rich' ? 'markdown' : 'rich').catch(reportError);
      });

      typeSelect.addEventListener('change', function () {
        var next = retypeMarkdown(currentMarkdown(), typeSelect.value);
        if (mode === 'markdown') {
          ta.value = next;
          autosize(ta);
        } else {
          setMode('rich', next).catch(reportError);
        }
      });

      /* ── inline formatting ── */

      function wrapSelectionInTextarea(marker) {
        var startPos = ta.selectionStart;
        var endPos = ta.selectionEnd;
        var selected = ta.value.slice(startPos, endPos) || 'text';
        ta.value = ta.value.slice(0, startPos) + marker + selected + marker + ta.value.slice(endPos);
        ta.focus();
        ta.setSelectionRange(startPos + marker.length, startPos + marker.length + selected.length);
        autosize(ta);
      }

      function wrapSelectionInCode() {
        var selection = window.getSelection();
        if (!selection.rangeCount || selection.isCollapsed) return;
        var range = selection.getRangeAt(0);
        var code = document.createElement('code');
        try {
          range.surroundContents(code);
        } catch (err) {
          code.appendChild(range.extractContents());
          range.insertNode(code);
        }
        selection.removeAllRanges();
        var after = document.createRange();
        after.selectNodeContents(code);
        selection.addRange(after);
      }

      function applyInline(action) {
        if (action.cmd === 'link') {
          openLinkRow();
          return;
        }
        if (mode === 'markdown') {
          wrapSelectionInTextarea(action.wrap);
          return;
        }
        rich.focus();
        if (action.cmd === 'code') {
          wrapSelectionInCode();
          return;
        }
        exec(action.cmd);
      }

      var savedRange = null;

      function openLinkRow() {
        if (mode === 'rich') {
          var selection = window.getSelection();
          savedRange = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
        }
        linkRow.hidden = false;
        linkInput.value = '';
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
          var startPos = ta.selectionStart;
          var endPos = ta.selectionEnd;
          var label = ta.value.slice(startPos, endPos) || 'link';
          ta.value = ta.value.slice(0, startPos) + '[' + label + '](' + href + ')' + ta.value.slice(endPos);
          autosize(ta);
        } else {
          rich.focus();
          if (savedRange) {
            var selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedRange);
          }
          var current = window.getSelection();
          if (current.isCollapsed) {
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
        setMode('rich', original).catch(function () { setMode('markdown', original); });
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
      ta.focus();

      function close() {
        document.body.classList.remove('mdstyled-source-open');
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
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

  /* ── Init ── */

  function init() {
    initAccordions();
    buildTOC();
    initInteractiveTables();
    initTaskProgress();
    initEditing();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
