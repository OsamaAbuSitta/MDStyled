  /* ═══════════════════════════════════════
     Card grids as data
     ═══════════════════════════════════════ */

  /* The card designer edits a grid as a list of { title, level, body, classes }
     and writes it back in whichever of the two card syntaxes it came from - a
     `<div class="mdstyled-cards cols-3">` wrapper around `<!-- .card -->` quotes,
     or a list marked `<!-- .cards .cols-3 -->` with one card per item.

     Anything the parser does not recognise makes it give up (return null), so a
     hand-written grid it cannot round-trip is left to the ordinary block editor. */

  var CARD_GRID_OPEN = /^\s*<div\s+class="mdstyled-cards([^"]*)"\s*>\s*$/;
  var CARD_GRID_CLOSE = /^\s*<\/div>\s*$/;
  var CARD_CLASS_COMMENT = /^\s*<!--\s*((?:\.[A-Za-z0-9_-]+\s*)+)-->\s*$/;
  var CARD_LIST_ITEM = /^([-*+]|\d+[.)])( +)(.*)$/;
  var CARD_MAX_COLS = 4;

  function parseClassComment(line) {
    var match = line.match(CARD_CLASS_COMMENT);
    if (!match) return null;
    return match[1].trim().split(/\s+/).map(function (c) { return c.slice(1); });
  }

  function classComment(classes) {
    return '<!-- ' + classes.map(function (c) { return '.' + c; }).join(' ') + ' -->';
  }

  function colsFromClasses(classes) {
    for (var i = 0; i < classes.length; i++) {
      var match = classes[i].match(/^cols-(\d)$/);
      if (match) return Math.max(1, Math.min(CARD_MAX_COLS, parseInt(match[1], 10)));
    }
    return 0;
  }

  function trimBlankLines(lines) {
    var from = 0;
    var to = lines.length;
    while (from < to && lines[from].trim() === '') from++;
    while (to > from && lines[to - 1].trim() === '') to--;
    return lines.slice(from, to);
  }

  /* A card's first line is its header when it is a heading or a line of bold text. */
  function splitCardContent(lines, defaultLevel) {
    lines = trimBlankLines(lines);
    var card = { title: '', level: defaultLevel, body: '' };
    if (lines.length === 0) return card;

    var heading = lines[0].match(/^(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/);
    var bold = lines[0].match(/^\*\*([^*].*?)\*\*\s*$/);

    if (heading) {
      card.title = heading[2];
      card.level = heading[1].length;
      lines = lines.slice(1);
    } else if (bold) {
      card.title = bold[1];
      card.level = 0;
      lines = lines.slice(1);
    }

    card.body = trimBlankLines(lines).join('\n');
    return card;
  }

  function cardHeaderLine(card) {
    return card.level > 0
      ? new Array(card.level + 1).join('#') + ' ' + card.title.trim()
      : '**' + card.title.trim() + '**';
  }

  function cardIsEmpty(card) {
    return !card.title.trim() && !card.body.trim();
  }

  /* `<div class="mdstyled-cards">` ... `</div>` with a `<!-- .card -->` quote per card. */
  function parseCardGrid(source) {
    var lines = source.split('\n');
    if (lines.length < 2) return null;

    var open = lines[0].match(CARD_GRID_OPEN);
    if (!open || !CARD_GRID_CLOSE.test(lines[lines.length - 1])) return null;

    var gridClasses = open[1].trim() ? open[1].trim().split(/\s+/) : [];
    var cols = colsFromClasses(gridClasses) || 2;

    var raw = [];
    var current = null;

    for (var i = 1; i < lines.length - 1; i++) {
      var line = lines[i];
      var classes = parseClassComment(line);

      if (classes) {
        if (classes.indexOf('card') === -1) return null;
        current = { classes: classes, lines: [], ended: false };
        raw.push(current);
        continue;
      }
      if (line.trim() === '') {
        if (current && current.lines.length) current.ended = true;
        continue;
      }
      /* Quote lines, plus any lazy continuation of the quote's last paragraph. */
      if (!current || current.ended) return null;
      if (current.lines.length === 0 && !/^\s*>/.test(line)) return null;
      current.lines.push(line.replace(/^\s*> ?/, ''));
    }

    var level = 3;
    var cards = raw.map(function (entry, index) {
      var card = splitCardContent(entry.lines, index === 0 ? 3 : level);
      if (index === 0 && card.title) level = card.level;
      card.classes = entry.classes;
      return card;
    });

    return {
      kind: 'grid',
      cols: cols,
      gridClasses: gridClasses.filter(function (c) { return !/^cols-\d$/.test(c); }),
      level: level,
      cards: cards
    };
  }

  function serializeCardGrid(model) {
    var out = ['<div class="' + ['mdstyled-cards'].concat(model.gridClasses || [], ['cols-' + model.cols]).join(' ') + '">', ''];

    model.cards.forEach(function (card) {
      if (cardIsEmpty(card)) return;
      out.push(classComment(card.classes && card.classes.length ? card.classes : ['card']));
      var quote = [];
      if (card.title.trim()) quote.push(cardHeaderLine(card));
      if (card.title.trim() && card.body.trim()) quote.push('');
      if (card.body.trim()) quote = quote.concat(trimBlankLines(card.body.split('\n')));
      quote.forEach(function (line) { out.push(line ? '> ' + line : '>'); });
      out.push('');
    });

    out.push('</div>');
    return out.join('\n');
  }

  /* A list with `<!-- .cards -->` on it: one card per item. `listClasses` are the
     classes from that comment, `source` the list alone. */
  function parseCardList(listClasses, source) {
    var lines = source.split('\n');
    var items = [];
    var current = null;
    var ordered = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var item = line.match(CARD_LIST_ITEM);

      if (item) {
        if (items.length === 0) ordered = /\d/.test(item[1]);
        current = { indent: item[1].length + item[2].length, lines: [item[3]] };
        items.push(current);
        continue;
      }
      if (!current) {
        if (line.trim() === '') continue;
        return null;
      }
      if (line.trim() === '') { current.lines.push(''); continue; }

      var spaces = line.match(/^ */)[0].length;
      current.lines.push(line.slice(Math.min(spaces, current.indent)));
    }
    if (items.length === 0) return null;

    return {
      kind: 'list',
      cols: colsFromClasses(listClasses),
      listClasses: listClasses.filter(function (c) { return !/^cols-\d$/.test(c); }),
      ordered: ordered,
      level: 0,
      cards: items.map(function (entry) {
        var card = splitCardContent(entry.lines, 0);
        card.classes = [];
        return card;
      })
    };
  }

  function serializeCardList(model) {
    var classes = model.listClasses.slice();
    if (classes.indexOf('cards') === -1) classes.unshift('cards');
    if (model.cols) classes.push('cols-' + model.cols);

    var items = [];
    model.cards.forEach(function (card) {
      if (cardIsEmpty(card)) return;
      var marker = model.ordered ? (items.length + 1) + '.' : '-';
      var pad = new Array(marker.length + 2).join(' ');

      var lines = [];
      if (card.title.trim()) lines.push(cardHeaderLine(card));
      if (card.title.trim() && card.body.trim()) lines.push('');
      if (card.body.trim()) lines = lines.concat(trimBlankLines(card.body.split('\n')));

      items.push(lines.map(function (line, index) {
        if (index === 0) return marker + ' ' + line;
        return line ? pad + line : '';
      }).join('\n'));
    });

    return classComment(classes) + '\n' + items.join('\n\n');
  }

  function serializeCards(model) {
    return model.kind === 'grid' ? serializeCardGrid(model) : serializeCardList(model);
  }
