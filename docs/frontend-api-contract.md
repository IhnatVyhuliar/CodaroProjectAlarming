# Kontrakt API dla frontendu (Codaro)

Ten dokument opisuje kontrakt HTTP, którego oczekuje aplikacja mobilna (`/mobile`).

> **Zastosowanie docelowe (TRACK A — tickets & dispatch):** serwis wind dla wspólnot
> i spółdzielni mieszkaniowych. Zgłoszenia pochodzą od mieszkańców i zarządów budynków,
> często **z wnętrza kabiny** (osoba uwięziona). Dlatego zgłoszenie ma trzy dodatkowe pola:
> `is_entrapment`, `site_address` (adres budynku) i `device_label` (oznaczenie windy),
> a lokalizacja i dojazd ekipy są elementem krytycznym, nie dodatkiem.

> **Stan na dziś:** backend Laravel zawiera wyłącznie `GET /api/v1/health`.
> **Wszystkie pozostałe endpointy z tego dokumentu nie istnieją i muszą zostać zaimplementowane po stronie backendu.**
> Frontend korzysta z nich przez typowaną warstwę `mobile/src/api/**` oraz z adaptera
> demonstracyjnego (`mobile/src/api/mock/**`), który działa **wyłącznie w trybie developerskim**
> (`__DEV__` i `EXPO_PUBLIC_API_MODE != live`). Build produkcyjny zawsze uderza w prawdziwe API.

Konwencje: prefiks `/api/v1`, autoryzacja `Authorization: Bearer {token}` (Sanctum personal access
token), pojedynczy zasób w `{"data": …}`, listy stronicowane standardowym paginatorem Laravela
(`data` + `meta`), błędy w formacie `{"message": "...", "errors": {"pole": ["..."]}}`.

---

## 1. Zasady, które muszą być egzekwowane po stronie API

Frontend celowo **nie zawiera** logiki autoryzacyjnej — pokazuje tylko to, co zwróci API:

1. Klient nigdy nie otrzymuje listy pracowników ani służb (`GET /staff`, `GET /services` → 403 dla roli `client`).
2. Dane wykonawcy (`assignee`) są zwracane klientowi **wyłącznie dla aktywnych przydziałów**
   (`is_active = true`). Po cofnięciu przydziału dane znikają z odpowiedzi dla klienta, ale
   pozostają w audycie administratora (`include_inactive=1`).
3. Propozycja stanowiska (`PositionSuggestion`) nie nadaje żadnych uprawnień.
4. Pracownik przypisany tylko do requesta otrzymuje minimalny zakres danych zgłoszenia
   (bez rodzeństwa requestów i ich załączników) i nie może zmieniać statusu całego zgłoszenia.
5. Dostępne przejścia statusów wylicza API na podstawie roli, aktywnego przydziału, zakresu
   przydziału i aktualnego statusu. Pusta lista = brak jakiejkolwiek akcji statusowej w UI.
6. Zgłoszenie bez pracownika i służby jest stanem poprawnym (obsługa wyłącznie przez administratora).

Pola `capabilities` w odpowiedziach (`can_add_attachment`, `can_add_note`, `can_suggest_position`,
`can_manage_assignments`, `can_create_request`, `can_close`) są jedynym źródłem prawdy dla
komponentu `PermissionGate` — frontend nie wnioskuje uprawnień z roli.

---

## 2. Autentykacja

| Metoda | Ścieżka | Opis | Status |
|---|---|---|---|
| POST | `/auth/login` | `{email, password}` → `{token, user}` | **do zaimplementowania** |
| POST | `/auth/logout` | unieważnia token bieżącej sesji | **do zaimplementowania** |
| GET | `/auth/me` | `{data: AuthenticatedUser}` — używane przy wznowieniu sesji | **do zaimplementowania** |
| POST | `/auth/forgot-password` | `{email}` → `{message}`; zawsze 200 (brak enumeracji kont) | **do zaimplementowania (opcjonalny)** |

`AuthenticatedUser`: `id, name, email, phone, role[client\|admin\|super_admin\|staff], avatar_url,
position: Position\|null, organization_name`.

Token przechowywany jest w `expo-secure-store` (fallback: pamięć procesu, nigdy AsyncStorage).

## 3. Słowniki

| Metoda | Ścieżka | Opis | Status |
|---|---|---|---|
| GET | `/categories` | `{data: Category[]}` | **do zaimplementowania** |
| GET | `/positions` | `{data: Position[]}` — jedyny słownik „osobowy”, jaki widzi klient | **do zaimplementowania** |
| GET | `/assignment-data-scopes` | `{data: DataScopeOption[]}` (`key,label,description`), tylko dyspozytorzy | **do zaimplementowania** |
| GET | `/status-definitions?entity_type=report\|request` | `{data: StatusRef[]}` — słownik statusów do filtrów | **do zaimplementowania** |

`Position`: `id, name, description, is_active`.
`StatusRef`: `id, key, label, description, color, is_final`.

## 4. Statusy dynamiczne (kluczowe dla UI)

| Metoda | Ścieżka | Opis | Status |
|---|---|---|---|
| GET | `/reports/{report}/available-status-transitions` | `{data: StatusTransitionOption[]}` | **do zaimplementowania** |
| GET | `/requests/{request}/available-status-transitions` | `{data: StatusTransitionOption[]}` | **do zaimplementowania** |
| POST | `/reports/{report}/status` | `{to_status_id, note?, attachment_ids?}` → `{data: ReportDetail}` | **do zaimplementowania** |
| POST | `/requests/{request}/status` | `{to_status_id, note?, attachment_ids?}` → `{data: RequestDetail}` | **do zaimplementowania** |

`StatusTransitionOption`:

```json
{
  "id": 12,
  "to_status_id": 5,
  "key": "closed",
  "label": "Zakończone",
  "description": "Zgłoszenie zamknięte.",
  "color": "#15803D",
  "requires_confirmation": true,
  "requires_note": false,
  "requires_attachment": false
}
```

Walidacja braku notatki/załącznika powinna zwracać `422` z `errors.note` / `errors.attachment_ids` —
frontend pokazuje te komunikaty przy polu formularza.

## 5. Zgłoszenia

| Metoda | Ścieżka | Opis | Status |
|---|---|---|---|
| GET | `/reports?scope=mine\|assigned\|all&status_key=&search=&page=` | paginowana lista `ReportSummary` | **do zaimplementowania** |
| POST | `/reports` | tworzenie zgłoszenia przez klienta (patrz payload niżej) | **do zaimplementowania** |
| GET | `/reports/{report}` | `{data: ReportDetail}` | **do zaimplementowania** |
| GET | `/reports/{report}/history` | `{data: HistoryEntry[]}` (append-only audyt) | **do zaimplementowania** |
| GET/POST | `/reports/{report}/attachments` | lista / upload multipart (`file`, `type`, `request_id?`) | **do zaimplementowania** |
| POST | `/reports/{report}/notes` | `{body, request_id?}` → `{data: HistoryEntry}` | **do zaimplementowania** |
| POST | `/reports/{report}/admin-only` | `{note?}` — zapis decyzji „realizowane wyłącznie przez administratora” | **do zaimplementowania** |
| POST | `/reports/{report}/location-stream/stop` | zatrzymanie transmisji lokalizacji | **do zaimplementowania** |
| GET | `/client/dashboard` | pulpit klienta (aktywne zgłoszenia, ostatnie zmiany, licznik powiadomień, transmisje) | **do zaimplementowania** |

Payload `POST /reports`:

```json
{
  "name": "Uwięziona osoba w kabinie — Kwiatowa 12, winda A",
  "description": "Winda stanęła między 3. a 4. piętrem, w kabinie jedna osoba.",
  "category_id": 1,
  "urgency": "critical",
  "is_entrapment": true,
  "site_address": "ul. Kwiatowa 12, 00-950 Warszawa",
  "device_label": "Winda A (kabina 1)",
  "location_mode": "one_time",
  "location": { "lat": 52.2297, "lng": 21.0122, "accuracy": 12 },
  "suggested_position_id": 3,
  "requests": [
    { "name": "Uwolnienie osoby z kabiny", "description": null, "suggested_position_id": 3 }
  ]
}
```

Wymagania domenowe dla tych pól (backend musi je egzekwować, frontend na nich polega):

- `is_entrapment = true` → `urgency` wymuszone na `critical`, niezależnie od wyboru zgłaszającego;
- `is_entrapment = true` → zgłoszenie ma najwyższą wagę w sortowaniu `sort=ai_priority`
  (mock: `urgency * 2 + 10 za uwięzienie + 1 za dostępną lokalizację`);
- `site_address` i `device_label` są zwracane **także przy zakresie przydziału `minimal`** —
  ekipa musi wiedzieć, gdzie jechać i którego urządzenia dotyczy zadanie;
- `search` na `/reports` i `/queue` obejmuje nazwę, opis, adres obiektu i oznaczenie windy.

`ReportSummary` (pełna lista pól w `mobile/src/api/types.ts`) zawiera m.in. `status: StatusRef`,
`urgency`, `is_entrapment`, `site_address`, `device_label`, `handled_by_admin_only`,
`active_assignments_count`, `open_requests_count`, `location`, `location_mode`, `has_live_stream`,
`client` (tylko dla dyspozytorów), `assigned_admin`.
`ReportDetail` dodaje `requests`, `position_suggestions`, `assignments`, `attachments`,
`media_sessions`, `capabilities`.

## 6. Requesty (pod-zadania)

| Metoda | Ścieżka | Opis | Status |
|---|---|---|---|
| GET | `/requests/{request}` | `{data: RequestDetail}` | **do zaimplementowania** |
| POST | `/reports/{report}/requests` | `{name, description?, suggested_position_id?}` | **do zaimplementowania** |
| GET | `/requests/{request}/history` | historia w zakresie requesta | **do zaimplementowania** |

## 7. Propozycje stanowisk

| Metoda | Ścieżka | Opis | Status |
|---|---|---|---|
| GET | `/reports/{report}/position-suggestions` | `{data: PositionSuggestion[]}` | **do zaimplementowania** |
| POST | `/reports/{report}/position-suggestions` | `{position_id, request_id?, note?}` — tylko klient (właściciel) | **do zaimplementowania** |
| POST | `/position-suggestions/{suggestion}/review` | `{decision: accepted\|replaced\|rejected, position_id?, note?}` — tylko dyspozytor | **do zaimplementowania** |

`PositionSuggestion`: `id, report_id, request_id, position, status[pending\|accepted\|replaced\|rejected],
note, created_at, reviewed_at, reviewed_by, resulting_position`.

## 8. Przydziały

| Metoda | Ścieżka | Opis | Status |
|---|---|---|---|
| GET | `/reports/{report}/assignments?include_inactive=1` | `{data: Assignment[]}` | **do zaimplementowania** |
| POST | `/reports/{report}/assignments` | tworzenie przydziału (payload niżej) | **do zaimplementowania** |
| PATCH | `/assignments/{assignment}` | `{position_id?, data_scope?, instruction?}` — zmiana przydziału | **do zaimplementowania** |
| DELETE | `/assignments/{assignment}` | cofnięcie przydziału (`{reason?}` w ciele) | **do zaimplementowania** |
| GET | `/assignments?active=1` | wszystkie aktywne przydziały widoczne dla dyspozytora | **do zaimplementowania** |

Payload `POST /reports/{report}/assignments`:

```json
{
  "request_id": null,
  "assignee_type": "staff",
  "assignee_id": 3,
  "position_id": 1,
  "data_scope": "report_full",
  "instruction": "Proszę o kontakt telefoniczny przed wizytą."
}
```

`request_id = null` → przydział do całego zgłoszenia. Kilka przydziałów jednocześnie
(pracownik **i** służba) jest dozwolone. `Assignment` zawiera `scope`, `assignee`
(`AssigneeSummary`), `position`, `data_scope`, `instruction`, `assigned_by`, `assigned_at`,
`revoked_at`, `completed_at`, `is_active`.

## 9. Katalogi wykonawców (tylko dyspozytorzy)

| Metoda | Ścieżka | Opis | Status |
|---|---|---|---|
| GET | `/staff?position_id=&search=` | `{data: DirectoryStaffMember[]}` | **do zaimplementowania** |
| GET | `/services?search=` | `{data: DirectoryService[]}` | **do zaimplementowania** |

## 10. Kolejka i panel administratora

| Metoda | Ścieżka | Opis | Status |
|---|---|---|---|
| GET | `/queue?sort=fifo\|client_priority\|ai_priority&urgency=&category_id=&search=&page=` | kolejka globalna | **do zaimplementowania** |
| POST | `/queue/{report}/claim` | przyjęcie zgłoszenia przez administratora | **do zaimplementowania** |
| POST | `/reports/{report}/assign-admin` | `{admin_id}` — przypisanie innego administratora | **do zaimplementowania** |
| GET | `/admin/dashboard` | podsumowanie kolejki, obsługiwane zgłoszenia, propozycje, przydziały, licznik powiadomień | **do zaimplementowania** |

> Brakuje endpointu listy administratorów (`GET /admins`) — dopóki nie istnieje, UI oferuje
> wyłącznie „przypisz do siebie” (`/queue/{report}/claim`).

## 11. Panel pracownika

| Metoda | Ścieżka | Opis | Status |
|---|---|---|---|
| GET | `/staff/assignments` | `{data: StaffTaskSummary[]}` — **tylko aktywne** przydziały zalogowanego pracownika; każdy wpis zawiera `report.is_entrapment`, `report.site_address`, `report.device_label` | **do zaimplementowania** |
| GET | `/assignments/{assignment}/task` | `{data: StaffTaskDetail}` — dane ograniczone zakresem przydziału; 403 po cofnięciu | **do zaimplementowania** |
| POST | `/assignments/{assignment}/notes` | `{body}` → `{data: HistoryEntry}` | **do zaimplementowania** |
| POST | `/assignments/{assignment}/attachments` | multipart (`file`, `type`) | **do zaimplementowania** |

## 12. Powiadomienia i profil

| Metoda | Ścieżka | Opis | Status |
|---|---|---|---|
| GET | `/notifications?unread=1&page=` | paginowana lista `AppNotification` **dla zalogowanego użytkownika** | **do zaimplementowania** |
| GET | `/notifications/unread-count` | `{data: {count}}` | **do zaimplementowania** |
| POST | `/notifications/{notification}/read` | oznaczenie jako odczytane | **do zaimplementowania** |
| POST | `/notifications/read-all` | oznaczenie wszystkich | **do zaimplementowania** |
| GET | `/profile` | `{data: AuthenticatedUser}` | **do zaimplementowania** |
| PATCH | `/profile` | `{name?, phone?}` | **do zaimplementowania** |
| POST | `/profile/push-token` | `{push_token, platform}` | **do zaimplementowania** |

`AppNotification`: `id, kind, title, body, created_at, read_at, target: {report_id, request_id, assignment_id}`.

## 13. Realtime (Reverb)

Frontend nasłuchuje kanałów prywatnych i mapuje zdarzenia na unieważnienie cache
(`mobile/src/realtime/apply-event.ts`). Kanały:

| Kanał | Odbiorca |
|---|---|
| `private-user.{id}` | powiadomienia zalogowanego użytkownika |
| `private-admin.{id}.queue` | kolejka danego administratora |
| `private-staff.{id}` | przydziały danego pracownika |
| `private-report.{id}` | uczestnicy zgłoszenia |

Nazwy zdarzeń (`broadcastAs`), które frontend rozpoznaje:
`report.created`, `report.status.changed`, `request.status.changed`, `assignment.created`,
`assignment.changed`, `assignment.revoked`, `attachment.added`, `note.added`, `stream.started`,
`stream.ended`, `notification.created`.

Payload minimalny: `{report_id?: number, request_id?: number, assignment_id?: number}` — frontend
sam dociąga aktualne dane, więc broadcast nie musi zawierać całych encji.

Wymagany jest też `POST /broadcasting/auth` (autoryzacja kanałów przez token Sanctum).

## 14. Braki i uproszczenia po stronie frontendu

- Endpoint listy administratorów (patrz §10) — brak, UI ograniczone do „przypisz do siebie”.
- Sygnowane, czasowe URL-e do załączników (`Attachment.url`) — frontend pokazuje metadane i
  przycisk otwarcia; dopóki `url` jest `null`, akcja pobrania nie jest oferowana.
- Transmisja lokalizacji w tle (`expo-task-manager`) i live stream LiveKit nie są realizowane —
  frontend obsługuje jednorazowy odczyt lokalizacji, wskazanie trybu transmisji, prezentację
  aktywnych sesji i ich zatrzymanie.
- Filtry listy zgłoszeń klienta („aktywne / oczekujące / zakończone / anulowane”) budowane są
  dynamicznie ze słownika `/status-definitions`, ponieważ klucze statusów należą do backendu.
- Brak rejestru urządzeń (wind) — `site_address` i `device_label` są na razie polami tekstowymi
  zgłoszenia. Docelowo warto zamienić je na `GET /sites` + `GET /sites/{site}/devices` i relację
  `report.device_id`, żeby dyspozytor widział historię konkretnej windy i umowę serwisową budynku.
- Mapa jest renderowana **w aplikacji** (`LocationMap`) z kafli OpenStreetMap — bez klucza API
  i bez dodatkowych modułów natywnych, działa na iOS, Androidzie i w wersji web. Podgląd jest
  statyczny (marker + zoom przyciskami), bez gestów pan/pinch; nawigację uruchamia deep link do
  Google/Apple Maps. Jeśli potrzebna będzie w pełni interaktywna mapa, trzeba dodać
  `react-native-maps` lub `expo-maps` i klucz Google Maps dla Androida.
- Endpoint `GET /reports/{report}/location-pings` (historia trasy przy trybie `streaming`) nie jest
  jeszcze używany — mapa pokazuje ostatnią znaną pozycję z `report.location`.
