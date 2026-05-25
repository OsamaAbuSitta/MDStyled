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
      table.parentNode.insertBefore(searchContainer, table);

      var filteredRows = dataRows.slice();
      var currentPage = 1;

      var paginationContainer = document.createElement('div');
      paginationContainer.className = 'table-pagination';
      table.parentNode.insertBefore(paginationContainer, table.nextSibling);

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

  /* ── Init ── */

  function init() {
    initAccordions();
    buildTOC();
    initInteractiveTables();
    initTaskProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
