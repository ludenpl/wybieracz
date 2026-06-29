// Smoke test E2E demo (playwright-core + preinstalowany Chromium).
// Przechodzi cały test i robi zrzut ekranu wyniku.
import { chromium } from 'playwright-core';

const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'http://localhost:8000/index.html';

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
const errors = [];
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const url = (m.location() && m.location().url) || '';
  if (/favicon\.ico/.test(url)) return; // przeglądarka sama prosi o favicon
  errors.push(m.text() + (url ? ` (${url})` : ''));
});
page.on('pageerror', (e) => errors.push(String(e)));
page.on('requestfailed', (r) => { if (!/favicon\.ico/.test(r.url())) errors.push('reqfail ' + r.url()); });

await page.goto(URL, { waitUntil: 'networkidle' });

// Intro -> start
await page.click('#start');

// Q1: Dla przyjemności z jazdy
await page.click('.opt[data-id="fun"]');
// Q2 (multi, max 3): osiągi + design + technologia, potem Dalej
await page.click('.opt[data-id="performance"]');
await page.click('.opt[data-id="design"]');
await page.click('.opt[data-id="technology"]');
await page.click('#next');
// Q3: 4 pasażerów (twardy wymóg dla coupe!)
await page.click('.opt[data-id="p4"]');
// Q4: Gran Coupé / Coupé
await page.click('.opt[data-id="coupe"]');
// Q5: spalinówka
await page.click('.opt[data-id="combustion"]');

// Czekamy na wynik (po ekranie ładowania)
await page.waitForSelector('.match-name', { timeout: 8000 });
const name = (await page.textContent('.match-name')).trim();
const pct = (await page.textContent('.match-pct')).trim();
const unmet = await page.$('.unmet');
const unmetTxt = unmet ? (await page.textContent('.unmet')).trim() : '(brak)';
const alts = await page.$$eval('.alt .n', (els) => els.map((e) => e.textContent.trim()));

console.log('WYNIK GŁÓWNY :', name, '—', pct);
console.log('ADNOTACJA    :', unmetTxt);
console.log('ALTERNATYWY  :', alts.join(' | '));

// Rozwiń pełną listę i zrzut ekranu
await page.click('#toggleAll');
await page.screenshot({ path: 'test/wynik-demo.png', fullPage: true });

if (errors.length) { console.log('\n❌ Błędy w konsoli/strony:\n', errors.join('\n')); process.exit(1); }
console.log('\n✅ Demo przeszło cały przepływ bez błędów. Zrzut: test/wynik-demo.png');
await browser.close();
