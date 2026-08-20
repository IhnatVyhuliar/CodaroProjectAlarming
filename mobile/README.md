# Codaro — aplikacja mobilna (Expo)

**Zastosowanie docelowe (Track A — tickets & dispatch): serwis wind dla wspólnot i spółdzielni
mieszkaniowych.** Zgłoszenia przychodzą od mieszkańców i zarządów budynków — często z wnętrza
kabiny, gdy ktoś jest uwięziony. Dlatego zgłoszenie ma flagę **uwięzienia** (wymusza pilność
krytyczną i wchodzi na czoło kolejki AI), **adres obiektu** i **oznaczenie windy**, a lokalizacja
obiektu jest pokazywana **bezpośrednio na mapie w ekranie** (kafle OpenStreetMap, bez klucza API)
wraz z przyciskiem „Nawiguj" do Google/Apple Maps.

Frontend obejmuje: panel zgłaszającego, panel dyspozytora i panel pracownika serwisu.
Kontrakt HTTP oraz lista brakujących endpointów backendu: [`../docs/frontend-api-contract.md`](../docs/frontend-api-contract.md).

## Uruchomienie

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npx expo start --dev-client
```

Wymagany jest **expo-dev-client** (aparat, mikrofon, lokalizacja, WebRTC/LiveKit nie działają w Expo Go).
Build developerski: `eas build --profile development --platform android|ios`.

### Tryb demonstracyjny (bez backendu)

Backend nie udostępnia jeszcze endpointów domenowych, dlatego w buildzie developerskim domyślnie
działa **adapter demonstracyjny** (`EXPO_PUBLIC_API_MODE=mock`) — w pamięci, z pełnym zestawem
danych: statusami, przejściami statusów, kolejką, przydziałami i powiadomieniami.
Build produkcyjny **zawsze** korzysta z prawdziwego API.

Konta testowe (hasło `haslo123`):

| Rola | E-mail |
|---|---|
| Zgłaszający — mieszkanka, Kwiatowa 12 | `klient@codaro.test` |
| Zgłaszający — zarząd Wspólnoty Słoneczna 5 | `klient2@codaro.test` |
| Dyspozytor serwisu | `admin@codaro.test` |
| Kierownictwo serwisu (hiperadmin) | `hiperadmin@codaro.test` |
| Technik windowy (przydział do jednego zadania) | `technik@codaro.test` |
| Konserwator (przydział do całego zgłoszenia) | `konserwator@codaro.test` |
| Elektryk (bez aktywnych zadań) | `elektryk@codaro.test` |

Dane demo zawierają m.in. dwa zgłoszenia uwięzienia w kabinie (Kwiatowa 12 winda A, Parkowa 3
winda towarowa), awarię „winda staje między piętrami", naprawę drzwi kabiny z przydziałem
technika tylko do jednego zadania oraz zamknięty przegląd okresowy.

Przełączenie na prawdziwe API: `EXPO_PUBLIC_API_MODE=live` + działający backend
(`docker compose up -d` w katalogu `docker/`).

## Skrypty

```bash
npm run typecheck   # tsc --noEmit
npm test            # jest (projekty: app + node)
npx jest --selectProjects app    # tylko testy UI/logiki (bez wymaganego backendu)
npm run lint        # expo lint (wymaga konfiguracji ESLint — patrz niżej)
```

`npx jest --selectProjects node` uruchamia test łączności z backendem
(`src/api/client.node.test.ts`) i wymaga uruchomionego Dockera na `http://localhost:8000`.

ESLint nie jest jeszcze skonfigurowany w repozytorium — `npm run lint` przy pierwszym uruchomieniu
poprosi o instalację konfiguracji Expo.

## Struktura

```
app/                       # trasy Expo Router
  (auth)/                  # logowanie, odzyskiwanie hasła
  (client)/                # pulpit, zgłoszenia, kreator, requesty, powiadomienia, profil
  (admin)/                 # pulpit, kolejka, zgłoszenia, przydziały, powiadomienia, profil
  (staff)/                 # aktualne zadania, szczegóły zadania, powiadomienia, profil
src/
  api/                     # klient HTTP, typy, endpointy, adapter demonstracyjny (mock/)
  auth/                    # sesja (zustand), bezpieczny magazyn tokena, mapowanie ról
  components/              # komponenty współdzielone (+ ui/, media/)
  features/                # ekrany per rola (testowalne, trasy są cienkimi wrapperami)
  hooks/queries/           # TanStack Query per zasób
  offline/                 # stan sieci, kolejka operacji offline
  realtime/                # Echo/Reverb, mapowanie zdarzeń na cache
  notifications/           # rejestracja push
  test-utils/              # render z providerami, reset danych demo
```

Zasady, które trzymamy w tym frontendzie:

- **statusy i przejścia zawsze z API** (`available-status-transitions`) — brak lokalnych list statusów,
  pusta lista przejść = brak przycisku zmiany statusu;
- **klient wybiera wyłącznie stanowisko**, nigdy pracownika ani służby;
- **dane wykonawcy pokazujemy dopiero po aktywnym przydziale** — bo dopiero wtedy zwraca je API;
- uprawnienia pochodzą z pola `capabilities` w odpowiedzi API (`PermissionGate`), nie z roli w UI;
- każdy widok obsługuje stany: ładowanie, błąd, pusta lista, brak połączenia i operacje oczekujące.
