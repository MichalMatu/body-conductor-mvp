# Body Conductor MVP

Elastyczny system mapowania pozycji całego ciała na generator dźwięku (spatial audio).

## Szybki start

1. **Sklonuj / rozpakuj projekt**
2. Zainstaluj zależności:
   ```bash
   npm install
   ```
3. Dla iOS:
   ```bash
   cd ios && pod install
   ```
4. Dla Androida (Samsung S22 Plus):
   - Upewnij się, że telefon jest podłączony przez USB z włączonym debugowaniem.
   - Uruchom build:
     ```bash
     npx expo run:android --device
     ```
     lub
     ```bash
     cd android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk
     ```

   Uwaga: Wymagany development build (nie działa w Expo Go ze względu na natywne moduły MediaPipe + react-native-audio-api).

## Co działa w tym MVP (rozbudowany)

- Detekcja całego ciała przez MediaPipe BlazePose (`@thinksys/react-native-mediapipe`)
- Bogaty system cech ciała (~15+ parametrów): wysokość rąk względem barków, otwartość ciała, kąty łokci, prędkości ruchu itd.
- **Elastyczny system mapowania** (deklaratywny):
  - `MappingRule` — dowolna cecha ciała → dowolny parametr audio
  - Krzywe, wagi, zakresy
  - Gotowe presety: Default / Energetic / Atmospheric
- Znacznie rozbudowany silnik audio:
  - Dwa oscylatory (saw + sine)
  - Filtr lowpass z rezonansem
  - Delay z feedbackiem
  - Stereo panner + master gain
  - Wygładzanie parametrów (brak artefaktów)
- Prędkość ruchu ciała wpływa na dźwięk (velocity mapping)

## Jak rozwijać dalej

- Twórz nowe presety w `src/mapping/presets.ts`
- Dodawaj nowe cechy ciała w `src/pose/bodyFeatures.ts`
- Rozbudowuj łańcuch efektów w `AudioEngine.ts` (reverb, distortion, więcej głosów)
- Dodaj prędkość i przyspieszenie do mapowań (już częściowo działa)
- Zaimplementuj prawdziwy 3D PannerNode gdy biblioteka go w pełni wspiera
- UI do edycji mapowań na żywo

## Dokumentacja

Szczegóły techniczne w katalogu [`docs/`](./docs/):

- [Wizja produktu — air DJ, gesty, rynek](./docs/idea.md)
- [Szkielet, overlay i dane z API](./docs/SKELETON_AND_POSE_DATA.md)
- [Plan optymalizacji wydajności](./docs/OPTIMIZATION_PLAN.md)

## Pliki warte uwagi

- `src/audio/engine/AudioEngine.ts` – silnik dźwiękowy
- `src/pose/pipeline/useBodyMapping.ts` – przetwarzanie pozycji ciała
- `src/pose/camera/PoseCameraView.tsx` – kamera MediaPipe
- `src/conductor/screens/ConductorScreen.tsx` – główny ekran aplikacji

Powodzenia! To solidny szkielet pod dalszą rozbudowę.