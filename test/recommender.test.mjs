// Testy silnika dopasowania. Uruchom: `node test/recommender.test.mjs`
import { recommend, scoreModel, unmetMessage, DEFAULT_CONFIG } from '../src/recommender.js';
import { MODELS } from '../src/models.js';

let passed = 0;
let failed = 0;
const fails = [];

function check(name, cond, extra = '') {
  if (cond) { passed++; }
  else { failed++; fails.push(`${name} ${extra}`.trim()); }
  const mark = cond ? '✓' : '✗';
  console.log(`  ${mark} ${name}${cond ? '' : `  <-- ${extra}`}`);
}

function topN(res, n = 3) {
  return res.ranking.slice(0, n).map((r) => `${r.model.name} ${r.percent}%`).join(' | ');
}

const byId = Object.fromEntries(MODELS.map((m) => [m.id, m]));

// --- 0. Sanity: wagi sumują się do 1 -------------------------------------
console.log('\n# Konfiguracja');
const wsum = Object.values(DEFAULT_CONFIG.weights).reduce((a, b) => a + b, 0);
check('wagi sumują się do 1.0', Math.abs(wsum - 1) < 1e-9, `suma = ${wsum}`);
check('katalog ma >= 25 modeli', MODELS.length >= 25, `jest ${MODELS.length}`);

// --- 1. Przykład: BMW X7 --------------------------------------------------
// Długie trasy / rodzinny -> komfort, przestrzeń, prestiż -> 5+ pasażerów -> SUV -> spalinówka
console.log('\n# Przykład 1: profil BMW X7 (5+ pasażerów)');
{
  const res = recommend({
    usage: 'family',
    priorities: ['comfort', 'space', 'prestige'],
    passengers: 'p5plus',
    body: 'suv',
    powertrain: 'combustion',
  });
  console.log('  TOP3:', topN(res));
  check('zwycięzcą jest BMW X7', res.best.model.id === 'x7', `jest ${res.best.model.name}`);
  check('X7 bez niespełnionych wymogów', res.best.unmet.length === 0, JSON.stringify(res.best.unmet));
}

// --- 2. Przykład: BMW Serii 1 --------------------------------------------
// Miasto -> niskie koszty, technologia, bezpieczeństwo -> 1 pasażer -> brak preferencji -> spalinówka
console.log('\n# Przykład 2: profil BMW Serii 1 (miasto, niskie koszty)');
{
  const res = recommend({
    usage: 'city',
    priorities: ['low_cost', 'technology', 'safety'],
    passengers: 'p1',
    body: 'any',
    powertrain: 'combustion',
  });
  console.log('  TOP3:', topN(res));
  const top3 = res.ranking.slice(0, 3).map((r) => r.model.id);
  check('BMW Serii 1 w TOP3', top3.includes('seria1'), top3.join(','));
  check('zwycięzca to kompakt/miasto (nie M ani duży SUV)',
    ['seria1', 'x1', 'ix1', 'seria2at'].includes(res.best.model.id), `jest ${res.best.model.name}`);
}

// --- 3. Twardy wymóg: M4 + 4 pasażerów -----------------------------------
// Profil "sportowy" (osiągi/design/technologia, coupe, spalinówka, przyjemność),
// ale 4 pasażerów -> M4 (4 miejsca) nie spełnia wymogu liczby pasażerów.
console.log('\n# Przykład 3: twardy wymóg liczby pasażerów (coupe M + 4 pasażerów)');
{
  const sporty = {
    usage: 'fun',
    priorities: ['performance', 'design', 'technology'],
    body: 'coupe',
    powertrain: 'combustion',
  };
  const m4 = scoreModel(byId.m4, { ...sporty, passengers: 'p4' }, DEFAULT_CONFIG);
  console.log(`  M4 @ 4 pasażerów -> ${m4.percent}%  unmet=${JSON.stringify(m4.unmet.map(u=>u.requirement))}`);
  check('M4 ma niespełniony wymóg liczby pasażerów',
    m4.unmet.some((u) => u.key === 'passengers'));
  check('komunikat = "Niespełnione wymogi: liczba pasażerów"',
    unmetMessage(m4) === 'Niespełnione wymogi: liczba pasażerów', unmetMessage(m4));
  check('M4 nadal ma wysokie dopasowanie (>= 80%)', m4.percent >= 80, `${m4.percent}%`);
  check('idealny profil M4 daje ~86%', m4.percent === 86, `${m4.percent}%`);

  // Ten sam profil, ale 2-3 pasażerów -> M4 (4 miejsca) spełnia wymóg.
  const m4ok = scoreModel(byId.m4, { ...sporty, passengers: 'p2_3' }, DEFAULT_CONFIG);
  check('M4 @ 2-3 pasażerów bez niespełnionych wymogów', m4ok.unmet.length === 0);
  check('M4 @ 2-3 pasażerów ma wyższy wynik niż @ 4', m4ok.percent > m4.percent, `${m4ok.percent} vs ${m4.percent}`);

  // Wśród alternatyw powinien pojawić się model spełniający wymóg pasażerów.
  const res = recommend({ ...sporty, passengers: 'p4' });
  const compliantAlt = res.alternatives.some((r) => r.unmet.length === 0);
  console.log('  Główny:', `${res.best.model.name} ${res.best.percent}%`,
    '| Alternatywy:', res.alternatives.map((r) => `${r.model.name} ${r.percent}%`).join(', '));
  check('wśród alternatyw jest model spełniający wszystkie wymogi', compliantAlt);
}

// --- 4. Napęd elektryczny vs model spalinowy -----------------------------
console.log('\n# Przykład 4: twardy wymóg napędu (elektryk, ale profil M3)');
{
  const m3 = scoreModel(byId.m3, {
    usage: 'fun', priorities: ['performance', 'design', 'technology'],
    passengers: 'p2_3', body: 'sedan', powertrain: 'electric',
  }, DEFAULT_CONFIG);
  check('M3 (spalinowy) z wymogiem elektryka ma adnotację o napędzie',
    m3.unmet.some((u) => u.key === 'powertrain'), JSON.stringify(m3.unmet));

  // Profil elektryczny premium -> i-model powinien wygrać.
  const res = recommend({
    usage: 'business', priorities: ['technology', 'comfort', 'prestige'],
    passengers: 'p2_3', body: 'sedan', powertrain: 'electric',
  });
  console.log('  TOP3:', topN(res));
  check('zwycięzca jest elektryczny', res.best.model.powertrains.includes('electric'), res.best.model.name);
}

// --- 5. Cabrio / roadster + dużo pasażerów -------------------------------
console.log('\n# Przykład 5: cabrio, przyjemność z jazdy, solo');
{
  const res = recommend({
    usage: 'fun', priorities: ['design', 'performance'],
    passengers: 'solo', body: 'cabrio', powertrain: 'combustion',
  });
  console.log('  TOP3:', topN(res));
  check('zwycięzca to cabrio/roadster',
    ['cabrio', 'roadster'].includes(res.best.model.body), res.best.model.name);
}

// --- 6. Determinizm i zakres procentów -----------------------------------
console.log('\n# Niezmienniki');
{
  const a = { usage: 'mixed', priorities: ['comfort'], passengers: 'p2_3', body: 'sedan', powertrain: 'hybrid' };
  const r1 = recommend(a), r2 = recommend(a);
  check('wynik jest deterministyczny', r1.best.model.id === r2.best.model.id && r1.best.percent === r2.best.percent);
  const allInRange = r1.ranking.every((r) => r.percent >= 35 && r.percent <= 97);
  check('wszystkie procenty w zakresie 35..97', allInRange);
  check('ranking posortowany malejąco po wyniku surowym',
    r1.ranking.every((r, i) => i === 0 || r1.ranking[i - 1].raw >= r.raw));
}

// --- Podsumowanie --------------------------------------------------------
console.log(`\n${failed === 0 ? '✅' : '❌'} Wynik: ${passed} OK, ${failed} błędów`);
if (failed > 0) {
  console.log('Niepowodzenia:\n - ' + fails.join('\n - '));
  process.exit(1);
}
