// ---------------------------------------------------------------------------
// Silnik dopasowania BMW
// ---------------------------------------------------------------------------
// Przyjmuje odpowiedzi z testu i zwraca ranking modeli z procentem dopasowania
// oraz listą niespełnionych "twardych" wymogów (np. liczba pasażerów).
//
// Wynik dla modelu to ważona suma 5 składowych (każda 0..1):
//   usage       (Q1)  - jak model pasuje do sposobu użytkowania
//   priorities  (Q2)  - ile z wybranych priorytetów spełnia model
//   body        (Q4)  - zgodność typu nadwozia (z macierzą podobieństwa)
//   powertrain  (Q5)  - zgodność rodzaju napędu
//   seats       (Q3)  - czy model pomieści wymaganą liczbę osób (twardy wymóg)
//
// "Twarde wymogi" (liczba pasażerów, rodzaj napędu) nie eliminują modelu —
// zerują/obniżają swoją składową i dodają adnotację. Dzięki temu model, który
// poza jednym wymogiem pasuje idealnie, nadal pojawia się wysoko (np. M4 z
// dopasowaniem 86% i notką "Niespełnione wymogi: liczba pasażerów").
// ---------------------------------------------------------------------------

import { MODELS } from './models.js';
import { LABELS } from './questions.js';

export const DEFAULT_CONFIG = {
  // Wagi składowych — muszą sumować się do 1.0.
  // Waga `seats` to jednocześnie "kara" za niespełniony wymóg liczby miejsc:
  // model idealny poza miejscami dostaje ~ (1 - waga_seats) -> domyślnie 86%.
  weights: {
    usage: 0.22,
    priorities: 0.28,
    body: 0.18,
    powertrain: 0.18,
    seats: 0.14,
  },
  // Mapowanie wyniku surowego (0..1) na wyświetlany procent.
  display: { scale: 100, base: 0, floor: 35, ceil: 97 },
  // Które wymogi traktujemy jako "twarde" (generują adnotację).
  hardRequirements: { seats: true, powertrain: true },
  // Poniżej tego dopasowania napędu uznajemy je za niespełniony twardy wymóg.
  powertrainHardThreshold: 0.2,
  // Czy wśród alternatyw zagwarantować przynajmniej jeden model bez
  // niespełnionych wymogów (jeśli główny wynik ma adnotacje).
  ensureCompliantAlternative: true,
  // Polityka nagłówka przy niespełnionych wymogach:
  //   false -> model z najwyższym wynikiem trafia na czoło nawet z adnotacją
  //            (np. M4 86% + "Niespełnione wymogi: liczba pasażerów"). Model
  //            niezgodny prowadzi tylko gdy realnie dominuje (utrata wagi
  //            danego wymogu sprawia, że musi wyraźnie wygrać innymi punktami).
  //   true  -> modele spełniające wszystkie twarde wymogi zawsze stoją wyżej
  //            niż jakikolwiek model z niespełnionym wymogiem.
  prioritizeCompliant: false,
  // Ile alternatyw zwracać.
  alternativesCount: 2,
};

// Q3 -> minimalna liczba miejsc (pasażerowie + kierowca).
const SEATS_REQUIRED = { solo: 1, p1: 2, p2_3: 4, p4: 5, p5plus: 6 };

// Macierz podobieństwa nadwozi: BODY_SIM[odpowiedź użytkownika][nadwozie modelu].
// Pełna zgodność = 1.0; brakujące pary -> DEFAULT_BODY_SIM.
const DEFAULT_BODY_SIM = 0.15;
const BODY_SIM = {
  suv:     { suv: 1.0, mpv: 0.6, touring: 0.45, hatch: 0.3, sedan: 0.25, coupe: 0.2, cabrio: 0.15, roadster: 0.1 },
  sedan:   { sedan: 1.0, touring: 0.6, coupe: 0.55, hatch: 0.5, mpv: 0.3, cabrio: 0.3, suv: 0.25, roadster: 0.2 },
  coupe:   { coupe: 1.0, cabrio: 0.75, roadster: 0.7, sedan: 0.55, hatch: 0.4, touring: 0.3, suv: 0.2, mpv: 0.1 },
  touring: { touring: 1.0, mpv: 0.6, sedan: 0.6, suv: 0.5, hatch: 0.5, coupe: 0.3, cabrio: 0.25, roadster: 0.15 },
  cabrio:  { cabrio: 1.0, roadster: 0.95, coupe: 0.75, sedan: 0.3, hatch: 0.2, touring: 0.2, suv: 0.15, mpv: 0.05 },
};

function bodyScore(answer, modelBody) {
  if (!answer || answer === 'any') return 1; // brak preferencji -> bez kary
  const row = BODY_SIM[answer];
  if (!row) return DEFAULT_BODY_SIM;
  return row[modelBody] ?? DEFAULT_BODY_SIM;
}

function powertrainScore(want, have) {
  if (!want) return 1;
  if (have.includes(want)) return 1;
  if (want === 'hybrid') {
    if (have.includes('combustion')) return 0.6; // ma silnik spalinowy
    if (have.includes('electric')) return 0.5;   // jeździ na prądzie
    return 0.3;
  }
  if (want === 'combustion') {
    if (have.includes('hybrid')) return 0.7;   // PHEV ma realny silnik spalinowy
    if (have.includes('electric')) return 0.1; // czysty EV — wyraźny rozjazd
    return 0.2;
  }
  if (want === 'electric') {
    if (have.includes('hybrid')) return 0.55;   // potrafi jeździć elektrycznie
    if (have.includes('combustion')) return 0.1;
    return 0.2;
  }
  return 0.2;
}

function priorityScore(picks, modelPriorities) {
  if (!picks || picks.length === 0) return 0.6; // brak wskazań -> neutralnie
  const hits = picks.filter((p) => modelPriorities.includes(p)).length;
  return hits / picks.length;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Oblicza dopasowanie pojedynczego modelu do odpowiedzi.
 * @returns {{ model, raw, percent, components, unmet, exactBody }}
 */
export function scoreModel(model, answers, config = DEFAULT_CONFIG) {
  const w = config.weights;
  const unmet = [];

  const cUsage = model.usage[answers.usage] ?? 0;
  const cPriorities = priorityScore(answers.priorities, model.priorities);
  const cBody = bodyScore(answers.body, model.body);
  const cPowertrain = powertrainScore(answers.powertrain, model.powertrains);

  // Miejsca — twardy wymóg.
  const required = SEATS_REQUIRED[answers.passengers] ?? 1;
  let cSeats = 1;
  if (model.seats < required) {
    cSeats = 0;
    if (config.hardRequirements.seats) {
      unmet.push({ key: 'passengers', label: LABELS.passengers[answers.passengers] || 'liczba pasażerów', requirement: 'liczba pasażerów' });
    }
  }

  // Napęd — twardy wymóg przy wyraźnym rozjeździe.
  if (config.hardRequirements.powertrain && cPowertrain <= config.powertrainHardThreshold) {
    unmet.push({ key: 'powertrain', label: LABELS.powertrain[answers.powertrain] || 'rodzaj napędu', requirement: 'rodzaj napędu' });
  }

  const components = {
    usage: cUsage,
    priorities: cPriorities,
    body: cBody,
    powertrain: cPowertrain,
    seats: cSeats,
  };

  const raw =
    w.usage * cUsage +
    w.priorities * cPriorities +
    w.body * cBody +
    w.powertrain * cPowertrain +
    w.seats * cSeats;

  const d = config.display;
  const percent = Math.round(clamp(raw * d.scale + d.base, d.floor, d.ceil));

  return {
    model,
    raw,
    percent,
    components,
    unmet,
    exactBody: answers.body && answers.body !== 'any' && model.body === answers.body,
  };
}

// Sortowanie: opcjonalnie modele zgodne przed niezgodnymi (prioritizeCompliant),
// potem wynik surowy, mniej niespełnionych wymogów, dokładna zgodność nadwozia
// i stabilnie po nazwie.
function makeComparator(config) {
  return function compareResults(a, b) {
    if (config.prioritizeCompliant) {
      const ac = a.unmet.length === 0 ? 0 : 1;
      const bc = b.unmet.length === 0 ? 0 : 1;
      if (ac !== bc) return ac - bc;
    }
    if (b.raw !== a.raw) return b.raw - a.raw;
    if (a.unmet.length !== b.unmet.length) return a.unmet.length - b.unmet.length;
    if (a.exactBody !== b.exactBody) return a.exactBody ? -1 : 1;
    return a.model.name.localeCompare(b.model.name, 'pl');
  };
}

/**
 * Główna funkcja — zwraca rekomendację dla zestawu odpowiedzi.
 *
 * @param {{usage?:string, priorities?:string[], passengers?:string, body?:string, powertrain?:string}} answers
 * @param {object} [options]
 * @param {Model[]} [options.models]
 * @param {object} [options.config]
 * @returns {{ best, alternatives, ranking }}
 */
export function recommend(answers, options = {}) {
  const models = options.models || MODELS;
  const config = { ...DEFAULT_CONFIG, ...(options.config || {}) };

  const ranking = models.map((m) => scoreModel(m, answers, config)).sort(makeComparator(config));

  const best = ranking[0] || null;
  let alternatives = ranking.slice(1, 1 + config.alternativesCount);

  // Jeśli główny wynik ma niespełnione wymogi, zadbaj o to, by wśród alternatyw
  // znalazł się najlepszy model spełniający wszystkie twarde wymogi.
  if (config.ensureCompliantAlternative && best && best.unmet.length > 0) {
    const hasCompliant = alternatives.some((r) => r.unmet.length === 0);
    if (!hasCompliant) {
      const compliant = ranking.slice(1).find((r) => r.unmet.length === 0);
      if (compliant && config.alternativesCount > 0) {
        alternatives = [compliant, ...alternatives].slice(0, config.alternativesCount);
      }
    }
  }

  return { best, alternatives, ranking };
}

/**
 * Buduje gotowy do wyświetlenia komunikat o niespełnionych wymogach, np.
 * "Niespełnione wymogi: liczba pasażerów".
 * @returns {string|null}
 */
export function unmetMessage(result) {
  if (!result || result.unmet.length === 0) return null;
  const items = [...new Set(result.unmet.map((u) => u.requirement))];
  return `Niespełnione wymogi: ${items.join(', ')}`;
}
