# CLAUDE.md

Ten plik jest kontekstem operacyjnym dla Claude (Claude Code) pracującego w tym repozytorium.
Opisuje architekturę, model domenowy, konwencje i zasady pracy nad projektem.

> **Nazwa robocza projektu:** System Zgłoszeń / Dispatch (SOS Reporter)
> **Typ aplikacji:** Mobilna aplikacja zgłoszeniowo-interwencyjna (klient) + panel
> administracyjny + backend czasu rzeczywistego, z transmisją lokalizacji, obrazu
> i dźwięku, kolejkowaniem zgłoszeń oraz priorytetyzacją (ręczną i AI).

---

## 0. Założenia interpretacyjne (ważne)

Oryginalny opis funkcjonalny był notatką roboczą, nie specyfikacją. Poniżej model
domenowy uporządkowany na jego podstawie. Jeśli któreś założenie jest błędne —
popraw tę sekcję jako pierwszą, bo reszta pliku się na niej opiera.

- **4 role**: Klient, Administrator, Hiperadministrator, Ratownik/Służba (+ opcjonalnie
  Służby zewnętrzne jako podtyp Ratownika).
- **Zgłoszenie** to encja nadrzędna, a **Request** to pod-zadanie wewnątrz zgłoszenia
  (np. "przyjazd służby", "naprawa", "spotkanie", "prośba o pieniądze", "połączenie").
  Zgłoszenie zamyka się automatycznie, gdy wszystkie jego requesty są zamknięte, albo
  ręcznie przez klienta/administratora.
- **Lokalizacja** występuje w dwóch trybach: jednorazowe udostępnienie (snapshot) oraz
  transmisja ciągła (live tracking) — klient wybiera tryb przy tworzeniu/edycji zgłoszenia.
- **Priorytet** ma dwa źródła: wskazywany przez **klienta** przy tworzeniu zgłoszenia
  (`priority`) oraz wyliczany automatycznie przez **AI** (`ai_priority`).
- **Kolejka globalna ma 3 tryby sortowania**: domyślnie *po kolei* (FIFO), według
  priorytetu wskazanego przez klienta, oraz według `ai_priority` — patrz sekcja 7.
- **Administrator** ma dwa tryby pracy: *aktywny* (auto-przydział kolejnego zgłoszenia
  z kolejki globalnej, jak w call center) oraz *wybór* (sam wybiera zgłoszenie z kolejki).
- **Hiperadministrator** nie obsługuje zgłoszeń bezpośrednio — nadzoruje pracę
  administratorów, widzi pełną historię klientów i statystyki/analitykę.
- Każda zmiana statusu zgłoszenia/requesta generuje wpis w historii i powiadomienie
  (push + WebSocket) do zainteresowanych stron.

---

## 1. Słownik domenowy (PL → nazwy w kodzie)

Warstwa domenowa nazywana jest po polsku w rozmowach z klientem/produktem, ale kod
(modele, tabele, endpointy) jest po angielsku. Trzymaj się tej mapy konsekwentnie.

| Termin PL                        | Nazwa w kodzie          | Uwagi |
|-----------------------------------|--------------------------|-------|
| Klient                            | `client` (rola User)     | tworzy zgłoszenia |
| Administrator                     | `admin`                  | obsługuje kolejkę |
| Hiperadministrator                | `super_admin`            | nadzór, analityka |
| Ratownik / Służba                 | `staff` / `rescuer`      | przypisywany do zgłoszenia |
| Zgłoszenie                        | `Report`                 | encja główna |
| Kategoria                         | `Category`               | np. medyczna, techniczna |
| Priorytet (klienta)               | `priority`               | wskazywany przez klienta przy tworzeniu zgłoszenia; enum: low/medium/high/critical |
| Priorytet AI                      | `ai_priority`            | wyliczany automatycznie |
| Status zgłoszenia                 | `status`                 | patrz sekcja 6 |
| Żądanie / pod-zadanie             | `Request`                | podrzędne wobec `Report` |
| Historia zmian                    | `ReportStatusHistory`    | audyt |
| Załącznik                         | `Attachment`             | zdjęcia, pliki, wiadomości głosowe (`type=audio`) |
| Wiadomość głosowa                 | `Attachment` (`type=audio`) | krótkie nagranie, osobne od live streamu mikrofonu — patrz sekcja 9.5 |
| Transmisja lokalizacji            | `LocationStream` / `LocationPing` | |
| Transmisja obrazu/dźwięku         | `MediaStreamSession`     | |
| Kolejka globalna                  | `ReportQueue`            | logika, nie osobna tabela |
| Stanowisko/służba                 | `StaffRole`              | tabela danych (nie enum), powiązanie kategoria ↔ służba |
| Typ żądania                       | `RequestType`            | tabela danych (nie enum), typ pod-zadania w ramach `Request` |
| Ustawienie globalne               | `Setting`                | wiersz klucz/wartość, np. `queue.sort_mode` — patrz sekcja 7 |
| Token urządzenia                  | `DeviceToken`            | jeden na urządzenie, zastępuje `User.push_token` — patrz sekcja 10 |
| Historia edycji                   | `ReportRevision`         | append-only, zmiany pól zgłoszenia — inna sprawa niż `ReportStatusHistory` |
| Historia przypisań                | `ReportAssignment`       | append-only, źródło analityki obciążenia adminów/ratowników |

---

## 2. Stack technologiczny

**Mobile**
- React Native + **Expo** (managed workflow + **expo-dev-client**, TypeScript)
- Expo Router (routing plikowy)
- TanStack Query (stan serwerowy) + Zustand (stan UI/lokalny)
- `expo-location`, `expo-camera`, `expo-av`/`expo-audio`, `expo-notifications`,
  `expo-secure-store`, `expo-image-manipulator`, `expo-task-manager`
- WebRTC / live streaming: **LiveKit** (`@livekit/react-native`) — patrz sekcja 9
- EAS Build / EAS Submit / EAS Update

**Backend**
- Laravel 13, PHP 8.4+ (Laravel 13's resolved dependency tree pulls Symfony 8.x
  components, which require PHP >= 8.4.1 even though the app's own `composer.json`
  declares `^8.3` — confirmed via `composer.lock`'s `platform` entry)
- **Sanctum** — autentykacja tokenowa (mobile = tokeny API, NIE cookie-based SPA)
- **Reverb** — self-hosted WebSocket server (broadcasting)
- Laravel Horizon (monitoring kolejek) — opcjonalnie
- Pest (testy), Laravel Pint (formatowanie)

**Infrastruktura**
- Docker + docker-compose (bazowane na strukturze zbliżonej do Laravel Sail)
- **PostgreSQL 16** + Redis (cache, queue, broadcasting driver)
- **MinIO** (self-hosted, S3-compatible, kontener lokalny) — jedyne miejsce
  przechowywania plików (zdjęcia, załączniki, nagrania). Żadnego chmurowego S3
  ani AWS — wszystko działa on-premise, także na "produkcji".
- Nginx + Supervisor (queue workers, `reverb:start`)

---

## 3. Struktura repozytorium (monorepo)

```
/backend                 # Laravel API
  app/
    Models/
    Http/Controllers/Api/
    Http/Requests/
    Http/Resources/
    Events/              # broadcastowane eventy (Reverb)
    Listeners/
    Jobs/                # push notifications, AI priority scoring, media processing
    Policies/            # RBAC per rola
    Services/
      Priority/          # logika wyliczania ai_priority
      Notifications/
  routes/api.php
  database/migrations/
/mobile                  # Expo app
  app/                   # expo-router
    (auth)/
    (client)/
    (admin)/
    (super-admin)/
    (staff)/
  src/
    api/                 # klient HTTP + typy
    hooks/
    stores/              # zustand
    components/
    realtime/            # echo/reverb + livekit setup
/docker
  docker-compose.yml
  php/Dockerfile
  nginx/default.conf
CLAUDE.md
README.md
```

---

## 4. Model danych (uproszczony)

```
User
 ├─ id, name, email, phone, role[client|admin|super_admin|staff]
 ├─ admin_status[active|manual]        -- tylko dla admina (auto-przydział vs wybór)
 ├─ staff_role_id                      -- stanowisko/służba (tylko dla staff)
 └─ is_active, locale, last_seen_at, metadata
    -- push_token NIE jest kolumną: patrz DeviceToken (obsługa wielu urządzeń)

Category
 ├─ id, name, staff_role_id (jaka służba obsługuje tę kategorię)

Report
 ├─ id, client_id, category_id
 ├─ name, description
 ├─ status[new|assigned|in_progress|waiting|closed|rejected]
 ├─ priority[low|medium|high|critical]  -- wskazany przez klienta przy tworzeniu
 ├─ priority_weight                     -- kolumna generowana (low=1 … critical=4), do sortowania kolejki
 ├─ ai_priority (float/int)             -- wyliczany automatycznie przez AI
 ├─ location_mode[one_time|streaming]
 ├─ location_lat, location_lng, location_updated_at
 ├─ assigned_admin_id, assigned_staff_id
 ├─ queued_at                           -- klucz sortowania FIFO, osobny od created_at
 ├─ created_at, closed_at

Request  (pod-zadanie w ramach Report)
 ├─ id, report_id
 ├─ type[connection|repair|meeting|money|service_arrival]
 ├─ status[pending|in_progress|done|cancelled]
 ├─ assigned_staff_id

ReportStatusHistory
 ├─ id, report_id, changed_by_user_id, from_status, to_status, note, created_at

Attachment
 ├─ id, report_id, type[photo|file|audio|video], path, created_at

LocationPing            -- historia lokalizacji przy trybie "streaming"
 ├─ id, report_id, lat, lng, accuracy, recorded_at

MediaStreamSession       -- sesja transmisji kamera/mikrofon (LiveKit room)
 ├─ id, report_id, room_name, started_at, ended_at, recording_url

StaffRole               -- stanowisko / służba (dane, nie enum)
 ├─ id, slug, name, is_external, sort_order, is_active

RequestType             -- typ pod-zadania (dane, nie enum)
 ├─ id, slug, name, staff_role_id, requires_staff|amount|scheduled_at

Setting                 -- globalna konfiguracja (klucz/wartość)
 ├─ key, value(jsonb), updated_by_user_id
 -- queue.sort_mode = globalny tryb sortowania kolejki

ReportRevision          -- historia edycji pól zgłoszenia (append-only)
 ├─ id, report_id, user_id, changes(jsonb), created_at

ReportAssignment        -- historia przypisań (append-only), źródło analityki
 ├─ id, report_id, user_id, role[admin|staff], assigned_at, unassigned_at

LocationStream          -- sesja transmisji lokalizacji (start/stop)
 ├─ id, report_id, started_by_user_id, started_at, ended_at, ping_count

DeviceToken             -- token push per urządzenie (zastępuje User.push_token)
 ├─ id, user_id, token, platform[ios|android|web], is_active, disabled_reason

NotificationDelivery    -- ślad wysyłki push (ticket/receipt Expo)
 ├─ id, notification_id, user_id, device_token_id, channel, status
```

---

## 5. Role i uprawnienia (RBAC)

| Akcja                                         | Klient | Admin | Hiperadmin | Ratownik |
|------------------------------------------------|:---:|:---:|:---:|:---:|
| Tworzenie zgłoszenia                            | ✅ | – | – | – |
| Edycja własnego zgłoszenia (z historią zmian)   | ✅ | – | – | – |
| Wskazanie priorytetu zgłoszenia (przy tworzeniu) | ✅ | – | – | – |
| Udostępnienie lokalizacji (jednorazowo/stream)  | ✅ | – | – | – |
| Transmisja kamery/mikrofonu (live)              | ✅ | – | – | – |
| Nagranie i wysłanie wiadomości głosowej          | ✅ | – | – | – |
| Zamknięcie własnego zgłoszenia                  | ✅ | ✅ | ✅ | – |
| Widok kolejki globalnej                         | – | ✅ | ✅ | – |
| Przypisanie zgłoszenia do siebie/innego admina  | – | ✅ | ✅ | – |
| Zmiana statusu zgłoszenia/requesta              | – | ✅ | ✅ | ✅ (swoich) |
| Podgląd streamu lokalizacji/kamery/audio, odsłuch wiadomości głosowych | – | ✅ | ✅ | ✅ (przypisanych) |
| Historia zgłoszeń **jednego** klienta           | – | ✅ (swoich) | ✅ (wszystkich) | – |
| Analityka / raporty pracy adminów               | – | – | ✅ | – |
| Ustawienie własnego statusu (aktywny/wybór)     | – | ✅ | – | – |
| Zarządzanie kategoriami/służbami                | – | – | ✅ | – |

Implementacja: Laravel **Policies** per model (`ReportPolicy`, `RequestPolicy`) +
middleware roli. Po stronie mobile: warunkowe routy w Expo Router per grupa `(admin)`,
`(client)` itd., plus guard sprawdzający rolę z tokena.

---

## 6. Cykl życia zgłoszenia (status flow)

```
new ──► assigned ──► in_progress ──► waiting ──► closed
  │                        │                        ▲
  └─────────► rejected     └── (request pending) ────┘
```

- `new` — utworzone przez klienta, trafia do kolejki globalnej.
- `assigned` — przypisane do admina/ratownika (auto lub ręcznie).
- `in_progress` — co najmniej jeden `Request` w toku.
- `waiting` — oczekuje np. na przyjazd służby zewnętrznej.
- `closed` — wszystkie `Request` zamknięte LUB zamknięte ręcznie.
- `rejected` — odrzucone przez admina (np. duplikat, spam).

Każda zmiana **musi** tworzyć wpis w `ReportStatusHistory` i wywoływać:
1. broadcast eventu przez Reverb,
2. push notification do klienta (zawsze) i do przypisanego ratownika (przy przypisaniu/zmianie).

---

## 7. Kolejkowanie i priorytetyzacja

**Kolejka globalna** = wszystkie `Report` w statusie `new`. Panel admina ma
przełącznik sortowania kolejki z **3 opcjami**:

1. **Po kolei (FIFO)** — sortowanie po `queued_at`. **Tryb domyślny.**
2. **Według priorytetu klienta** — sortowanie po `priority`, czyli wartości, którą
   klient sam wskazuje przy tworzeniu zgłoszenia (`low|medium|high|critical`).
3. **Według AI** — sortowanie po `ai_priority`, wyliczanym automatycznie przez
   `App\Services\Priority\PriorityScorer` na podstawie: kategorii, słów kluczowych
   w opisie, obecności zdjęć/streamu, historii klienta (czy zdarzały się fałszywe
   zgłoszenia), pory dnia.

Tryb sortowania jest **globalny dla całej organizacji** — nie jest preferencją
pojedynczego administratora. Przechowywany jako wiersz `queue.sort_mode`
w tabeli `settings`; zmienia go hiperadministrator, a zmiana obowiązuje
natychmiast wszystkich adminów (broadcast `QueueSortModeChanged`).

- endpoint kolejki: `GET /api/v1/queue` — bez parametru `sort`;
- `User.queue_sort_preference` NIE istnieje (świadoma zmiana wobec pierwotnej notatki).

**Tryb admina** (niezależny od sortowania kolejki):
- `active` — po zakończeniu poprzedniego zgłoszenia system automatycznie przydziela
  kolejne z czoła kolejki, w aktualnie wybranym sortowaniu (jak w call center),
- `manual` — admin przegląda kolejkę w wybranym sortowaniu i sam wybiera zgłoszenie.

Wyliczanie `ai_priority` uruchamiane jako **Job w kolejce** (nie synchronicznie przy
tworzeniu zgłoszenia), żeby nie blokować requestu tworzącego zgłoszenie. Dopóki
`ai_priority` nie zostanie policzone, sortowanie "według AI" traktuje brakującą
wartość jako najniższy priorytet i dosortowuje takie zgłoszenia po `created_at`
(fallback).

Hiperadmin widzi kolejki wszystkich adminów + statystyki (czas reakcji, obciążenie),
niezależnie od trybu sortowania wybranego przez danego admina.

---

## 8. Realtime — Laravel Reverb

**Konwencja kanałów:**

| Kanał                          | Typ       | Kto słucha |
|---------------------------------|-----------|------------|
| `private-report.{id}`           | private   | klient, przypisany admin/ratownik |
| `private-admin.{id}.queue`      | private   | dany admin (jego kolejka) |
| `presence-admins`               | presence  | wszyscy zalogowani admini (kto jest online/`active`) |
| `private-staff.{id}`            | private   | dany ratownik (powiadomienia o przydziale) |

**Kluczowe eventy (broadcastowane):**
`ReportCreated`, `ReportAssigned`, `ReportStatusChanged`, `RequestStatusChanged`,
`LocationUpdated`, `MediaStreamStarted`, `MediaStreamEnded`.

Przykład eventu backend:

```php
class ReportStatusChanged implements ShouldBroadcast
{
    public function __construct(public Report $report, public string $fromStatus) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("report.{$this->report->id}")];
    }

    public function broadcastAs(): string
    {
        return 'report.status.changed';
    }
}
```

Konfiguracja `.env` backend:

```
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=...
REVERB_APP_KEY=...
REVERB_APP_SECRET=...
REVERB_HOST=0.0.0.0
REVERB_PORT=8080
```

Klient mobile (Echo + Reverb, autoryzacja przez Sanctum token w headerze):

```ts
// src/realtime/echo.ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';

export const echo = new Echo({
  broadcaster: 'reverb',
  key: process.env.EXPO_PUBLIC_REVERB_APP_KEY,
  wsHost: process.env.EXPO_PUBLIC_REVERB_HOST,
  wsPort: 8080,
  forceTLS: false,
  enabledTransports: ['ws', 'wss'],
  authEndpoint: `${API_URL}/broadcasting/auth`,
  auth: { headers: { Authorization: `Bearer ${token}` } },
});
```

---

## 9. Streaming: lokalizacja, kamera, mikrofon

### 9.1 Ważne ograniczenie Expo
Prawdziwy streaming audio/wideo (WebRTC) oraz lokalizacja w tle wymagają **natywnych
modułów niedostępnych w Expo Go**. Projekt musi używać **expo-dev-client** (custom dev
client) + **EAS Build** — to wciąż managed workflow (bez pełnego eject), ale z pluginami
config (`app.json` → `plugins`).

### 9.2 Lokalizacja
- Tryb `one_time`: pojedynczy odczyt `expo-location` → wysyłka REST przy tworzeniu zgłoszenia.
- Tryb `streaming`: `expo-location` + `expo-task-manager` (background task), interwał
  co 5–15 s (throttling dla baterii), wysyłka przez REST batch **lub** bezpośrednio
  event po WebSocket, zapis do `LocationPing` po stronie backendu.
- Wymagane uprawnienia:
  - iOS: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`
  - Android: `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`
- Zawsze pokazuj użytkownikowi wyraźny stan "Twoja lokalizacja jest transmitowana" +
  możliwość jednym przyciskiem zatrzymania streamu.

### 9.3 Kamera i mikrofon — dwie ścieżki implementacji

**MVP (rekomendowane na start, stabilniejsze, działa bez SFU):**
- `expo-camera` robi zdjęcie/krótki klip co N sekund → kompresja (`expo-image-manipulator`)
  → upload chunkowany na backend → backend broadcastuje event z URL do najnowszej
  klatki/klipu. To "pseudo-streaming" wystarczający do podglądu sytuacji przez ratownika.
- Zaleta: brak infrastruktury SFU/mediaserwera, mała podatność na problemy sieciowe.

**Docelowo (prawdziwy live streaming):**
- **LiveKit** (self-hosted lub cloud) + `@livekit/react-native` po stronie klienta,
  panel admina/ratownika jako widz w tym samym "roomie" (`MediaStreamSession.room_name`).
- LiveKit ma gotowy Expo config plugin — działa z custom dev client bez pełnego eject.

### 9.4 Stabilność kamery/mikrofonu — zasady obowiązkowe
- Obsługa `AppState` — pauza streamu przy przejściu w tło, wznowienie po powrocie.
- Reconnect z exponential backoff (nie natychmiastowe pętle retry).
- Detekcja jakości sieci (np. `@react-native-community/netinfo`) → automatyczne
  obniżenie jakości/FPS zamiast zerwania połączenia.
- Zawsze obsłuż odmowę uprawnień (kamera/mikrofon/lokalizacja) — czytelny komunikat,
  nigdy silent fail.
- Heartbeat/ping na kanale WebSocket, żeby wykrywać "martwe" połączenia.

### 9.5 Wiadomości głosowe (voice notes) — osobno od live streamu

To **nie jest** to samo co transmisja mikrofonu z sekcji 9.3. Live stream wymaga
stabilnego łącza przez cały czas trwania zgłoszenia; wiadomość głosowa to
**jedno krótkie nagranie wysyłane jako plik** — działa nawet przy bardzo słabym
zasięgu i jest prostsza do zaimplementowania jako pierwsza wersja.

- Nagrywanie: `expo-av`/`expo-audio` (`Audio.Recording`) — przycisk start/stop,
  limit długości nagrania (np. 60 s), wskaźnik trwania nagrywania w UI.
- Wysyłka: nagrany plik (`.m4a`) trafia jako zwykły `Attachment` z `type=audio`
  przez `POST /reports/{report}/attachments` (multipart) — **nie wymaga**
  osobnego endpointu ani WebSocketu, więc działa nawet gdy realtime nie łapie zasięgu.
- Odtwarzanie: admin/hiperadmin/przypisany ratownik widzą wiadomość głosową na
  liście załączników zgłoszenia z prostym playerem (play/pauza, pasek postępu).
- Powiadomienie: dodanie nowej wiadomości głosowej broadcastuje event
  `AttachmentAdded` na `private-report.{id}` — przypisana osoba widzi ją bez odświeżania.
- Kolejność UX rekomendowana do MVP: **najpierw wiadomości głosowe (prostsze,
  działają offline-first jako pojedynczy upload), dopiero potem pełny live stream
  mikrofonu (LiveKit, sekcja 9.3)** — jeśli czas na to pozwoli.

---

## 10. Powiadomienia push

Flow: `expo-notifications` rejestruje token → zapis jako wiersz w `device_tokens`
(jeden na urządzenie, `platform` + `is_active`) → backend wysyła przez
`expo-server-sdk-php` w Jobie. Każda próba wysyłki zapisywana w
`notification_deliveries` wraz z ticketem Expo; odczyt receipta oznacza
`settled_at`, a `DeviceNotRegistered` wyłącza dany `DeviceToken`.

Reguła: **klient dostaje powiadomienie przy KAŻDEJ zmianie statusu swojego zgłoszenia**;
ratownik/admin — przy przypisaniu i przy nowych zgłoszeniach w jego kolejce (jeśli
`admin_status = active`).

---

## 11. Autentykacja — Sanctum (mobile, nie SPA)

Mobile **nie** używa cookie-based SPA auth Sanctum — używa **personal access tokens**:

```
POST /api/login       -> zwraca { token, user }
Authorization: Bearer {token}   -- na każdym kolejnym request
```

Token przechowywany w `expo-secure-store` (nigdy w AsyncStorage/plaintext).
`routes/api.php` chronione przez `auth:sanctum` + middleware roli
(`role:admin`, `role:super_admin`, `role:staff`, `role:client`).

---

## 12. Konwencje backend (Laravel)

- Kontrolery cienkie — logika w `Services/` i `Actions/`.
- Walidacja wyłącznie przez `FormRequest`.
- Odpowiedzi wyłącznie przez `JsonResource` / `ResourceCollection` (spójny kontrakt z mobile).
- RBAC przez `Policy`, nie przez `if` w kontrolerze.
- Wszystko co "ciężkie" (przetwarzanie zdjęć, wysyłka push, liczenie `ai_priority`,
  transkodowanie nagrań) → `Job` w kolejce.
- Formatowanie: `./vendor/bin/pint` przed commitem.
- Testy: Pest, `Event::fake()` przy testowaniu broadcastów, `Queue::fake()` przy jobach.

---

## 13. Docker

`docker/docker-compose.yml` (szkielet):

```yaml
services:
  app:
    build: ./php
    volumes: ["../backend:/var/www/html"]
    depends_on: [postgres, redis]

  nginx:
    image: nginx:alpine
    ports: ["8000:80"]
    volumes:
      - "../backend:/var/www/html"
      - "./nginx/default.conf:/etc/nginx/conf.d/default.conf"
    depends_on: [app]

  reverb:
    build: ./php
    command: php artisan reverb:start --host=0.0.0.0 --port=8080
    ports: ["8080:8080"]
    depends_on: [redis]

  queue:
    build: ./php
    command: php artisan queue:work --tries=3
    depends_on: [redis, postgres]

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    volumes: ["dbdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes: ["miniodata:/data"]

volumes:
  dbdata:
  miniodata:
```

Pliki użytkowników (zdjęcia, załączniki, nagrania) trzymane w **lokalnym MinIO**
(wolumen `miniodata`, trwały między restartami kontenera) — nie na gołym dysku
Laravela i nie w chmurowym S3. Backend łączy się z nim przez Laravel'owy driver
`s3` wskazujący na `AWS_ENDPOINT=http://minio:9000` (patrz sekcja 19).

Zasada: **backend zawsze przez Docker** (nie lokalny PHP), mobile zawsze lokalnie
przez `expo start` (Expo nie ma sensu konteneryzować).

---

## 14. Konwencje mobile (Expo/React Native)

- TypeScript `strict: true`, brak `any` bez uzasadnienia.
- Routing: Expo Router, grupy per rola: `(auth)`, `(client)`, `(admin)`, `(super-admin)`, `(staff)`.
- Stan serwerowy: TanStack Query (cache, retry, offline refetch).
- Stan UI/lokalny: Zustand.
- Klient HTTP: jeden wrapper (`src/api/client.ts`) z interceptorem doklejającym token
  i mapującym błędy 401 → wylogowanie.
- Komponenty reużywalne w `src/components`, bez logiki biznesowej.
- Zawsze projektuj pod **słabą sieć / offline** — kolejkowanie żądań, retry, wyraźne stany ładowania/błędu.
- Wymagany **expo-dev-client** (nie Expo Go) z powodu WebRTC/LiveKit i background location.

### 14.1 Widok dla człowieka w terenie (`(staff)/`)

To ekran, na którym ratownik/wykonawca faktycznie pracuje w trakcie interwencji —
musi działać przy słabym zasięgu i przy pośpiechu (duże elementy, minimum kroków).

- **Lista przypisanych zgłoszeń** — posortowana po priorytecie/pilności, z jasnym
  wyróżnieniem statusu i czasu, jaki upłynął od przyjęcia.
- **Szczegóły zgłoszenia**: mapa z lokalizacją (statyczna przy `one_time`, aktualizowana
  live przy `streaming`), przycisk **"Nawiguj"** (deep link do Google Maps/Apple Maps),
  zdjęcia/załączniki, wiadomości głosowe z prostym playerem (sekcja 9.5),
  podgląd streamu kamery/audio (sekcja 9.3), dane kontaktowe klienta.
- **Szybka zmiana statusu / requestów** z jednego ekranu — duże przyciski
  ("Jadę", "Na miejscu", "Zamknij zgłoszenie"), bez zagnieżdżonych menu.
- **Tryb offline**: ostatnio przypisane zgłoszenie cache'owane lokalnie
  (TanStack Query + persystencja); zmiana statusu zapisywana lokalnie i wysyłana
  automatycznie po odzyskaniu sieci (kolejka żądań, nie utrata danych).
- **Powiadomienia** o nowym przydziale i o wiadomościach/zmianach w toczącym się
  zgłoszeniu — kanał `private-staff.{id}` (sekcja 8) + push (sekcja 10).

---

## 15. Build i eksport (EAS) — Android/iOS

`mobile/eas.json`:

```json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal" },
    "production": {}
  },
  "submit": { "production": {} }
}
```

Komendy:

```bash
# lokalny dev z natywnymi modułami
npx expo start --dev-client

# build wewnętrzny do testów (Android APK / iOS ad-hoc)
eas build --profile preview --platform all

# build produkcyjny do sklepów
eas build --profile production --platform all

# wysyłka do App Store / Google Play
eas submit --platform ios
eas submit --platform android

# aktualizacja OTA (bez rebuildu, tylko JS/assets)
eas update --branch production
```

Sekrety/env per środowisko trzymane w `eas.json` → `env` + `app.config.ts`
(nie w `app.json` na sztywno). Podpisywanie certyfikatów zarządzane przez EAS
(`eas credentials`) — nie ręcznie.

---

## 16. Konwencje API REST

- Prefiks: `/api/v1/...`
- Zasoby w liczbie mnogiej: `/reports`, `/categories`, `/requests`, `/users`
- Zagnieżdżenie tam, gdzie ma to sens domenowy: `/reports/{report}/requests`,
  `/reports/{report}/attachments`, `/reports/{report}/location-pings`
- Standardowy format błędu:
```json
{ "message": "...", "errors": { "field": ["..."] } }
```
- Paginacja: standardowy Laravel paginator (`data`, `meta`, `links`).
- Broadcasting auth endpoint: `/broadcasting/auth` (wymagany przez Echo/Reverb).

---

## 17. Testowanie

- **Backend**: Pest, feature testy per endpoint + per przejście statusu (nie tylko happy path
  — testuj też próby nielegalnych przejść statusu i naruszenia RBAC).
- **Mobile**: Jest + React Native Testing Library dla logiki/hooków; Detox (opcjonalnie)
  do e2e krytycznych ścieżek (utworzenie zgłoszenia, transmisja lokalizacji).
- Każdy nowy endpoint = test feature + test policy (kto ma/nie ma dostępu).

---

## 18. Bezpieczeństwo i zgodność (RODO)

- Walidacja uploadów: whitelist MIME, limit rozmiaru, skanowanie/normalizacja zdjęć.
- Pliki nigdy nie są publicznie dostępne bezpośrednio z MinIO — dostęp tylko przez
  `Storage::disk('s3')->temporaryUrl(...)` (czasowo ograniczony, podpisany link),
  generowany dopiero po przejściu przez `Policy` sprawdzającą uprawnienia.
- Rate limiting na `/api/login` i endpointach tworzenia zgłoszeń.
- Dane lokalizacyjne = dane wrażliwe (RODO) — jasna polityka retencji `LocationPing`
  (np. auto-czyszczenie po X dni po zamknięciu zgłoszenia), dostęp tylko dla
  przypisanych osób (Policy), nie dla całej organizacji.
- Pełny audyt zmian statusu (`ReportStatusHistory`) — niemodyfikowalny (append-only).

---

## 19. Zmienne środowiskowe (przykład)

**backend/.env**
```
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=app
DB_USERNAME=app
DB_PASSWORD=secret

BROADCAST_CONNECTION=reverb
REVERB_APP_ID=
REVERB_APP_KEY=
REVERB_APP_SECRET=
QUEUE_CONNECTION=redis

# lokalne MinIO, nie chmurowy S3
FILESYSTEM_DISK=s3
AWS_ENDPOINT=http://minio:9000
AWS_USE_PATH_STYLE_ENDPOINT=true
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=app-local

EXPO_PUSH_ACCESS_TOKEN=
```

**mobile (app.config.ts / EAS env)**
```
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_REVERB_HOST=
EXPO_PUBLIC_REVERB_APP_KEY=
EXPO_PUBLIC_LIVEKIT_URL=
```

---

## 20. Ściągawka komend

```bash
# Backend (w Dockerze)
docker compose up -d
docker compose exec app php artisan migrate --seed
docker compose exec app php artisan reverb:start
docker compose exec app php artisan queue:work
docker compose exec app ./vendor/bin/pint
docker compose exec app ./vendor/bin/pest

# Mobile
cd mobile
npx expo start --dev-client
eas build --profile preview --platform all
eas update --branch production
```

---

## 21. Zasady pracy Claude w tym repo

- Przy każdej nowej trasie API: dodaj `FormRequest`, `Policy`, `JsonResource` i test Pest —
  nie uznawaj endpointu za gotowy bez tego kompletu.
- Przy zmianie statusu zgłoszenia: zawsze zapisz wpis w `ReportStatusHistory` i wyemituj
  odpowiedni broadcast event — nie zmieniaj `status` "z palca" bez tych dwóch efektów ubocznych.
- Nie dodawaj logiki streamingu/lokalizacji w tle bez sprawdzenia, czy wymaga to
  `expo-dev-client` (patrz sekcja 9.1) — Expo Go się nie nadaje.
- Nowe natywne moduły → zaktualizuj `app.json`/`plugins` i zanotuj to w tym pliku (sekcja 2/9).
- Nie twórz nowych ról ani statusów bez aktualizacji sekcji 5 i 6 — to jest źródło prawdy.
- Przed uznaniem zadania mobile za skończone: sprawdź obsługę słabej sieci, odmowy
  uprawnień i stanu offline — to wymagania projektowe, nie "nice to have".
- Sekrety zawsze przez `.env` / EAS secrets — nigdy hardkodowane w repo.
