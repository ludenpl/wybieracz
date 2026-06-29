# Wybieracz BMW 🚗

Silnik dopasowania modelu BMW dla testu **„Jakie BMW pasuje do Ciebie?"**
(BMW Premium Arena Kalisz). Na podstawie 5 odpowiedzi z ankiety zwraca:

- **najlepiej dopasowany model** + procent dopasowania + opis,
- **2 alternatywy**,
- pełny ranking wszystkich modeli,
- adnotacje **„Niespełnione wymogi"** (np. *liczba pasażerów*, *rodzaj napędu*).

Repozytorium zawiera czysty, niezależny od frameworka silnik (`src/`), kompletny
**klucz odpowiedzi** dla aktualnej oferty BMW (33 modele) oraz **działające demo**
(`index.html`), które przechodzi cały test od początku do końca.

---

## Szybki start

```bash
# 1) Testy jednostkowe silnika (Node 18+, bez zależności)
npm test

# 2) Demo w przeglądarce — wymaga serwowania (moduły ES)
npm start          # uruchamia http://localhost:8000
#   ...następnie otwórz http://localhost:8000/index.html
```

> Demo używa modułów ES (`import`), więc nie zadziała po otwarciu pliku przez
> `file://` — trzeba je serwować (`npm start`, `npx serve`, dowolny serwer HTTP).

Opcjonalny test E2E (przechodzi cały test w prawdziwej przeglądarce):

```bash
npm install        # instaluje playwright-core (devDependency)
npm run e2e        # wymaga uruchomionego `npm start` na porcie 8000
```

---

## Jak działa dopasowanie

Wynik modelu to **ważona suma 5 składowych** (każda w skali 0..1), przeliczana na
procent. Wagi są konfigurowalne (`DEFAULT_CONFIG.weights` w `src/recommender.js`):

| Składowa | Pytanie | Waga | Co ocenia |
|---|---|---|---|
| `priorities` | Q2 — Co najważniejsze (max 3) | **0.28** | ile wybranych priorytetów spełnia model |
| `usage` | Q1 — Sposób użytkowania | **0.22** | jak model pasuje do stylu jazdy |
| `body` | Q4 — Typ nadwozia | **0.18** | zgodność nadwozia (z macierzą podobieństwa) |
| `powertrain` | Q5 — Napęd | **0.18** | zgodność rodzaju napędu |
| `seats` | Q3 — Liczba pasażerów | **0.14** | czy model pomieści pasażerów (twardy wymóg) |

Procent = `round(raw × 100)`, ograniczony do zakresu **35–97%** (sufit 97% zamiast
„podejrzanych" 100%, podłoga 35% by nic nie wyglądało na całkiem nietrafione).

### Twarde wymogi i adnotacje

Dwa kryteria są **twarde** — nie eliminują modelu z rankingu, ale zerują/obniżają
swoją składową i dodają notkę:

- **Liczba pasażerów** — jeśli model ma za mało miejsc, składowa `seats = 0`
  (czyli –14% wyniku) i pojawia się *„Niespełnione wymogi: liczba pasażerów"*.
- **Rodzaj napędu** — przy wyraźnym rozjeździe (np. użytkownik chce elektryka,
  a model jest wyłącznie spalinowy) dochodzi *„Niespełnione wymogi: rodzaj napędu"*.

To realizuje scenariusz z założeń: ktoś z profilem „sportowego coupé", ale
wybierający **4 pasażerów**, dostaje **BMW M4 z dopasowaniem 86%** i notką
*„Niespełnione wymogi: liczba pasażerów"* (100% – 14% za miejsca = 86%).

Mapowanie liczby pasażerów → wymagane miejsca i zasady napędu opisuje
[`data/answer-key.md`](data/answer-key.md).

### Polityka nagłówka (ważna decyzja produktowa)

Co zrobić, gdy najlepiej punktowany model ma niespełniony twardy wymóg?
Steruje tym flaga `prioritizeCompliant`:

- **`false` (domyślnie)** — na czele staje model z najwyższym wynikiem, **nawet
  z adnotacją** (np. M4 86% + notka). Model niezgodny wygrywa tylko, gdy realnie
  dominuje punktami — utrata 14% za miejsca sprawia, że musi wyraźnie przewyższać
  inne. To zachowanie opisane wprost w założeniach.
- **`true`** — modele spełniające **wszystkie** twarde wymogi zawsze stoją wyżej
  niż jakikolwiek model z brakiem; niezgodne pojawiają się dopiero niżej.

Niezależnie od flagi, wśród alternatyw gwarantujemy przynajmniej jeden model bez
braków (`ensureCompliantAlternative`), żeby użytkownik zawsze miał realną opcję.
W demie jest przełącznik na ekranie wyniku, by porównać oba zachowania na żywo.

---

## Klucz odpowiedzi (katalog modeli)

Cała „wiedza" siedzi w [`src/models.js`](src/models.js) — to plik, który edytuje
dealer. Każdy model opisują pola: `name`, `body`, `seats`, `powertrains`,
`usage` (profil Q1), `priorities` (Q2), `tagline`, `desc`.

Czytelną wersję tabelaryczną generuje:

```bash
node scripts/gen-answer-key.mjs   # -> data/answer-key.md
```

Profile użytkowania trzymane są w **archetypach** (`U` w `models.js`: `city`,
`familySuv`, `executive`, `gt`, `mPerf`…), więc całe grupy modeli stroi się w
jednym miejscu, a pojedynczy model może je nadpisać (`usageOverride`).

**Zakres oferty:** BMW Polska, połowa 2026 — 33 modele, w tym Neue Klasse
(`iX3`, `i3`). Pominięto modele wycofywane/wycofane (Seria 8, X4). Aktualizacja
listy to wyłącznie edycja `models.js` — silnik nie zna konkretnych modeli.

---

## Integracja z istniejącą stroną

Silnik nie ma zależności i działa w przeglądarce oraz w Node.

```js
import { recommend, unmetMessage } from './src/recommender.js';

const wynik = recommend({
  usage: 'fun',                                  // Q1: jeden id
  priorities: ['performance', 'design', 'technology'], // Q2: do 3 id
  passengers: 'p4',                              // Q3: jeden id
  body: 'coupe',                                 // Q4: jeden id (lub 'any')
  powertrain: 'combustion',                      // Q5: jeden id
});

wynik.best;          // { model, percent, components, unmet, ... }
wynik.alternatives;  // 2 kolejne modele
wynik.ranking;       // pełna, posortowana lista
unmetMessage(wynik.best); // "Niespełnione wymogi: liczba pasażerów" | null
```

Identyfikatory odpowiedzi (`fun`, `performance`, `p4`, `coupe`, `combustion`…)
zdefiniowane są w [`src/questions.js`](src/questions.js) — ten sam plik steruje
warstwą UI w demie, więc treść pytań i odpowiedzi zmienia się w jednym miejscu.

Strojenie bez zmiany kodu — przez drugi argument:

```js
recommend(answers, { config: { prioritizeCompliant: true, alternativesCount: 3 } });
```

---

## Pomysły na rozwój (ponad zakres)

Wdrożone już teraz:
- **Adnotacje twardych wymogów** dla *liczby pasażerów* **i** *rodzaju napędu*.
- **Gwarancja zgodnej alternatywy** — użytkownik zawsze dostaje realną opcję.
- **Macierz podobieństwa nadwozi** — „Sedan" nie zeruje Touring/Gran Coupé, tylko
  daje częściowy wynik; „Nie mam preferencji" nie karze żadnego nadwozia.
- **Inteligentny napęd** — PHEV częściowo zalicza i „spalinówkę", i „elektryka".

Warte rozważenia dalej:
- **Wariant napędu w wyniku** — pokazywać konkretną wersję (np. „X3 30e" dla
  hybrydy), zamiast jednego wpisu modelu z wieloma napędami.
- **Budżet / cena** jako 6. pytanie lub miękki filtr (świetne dla leada dealera).
- **Powiązanie ze stockiem** — podbijać modele dostępne „od ręki" w salonie.
- **Reguły biznesowe** — np. zawsze pokazywać 1 model elektryczny w alternatywach
  (cel sprzedażowy BEV).
- **Analityka** — logować odpowiedzi i wynik, by stroić wagi na realnych danych.
- **A/B wag** — `weights` i `display` są w configu, więc łatwo testować warianty.

---

## Struktura repozytorium

```
src/
  questions.js     5 pytań + identyfikatory odpowiedzi (źródło prawdy dla UI)
  models.js        katalog 33 modeli BMW = klucz odpowiedzi (edytuje dealer)
  recommender.js   silnik: scoring, twarde wymogi, ranking
index.html         działające demo (intro → 5 pytań → ładowanie → wynik)
data/
  answer-key.md    czytelny klucz odpowiedzi (generowany)
scripts/
  gen-answer-key.mjs  generator powyższego
test/
  recommender.test.mjs  19 testów (m.in. scenariusze X7, Serii 1, M4)
  e2e.smoke.mjs         test E2E demo (opcjonalny, playwright-core)
```
