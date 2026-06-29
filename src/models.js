// ---------------------------------------------------------------------------
// Katalog modeli BMW + klucz dopasowania ("answer key")
// ---------------------------------------------------------------------------
// To jest serce konfiguracji, którą edytuje dealer. Każdy model opisuje:
//
//   id          - unikalny identyfikator
//   name        - nazwa wyświetlana (konwencja BMW Polska)
//   body        - typ nadwozia (kategoria wewnętrzna, patrz BODY_SIM w recommender)
//   seats       - maksymalna liczba miejsc (do twardego wymogu liczby pasażerów)
//   powertrains - dostępne rodzaje napędu: 'combustion' | 'hybrid' | 'electric'
//   usage       - profil użytkowania: jak dobrze model pasuje do odpowiedzi z Q1 (0..1)
//   priorities  - lista priorytetów z Q2, które model faktycznie spełnia
//   tagline     - krótki nagłówek na ekranie wyniku
//   desc        - opis pod nazwą modelu na ekranie wyniku
//
// Profile użytkowania trzymamy w archetypach (U), żeby nie powtarzać liczb i
// żeby dało się stroić całe grupy modeli w jednym miejscu. Pojedynczy model
// może nadpisać archetyp przez `usageOverride`.
//
// Stan oferty: BMW Polca, połowa 2026 (Neue Klasse: iX3, i3; bez Serii 8 i X4
// — wycofane). Listę łatwo aktualizować — silnik nie zależy od konkretnych
// modeli, tylko od pól powyżej.
// ---------------------------------------------------------------------------

// Archetypy profilu użytkowania (Q1: city / long / mixed / family / fun / business)
const U = {
  city:       { city: 1.00, long: 0.30, mixed: 0.80, family: 0.50, fun: 0.30, business: 0.40 },
  compactVan: { city: 0.80, long: 0.60, mixed: 0.80, family: 1.00, fun: 0.30, business: 0.50 },
  sportSedan: { city: 0.60, long: 0.75, mixed: 0.85, family: 0.60, fun: 0.80, business: 0.70 },
  touring:    { city: 0.50, long: 0.95, mixed: 0.85, family: 0.95, fun: 0.55, business: 0.75 },
  executive:  { city: 0.45, long: 1.00, mixed: 0.70, family: 0.60, fun: 0.50, business: 1.00 },
  familySuv:  { city: 0.45, long: 0.90, mixed: 0.75, family: 1.00, fun: 0.45, business: 0.75 },
  cityCrossover:{ city: 0.95, long: 0.55, mixed: 0.85, family: 0.80, fun: 0.40, business: 0.55 },
  coupeSuv:   { city: 0.50, long: 0.70, mixed: 0.70, family: 0.55, fun: 0.70, business: 0.70 },
  gt:         { city: 0.40, long: 0.70, mixed: 0.55, family: 0.20, fun: 1.00, business: 0.50 },
  roadster:   { city: 0.45, long: 0.55, mixed: 0.50, family: 0.10, fun: 1.00, business: 0.40 },
  mPerf:      { city: 0.40, long: 0.60, mixed: 0.60, family: 0.40, fun: 1.00, business: 0.55 },
  mPerfSuv:   { city: 0.40, long: 0.75, mixed: 0.65, family: 0.70, fun: 0.95, business: 0.70 },
};

/**
 * @typedef {Object} Model
 * @property {string} id
 * @property {string} name
 * @property {'suv'|'sedan'|'coupe'|'touring'|'cabrio'|'hatch'|'mpv'|'roadster'} body
 * @property {number} seats
 * @property {Array<'combustion'|'hybrid'|'electric'>} powertrains
 * @property {Record<string, number>} usage
 * @property {string[]} priorities
 * @property {string} tagline
 * @property {string} desc
 */

/** @type {Model[]} */
export const MODELS = [
  // --- Kompakt / miasto ----------------------------------------------------
  {
    id: 'seria1', name: 'BMW Serii 1', body: 'hatch', seats: 5,
    powertrains: ['combustion'], usage: U.city,
    priorities: ['low_cost', 'technology', 'design', 'safety'],
    tagline: 'Zwinny kompakt na co dzień',
    desc: 'Kompaktowy hatchback idealny do miasta — niskie koszty, nowoczesna technologia i charakterystyczny design.',
  },
  {
    id: 'seria2at', name: 'BMW Serii 2 Active Tourer', body: 'mpv', seats: 5,
    powertrains: ['combustion', 'hybrid'], usage: U.compactVan,
    priorities: ['space', 'comfort', 'low_cost', 'safety', 'technology'],
    tagline: 'Praktyczna przestrzeń dla rodziny',
    desc: 'Kompaktowy, ale zaskakująco przestronny — wygodny i praktyczny wybór rodzinny z opcją hybrydy plug-in.',
  },
  {
    id: 'seria2gc', name: 'BMW Serii 2 Gran Coupé', body: 'coupe', seats: 5,
    powertrains: ['combustion'], usage: U.sportSedan,
    priorities: ['design', 'technology', 'low_cost', 'performance'],
    tagline: 'Kompaktowy charakter coupé',
    desc: 'Czterodrzwiowe coupé o sportowej sylwetce — wyrazisty design i emocje w dostępnej formie.',
  },
  {
    id: 'seria2coupe', name: 'BMW Serii 2 Coupé', body: 'coupe', seats: 4,
    powertrains: ['combustion'], usage: U.gt,
    priorities: ['performance', 'design', 'technology'],
    tagline: 'Czysta radość z jazdy',
    desc: 'Klasyczny, napędzany na tył kompakt dla kierowcy — zwinność i osiągi w najczystszej postaci.',
  },

  // --- Sedany / Touring ----------------------------------------------------
  {
    id: 'seria3', name: 'BMW Serii 3 Limuzyna', body: 'sedan', seats: 5,
    powertrains: ['combustion', 'hybrid'], usage: U.sportSedan,
    priorities: ['performance', 'technology', 'design', 'comfort', 'safety'],
    tagline: 'Sportowa limuzyna do wszystkiego',
    desc: 'Ikona segmentu — sportowe prowadzenie, komfort i technologia w idealnie wyważonej limuzynie.',
  },
  {
    id: 'seria3t', name: 'BMW Serii 3 Touring', body: 'touring', seats: 5,
    powertrains: ['combustion', 'hybrid'], usage: U.touring,
    priorities: ['space', 'comfort', 'technology', 'safety', 'performance'],
    tagline: 'Sportowe kombi bez kompromisów',
    desc: 'Cała funkcjonalność kombi z duszą sportowej limuzyny — przestrzeń, komfort i przyjemność z jazdy.',
  },
  {
    id: 'seria5', name: 'BMW Serii 5 Limuzyna', body: 'sedan', seats: 5,
    powertrains: ['combustion', 'hybrid'], usage: U.executive,
    priorities: ['comfort', 'technology', 'prestige', 'safety', 'performance'],
    tagline: 'Biznesowa elegancja i komfort',
    desc: 'Limuzyna klasy biznes — dostojny komfort na długich trasach, prestiż i najnowsze technologie.',
  },
  {
    id: 'seria5t', name: 'BMW Serii 5 Touring', body: 'touring', seats: 5,
    powertrains: ['combustion', 'hybrid'], usage: U.touring, usageOverride: { business: 0.85 },
    priorities: ['space', 'comfort', 'technology', 'prestige', 'safety'],
    tagline: 'Elegancja z przestrzenią kombi',
    desc: 'Reprezentacyjne kombi klasy wyższej — maksimum przestrzeni i komfortu bez utraty prestiżu.',
  },
  {
    id: 'seria7', name: 'BMW Serii 7', body: 'sedan', seats: 5,
    powertrains: ['combustion', 'hybrid'], usage: U.executive,
    priorities: ['comfort', 'prestige', 'technology', 'safety', 'design'],
    tagline: 'Szczyt luksusu i technologii',
    desc: 'Flagowa limuzyna — najwyższy komfort, prestiż i przełomowe technologie BMW.',
  },

  // --- Coupé / Cabrio ------------------------------------------------------
  {
    id: 'seria4coupe', name: 'BMW Serii 4 Coupé', body: 'coupe', seats: 4,
    powertrains: ['combustion'], usage: U.gt,
    priorities: ['design', 'performance', 'technology', 'prestige'],
    tagline: 'Wyrazisty design i emocje',
    desc: 'Eleganckie coupé o mocnym charakterze — wyróżniający się design połączony z osiągami.',
  },
  {
    id: 'seria4gc', name: 'BMW Serii 4 Gran Coupé', body: 'coupe', seats: 5,
    powertrains: ['combustion'], usage: U.sportSedan,
    priorities: ['design', 'technology', 'comfort', 'performance'],
    tagline: 'Coupé z praktycznością czterech drzwi',
    desc: 'Smukła sylwetka coupé i wygoda czworga drzwi — design i osiągi bez rezygnacji z praktyczności.',
  },
  {
    id: 'seria4cabrio', name: 'BMW Serii 4 Cabrio', body: 'cabrio', seats: 4,
    powertrains: ['combustion'], usage: U.gt,
    priorities: ['design', 'prestige', 'performance'],
    tagline: 'Otwarta przyjemność z jazdy',
    desc: 'Kabriolet dla tych, którzy cenią styl i wolność — jazda z otwartym dachem w wielkim stylu.',
  },
  {
    id: 'z4', name: 'BMW Z4', body: 'roadster', seats: 2,
    powertrains: ['combustion'], usage: U.roadster,
    priorities: ['design', 'performance'],
    tagline: 'Czysty roadster dla dwojga',
    desc: 'Dwuosobowy roadster z napędem na tył — emocje, design i radość z jazdy w najczystszej formie.',
  },

  // --- SUV (X) — spalinowe / hybrydowe ------------------------------------
  {
    id: 'x1', name: 'BMW X1', body: 'suv', seats: 5,
    powertrains: ['combustion', 'hybrid'], usage: U.cityCrossover,
    priorities: ['low_cost', 'technology', 'safety', 'comfort', 'space'],
    tagline: 'Kompaktowy SUV na każdy dzień',
    desc: 'Wszechstronny, kompaktowy SUV — podwyższona pozycja, przestrzeń i technologia w rozsądnej cenie.',
  },
  {
    id: 'x2', name: 'BMW X2', body: 'suv', seats: 5,
    powertrains: ['combustion', 'hybrid'], usage: U.coupeSuv,
    usageOverride: { city: 0.80, mixed: 0.85 },
    priorities: ['design', 'technology', 'performance', 'low_cost'],
    tagline: 'SUV o sylwetce coupé',
    desc: 'Sportowy crossover dla ceniących styl — dynamiczna, coupé-podobna linia i charakter.',
  },
  {
    id: 'x3', name: 'BMW X3', body: 'suv', seats: 5,
    powertrains: ['combustion', 'hybrid'], usage: U.familySuv,
    priorities: ['comfort', 'space', 'safety', 'technology', 'performance'],
    tagline: 'Wszechstronny SUV klasy średniej',
    desc: 'Najlepiej zbalansowany SUV BMW — komfort, przestrzeń i technologia idealne dla rodziny i na trasę.',
  },
  {
    id: 'x5', name: 'BMW X5', body: 'suv', seats: 5,
    powertrains: ['combustion', 'hybrid'], usage: U.familySuv,
    usageOverride: { business: 0.85, long: 0.95 },
    priorities: ['comfort', 'space', 'prestige', 'safety', 'technology', 'performance'],
    tagline: 'Duży SUV pełen prestiżu',
    desc: 'Imponujący SUV klasy wyższej — przestrzeń, komfort i prestiż na każdą trasę (opcjonalnie 7 miejsc).',
  },
  {
    id: 'x6', name: 'BMW X6', body: 'suv', seats: 5,
    powertrains: ['combustion', 'hybrid'], usage: U.coupeSuv,
    priorities: ['design', 'performance', 'prestige', 'technology'],
    tagline: 'SAV o emocjonującym charakterze',
    desc: 'Połączenie obecności dużego SUV-a z dynamiczną linią coupé — dla tych, którzy chcą się wyróżniać.',
  },
  {
    id: 'x7', name: 'BMW X7', body: 'suv', seats: 7,
    powertrains: ['combustion', 'hybrid'], usage: U.familySuv,
    usageOverride: { business: 0.90, family: 1.00, long: 0.95 },
    priorities: ['comfort', 'space', 'prestige', 'safety', 'technology'],
    tagline: 'Flagowy SUV dla całej rodziny',
    desc: 'Największy SUV BMW — siedem miejsc, najwyższy komfort i prestiż dla rodziny i na najdłuższe trasy.',
  },

  // --- Elektryczne (i) -----------------------------------------------------
  {
    id: 'i4', name: 'BMW i4', body: 'coupe', seats: 5,
    powertrains: ['electric'], usage: U.sportSedan,
    priorities: ['technology', 'design', 'performance', 'low_cost'],
    tagline: 'Elektryczne Gran Coupé',
    desc: 'W pełni elektryczne, czterodrzwiowe coupé — dynamika, technologia i niskie koszty użytkowania.',
  },
  {
    id: 'i5', name: 'BMW i5 Limuzyna', body: 'sedan', seats: 5,
    powertrains: ['electric'], usage: U.executive,
    priorities: ['technology', 'comfort', 'prestige', 'design', 'safety'],
    tagline: 'Elektryczna limuzyna biznesowa',
    desc: 'Elektryczna klasa biznes — cicha, komfortowa i naszpikowana technologią na długie trasy.',
  },
  {
    id: 'i5t', name: 'BMW i5 Touring', body: 'touring', seats: 5,
    powertrains: ['electric'], usage: U.touring,
    priorities: ['space', 'technology', 'comfort', 'prestige', 'safety'],
    tagline: 'Elektryczne kombi premium',
    desc: 'W pełni elektryczne kombi klasy wyższej — przestrzeń i komfort bez emisji.',
  },
  {
    id: 'i7', name: 'BMW i7', body: 'sedan', seats: 5,
    powertrains: ['electric'], usage: U.executive,
    priorities: ['prestige', 'comfort', 'technology', 'design', 'safety'],
    tagline: 'Elektryczny szczyt luksusu',
    desc: 'Flagowa limuzyna elektryczna — bezgłośny luksus, prestiż i najnowsze technologie BMW.',
  },
  {
    id: 'i3', name: 'BMW i3', body: 'sedan', seats: 5,
    powertrains: ['electric'], usage: U.sportSedan,
    priorities: ['technology', 'design', 'comfort', 'low_cost'],
    tagline: 'Elektryczny sedan Neue Klasse',
    desc: 'Nowa, elektryczna limuzyna Neue Klasse — przełomowa technologia, świeży design i niskie koszty.',
  },
  {
    id: 'ix1', name: 'BMW iX1', body: 'suv', seats: 5,
    powertrains: ['electric'], usage: U.cityCrossover,
    priorities: ['technology', 'low_cost', 'design', 'safety', 'comfort'],
    tagline: 'Elektryczny kompaktowy SUV',
    desc: 'Kompaktowy, elektryczny SUV do miasta i nie tylko — technologia i niskie koszty w praktycznej formie.',
  },
  {
    id: 'ix2', name: 'BMW iX2', body: 'suv', seats: 5,
    powertrains: ['electric'], usage: U.coupeSuv,
    usageOverride: { city: 0.80, mixed: 0.85 },
    priorities: ['design', 'technology', 'performance', 'low_cost'],
    tagline: 'Elektryczny SUV-coupé',
    desc: 'Elektryczny crossover o sylwetce coupé — wyrazisty styl i nowoczesna technologia.',
  },
  {
    id: 'ix3', name: 'BMW iX3', body: 'suv', seats: 5,
    powertrains: ['electric'], usage: U.familySuv,
    priorities: ['technology', 'comfort', 'low_cost', 'design', 'safety', 'space'],
    tagline: 'SUV nowej ery — Neue Klasse',
    desc: 'Nowy, elektryczny SUV Neue Klasse — rekordowy zasięg, przełomowa technologia i komfort dla rodziny.',
  },
  {
    id: 'ix', name: 'BMW iX', body: 'suv', seats: 5,
    powertrains: ['electric'], usage: U.familySuv,
    usageOverride: { business: 0.85, long: 0.95 },
    priorities: ['technology', 'comfort', 'prestige', 'space', 'design', 'safety'],
    tagline: 'Technologiczny flagowiec elektryczny',
    desc: 'Duży, elektryczny SUV — flagowa technologia, luksusowa przestrzeń i prestiż bez emisji.',
  },

  // --- M / Performance -----------------------------------------------------
  {
    id: 'm2', name: 'BMW M2', body: 'coupe', seats: 4,
    powertrains: ['combustion'], usage: U.mPerf,
    priorities: ['performance', 'design'],
    tagline: 'Kompaktowe coupé M',
    desc: 'Najczystsze, kompaktowe coupé M — surowe osiągi i radość z jazdy dla prawdziwego entuzjasty.',
  },
  {
    id: 'm3', name: 'BMW M3', body: 'sedan', seats: 5,
    powertrains: ['combustion'], usage: U.mPerf,
    usageOverride: { family: 0.55, business: 0.55 },
    priorities: ['performance', 'design', 'technology'],
    tagline: 'Ikona sportowej limuzyny',
    desc: 'Idealne połączenie osiągów, unikalnego designu oraz nowych technologii (dostępne także jako Touring).',
  },
  {
    id: 'm4', name: 'BMW M4', body: 'coupe', seats: 4,
    powertrains: ['combustion'], usage: U.mPerf,
    priorities: ['performance', 'design', 'technology', 'prestige'],
    tagline: 'Bezkompromisowe coupé M',
    desc: 'Sportowe coupé M w najczystszej formie — maksimum osiągów, designu i emocji za kierownicą.',
  },
  {
    id: 'm5', name: 'BMW M5', body: 'sedan', seats: 5,
    powertrains: ['hybrid'], usage: U.mPerf,
    usageOverride: { family: 0.55, business: 0.65, long: 0.70 },
    priorities: ['performance', 'prestige', 'technology', 'comfort'],
    tagline: 'Supersportowa limuzyna hybrydowa',
    desc: 'Hybrydowy V8 o ekstremalnych osiągach w nadwoziu komfortowej limuzyny — moc i prestiż w jednym.',
  },
  {
    id: 'xm', name: 'BMW XM', body: 'suv', seats: 5,
    powertrains: ['hybrid'], usage: U.mPerfSuv,
    priorities: ['performance', 'prestige', 'design', 'technology'],
    tagline: 'Ekskluzywny SUV M Hybrid',
    desc: 'Flagowy, hybrydowy SUV M — bezkompromisowe osiągi, ekspresyjny design i ekskluzywny charakter.',
  },
];

// Zastosuj nadpisania profilu użytkowania (usageOverride) na kopii archetypu,
// żeby nie modyfikować współdzielonych obiektów U.
for (const m of MODELS) {
  m.usage = { ...m.usage, ...(m.usageOverride || {}) };
  delete m.usageOverride;
}
