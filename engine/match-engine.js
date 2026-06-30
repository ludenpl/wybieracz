// ===========================================================================
// Ogólny silnik dopasowania (quiz -> ranking produktów)
// ===========================================================================
// Niezależny od marki/branży. NIE wie nic o BMW, autach ani pytaniach — całą
// wiedzę dostarczasz w konfiguracji (kryteria + katalog produktów).
//
// Idea: wynik produktu to ważona suma kilku KRYTERIÓW (każde 0..1). Część
// kryteriów to "twarde wymogi" — nie eliminują produktu, tylko zerują/obniżają
// swoją składową i dopinają adnotację (np. "liczba pasażerów"). Dzięki temu
// produkt, który poza jednym wymogiem pasuje idealnie, nadal jest wysoko.
//
// Użycie:
//   import { createRecommender, affinity, overlap, similarity, capacity, gradedSet }
//     from './match-engine.js';
//   const rec = createRecommender({ criteria: [...], tiebreak });
//   const { best, alternatives, ranking } = rec.recommend(answers, catalog);
//
// Ten plik jest BAZĄ do zbudowania własnego wybieracza — patrz ALGORYTM.md
// oraz przykład engine/bmw.example.js.
// ===========================================================================

export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ---------------------------------------------------------------------------
// FABRYKI KRYTERIÓW
// Każda zwraca obiekt { id, weight, score, hard?, exact? } gdzie:
//   score(answer, item) -> liczba 0..1
//   hard(answer, item)  -> null | { requirement: string }   (opcjonalnie)
//   exact(answer, item) -> boolean   (opcjonalnie, do rozstrzygania remisów)
// ---------------------------------------------------------------------------

// 1) AFFINITY — pojedynczy wybór; produkt ma mapę odpowiedź -> dopasowanie.
//    Przykład: "sposób użytkowania" (miasto/trasa/rodzina...).
//    item[attr] = { city: 1.0, long: 0.3, ... }
export function affinity({ id, weight, attr, missing = 0 }) {
  return {
    id, weight,
    score: (ans, item) => {
      const map = item[attr];
      return map && map[ans] != null ? map[ans] : missing;
    },
  };
}

// 2) OVERLAP — wybór wielokrotny; udział wskazań użytkownika spełnionych przez
//    produkt. Przykład: "co najważniejsze" (max 3 z 8 wartości).
//    item[attr] = ['performance', 'design', ...]
export function overlap({ id, weight, attr, emptyScore = 0.6 }) {
  return {
    id, weight,
    score: (picks, item) => {
      if (!picks || picks.length === 0) return emptyScore;
      const set = item[attr] || [];
      return picks.filter((p) => set.includes(p)).length / picks.length;
    },
  };
}

// 3) SIMILARITY — pojedynczy wybór kategorii z MACIERZĄ podobieństwa, więc
//    "prawie pasuje" daje wynik częściowy zamiast 0. Wartość `anyValue`
//    (np. "brak preferencji") nie karze żadnego produktu.
//    Przykład: typ nadwozia (Sedan ~ Touring ~ Gran Coupé).
//    matrix[answer][item[attr]] -> 0..1
export function similarity({ id, weight, attr, matrix, anyValue = 'any', fallback = 0.15 }) {
  return {
    id, weight,
    score: (ans, item) => {
      if (ans == null || ans === anyValue) return 1;
      const row = matrix[ans];
      if (!row) return fallback;
      return row[item[attr]] ?? fallback;
    },
    exact: (ans, item) => ans != null && ans !== anyValue && item[attr] === ans,
  };
}

// 4) CAPACITY — TWARDY wymóg progowy: liczbowa cecha produktu (item[attr])
//    musi być >= wymaganej wartości wyliczonej z odpowiedzi. Inaczej 0 + flaga.
//    Przykład: liczba miejsc vs liczba pasażerów.
//    required(answer) -> minimalna wymagana liczba
export function capacity({ id, weight, attr, required, requirement, hard = true }) {
  const ok = (ans, item) => item[attr] >= required(ans);
  return {
    id, weight,
    score: (ans, item) => (ok(ans, item) ? 1 : 0),
    hard: hard ? (ans, item) => (ok(ans, item) ? null : { requirement }) : undefined,
  };
}

// 5) GRADED SET — przynależność do zbioru z OCENĄ częściową; poniżej progu
//    traktowane jako niespełniony twardy wymóg. Przykład: rodzaj napędu
//    (elektryk/spalinówka/hybryda), gdzie PHEV częściowo zalicza oba światy.
//    table(answer, item[attr]) -> 0..1
export function gradedSet({ id, weight, attr, table, requirement, hardBelow = 0.2, hard = true }) {
  const val = (ans, item) => table(ans, item[attr] || []);
  return {
    id, weight,
    score: val,
    hard: hard ? (ans, item) => (val(ans, item) <= hardBelow ? { requirement } : null) : undefined,
  };
}

// ---------------------------------------------------------------------------
// SILNIK
// ---------------------------------------------------------------------------

export const ENGINE_DEFAULTS = {
  // Mapowanie wyniku surowego (0..1) na wyświetlany procent.
  display: { scale: 100, base: 0, floor: 35, ceil: 97 },
  // true -> produkty bez niespełnionych wymogów zawsze nad produktami z brakiem.
  prioritizeCompliant: false,
  // Zagwarantuj wśród alternatyw przynajmniej jeden produkt bez braków.
  ensureCompliantAlternative: true,
  alternativesCount: 2,
};

function makeComparator(cfg, tiebreak) {
  return (a, b) => {
    if (cfg.prioritizeCompliant) {
      const ac = a.unmet.length === 0 ? 0 : 1;
      const bc = b.unmet.length === 0 ? 0 : 1;
      if (ac !== bc) return ac - bc;
    }
    if (b.raw !== a.raw) return b.raw - a.raw;
    if (a.unmet.length !== b.unmet.length) return a.unmet.length - b.unmet.length;
    if (tiebreak) { const t = tiebreak(a, b); if (t) return t; }
    return 0;
  };
}

/**
 * Buduje wybieracz z podanej specyfikacji.
 * @param {object} spec
 * @param {Array}  spec.criteria  - lista kryteriów (z fabryk powyżej lub własnych)
 * @param {Function} [spec.tiebreak] - (a,b) => number, rozstrzyga remisy
 * @param {object} [spec.display]
 * @param {boolean} [spec.prioritizeCompliant]
 * @param {boolean} [spec.ensureCompliantAlternative]
 * @param {number} [spec.alternativesCount]
 */
export function createRecommender(spec) {
  const cfg = { ...ENGINE_DEFAULTS, ...spec };
  const criteria = spec.criteria || [];

  const weightSum = criteria.reduce((s, c) => s + c.weight, 0);
  if (Math.abs(weightSum - 1) > 1e-6) {
    // Ostrzeżenie, nie błąd — pozwala eksperymentować z wagami.
    console.warn(`[match-engine] suma wag kryteriów = ${weightSum} (zalecane 1.0)`);
  }

  function scoreItem(item, answers) {
    const components = {};
    const exact = {};
    const unmet = [];
    let raw = 0;
    for (const c of criteria) {
      const ans = answers[c.id];
      const s = c.score(ans, item);
      components[c.id] = s;
      raw += c.weight * s;
      if (c.hard) {
        const flag = c.hard(ans, item);
        if (flag) unmet.push({ key: c.id, ...flag });
      }
      if (c.exact) exact[c.id] = c.exact(ans, item);
    }
    const d = cfg.display;
    const percent = Math.round(clamp(raw * d.scale + d.base, d.floor, d.ceil));
    return { item, raw, percent, components, exact, unmet };
  }

  function recommend(answers, catalog) {
    const ranking = catalog
      .map((it) => scoreItem(it, answers))
      .sort(makeComparator(cfg, spec.tiebreak));

    const best = ranking[0] || null;
    let alternatives = ranking.slice(1, 1 + cfg.alternativesCount);

    if (cfg.ensureCompliantAlternative && best && best.unmet.length > 0 && cfg.alternativesCount > 0) {
      if (!alternatives.some((r) => r.unmet.length === 0)) {
        const compliant = ranking.slice(1).find((r) => r.unmet.length === 0);
        if (compliant) alternatives = [compliant, ...alternatives].slice(0, cfg.alternativesCount);
      }
    }
    return { best, alternatives, ranking };
  }

  return { scoreItem, recommend, config: cfg };
}

/** Buduje komunikat "Niespełnione wymogi: ..." (lub null). */
export function unmetMessage(result) {
  if (!result || result.unmet.length === 0) return null;
  const items = [...new Set(result.unmet.map((u) => u.requirement))];
  return `Niespełnione wymogi: ${items.join(', ')}`;
}
