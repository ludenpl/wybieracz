// ===========================================================================
// PRZYKŁAD: wybieracz BMW zbudowany na ogólnym silniku (match-engine.js)
// ===========================================================================
// Pokazuje, jak z generycznych kryteriów złożyć konkretny wybieracz. To jest
// dokładnie ta warstwa, którą pisze osoba adaptująca algorytm do SWOICH aut:
//   - dobiera kryteria i ich wagi,
//   - podaje tabele specyficzne dla domeny (miejsca, podobieństwo nadwozi, napęd),
//   - wskazuje, w których polach produktu siedzą dane (attr).
//
// Katalog (MODELS) trzymamy osobno — silnik go nie zna, dostaje go w recommend().
// ===========================================================================

import {
  createRecommender, affinity, overlap, similarity, capacity, gradedSet, unmetMessage,
} from './match-engine.js';
import { MODELS } from '../src/models.js';

export { unmetMessage };

// --- Tabele specyficzne dla domeny (to "wiedza" o autach, nie o algorytmie) ---

// Q3: odpowiedź -> minimalna wymagana liczba miejsc (pasażerowie + kierowca).
const SEATS_REQUIRED = { solo: 1, p1: 2, p2_3: 4, p4: 5, p5plus: 6 };

// Q4: macierz podobieństwa nadwozi [odpowiedź użytkownika][nadwozie modelu].
const BODY_SIM = {
  suv:     { suv: 1.0, mpv: 0.6, touring: 0.45, hatch: 0.3, sedan: 0.25, coupe: 0.2, cabrio: 0.15, roadster: 0.1 },
  sedan:   { sedan: 1.0, touring: 0.6, coupe: 0.55, hatch: 0.5, mpv: 0.3, cabrio: 0.3, suv: 0.25, roadster: 0.2 },
  coupe:   { coupe: 1.0, cabrio: 0.75, roadster: 0.7, sedan: 0.55, hatch: 0.4, touring: 0.3, suv: 0.2, mpv: 0.1 },
  touring: { touring: 1.0, mpv: 0.6, sedan: 0.6, suv: 0.5, hatch: 0.5, coupe: 0.3, cabrio: 0.25, roadster: 0.15 },
  cabrio:  { cabrio: 1.0, roadster: 0.95, coupe: 0.75, sedan: 0.3, hatch: 0.2, touring: 0.2, suv: 0.15, mpv: 0.05 },
};

// Q5: ocena dopasowania napędu (want = wybór użytkownika, have = napędy modelu).
function powertrainTable(want, have) {
  if (!want) return 1;
  if (have.includes(want)) return 1;
  if (want === 'hybrid') {
    if (have.includes('combustion')) return 0.6;
    if (have.includes('electric')) return 0.5;
    return 0.3;
  }
  if (want === 'combustion') {
    if (have.includes('hybrid')) return 0.7;
    if (have.includes('electric')) return 0.1;
    return 0.2;
  }
  if (want === 'electric') {
    if (have.includes('hybrid')) return 0.55;
    if (have.includes('combustion')) return 0.1;
    return 0.2;
  }
  return 0.2;
}

// --- Złożenie wybieracza z kryteriów (wagi sumują się do 1.0) ---------------

export const bmwRecommender = createRecommender({
  criteria: [
    overlap   ({ id: 'priorities', weight: 0.28, attr: 'priorities', emptyScore: 0.6 }), // Q2
    affinity  ({ id: 'usage',      weight: 0.22, attr: 'usage', missing: 0 }),            // Q1
    similarity({ id: 'body',       weight: 0.18, attr: 'body', matrix: BODY_SIM, anyValue: 'any', fallback: 0.15 }), // Q4
    gradedSet ({ id: 'powertrain', weight: 0.18, attr: 'powertrains', table: powertrainTable, requirement: 'rodzaj napędu', hardBelow: 0.2 }), // Q5
    capacity  ({ id: 'passengers', weight: 0.14, attr: 'seats', required: (a) => SEATS_REQUIRED[a] ?? 1, requirement: 'liczba pasażerów' }),   // Q3
  ],
  // Remisy: najpierw dokładna zgodność nadwozia, potem alfabetycznie (pl).
  tiebreak: (a, b) => {
    if (a.exact.body !== b.exact.body) return a.exact.body ? -1 : 1;
    return a.item.name.localeCompare(b.item.name, 'pl');
  },
  prioritizeCompliant: false,
});

/** Wygodny skrót: zwraca rekomendację dla zestawu odpowiedzi. */
export function recommendBMW(answers) {
  return bmwRecommender.recommend(answers, MODELS);
}
