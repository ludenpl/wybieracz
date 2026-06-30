// Dowód, że OGÓLNY silnik (engine/match-engine.js + engine/bmw.example.js)
// daje IDENTYCZNE wyniki co oryginalny src/recommender.js — na siatce setek
// kombinacji odpowiedzi. Uruchom: node test/parity.test.mjs
import { recommend as origRecommend } from '../src/recommender.js';
import { recommendBMW } from '../engine/bmw.example.js';

const USAGE = ['city', 'long', 'mixed', 'family', 'fun', 'business'];
const PASSENGERS = ['solo', 'p1', 'p2_3', 'p4', 'p5plus'];
const BODY = ['suv', 'sedan', 'coupe', 'touring', 'cabrio', 'any'];
const POWER = ['electric', 'combustion', 'hybrid'];
// Reprezentatywne zestawy priorytetów (Q2: 0..3 z 8).
const PRIORITY_SETS = [
  [],
  ['comfort'],
  ['performance'],
  ['low_cost'],
  ['performance', 'design', 'technology'],
  ['comfort', 'space', 'prestige'],
  ['low_cost', 'technology', 'safety'],
  ['design', 'prestige'],
  ['technology', 'comfort', 'safety'],
];

let combos = 0, mismatches = 0;
const examples = [];

for (const usage of USAGE)
  for (const passengers of PASSENGERS)
    for (const body of BODY)
      for (const powertrain of POWER)
        for (const priorities of PRIORITY_SETS) {
          // Próbkujemy, by nie liczyć 6*5*6*3*9 = 4860 razy całego katalogu w pełni
          // — ale i tak bierzemy gęstą próbkę. Zostaw pełną siatkę dla pewności:
          combos++;
          const answers = { usage, priorities, passengers, body, powertrain };
          const o = origRecommend(answers);
          const g = recommendBMW(answers);

          // a) procenty per model identyczne
          const op = Object.fromEntries(o.ranking.map((r) => [r.model.id, r.percent]));
          const gp = Object.fromEntries(g.ranking.map((r) => [r.item.id, r.percent]));
          let pctOk = true;
          for (const id of Object.keys(op)) if (op[id] !== gp[id]) { pctOk = false; break; }

          // b) zwycięzca identyczny
          const bestOk = o.best.model.id === g.best.item.id;

          if (!pctOk || !bestOk) {
            mismatches++;
            if (examples.length < 5) {
              examples.push({ answers, orig: o.best.model.id + ' ' + o.best.percent + '%',
                gen: g.best.item.id + ' ' + g.best.percent + '%', pctOk, bestOk });
            }
          }
        }

console.log(`Sprawdzono kombinacji: ${combos}`);
console.log(`Rozbieżności: ${mismatches}`);
if (mismatches > 0) {
  console.log('Przykłady rozbieżności:');
  for (const e of examples) console.log('  ', JSON.stringify(e));
  console.log('\n❌ Silnik ogólny NIE jest zgodny z oryginałem.');
  process.exit(1);
}
console.log('\n✅ Silnik ogólny daje identyczne wyniki co oryginał na całej siatce.');
