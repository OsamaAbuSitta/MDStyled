(function () {
  'use strict';

  /* ── Responsive tables ── */

  function wrapTables() {
    var root = document.querySelector('.mdstyled-root');
    if (!root) return;
    root.querySelectorAll('table').forEach(function (table) {
      var wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

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

  /* ── Init ── */

  function init() {
    wrapTables();
    buildTOC();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
