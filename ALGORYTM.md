# Algorytm dopasowania (quiz → ranking produktów)

Opis algorytmu w oderwaniu od BMW — jako **baza do zbudowania własnego
wybieracza** (samochody, ale też dowolne produkty: rowery, laptopy, ubezpieczenia).
Język-agnostyczny: wzory + pseudokod. Referencyjna implementacja: `engine/match-engine.js`,
przykład użycia: `engine/bmw.example.js`.

> TL;DR: każdy produkt dostaje **ważoną sumę kilku ocen cząstkowych** (po jednej
> na pytanie), w skali 0..1. Część pytań to **twarde wymogi** — nie wyrzucają
> produktu z listy, tylko zerują swoją składową i dopinają notkę „Niespełnione
> wymogi". Produkty sortujemy malejąco i pokazujemy top 1 + alternatywy.

---

## 1. Co algorytm przyjmuje i zwraca

**Wejście — odpowiedzi użytkownika** (jeden obiekt, klucz = id pytania):

```
{
  usage: 'fun',                                   // pojedynczy wybór
  priorities: ['performance','design','technology'], // wielokrotny wybór (max N)
  passengers: 'p4',                               // pojedynczy wybór
  body: 'coupe',                                  // pojedynczy wybór (lub 'any')
  powertrain: 'combustion'                        // pojedynczy wybór
}
```

**Katalog — lista produktów**, każdy z atrybutami, do których odwołują się
kryteria:

```
{
  id, name,
  usage: { city:1.0, long:0.3, mixed:0.8, family:0.5, fun:0.3, business:0.4 }, // mapa dla AFFINITY
  priorities: ['performance','design','technology'],   // zbiór dla OVERLAP
  body: 'coupe',                                        // kategoria dla SIMILARITY
  seats: 4,                                             // liczba dla CAPACITY
  powertrains: ['combustion']                           // zbiór dla GRADED SET
}
```

**Wyjście:**

```
{
  best:         { item, percent, components, unmet, ... },  // najlepszy
  alternatives: [ {…}, {…} ],                               // kolejne
  ranking:      [ …pełna lista posortowana… ]
}
// unmet -> komunikat "Niespełnione wymogi: liczba pasażerów"
```

---

## 2. Schemat działania

```
dla każdego produktu:
    dla każdego kryterium k (= pytania):
        c_k   = ocena_cząstkowa(odpowiedź[k], produkt)      # 0..1
        raw  += waga_k * c_k
        jeśli kryterium twarde i niespełnione:
            dopnij flagę do "unmet"                          # (c_k było już ~0)
    percent = zaokrąglij( ogranicz(raw*100, podłoga, sufit) )

posortuj produkty (malejąco) -> best + alternatywy
```

Wszystko sprowadza się do **doboru kryteriów, ich wag i sposobu liczenia oceny
cząstkowej**. Poniżej 5 sprawdzonych typów ocen — wystarczają do większości
wybieraczy.

---

## 3. Pięć typów kryteriów (ocena cząstkowa)

Każde kryterium zwraca liczbę **0..1**. Wybierasz typ zależnie od pytania.

### A. AFFINITY — pojedynczy wybór z tabelą dopasowania
Produkt ma mapę `odpowiedź → dopasowanie`. Bierzesz wartość dla odpowiedzi.

```
score = produkt.mapa[odpowiedź]  (brak wpisu -> 0)
```
*Kiedy:* sposób użytkowania, typ trasy, poziom zaawansowania.
*Po co:* pełna kontrola — ręcznie ustawiasz, jak bardzo każda odpowiedź pasuje
do każdego produktu (przez archetypy, patrz §7).

### B. OVERLAP — wybór wielokrotny (np. „zaznacz max 3")
Udział wskazań użytkownika, które produkt spełnia.

```
score = |wybory ∩ cechy_produktu| / |wybory|     (gdy 0 wyborów -> 0.6 neutralnie)
```
*Kiedy:* „co jest dla Ciebie najważniejsze" (komfort, osiągi, design…).
*Własność:* zaznaczenie 3 cech i trafienie 2 -> 0.67. Premiuje produkty
ucieleśniające to, na czym userowi zależy.

### C. SIMILARITY — pojedynczy wybór kategorii + macierz podobieństwa
Zamiast 0/1 dajesz **wynik częściowy** dla „prawie pasuje". Specjalna wartość
`any` (brak preferencji) = 1 dla wszystkich (nie karze nikogo).

```
jeśli odpowiedź == 'any':  score = 1
inaczej:                   score = macierz[odpowiedź][kategoria_produktu]  (brak pary -> 0.15)
```
*Kiedy:* typ nadwozia (Sedan ~ Touring ~ Gran Coupé to bliscy kuzyni, ale
Sedan ~ SUV już słabiej). Macierz to Twoja wiedza dziedzinowa.

### D. CAPACITY — TWARDY wymóg progowy
Liczbowa cecha produktu musi być ≥ progu wyliczonego z odpowiedzi.

```
wymagane = próg(odpowiedź)
jeśli produkt.cecha >= wymagane:  score = 1,  brak flagi
inaczej:                          score = 0,  flaga „<nazwa wymogu>"
```
*Kiedy:* liczba miejsc vs liczba pasażerów, ładowność, długość bagażnika.
*To jest źródło notki* „Niespełnione wymogi: liczba pasażerów".

### E. GRADED SET — przynależność do zbioru z oceną częściową (twardy-miękki)
Produkt obsługuje zbiór wariantów; funkcja zwraca pełne lub częściowe
dopasowanie. Poniżej progu — traktujemy jak niespełniony twardy wymóg.

```
score = tabela(odpowiedź, zbiór_produktu)        # np. PHEV częściowo zalicza i prąd, i spalinę
jeśli score <= próg_twardy (np. 0.2):  flaga „<nazwa wymogu>"
```
*Kiedy:* rodzaj napędu (elektryk/spalinówka/hybryda), system operacyjny,
standard łączności — gdzie istnieją warianty „pomostowe".

> Możesz pisać też **własne** typy kryteriów — wystarczy funkcja
> `(odpowiedź, produkt) → 0..1` (+ opcjonalnie reguła flagi).

---

## 4. Łączenie ocen — wagi

Wynik surowy to suma ważona; **wagi sumują się do 1.0**:

```
raw = Σ  waga_k · c_k          (raw ∈ 0..1)
```

Wagi = priorytety biznesowe. Przykład z BMW:

| Kryterium (pytanie)      | Typ        | Waga |
|--------------------------|------------|------|
| priorytety (co ważne)    | OVERLAP    | 0.28 |
| sposób użytkowania       | AFFINITY   | 0.22 |
| typ nadwozia             | SIMILARITY | 0.18 |
| rodzaj napędu            | GRADED SET | 0.18 |
| liczba pasażerów         | CAPACITY   | 0.14 |

---

## 5. Twarde wymogi — kluczowa decyzja projektowa

Twardy wymóg **nie usuwa** produktu z rankingu. Zamiast tego:
1. jego ocena cząstkowa spada do ~0,
2. dopinamy flagę do listy `unmet`.

**Dlaczego to eleganckie:** skoro składowa pada do 0, produkt traci dokładnie
swoją wagę. Produkt idealny poza jednym wymogiem dostaje `1 − waga_wymogu`.

> Przykład: coupé pasujące idealnie, ale user chce **4 pasażerów**, a auto ma
> 4 miejsca (potrzeba 5). Składowa „miejsca" = 0, waga = 0.14, więc:
> **100% − 14% = 86%**, plus notka „Niespełnione wymogi: liczba pasażerów".
> To znaczy: **wagą kryterium ustawiasz jednocześnie karę za jego niespełnienie.**

Masz dwie polityki nagłówka (co pokazać jako #1, gdy najlepszy wynik ma braki):

- **`prioritizeCompliant = false`** (domyślnie): na czele najwyższy wynik, nawet
  z notką. Produkt z brakiem prowadzi tylko, gdy realnie dominuje punktami
  (utrata wagi sprawia, że musi wyraźnie przewyższyć zgodnych).
- **`prioritizeCompliant = true`**: produkty bez braków zawsze nad produktami z
  brakiem; niezgodne lądują niżej.

Niezależnie od polityki: **gwarantujemy wśród alternatyw ≥1 produkt bez braków**
(`ensureCompliantAlternative`), żeby user zawsze miał realną opcję.

---

## 6. Procent wyświetlany

```
percent = round( clamp(raw*100, podłoga, sufit) )      # domyślnie podłoga=35, sufit=97
```

- **Sufit 97%** zamiast 100% — „idealne dopasowanie 100%" brzmi sztucznie;
  97% jest wiarygodne i zostawia margines.
- **Podłoga 35%** — nawet słaby produkt nie wygląda na „kompletnie nietrafiony".
- `scale`/`base` zostawiamy konfigurowalne, gdybyś chciał inną krzywą
  (np. ścisnąć wszystko do 60–95%).

---

## 7. Wskazówki praktyczne

- **Archetypy zamiast ręcznych liczb.** Dla AFFINITY nie wpisuj profilu
  użytkowania osobno każdemu produktowi — zdefiniuj kilka archetypów
  („miasto", „rodzinny SUV", „GT", „sport") i przypisuj je grupom, z opcją
  nadpisania pojedynczego pola. Stroisz całą grupę w jednym miejscu.
- **Macierz podobieństwa rób symetrycznie-ish i z rozsądku**, nie z danych —
  to subiektywna wiedza dziedzinowa (co jest substytutem czego).
- **Warianty jako osobne pozycje katalogu.** Jeśli produkt istnieje w odmianach,
  które zmieniają wynik (spalinowy vs elektryczny), często czyściej dodać je
  jako osobne pozycje niż wpychać do jednej z listą wariantów.
- **Kalibracja przez przykłady, nie przez teorię.** Wypisz 5–10 „oczywistych"
  profili („rodzina 5 osób, długie trasy → duży SUV") i dobierz wagi tak, by
  wychodziło to, czego oczekujesz. Potem trzymaj to w testach (jak
  `test/recommender.test.mjs`).
- **Loguj odpowiedzi i wynik** — po wdrożeniu stroisz wagi na realnych danych.

---

## 8. Pseudokod (kompletny, język-agnostyczny)

```
function ocena_produktu(produkt, odpowiedzi, kryteria, display):
    raw = 0
    unmet = []
    for k in kryteria:
        ans = odpowiedzi[k.id]
        c   = k.score(ans, produkt)            # 0..1
        raw += k.waga * c
        if k.twarde and k.niespelniony(ans, produkt):
            unmet.push(k.nazwa_wymogu)
    percent = round(clamp(raw*100, display.podloga, display.sufit))
    return { produkt, raw, percent, unmet }

function rekomenduj(odpowiedzi, katalog, kryteria, cfg):
    wyniki = [ ocena_produktu(p, odpowiedzi, kryteria, cfg.display) for p in katalog ]

    sort wyniki przez komparator:
        # 1) (opcjonalnie) zgodne przed niezgodnymi
        if cfg.prioritizeCompliant and (a.unmet=∅) != (b.unmet=∅):
            zgodny pierwszy
        # 2) wyższy raw
        if a.raw != b.raw: większy raw pierwszy
        # 3) mniej niespełnionych wymogów
        if |a.unmet| != |b.unmet|: mniej pierwszy
        # 4) rozstrzygnięcie remisu (np. dokładna zgodność kategorii, nazwa)
        tiebreak(a, b)

    best = wyniki[0]
    alternatywy = wyniki[1 .. 1+cfg.ileAlternatyw]

    # gwarancja realnej opcji wśród alternatyw
    if cfg.ensureCompliantAlternative and best.unmet ≠ ∅
       and żadna alternatywa nie jest zgodna:
        wstaw najlepszy w pełni zgodny produkt na początek alternatyw

    return { best, alternatywy, ranking: wyniki }
```

---

## 9. Jak zaadaptować do swoich aut (checklist)

1. **Pytania** — wypisz pytania quizu, każdemu nadaj `id` i odpowiedziom `id`
   (patrz `src/questions.js`).
2. **Katalog** — dla każdego auta dodaj atrybuty, których użyją kryteria
   (`usage`, `priorities`, `body`, `seats`, `powertrains`… — nazwij po swojemu).
3. **Kryteria** — dla każdego pytania wybierz typ (A–E), wagę i wskaż `attr`.
   Wagi → suma 1.0.
4. **Tabele dziedzinowe** — progi (CAPACITY), macierz podobieństwa (SIMILARITY),
   funkcja wariantów (GRADED SET). To Twoja wiedza o produktach.
5. **Polityki** — `prioritizeCompliant`, liczba alternatyw, podłoga/sufit %.
6. **Testy kalibracyjne** — kilka oczywistych profili → oczekiwany wynik.

Minimalny przykład złożenia (z `engine/bmw.example.js`):

```js
import { createRecommender, affinity, overlap, similarity, capacity, gradedSet }
  from './match-engine.js';

const rec = createRecommender({
  criteria: [
    overlap   ({ id:'priorities', weight:0.28, attr:'priorities' }),
    affinity  ({ id:'usage',      weight:0.22, attr:'usage' }),
    similarity({ id:'body',       weight:0.18, attr:'body', matrix: BODY_SIM, anyValue:'any' }),
    gradedSet ({ id:'powertrain', weight:0.18, attr:'powertrains', table: powertrainTable, requirement:'rodzaj napędu' }),
    capacity  ({ id:'passengers', weight:0.14, attr:'seats', required:a=>SEATS_REQUIRED[a]??1, requirement:'liczba pasażerów' }),
  ],
});

const { best, alternatives, ranking } = rec.recommend(answers, KATALOG);
```

---

## 10. Pliki referencyjne

| Plik | Rola |
|---|---|
| `engine/match-engine.js` | **Sam algorytm** — silnik + 5 fabryk kryteriów (bez wiedzy o BMW) |
| `engine/bmw.example.js`  | Przykład: złożenie wybieracza BMW na ogólnym silniku |
| `test/parity.test.mjs`   | Dowód: ogólny silnik = oryginał na 4860 kombinacjach |
| `src/recommender.js`     | Oryginalna (zwarta) implementacja tego samego algorytmu |
```
