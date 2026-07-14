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

## Pliki warte uwagi

- `src/audio/AudioEngine.ts` – silnik dźwiękowy
- `src/pose/useBodyMapping.ts` – przetwarzanie pozycji ciała
- `src/pose/PoseCameraView.tsx` – kamera MediaPipe
- `src/screens/ConductorScreen.tsx` – główny ekran aplikacji

Powodzenia! To solidny szkielet pod dalszą rozbudowę.