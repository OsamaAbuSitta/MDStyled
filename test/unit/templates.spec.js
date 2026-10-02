'use strict';
/**
 * Unit tests for src/templates.ts.
 *
 * Covers: getTemplates() shape/order, editableForTheme() theme branch,
 * and the mdstyled.defaultTemplate configuration enum in package.json.
 * Does NOT duplicate what test/unit/package-menus.spec.js already asserts
 * (command registration, submenu membership, template names via regex).
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const { buildUnit } = require('./build-unit');

// VS Code ColorThemeKind numeric constants (VS Code API spec, stable values).
const LIGHT             = 1;
const DARK              = 2;
const HIGH_CONTRAST     = 3;
const HIGH_CONTRAST_LIGHT = 4;

let mod;

test.beforeAll(() => {
  // Bundle templates.ts with the vscode stub.  templates.ts only imports
  // vscode + Node built-ins, so no external stubs are needed.
  mod = buildUnit('templates-mod', 'src/templates.ts');
});

test.afterEach(() => {
  // Reset theme mock so tests are independent.
  global.__vscodeThemeKind = undefined;
});

// ── getTemplates() ─────────────────────────────────────────────────────────────

test('getTemplates returns exactly 6 templates', () => {
  expect(mod.getTemplates()).toHaveLength(6);
});

test('templates are ordered: editable, interactive, default', () => {
  expect(mod.getTemplates().map(t => t.name)).toEqual([
    'editable-light',
    'editable-dark',
    'interactive-light',
    'interactive-dark',
    'default-light',
    'default-dark',
  ]);
});

test('every template has hasCSS = true', () => {
  for (const t of mod.getTemplates()) {
    expect(t.hasCSS).toBe(true);
  }
});

test('every template has hasJS = true', () => {
  for (const t of mod.getTemplates()) {
    expect(t.hasJS).toBe(true);
  }
});

test('every template has a non-empty string description', () => {
  for (const t of mod.getTemplates()) {
    expect(typeof t.description).toBe('string');
    expect(t.description.trim().length).toBeGreaterThan(0);
  }
});

test('editable template descriptions mention editing', () => {
  for (const t of mod.getTemplates().filter(t => t.name.startsWith('editable'))) {
    expect(t.description.toLowerCase()).toMatch(/edit/);
  }
});

test('interactive template descriptions mention tables or interactivity', () => {
  for (const t of mod.getTemplates().filter(t => t.name.startsWith('interactive'))) {
    expect(t.description.toLowerCase()).toMatch(/table|sort|filter|interactive/);
  }
});

// ── editableForTheme() ─────────────────────────────────────────────────────────

test('editableForTheme returns editable-light for Light theme', () => {
  global.__vscodeThemeKind = LIGHT;
  expect(mod.editableForTheme()).toBe('editable-light');
});

test('editableForTheme returns editable-light for HighContrastLight theme', () => {
  global.__vscodeThemeKind = HIGH_CONTRAST_LIGHT;
  expect(mod.editableForTheme()).toBe('editable-light');
});

test('editableForTheme returns editable-dark for Dark theme', () => {
  global.__vscodeThemeKind = DARK;
  expect(mod.editableForTheme()).toBe('editable-dark');
});

test('editableForTheme returns editable-dark for HighContrast (dark) theme', () => {
  global.__vscodeThemeKind = HIGH_CONTRAST;
  expect(mod.editableForTheme()).toBe('editable-dark');
});

// ── package.json: mdstyled.defaultTemplate enum ───────────────────────────────

test('defaultTemplate enum contains every template name', () => {
  const pkg      = require(path.join(__dirname, '..', '..', 'package.json'));
  const enumVals = pkg.contributes.configuration.properties['mdstyled.defaultTemplate'].enum;
  for (const t of mod.getTemplates()) {
    expect(enumVals).toContain(t.name);
  }
});

test('defaultTemplate enum contains "" (not-yet-chosen) and "none"', () => {
  const pkg      = require(path.join(__dirname, '..', '..', 'package.json'));
  const enumVals = pkg.contributes.configuration.properties['mdstyled.defaultTemplate'].enum;
  expect(enumVals).toContain('');
  expect(enumVals).toContain('none');
});

test('defaultTemplate enum has no unknown entries', () => {
  const pkg      = require(path.join(__dirname, '..', '..', 'package.json'));
  const enumVals = pkg.contributes.configuration.properties['mdstyled.defaultTemplate'].enum;
  const allowed  = new Set(['', 'none', ...mod.getTemplates().map(t => t.name)]);
  for (const v of enumVals) {
    expect(allowed.has(v)).toBe(true);
  }
});
