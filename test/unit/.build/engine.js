'use strict';
/**
 * Stub for src/engine (used as a runtime external when bundling other src/ modules).
 * Returns minimal HTML so the built pages exercise injection logic without
 * needing a real Markdown file or the full rendering pipeline.
 */
const DUMMY_HTML =
  '<!doctype html><html><head></head>' +
  '<body><div class="mdstyled-root"><h1>Test</h1></div></body></html>';

async function renderMdStyled()        { return DUMMY_HTML; }
async function hasFileLevelStyling()   { return false; }
function renderMarkdownFragment(md)    { return '<p>' + md + '</p>'; }

module.exports = { renderMdStyled, hasFileLevelStyling, renderMarkdownFragment };
