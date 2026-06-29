// Generuje data/answer-key.md z katalogu modeli — czytelny "klucz odpowiedzi"
// do przeglądu przez dealera. Uruchom: `node scripts/gen-answer-key.mjs`
import { writeFileSync } from 'node:fs';
import { MODELS } from '../src/models.js';
import { QUESTIONS, LABELS } from '../src/questions.js';

const PT = { combustion: 'spalinowy', hybrid: 'hybryda PHEV', electric: 'elektryczny' };
const BODY = { suv: 'SUV', sedan: 'Sedan', coupe: 'Coupé/Gran Coupé', touring: 'Touring',
  cabrio: 'Cabrio', hatch: 'Hatchback', mpv: 'MPV', roadster: 'Roadster' };

// Etykiety priorytetów i sposobów użytkowania po polsku.
const PRIO = LABELS.priorities;
const USAGE = LABELS.usage;

// Dla każdego modelu: 2-3 najlepiej pasujące sposoby użytkowania (Q1).
function topUsage(m) {
  return Object.entries(m.usage)
    .sort((a, b) => b[1] - a[1])
    .filter(([, v]) => v >= 0.8)
    .map(([k]) => USAGE[k])
    .join(', ') || Object.entries(m.usage).sort((a, b) => b[1] - a[1]).slice(0, 1).map(([k]) => USAGE[k]).join(', ');
}

let md = `# Klucz odpowiedzi — Wybieracz BMW

> Plik generowany automatycznie z \`src/models.js\` przez \`node scripts/gen-answer-key.mjs\`.
> Nie edytuj ręcznie — zmiany nanoś w \`src/models.js\` i wygeneruj ponownie.

Katalog: **${MODELS.length} modeli** (oferta BMW Polska, połowa 2026).

## Jak czytać

- **Nadwozie / Miejsca / Napęd** — twarde cechy modelu. *Miejsca* i *Napęd* mogą wygenerować
  adnotację „Niespełnione wymogi", jeśli odpowiedzi użytkownika ich nie spełniają.
- **Sposób użytkowania (Q1)** — sytuacje, w których model pasuje najlepiej.
- **Priorytety (Q2)** — które z 8 wartości model realnie spełnia (im więcej trafień z wyborem
  użytkownika, tym wyższe dopasowanie).

| Model | Nadwozie | Miejsca | Napęd | Sposób użytkowania (Q1) | Priorytety (Q2) |
|---|---|---|---|---|---|
`;

for (const m of MODELS) {
  const pt = m.powertrains.map((p) => PT[p]).join(' / ');
  const prio = m.priorities.map((p) => PRIO[p]).join(', ');
  md += `| **${m.name}** | ${BODY[m.body]} | ${m.seats} | ${pt} | ${topUsage(m)} | ${prio} |\n`;
}

md += `
## Mapowanie liczby pasażerów na wymagane miejsca

| Odpowiedź (Q3) | Minimum miejsc | Eliminuje (przykłady) |
|---|---|---|
| Tylko ja | 1 | — |
| 1 pasażer | 2 | — |
| 2-3 pasażerów | 4 | Z4 (2 miejsca) |
| 4 pasażerów | 5 | Z4 oraz coupé 4-miejscowe: M2, M4, Serii 2/4 Coupé |
| 5+ pasażerów | 6 | wszystko poza BMW X7 (7 miejsc) |

## Mapowanie napędu (Q5)

| Wybór | Pełne dopasowanie | Częściowe | Adnotacja „rodzaj napędu" |
|---|---|---|---|
| Cisza elektryka | modele \`i*\` (elektryczne) | hybryda PHEV (0.55) | model wyłącznie spalinowy |
| Charakter spalinówki | modele spalinowe | PHEV (0.70) | model wyłącznie elektryczny |
| Kompromis hybrydy | modele z PHEV | spalinowy (0.60) / elektryczny (0.50) | — |
`;

writeFileSync(new URL('../data/answer-key.md', import.meta.url), md);
console.log(`Zapisano data/answer-key.md (${MODELS.length} modeli).`);
