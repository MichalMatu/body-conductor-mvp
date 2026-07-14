# Idea — Body Conductor / Air DJ

Notatki produktowe i wizja — żeby pomysł nie zginął. Uzupełniaj w miarę rozwoju projektu.

---

## Jedno zdanie

**Ciało jako żywy mikser** — każda część (dłoń, łokieć, tułów) ma własny wpływ na dźwięk; zmiany **płynnie się nakładają**. Nie fitness z licznikiem kalorii, tylko **air DJ / body instrument** na telefonie.

---

## North star

Gram całym ciałem — nie sliderem, nie klawiaturą. Gest = efekt z wyczuciem. Później: wiele generatorów + filtry na zewnętrznym audio (np. stream).

---

## Gest → efekt (mapa pomysłów)

| Gest / sytuacja | Efekt (wizja) | Status techniczny |
|-----------------|---------------|-------------------|
| Prawa ręka — ruch okrężny (lasso) | „Helikopter” po prawej stronie (pan + modulacja / chop) | Wymaga **prędkości okrężnej**, nie tylko `rightHandSpeed` |
| Wymachy ramion | Podobny vibe, inny charakter (duży łuk vs mały okrąg) | Wymaga **rozróżnienia gestu** (amplituda bark–nadgarstek) |
| Wymachy w przeciwne strony | Dźwięk rozjeżdża się stereo (L ↔ P) | Blisko — `leftHandSide` / `rightHandSide` → `pan` |
| Boksowanie | Pojedyncze krople / „puk puk” (perkusja one-shot) | Wymaga **triggerów** + sampler / burst, nie ciągły osc |
| Dłoń blisko ust | Warstwa „przy ustach” (inny timbre / głośność) | Cecha `handToMouth` z odległości 15/16 ↔ 9/10 |
| Dłoń przy głowie | Inna warstwa niż usta | Cecha `handToHead` (nadgarstek ↔ nos 0, uszy 7/8) |
| Lewa / prawa dłoń osobno | Osobne mapowanie na ton, pan, efekt | Częściowo — osobne reguły L/P |
| Łokieć nisko / wysoko | Osobny wpływ (np. cutoff, delay) | Kąt ✅; wysokość łokcia — do dodania |
| Tułów / otwarcie ciała | Sub, przestrzeń, głośność bazowa | Częściowo — `bodyOpenness`, `torsoCenterY` |

---

## Architektura docelowa (3 warstwy)

```
POSE (33 punkty + prędkości)
  → CECHY (odległości, kąty, okrężność, strefy głowy, uderzenia)
    → GEST / WARSTWA (lasso, wymach, boks, usta, głowa…)
      → PRESET AUDIO (wagi, nie twarde on/off)
        → GENERATOR(Y) + FILTRY → wyjście
```

### Nakładanie (continuous mixing)

Nie „albo usta, albo nic” — np.:

- dłoń przy ustach → +30% warstwy „voice-ish”
- łokieć wysoko → jaśniejszy filtr
- wolny ruch → ciszej

`MappingEngine` już miesza reguły wagami — brakuje cech strefowych i warstw per gest.

---

## Fazy produktu

### Faza 1 — teraz (MVP)

- 1 generator (osc × 3 + filter + delay + pan)
- Mapowanie ciągłe: ręce → ton, ruch → volume, postawa → przestrzeń
- Cel: **jedno brzmienie, wiele pokrędeł ciała**

### Faza 2 — strefy i wyczucie

- Cechy bliskości: `left/right HandToMouth`, `left/right HandToHead`
- Łokcie L/P: wysokość + kąt osobno
- Płynne wagi 0→1 (nie binary)
- Osobne mapowanie `pan` per ręka (nie mieszane 50/50)
- Presety: `LassoRight`, `SwingStereo`, `MouthZone`

### Faza 3 — air DJ

- `GestureEngine` (heurystyki: okrąg, łuk, punch)
- Przełączanie / mieszanie `MappingConfig` per gest
- Multi-generator (drone / helikopter / perkusja / deszcz)
- Bus mixer — każda warstwa z głośnością sterowaną ciałem

### Faza 4 — zewnętrzne audio

- Filtry na strumieniu (YouTube, plik) — ciało steruje cutoff, pan, gate, delay
- **Uwaga:** TOS YouTube, prawa autorskie, opóźnienia — osobna faza prawna i techniczna

---

## Co już mamy vs co dołożyć

### Dane z API (mamy)

- 33× `landmarks` (x, y, z, visibility)
- 33× `worldLandmarks` (3D)
- 11 punktów „twarzy” w BlazePose (0–10) — **nie** Face Landmarker 468

### Cechy (mamy / brakuje)

| Cecha | Status |
|-------|--------|
| Kąt łokcia L/P | ✅ |
| Pozycje względne dłoni, rozstaw, otwarcie | ✅ |
| Prędkość liniowa rąk, overall movement | ✅ |
| `z` / worldLandmarks w mapowaniu | ❌ (dane są, nieużywane) |
| Odległość dłoń–usta / dłoń–głowa | ❌ |
| Prędkość kątowa | ❌ |
| Zbliżanie / oddalanie od kamery | ❌ |
| Rozpoznanie gestu (lasso, boks) | ❌ |
| One-shot / sampler (puk, kropla) | ❌ |

### Face Landmarker (468 punktów)

- **Nie** w `@thinksys/react-native-mediapipe` (tylko Pose)
- Możliwe później: osobny model native lub zostać przy 11 punktach twarzy z pozy
- Do ust/głowy wystarczą odległości nadgarstek ↔ punkty 0–10

---

## Kolejność kalibracji (rekomendacja)

1. Strefy głowy (4 cechy bliskości L/P × usta/głowa)
2. Łokcie L/P (wysokość + kąt)
3. Stereo wymachy (pan per ręka) — szybki „wow”
4. Okrężność nadgarstka → „helikopter”
5. Triggery uderzenia → boks / krople
6. Multi-generator

---

## Rynek i inspiracje

### Podobne projekty

| Projekt | Uwaga |
|---------|--------|
| [Google Body Synth](https://creatability.withgoogle.com/body-synth/) | Web demo 2018, **brak publicznego kodu** — tylko inspiracja UX |
| [Semi-Conductor](https://github.com/googlecreativelab/semi-conductor) | Open source Apache 2.0, web, PoseNet + Tone.js — archiwum |
| [creatability-components](https://github.com/googlecreativelab/creatability-components) | Web components + pose input, nie cały Body Synth |
| [Gestrument](https://gestrument.com/) → [Reactional Music](https://reactionalmusic.com/) | Pivot z appki consumer na B2B (muzyka w grach) |
| [MusiKraken](https://musikraken.com/) | Body pose → MIDI, desktop |
| MiMU Gloves, Wave Ring | Hardware, scena artystyczna |

### Body Synth — nie kopiować, pożyczać ideę

```
❌ Nie fork Body Synth — kod źródłowy niedostępny
❌ Nie przepisywać na web / Tone.js — strata native mobile
✅ Zostać przy RN + MediaPipe + MappingEngine
✅ Pożyczyć: część ciała = kanał, czułość ruchu, szybka gratyfikacja dźwiękowa
```

### Body Synth parity checklist (do zrobienia na naszym stacku)

- [ ] Każda część ciała → osobny wpływ audio (L/P dłoń, łokieć, tułów)
- [ ] Slider / preset czułości ruchu
- [ ] Zmiana „instrumentu” / presetu (UI lub gest)
- [ ] Natychmiastowy dźwięk przy ruchu (niski latency, dobre domyślne mapowanie)
- [ ] Accessibility — duże gesty, czytelny feedback (kropka detekcji, opcjonalnie overlay)

---

## Potencjał komercyjny (skrót)

| Ścieżka | Realność |
|---------|----------|
| Consumer masowy (Spotify-scale) | Niski |
| Nisza: performerzy, wellness, creator tool | Średni |
| Sub + preset packi (Helikopter, Boks, Deszcz…) | Średni |
| Pro: MIDI, nagrywanie sesji, custom mapping | Wyższy ARPU |
| B2B: instalacje, eventy, terapia ruchem | Najlepszy unit economics |

**Pozycjonowanie:** Body Instrument / Movement Sound Bath / Air DJ Lab — nie „apka z MediaPipe”.

**Najpierw:** jeden generator, ale gesty z wyczuciem + 30 s magicznego nagrania demo. Potem multi-generator i zewnętrzne audio.

---

## Powiązane dokumenty

- [OPTIMIZATION_PLAN.md](./OPTIMIZATION_PLAN.md) — wydajność, lite model, headless
- [SKELETON_AND_POSE_DATA.md](./SKELETON_AND_POSE_DATA.md) — overlay, landmarky, API

---

*Ostatnia aktualizacja: lipiec 2026 — sesja wizji air DJ, gesty, Body Synth, rynek.*