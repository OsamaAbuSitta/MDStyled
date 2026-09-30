  /* ═══════════════════════════════════════
     Tables as data
     ═══════════════════════════════════════ */

  /* The table designer edits a GFM table as { header, align, rows } - plain cell
     strings with `|` unescaped - and writes it back with the columns padded to line
     up. A table the parser cannot round-trip without losing cells (a row wider than
     the header) returns null and is left to the Markdown editor. */

  var TABLE_DELIMITER_CELL = /^\s*(:?)-+(:?)\s*$/;

  /* GFM splits on every `|` not escaped with a backslash, code spans included. */
  function splitTableRow(line) {
    var s = line.trim();
    if (s.charAt(0) === '|') s = s.slice(1);
    if (s.slice(-1) === '|' && s.slice(-2) !== '\\|') s = s.slice(0, -1);

    var cells = [];
    var current = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (ch === '\\' && s.charAt(i + 1) === '|') { current += '|'; i++; continue; }
      if (ch === '|') { cells.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    cells.push(current.trim());
    return cells;
  }

  function parseMarkdownTable(source) {
    var lines = source.split('\n').filter(function (line) { return line.trim() !== ''; });
    if (lines.length < 2) return null;

    var header = splitTableRow(lines[0]);
    var delimiter = splitTableRow(lines[1]);
    if (delimiter.length !== header.length) return null;

    var align = [];
    for (var i = 0; i < delimiter.length; i++) {
      var match = delimiter[i].match(TABLE_DELIMITER_CELL);
      if (!match) return null;
      align.push(match[1] && match[2] ? 'center' : match[2] ? 'right' : match[1] ? 'left' : '');
    }

    var rows = [];
    for (var r = 2; r < lines.length; r++) {
      var cells = splitTableRow(lines[r]);
      if (cells.length > header.length) return null;
      while (cells.length < header.length) cells.push('');
      rows.push(cells);
    }

    return { header: header, align: align, rows: rows };
  }

  function escapeTableCell(text) {
    return String(text).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
  }

  function serializeMarkdownTable(model) {
    var widths = model.header.map(function (cell, c) {
      var width = Math.max(3, escapeTableCell(cell).length);
      model.rows.forEach(function (row) { width = Math.max(width, escapeTableCell(row[c] || '').length); });
      return width;
    });

    function pad(text, width) {
      return text + new Array(Math.max(0, width - text.length) + 1).join(' ');
    }

    function line(cells) {
      return '| ' + cells.map(function (cell, c) { return pad(escapeTableCell(cell || ''), widths[c]); }).join(' | ') + ' |';
    }

    var delimiter = '| ' + widths.map(function (width, c) {
      var a = model.align[c];
      if (a === 'center') return ':' + new Array(width - 1).join('-') + ':';
      if (a === 'right') return new Array(width).join('-') + ':';
      if (a === 'left') return ':' + new Array(width).join('-');
      return new Array(width + 1).join('-');
    }).join(' | ') + ' |';

    return [line(model.header), delimiter].concat(model.rows.map(line)).join('\n');
  }
