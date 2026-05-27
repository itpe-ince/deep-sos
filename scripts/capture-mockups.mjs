// Mockup screenshot capture script
// Usage: cd frontend && node ../scripts/capture-mockups.mjs
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE = 'http://127.0.0.1:8765/mockup/pages';
const OUT = resolve(process.cwd(), '../docs/01-plan/screenshots');

const PAGES = [
  // [id, screen-name, url-path, viewport-height]
  ['01-home',                 'public/index.html'],         // # is handled by index.html base
  ['02-about',                'public/about.html'],
  ['03-issues-list',          'public/issues.html'],
  ['04-issue-detail',         'public/issue-detail.html'],
  ['05-projects-list',        'public/projects.html'],
  ['06-project-detail',       'public/project-detail.html'],
  ['07-success-cases',        'public/success-cases.html'],
  ['08-network',              'public/network.html'],
  ['09-performance',          'public/performance.html'],
  ['10-login',                'public/login.html'],
  ['11-user-issue-new',       'user/issue-new.html'],
  ['12-user-my-activities',   'user/my-activities.html'],
  ['13-user-profile',         'user/profile.html'],
  ['14-admin-dashboard',      'admin/dashboard.html'],
  ['15-admin-issues',         'admin/issues.html'],
  ['16-admin-issue-detail',   'admin/issue-detail.html'],
  ['17-admin-projects',       'admin/projects.html'],
  ['17b-admin-project-detail','admin/project-detail.html'],
  ['18-admin-success-cases',  'admin/success-cases.html'],
  ['19-admin-mentors',        'admin/mentors.html'],
  ['20-admin-organizations',  'admin/organizations.html'],
  ['21-admin-kpi',            'admin/kpi.html'],
  ['22-admin-cms-banners',    'admin/cms-banners.html'],
  ['23-admin-terms',          'admin/terms.html'],
  ['24-admin-users',          'admin/users.html'],
  ['24b-admin-audit',         'admin/audit.html'],
];

// index.html is at /mockup/pages/index.html (not public/index.html)
PAGES[0][1] = 'index.html';

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

let ok = 0, fail = 0;
for (const [id, urlPath] of PAGES) {
  const url = `${BASE}/${urlPath}`;
  const outFile = resolve(OUT, `${id}.png`);
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    if (!resp || !resp.ok()) throw new Error(`HTTP ${resp?.status()}`);
    // wait for fonts and any lazy content
    await page.waitForTimeout(800);
    await page.screenshot({ path: outFile, fullPage: true });
    console.log(`✓ ${id}  ${urlPath}`);
    ok++;
  } catch (e) {
    console.error(`✗ ${id}  ${urlPath}  — ${e.message}`);
    fail++;
  }
}

await browser.close();
console.log(`\n총 ${PAGES.length}개 / 성공 ${ok} / 실패 ${fail}`);
process.exit(fail > 0 ? 1 : 0);
