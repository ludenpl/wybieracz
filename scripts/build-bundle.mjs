// Składa KOMPLETNY algorytm wybieracza BMW w JEDNYM pliku-module: bmw-wybieracz.js
// (pytania + katalog 33 modeli z kluczem odpowiedzi + silnik scoringu).
// Plik powstaje z src/*, więc nie rozjeżdża się z resztą projektu.
//
// Uruchom: node scripts/build-bundle.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

// Usuń tylko WEWNĘTRZNE importy (między plikami src/) — wszystko ląduje w jednym
// module, więc te symbole są już dostępne. Eksporty zostawiamy.
const stripInternalImports = (js) =>
  js.replace(/^\s*import\s+\{[^}]*\}\s+from\s+'\.\/(?:models|questions)\.js';\s*$/gm, '').trim();

const questions = read('src/questions.js').trim();
const models = read('src/models.js').trim();
const recommender = stripInternalImports(read('src/recommender.js'));

const header = `// ===========================================================================
// bmw-wybieracz.js — KOMPLETNY algorytm "Jakie BMW pasuje do Ciebie?"
// ===========================================================================
// Wszystko w jednym pliku, bez zależności. Gotowe do wrzucenia do projektu.
// Działa w przeglądarce (type="module") i w Node 18+.
//
// Plik GENEROWANY z src/*.js przez scripts/build-bundle.mjs — nie edytuj ręcznie
// (zmiany rób w src/ i przebuduj: npm run build).
//
// ---------------------------------------------------------------------------
// UŻYCIE
// ---------------------------------------------------------------------------
//   import { recommend, unmetMessage, QUESTIONS, MODELS } from './bmw-wybieracz.js';
//
//   const wynik = recommend({
//     usage:      'fun',                                   // Q1: jeden id
//     priorities: ['performance', 'design', 'technology'], // Q2: do 3 id
//     passengers: 'p4',                                    // Q3: jeden id
//     body:       'coupe',                                 // Q4: jeden id (lub 'any')
//     powertrain: 'combustion',                            // Q5: jeden id
//   });
//
//   wynik.best         -> { model, percent, components, unmet, ... }   najlepszy
//   wynik.alternatives -> [ {…}, {…} ]                                 kolejne 2
//   wynik.ranking      -> pełna, posortowana lista
//   unmetMessage(wynik.best) -> "Niespełnione wymogi: liczba pasażerów" | null
//
// Dozwolone id odpowiedzi (Q1..Q5) znajdziesz w QUESTIONS poniżej.
// Katalog modeli i ich "klucz odpowiedzi" to MODELS — to TO edytuje dealer.
// Parametry scoringu (wagi, sufit %, polityki) to DEFAULT_CONFIG.
// ===========================================================================

`;

const out =
  header +
  '// ========================= PYTANIA (Q1..Q5) =========================\n' +
  questions + '\n\n' +
  '// ============== KATALOG MODELI BMW = KLUCZ ODPOWIEDZI ==============\n' +
  models + '\n\n' +
  '// ===================== SILNIK DOPASOWANIA =====================\n' +
  recommender + '\n';

writeFileSync(new URL('bmw-wybieracz.js', root), out);
console.log(`Zapisano bmw-wybieracz.js (${(out.length / 1024).toFixed(1)} kB).`);
