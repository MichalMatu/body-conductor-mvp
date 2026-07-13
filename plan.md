# Plan MVP: Body Conductor – Mapowanie pozycji ciała na dźwięk (spatial)

## 1. Cel aplikacji (MVP)

Stworzyć **elastyczny system**, w którym:
- Użytkownik stoi/siedzi/leży przed kamerą telefonu
- Aplikacja w czasie rzeczywistym wykrywa pozycję całego ciała
- Zmiany pozycji kluczowych punktów ciała (keypoints) wpływają na parametry generatora dźwięku
- Dźwięk jest **spatial** (3D positioning)
- Użytkownik może „dyrygować” całym ciałem – dowolny ruch wpływa na dźwięk
- System ma być szeroki i łatwy do rozbudowy (nie ograniczony do konkretnych ćwiczeń)

**Główne założenia MVP:**
- Pełna elastyczność mapowania
- Spatial audio od razu
- Szybki, solidny szkielet do dalszej rozbudowy
- Głównie offline

---

## 2. Wybrany Stack (2026)

| Warstwa                    | Technologia                              | Dlaczego |
|---------------------------|------------------------------------------|----------|
| Baza projektu             | **Expo SDK 52+** (New Architecture)      | Najszybszy start, dobre wsparcie kamery |
| Detekcja pozy             | **QuickPose React Native**               | Najłatwiejsza integracja MediaPipe + dostęp do raw keypoints |
| Generator dźwięku         | **react-native-audio-api**               | Web Audio API w React Native + **natywny spatial audio** + generowanie w czasie rzeczywistym |
| Stan aplikacji            | **Zustand**                              | Lekki, prosty, reaktywny |
| Nawigacja                 | `@react-navigation/native-stack`         | Prosta i wystarczająca na MVP |
| UI (opcjonalnie)          | NativeWind lub zwykły RN                 | Szybki rozwój interfejsu |

**Dlaczego ten stack?**
- QuickPose = najszybsza droga do działającej detekcji na telefonie
- react-native-audio-api = obecnie najlepsze narzędzie do real-time audio + spatial w React Native
- Łatwo rozbudować później (dodawanie presetów, zapis mapowań, więcej efektów)

---

## 3. Architektura MVP

```
src/
├── audio/                  # Audio engine + spatial
│   └── AudioEngine.ts
├── pose/                   # Logika przetwarzania keypoints
│   └── useBodyMapping.ts
├── stores/                 # Globalny stan
│   └── useAppStore.ts
├── components/             # Komponenty UI
│   └── ConductorScreen.tsx
├── utils/                  # Mapowania i helpery
│   └── mappings.ts
└── App.tsx
```

**Przepływ danych:**
1. QuickPose → zwraca keypoints co klatkę
2. `useBodyMapping` → oblicza przydatne wartości (kąty, odległości, pozycje)
3. Zustand Store → przechowuje aktualne wartości
4. AudioEngine → nasłuchuje zmian i aktualizuje parametry dźwięku (pitch, panner, filter itd.)

---

## 4. Instrukcja krok po kroku (Szybki start)

### Krok 1: Utworzenie projektu

```bash
npx create-expo-app@latest body-conductor --yes
cd body-conductor
```

### Krok 2: Instalacja zależności

```bash
# Core
npm install quickpose-react-native-pose-estimation
npm install react-native-audio-api
npm install zustand

# Nawigacja
npm install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context

# Opcjonalnie (ładniejszy UI)
npm install nativewind
npx expo install tailwindcss
```

Dla iOS:
```bash
cd ios && pod install
```

### Krok 3: Uzyskaj klucz QuickPose

1. Wejdź na: https://dev.quickpose.ai
2. Zarejestruj się i pobierz darmowy klucz SDK
3. Wklej go w komponencie kamery

### Krok 4: Podstawowa struktura plików

Stwórz foldery według sekcji 3.

### Krok 5: Najważniejsze pliki (szkielet)

#### `src/stores/useAppStore.ts`
```ts
import { create } from 'zustand';

interface AppState {
  keypoints: any;
  setKeypoints: (kps: any) => void;
  
  // Przykładowe mapowane wartości
  leftWristY: number;
  rightWristX: number;
  shoulderDistance: number;
  
  updateBodyValues: (values: Partial<AppState>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  keypoints: null,
  setKeypoints: (kps) => set({ keypoints: kps }),
  
  leftWristY: 0,
  rightWristX: 0,
  shoulderDistance: 0,
  
  updateBodyValues: (values) => set(values),
}));
```

#### `src/audio/AudioEngine.ts` (najważniejszy plik)
Użyj `react-native-audio-api` do stworzenia:
- Oscylatora
- Spatial PannerNode
- Filtra
- Gain

Przykład struktury:
- `createAudioGraph()`
- Metody do aktualizacji parametrów (np. `setFrequency()`, `setPannerPosition()`)

#### `src/pose/useBodyMapping.ts`
Hook, który:
- Bierze keypoints z QuickPose
- Oblicza przydatne wartości (np. pozycja Y lewego nadgarstka, odległość między ramionami)
- Wysyła je do store

#### `src/components/ConductorScreen.tsx`
Główny ekran z:
- `<QuickPoseCamera />`
- `onResults` → przetwarzanie keypoints
- Przyciski do włączania/wyłączania dźwięku

---

## 5. Mapowanie pozycji ciała → dźwięk (koncepcja)

W MVP proponuję prosty, ale rozszerzalny system:

```ts
// Przykład konfiguracji mapowania
const bodyToAudioMap = {
  leftWristY: {
    target: 'oscillator.frequency',
    minInput: 0,
    maxInput: 1,
    minOutput: 200,
    maxOutput: 1200,
  },
  rightWristX: {
    target: 'panner.positionX',
    minInput: -1,
    maxInput: 1,
    minOutput: -1,
    maxOutput: 1,
  },
  // Dodawaj kolejne...
};
```

Dzięki temu w przyszłości możesz:
- Tworzyć presety mapowań
- Zapisywać własne konfiguracje
- Mapować dowolny keypoint na dowolny parametr audio

**Rekomendowane parametry do mapowania na start:**
- Pozycja Y nadgarstków → pitch / cutoff filtra
- Pozycja X nadgarstków → pozycja spatial (lewo/prawo)
- Odległość między ramionami → głośność lub reverb
- Pozycja bioder → inny oscylator / drugi głos

---

## 6. Co powinno działać po pierwszym uruchomieniu MVP

- Kamera pokazuje obraz + nakładkę szkieletu (QuickPose)
- Po włączeniu dźwięku słychać generator
- Ruch lewej ręki zmienia wysokość dźwięku
- Ruch prawej ręki zmienia pozycję dźwięku w przestrzeni (lewo/prawo)
- System działa w czasie rzeczywistym

---

## 7. Kolejne kroki po MVP (rozbudowa)

1. Dodanie więcej parametrów audio (reverb, delay, multiple voices)
2. System presetów mapowań + zapis w AsyncStorage / SQLite
3. Tryb "learning" – nagrywanie ruchu i przypisywanie do parametrów
4. Głosowe instrukcje / sample'y wysokiej jakości
5. Eksport/import konfiguracji mapowań
6. Wsparcie dla więcej niż jednej osoby (multi-person)

---

## 8. Uwagi techniczne

- **Wydajność**: react-native-audio-api jest zoptymalizowany. QuickPose działa dobrze na większości nowszych telefonów.
- **Spatial Audio**: Biblioteka wspiera pozycjonowanie w 3D – warto to wykorzystać od razu.
- **Android vs iOS**: Na Androidzie spatial działa dobrze. Na iOS jeszcze lepiej (dzięki wsparciu systemowemu).
- **Bateria**: Real-time camera + audio = spore zużycie. Na MVP nie optymalizujemy jeszcze mocno.
- **Offline**: Całość działa lokalnie (QuickPose + audio engine są on-device).

---

## 9. Podsumowanie – co zrobić teraz

1. Stwórz projekt Expo
2. Zainstaluj zależności z sekcji 2
3. Pobierz klucz QuickPose
4. Zaimplementuj kolejno:
   - Store (Zustand)
   - AudioEngine (react-native-audio-api + spatial)
   - Hook do przetwarzania keypoints
   - Główny ekran z kamerą

Po tych krokach będziesz miał solidny, elastyczny szkielet gotowy do dalszego strojenia mapowań.
