# Body Conductor — instrukcja użytkowania

Screenshoty z testu na Samsungu (14.07.2026) są w folderze `docs/screenshots/`.

## Ważne: to nie jest zwykła apka ze sklepu

Zainstalowany plik to **Expo Development Build** — „powłoka deweloperska”. Po otwarciu ikony **Body Conductor** najpierw widzisz ekran łączenia z komputerem, a dopiero potem właściwą aplikację.

**Nie musisz logować się na expo.com** do pracy lokalnej przez USB.

---

## Jak uruchomić (za każdym razem)

### 1. Podłącz telefon kablem USB
Włącz **debugowanie USB** na telefonie.

### 2. Na Macu — uruchom serwer deweloperski

```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home
cd /Users/michal/Desktop/body-conductor-mvp
adb reverse tcp:8081 tcp:8081
npx expo start --dev-client --localhost
```

Zostaw ten terminal włączony.

### 3. Na telefonie — otwórz Body Conductor

1. Otwórz apkę **Body Conductor**
2. Poczekaj aż pojawi się serwer `http://localhost:8081` (zielona kropka)
3. Kliknij ten adres **albo** wpis w sekcji „Recently opened”
4. Przy pierwszym uruchomieniu może wyskoczyć menu deweloperskie Expo → kliknij **Continue** lub zamknij (X)

---

## Ekrany aplikacji (co widzisz)

### Ekran 1 — Dev Client szuka serwera
![Szuka serwera](screenshots/01-startup.png)

Metro nie działa na Macu. Aplikacja kręci „Searching for development servers…”.

**Co zrobić:** uruchom `npx expo start --dev-client --localhost` (krok 2 powyżej).

---

### Ekran 2 — Wybór serwera deweloperskiego
![Wybierz serwer](screenshots/02-dev-client-wybierz-serwer.png)

Serwer jest widoczny. Kliknij **`http://localhost:8081`**.

---

### Ekran 3 — Główny ekran (dźwięk wyłączony)
![Główny — dźwięk off](screenshots/03-glowny-dzwiek-wylaczony-thumb.png)

| Element | Znaczenie |
|---------|-----------|
| Pomarańczowy pasek u góry | Brak klucza QuickPose — trzeba go wkleić w kodzie |
| Podgląd kamery | QuickPose śledzi ciało (tu: błąd klucza SDK) |
| „Dźwięk wyłączony” | Silnik audio nie gra |
| „nie widać ciała” | Kamera nie widzi sylwetki (lub zły klucz SDK) |
| Default / Energetic / Atmospheric | Presety dźwięku — **szare = zablokowane** dopóki dźwięk jest wyłączony |
| **WŁĄCZ DŹWIĘK** | Startuje generator dźwięku |

---

### Ekran 4 — Główny ekran (dźwięk włączony)
![Główny — dźwięk on](screenshots/04-glowny-dzwiek-wlaczony-thumb.png)

| Element | Znaczenie |
|---------|-----------|
| „Dźwięk włączony” | Słyszysz ambient / syntezator |
| Presety | Teraz można je przełączać |
| **WYŁĄCZ DŹWIĘK** | Zatrzymuje audio |
| ERROR QuickPose | **Klucz SDK jest nieprawidłowy** — detekcja ciała nie działa |

---

### Ekran 5 — Preset „Energetic”
![Energetic](screenshots/05-preset-energetic-thumb.png)

Bardziej dynamiczne mapowanie ruchu → dźwięk (głośniej, żywiej).

---

### Ekran 6 — Preset „Atmospheric”
![Atmospheric](screenshots/06-preset-atmospheric-thumb.png)

Bardziej przestrzenny, spokojny charakter dźwięku.

---

## Jak używać aplikacji (gdy już działa)

1. **Ustaw klucz QuickPose** w pliku `.env` → `EXPO_PUBLIC_QUICKPOSE_SDK_KEY` (wzoruj się na `.env.example`)  
   Darmowy klucz: https://dev.quickpose.ai

2. **Uruchom** według sekcji „Jak uruchomić” (Metro + telefon).

3. **Stań przed kamerą** (frontalna) — status zmieni się na zielone **„ciało widoczne”**.

4. Kliknij **WŁĄCZ DŹWIĘK**.

5. **Ruszaj ciałem:**
   - podnosisz ręce → zmienia się wysokość dźwięku
   - rozkładasz ręce → przestrzeń / delay
   - szybszy ruch → głośniej i jaśniej

6. Przełączaj presety: **Default**, **Energetic**, **Atmospheric**.

---

## Wynik testu na Twoim telefonie (14.07.2026)

| Funkcja | Status |
|---------|--------|
| Instalacja APK | ✅ Działa |
| Połączenie z Metro przez USB | ✅ Działa |
| Interfejs (przyciski, presety) | ✅ Działa |
| Kamera | ✅ Działa |
| Włączanie / wyłączanie dźwięku | ✅ Działa |
| Przełączanie presetów | ✅ Działa |
| Detekcja ciała (QuickPose) | ❌ **SDK Key Invalid** — placeholder `TWOJ_KLUCZ_Z_dev.quickpose.ai` |
| Mapowanie ruchu na dźwięk | ❌ Zablokowane bez ważnego klucza i widocznego ciała |

**Podsumowanie:** Aplikacja **częściowo działa**. UI i audio OK. Śledzenie ciała wymaga wklejenia prawdziwego klucza QuickPose i stanu przed kamerą.

---

## Częste problemy

**Biały / czarny ekran „Przygotowywanie kamery…”**  
→ Upewnij się, że Metro działa i kliknąłeś serwer `localhost:8081`.

**„There was a problem loading the project” (błąd 500)**  
→ Na Macu: `npm install`, potem ponownie `npx expo start --dev-client --localhost`.

**„SDK Key Invalid” na środku ekranu**  
→ Wklej klucz z https://dev.quickpose.ai do `.env`, przeładuj apkę (menu deweloperskie → Reload).

**Nie słychać dźwięku**  
→ Kliknij **WŁĄCZ DŹWIĘK**, sprawdź głośność telefonu.