'use strict';
/**
 * E2E tests for the interactive table features in interactive-light/dark templates:
 *   - search / filter rows
 *   - column-specific search ("Column: value")
 *   - sort ascending / descending by clicking a header
 *   - pagination appears for tables exceeding rowsPerPage (10)
 *   - clearing the search restores all rows
 */
const { test, expect } = require('./fixtures');

// A table with enough rows to exercise search and sort, but not trigger pagination.
const TABLE_MD = `# Score Board

| Player | Score | Team  |
|--------|-------|-------|
| Alice  |    90 | Red   |
| Bob    |    75 | Blue  |
| Carol  |    85 | Red   |
| Dave   |    60 | Blue  |
| Eve    |    95 | Red   |
`;

// A table with 12 data rows to trigger pagination (rowsPerPage = 10).
const LONG_TABLE_MD = `# Rankings

| Name  | Points |
|-------|--------|
| P01   |    100 |
| P02   |     95 |
| P03   |     90 |
| P04   |     85 |
| P05   |     80 |
| P06   |     75 |
| P07   |     70 |
| P08   |     65 |
| P09   |     60 |
| P10   |     55 |
| P11   |     50 |
| P12   |     45 |
`;

// Helper — count visible (non-hidden) rows in the first table body.
async function visibleRowCount(page) {
  return page.evaluate(() => {
    const tbody = document.querySelector('.mdstyled-root table tbody');
    if (!tbody) return 0;
    return Array.from(tbody.querySelectorAll('tr')).filter(r => r.style.display !== 'none').length;
  });
}

// ── interactive-light: search ─────────────────────────────────────────────────

test.describe('interactive-light search / filter', () => {
  test('search input is visible after page load', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.table-search-input').waitFor();
    await expect(page.locator('.table-search-input')).toBeVisible();
  });

  test('typing a query hides non-matching rows', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.table-search-input').waitFor();

    const totalRows = await visibleRowCount(page);
    expect(totalRows).toBe(5);   // 5 data rows

    await page.locator('.table-search-input').fill('Alice');
    const filtered = await visibleRowCount(page);
    expect(filtered).toBe(1);
  });

  test('clearing the search restores all rows', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.table-search-input').waitFor();

    await page.locator('.table-search-input').fill('Alice');
    await page.locator('.table-search-input').fill('');
    const restored = await visibleRowCount(page);
    expect(restored).toBe(5);
  });

  test('column-specific search with "Column: value" syntax', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.table-search-input').waitFor();

    // Filter to Team = "Red" rows (Alice, Carol, Eve = 3 rows).
    await page.locator('.table-search-input').fill('Team: Red');
    const filtered = await visibleRowCount(page);
    expect(filtered).toBe(3);
  });

  test('search with no matches shows zero visible rows', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.table-search-input').waitFor();

    await page.locator('.table-search-input').fill('zzz_no_match');
    const filtered = await visibleRowCount(page);
    expect(filtered).toBe(0);
  });
});

// ── interactive-light: sort ───────────────────────────────────────────────────

test.describe('interactive-light column sort', () => {
  test('table headers have the sortable-header class', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.sortable-header').first().waitFor();
    await expect(page.locator('.sortable-header')).toHaveCount(3); // Player, Score, Team
  });

  test('clicking a header marks it sort-asc', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.sortable-header').first().waitFor();

    const playerHeader = page.locator('.sortable-header').first();
    await playerHeader.click();
    await expect(playerHeader).toHaveClass(/sort-asc/);
  });

  test('clicking the same header twice flips it to sort-desc', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.sortable-header').first().waitFor();

    const playerHeader = page.locator('.sortable-header').first();
    await playerHeader.click();
    await playerHeader.click();
    await expect(playerHeader).toHaveClass(/sort-desc/);
    await expect(playerHeader).not.toHaveClass(/sort-asc/);
  });

  test('sorting by Score ascending puts the lowest score first', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.sortable-header').first().waitFor();

    // Score is the second column header.
    const scoreHeader = page.locator('.sortable-header').nth(1);
    await scoreHeader.click(); // ascending

    // First visible row should be Dave with score 60.
    const firstRowText = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.mdstyled-root table tbody tr'))
        .filter(r => r.style.display !== 'none');
      return rows[0] ? rows[0].textContent.trim() : '';
    });
    expect(firstRowText).toContain('60');
  });

  test('sorting by Score descending puts the highest score first', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.sortable-header').first().waitFor();

    const scoreHeader = page.locator('.sortable-header').nth(1);
    await scoreHeader.click(); // ascending
    await scoreHeader.click(); // descending

    const firstRowText = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.mdstyled-root table tbody tr'))
        .filter(r => r.style.display !== 'none');
      return rows[0] ? rows[0].textContent.trim() : '';
    });
    expect(firstRowText).toContain('95');
  });
});

// ── interactive-light: pagination ─────────────────────────────────────────────

test.describe('interactive-light pagination', () => {
  test('pagination controls appear for a table with more than 10 rows', async ({ preview, page }) => {
    await preview.open(LONG_TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.table-pagination').waitFor();
    await expect(page.locator('.table-pagination')).toBeVisible();
  });

  test('first page shows 10 visible rows out of 12', async ({ preview, page }) => {
    await preview.open(LONG_TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.table-pagination').waitFor();
    const visible = await visibleRowCount(page);
    expect(visible).toBe(10);
  });

  test('pagination info shows "Showing 1-10 of 12"', async ({ preview, page }) => {
    await preview.open(LONG_TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.table-pagination-info').waitFor();
    await expect(page.locator('.table-pagination-info')).toContainText('Showing 1-10 of 12');
  });

  test('Next button navigates to the second page', async ({ preview, page }) => {
    await preview.open(LONG_TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.table-pagination').waitFor();

    await page.locator('.table-page-btn:not(.disabled)').getByText('Next').click();
    const visible = await visibleRowCount(page);
    expect(visible).toBe(2); // 12 - 10 = 2 remaining

    await expect(page.locator('.table-pagination-info')).toContainText('Showing 11-12 of 12');
  });

  test('no pagination for a small table (5 rows)', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.table-interactive-controls').waitFor();
    // Pagination container exists but should be empty (totalPages <= 1).
    const paginationText = await page.locator('.table-pagination').textContent();
    expect(paginationText.trim()).toBe('');
  });
});

// ── interactive-dark: basic smoke ─────────────────────────────────────────────

test.describe('interactive-dark template smoke test', () => {
  test('has interactive controls and sort in dark theme', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'interactive-dark', editing: false });
    await page.locator('.table-interactive-controls').waitFor();
    await expect(page.locator('.table-search-input')).toBeVisible();
    await expect(page.locator('.sortable-header').first()).toBeVisible();
  });
});
