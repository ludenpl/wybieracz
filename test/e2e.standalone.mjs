// Sprawdza, że wersja samodzielna DZIAŁA po dwukliku (protokół file://),
// czyli bez serwera HTTP, bez Node po stronie użytkownika, bez gita.
import { chromium } from 'playwright-core';

const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FILE = 'file://' + new URL('../wybieracz-standalone.html', import.meta.url).pathname;

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const url = (m.location() && m.location().url) || '';
  if (/favicon\.ico/.test(url)) return;
  errors.push(m.text());
});

console.log('Otwieram:', FILE);
await page.goto(FILE, { waitUntil: 'load' });

// Pełny przepływ: profil "sportowy" + 4 pasażerów (twardy wymóg).
await page.click('#start');
await page.click('.opt[data-id="fun"]');
await page.click('.opt[data-id="performance"]');
await page.click('.opt[data-id="design"]');
await page.click('.opt[data-id="technology"]');
await page.click('#next');
await page.click('.opt[data-id="p4"]');
await page.click('.opt[data-id="coupe"]');
await page.click('.opt[data-id="combustion"]');

await page.waitForSelector('.match-name', { timeout: 8000 });
const name = (await page.textContent('.match-name')).trim();
const pct = (await page.textContent('.match-pct')).trim();
console.log('WYNIK:', name, '—', pct);

// Sprawdź, że adnotacja twardego wymogu w ogóle pojawia się w rankingu (M4 itp.).
await page.click('#toggleAll');
const hasUnmet = await page.$$eval('td', (tds) =>
  tds.some((t) => /Niespełnione wymogi/.test(t.textContent)));
console.log('Adnotacje "Niespełnione wymogi" w rankingu:', hasUnmet ? 'tak' : 'nie');

if (errors.length) { console.log('\n❌ Błędy:', errors.join('\n')); process.exit(1); }
if (!name || !hasUnmet) { console.log('\n❌ Brak wyniku lub adnotacji'); process.exit(1); }
console.log('\n✅ Wersja samodzielna działa z file:// (bez serwera).');
await browser.close();
