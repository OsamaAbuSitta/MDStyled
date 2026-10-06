'use strict';
/**
 * Sanity checks for the template artefacts on disk:
 *   - every template folder has style.css and script.js
 *   - editable templates were built from the interactive templates + editor sources
 *     (i.e. the build script has been run and its output is up to date)
 *   - no unsubstituted @@TOKEN@@ palette placeholders remain in editable CSS
 *   - the interactive scripts still contain the markers the build script relies on
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

const ROOT      = path.join(__dirname, '..', '..');
const TEMPLATES = path.join(ROOT, 'templates');
const SCRIPTS   = path.join(ROOT, 'scripts');
const EDITOR_SRC = path.join(SCRIPTS, 'editable-template');

const ALL_TEMPLATES = [
  'editable-light',
  'editable-dark',
  'interactive-light',
  'interactive-dark',
  'default-light',
  'default-dark',
];

// Marker strings the build-editable-templates.js script relies on.
const INIT_MARKER = '  /* ── Init ── */';
const INIT_CALL   = '    initTaskProgress();\n';

// ── Folder structure ──────────────────────────────────────────────────────────

test('all six template directories exist', () => {
  const dirs = fs.readdirSync(TEMPLATES);
  for (const name of ALL_TEMPLATES) {
    expect(dirs, `missing template directory: ${name}`).toContain(name);
  }
});

test('every template directory has style.css', () => {
  for (const name of ALL_TEMPLATES) {
    expect(
      fs.existsSync(path.join(TEMPLATES, name, 'style.css')),
      `${name}/style.css is missing`
    ).toBe(true);
  }
});

test('every template directory has script.js', () => {
  for (const name of ALL_TEMPLATES) {
    expect(
      fs.existsSync(path.join(TEMPLATES, name, 'script.js')),
      `${name}/script.js is missing`
    ).toBe(true);
  }
});

// ── Editable template build health ────────────────────────────────────────────

test('editable template CSS contains no unsubstituted @@TOKEN@@ palette placeholders', () => {
  for (const theme of ['light', 'dark']) {
    const css = fs.readFileSync(path.join(TEMPLATES, `editable-${theme}`, 'style.css'), 'utf8');
    const unresolved = css.match(/@@\w+@@/g);
    expect(unresolved, `editable-${theme}/style.css has unresolved palette tokens: ${unresolved}`).toBeNull();
  }
});

test('editable template CSS begins with the corresponding interactive template CSS', () => {
  for (const theme of ['light', 'dark']) {
    const interactive = fs.readFileSync(
      path.join(TEMPLATES, `interactive-${theme}`, 'style.css'), 'utf8'
    ).replace(/\n+$/, '');                        // build strips trailing newlines before concatenating
    const editable = fs.readFileSync(path.join(TEMPLATES, `editable-${theme}`, 'style.css'), 'utf8');
    expect(
      editable.startsWith(interactive),
      `editable-${theme}/style.css should start with interactive-${theme}/style.css`
    ).toBe(true);
  }
});

test('editable template JS begins with the interactive template JS up to the init marker', () => {
  for (const theme of ['light', 'dark']) {
    const interactive = fs.readFileSync(
      path.join(TEMPLATES, `interactive-${theme}`, 'script.js'), 'utf8'
    );
    const editable = fs.readFileSync(path.join(TEMPLATES, `editable-${theme}`, 'script.js'), 'utf8');
    // Everything before the marker is unchanged; the build inserts editor code just before it.
    const markerPos = interactive.indexOf(INIT_MARKER);
    expect(markerPos, `interactive-${theme}/script.js missing init marker`).toBeGreaterThan(0);
    const prefix = interactive.slice(0, markerPos);
    expect(
      editable.startsWith(prefix),
      `editable-${theme}/script.js should share the same prefix as interactive-${theme}/script.js`
    ).toBe(true);
  }
});

test('editable template JS calls initEditing() (editor was injected by the build)', () => {
  for (const theme of ['light', 'dark']) {
    const js = fs.readFileSync(path.join(TEMPLATES, `editable-${theme}`, 'script.js'), 'utf8');
    expect(js).toContain('initEditing()');
  }
});

test('editable template JS contains the editor source files\' unique first lines', () => {
  const sourceFiles = ['emoji.js', 'serializer.js', 'cards.js', 'tables.js', 'editor.js'];
  for (const theme of ['light', 'dark']) {
    const bundled = fs.readFileSync(path.join(TEMPLATES, `editable-${theme}`, 'script.js'), 'utf8');
    for (const file of sourceFiles) {
      const src = fs.readFileSync(path.join(EDITOR_SRC, file), 'utf8');
      const firstLine = src.split('\n').find(l => l.trim().length > 0);
      if (firstLine && firstLine.trim().length > 4) {
        // The line should appear verbatim in the bundled output.
        expect(bundled, `editable-${theme}/script.js is missing content from ${file}`).toContain(firstLine.trim());
      }
    }
  }
});

// ── Interactive template markers (build script preconditions) ─────────────────

test('interactive template scripts still contain the init marker the build needs', () => {
  for (const theme of ['light', 'dark']) {
    const js = fs.readFileSync(path.join(TEMPLATES, `interactive-${theme}`, 'script.js'), 'utf8');
    expect(js, `interactive-${theme}/script.js missing INIT_MARKER`).toContain(INIT_MARKER);
    expect(js, `interactive-${theme}/script.js missing INIT_CALL`).toContain(INIT_CALL);
  }
});
