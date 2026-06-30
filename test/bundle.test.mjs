// Dowód, że gotowy plik bmw-wybieracz.js daje IDENTYCZNE wyniki co src/.
// Uruchom: node test/bundle.test.mjs
import { recommend as srcRecommend } from '../src/recommender.js';
import { recommend as bundleRecommend, MODELS, QUESTIONS } from '../bmw-wybieracz.js';

const USAGE = ['city', 'long', 'mixed', 'family', 'fun', 'business'];
const PASSENGERS = ['solo', 'p1', 'p2_3', 'p4', 'p5plus'];
const BODY = ['suv', 'sedan', 'coupe', 'touring', 'cabrio', 'any'];
const POWER = ['electric', 'combustion', 'hybrid'];
const PRIORITY_SETS = [
  [], ['comfort'], ['performance'], ['low_cost'],
  ['performance', 'design', 'technology'], ['comfort', 'space', 'prestige'],
  ['low_cost', 'technology', 'safety'], ['design', 'prestige'], ['technology', 'comfort', 'safety'],
];

console.log(`Plik zawiera: ${QUESTIONS.length} pytań, ${MODELS.length} modeli.`);

let combos = 0, mismatches = 0;
for (const usage of USAGE)
  for (const passengers of PASSENGERS)
    for (const body of BODY)
      for (const powertrain of POWER)
        for (const priorities of PRIORITY_SETS) {
          combos++;
          const answers = { usage, priorities, passengers, body, powertrain };
          const a = srcRecommend(answers);
          const b = bundleRecommend(answers);
          const am = a.ranking.map((r) => r.model.id + ':' + r.percent).join('|');
          const bm = b.ranking.map((r) => r.model.id + ':' + r.percent).join('|');
          if (am !== bm) mismatches++;
        }

console.log(`Sprawdzono kombinacji: ${combos}, rozbieżności: ${mismatches}`);
if (mismatches > 0) { console.log('❌ Bundle różni się od src.'); process.exit(1); }
console.log('✅ bmw-wybieracz.js jest identyczny z src/ na całej siatce.');
