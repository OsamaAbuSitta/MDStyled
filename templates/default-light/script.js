(function () {
  'use strict';

  /* ── Table of contents ── */

  function buildTOC() {
    var root = document.querySelector('.mdstyled-root');
    if (!root) return;

    var headings = root.querySelectorAll('h2, h3');
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
      items.push({ el: li, id: h.id });
    });

    if (items.length === 0) return;

    toc.appendChild(list);
    root.parentNode.insertBefore(toc, root.nextSibling);

    function updateActive() {
      var current = '';
      headings.forEach(function (h) {
        var rect = h.getBoundingClientRect();
        if (rect.top <= 100) current = h.id;
      });
      items.forEach(function (item) {
        if (item.id === current) {
          item.el.classList.add('active');
        } else {
          item.el.classList.remove('active');
        }
      });
    }

    updateActive();
    window.addEventListener('scroll', updateActive);
  }

  /* ── Init ── */

  function init() {
    buildTOC();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
