// Buduje JEDEN samowystarczalny plik HTML (wybieracz-standalone.html) z tych
// samych źródeł co silnik i demo. Wkleja moduły do jednego <script> bez
// importów, więc plik działa po dwukliku (file://) — bez Node, serwera i gita.
//
// Uruchom: node scripts/build-standalone.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

// 1) Wczytaj źródła silnika i HTML demo.
const questions = read('src/questions.js');
const models = read('src/models.js');
const recommender = read('src/recommender.js');
const html = read('index.html');

// 2) Usuń składnię modułów ES (import/export), zachowując kod.
function deModule(js) {
  return js
    .replace(/^\s*import\s.*$/gm, '')          // usuń linie importów
    .replace(/\bexport\s+const\b/g, 'const')
    .replace(/\bexport\s+function\b/g, 'function')
    .replace(/\bexport\s+default\s+/g, '')
    .replace(/\bexport\s*\{[^}]*\};?/g, '')
    .trim();
}

// 3) Wyciągnij CSS i logikę UI z index.html.
const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1].trim();
const ui = deModule((html.match(/<script type="module">([\s\S]*?)<\/script>/) || [, ''])[1]);

// 4) Złóż jeden plik. Kolejność: pytania -> modele -> silnik -> UI.
const out = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Jakie BMW pasuje do Ciebie? — wybieracz (wersja samodzielna)</title>
  <!--
    WERSJA SAMODZIELNA — wszystko w jednym pliku.
    Jak uruchomić: zapisz ten plik na dysku i kliknij go dwukrotnie.
    Otworzy się w przeglądarce. Nie wymaga internetu, gita, Node ani serwera.
    Plik generowany przez scripts/build-standalone.mjs — nie edytuj ręcznie.
  -->
  <style>
${css}
  </style>
</head>
<body>
  <div class="stage" id="stage"></div>
  <script>
// ====================== src/questions.js ======================
${deModule(questions)}

// ====================== src/models.js ======================
${deModule(models)}

// ====================== src/recommender.js ======================
${deModule(recommender)}

// ====================== UI (index.html) ======================
${ui}
  </script>
</body>
</html>
`;

writeFileSync(new URL('wybieracz-standalone.html', root), out);
console.log(`Zapisano wybieracz-standalone.html (${(out.length / 1024).toFixed(1)} kB).`);
