# Security Protocol — POSIO / BACIK

Statyczna, mobilna mini gra typu escape game dla dwóch graczy. Projekt nie wymaga Node.js, backendu ani bazy danych — działa bezpośrednio na GitHub Pages.

## Uruchomienie lokalne

Najprościej otworzyć `index.html` w przeglądarce. Do testowania audio i zachowania zbliżonego do hostingu można uruchomić dowolny prosty serwer statyczny, np. rozszerzenie Live Server w VS Code. Nie jest wymagany build.

## Konfiguracja gry

Wszystkie dane znajdują się na początku pliku `js/app.js`, w sekcji `GAME_CONFIG`:

- treści zagadek zmieniaj w `stages[].puzzleText`,
- odpowiedzi zmieniaj w `stages[].answer`,
- cyfry etapów zmieniaj w `stages[].digit`,
- PIN POSIO zmieniaj w `GAME_CONFIG.posio.finalPin`,
- PIN BACIKA zmieniaj w `GAME_CONFIG.bacik.finalPin`,
- ścieżki nagrań zmieniaj w polach `audio` i `finalAudio`.

Odpowiedzi są porównywane bez uwzględniania wielkości liter oraz spacji na początku i końcu.

## Audio

Pliki MP3 umieść w folderze `audio/`. Wymagane nazwy:

```text
posio_01.mp3  posio_02.mp3  posio_03.mp3  posio_final.mp3
bacik_01.mp3  bacik_02.mp3  bacik_03.mp3  bacik_final.mp3
```

Zdjęcia i inne grafiki umieszczaj w folderze `assets/images/`. Możesz odwoływać się do nich w aplikacji ścieżką względną, np. `./assets/images/zagadka-01.jpg`.

Brak pliku nie zatrzymuje gry: pojawi się komunikat trybu testowego, a po sekundzie gra przejdzie dalej. Brak jest też logowany w konsoli przeglądarki.

## Linki i debug

Parametr QR bezpośrednio wybiera gracza:

```text
?player=posio
?player=bacik
```

Przykładowo po wdrożeniu: `https://USERNAME.github.io/REPO/?player=posio`.

Tryb developerski włącz przez dopisanie `&debug=1`, np. `?player=posio&debug=1`. Panel pozwala resetować zapis, czyścić storage, pomijać etapy i przechodzić do konkretnego etapu lub finału. Bez `debug=1` panel nie jest renderowany.

Postęp jest zapisywany osobno jako `security_game_posio` i `security_game_bacik` w `localStorage`.

## GitHub Pages

1. Utwórz repozytorium i wgraj pliki projektu.
2. W ustawieniach repozytorium wybierz **Settings → Pages**.
3. Jako źródło wybierz branch (np. `main`) i folder `/ (root)`.
4. Po publikacji użyj dwóch adresów do kodów QR:
   - `https://USERNAME.github.io/REPO/?player=posio`
   - `https://USERNAME.github.io/REPO/?player=bacik`

Wszystkie zasoby mają ścieżki względne (`./...`), więc działają również w repozytorium publikowanym jako podkatalog.
