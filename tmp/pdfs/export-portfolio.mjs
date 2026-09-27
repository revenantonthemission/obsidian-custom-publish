import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../site/node_modules/playwright-core/index.mjs';

const root = '/Users/revenantonthemission/Sites/obsidian-blog';
const output = path.resolve('output/pdf/조준희_카카오페이_데이터플랫폼_포트폴리오_2026-09-20.pdf');
const metadata = path.resolve('tmp/pdfs/export-checks.json');
const css = `
  @page { size: A4; margin: 16mm 17mm 19mm; }
  html, body { background: #fff !important; color: #202827 !important;
    font-size: 10.5pt !important; line-height: 1.6 !important; }
  body { display: block !important; margin: 0 !important; padding: 0 !important; }
  .site-header, .site-footer, .profile-local-navigation, .portfolio-project-navigation,
  .reading-progress, .back-to-top, .search-overlay, .skip-link, astro-island,
  .case-study-details > summary { display: none !important; }
  .site-main, .profile-shell { display: block !important; max-width: none !important;
    width: auto !important; margin: 0 !important; padding: 0 !important; }
  .profile-shell-header { display: block !important; margin: 0 0 7mm !important;
    padding: 0 0 4mm !important; border-bottom: 1px solid #167f76; }
  .profile-shell-header h1 { margin: 0 !important; color: #202827 !important;
    font-size: 23pt !important; font-weight: 750; letter-spacing: -0.035em; }
  .pdf-application-title { margin: 2mm 0 0 !important; color: #49605c; font-size: 10.5pt; }
  .portfolio-intro { margin: 0 0 6mm !important; padding: 0 0 0 4mm !important;
    border-left: 2px solid #167f76; }
  .portfolio-eyebrow { margin: 0 0 2mm !important; font-size: 9pt !important; }
  .portfolio-summary { font-size: 11pt !important; line-height: 1.7 !important;
    font-weight: 500; max-width: none; margin-bottom: 3mm; }
  .profile-section + .profile-section { margin-top: 5mm !important;
    padding-top: 3mm !important; border-top: 1px solid #d5deda; }
  .profile-section > h2 { margin: 0 0 3mm !important; font-size: 14pt !important; }
  .profile-actions { display: flex !important; flex-wrap: wrap; gap: 2mm 5mm;
    margin: 2mm 0 0 !important; padding: 0 !important; }
  .profile-actions li { margin: 0 !important; padding: 0 !important; }
  .profile-actions a { display: inline !important; min-height: 0 !important;
    border: 0 !important; border-radius: 0 !important; padding: 0 !important;
    font-size: 9.5pt !important; font-weight: 500; }
  a { color: #126c64 !important; text-decoration: underline !important; }
  .portfolio-case-study { display: block !important; border: 0 !important;
    border-radius: 0 !important; padding: 0 !important; margin: 0 !important;
    background: #fff !important; break-inside: auto; }
  .portfolio-case-study + .portfolio-case-study { break-before: page; }
  .portfolio-case-study-header { margin: 0 0 3mm !important;
    padding: 2mm 0 3mm !important; border-bottom: 1px solid #b6cac3;
    break-inside: avoid; break-after: avoid; }
  .portfolio-case-study-header h3 { margin: 0 0 2mm !important;
    font-size: 20pt !important; line-height: 1.25; }
  .portfolio-case-number { margin: 0 0 2mm !important; font-size: 9pt !important; }
  .portfolio-outcome-summary { max-width: none; font-size: 10.5pt; line-height: 1.6 !important;
    font-weight: 600; margin-bottom: 0; }
  .case-study-dimension { display: block !important; padding: 2.5mm 0 !important;
    margin: 0 !important; border: 0 !important; }
  .case-study-dimension h4, .case-study-evidence h4 { margin: 0 0 2.5mm !important;
    font-size: 12pt !important; color: #126c64 !important; }
  .portfolio-case-study .profile-content-subtitle { margin: 0 0 1.6mm !important;
    font-size: 10.5pt !important; line-height: 1.5 !important; color: #202827 !important; }
  .profile-content-subsection { margin: 0 0 3.5mm !important; break-inside: avoid; }
  .profile-content-paragraph { margin: 0 0 3mm !important; }
  .profile-content-subsection > .profile-content-paragraph { margin: 0 !important; }
  .portfolio-case-study .profile-content-paragraph { line-height: 1.6 !important; }
  .case-study-dimension-outcomes { background: #f4f8f6 !important;
    border-left: 2px solid #167f76 !important; padding: 3mm 4mm !important;
    margin: 2mm 0 3mm !important; border-radius: 0 !important; }
  .case-study-details, .case-study-details-content { display: block !important;
    padding: 0 !important; border: 0 !important; margin: 0 !important; }
  .case-study-details::details-content { content-visibility: visible !important; }
  .case-study-evidence { padding: 3mm 0 0 !important; break-inside: avoid; }
  .pdf-compact-project .case-study-dimension { padding: 0.8mm 0 !important; }
  .pdf-compact-project .case-study-dimension h4 { margin-bottom: 1.6mm !important; }
  .pdf-compact-project .profile-content-subsection { margin-bottom: 2mm !important; }
  .pdf-compact-project .profile-content-paragraph { margin-bottom: 1.5mm !important; }
  .pdf-compact-project .case-study-dimension-outcomes { padding: 2mm 4mm !important; }
  .pdf-compact-project .case-study-evidence { padding-top: 1.5mm !important; }
  h2, h3, h4, h5 { break-after: avoid; }
  p, li { widows: 3; orphans: 3; word-break: keep-all; overflow-wrap: anywhere; }
  * { animation: none !important; transition: none !important; }
`;

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
console.log('Browser ready');
const deadline = setTimeout(async () => {
  console.error('PDF export exceeded its 45-second limit');
  await browser.close();
  process.exitCode = 1;
}, 45_000);
try {
  const context = await browser.newContext({ colorScheme: 'light' });
  const requests = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    assert.equal(url.origin, 'https://portfolio.local', `Unexpected request: ${url.href}`);
    const requestPath = url.pathname === '/portfolio' ? '/portfolio/index.html' : decodeURIComponent(url.pathname);
    const file = path.resolve(root, `.${requestPath}`);
    assert.ok(file.startsWith(`${root}/`), 'Request outside site root');
    const type = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
      '.woff2': 'font/woff2', '.js': 'application/javascript', '.svg': 'image/svg+xml' }[path.extname(file)]
      ?? 'application/octet-stream';
    requests.push(requestPath);
    const bytes = await fs.readFile(file);
    const body = file.endsWith('.html')
      ? bytes.toString('utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
      : bytes;
    await route.fulfill({ body, contentType: type });
  });
  const page = await context.newPage();
  await page.goto('https://portfolio.local/portfolio', { waitUntil: 'networkidle' });
  console.log('Portfolio loaded');
  const sourceFacts = await page.locator('[data-profile-fact-id]').evaluateAll(elements =>
    elements.map(element => ({ id: element.getAttribute('data-profile-fact-id'), text: element.textContent })));
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'light';
    document.title = '조준희 | 카카오페이 데이터 플랫폼 포트폴리오';
    for (const details of document.querySelectorAll('details')) details.open = true;
    document.querySelectorAll('.portfolio-case-study')[1].classList.add('pdf-compact-project');
    const heading = document.querySelector('.profile-shell-header h1');
    heading.textContent = '조준희 포트폴리오';
    const subtitle = document.createElement('p');
    subtitle.className = 'pdf-application-title';
    subtitle.textContent = '카카오페이 데이터 엔지니어 · 데이터 플랫폼 지원';
    heading.after(subtitle);
    for (const anchor of document.querySelectorAll('a[href^="/"]')) {
      anchor.href = new URL(anchor.getAttribute('href'), 'https://rvnnt.dev').href;
    }
    const email = document.querySelector('[data-profile-action-kind="email"]');
    email.textContent = email.getAttribute('href').replace('mailto:', '');
    const github = document.querySelector('[data-profile-action-kind="github"]');
    github.textContent = github.getAttribute('href').replace('https://', '');
  });
  await page.addStyleTag({ content: css });
  await page.emulateMedia({ media: 'print', colorScheme: 'light' });
  console.log('Print layout prepared');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await document.fonts.load('10.5pt Pretendard', document.body.innerText);
    await document.fonts.ready;
  });
  console.log('Fonts loaded');
  const checks = await page.evaluate(() => ({
    subtitleCount: document.querySelectorAll('.profile-content-subtitle').length,
    projects: [...document.querySelectorAll('.portfolio-case-study h3')].map(el => el.textContent.trim()),
    closedDetails: document.querySelectorAll('details:not([open])').length,
    fontsLoaded: document.fonts.status,
    text: document.querySelector('.portfolio-content').innerText,
    facts: [...document.querySelectorAll('[data-profile-fact-id]')].map(el => ({
      id: el.getAttribute('data-profile-fact-id'), text: el.textContent,
    })),
  }));
  assert.deepEqual(checks.facts, sourceFacts, 'A source fact was altered during PDF formatting');
  assert.equal(checks.subtitleCount, 33);
  assert.equal(checks.closedDetails, 0);
  assert.equal(checks.projects.length, 4);
  assert.ok(!checks.text.includes('—'), 'Unexpected em dash in portfolio body');
  await fs.mkdir(path.dirname(output), { recursive: true });
  console.log('Writing PDF');
  await page.pdf({
    path: output, format: 'A4', preferCSSPageSize: true, printBackground: true,
    tagged: true, outline: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font-family:Arial,sans-serif;font-size:8px;color:#68716e;padding:0 17mm;display:flex;justify-content:space-between"><span>rvnnt.dev/portfolio</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  });
  await fs.writeFile(metadata, JSON.stringify({ ...checks, sourceFacts, requests, output }, null, 2));
  console.log(JSON.stringify({ output, subtitles: checks.subtitleCount, projects: checks.projects,
    facts: checks.facts.length, bytes: (await fs.stat(output)).size }, null, 2));
} finally {
  clearTimeout(deadline);
  await browser.close();
}
