# Plan optymalizacji — Body Conductor MVP

Dokument roboczy na później. Stan na lipiec 2026, po działającym pipeline (szkielet + audio + wyciszenie bez detekcji).

---

## Cel

- Lepsza **płynność** reakcji audio na ruch (wyższy pipeline FPS)
- Mniejsze **grzanie** telefonu
- Docelowo: **bez podglądu kamery** i **bez overlay szkieletu** na ekranie — tylko sterowanie dźwiękiem

---

## Stan obecny (baseline)

| Warstwa | Interwał | FPS | Plik / miejsce |
|---------|----------|-----|----------------|
| Podgląd kamery (Preview) | ~30 (hardware) | ~30 | CameraX Preview |
| MediaPipe inference | 125 ms | **~8** | `INFERENCE_INTERVAL_MS` w patchu native |
| Bridge → JS | co inference | ~8 | `PoseCameraView` → `onLandmark` |
| Mapping + audio | 100 ms | ~10 (limit teoretyczny) | `POSE_PROCESS_MS` w `sensitivity.ts` |
| Overlay szkieletu | co inference | ~8 | `OverlayView` (native) |
| Layout overlay | 67 ms | ~15 | `LAYOUT_INTERVAL_NS` w patchu |
| Panel debug UI | 1200 ms | ~0,8 | `UI_SYNC_MS` |
| Serial `[BC:pose]` | 1200 ms | ~0,8 | `poseSerialLog.ts` |

**Wąskie gardło:** native inference **8 fps**. JS przy 10 fps i tak nie dostaje więcej klatek.

**Model:** `pose_landmarker_full.task` (9 MB), tylko ten asset jest w APK.  
**Delegate:** `DELEGATE_CPU` (obliczenia ML na **CPU**, nie GPU).  
**Rozdzielczość analizy:** 640×480 (`ANALYSIS_TARGET_SIZE` w patchu).  
**Dodatkowy koszt CPU:** podwójny `Bitmap.createBitmap` + obrót przed każdym inference (`PoseLandmarkerHelper.kt`).

**Dev vs release:** grzanie w dev client (Metro, logi JS) jest **normalne i wyższe** niż w release APK — nie oceniać wydajności produkcyjnej po samym dev.

---

## Gdzie leży obciążenie (szacunek, Samsung S906B, dev + kamera)

| Warstwa | CPU / GPU | Udział w grzaniu |
|---------|-----------|------------------|
| MediaPipe FULL | CPU | ~40–50% |
| Podgląd kamery (Preview) | GPU + ISP | ~20–30% |
| Bitmap kopia + obrót | CPU | ~15–20% |
| Dev client + Metro + logi | CPU | ~10–15% |
| Overlay szkieletu | CPU/GPU | ~3–5% |
| Audio + JS mapping | CPU | ~2–5% |

---

## Szacowany zysk zmian (bez implementacji — orientacyjnie)

### Sam model Lite (640×480, CPU)

- Lite vs Full: **~1,8–2,2×** szybsze inference (benchmarki na słabszym ARM; na Snapdragonie podobny stosunek, wyższe absolutne FPS)
- **Nie ~5×** z samego lite

### Samo obniżenie rozdzielczości (nadal Full)

| Rozdzielczość | Pikseli vs 640×480 | Zysk inference |
|---------------|-------------------|----------------|
| 480×360 | ~56% | ~1,3–1,5× |
| 320×240 | ~25% | ~1,8–2× (gorsza precyzja dłoni) |

### Lite + 480×360 razem

- Realnie **~2,0–2,5×** szybszy tick ML (preprocessing + inference)
- Przy osobie prawie całej w kadrze **480×360** powinno wystarczyć na tułów, ruch, rozstaw dłoni
- **320×240** — ryzyko dla `leftHandHeightRel` / `rightHandHeightRel`

### ~5× szybciej — tylko jako pakiet

Łączy się m.in.: lite (~2×) + niższa rozdzielczość (~1,3×) + headless bez Preview (~1,2×) + GPU delegate (~1,3–1,8×, bywa niestabilne) + optymalizacja bitmap. Samo lite + rozdzielczość **nie daje 5×**.

### Szacowany max inference na S906B (orientacyjnie)

| Konfiguracja | Max inference (CPU) | Sensowny pipeline FPS |
|--------------|---------------------|-------------------------|
| Full 640×480 + kamera (teraz) | ~12–16 fps | 8 fps (throttle) |
| Lite 640×480 | ~18–24 fps | 12–15 fps |
| Lite 480×360 | ~22–30 fps | 15–20 fps |
| Lite 480×360 + headless | +20–30% budżetu | **18–22 fps** stabilnie |

---

## Fazy implementacji

### Faza 0 — Teraz (dev, z kamerą) — bez zmian wydajności

- [ ] Zostawić 8 fps ML — OK na testy funkcjonalne
- [ ] Zbudować **release APK** i porównać grzanie / płynność z dev
- [ ] Nie podnosić FPS przy włączonej kamerze i overlay — najpierw zmierzyć release

### Faza 1 — Szybkie wygrane (mały zakres, opcjonalnie przed headless)

- [ ] Wyłączyć overlay przez flagi `GlobalState` (native) — mniej rysowania
- [ ] Wyrównać `POSE_PROCESS_MS` = `INFERENCE_INTERVAL_MS` (jedna stała `PIPELINE_INTERVAL_MS` w `sensitivity.ts` + komentarz w patchu Kotlin)
- [ ] Wyłączyć / ograniczyć serial log w release (`[BC:pose]`)

### Faza 2 — Model Lite + asset

- [ ] Dodać `pose_landmarker_lite.task` do assets biblioteki / APK (wcześniej brak assetu powodował crash przy lite)
- [ ] Przełączyć `MODEL_POSE_LANDMARKER_LITE` w `MainViewModel` / patchu
- [ ] Przetestować jakość detekcji przy „prawie całym ciele w kadrze”
- [ ] Oszacowany zysk: **~2×** na inference

**Pliki:** patch `@thinksys+react-native-mediapipe`, assets w `node_modules/.../android/src/main/assets/` lub własny katalog assets aplikacji.

### Faza 3 — Niższa rozdzielczość analizy

- [ ] Zmienić `ANALYSIS_TARGET_SIZE` z `640×480` na **`480×360`**
- [ ] Porównać: detekcja, stabilność dłoni, mapping audio
- [ ] Oszacowany zysk: dodatkowe **~1,3–1,5×** (łącznie z lite ~2–2,5×)

**Plik:** patch `CameraFragment.kt` — `ANALYSIS_TARGET_SIZE`.

### Faza 4 — Tryb headless (bez obrazu na ekranie)

Docelowy UI: użytkownik **nie widzi** podglądu kamery; kamera działa tylko pod ML.

- [ ] Native: **nie bindować** `Preview` — tylko `ImageAnalysis`
- [ ] Ukryć / nie aktualizować `OverlayView` (już częściowo przez `isOverlayEnabled()`)
- [ ] JS: `PoseCameraView` może zostać zamontowany z minimalnym rozmiarem albo osobny native flag `headlessMode`
- [ ] Uwaga: samo `opacity: 0` w React **nie odciąża** — Preview dalej jedzie w GPU

Oszacowany zysk: **duży na grzaniu**, zwalnia budżet na wyższy inference FPS.

### Faza 5 — Podniesienie pipeline FPS

Po fazach 2–4:

- [ ] Ustawić wspólną stałą `PIPELINE_INTERVAL_MS` (np. **83 ms → 12 fps** lub **66 ms → 15 fps**)
- [ ] Zsynchronizować: patch `INFERENCE_INTERVAL_MS` + `POSE_PROCESS_MS` w JS
- [ ] Testować: płynność audio, temperatura po 5–10 min sesji, zużycie baterii

**Rekomendowany sweet spot po headless + lite + 480×360:** **12–15 fps** na start, potem ewentualnie 18 fps.

### Faza 6 — Opcjonalnie, wyższy effort

| Zmiana | Zysk | Ryzyko |
|--------|------|--------|
| `DELEGATE_GPU` zamiast CPU | ~1,3–1,8× inference | `GPU_ERROR`, niestabilność wątków |
| Usunięcie podwójnego bitmap (YUV → MPImage bezpośrednio) | ~10–20% CPU | zmiana w `PoseLandmarkerHelper.kt` |
| Niższy `frameLimit` na iOS | tylko iOS | na Android bez efektu |
| Quantized / custom model | zależy | duży effort |

---

## Spójność stałych (do zrobienia przy implementacji)

Jedna stała **nie dla całej aplikacji** — tylko dla rdzenia pipeline (inference + mapping + audio):

```ts
// src/pose/config/sensitivity.ts (propozycja)
export const PIPELINE_INTERVAL_MS = 125; // potem 83 lub 66
export const POSE_PROCESS_MS = PIPELINE_INTERVAL_MS;
```

```kotlin
// patch CameraFragment.kt — ten sam numer + komentarz:
// keep in sync with PIPELINE_INTERVAL_MS in sensitivity.ts
private const val INFERENCE_INTERVAL_MS = 125L
```

**Celowo osobno** (nie scalać z pipeline):

- `UI_SYNC_MS` (1200) — panel debug, rzadkie `setState`
- `DETECTION_TIMEOUT_MS` (2000) — timeout „zgubiono ciało”
- Audio smoothing (~45 ms) — wypełnia luki między tickami
- Layout overlay (~67 ms) — tylko układ widoku

---

## Kryteria sukcesu (testy po każdej fazie)

1. **Detekcja** — kropka „wykryto” stabilna przy typowej pozycji użytkownika
2. **Audio** — reaguje na ruch, wycisza się bez detekcji
3. **Płynność** — subiektywnie mniej „skoków” w `overallMovement` → volume
4. **Temperatura** — po 10 min sesji: porównanie z baseline (release, nie dev)
5. **Bateria** — opcjonalnie: %/h w headless vs z kamerą

---

## Kolejność rekomendowana (skrót)

```
Teraz:     release build → pomiar baseline
Potem:     lite model + asset → 480×360 → headless → 12–15 fps pipeline
Opcja:     GPU delegate tylko jeśli CPU dalej za wolno
Nie teraz: podnoszenie FPS przy włączonej kamerze w dev
```

---

## Powiązane pliki w repo

| Obszar | Ścieżka |
|--------|---------|
| Stałe JS | `src/pose/config/sensitivity.ts` |
| Pipeline JS | `src/conductor/hooks/usePoseFramePipeline.ts` |
| Kamera JS | `src/pose/camera/PoseCameraView.tsx` |
| Sesja | `src/conductor/hooks/useConductorSession.ts` |
| Audio wyciszenie | `src/audio/silence.ts`, `src/audio/config.ts` |
| Patch native | `patches/@thinksys+react-native-mediapipe+0.0.21.patch` |
| Model helper | `node_modules/.../PoseLandmarkerHelper.kt` |
| Asset modelu | `.../android/src/main/assets/pose_landmarker_full.task` (lite brak) |

---

## Notatki

- Wcześniejszy crash przy lite: brak `pose_landmarker_lite.task` w APK — przy Fazie 2 trzeba **fizycznie dodać plik**.
- `frameLimit={12}` w `PoseCameraView` działa **tylko na iOS** — na Samsungie bez efektu.
- Użytkownik jest prawie cały w kadrze → niższa rozdzielczość analizy ma sens; kluczowe jest zachowanie precyzji dłoni pod mapowanie audio.