// ---------------------------------------------------------------------------
// Pytania testu "Jakie BMW pasuje do Ciebie?"
// ---------------------------------------------------------------------------
// Pojedyncze źródło prawdy dla 5 pytań ankiety. Steruje warstwą UI (demo
// index.html) ORAZ definiuje identyfikatory odpowiedzi, których używa klucz
// dopasowania w models.js. Zmiana treści odpowiedzi tutaj NIE wymaga zmian
// w silniku — liczą się tylko pola `id`.
// ---------------------------------------------------------------------------

/** @typedef {'usage'|'priorities'|'passengers'|'body'|'powertrain'} QuestionId */

export const QUESTIONS = [
  {
    id: 'usage',
    type: 'single',
    title: 'Jak najczęściej korzystasz z samochodu?',
    options: [
      { id: 'city',     label: 'Codzienne dojazdy po mieście' },
      { id: 'long',     label: 'Długie trasy' },
      { id: 'mixed',    label: 'Trasy i miasto po równo' },
      { id: 'family',   label: 'Samochód rodzinny' },
      { id: 'fun',      label: 'Dla przyjemności z jazdy' },
      { id: 'business', label: 'Samochód do biznesu' },
    ],
  },
  {
    id: 'priorities',
    type: 'multi',
    max: 3,
    title: 'Co jest dla Ciebie najważniejsze?',
    hint: 'Wybierz maksymalnie 3 odpowiedzi.',
    options: [
      { id: 'comfort',    label: 'Komfort' },
      { id: 'performance',label: 'Osiągi' },
      { id: 'design',     label: 'Design' },
      { id: 'technology', label: 'Technologia' },
      { id: 'space',      label: 'Przestrzeń' },
      { id: 'safety',     label: 'Bezpieczeństwo' },
      { id: 'prestige',   label: 'Prestiż' },
      { id: 'low_cost',   label: 'Niskie koszty użytkowania' },
    ],
  },
  {
    id: 'passengers',
    type: 'single',
    title: 'Ile osób najczęściej z Tobą podróżuje?',
    options: [
      { id: 'solo',   label: 'Tylko ja' },
      { id: 'p1',     label: '1 pasażer' },
      { id: 'p2_3',   label: '2-3 pasażerów' },
      { id: 'p4',     label: '4 pasażerów' },
      { id: 'p5plus', label: '5+ pasażerów' },
    ],
  },
  {
    id: 'body',
    type: 'single',
    title: 'Który typ nadwozia najbardziej do Ciebie przemawia?',
    options: [
      { id: 'suv',     label: 'SUV' },
      { id: 'sedan',   label: 'Sedan' },
      { id: 'coupe',   label: 'Gran Coupé / Coupé' },
      { id: 'touring', label: 'Touring' },
      { id: 'cabrio',  label: 'Cabrio' },
      { id: 'any',     label: 'Nie mam preferencji' },
    ],
  },
  {
    id: 'powertrain',
    type: 'single',
    title: 'Co jest Ci bliższe?',
    options: [
      { id: 'electric',   label: 'Cisza elektryka' },
      { id: 'combustion', label: 'Charakter spalinówki' },
      { id: 'hybrid',     label: 'Kompromis hybrydy' },
    ],
  },
];

// Wygodny słownik etykiet: ETYKIETY[questionId][optionId] -> tekst po polsku.
// Używany m.in. do budowania komunikatu "Niespełnione wymogi".
export const LABELS = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, Object.fromEntries(q.options.map((o) => [o.id, o.label]))]),
);
