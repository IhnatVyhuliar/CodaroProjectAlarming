# Domain Schema Implementation Plan (Codaro / SOS Reporter)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete, production-shaped database schema for the dispatch system — migrations, PHP enums, Eloquent models, factories and seeders — verified end-to-end against real PostgreSQL 16.

**Context / why:** The repo is a two-commit scaffold. `backend/database/migrations/` holds only the four stock Laravel files (users, cache, jobs, personal_access_tokens); `backend/app/Models/` holds only `User.php`; `routes/api.php` has a single `/api/v1/health` route with a `// Domain routes … future work` placeholder. Nothing of the domain in `CLAUDE.md` §4 exists yet. The client for this system is unknown until 16:00 today, so the schema must be **flexible about vocabulary** (what a category, a service, a request type is) while being **rigid about lifecycle** (statuses, audit trail, queue ordering). Everything downstream — the queue, assignment, the field-worker view, notifications — is blocked on this.

**Architecture:** Vocabulary lives in seeded lookup tables with stable slugs (`staff_roles`, `categories`, `request_types`), so a new niche is a seeder change, not a migration. Lifecycle lives in PHP backed enums mirrored by Postgres `CHECK` constraints, so illegal states cannot be written. The global queue is not a table — it is `reports WHERE status = 'new'`, served by three partial indexes matching the three sort modes. Sort mode is a single global `settings` row, so changing it changes the queue for every admin at once. Audit tables are append-only, enforced by a Postgres trigger. Every table that could carry niche-specific fields gets a `metadata jsonb` escape hatch.

**Tech Stack:** Laravel 13.26 / PHP 8.4 (Docker), PostgreSQL 16, Pest 4, Eloquent, Laravel Pint. No new Composer packages.

**Spec:** `/home/ihnat/code/htdocs/codaro/CLAUDE.md` — sections 1 (glossary), 4 (data model), 5 (RBAC), 6 (status flow), 7 (queue), 10 (push), 18 (security/GDPR), 21 (working rules).

---

## Decisions taken (confirmed with the user)

| Decision | Choice | Consequence |
|---|---|---|
| Queue sort scope | **Global only** | `settings` row `queue.sort_mode`; **no** `users.queue_sort_preference`. Deviates from CLAUDE.md §7 → Task 15 updates the spec. |
| RBAC | **`users.role` + Policies** | No `spatie/laravel-permission`. Flexibility comes from `staff_roles` / `categories` / `request_types`, not from runtime-editable permissions. |
| Test database | **Real Postgres** (`app_testing`) | `phpunit.xml` switches off SQLite in-memory. Migrations may use `jsonb`, generated columns, partial indexes, `FOR UPDATE SKIP LOCKED`. |
| Scope | **Schema layer only** | Migrations, enums, models, factories, seeders, schema tests. No controllers, no routes, no Resources, no mobile code. |

**Two further deviations from CLAUDE.md §4, deliberate, reconciled in Task 15:**

1. **`push_token` is not a column on `users`.** It becomes a `device_tokens` table (one row per device). A single column cannot represent a user with a phone and a tablet, and cannot be individually revoked when Expo reports `DeviceNotRegistered`.
2. **Two audit tables, not one.** `report_status_histories` records status transitions (spec-mandated). `report_revisions` records field edits ("dodaj załączniki, zmień, ale jest historia zmiany zgłoszeń") — a separate concern with a different shape.

**Verified before writing this plan (do not re-litigate):**
- `case New = 'new';` is legal in a PHP backed enum — reserved words are permitted as constant names. Confirmed by running it in the `app` container.
- `PostgresGrammar` emits `generated always as (…) stored` for `->storedAs()` (line 1316) and `Blueprint::jsonb()` exists (line 1205). Confirmed in `backend/vendor/`.
- All seven Docker services are currently **up**, including `postgres`. Postgres exposes **no host port** — every command runs through `docker compose exec`.

---

## Global Constraints

- **Working directory for all commands:** `/home/ihnat/code/htdocs/codaro`. Compose file is at `docker/docker-compose.yml`, so every command is prefixed `docker compose -f docker/docker-compose.yml exec -T app …`. Define once in your shell: `alias dc='docker compose -f docker/docker-compose.yml'`. **Never run local `php`** — CLAUDE.md §13: backend always through Docker.
- **PHP 8.4** in the container. **PostgreSQL 16**. **Laravel 13.26.1**, **Pest 4.7**.
- **No new Composer packages.** If a task seems to need one, stop and ask.
- Models use the Laravel 13 attribute style (`#[Fillable([...])]`, `#[Hidden([...])]`) to match the existing `backend/app/Models/User.php` — **not** `protected $fillable` arrays.
- Domain names in code are **English** (`Report`, `Category`, `priority`); Polish appears only in seeded display strings and user-facing copy. CLAUDE.md §1 is the mapping table.
- Table names are Laravel-default plural snake_case. Model `Request` → table `requests`.
- Every migration must have a working `down()`. `migrate:fresh` and `migrate:rollback` both have to survive.
- Money is `decimal(12,2)`. Coordinates are `decimal(10,7)` (≈1cm precision, fits ±180). Never floats for either.
- Run `./vendor/bin/pint` before every commit.
- Commit after every task. Branch: `feat/domain-schema` off `master`.

---

## File Structure

**Migrations** — `backend/database/migrations/`, in dependency order:

| File | Creates |
|---|---|
| `2026_08_20_120000_create_staff_roles_table.php` | `staff_roles` |
| `2026_08_20_120100_add_domain_columns_to_users_table.php` | alters `users` |
| `2026_08_20_120200_create_categories_table.php` | `categories` |
| `2026_08_20_120300_create_request_types_table.php` | `request_types` |
| `2026_08_20_120400_create_settings_table.php` | `settings` |
| `2026_08_20_120500_create_reports_table.php` | `reports` + sequence + partial indexes |
| `2026_08_20_120600_create_requests_table.php` | `requests` |
| `2026_08_20_120700_create_report_status_histories_table.php` | `report_status_histories` + append-only trigger |
| `2026_08_20_120800_create_report_revisions_table.php` | `report_revisions` |
| `2026_08_20_120900_create_report_assignments_table.php` | `report_assignments` |
| `2026_08_20_121000_create_attachments_table.php` | `attachments` |
| `2026_08_20_121100_create_location_streams_table.php` | `location_streams` |
| `2026_08_20_121200_create_location_pings_table.php` | `location_pings` |
| `2026_08_20_121300_create_media_stream_sessions_table.php` | `media_stream_sessions` |
| `2026_08_20_121400_create_device_tokens_table.php` | `device_tokens` |
| `2026_08_20_121500_create_notifications_table.php` | `notifications` (Laravel standard) |
| `2026_08_20_121600_create_notification_deliveries_table.php` | `notification_deliveries` |

**Enums** — `backend/app/Enums/`: `UserRole`, `AdminStatus`, `QueueSortMode`, `ReportStatus`, `ReportPriority`, `LocationMode`, `RequestStatus`, `AttachmentType`, `MediaStreamKind`, `MediaStreamStatus`, `AssignmentRole`, `DevicePlatform`, `NotificationDeliveryStatus`.

**Support** — `backend/app/Support/Database/CheckConstraint.php` (add/drop named `CHECK` constraints; used by many migrations).

**Models** — `backend/app/Models/`: `StaffRole`, `Category`, `RequestType`, `Setting`, `Report`, `Request`, `ReportStatusHistory`, `ReportRevision`, `ReportAssignment`, `Attachment`, `LocationStream`, `LocationPing`, `MediaStreamSession`, `DeviceToken`, `NotificationDelivery`, plus edits to `User`.

**Factories** — `backend/database/factories/` mirroring the models (not needed for `Setting`, `NotificationDelivery`).

**Seeders** — `backend/database/seeders/`: `StaffRoleSeeder`, `CategorySeeder`, `RequestTypeSeeder`, `SettingSeeder`, `UserSeeder`, `DemoReportSeeder`, and a rewritten `DatabaseSeeder`.

**Tests** — `backend/tests/Feature/Schema/`: one file per task's deliverable, plus `backend/tests/Unit/Enums/`.

---

## Naming hazard: `App\Models\Request`

CLAUDE.md §1 mandates the name `Request`, which collides with `Illuminate\Http\Request` in any controller. **Convention for the whole codebase, from this task onward:** the Eloquent model is imported aliased.

```php
use App\Models\Request as ReportRequest;   // the sub-task
use Illuminate\Http\Request;               // the HTTP request
```

Never import `App\Models\Request` unaliased.

---

### Task 1: Postgres test database + enable RefreshDatabase

Nothing else in this plan can be verified until tests run against real Postgres. This task is pure infrastructure and must land first.

**Files:**
- Create: `docker/postgres/init/01-create-test-database.sh`
- Modify: `docker/docker-compose.yml` (postgres service: mount init dir)
- Modify: `backend/phpunit.xml` (`<php>` block)
- Modify: `backend/tests/Pest.php` (uncomment `RefreshDatabase`)
- Modify: `backend/.env.example` (sync with `.env`)
- Create: `docs/superpowers/plans/2026-08-20-domain-schema.md` (copy of this plan, so it travels with the repo)

**Interfaces:**
- Consumes: nothing.
- Produces: a `app_testing` Postgres database reachable from the `app` container at host `postgres`; all Feature tests wrapped in `RefreshDatabase`.

- [ ] **Step 1: Create the Postgres init script**

`docker/postgres/init/01-create-test-database.sh`:

```bash
#!/bin/bash
set -e

# Runs only on first initialisation of an empty data volume.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE app_testing OWNER $POSTGRES_USER;
EOSQL
```

Make it executable: `chmod +x docker/postgres/init/01-create-test-database.sh`

- [ ] **Step 2: Mount the init directory**

In `docker/docker-compose.yml`, replace the `postgres` service with:

```yaml
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    volumes:
      - "dbdata:/var/lib/postgresql/data"
      - "./postgres/init:/docker-entrypoint-initdb.d"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 5s
      timeout: 3s
      retries: 10
```

- [ ] **Step 3: Create the test database in the *existing* volume**

The init script only fires on a fresh volume, and `dbdata` already exists. Create the database by hand once:

```bash
docker compose -f docker/docker-compose.yml up -d postgres
docker compose -f docker/docker-compose.yml exec -T postgres \
  psql -U app -d app -c "SELECT 1 FROM pg_database WHERE datname='app_testing'" | grep -q '1 row' \
  || docker compose -f docker/docker-compose.yml exec -T postgres createdb -U app app_testing
```

Verify: `docker compose -f docker/docker-compose.yml exec -T postgres psql -U app -l | grep app_testing`
Expected: a line containing `app_testing`.

- [ ] **Step 4: Point phpunit.xml at Postgres**

In `backend/phpunit.xml`, replace these three lines inside `<php>`:

```xml
        <env name="DB_CONNECTION" value="sqlite"/>
        <env name="DB_DATABASE" value=":memory:"/>
        <env name="DB_URL" value=""/>
```

with:

```xml
        <env name="DB_CONNECTION" value="pgsql"/>
        <env name="DB_HOST" value="postgres"/>
        <env name="DB_PORT" value="5432"/>
        <env name="DB_DATABASE" value="app_testing"/>
        <env name="DB_USERNAME" value="app"/>
        <env name="DB_PASSWORD" value="secret"/>
        <env name="DB_URL" value=""/>
```

- [ ] **Step 5: Enable RefreshDatabase**

In `backend/tests/Pest.php`, change:

```php
pest()->extend(TestCase::class)
 // ->use(RefreshDatabase::class)
    ->in('Feature');
```

to:

```php
pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');
```

- [ ] **Step 6: Prove the wiring works**

Write `backend/tests/Feature/Schema/DatabaseConnectionTest.php`:

```php
<?php

use Illuminate\Support\Facades\DB;

it('runs tests against postgres, not sqlite', function () {
    expect(DB::connection()->getDriverName())->toBe('pgsql');
    expect(DB::connection()->getDatabaseName())->toBe('app_testing');
});

it('has a postgres 16 or newer server', function () {
    $version = DB::selectOne('SHOW server_version')->server_version;

    expect((int) $version)->toBeGreaterThanOrEqual(16);
});

it('applied the migrations into the test database', function () {
    expect(DB::getSchemaBuilder()->hasTable('users'))->toBeTrue();
});
```

- [ ] **Step 7: Run the suite**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest`
Expected: all tests PASS, including the three new ones and the pre-existing `ExampleTest` and `HealthTest`.

If `HealthTest` or `ExampleTest` now fail on a missing database, the `app_testing` database was not created — go back to Step 3.

- [ ] **Step 8: Sync `.env.example` with `.env`**

`backend/.env.example` is still stock (sqlite, `BROADCAST_CONNECTION=log`, no `REVERB_*`, no `AWS_ENDPOINT`, no `EXPO_PUSH_ACCESS_TOKEN`), so a fresh clone running `composer setup` gets a broken config. Copy `backend/.env` to `backend/.env.example` and blank out only the secret values:

```
APP_KEY=
REVERB_APP_ID=
REVERB_APP_KEY=
REVERB_APP_SECRET=
EXPO_PUSH_ACCESS_TOKEN=
```

Leave `DB_*`, `REDIS_*`, `AWS_*` (MinIO), `BROADCAST_CONNECTION=reverb`, `QUEUE_CONNECTION=redis`, `FILESYSTEM_DISK=s3` at their working local values.

- [ ] **Step 9: Copy this plan into the repo**

```bash
mkdir -p docs/superpowers/plans
cp /home/ihnat/.claude/plans/so-right-now-i-tingly-stardust.md \
   docs/superpowers/plans/2026-08-20-domain-schema.md
```

- [ ] **Step 10: Commit**

```bash
git checkout -b feat/domain-schema
git add docker/postgres docker/docker-compose.yml backend/phpunit.xml backend/tests/Pest.php \
        backend/tests/Feature/Schema backend/.env.example docs/superpowers/plans
git commit -m "test: run the suite against a real postgres database"
```

---

### Task 2: Domain enums + CheckConstraint helper

Every lifecycle value in the system gets a PHP backed enum. The same value lists are mirrored into Postgres `CHECK` constraints by later migrations, using the helper built here — so the enum is the single source of truth for both layers.

**Files:**
- Create: `backend/app/Enums/*.php` (13 files, listed below)
- Create: `backend/app/Support/Database/CheckConstraint.php`
- Test: `backend/tests/Unit/Enums/EnumTest.php`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `UserRole::{Client,Admin,SuperAdmin,Staff}`, `AdminStatus::{Active,Manual}`, `QueueSortMode::{Fifo,ClientPriority,AiPriority}`, `ReportStatus::{New,Assigned,InProgress,Waiting,Closed,Rejected}`, `ReportPriority::{Low,Medium,High,Critical}`, `LocationMode::{OneTime,Streaming}`, `RequestStatus::{Pending,InProgress,Done,Cancelled}`, `AttachmentType::{Photo,File,Audio,Video}`, `MediaStreamKind::{Camera,Audio,Screen}`, `MediaStreamStatus::{Pending,Live,Ended,Failed}`, `AssignmentRole::{Admin,Staff}`, `DevicePlatform::{Ios,Android,Web}`, `NotificationDeliveryStatus::{Queued,Sent,Delivered,Failed,InvalidToken}` — all `string`-backed.
  - Every enum exposes `public static function values(): array` returning the backing strings.
  - `ReportStatus::canTransitionTo(self $to): bool`, `ReportStatus::isTerminal(): bool`, `ReportStatus::openStatuses(): array`.
  - `RequestStatus::isTerminal(): bool`.
  - `ReportPriority::weight(): int` (low=1 … critical=4).
  - `CheckConstraint::enum(string $table, string $column, array $values, bool $nullable = false): void` and `CheckConstraint::drop(string $table, string $column): void`.

- [ ] **Step 1: Write the failing test**

`backend/tests/Unit/Enums/EnumTest.php`:

```php
<?php

use App\Enums\ReportPriority;
use App\Enums\ReportStatus;
use App\Enums\RequestStatus;
use App\Enums\UserRole;

it('exposes backing values for every enum', function () {
    expect(UserRole::values())->toBe(['client', 'admin', 'super_admin', 'staff']);
    expect(ReportStatus::values())
        ->toBe(['new', 'assigned', 'in_progress', 'waiting', 'closed', 'rejected']);
    expect(ReportPriority::values())->toBe(['low', 'medium', 'high', 'critical']);
});

it('orders priorities by weight', function () {
    expect(ReportPriority::Low->weight())->toBe(1);
    expect(ReportPriority::Critical->weight())->toBe(4);
    expect(ReportPriority::Critical->weight())
        ->toBeGreaterThan(ReportPriority::High->weight());
});

it('allows the status transitions from CLAUDE.md section 6', function () {
    expect(ReportStatus::New->canTransitionTo(ReportStatus::Assigned))->toBeTrue();
    expect(ReportStatus::New->canTransitionTo(ReportStatus::Rejected))->toBeTrue();
    expect(ReportStatus::Assigned->canTransitionTo(ReportStatus::InProgress))->toBeTrue();
    expect(ReportStatus::InProgress->canTransitionTo(ReportStatus::Waiting))->toBeTrue();
    expect(ReportStatus::Waiting->canTransitionTo(ReportStatus::InProgress))->toBeTrue();
    expect(ReportStatus::InProgress->canTransitionTo(ReportStatus::Closed))->toBeTrue();
});

it('rejects illegal status transitions', function () {
    expect(ReportStatus::New->canTransitionTo(ReportStatus::Closed))->toBeFalse();
    expect(ReportStatus::New->canTransitionTo(ReportStatus::InProgress))->toBeFalse();
    expect(ReportStatus::Closed->canTransitionTo(ReportStatus::New))->toBeFalse();
    expect(ReportStatus::Rejected->canTransitionTo(ReportStatus::Assigned))->toBeFalse();
    expect(ReportStatus::New->canTransitionTo(ReportStatus::New))->toBeFalse();
});

it('knows which statuses are terminal and which are open', function () {
    expect(ReportStatus::Closed->isTerminal())->toBeTrue();
    expect(ReportStatus::Rejected->isTerminal())->toBeTrue();
    expect(ReportStatus::Waiting->isTerminal())->toBeFalse();
    expect(ReportStatus::openStatuses())
        ->toBe(['new', 'assigned', 'in_progress', 'waiting']);
    expect(RequestStatus::Done->isTerminal())->toBeTrue();
    expect(RequestStatus::Cancelled->isTerminal())->toBeTrue();
    expect(RequestStatus::Pending->isTerminal())->toBeFalse();
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Unit/Enums/EnumTest.php`
Expected: FAIL — `Class "App\Enums\ReportPriority" not found`.

- [ ] **Step 3: Write the three enums with behaviour**

`backend/app/Enums/ReportStatus.php`:

```php
<?php

namespace App\Enums;

enum ReportStatus: string
{
    case New = 'new';
    case Assigned = 'assigned';
    case InProgress = 'in_progress';
    case Waiting = 'waiting';
    case Closed = 'closed';
    case Rejected = 'rejected';

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** Statuses a report can sit in while still needing work. @return array<int, string> */
    public static function openStatuses(): array
    {
        return [
            self::New->value,
            self::Assigned->value,
            self::InProgress->value,
            self::Waiting->value,
        ];
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::Closed, self::Rejected], true);
    }

    /** The state machine from CLAUDE.md section 6. @return array<int, self> */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::New => [self::Assigned, self::Rejected],
            self::Assigned => [self::InProgress, self::Waiting, self::Closed, self::Rejected],
            self::InProgress => [self::Waiting, self::Closed],
            self::Waiting => [self::InProgress, self::Closed],
            self::Closed, self::Rejected => [],
        };
    }

    public function canTransitionTo(self $to): bool
    {
        return in_array($to, $this->allowedTransitions(), true);
    }
}
```

`backend/app/Enums/ReportPriority.php`:

```php
<?php

namespace App\Enums;

enum ReportPriority: string
{
    case Low = 'low';
    case Medium = 'medium';
    case High = 'high';
    case Critical = 'critical';

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Numeric sort weight. Mirrored by the `reports.priority_weight` generated
     * column — change one and you must change the other.
     */
    public function weight(): int
    {
        return match ($this) {
            self::Low => 1,
            self::Medium => 2,
            self::High => 3,
            self::Critical => 4,
        };
    }
}
```

`backend/app/Enums/RequestStatus.php`:

```php
<?php

namespace App\Enums;

enum RequestStatus: string
{
    case Pending = 'pending';
    case InProgress = 'in_progress';
    case Done = 'done';
    case Cancelled = 'cancelled';

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::Done, self::Cancelled], true);
    }
}
```

- [ ] **Step 4: Write the ten plain enums**

Each is the same shape: `enum X: string { case …; public static function values(): array { return array_column(self::cases(), 'value'); } }`. Cases and backing values:

```php
// app/Enums/UserRole.php
case Client = 'client'; case Admin = 'admin'; case SuperAdmin = 'super_admin'; case Staff = 'staff';

// app/Enums/AdminStatus.php   (CLAUDE.md §7 — auto-assign vs pick)
case Active = 'active'; case Manual = 'manual';

// app/Enums/QueueSortMode.php (CLAUDE.md §7 — global, not per admin)
case Fifo = 'fifo'; case ClientPriority = 'client_priority'; case AiPriority = 'ai_priority';

// app/Enums/LocationMode.php
case OneTime = 'one_time'; case Streaming = 'streaming';

// app/Enums/AttachmentType.php
case Photo = 'photo'; case File = 'file'; case Audio = 'audio'; case Video = 'video';

// app/Enums/MediaStreamKind.php
case Camera = 'camera'; case Audio = 'audio'; case Screen = 'screen';

// app/Enums/MediaStreamStatus.php
case Pending = 'pending'; case Live = 'live'; case Ended = 'ended'; case Failed = 'failed';

// app/Enums/AssignmentRole.php
case Admin = 'admin'; case Staff = 'staff';

// app/Enums/DevicePlatform.php
case Ios = 'ios'; case Android = 'android'; case Web = 'web';

// app/Enums/NotificationDeliveryStatus.php
case Queued = 'queued'; case Sent = 'sent'; case Delivered = 'delivered';
case Failed = 'failed'; case InvalidToken = 'invalid_token';
```

Full example so the shape is unambiguous — `backend/app/Enums/QueueSortMode.php`:

```php
<?php

namespace App\Enums;

enum QueueSortMode: string
{
    case Fifo = 'fifo';
    case ClientPriority = 'client_priority';
    case AiPriority = 'ai_priority';

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
```

- [ ] **Step 5: Write the CheckConstraint helper**

`backend/app/Support/Database/CheckConstraint.php`:

```php
<?php

namespace App\Support\Database;

use Illuminate\Support\Facades\DB;

/**
 * Mirrors a PHP backed enum into a Postgres CHECK constraint, so an illegal
 * lifecycle value cannot reach the table even through raw SQL.
 */
final class CheckConstraint
{
    public static function name(string $table, string $column): string
    {
        return "{$table}_{$column}_check";
    }

    /**
     * @param  array<int, string>  $values
     */
    public static function enum(string $table, string $column, array $values, bool $nullable = false): void
    {
        $quoted = implode(', ', array_map(
            static fn (string $value): string => "'".str_replace("'", "''", $value)."'",
            $values,
        ));

        $expression = "\"{$column}\" IN ({$quoted})";

        if ($nullable) {
            $expression = "\"{$column}\" IS NULL OR {$expression}";
        }

        $name = self::name($table, $column);

        DB::statement("ALTER TABLE \"{$table}\" ADD CONSTRAINT \"{$name}\" CHECK ({$expression})");
    }

    public static function drop(string $table, string $column): void
    {
        $name = self::name($table, $column);

        DB::statement("ALTER TABLE \"{$table}\" DROP CONSTRAINT IF EXISTS \"{$name}\"");
    }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Unit/Enums/EnumTest.php`
Expected: PASS, 5 tests.

- [ ] **Step 7: Format and commit**

```bash
docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pint
git add backend/app/Enums backend/app/Support backend/tests/Unit/Enums
git commit -m "feat: add domain enums and postgres check-constraint helper"
```

---

### Task 3: Extend `users` + update the User model

CLAUDE.md §4 columns, minus `queue_sort_preference` (now global, Task 5) and minus `push_token` (now `device_tokens`, Task 12).

**Files:**
- Create: `backend/database/migrations/2026_08_20_120000_create_staff_roles_table.php`
- Create: `backend/database/migrations/2026_08_20_120100_add_domain_columns_to_users_table.php`
- Create: `backend/app/Models/StaffRole.php`
- Create: `backend/database/factories/StaffRoleFactory.php`
- Modify: `backend/app/Models/User.php`
- Modify: `backend/database/factories/UserFactory.php`
- Test: `backend/tests/Feature/Schema/UserSchemaTest.php`

`staff_roles` lands here rather than in Task 4 because `users.staff_role_id` points at it.

**Interfaces:**
- Consumes: `UserRole`, `AdminStatus` (Task 2); `CheckConstraint` (Task 2).
- Produces:
  - Table `staff_roles`: `id, slug (unique), name, description, is_external, sort_order, is_active, metadata, timestamps`.
  - `users` gains: `phone, role, admin_status, staff_role_id, is_active, last_seen_at, locale, metadata, deleted_at`.
  - `StaffRole` model with `users()` HasMany, `categories()` HasMany, scope `active()`.
  - `User` model: `role` cast to `UserRole`, `admin_status` cast to `AdminStatus`, `staffRole()` BelongsTo, `HasApiTokens`, `SoftDeletes`, helpers `isClient() / isAdmin() / isSuperAdmin() / isStaff()`, scope `role(UserRole $role)`.
  - `UserFactory` states: `client() / admin() / superAdmin() / staff()`, plus `activeAdmin()`.
  - `StaffRoleFactory` with `external()` state.

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Schema/UserSchemaTest.php`:

```php
<?php

use App\Enums\AdminStatus;
use App\Enums\UserRole;
use App\Models\StaffRole;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('creates users in every role', function () {
    expect(User::factory()->client()->create()->role)->toBe(UserRole::Client);
    expect(User::factory()->admin()->create()->role)->toBe(UserRole::Admin);
    expect(User::factory()->superAdmin()->create()->role)->toBe(UserRole::SuperAdmin);
    expect(User::factory()->staff()->create()->role)->toBe(UserRole::Staff);
});

it('defaults a new user to the client role', function () {
    expect(User::factory()->create()->role)->toBe(UserRole::Client);
});

it('refuses an unknown role at the database level', function () {
    DB::table('users')->insert([
        'name' => 'Broken',
        'email' => 'broken@example.test',
        'password' => 'x',
        'role' => 'wizard',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
})->throws(QueryException::class);

it('refuses an unknown admin_status but allows null', function () {
    $user = User::factory()->admin()->create(['admin_status' => AdminStatus::Manual]);

    expect($user->admin_status)->toBe(AdminStatus::Manual);
    expect(User::factory()->client()->create()->admin_status)->toBeNull();

    expect(fn () => DB::table('users')->where('id', $user->id)->update(['admin_status' => 'nope']))
        ->toThrow(QueryException::class);
});

it('links a staff member to a staff role', function () {
    $role = StaffRole::factory()->create(['slug' => 'paramedic', 'name' => 'Ratownik medyczny']);
    $user = User::factory()->staff()->create(['staff_role_id' => $role->id]);

    expect($user->staffRole->slug)->toBe('paramedic');
    expect($role->users)->toHaveCount(1);
});

it('keeps a staff member when their staff role is deleted', function () {
    $role = StaffRole::factory()->create();
    $user = User::factory()->staff()->create(['staff_role_id' => $role->id]);

    $role->delete();

    expect($user->fresh()->staff_role_id)->toBeNull();
});

it('exposes role predicates and a role scope', function () {
    User::factory()->admin()->create();
    User::factory()->client()->count(2)->create();

    expect(User::factory()->admin()->create()->isAdmin())->toBeTrue();
    expect(User::factory()->client()->create()->isAdmin())->toBeFalse();
    expect(User::query()->role(UserRole::Client)->count())->toBe(3);
});

it('soft deletes users', function () {
    $user = User::factory()->create();
    $user->delete();

    expect(User::query()->count())->toBe(0);
    expect(User::withTrashed()->count())->toBe(1);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/UserSchemaTest.php`
Expected: FAIL — `Class "App\Models\StaffRole" not found`.

- [ ] **Step 3: Write the staff_roles migration**

`backend/database/migrations/2026_08_20_120000_create_staff_roles_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Stanowisko / służba — the kind of responder that handles a category of
     * report. Data, not an enum, so a new deployment can define its own set of
     * services without a migration.
     */
    public function up(): void
    {
        Schema::create('staff_roles', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('name');
            $table->text('description')->nullable();
            // Służby zewnętrzne (fire brigade, ambulance) vs in-house staff.
            $table->boolean('is_external')->default(false);
            $table->string('color', 16)->nullable();
            $table->string('icon', 64)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->jsonb('metadata')->default(new Expression("'{}'::jsonb"));
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_roles');
    }
};
```

- [ ] **Step 4: Write the users migration**

`backend/database/migrations/2026_08_20_120100_add_domain_columns_to_users_table.php`:

```php
<?php

use App\Enums\AdminStatus;
use App\Enums\UserRole;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 32)->nullable()->after('email');
            $table->string('role', 32)->default(UserRole::Client->value)->after('phone');
            // Only meaningful for role=admin: auto-assign from the queue, or pick manually.
            $table->string('admin_status', 32)->nullable()->after('role');
            $table->foreignId('staff_role_id')->nullable()->after('admin_status')
                ->constrained('staff_roles')->nullOnDelete();
            $table->boolean('is_active')->default(true)->after('staff_role_id');
            $table->string('locale', 8)->default('pl')->after('is_active');
            $table->timestamp('last_seen_at')->nullable()->after('locale');
            $table->jsonb('metadata')->default(new Expression("'{}'::jsonb"))->after('last_seen_at');
            $table->softDeletes();

            $table->index(['role', 'is_active']);
            $table->index(['role', 'admin_status']);
        });

        CheckConstraint::enum('users', 'role', UserRole::values());
        CheckConstraint::enum('users', 'admin_status', AdminStatus::values(), nullable: true);
    }

    public function down(): void
    {
        CheckConstraint::drop('users', 'role');
        CheckConstraint::drop('users', 'admin_status');

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['staff_role_id']);
            $table->dropIndex(['role', 'is_active']);
            $table->dropIndex(['role', 'admin_status']);
            $table->dropSoftDeletes();
            $table->dropColumn([
                'phone', 'role', 'admin_status', 'staff_role_id',
                'is_active', 'locale', 'last_seen_at', 'metadata',
            ]);
        });
    }
};
```

- [ ] **Step 5: Write the StaffRole model and factory**

`backend/app/Models/StaffRole.php`:

```php
<?php

namespace App\Models;

use Database\Factories\StaffRoleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['slug', 'name', 'description', 'is_external', 'color', 'icon', 'sort_order', 'is_active', 'metadata'])]
class StaffRole extends Model
{
    /** @use HasFactory<StaffRoleFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_external' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'metadata' => 'array',
        ];
    }

    /** @return HasMany<User, $this> */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /** @return HasMany<Category, $this> */
    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    /** @param  Builder<$this>  $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }
}
```

`backend/database/factories/StaffRoleFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\StaffRole;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<StaffRole> */
class StaffRoleFactory extends Factory
{
    protected $model = StaffRole::class;

    public function definition(): array
    {
        $name = $this->faker->unique()->jobTitle();

        return [
            'slug' => Str::slug($name).'-'.$this->faker->unique()->numberBetween(1, 99999),
            'name' => $name,
            'description' => $this->faker->sentence(),
            'is_external' => false,
            'sort_order' => 0,
            'is_active' => true,
            'metadata' => [],
        ];
    }

    public function external(): static
    {
        return $this->state(fn () => ['is_external' => true]);
    }
}
```

- [ ] **Step 6: Update the User model**

Replace `backend/app/Models/User.php` with:

```php
<?php

namespace App\Models;

use App\Enums\AdminStatus;
use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'phone', 'password', 'role', 'admin_status', 'staff_role_id', 'is_active', 'locale', 'metadata'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'admin_status' => AdminStatus::class,
            'is_active' => 'boolean',
            'metadata' => 'array',
        ];
    }

    /** @return BelongsTo<StaffRole, $this> */
    public function staffRole(): BelongsTo
    {
        return $this->belongsTo(StaffRole::class);
    }

    /** Reports this user filed as a client. @return HasMany<Report, $this> */
    public function reports(): HasMany
    {
        return $this->hasMany(Report::class, 'client_id');
    }

    /** @return HasMany<DeviceToken, $this> */
    public function deviceTokens(): HasMany
    {
        return $this->hasMany(DeviceToken::class);
    }

    public function isClient(): bool
    {
        return $this->role === UserRole::Client;
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === UserRole::SuperAdmin;
    }

    public function isStaff(): bool
    {
        return $this->role === UserRole::Staff;
    }

    /** @param  Builder<$this>  $query */
    public function scopeRole(Builder $query, UserRole $role): void
    {
        $query->where('role', $role);
    }
}
```

`reports()` and `deviceTokens()` reference models built in Tasks 6 and 12. PHP resolves relation return types lazily, so the class compiles now and the relations start working when those tasks land. Their tests live in those tasks.

- [ ] **Step 7: Add factory states**

Append to `backend/database/factories/UserFactory.php` (keep the existing `definition()` and `unverified()`, and add `'role' => UserRole::Client, 'phone' => $this->faker->phoneNumber(), 'is_active' => true` to `definition()`):

```php
    public function client(): static
    {
        return $this->state(fn () => ['role' => UserRole::Client]);
    }

    public function admin(): static
    {
        return $this->state(fn () => [
            'role' => UserRole::Admin,
            'admin_status' => AdminStatus::Manual,
        ]);
    }

    /** An admin in call-centre mode: the queue pushes work to them. */
    public function activeAdmin(): static
    {
        return $this->state(fn () => [
            'role' => UserRole::Admin,
            'admin_status' => AdminStatus::Active,
        ]);
    }

    public function superAdmin(): static
    {
        return $this->state(fn () => ['role' => UserRole::SuperAdmin]);
    }

    public function staff(): static
    {
        return $this->state(fn () => ['role' => UserRole::Staff]);
    }
```

Add `use App\Enums\AdminStatus;` and `use App\Enums\UserRole;` to the imports.

- [ ] **Step 8: Run the test to verify it passes**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/UserSchemaTest.php`
Expected: PASS, 8 tests.

- [ ] **Step 9: Verify the migration rolls back cleanly**

Run:
```bash
docker compose -f docker/docker-compose.yml exec -T app php artisan migrate:fresh
docker compose -f docker/docker-compose.yml exec -T app php artisan migrate:rollback --step=2
docker compose -f docker/docker-compose.yml exec -T app php artisan migrate
```
Expected: no errors on any of the three. This runs against the **dev** database (`app`), which is fine — it holds no real data yet.

- [ ] **Step 10: Format and commit**

```bash
docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pint
git add backend/app backend/database backend/tests
git commit -m "feat: add staff_roles and domain columns on users"
```

---

### Task 4: Categories and request types (the niche-flexibility layer)

These two tables are the reason a new client at 16:00 is a seeder change rather than a migration. `categories` answers "what kind of incident is this and who handles it"; `request_types` answers "what sub-tasks can a dispatcher attach". CLAUDE.md lists five request types as an enum — here they become rows.

**Files:**
- Create: `backend/database/migrations/2026_08_20_120200_create_categories_table.php`
- Create: `backend/database/migrations/2026_08_20_120300_create_request_types_table.php`
- Create: `backend/app/Models/Category.php`, `backend/app/Models/RequestType.php`
- Create: `backend/database/factories/CategoryFactory.php`, `backend/database/factories/RequestTypeFactory.php`
- Test: `backend/tests/Feature/Schema/CatalogSchemaTest.php`

**Interfaces:**
- Consumes: `StaffRole` (Task 3), `ReportPriority` + `CheckConstraint` (Task 2).
- Produces:
  - Table `categories`: `id, parent_id, slug (unique), name, description, staff_role_id, default_priority, color, icon, sort_order, is_active, requires_location, metadata, timestamps`.
  - Table `request_types`: `id, slug (unique), name, description, staff_role_id, requires_staff, requires_amount, requires_scheduled_at, sort_order, is_active, metadata, timestamps`.
  - `Category` with `parent()`, `children()`, `staffRole()`, `reports()`, scope `active()`.
  - `RequestType` with `staffRole()`, `requests()`, scope `active()`.

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Schema/CatalogSchemaTest.php`:

```php
<?php

use App\Enums\ReportPriority;
use App\Models\Category;
use App\Models\RequestType;
use App\Models\StaffRole;
use Illuminate\Database\QueryException;

it('creates a category bound to the service that handles it', function () {
    $role = StaffRole::factory()->create(['slug' => 'medical']);
    $category = Category::factory()->create([
        'slug' => 'medical-emergency',
        'name' => 'Nagły wypadek medyczny',
        'staff_role_id' => $role->id,
        'default_priority' => ReportPriority::Critical,
    ]);

    expect($category->staffRole->slug)->toBe('medical');
    expect($category->default_priority)->toBe(ReportPriority::Critical);
    expect($role->categories)->toHaveCount(1);
});

it('rejects duplicate category slugs', function () {
    Category::factory()->create(['slug' => 'fire']);
    Category::factory()->create(['slug' => 'fire']);
})->throws(QueryException::class);

it('nests categories for niches that need subcategories', function () {
    $parent = Category::factory()->create(['slug' => 'technical']);
    $child = Category::factory()->create(['slug' => 'technical-water', 'parent_id' => $parent->id]);

    expect($child->parent->slug)->toBe('technical');
    expect($parent->children->pluck('slug')->all())->toBe(['technical-water']);
});

it('deletes child categories with their parent', function () {
    $parent = Category::factory()->create();
    Category::factory()->create(['parent_id' => $parent->id]);

    $parent->delete();

    expect(Category::query()->count())->toBe(0);
});

it('rejects an unknown default_priority but allows null', function () {
    expect(Category::factory()->create(['default_priority' => null])->default_priority)->toBeNull();

    expect(fn () => \DB::table('categories')->insert([
        'slug' => 'bad', 'name' => 'Bad', 'default_priority' => 'apocalyptic',
        'created_at' => now(), 'updated_at' => now(),
    ]))->toThrow(QueryException::class);
});

it('creates the five request types from the spec', function () {
    foreach (['connection', 'repair', 'meeting', 'money', 'service_arrival'] as $slug) {
        RequestType::factory()->create(['slug' => $slug]);
    }

    expect(RequestType::query()->count())->toBe(5);
});

it('flags which request types need extra data', function () {
    $money = RequestType::factory()->create(['slug' => 'money', 'requires_amount' => true]);
    $meeting = RequestType::factory()->create(['slug' => 'meeting', 'requires_scheduled_at' => true]);

    expect($money->requires_amount)->toBeTrue();
    expect($money->requires_scheduled_at)->toBeFalse();
    expect($meeting->requires_scheduled_at)->toBeTrue();
});

it('scopes catalogs to active rows', function () {
    Category::factory()->create(['is_active' => true]);
    Category::factory()->create(['is_active' => false]);
    RequestType::factory()->create(['is_active' => false]);

    expect(Category::query()->active()->count())->toBe(1);
    expect(RequestType::query()->active()->count())->toBe(0);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/CatalogSchemaTest.php`
Expected: FAIL — `Class "App\Models\Category" not found`.

- [ ] **Step 3: Write the categories migration**

`backend/database/migrations/2026_08_20_120200_create_categories_table.php`:

```php
<?php

use App\Enums\ReportPriority;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()
                ->constrained('categories')->cascadeOnDelete();
            $table->string('slug', 64)->unique();
            $table->string('name');
            $table->text('description')->nullable();
            // Which service handles this category by default (CLAUDE.md section 4).
            $table->foreignId('staff_role_id')->nullable()
                ->constrained('staff_roles')->nullOnDelete();
            // Pre-fills the client's priority picker; the client may override it.
            $table->string('default_priority', 32)->nullable();
            $table->boolean('requires_location')->default(true);
            $table->string('color', 16)->nullable();
            $table->string('icon', 64)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->jsonb('metadata')->default(new Expression("'{}'::jsonb"));
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
            $table->index('parent_id');
        });

        CheckConstraint::enum('categories', 'default_priority', ReportPriority::values(), nullable: true);
    }

    public function down(): void
    {
        CheckConstraint::drop('categories', 'default_priority');
        Schema::dropIfExists('categories');
    }
};
```

- [ ] **Step 4: Write the request_types migration**

`backend/database/migrations/2026_08_20_120300_create_request_types_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The sub-task vocabulary: connection, repair, meeting, money,
     * service_arrival — and whatever a future niche needs. CLAUDE.md models
     * this as an enum; a table keeps it editable without a deploy.
     */
    public function up(): void
    {
        Schema::create('request_types', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('staff_role_id')->nullable()
                ->constrained('staff_roles')->nullOnDelete();
            // Drives conditional validation when a dispatcher attaches this request.
            $table->boolean('requires_staff')->default(false);
            $table->boolean('requires_amount')->default(false);
            $table->boolean('requires_scheduled_at')->default(false);
            $table->string('icon', 64)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->jsonb('metadata')->default(new Expression("'{}'::jsonb"));
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('request_types');
    }
};
```

- [ ] **Step 5: Write the Category model**

`backend/app/Models/Category.php`:

```php
<?php

namespace App\Models;

use App\Enums\ReportPriority;
use Database\Factories\CategoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['parent_id', 'slug', 'name', 'description', 'staff_role_id', 'default_priority', 'requires_location', 'color', 'icon', 'sort_order', 'is_active', 'metadata'])]
class Category extends Model
{
    /** @use HasFactory<CategoryFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'default_priority' => ReportPriority::class,
            'requires_location' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'metadata' => 'array',
        ];
    }

    /** @return BelongsTo<Category, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    /** @return HasMany<Category, $this> */
    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    /** @return BelongsTo<StaffRole, $this> */
    public function staffRole(): BelongsTo
    {
        return $this->belongsTo(StaffRole::class);
    }

    /** @return HasMany<Report, $this> */
    public function reports(): HasMany
    {
        return $this->hasMany(Report::class);
    }

    /** @param  Builder<$this>  $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }
}
```

- [ ] **Step 6: Write the RequestType model**

`backend/app/Models/RequestType.php`:

```php
<?php

namespace App\Models;

use Database\Factories\RequestTypeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['slug', 'name', 'description', 'staff_role_id', 'requires_staff', 'requires_amount', 'requires_scheduled_at', 'icon', 'sort_order', 'is_active', 'metadata'])]
class RequestType extends Model
{
    /** @use HasFactory<RequestTypeFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'requires_staff' => 'boolean',
            'requires_amount' => 'boolean',
            'requires_scheduled_at' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'metadata' => 'array',
        ];
    }

    /** @return BelongsTo<StaffRole, $this> */
    public function staffRole(): BelongsTo
    {
        return $this->belongsTo(StaffRole::class);
    }

    /** @return HasMany<Request, $this> */
    public function requests(): HasMany
    {
        return $this->hasMany(Request::class);
    }

    /** @param  Builder<$this>  $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }
}
```

- [ ] **Step 7: Write both factories**

`backend/database/factories/CategoryFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Enums\ReportPriority;
use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Category> */
class CategoryFactory extends Factory
{
    protected $model = Category::class;

    public function definition(): array
    {
        $name = $this->faker->unique()->words(2, true);

        return [
            'slug' => Str::slug($name).'-'.$this->faker->unique()->numberBetween(1, 99999),
            'name' => Str::ucfirst($name),
            'description' => $this->faker->sentence(),
            'default_priority' => ReportPriority::Medium,
            'requires_location' => true,
            'sort_order' => 0,
            'is_active' => true,
            'metadata' => [],
        ];
    }
}
```

`backend/database/factories/RequestTypeFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\RequestType;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<RequestType> */
class RequestTypeFactory extends Factory
{
    protected $model = RequestType::class;

    public function definition(): array
    {
        $name = $this->faker->unique()->words(2, true);

        return [
            'slug' => Str::slug($name).'-'.$this->faker->unique()->numberBetween(1, 99999),
            'name' => Str::ucfirst($name),
            'description' => $this->faker->sentence(),
            'requires_staff' => false,
            'requires_amount' => false,
            'requires_scheduled_at' => false,
            'sort_order' => 0,
            'is_active' => true,
            'metadata' => [],
        ];
    }
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/CatalogSchemaTest.php`
Expected: PASS, 8 tests.

- [ ] **Step 9: Format and commit**

```bash
docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pint
git add backend/app backend/database backend/tests
git commit -m "feat: add categories and request_types catalog tables"
```

---

### Task 5: Global settings (the queue sort mode)

The queue sort mode is one value for the whole organisation — a hyperadmin flips it and every admin's queue re-orders. A generic key/value table also gives the niche a place to park configuration (retention days, SLA targets) without migrations.

**Files:**
- Create: `backend/database/migrations/2026_08_20_120400_create_settings_table.php`
- Create: `backend/app/Models/Setting.php`
- Test: `backend/tests/Feature/Schema/SettingsTest.php`

**Interfaces:**
- Consumes: `QueueSortMode` (Task 2).
- Produces:
  - Table `settings`: `key (primary), value jsonb, description, updated_by_user_id, timestamps`.
  - `Setting::get(string $key, mixed $default = null): mixed`
  - `Setting::put(string $key, mixed $value, ?int $userId = null): void`
  - `Setting::queueSortMode(): QueueSortMode` — returns `Fifo` when unset.
  - `Setting::setQueueSortMode(QueueSortMode $mode, ?int $userId = null): void`
  - Constant `Setting::QUEUE_SORT_MODE = 'queue.sort_mode'`.

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Schema/SettingsTest.php`:

```php
<?php

use App\Enums\QueueSortMode;
use App\Models\Setting;
use App\Models\User;

it('falls back to fifo when the sort mode was never set', function () {
    expect(Setting::queueSortMode())->toBe(QueueSortMode::Fifo);
});

it('stores the queue sort mode globally', function () {
    $superAdmin = User::factory()->superAdmin()->create();

    Setting::setQueueSortMode(QueueSortMode::AiPriority, $superAdmin->id);

    expect(Setting::queueSortMode())->toBe(QueueSortMode::AiPriority);
    expect(Setting::query()->find(Setting::QUEUE_SORT_MODE)->updated_by_user_id)
        ->toBe($superAdmin->id);
});

it('keeps exactly one row per key when the mode changes', function () {
    Setting::setQueueSortMode(QueueSortMode::ClientPriority);
    Setting::setQueueSortMode(QueueSortMode::Fifo);

    expect(Setting::query()->where('key', Setting::QUEUE_SORT_MODE)->count())->toBe(1);
    expect(Setting::queueSortMode())->toBe(QueueSortMode::Fifo);
});

it('round-trips arbitrary json values', function () {
    Setting::put('retention.location_pings_days', 30);
    Setting::put('sla.targets', ['critical' => 300, 'high' => 900]);

    expect(Setting::get('retention.location_pings_days'))->toBe(30);
    expect(Setting::get('sla.targets'))->toBe(['critical' => 300, 'high' => 900]);
    expect(Setting::get('missing.key', 'fallback'))->toBe('fallback');
});

it('ignores a stored sort mode that is no longer valid', function () {
    Setting::put(Setting::QUEUE_SORT_MODE, 'by_vibes');

    expect(Setting::queueSortMode())->toBe(QueueSortMode::Fifo);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/SettingsTest.php`
Expected: FAIL — `Class "App\Models\Setting" not found`.

- [ ] **Step 3: Write the migration**

`backend/database/migrations/2026_08_20_120400_create_settings_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Organisation-wide configuration. The queue sort mode lives here rather
     * than on each admin, so changing prioritisation applies to everyone at once.
     */
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key', 128)->primary();
            $table->jsonb('value');
            $table->string('description')->nullable();
            $table->foreignId('updated_by_user_id')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
```

- [ ] **Step 4: Write the Setting model**

`backend/app/Models/Setting.php`:

```php
<?php

namespace App\Models;

use App\Enums\QueueSortMode;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['key', 'value', 'description', 'updated_by_user_id'])]
class Setting extends Model
{
    public const QUEUE_SORT_MODE = 'queue.sort_mode';

    protected $primaryKey = 'key';

    protected $keyType = 'string';

    public $incrementing = false;

    protected function casts(): array
    {
        return [
            'value' => 'array',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::query()->find($key);

        return $setting === null ? $default : $setting->value;
    }

    public static function put(string $key, mixed $value, ?int $userId = null): void
    {
        static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $value, 'updated_by_user_id' => $userId],
        );
    }

    /** The single global queue ordering. Unset or corrupt values fall back to FIFO. */
    public static function queueSortMode(): QueueSortMode
    {
        $stored = static::get(self::QUEUE_SORT_MODE);

        return is_string($stored)
            ? (QueueSortMode::tryFrom($stored) ?? QueueSortMode::Fifo)
            : QueueSortMode::Fifo;
    }

    public static function setQueueSortMode(QueueSortMode $mode, ?int $userId = null): void
    {
        static::put(self::QUEUE_SORT_MODE, $mode->value, $userId);
    }
}
```

The `value` column is cast to `array`, so `Setting::put('k', 30)` stores the JSON scalar `30` and reads back as `int`. The `is_string($stored)` guard in `queueSortMode()` is what makes the last test pass.

- [ ] **Step 5: Run the test to verify it passes**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/SettingsTest.php`
Expected: PASS, 5 tests.

- [ ] **Step 6: Format and commit**

```bash
docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pint
git add backend/app backend/database backend/tests
git commit -m "feat: add global settings table with queue sort mode"
```

---

### Task 6: The `reports` table

The centre of the system. Carries the client's priority, the AI priority, location in both modes, both assignment pointers, and the timestamps the hyperadmin's analytics will need. `priority_weight` is a Postgres **generated column** so alphabetical sorting of `'low' < 'medium'` can never corrupt queue order.

**Files:**
- Create: `backend/database/migrations/2026_08_20_120500_create_reports_table.php`
- Create: `backend/app/Models/Report.php`
- Create: `backend/database/factories/ReportFactory.php`
- Test: `backend/tests/Feature/Schema/ReportSchemaTest.php`

**Interfaces:**
- Consumes: `User`, `Category` (Tasks 3–4); `ReportStatus`, `ReportPriority`, `LocationMode`, `CheckConstraint` (Task 2).
- Produces:
  - Table `reports` with the columns listed in Step 3, a `reports_reference_seq` sequence, and three partial indexes named `reports_queue_fifo_idx`, `reports_queue_client_priority_idx`, `reports_queue_ai_priority_idx`.
  - `Report` model: casts, relations `client()`, `category()`, `assignedAdmin()`, `assignedStaff()`, `closedBy()`; `isOpen()`, `hasLiveLocation()`.
  - `ReportFactory` with states `assigned() / inProgress() / waiting() / closed() / rejected() / streamingLocation() / scored(float $score)`.
  - `reference` auto-generated as `ZG-{year}-{000001}` by the model's `creating` event.

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Schema/ReportSchemaTest.php`:

```php
<?php

use App\Enums\LocationMode;
use App\Enums\ReportPriority;
use App\Enums\ReportStatus;
use App\Models\Category;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('creates a report in the new status with a queue timestamp', function () {
    $report = Report::factory()->create();

    expect($report->status)->toBe(ReportStatus::New);
    expect($report->priority)->toBe(ReportPriority::Medium);
    expect($report->location_mode)->toBe(LocationMode::OneTime);
    expect($report->queued_at)->not->toBeNull();
    expect($report->closed_at)->toBeNull();
    expect($report->isOpen())->toBeTrue();
});

it('generates a human-readable reference number', function () {
    $first = Report::factory()->create();
    $second = Report::factory()->create();

    expect($first->reference)->toMatch('/^ZG-\d{4}-\d{6}$/');
    expect($second->reference)->not->toBe($first->reference);
});

it('derives priority_weight from priority in the database', function () {
    $low = Report::factory()->create(['priority' => ReportPriority::Low]);
    $critical = Report::factory()->create(['priority' => ReportPriority::Critical]);

    expect($low->fresh()->priority_weight)->toBe(1);
    expect($critical->fresh()->priority_weight)->toBe(4);
});

it('recomputes priority_weight when the client edits the priority', function () {
    $report = Report::factory()->create(['priority' => ReportPriority::Low]);

    $report->update(['priority' => ReportPriority::High]);

    expect($report->fresh()->priority_weight)->toBe(3);
});

it('refuses to write priority_weight directly', function () {
    $report = Report::factory()->create();

    DB::table('reports')->where('id', $report->id)->update(['priority_weight' => 99]);
})->throws(QueryException::class);

it('refuses unknown statuses, priorities and location modes', function (string $column, string $value) {
    $report = Report::factory()->create();

    expect(fn () => DB::table('reports')->where('id', $report->id)->update([$column => $value]))
        ->toThrow(QueryException::class);
})->with([
    ['status', 'exploded'],
    ['priority', 'apocalyptic'],
    ['location_mode', 'telepathy'],
]);

it('stores coordinates with seven decimal places', function () {
    $report = Report::factory()->create([
        'location_lat' => 52.2296756,
        'location_lng' => 21.0122287,
        'location_updated_at' => now(),
    ]);

    expect((float) $report->fresh()->location_lat)->toBe(52.2296756);
    expect((float) $report->fresh()->location_lng)->toBe(21.0122287);
});

it('links the client, category and both assignees', function () {
    $client = User::factory()->client()->create();
    $admin = User::factory()->admin()->create();
    $staff = User::factory()->staff()->create();
    $category = Category::factory()->create();

    $report = Report::factory()->create([
        'client_id' => $client->id,
        'category_id' => $category->id,
        'assigned_admin_id' => $admin->id,
        'assigned_staff_id' => $staff->id,
    ]);

    expect($report->client->id)->toBe($client->id);
    expect($report->category->id)->toBe($category->id);
    expect($report->assignedAdmin->id)->toBe($admin->id);
    expect($report->assignedStaff->id)->toBe($staff->id);
    expect($client->reports)->toHaveCount(1);
});

it('keeps the report when an assignee is deleted', function () {
    $admin = User::factory()->admin()->create();
    $report = Report::factory()->create(['assigned_admin_id' => $admin->id]);

    $admin->forceDelete();

    expect($report->fresh()->assigned_admin_id)->toBeNull();
});

it('holds an ai priority score with its explanation', function () {
    $report = Report::factory()->scored(87.5)->create();

    expect((float) $report->ai_priority)->toBe(87.5);
    expect($report->ai_priority_calculated_at)->not->toBeNull();
    expect($report->ai_priority_reason)->toBeArray();
});

it('leaves ai_priority null until the job has run', function () {
    expect(Report::factory()->create()->ai_priority)->toBeNull();
});

it('marks terminal reports as not open', function () {
    expect(Report::factory()->closed()->create()->isOpen())->toBeFalse();
    expect(Report::factory()->rejected()->create()->isOpen())->toBeFalse();
    expect(Report::factory()->waiting()->create()->isOpen())->toBeTrue();
});

it('creates the three partial queue indexes', function () {
    $indexes = collect(DB::select("SELECT indexname FROM pg_indexes WHERE tablename = 'reports'"))
        ->pluck('indexname');

    expect($indexes)->toContain('reports_queue_fifo_idx')
        ->toContain('reports_queue_client_priority_idx')
        ->toContain('reports_queue_ai_priority_idx');
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/ReportSchemaTest.php`
Expected: FAIL — `Class "App\Models\Report" not found`.

- [ ] **Step 3: Write the migration**

`backend/database/migrations/2026_08_20_120500_create_reports_table.php`:

```php
<?php

use App\Enums\LocationMode;
use App\Enums\ReportPriority;
use App\Enums\ReportStatus;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE SEQUENCE reports_reference_seq');

        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 32)->unique();

            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()
                ->constrained('categories')->nullOnDelete();

            $table->string('name');
            $table->text('description')->nullable();

            $table->string('status', 32)->default(ReportStatus::New->value);

            // Chosen by the client when filing (CLAUDE.md section 7, mode 2).
            $table->string('priority', 32)->default(ReportPriority::Medium->value);
            // Generated, never written by the application: guarantees that ordering
            // by client priority is numeric, not alphabetical.
            $table->smallInteger('priority_weight')->storedAs(
                "CASE priority WHEN 'low' THEN 1 WHEN 'medium' THEN 2 ".
                "WHEN 'high' THEN 3 WHEN 'critical' THEN 4 ELSE 0 END"
            );

            // Filled asynchronously by PriorityScorer (CLAUDE.md section 7, mode 3).
            $table->decimal('ai_priority', 6, 2)->nullable();
            $table->timestamp('ai_priority_calculated_at')->nullable();
            $table->jsonb('ai_priority_reason')->nullable();

            $table->string('location_mode', 32)->default(LocationMode::OneTime->value);
            $table->decimal('location_lat', 10, 7)->nullable();
            $table->decimal('location_lng', 10, 7)->nullable();
            $table->decimal('location_accuracy', 8, 2)->nullable();
            $table->string('location_address')->nullable();
            $table->timestamp('location_updated_at')->nullable();

            $table->foreignId('assigned_admin_id')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_staff_id')->nullable()
                ->constrained('users')->nullOnDelete();

            // Queue position. Separate from created_at so an edit never reshuffles FIFO.
            $table->timestamp('queued_at')->nullable();
            $table->timestamp('assigned_at')->nullable();
            // First time an operator acted — the hyperadmin's response-time metric.
            $table->timestamp('first_response_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by_user_id')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->string('close_reason')->nullable();

            $table->jsonb('metadata')->default(new Expression("'{}'::jsonb"));
            $table->timestamps();
            $table->softDeletes();

            $table->index(['client_id', 'created_at']);
            $table->index(['assigned_admin_id', 'status']);
            $table->index(['assigned_staff_id', 'status']);
            $table->index(['category_id', 'status']);
            $table->index('closed_at');
        });

        DB::statement(
            "ALTER TABLE reports ALTER COLUMN reference SET DEFAULT ".
            "'ZG-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('reports_reference_seq')::text, 6, '0')"
        );

        CheckConstraint::enum('reports', 'status', ReportStatus::values());
        CheckConstraint::enum('reports', 'priority', ReportPriority::values());
        CheckConstraint::enum('reports', 'location_mode', LocationMode::values());

        // The global queue is `reports WHERE status = 'new'`. One partial index
        // per sort mode from CLAUDE.md section 7 — each covers its ORDER BY exactly.
        DB::statement(
            "CREATE INDEX reports_queue_fifo_idx ON reports (queued_at, id) ".
            "WHERE status = 'new' AND deleted_at IS NULL"
        );
        DB::statement(
            "CREATE INDEX reports_queue_client_priority_idx ON reports (priority_weight DESC, queued_at, id) ".
            "WHERE status = 'new' AND deleted_at IS NULL"
        );
        DB::statement(
            "CREATE INDEX reports_queue_ai_priority_idx ON reports (ai_priority DESC NULLS LAST, queued_at, id) ".
            "WHERE status = 'new' AND deleted_at IS NULL"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
        DB::statement('DROP SEQUENCE IF EXISTS reports_reference_seq');
    }
};
```

Dropping the table drops its indexes, constraints and column default, so `down()` only needs the table and the sequence.

- [ ] **Step 4: Verify the generated column and indexes really exist**

Run:
```bash
docker compose -f docker/docker-compose.yml exec -T app php artisan migrate
docker compose -f docker/docker-compose.yml exec -T postgres psql -U app -d app -c "\d reports"
```
Expected: `priority_weight | smallint | generated always as (…) stored`, `reference` with the `nextval` default, and the three `reports_queue_*_idx` entries listed as partial (`WHERE status = 'new' …`).

If `priority_weight` came out as a plain column, `storedAs` did not reach the grammar — stop and report it rather than working around it. (This was checked against `vendor/laravel/framework/.../PostgresGrammar.php:1316` before the plan was written, so it should hold.)

- [ ] **Step 5: Write the Report model**

`backend/app/Models/Report.php`:

```php
<?php

namespace App\Models;

use App\Enums\LocationMode;
use App\Enums\ReportPriority;
use App\Enums\ReportStatus;
use Database\Factories\ReportFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

#[Fillable([
    'client_id', 'category_id', 'name', 'description', 'status', 'priority',
    'ai_priority', 'ai_priority_calculated_at', 'ai_priority_reason',
    'location_mode', 'location_lat', 'location_lng', 'location_accuracy',
    'location_address', 'location_updated_at', 'assigned_admin_id',
    'assigned_staff_id', 'queued_at', 'assigned_at', 'first_response_at',
    'closed_at', 'closed_by_user_id', 'close_reason', 'metadata',
])]
class Report extends Model
{
    /** @use HasFactory<ReportFactory> */
    use HasFactory, SoftDeletes;

    /** Generated by Postgres — never written by the application. */
    protected $guarded = ['priority_weight', 'reference'];

    protected function casts(): array
    {
        return [
            'status' => ReportStatus::class,
            'priority' => ReportPriority::class,
            'location_mode' => LocationMode::class,
            'priority_weight' => 'integer',
            'ai_priority' => 'decimal:2',
            'ai_priority_reason' => 'array',
            'metadata' => 'array',
            'ai_priority_calculated_at' => 'datetime',
            'location_updated_at' => 'datetime',
            'queued_at' => 'datetime',
            'assigned_at' => 'datetime',
            'first_response_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Report $report): void {
            // Drawn from the Postgres sequence before insert, so the value is
            // available on the model without an extra round trip.
            $report->reference ??= sprintf(
                'ZG-%s-%06d',
                now()->format('Y'),
                DB::selectOne("SELECT nextval('reports_reference_seq') AS n")->n,
            );

            // Entering the global queue is what queued_at records.
            $report->queued_at ??= now();
        });
    }

    /** @return BelongsTo<User, $this> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** @return BelongsTo<User, $this> */
    public function assignedAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_admin_id');
    }

    /** @return BelongsTo<User, $this> */
    public function assignedStaff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_staff_id');
    }

    /** @return BelongsTo<User, $this> */
    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by_user_id');
    }

    public function isOpen(): bool
    {
        return ! $this->status->isTerminal();
    }

    public function hasLiveLocation(): bool
    {
        return $this->location_mode === LocationMode::Streaming && $this->isOpen();
    }
}
```

`$guarded` and `#[Fillable]` coexist deliberately: `#[Fillable]` drives mass assignment, `$guarded` documents the two columns the database owns. Because `#[Fillable]` omits them, an accidental `Report::create(['priority_weight' => 9])` is silently dropped rather than reaching Postgres.

- [ ] **Step 6: Write the ReportFactory**

`backend/database/factories/ReportFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Enums\LocationMode;
use App\Enums\ReportPriority;
use App\Enums\ReportStatus;
use App\Models\Category;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Report> */
class ReportFactory extends Factory
{
    protected $model = Report::class;

    public function definition(): array
    {
        return [
            'client_id' => User::factory()->client(),
            'category_id' => Category::factory(),
            'name' => $this->faker->sentence(4),
            'description' => $this->faker->paragraph(),
            'status' => ReportStatus::New,
            'priority' => ReportPriority::Medium,
            'location_mode' => LocationMode::OneTime,
            // Warsaw-ish, so seeded demo data plots somewhere sensible on a map.
            'location_lat' => $this->faker->latitude(51.9, 52.4),
            'location_lng' => $this->faker->longitude(20.8, 21.3),
            'location_accuracy' => $this->faker->randomFloat(2, 3, 60),
            'location_updated_at' => now(),
            'metadata' => [],
        ];
    }

    public function assigned(?User $admin = null): static
    {
        return $this->state(fn () => [
            'status' => ReportStatus::Assigned,
            'assigned_admin_id' => $admin?->id ?? User::factory()->admin(),
            'assigned_at' => now(),
            'first_response_at' => now(),
        ]);
    }

    public function inProgress(): static
    {
        return $this->assigned()->state(fn () => ['status' => ReportStatus::InProgress]);
    }

    public function waiting(): static
    {
        return $this->assigned()->state(fn () => ['status' => ReportStatus::Waiting]);
    }

    public function closed(): static
    {
        return $this->assigned()->state(fn () => [
            'status' => ReportStatus::Closed,
            'closed_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn () => [
            'status' => ReportStatus::Rejected,
            'closed_at' => now(),
            'close_reason' => 'Duplikat zgłoszenia',
        ]);
    }

    public function streamingLocation(): static
    {
        return $this->state(fn () => ['location_mode' => LocationMode::Streaming]);
    }

    public function priority(ReportPriority $priority): static
    {
        return $this->state(fn () => ['priority' => $priority]);
    }

    /** A report the PriorityScorer job has already rated. */
    public function scored(float $score): static
    {
        return $this->state(fn () => [
            'ai_priority' => $score,
            'ai_priority_calculated_at' => now(),
            'ai_priority_reason' => [
                'category_weight' => 0.4,
                'keywords' => ['pożar'],
                'has_media' => true,
            ],
        ]);
    }
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/ReportSchemaTest.php`
Expected: PASS, 15 tests (the parameterised one counts as 3).

- [ ] **Step 8: Format and commit**

```bash
docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pint
git add backend/app backend/database backend/tests
git commit -m "feat: add reports table with generated priority weight and queue indexes"
```

---

### Task 7: The `requests` table (sub-tasks inside a report)

"Zgłoszenie — requesty, po kolei administrator zmienia statusy requestów." A report closes when all of its requests are terminal, so this table needs an ordering column and a cheap way to ask "any open requests left?".

**Files:**
- Create: `backend/database/migrations/2026_08_20_120600_create_requests_table.php`
- Create: `backend/app/Models/Request.php`
- Create: `backend/database/factories/RequestFactory.php`
- Modify: `backend/app/Models/Report.php` (add `requests()` relation + `hasOpenRequests()`)
- Test: `backend/tests/Feature/Schema/RequestSchemaTest.php`

**Interfaces:**
- Consumes: `Report`, `RequestType`, `StaffRole`, `User`; `RequestStatus`, `CheckConstraint`.
- Produces:
  - Table `requests`: `id, report_id, request_type_id, staff_role_id, assigned_staff_id, created_by_user_id, status, sequence, title, description, amount, scheduled_at, started_at, completed_at, cancel_reason, metadata, timestamps, deleted_at`.
  - `Request` model with `report()`, `requestType()`, `staffRole()`, `assignedStaff()`, `createdBy()`, scopes `open()`, `forStaff(User $user)`.
  - `Report::requests()` HasMany ordered by `sequence`, and `Report::hasOpenRequests(): bool`.
  - `RequestFactory` with states `inProgress() / done() / cancelled()`.

Remember the naming rule: import as `use App\Models\Request as ReportRequest;` wherever `Illuminate\Http\Request` is also in scope. Inside the model file itself no alias is needed.

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Schema/RequestSchemaTest.php`:

```php
<?php

use App\Enums\RequestStatus;
use App\Models\Report;
use App\Models\Request as ReportRequest;
use App\Models\RequestType;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('attaches a request to a report', function () {
    $report = Report::factory()->create();
    $type = RequestType::factory()->create(['slug' => 'service_arrival']);

    $request = ReportRequest::factory()->create([
        'report_id' => $report->id,
        'request_type_id' => $type->id,
    ]);

    expect($request->status)->toBe(RequestStatus::Pending);
    expect($request->report->id)->toBe($report->id);
    expect($request->requestType->slug)->toBe('service_arrival');
    expect($report->requests)->toHaveCount(1);
});

it('orders requests by sequence so the admin works through them in order', function () {
    $report = Report::factory()->create();

    ReportRequest::factory()->create(['report_id' => $report->id, 'sequence' => 3, 'title' => 'third']);
    ReportRequest::factory()->create(['report_id' => $report->id, 'sequence' => 1, 'title' => 'first']);
    ReportRequest::factory()->create(['report_id' => $report->id, 'sequence' => 2, 'title' => 'second']);

    expect($report->requests->pluck('title')->all())->toBe(['first', 'second', 'third']);
});

it('knows when a report still has open requests', function () {
    $report = Report::factory()->create();
    ReportRequest::factory()->done()->create(['report_id' => $report->id]);
    $open = ReportRequest::factory()->create(['report_id' => $report->id]);

    expect($report->hasOpenRequests())->toBeTrue();

    $open->update(['status' => RequestStatus::Cancelled]);

    expect($report->fresh()->hasOpenRequests())->toBeFalse();
});

it('treats done and cancelled as closing a request', function () {
    $report = Report::factory()->create();
    ReportRequest::factory()->done()->create(['report_id' => $report->id]);
    ReportRequest::factory()->cancelled()->create(['report_id' => $report->id]);

    expect($report->hasOpenRequests())->toBeFalse();
    expect(ReportRequest::query()->open()->count())->toBe(0);
});

it('deletes requests together with their report', function () {
    $report = Report::factory()->create();
    ReportRequest::factory()->count(3)->create(['report_id' => $report->id]);

    $report->forceDelete();

    expect(ReportRequest::withTrashed()->count())->toBe(0);
});

it('refuses an unknown request status', function () {
    $request = ReportRequest::factory()->create();

    DB::table('requests')->where('id', $request->id)->update(['status' => 'maybe']);
})->throws(QueryException::class);

it('stores money requests with two decimal places', function () {
    $request = ReportRequest::factory()->create(['amount' => 1234.56]);

    expect((float) $request->fresh()->amount)->toBe(1234.56);
});

it('finds the requests assigned to one staff member', function () {
    $staff = User::factory()->staff()->create();
    $other = User::factory()->staff()->create();

    ReportRequest::factory()->count(2)->create(['assigned_staff_id' => $staff->id]);
    ReportRequest::factory()->create(['assigned_staff_id' => $other->id]);

    expect(ReportRequest::query()->forStaff($staff)->count())->toBe(2);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/RequestSchemaTest.php`
Expected: FAIL — `Class "App\Models\Request" not found`.

- [ ] **Step 3: Write the migration**

`backend/database/migrations/2026_08_20_120600_create_requests_table.php`:

```php
<?php

use App\Enums\RequestStatus;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A sub-task inside a report: call the client back, send a service,
     * schedule a meeting, request funds. The report closes when every
     * request here is terminal.
     */
    public function up(): void
    {
        Schema::create('requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->foreignId('request_type_id')->nullable()
                ->constrained('request_types')->nullOnDelete();
            // Which service should carry this out, when no individual is named yet.
            $table->foreignId('staff_role_id')->nullable()
                ->constrained('staff_roles')->nullOnDelete();
            $table->foreignId('assigned_staff_id')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->foreignId('created_by_user_id')->nullable()
                ->constrained('users')->nullOnDelete();

            $table->string('status', 32)->default(RequestStatus::Pending->value);
            // The order the admin works through them ("po kolei").
            $table->unsignedSmallInteger('sequence')->default(0);

            $table->string('title')->nullable();
            $table->text('description')->nullable();
            // Only for money requests; request_types.requires_amount drives validation.
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('currency', 3)->nullable();
            // Only for meetings / scheduled service arrivals.
            $table->timestamp('scheduled_at')->nullable();

            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('cancel_reason')->nullable();

            $table->jsonb('metadata')->default(new Expression("'{}'::jsonb"));
            $table->timestamps();
            $table->softDeletes();

            $table->index(['report_id', 'sequence']);
            $table->index(['report_id', 'status']);
            $table->index(['assigned_staff_id', 'status']);
            $table->index(['staff_role_id', 'status']);
        });

        CheckConstraint::enum('requests', 'status', RequestStatus::values());
    }

    public function down(): void
    {
        CheckConstraint::drop('requests', 'status');
        Schema::dropIfExists('requests');
    }
};
```

- [ ] **Step 4: Write the Request model**

`backend/app/Models/Request.php`:

```php
<?php

namespace App\Models;

use App\Enums\RequestStatus;
use Database\Factories\RequestFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A sub-task of a Report. Import aliased wherever Illuminate\Http\Request is
 * also in scope: `use App\Models\Request as ReportRequest;`
 */
#[Fillable([
    'report_id', 'request_type_id', 'staff_role_id', 'assigned_staff_id',
    'created_by_user_id', 'status', 'sequence', 'title', 'description',
    'amount', 'currency', 'scheduled_at', 'started_at', 'completed_at',
    'cancel_reason', 'metadata',
])]
class Request extends Model
{
    /** @use HasFactory<RequestFactory> */
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'status' => RequestStatus::class,
            'sequence' => 'integer',
            'amount' => 'decimal:2',
            'metadata' => 'array',
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Report, $this> */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    /** @return BelongsTo<RequestType, $this> */
    public function requestType(): BelongsTo
    {
        return $this->belongsTo(RequestType::class);
    }

    /** @return BelongsTo<StaffRole, $this> */
    public function staffRole(): BelongsTo
    {
        return $this->belongsTo(StaffRole::class);
    }

    /** @return BelongsTo<User, $this> */
    public function assignedStaff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_staff_id');
    }

    /** @return BelongsTo<User, $this> */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /** @param  Builder<$this>  $query */
    public function scopeOpen(Builder $query): void
    {
        $query->whereIn('status', [RequestStatus::Pending, RequestStatus::InProgress]);
    }

    /** @param  Builder<$this>  $query */
    public function scopeForStaff(Builder $query, User $user): void
    {
        $query->where('assigned_staff_id', $user->id);
    }
}
```

- [ ] **Step 5: Wire the relation onto Report**

Add to `backend/app/Models/Report.php` (imports: `use Illuminate\Database\Eloquent\Relations\HasMany;`):

```php
    /** @return HasMany<Request, $this> */
    public function requests(): HasMany
    {
        return $this->hasMany(Request::class)->orderBy('sequence')->orderBy('id');
    }

    /** A report may auto-close once this returns false (CLAUDE.md section 6). */
    public function hasOpenRequests(): bool
    {
        return $this->requests()->open()->exists();
    }
```

- [ ] **Step 6: Write the RequestFactory**

`backend/database/factories/RequestFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Enums\RequestStatus;
use App\Models\Report;
use App\Models\Request;
use App\Models\RequestType;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Request> */
class RequestFactory extends Factory
{
    protected $model = Request::class;

    public function definition(): array
    {
        return [
            'report_id' => Report::factory(),
            'request_type_id' => RequestType::factory(),
            'status' => RequestStatus::Pending,
            'sequence' => 0,
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->sentence(),
            'metadata' => [],
        ];
    }

    public function inProgress(): static
    {
        return $this->state(fn () => [
            'status' => RequestStatus::InProgress,
            'started_at' => now(),
        ]);
    }

    public function done(): static
    {
        return $this->state(fn () => [
            'status' => RequestStatus::Done,
            'started_at' => now()->subMinutes(20),
            'completed_at' => now(),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn () => [
            'status' => RequestStatus::Cancelled,
            'completed_at' => now(),
            'cancel_reason' => 'Nieaktualne',
        ]);
    }
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/RequestSchemaTest.php`
Expected: PASS, 8 tests.

- [ ] **Step 8: Format and commit**

```bash
docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pint
git add backend/app backend/database backend/tests
git commit -m "feat: add requests table for report sub-tasks"
```

---

### Task 8: Append-only audit trail

Three tables, three distinct questions. `report_status_histories`: how did the status move, and who moved it (CLAUDE.md §6 and §18 — immutable). `report_revisions`: what did the client edit after filing. `report_assignments`: who held this report and for how long — the source for the hyperadmin's workload analytics.

A Postgres trigger blocks `UPDATE` on all three. `DELETE` stays allowed: GDPR erasure of one client's history has to remain possible, and immutability of a *written* record is what the audit requires.

**Files:**
- Create: `backend/database/migrations/2026_08_20_120700_create_report_status_histories_table.php`
- Create: `backend/database/migrations/2026_08_20_120800_create_report_revisions_table.php`
- Create: `backend/database/migrations/2026_08_20_120900_create_report_assignments_table.php`
- Create: `backend/app/Models/ReportStatusHistory.php`, `ReportRevision.php`, `ReportAssignment.php`
- Create: `backend/database/factories/ReportStatusHistoryFactory.php`, `ReportAssignmentFactory.php`
- Modify: `backend/app/Models/Report.php` (three HasMany relations)
- Test: `backend/tests/Feature/Schema/AuditTrailTest.php`

**Interfaces:**
- Consumes: `Report`, `User`; `ReportStatus`, `AssignmentRole`, `CheckConstraint`.
- Produces:
  - `report_status_histories`: `id, report_id, changed_by_user_id, from_status, to_status, note, context jsonb, created_at`.
  - `report_revisions`: `id, report_id, user_id, changes jsonb, created_at`.
  - `report_assignments`: `id, report_id, user_id, role, assigned_by_user_id, assigned_at, unassigned_at, unassign_reason, created_at`.
  - Postgres function `forbid_row_update()` plus one `BEFORE UPDATE` trigger per table.
  - Models with `$timestamps = false`, `UPDATED_AT = null`, relations, and `Report::statusHistories() / revisions() / assignments()`.
  - Partial unique index `report_assignments_active_unique` on `(report_id, user_id) WHERE unassigned_at IS NULL`.

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Schema/AuditTrailTest.php`:

```php
<?php

use App\Enums\AssignmentRole;
use App\Enums\ReportStatus;
use App\Models\Report;
use App\Models\ReportAssignment;
use App\Models\ReportRevision;
use App\Models\ReportStatusHistory;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('records a status transition with its author', function () {
    $report = Report::factory()->create();
    $admin = User::factory()->admin()->create();

    $history = ReportStatusHistory::create([
        'report_id' => $report->id,
        'changed_by_user_id' => $admin->id,
        'from_status' => ReportStatus::New,
        'to_status' => ReportStatus::Assigned,
        'note' => 'Przypisano do siebie',
        'context' => ['source' => 'queue.claim'],
    ]);

    expect($history->from_status)->toBe(ReportStatus::New);
    expect($history->to_status)->toBe(ReportStatus::Assigned);
    expect($history->changedBy->id)->toBe($admin->id);
    expect($history->context)->toBe(['source' => 'queue.claim']);
    expect($report->statusHistories)->toHaveCount(1);
});

it('allows a null from_status for the very first entry', function () {
    $report = Report::factory()->create();

    $history = ReportStatusHistory::create([
        'report_id' => $report->id,
        'from_status' => null,
        'to_status' => ReportStatus::New,
    ]);

    expect($history->from_status)->toBeNull();
});

it('refuses to update a status history row', function () {
    $report = Report::factory()->create();
    $history = ReportStatusHistory::create([
        'report_id' => $report->id,
        'to_status' => ReportStatus::New,
    ]);

    DB::table('report_status_histories')->where('id', $history->id)
        ->update(['note' => 'rewriting history']);
})->throws(QueryException::class);

it('refuses to update a revision or an assignment', function (string $table) {
    $report = Report::factory()->create();
    $id = DB::table($table)->insertGetId(match ($table) {
        'report_revisions' => [
            'report_id' => $report->id,
            'changes' => json_encode(['name' => ['old' => 'a', 'new' => 'b']]),
            'created_at' => now(),
        ],
        'report_assignments' => [
            'report_id' => $report->id,
            'user_id' => User::factory()->admin()->create()->id,
            'role' => 'admin',
            'assigned_at' => now(),
            'created_at' => now(),
        ],
    });

    expect(fn () => DB::table($table)->where('id', $id)->update(['report_id' => $report->id]))
        ->toThrow(QueryException::class);
})->with(['report_revisions', 'report_assignments']);

it('still allows deletion for gdpr erasure', function () {
    $report = Report::factory()->create();
    ReportStatusHistory::create(['report_id' => $report->id, 'to_status' => ReportStatus::New]);

    DB::table('report_status_histories')->where('report_id', $report->id)->delete();

    expect(ReportStatusHistory::query()->count())->toBe(0);
});

it('records what the client edited after filing', function () {
    $report = Report::factory()->create();
    $client = User::factory()->client()->create();

    $revision = ReportRevision::create([
        'report_id' => $report->id,
        'user_id' => $client->id,
        'changes' => [
            'name' => ['old' => 'Wyciek wody', 'new' => 'Zalanie mieszkania'],
            'priority' => ['old' => 'medium', 'new' => 'high'],
        ],
    ]);

    expect($revision->changes)->toHaveKey('priority');
    expect($revision->changes['priority']['new'])->toBe('high');
    expect($report->revisions)->toHaveCount(1);
});

it('tracks assignment spans for workload analytics', function () {
    $report = Report::factory()->create();
    $admin = User::factory()->admin()->create();

    $assignment = ReportAssignment::create([
        'report_id' => $report->id,
        'user_id' => $admin->id,
        'role' => AssignmentRole::Admin,
        'assigned_at' => now()->subMinutes(30),
    ]);

    expect($assignment->role)->toBe(AssignmentRole::Admin);
    expect($assignment->unassigned_at)->toBeNull();
    expect($report->assignments)->toHaveCount(1);
});

it('allows only one active assignment per user per report', function () {
    $report = Report::factory()->create();
    $staff = User::factory()->staff()->create();

    ReportAssignment::create([
        'report_id' => $report->id, 'user_id' => $staff->id,
        'role' => AssignmentRole::Staff, 'assigned_at' => now(),
    ]);
    ReportAssignment::create([
        'report_id' => $report->id, 'user_id' => $staff->id,
        'role' => AssignmentRole::Staff, 'assigned_at' => now(),
    ]);
})->throws(QueryException::class);

it('allows re-assigning the same user after they were released', function () {
    $report = Report::factory()->create();
    $staff = User::factory()->staff()->create();

    ReportAssignment::create([
        'report_id' => $report->id, 'user_id' => $staff->id,
        'role' => AssignmentRole::Staff,
        'assigned_at' => now()->subHour(), 'unassigned_at' => now()->subMinutes(10),
    ]);
    ReportAssignment::create([
        'report_id' => $report->id, 'user_id' => $staff->id,
        'role' => AssignmentRole::Staff, 'assigned_at' => now(),
    ]);

    expect(ReportAssignment::query()->count())->toBe(2);
});

it('carries no updated_at on append-only tables', function () {
    expect(DB::getSchemaBuilder()->hasColumn('report_status_histories', 'updated_at'))->toBeFalse();
    expect(DB::getSchemaBuilder()->hasColumn('report_revisions', 'updated_at'))->toBeFalse();
    expect(DB::getSchemaBuilder()->hasColumn('report_assignments', 'updated_at'))->toBeFalse();
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/AuditTrailTest.php`
Expected: FAIL — `Class "App\Models\ReportStatusHistory" not found`.

- [ ] **Step 3: Write the status history migration (creates the shared trigger function)**

`backend/database/migrations/2026_08_20_120700_create_report_status_histories_table.php`:

```php
<?php

use App\Enums\ReportStatus;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Shared by all three audit tables. DELETE is deliberately still
        // allowed so GDPR erasure remains possible; only rewriting is blocked.
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION forbid_row_update() RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'Table % is append-only and cannot be updated', TG_TABLE_NAME;
            END;
            $$ LANGUAGE plpgsql;
        SQL);

        Schema::create('report_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->foreignId('changed_by_user_id')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->string('from_status', 32)->nullable();
            $table->string('to_status', 32);
            $table->text('note')->nullable();
            // Why the change happened: which event, which request completed, etc.
            $table->jsonb('context')->default(new Expression("'{}'::jsonb"));
            $table->timestamp('created_at')->useCurrent();

            $table->index(['report_id', 'created_at']);
            $table->index(['changed_by_user_id', 'created_at']);
        });

        CheckConstraint::enum('report_status_histories', 'from_status', ReportStatus::values(), nullable: true);
        CheckConstraint::enum('report_status_histories', 'to_status', ReportStatus::values());

        DB::statement(
            'CREATE TRIGGER report_status_histories_append_only '.
            'BEFORE UPDATE ON report_status_histories '.
            'FOR EACH ROW EXECUTE FUNCTION forbid_row_update()'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('report_status_histories');
        DB::statement('DROP FUNCTION IF EXISTS forbid_row_update()');
    }
};
```

`down()` drops the function last; the two later migrations must therefore roll back before this one, which they do since rollback runs newest-first.

- [ ] **Step 4: Write the revisions and assignments migrations**

`backend/database/migrations/2026_08_20_120800_create_report_revisions_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Field-level edit history: "dodaj załączniki, zmień, ale jest historia
     * zmiany zgłoszeń". Shape: {"field": {"old": …, "new": …}}.
     */
    public function up(): void
    {
        Schema::create('report_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->jsonb('changes');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['report_id', 'created_at']);
        });

        DB::statement(
            'CREATE TRIGGER report_revisions_append_only '.
            'BEFORE UPDATE ON report_revisions '.
            'FOR EACH ROW EXECUTE FUNCTION forbid_row_update()'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('report_revisions');
    }
};
```

`backend/database/migrations/2026_08_20_120900_create_report_assignments_table.php`:

```php
<?php

use App\Enums\AssignmentRole;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Who held this report and when. reports.assigned_admin_id /
     * assigned_staff_id remain the fast "who has it now" pointers; this table
     * is the history behind them, and the room to send more than one responder.
     */
    public function up(): void
    {
        Schema::create('report_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role', 32);
            $table->foreignId('assigned_by_user_id')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamp('unassigned_at')->nullable();
            $table->string('unassign_reason')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['report_id', 'assigned_at']);
            $table->index(['user_id', 'assigned_at']);
        });

        CheckConstraint::enum('report_assignments', 'role', AssignmentRole::values());

        DB::statement(
            'CREATE UNIQUE INDEX report_assignments_active_unique '.
            'ON report_assignments (report_id, user_id) WHERE unassigned_at IS NULL'
        );

        DB::statement(
            'CREATE TRIGGER report_assignments_append_only '.
            'BEFORE UPDATE ON report_assignments '.
            'FOR EACH ROW EXECUTE FUNCTION forbid_row_update()'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('report_assignments');
    }
};
```

Note the consequence of the trigger: releasing an assignment cannot be an `UPDATE`. The release path inserts a fresh row carrying `unassigned_at`, or the trigger is narrowed later — a decision for whichever task builds assignment. Flag it in that task, not here.

**Correction to make while writing this:** the test `allows re-assigning the same user after they were released` inserts the released row with `unassigned_at` already set, so it never updates. That is the intended usage pattern.

- [ ] **Step 5: Write the three models**

`backend/app/Models/ReportStatusHistory.php`:

```php
<?php

namespace App\Models;

use App\Enums\ReportStatus;
use Database\Factories\ReportStatusHistoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Append-only. A Postgres trigger rejects any UPDATE. */
#[Fillable(['report_id', 'changed_by_user_id', 'from_status', 'to_status', 'note', 'context'])]
class ReportStatusHistory extends Model
{
    /** @use HasFactory<ReportStatusHistoryFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'from_status' => ReportStatus::class,
            'to_status' => ReportStatus::class,
            'context' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Report, $this> */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    /** @return BelongsTo<User, $this> */
    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}
```

`backend/app/Models/ReportRevision.php` — same shape, `#[Fillable(['report_id', 'user_id', 'changes'])]`, casts `['changes' => 'array', 'created_at' => 'datetime']`, relations `report()` and `user()`, `public const UPDATED_AT = null;`, no factory.

`backend/app/Models/ReportAssignment.php` — `#[Fillable(['report_id', 'user_id', 'role', 'assigned_by_user_id', 'assigned_at', 'unassigned_at', 'unassign_reason'])]`, casts `['role' => AssignmentRole::class, 'assigned_at' => 'datetime', 'unassigned_at' => 'datetime', 'created_at' => 'datetime']`, relations `report()`, `user()`, `assignedBy()`, `public const UPDATED_AT = null;`, `use HasFactory`.

Full text of `ReportAssignment` so there is no ambiguity about the `UPDATED_AT` handling:

```php
<?php

namespace App\Models;

use App\Enums\AssignmentRole;
use Database\Factories\ReportAssignmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Append-only. A Postgres trigger rejects any UPDATE. */
#[Fillable(['report_id', 'user_id', 'role', 'assigned_by_user_id', 'assigned_at', 'unassigned_at', 'unassign_reason'])]
class ReportAssignment extends Model
{
    /** @use HasFactory<ReportAssignmentFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'role' => AssignmentRole::class,
            'assigned_at' => 'datetime',
            'unassigned_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Report, $this> */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<User, $this> */
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by_user_id');
    }
}
```

- [ ] **Step 6: Write the two factories**

`backend/database/factories/ReportStatusHistoryFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Enums\ReportStatus;
use App\Models\Report;
use App\Models\ReportStatusHistory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ReportStatusHistory> */
class ReportStatusHistoryFactory extends Factory
{
    protected $model = ReportStatusHistory::class;

    public function definition(): array
    {
        return [
            'report_id' => Report::factory(),
            'changed_by_user_id' => User::factory()->admin(),
            'from_status' => ReportStatus::New,
            'to_status' => ReportStatus::Assigned,
            'note' => null,
            'context' => [],
        ];
    }
}
```

`backend/database/factories/ReportAssignmentFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Enums\AssignmentRole;
use App\Models\Report;
use App\Models\ReportAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ReportAssignment> */
class ReportAssignmentFactory extends Factory
{
    protected $model = ReportAssignment::class;

    public function definition(): array
    {
        return [
            'report_id' => Report::factory(),
            'user_id' => User::factory()->admin(),
            'role' => AssignmentRole::Admin,
            'assigned_at' => now(),
        ];
    }

    public function released(): static
    {
        return $this->state(fn () => ['unassigned_at' => now()]);
    }
}
```

- [ ] **Step 7: Wire the relations onto Report**

Add to `backend/app/Models/Report.php`:

```php
    /** @return HasMany<ReportStatusHistory, $this> */
    public function statusHistories(): HasMany
    {
        return $this->hasMany(ReportStatusHistory::class)->orderBy('created_at')->orderBy('id');
    }

    /** @return HasMany<ReportRevision, $this> */
    public function revisions(): HasMany
    {
        return $this->hasMany(ReportRevision::class)->orderByDesc('created_at');
    }

    /** @return HasMany<ReportAssignment, $this> */
    public function assignments(): HasMany
    {
        return $this->hasMany(ReportAssignment::class)->orderByDesc('assigned_at');
    }
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/AuditTrailTest.php`
Expected: PASS, 11 tests (the parameterised one counts as 2).

- [ ] **Step 9: Format and commit**

```bash
docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pint
git add backend/app backend/database backend/tests
git commit -m "feat: add append-only status history, revisions and assignments"
```

---

### Task 9: Attachments

Photos, files, and the voice notes from CLAUDE.md §9.5 all land here. Files live in MinIO and are never public — the table stores the disk and path, and a signed temporary URL is minted later behind a Policy (§18). The audio columns exist so the field worker's player can render a duration without downloading the file first.

**Files:**
- Create: `backend/database/migrations/2026_08_20_121000_create_attachments_table.php`
- Create: `backend/app/Models/Attachment.php`
- Create: `backend/database/factories/AttachmentFactory.php`
- Modify: `backend/app/Models/Report.php` (`attachments()`, `voiceNotes()`)
- Test: `backend/tests/Feature/Schema/AttachmentSchemaTest.php`

**Interfaces:**
- Consumes: `Report`, `Request`, `User`; `AttachmentType`, `CheckConstraint`.
- Produces:
  - Table `attachments`: `id, report_id, request_id, uploaded_by_user_id, type, disk, path, original_name, mime_type, size_bytes, duration_seconds, width, height, checksum, metadata, timestamps, deleted_at`.
  - `Attachment` with `report()`, `request()`, `uploadedBy()`, scopes `ofType(AttachmentType)`, `voiceNotes()`, and `isPlayable(): bool`.
  - `Report::attachments()` and `Report::voiceNotes()`.
  - `AttachmentFactory` states `photo() / voiceNote() / document() / video()`.

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Schema/AttachmentSchemaTest.php`:

```php
<?php

use App\Enums\AttachmentType;
use App\Models\Attachment;
use App\Models\Report;
use App\Models\Request as ReportRequest;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('stores a photo against a report', function () {
    $report = Report::factory()->create();
    $client = User::factory()->client()->create();

    $attachment = Attachment::factory()->photo()->create([
        'report_id' => $report->id,
        'uploaded_by_user_id' => $client->id,
    ]);

    expect($attachment->type)->toBe(AttachmentType::Photo);
    expect($attachment->disk)->toBe('s3');
    expect($attachment->uploadedBy->id)->toBe($client->id);
    expect($report->attachments)->toHaveCount(1);
});

it('stores a voice note with its duration', function () {
    $report = Report::factory()->create();

    $note = Attachment::factory()->voiceNote()->create(['report_id' => $report->id]);

    expect($note->type)->toBe(AttachmentType::Audio);
    expect($note->mime_type)->toBe('audio/mp4');
    expect($note->duration_seconds)->toBeGreaterThan(0);
    expect($note->isPlayable())->toBeTrue();
    expect($report->voiceNotes()->count())->toBe(1);
});

it('separates voice notes from photos on the same report', function () {
    $report = Report::factory()->create();
    Attachment::factory()->photo()->count(3)->create(['report_id' => $report->id]);
    Attachment::factory()->voiceNote()->count(2)->create(['report_id' => $report->id]);

    expect($report->attachments()->count())->toBe(5);
    expect($report->voiceNotes()->count())->toBe(2);
    expect(Attachment::query()->ofType(AttachmentType::Photo)->count())->toBe(3);
});

it('optionally binds an attachment to one request', function () {
    $report = Report::factory()->create();
    $request = ReportRequest::factory()->create(['report_id' => $report->id]);

    $attachment = Attachment::factory()->photo()->create([
        'report_id' => $report->id,
        'request_id' => $request->id,
    ]);

    expect($attachment->request->id)->toBe($request->id);
});

it('keeps the attachment when its request is deleted', function () {
    $report = Report::factory()->create();
    $request = ReportRequest::factory()->create(['report_id' => $report->id]);
    $attachment = Attachment::factory()->photo()->create([
        'report_id' => $report->id,
        'request_id' => $request->id,
    ]);

    $request->forceDelete();

    expect($attachment->fresh()->request_id)->toBeNull();
    expect($attachment->fresh())->not->toBeNull();
});

it('deletes attachments with their report', function () {
    $report = Report::factory()->create();
    Attachment::factory()->count(2)->create(['report_id' => $report->id]);

    $report->forceDelete();

    expect(Attachment::withTrashed()->count())->toBe(0);
});

it('refuses an unknown attachment type', function () {
    $attachment = Attachment::factory()->photo()->create();

    DB::table('attachments')->where('id', $attachment->id)->update(['type' => 'hologram']);
})->throws(QueryException::class);

it('records size so upload limits can be audited', function () {
    $attachment = Attachment::factory()->photo()->create(['size_bytes' => 4_194_304]);

    expect($attachment->fresh()->size_bytes)->toBe(4_194_304);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/AttachmentSchemaTest.php`
Expected: FAIL — `Class "App\Models\Attachment" not found`.

- [ ] **Step 3: Write the migration**

`backend/database/migrations/2026_08_20_121000_create_attachments_table.php`:

```php
<?php

use App\Enums\AttachmentType;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Photos, documents, videos and voice notes (CLAUDE.md section 9.5).
     * Objects live in MinIO; nothing here is publicly reachable — access goes
     * through a signed temporary URL minted after a Policy check (section 18).
     */
    public function up(): void
    {
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->foreignId('request_id')->nullable()
                ->constrained('requests')->nullOnDelete();
            $table->foreignId('uploaded_by_user_id')->nullable()
                ->constrained('users')->nullOnDelete();

            $table->string('type', 32);
            $table->string('disk', 32)->default('s3');
            $table->string('path');
            $table->string('original_name')->nullable();
            $table->string('mime_type', 128)->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();

            // Audio and video only — lets the player show a duration up front.
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('checksum', 64)->nullable();

            $table->jsonb('metadata')->default(new Expression("'{}'::jsonb"));
            $table->timestamps();
            $table->softDeletes();

            $table->index(['report_id', 'type']);
            $table->index(['report_id', 'created_at']);
            $table->index('request_id');
        });

        CheckConstraint::enum('attachments', 'type', AttachmentType::values());
    }

    public function down(): void
    {
        CheckConstraint::drop('attachments', 'type');
        Schema::dropIfExists('attachments');
    }
};
```

- [ ] **Step 4: Write the Attachment model**

`backend/app/Models/Attachment.php`:

```php
<?php

namespace App\Models;

use App\Enums\AttachmentType;
use Database\Factories\AttachmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'report_id', 'request_id', 'uploaded_by_user_id', 'type', 'disk', 'path',
    'original_name', 'mime_type', 'size_bytes', 'duration_seconds',
    'width', 'height', 'checksum', 'metadata',
])]
class Attachment extends Model
{
    /** @use HasFactory<AttachmentFactory> */
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'type' => AttachmentType::class,
            'size_bytes' => 'integer',
            'duration_seconds' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
            'metadata' => 'array',
        ];
    }

    /** @return BelongsTo<Report, $this> */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    /** @return BelongsTo<Request, $this> */
    public function request(): BelongsTo
    {
        return $this->belongsTo(Request::class);
    }

    /** @return BelongsTo<User, $this> */
    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }

    public function isPlayable(): bool
    {
        return in_array($this->type, [AttachmentType::Audio, AttachmentType::Video], true);
    }

    /** @param  Builder<$this>  $query */
    public function scopeOfType(Builder $query, AttachmentType $type): void
    {
        $query->where('type', $type);
    }

    /** @param  Builder<$this>  $query */
    public function scopeVoiceNotes(Builder $query): void
    {
        $query->where('type', AttachmentType::Audio);
    }
}
```

- [ ] **Step 5: Write the AttachmentFactory**

`backend/database/factories/AttachmentFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Enums\AttachmentType;
use App\Models\Attachment;
use App\Models\Report;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Attachment> */
class AttachmentFactory extends Factory
{
    protected $model = Attachment::class;

    public function definition(): array
    {
        return [
            'report_id' => Report::factory(),
            'type' => AttachmentType::File,
            'disk' => 's3',
            'path' => 'reports/'.Str::uuid().'.bin',
            'original_name' => 'plik.bin',
            'mime_type' => 'application/octet-stream',
            'size_bytes' => $this->faker->numberBetween(1_000, 5_000_000),
            'metadata' => [],
        ];
    }

    public function photo(): static
    {
        return $this->state(fn () => [
            'type' => AttachmentType::Photo,
            'path' => 'reports/'.Str::uuid().'.jpg',
            'original_name' => 'zdjecie.jpg',
            'mime_type' => 'image/jpeg',
            'width' => 1920,
            'height' => 1080,
        ]);
    }

    /** A short recording sent as a file, not a live stream (CLAUDE.md 9.5). */
    public function voiceNote(): static
    {
        return $this->state(fn () => [
            'type' => AttachmentType::Audio,
            'path' => 'reports/'.Str::uuid().'.m4a',
            'original_name' => 'wiadomosc.m4a',
            'mime_type' => 'audio/mp4',
            'duration_seconds' => $this->faker->numberBetween(3, 60),
        ]);
    }

    public function document(): static
    {
        return $this->state(fn () => [
            'type' => AttachmentType::File,
            'path' => 'reports/'.Str::uuid().'.pdf',
            'original_name' => 'dokument.pdf',
            'mime_type' => 'application/pdf',
        ]);
    }

    public function video(): static
    {
        return $this->state(fn () => [
            'type' => AttachmentType::Video,
            'path' => 'reports/'.Str::uuid().'.mp4',
            'original_name' => 'nagranie.mp4',
            'mime_type' => 'video/mp4',
            'duration_seconds' => $this->faker->numberBetween(5, 180),
            'width' => 1280,
            'height' => 720,
        ]);
    }
}
```

- [ ] **Step 6: Wire the relations onto Report**

Add to `backend/app/Models/Report.php`:

```php
    /** @return HasMany<Attachment, $this> */
    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class)->orderByDesc('created_at');
    }

    /** Voice notes only — rendered with a player in the staff view. @return HasMany<Attachment, $this> */
    public function voiceNotes(): HasMany
    {
        return $this->attachments()->voiceNotes();
    }
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/AttachmentSchemaTest.php`
Expected: PASS, 8 tests.

- [ ] **Step 8: Format and commit**

```bash
docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pint
git add backend/app backend/database backend/tests
git commit -m "feat: add attachments table covering photos, files and voice notes"
```

---

### Task 10: Location streaming

Two tables. `location_streams` is a session — the client pressed start, and can press stop; it is what the "Twoja lokalizacja jest transmitowana" banner reflects. `location_pings` is the high-volume trail. Pings carry no `updated_at`, get a batch-insert-friendly shape, and are the GDPR retention target from §18.

**Files:**
- Create: `backend/database/migrations/2026_08_20_121100_create_location_streams_table.php`
- Create: `backend/database/migrations/2026_08_20_121200_create_location_pings_table.php`
- Create: `backend/app/Models/LocationStream.php`, `backend/app/Models/LocationPing.php`
- Create: `backend/database/factories/LocationStreamFactory.php`, `LocationPingFactory.php`
- Modify: `backend/app/Models/Report.php` (`locationStreams()`, `locationPings()`, `activeLocationStream()`)
- Test: `backend/tests/Feature/Schema/LocationSchemaTest.php`

**Interfaces:**
- Consumes: `Report`, `User`.
- Produces:
  - `location_streams`: `id, report_id, started_by_user_id, started_at, ended_at, ping_count, last_ping_at, stop_reason, metadata, timestamps`.
  - `location_pings`: `id (bigint), report_id, location_stream_id, lat, lng, accuracy, altitude, speed, heading, battery_level, is_moving, recorded_at, created_at`.
  - `LocationStream` with `report()`, `startedBy()`, `pings()`, `isLive(): bool`, scope `live()`.
  - `LocationPing` with `report()`, `stream()`, scope `recordedBetween()`.
  - Partial unique index `location_streams_one_live_per_report` on `(report_id) WHERE ended_at IS NULL`.
  - `Report::latestLocationPing()` HasOne for the staff map.

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Schema/LocationSchemaTest.php`:

```php
<?php

use App\Models\LocationPing;
use App\Models\LocationStream;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('opens a location stream on a report', function () {
    $report = Report::factory()->streamingLocation()->create();
    $client = User::factory()->client()->create();

    $stream = LocationStream::factory()->create([
        'report_id' => $report->id,
        'started_by_user_id' => $client->id,
    ]);

    expect($stream->isLive())->toBeTrue();
    expect($stream->ended_at)->toBeNull();
    expect($stream->startedBy->id)->toBe($client->id);
    expect($report->activeLocationStream()->exists())->toBeTrue();
});

it('allows only one live stream per report', function () {
    $report = Report::factory()->create();

    LocationStream::factory()->create(['report_id' => $report->id]);
    LocationStream::factory()->create(['report_id' => $report->id]);
})->throws(QueryException::class);

it('allows a new stream once the previous one stopped', function () {
    $report = Report::factory()->create();

    LocationStream::factory()->ended()->create(['report_id' => $report->id]);
    LocationStream::factory()->create(['report_id' => $report->id]);

    expect($report->locationStreams()->count())->toBe(2);
    expect(LocationStream::query()->live()->count())->toBe(1);
});

it('records pings against a stream and its report', function () {
    $report = Report::factory()->create();
    $stream = LocationStream::factory()->create(['report_id' => $report->id]);

    LocationPing::factory()->count(5)->create([
        'report_id' => $report->id,
        'location_stream_id' => $stream->id,
    ]);

    expect($stream->pings)->toHaveCount(5);
    expect($report->locationPings()->count())->toBe(5);
});

it('accepts a ping without a stream for one-time sharing', function () {
    $report = Report::factory()->create();

    $ping = LocationPing::factory()->create([
        'report_id' => $report->id,
        'location_stream_id' => null,
    ]);

    expect($ping->location_stream_id)->toBeNull();
});

it('exposes the most recent ping for the field map', function () {
    $report = Report::factory()->create();

    LocationPing::factory()->create([
        'report_id' => $report->id,
        'lat' => 52.1, 'lng' => 21.0,
        'recorded_at' => now()->subMinutes(10),
    ]);
    LocationPing::factory()->create([
        'report_id' => $report->id,
        'lat' => 52.4, 'lng' => 21.3,
        'recorded_at' => now(),
    ]);

    expect((float) $report->latestLocationPing->lat)->toBe(52.4);
});

it('stores optional telemetry alongside the coordinates', function () {
    $ping = LocationPing::factory()->create([
        'accuracy' => 12.5,
        'speed' => 4.2,
        'heading' => 180.0,
        'battery_level' => 43,
        'is_moving' => true,
    ]);

    expect((float) $ping->fresh()->accuracy)->toBe(12.5);
    expect($ping->fresh()->battery_level)->toBe(43);
    expect($ping->fresh()->is_moving)->toBeTrue();
});

it('deletes streams and pings with their report', function () {
    $report = Report::factory()->create();
    $stream = LocationStream::factory()->create(['report_id' => $report->id]);
    LocationPing::factory()->count(3)->create([
        'report_id' => $report->id,
        'location_stream_id' => $stream->id,
    ]);

    $report->forceDelete();

    expect(LocationStream::query()->count())->toBe(0);
    expect(LocationPing::query()->count())->toBe(0);
});

it('supports purging pings by age for gdpr retention', function () {
    $report = Report::factory()->closed()->create();

    LocationPing::factory()->create(['report_id' => $report->id, 'recorded_at' => now()->subDays(40)]);
    LocationPing::factory()->create(['report_id' => $report->id, 'recorded_at' => now()->subDay()]);

    LocationPing::query()->where('recorded_at', '<', now()->subDays(30))->delete();

    expect(LocationPing::query()->count())->toBe(1);
});

it('carries no updated_at on the high-volume ping table', function () {
    expect(DB::getSchemaBuilder()->hasColumn('location_pings', 'updated_at'))->toBeFalse();
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/LocationSchemaTest.php`
Expected: FAIL — `Class "App\Models\LocationStream" not found`.

- [ ] **Step 3: Write both migrations**

`backend/database/migrations/2026_08_20_121100_create_location_streams_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One "live tracking" session. The client starts it and can stop it with a
     * single button (CLAUDE.md section 9.2); ended_at is what the stop writes.
     */
    public function up(): void
    {
        Schema::create('location_streams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->foreignId('started_by_user_id')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('ended_at')->nullable();
            $table->timestamp('last_ping_at')->nullable();
            $table->unsignedInteger('ping_count')->default(0);
            $table->string('stop_reason', 64)->nullable();
            $table->jsonb('metadata')->default(new Expression("'{}'::jsonb"));
            $table->timestamps();

            $table->index(['report_id', 'started_at']);
        });

        // A report cannot be transmitting from two sessions at once.
        DB::statement(
            'CREATE UNIQUE INDEX location_streams_one_live_per_report '.
            'ON location_streams (report_id) WHERE ended_at IS NULL'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('location_streams');
    }
};
```

`backend/database/migrations/2026_08_20_121200_create_location_pings_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The location trail. High volume (one row every 5-15s per live report) and
     * GDPR-sensitive: section 18 requires a retention policy, which is why
     * recorded_at is indexed on its own.
     */
    public function up(): void
    {
        Schema::create('location_pings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            // Null for a one-time share, set for every ping inside a session.
            $table->foreignId('location_stream_id')->nullable()
                ->constrained('location_streams')->cascadeOnDelete();

            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            $table->decimal('accuracy', 8, 2)->nullable();
            $table->decimal('altitude', 8, 2)->nullable();
            $table->decimal('speed', 8, 2)->nullable();
            $table->decimal('heading', 6, 2)->nullable();
            $table->unsignedTinyInteger('battery_level')->nullable();
            $table->boolean('is_moving')->nullable();

            // When the device took the fix — not when the batch reached us.
            $table->timestamp('recorded_at')->useCurrent();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['report_id', 'recorded_at']);
            $table->index(['location_stream_id', 'recorded_at']);
            $table->index('recorded_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('location_pings');
    }
};
```

- [ ] **Step 4: Write the two models**

`backend/app/Models/LocationStream.php`:

```php
<?php

namespace App\Models;

use Database\Factories\LocationStreamFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['report_id', 'started_by_user_id', 'started_at', 'ended_at', 'last_ping_at', 'ping_count', 'stop_reason', 'metadata'])]
class LocationStream extends Model
{
    /** @use HasFactory<LocationStreamFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'last_ping_at' => 'datetime',
            'ping_count' => 'integer',
            'metadata' => 'array',
        ];
    }

    /** @return BelongsTo<Report, $this> */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    /** @return BelongsTo<User, $this> */
    public function startedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'started_by_user_id');
    }

    /** @return HasMany<LocationPing, $this> */
    public function pings(): HasMany
    {
        return $this->hasMany(LocationPing::class)->orderBy('recorded_at');
    }

    public function isLive(): bool
    {
        return $this->ended_at === null;
    }

    /** @param  Builder<$this>  $query */
    public function scopeLive(Builder $query): void
    {
        $query->whereNull('ended_at');
    }
}
```

`backend/app/Models/LocationPing.php`:

```php
<?php

namespace App\Models;

use Database\Factories\LocationPingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['report_id', 'location_stream_id', 'lat', 'lng', 'accuracy', 'altitude', 'speed', 'heading', 'battery_level', 'is_moving', 'recorded_at'])]
class LocationPing extends Model
{
    /** @use HasFactory<LocationPingFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'lat' => 'decimal:7',
            'lng' => 'decimal:7',
            'accuracy' => 'decimal:2',
            'altitude' => 'decimal:2',
            'speed' => 'decimal:2',
            'heading' => 'decimal:2',
            'battery_level' => 'integer',
            'is_moving' => 'boolean',
            'recorded_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Report, $this> */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    /** @return BelongsTo<LocationStream, $this> */
    public function stream(): BelongsTo
    {
        return $this->belongsTo(LocationStream::class, 'location_stream_id');
    }

    /** @param  Builder<$this>  $query */
    public function scopeRecordedBetween(Builder $query, mixed $from, mixed $to): void
    {
        $query->whereBetween('recorded_at', [$from, $to]);
    }
}
```

- [ ] **Step 5: Write both factories**

`backend/database/factories/LocationStreamFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\LocationStream;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<LocationStream> */
class LocationStreamFactory extends Factory
{
    protected $model = LocationStream::class;

    public function definition(): array
    {
        return [
            'report_id' => Report::factory(),
            'started_by_user_id' => User::factory()->client(),
            'started_at' => now()->subMinutes(5),
            'ping_count' => 0,
            'metadata' => [],
        ];
    }

    public function ended(): static
    {
        return $this->state(fn () => [
            'ended_at' => now(),
            'stop_reason' => 'client_stopped',
        ]);
    }
}
```

`backend/database/factories/LocationPingFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\LocationPing;
use App\Models\Report;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<LocationPing> */
class LocationPingFactory extends Factory
{
    protected $model = LocationPing::class;

    public function definition(): array
    {
        return [
            'report_id' => Report::factory(),
            'lat' => $this->faker->latitude(51.9, 52.4),
            'lng' => $this->faker->longitude(20.8, 21.3),
            'accuracy' => $this->faker->randomFloat(2, 3, 50),
            'battery_level' => $this->faker->numberBetween(5, 100),
            'is_moving' => true,
            'recorded_at' => now(),
        ];
    }
}
```

- [ ] **Step 6: Wire the relations onto Report**

Add to `backend/app/Models/Report.php` (import `use Illuminate\Database\Eloquent\Relations\HasOne;`):

```php
    /** @return HasMany<LocationStream, $this> */
    public function locationStreams(): HasMany
    {
        return $this->hasMany(LocationStream::class)->orderByDesc('started_at');
    }

    /** The session currently transmitting, if any. @return HasOne<LocationStream, $this> */
    public function activeLocationStream(): HasOne
    {
        return $this->hasOne(LocationStream::class)->whereNull('ended_at');
    }

    /** @return HasMany<LocationPing, $this> */
    public function locationPings(): HasMany
    {
        return $this->hasMany(LocationPing::class)->orderBy('recorded_at');
    }

    /** Drives the pin on the field worker's map. @return HasOne<LocationPing, $this> */
    public function latestLocationPing(): HasOne
    {
        return $this->hasOne(LocationPing::class)->latestOfMany('recorded_at');
    }
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/LocationSchemaTest.php`
Expected: PASS, 10 tests.

- [ ] **Step 8: Format and commit**

```bash
docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pint
git add backend/app backend/database backend/tests
git commit -m "feat: add location streams and pings"
```

---

### Task 11: Media stream sessions

The LiveKit room record from CLAUDE.md §9.3. Kept deliberately thin: the room name is the join key, `status` tells the staff view whether there is anything to watch, and `recording_path` points into MinIO once the session ends.

**Files:**
- Create: `backend/database/migrations/2026_08_20_121300_create_media_stream_sessions_table.php`
- Create: `backend/app/Models/MediaStreamSession.php`
- Create: `backend/database/factories/MediaStreamSessionFactory.php`
- Modify: `backend/app/Models/Report.php` (`mediaStreamSessions()`, `liveMediaStreams()`)
- Test: `backend/tests/Feature/Schema/MediaStreamSchemaTest.php`

**Interfaces:**
- Consumes: `Report`, `User`; `MediaStreamKind`, `MediaStreamStatus`, `CheckConstraint`.
- Produces:
  - `media_stream_sessions`: `id, report_id, started_by_user_id, kind, provider, room_name (unique), status, started_at, ended_at, recording_disk, recording_path, recording_url, duration_seconds, metadata, timestamps`.
  - `MediaStreamSession` with `report()`, `startedBy()`, `isLive()`, scopes `live()`, `ofKind()`.

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Schema/MediaStreamSchemaTest.php`:

```php
<?php

use App\Enums\MediaStreamKind;
use App\Enums\MediaStreamStatus;
use App\Models\MediaStreamSession;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('opens a camera session tied to a livekit room', function () {
    $report = Report::factory()->create();
    $client = User::factory()->client()->create();

    $session = MediaStreamSession::factory()->live()->create([
        'report_id' => $report->id,
        'started_by_user_id' => $client->id,
        'kind' => MediaStreamKind::Camera,
    ]);

    expect($session->kind)->toBe(MediaStreamKind::Camera);
    expect($session->status)->toBe(MediaStreamStatus::Live);
    expect($session->provider)->toBe('livekit');
    expect($session->isLive())->toBeTrue();
    expect($report->mediaStreamSessions)->toHaveCount(1);
});

it('rejects two sessions sharing a room name', function () {
    MediaStreamSession::factory()->create(['room_name' => 'report-1-camera']);
    MediaStreamSession::factory()->create(['room_name' => 'report-1-camera']);
})->throws(QueryException::class);

it('runs camera and audio sessions on one report at once', function () {
    $report = Report::factory()->create();

    MediaStreamSession::factory()->live()->create([
        'report_id' => $report->id, 'kind' => MediaStreamKind::Camera,
    ]);
    MediaStreamSession::factory()->live()->create([
        'report_id' => $report->id, 'kind' => MediaStreamKind::Audio,
    ]);

    expect($report->liveMediaStreams()->count())->toBe(2);
    expect(MediaStreamSession::query()->ofKind(MediaStreamKind::Audio)->count())->toBe(1);
});

it('keeps a recording pointer after the session ends', function () {
    $session = MediaStreamSession::factory()->ended()->create();

    expect($session->status)->toBe(MediaStreamStatus::Ended);
    expect($session->ended_at)->not->toBeNull();
    expect($session->recording_path)->not->toBeNull();
    expect($session->isLive())->toBeFalse();
});

it('refuses unknown kinds and statuses', function (string $column, string $value) {
    $session = MediaStreamSession::factory()->create();

    expect(fn () => DB::table('media_stream_sessions')->where('id', $session->id)->update([$column => $value]))
        ->toThrow(QueryException::class);
})->with([
    ['kind' => 'kind', 'value' => 'telepathy'],
    ['kind' => 'status', 'value' => 'buffering'],
]);

it('deletes sessions with their report', function () {
    $report = Report::factory()->create();
    MediaStreamSession::factory()->count(2)->create(['report_id' => $report->id]);

    $report->forceDelete();

    expect(MediaStreamSession::query()->count())->toBe(0);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/MediaStreamSchemaTest.php`
Expected: FAIL — `Class "App\Models\MediaStreamSession" not found`.

- [ ] **Step 3: Write the migration**

`backend/database/migrations/2026_08_20_121300_create_media_stream_sessions_table.php`:

```php
<?php

use App\Enums\MediaStreamKind;
use App\Enums\MediaStreamStatus;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A live camera/microphone session (CLAUDE.md section 9.3). room_name is
     * the LiveKit room the admin or responder joins as a viewer.
     */
    public function up(): void
    {
        Schema::create('media_stream_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->foreignId('started_by_user_id')->nullable()
                ->constrained('users')->nullOnDelete();

            $table->string('kind', 32);
            // Leaves room for the MVP pseudo-streaming path from section 9.3.
            $table->string('provider', 32)->default('livekit');
            $table->string('room_name', 128)->unique();
            $table->string('status', 32)->default(MediaStreamStatus::Pending->value);

            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();

            $table->string('recording_disk', 32)->nullable();
            $table->string('recording_path')->nullable();
            $table->string('recording_url')->nullable();

            $table->jsonb('metadata')->default(new Expression("'{}'::jsonb"));
            $table->timestamps();

            $table->index(['report_id', 'status']);
            $table->index(['status', 'started_at']);
        });

        CheckConstraint::enum('media_stream_sessions', 'kind', MediaStreamKind::values());
        CheckConstraint::enum('media_stream_sessions', 'status', MediaStreamStatus::values());
    }

    public function down(): void
    {
        CheckConstraint::drop('media_stream_sessions', 'kind');
        CheckConstraint::drop('media_stream_sessions', 'status');
        Schema::dropIfExists('media_stream_sessions');
    }
};
```

- [ ] **Step 4: Write the model**

`backend/app/Models/MediaStreamSession.php`:

```php
<?php

namespace App\Models;

use App\Enums\MediaStreamKind;
use App\Enums\MediaStreamStatus;
use Database\Factories\MediaStreamSessionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'report_id', 'started_by_user_id', 'kind', 'provider', 'room_name', 'status',
    'started_at', 'ended_at', 'duration_seconds', 'recording_disk',
    'recording_path', 'recording_url', 'metadata',
])]
class MediaStreamSession extends Model
{
    /** @use HasFactory<MediaStreamSessionFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'kind' => MediaStreamKind::class,
            'status' => MediaStreamStatus::class,
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'duration_seconds' => 'integer',
            'metadata' => 'array',
        ];
    }

    /** @return BelongsTo<Report, $this> */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    /** @return BelongsTo<User, $this> */
    public function startedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'started_by_user_id');
    }

    public function isLive(): bool
    {
        return $this->status === MediaStreamStatus::Live;
    }

    /** @param  Builder<$this>  $query */
    public function scopeLive(Builder $query): void
    {
        $query->where('status', MediaStreamStatus::Live);
    }

    /** @param  Builder<$this>  $query */
    public function scopeOfKind(Builder $query, MediaStreamKind $kind): void
    {
        $query->where('kind', $kind);
    }
}
```

- [ ] **Step 5: Write the factory**

`backend/database/factories/MediaStreamSessionFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Enums\MediaStreamKind;
use App\Enums\MediaStreamStatus;
use App\Models\MediaStreamSession;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<MediaStreamSession> */
class MediaStreamSessionFactory extends Factory
{
    protected $model = MediaStreamSession::class;

    public function definition(): array
    {
        return [
            'report_id' => Report::factory(),
            'started_by_user_id' => User::factory()->client(),
            'kind' => MediaStreamKind::Camera,
            'provider' => 'livekit',
            'room_name' => 'report-'.Str::uuid(),
            'status' => MediaStreamStatus::Pending,
            'metadata' => [],
        ];
    }

    public function live(): static
    {
        return $this->state(fn () => [
            'status' => MediaStreamStatus::Live,
            'started_at' => now(),
        ]);
    }

    public function ended(): static
    {
        return $this->state(fn () => [
            'status' => MediaStreamStatus::Ended,
            'started_at' => now()->subMinutes(12),
            'ended_at' => now(),
            'duration_seconds' => 720,
            'recording_disk' => 's3',
            'recording_path' => 'recordings/'.Str::uuid().'.mp4',
        ]);
    }
}
```

- [ ] **Step 6: Wire the relations onto Report**

Add to `backend/app/Models/Report.php`:

```php
    /** @return HasMany<MediaStreamSession, $this> */
    public function mediaStreamSessions(): HasMany
    {
        return $this->hasMany(MediaStreamSession::class)->orderByDesc('created_at');
    }

    /** @return HasMany<MediaStreamSession, $this> */
    public function liveMediaStreams(): HasMany
    {
        return $this->mediaStreamSessions()->live();
    }
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/MediaStreamSchemaTest.php`
Expected: PASS, 7 tests (the parameterised one counts as 2).

- [ ] **Step 8: Format and commit**

```bash
docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pint
git add backend/app backend/database backend/tests
git commit -m "feat: add media stream sessions for livekit rooms"
```

---

### Task 12: Notifications and device tokens

Three tables covering the "powiadomienia" pillar. `device_tokens` replaces `users.push_token`: a user has phones and tablets, and Expo's `DeviceNotRegistered` receipt has to disable exactly one of them. `notifications` is Laravel's standard table, giving an in-app notification centre for free. `notification_deliveries` records what was actually sent where — Expo hands back a ticket ID at send time and a receipt later, and without this table there is no way to learn a push silently failed.

**Files:**
- Create: `backend/database/migrations/2026_08_20_121400_create_device_tokens_table.php`
- Create: `backend/database/migrations/2026_08_20_121500_create_notifications_table.php`
- Create: `backend/database/migrations/2026_08_20_121600_create_notification_deliveries_table.php`
- Create: `backend/app/Models/DeviceToken.php`, `backend/app/Models/NotificationDelivery.php`
- Create: `backend/database/factories/DeviceTokenFactory.php`
- Test: `backend/tests/Feature/Schema/NotificationSchemaTest.php`

**Interfaces:**
- Consumes: `User`; `DevicePlatform`, `NotificationDeliveryStatus`, `CheckConstraint`.
- Produces:
  - `device_tokens`: `id, user_id, token (unique), platform, device_name, app_version, is_active, last_used_at, disabled_at, disabled_reason, timestamps`.
  - `notifications`: Laravel standard — `id (uuid pk), type, notifiable (morphs), data text, read_at, timestamps`.
  - `notification_deliveries`: `id, notification_id, user_id, device_token_id, channel, status, provider_ticket_id, provider_receipt_id, error, payload jsonb, sent_at, settled_at, timestamps`.
  - `DeviceToken` with `user()`, scope `active()`, `disable(string $reason): void`.
  - `NotificationDelivery` with `user()`, `deviceToken()`, scope `pendingReceipt()`.
  - `User::deviceTokens()` (already declared in Task 3) starts working here.

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Schema/NotificationSchemaTest.php`:

```php
<?php

use App\Enums\DevicePlatform;
use App\Enums\NotificationDeliveryStatus;
use App\Models\DeviceToken;
use App\Models\NotificationDelivery;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('registers several devices for one user', function () {
    $user = User::factory()->client()->create();

    DeviceToken::factory()->create(['user_id' => $user->id, 'platform' => DevicePlatform::Ios]);
    DeviceToken::factory()->create(['user_id' => $user->id, 'platform' => DevicePlatform::Android]);

    expect($user->deviceTokens)->toHaveCount(2);
});

it('rejects the same expo token twice', function () {
    DeviceToken::factory()->create(['token' => 'ExponentPushToken[abc]']);
    DeviceToken::factory()->create(['token' => 'ExponentPushToken[abc]']);
})->throws(QueryException::class);

it('disables a token that expo reported as unregistered', function () {
    $token = DeviceToken::factory()->create();

    $token->disable('DeviceNotRegistered');

    expect($token->fresh()->is_active)->toBeFalse();
    expect($token->fresh()->disabled_reason)->toBe('DeviceNotRegistered');
    expect(DeviceToken::query()->active()->count())->toBe(0);
});

it('removes device tokens when the user is hard deleted', function () {
    $user = User::factory()->client()->create();
    DeviceToken::factory()->count(2)->create(['user_id' => $user->id]);

    $user->forceDelete();

    expect(DeviceToken::query()->count())->toBe(0);
});

it('keeps device tokens when the user is only soft deleted', function () {
    $user = User::factory()->client()->create();
    DeviceToken::factory()->create(['user_id' => $user->id]);

    $user->delete();

    expect(DeviceToken::query()->count())->toBe(1);
});

it('has the standard laravel notifications table', function () {
    $user = User::factory()->client()->create();

    $user->notify(new class extends \Illuminate\Notifications\Notification
    {
        public function via($notifiable): array
        {
            return ['database'];
        }

        public function toArray($notifiable): array
        {
            return ['report_id' => 1, 'message' => 'Status zgłoszenia zmieniony'];
        }
    });

    expect($user->notifications()->count())->toBe(1);
    expect($user->unreadNotifications()->count())->toBe(1);
    expect($user->notifications()->first()->data['message'])
        ->toBe('Status zgłoszenia zmieniony');
});

it('records a push delivery with its expo ticket', function () {
    $user = User::factory()->client()->create();
    $token = DeviceToken::factory()->create(['user_id' => $user->id]);

    $delivery = NotificationDelivery::create([
        'user_id' => $user->id,
        'device_token_id' => $token->id,
        'channel' => 'expo',
        'status' => NotificationDeliveryStatus::Sent,
        'provider_ticket_id' => 'XXXXXXXX-XXXX-XXXX',
        'payload' => ['title' => 'Nowe zgłoszenie'],
        'sent_at' => now(),
    ]);

    expect($delivery->status)->toBe(NotificationDeliveryStatus::Sent);
    expect($delivery->deviceToken->id)->toBe($token->id);
    expect(NotificationDelivery::query()->pendingReceipt()->count())->toBe(1);
});

it('stops counting a delivery as pending once it settles', function () {
    $user = User::factory()->client()->create();

    NotificationDelivery::create([
        'user_id' => $user->id,
        'channel' => 'expo',
        'status' => NotificationDeliveryStatus::Delivered,
        'provider_ticket_id' => 'ticket-1',
        'settled_at' => now(),
    ]);

    expect(NotificationDelivery::query()->pendingReceipt()->count())->toBe(0);
});

it('refuses unknown delivery statuses and platforms', function (string $table, string $column, string $value) {
    $user = User::factory()->client()->create();
    $id = $table === 'device_tokens'
        ? DeviceToken::factory()->create(['user_id' => $user->id])->id
        : NotificationDelivery::create([
            'user_id' => $user->id,
            'channel' => 'expo',
            'status' => NotificationDeliveryStatus::Queued,
        ])->id;

    expect(fn () => DB::table($table)->where('id', $id)->update([$column => $value]))
        ->toThrow(QueryException::class);
})->with([
    ['device_tokens', 'platform', 'blackberry'],
    ['notification_deliveries', 'status', 'maybe'],
]);
```

- [ ] **Step 2: Run it and watch it fail**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/NotificationSchemaTest.php`
Expected: FAIL — `Class "App\Models\DeviceToken" not found`.

- [ ] **Step 3: Write the device_tokens migration**

`backend/database/migrations/2026_08_20_121400_create_device_tokens_table.php`:

```php
<?php

use App\Enums\DevicePlatform;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Expo push targets, one row per device. Replaces the single
     * users.push_token from CLAUDE.md section 4: a user may carry a phone and a
     * tablet, and a token Expo reports as unregistered must be disabled on its own.
     */
    public function up(): void
    {
        Schema::create('device_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('token')->unique();
            $table->string('platform', 16);
            $table->string('device_name')->nullable();
            $table->string('app_version', 32)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('disabled_at')->nullable();
            $table->string('disabled_reason', 64)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
        });

        CheckConstraint::enum('device_tokens', 'platform', DevicePlatform::values());
    }

    public function down(): void
    {
        CheckConstraint::drop('device_tokens', 'platform');
        Schema::dropIfExists('device_tokens');
    }
};
```

- [ ] **Step 4: Write the notifications migration**

`backend/database/migrations/2026_08_20_121500_create_notifications_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Laravel's standard database notification channel — the in-app inbox. */
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['notifiable_type', 'notifiable_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
```

- [ ] **Step 5: Write the notification_deliveries migration**

`backend/database/migrations/2026_08_20_121600_create_notification_deliveries_table.php`:

```php
<?php

use App\Enums\NotificationDeliveryStatus;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One row per outbound delivery attempt. Expo returns a ticket at send time
     * and a receipt minutes later; without this table a silently dropped push is
     * invisible, and there is nothing to drive token cleanup from.
     */
    public function up(): void
    {
        Schema::create('notification_deliveries', function (Blueprint $table) {
            $table->id();
            $table->uuid('notification_id')->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('device_token_id')->nullable()
                ->constrained('device_tokens')->nullOnDelete();

            // expo | broadcast | database
            $table->string('channel', 32);
            $table->string('status', 32)->default(NotificationDeliveryStatus::Queued->value);
            $table->string('provider_ticket_id')->nullable();
            $table->string('provider_receipt_id')->nullable();
            $table->text('error')->nullable();
            $table->jsonb('payload')->default(new Expression("'{}'::jsonb"));

            $table->timestamp('sent_at')->nullable();
            // Set once the provider receipt has been read back.
            $table->timestamp('settled_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['status', 'created_at']);
            $table->index('notification_id');
        });

        CheckConstraint::enum('notification_deliveries', 'status', NotificationDeliveryStatus::values());
    }

    public function down(): void
    {
        CheckConstraint::drop('notification_deliveries', 'status');
        Schema::dropIfExists('notification_deliveries');
    }
};
```

`notification_id` is intentionally not a foreign key: a push can be sent for something that was never written to the `notifications` inbox.

- [ ] **Step 6: Write the two models**

`backend/app/Models/DeviceToken.php`:

```php
<?php

namespace App\Models;

use App\Enums\DevicePlatform;
use Database\Factories\DeviceTokenFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'token', 'platform', 'device_name', 'app_version', 'is_active', 'last_used_at'])]
class DeviceToken extends Model
{
    /** @use HasFactory<DeviceTokenFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'platform' => DevicePlatform::class,
            'is_active' => 'boolean',
            'last_used_at' => 'datetime',
            'disabled_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Called when Expo reports DeviceNotRegistered or an invalid credential. */
    public function disable(string $reason): void
    {
        $this->forceFill([
            'is_active' => false,
            'disabled_at' => now(),
            'disabled_reason' => $reason,
        ])->save();
    }

    /** @param  Builder<$this>  $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }
}
```

`backend/app/Models/NotificationDelivery.php`:

```php
<?php

namespace App\Models;

use App\Enums\NotificationDeliveryStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'notification_id', 'user_id', 'device_token_id', 'channel', 'status',
    'provider_ticket_id', 'provider_receipt_id', 'error', 'payload',
    'sent_at', 'settled_at',
])]
class NotificationDelivery extends Model
{
    protected function casts(): array
    {
        return [
            'status' => NotificationDeliveryStatus::class,
            'payload' => 'array',
            'sent_at' => 'datetime',
            'settled_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<DeviceToken, $this> */
    public function deviceToken(): BelongsTo
    {
        return $this->belongsTo(DeviceToken::class);
    }

    /** Sent to Expo, receipt not yet read back. @param  Builder<$this>  $query */
    public function scopePendingReceipt(Builder $query): void
    {
        $query->whereNotNull('provider_ticket_id')->whereNull('settled_at');
    }
}
```

- [ ] **Step 7: Write the DeviceTokenFactory**

`backend/database/factories/DeviceTokenFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Enums\DevicePlatform;
use App\Models\DeviceToken;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<DeviceToken> */
class DeviceTokenFactory extends Factory
{
    protected $model = DeviceToken::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->client(),
            'token' => 'ExponentPushToken['.Str::random(22).']',
            'platform' => DevicePlatform::Android,
            'device_name' => $this->faker->word().' '.$this->faker->numberBetween(10, 15),
            'app_version' => '1.0.0',
            'is_active' => true,
            'last_used_at' => now(),
        ];
    }

    public function disabled(): static
    {
        return $this->state(fn () => [
            'is_active' => false,
            'disabled_at' => now(),
            'disabled_reason' => 'DeviceNotRegistered',
        ]);
    }
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/NotificationSchemaTest.php`
Expected: PASS, 10 tests (the parameterised one counts as 2).

- [ ] **Step 9: Format and commit**

```bash
docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pint
git add backend/app backend/database backend/tests
git commit -m "feat: add device tokens, notifications and delivery tracking"
```

---

### Task 13: Wire the global queue

The schema exists; this task proves it can actually serve the queue. Three ordering scopes matching CLAUDE.md §7, and a claim operation using `FOR UPDATE SKIP LOCKED` so two admins in `active` mode never receive the same report. This is the piece that would have been untestable on SQLite.

It stops short of a controller: `ReportQueue` is a query object over the schema, which is what makes the indexes from Task 6 meaningful.

**Files:**
- Create: `backend/app/Services/Queue/ReportQueue.php`
- Modify: `backend/app/Models/Report.php` (add `scopeInQueue`, `scopeSortedForQueue`)
- Test: `backend/tests/Feature/Schema/ReportQueueTest.php`

**Interfaces:**
- Consumes: `Report`, `Setting`, `User`, `ReportStatusHistory`, `ReportAssignment`; `QueueSortMode`, `ReportStatus`, `AssignmentRole`.
- Produces:
  - `Report::scopeInQueue(Builder $q)` — `status = new`.
  - `Report::scopeSortedForQueue(Builder $q, QueueSortMode $mode)`.
  - `ReportQueue::query(?QueueSortMode $mode = null): Builder` — defaults to the global setting.
  - `ReportQueue::peek(?QueueSortMode $mode = null): ?Report`
  - `ReportQueue::claimNext(User $admin, ?QueueSortMode $mode = null): ?Report` — transactional; locks with `SKIP LOCKED`, sets `status`/`assigned_admin_id`/`assigned_at`/`first_response_at`, writes a `ReportStatusHistory` row and a `ReportAssignment` row.
  - `ReportQueue::size(): int`

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Schema/ReportQueueTest.php`:

```php
<?php

use App\Enums\AssignmentRole;
use App\Enums\QueueSortMode;
use App\Enums\ReportPriority;
use App\Enums\ReportStatus;
use App\Models\Report;
use App\Models\ReportAssignment;
use App\Models\ReportStatusHistory;
use App\Models\Setting;
use App\Models\User;
use App\Services\Queue\ReportQueue;
use Illuminate\Support\Facades\DB;

it('holds only new reports', function () {
    Report::factory()->count(3)->create();
    Report::factory()->assigned()->create();
    Report::factory()->closed()->create();

    expect(ReportQueue::size())->toBe(3);
});

it('orders by arrival in fifo mode', function () {
    $first = Report::factory()->create(['queued_at' => now()->subMinutes(30), 'name' => 'first']);
    $second = Report::factory()->create(['queued_at' => now()->subMinutes(20), 'name' => 'second']);
    $third = Report::factory()->create(['queued_at' => now()->subMinutes(10), 'name' => 'third']);

    expect(ReportQueue::query(QueueSortMode::Fifo)->pluck('name')->all())
        ->toBe(['first', 'second', 'third']);
    expect(ReportQueue::peek(QueueSortMode::Fifo)->id)->toBe($first->id);
});

it('breaks ties on id so the order is stable', function () {
    $at = now()->subHour();
    $a = Report::factory()->create(['queued_at' => $at]);
    $b = Report::factory()->create(['queued_at' => $at]);

    expect(ReportQueue::query(QueueSortMode::Fifo)->pluck('id')->all())
        ->toBe([$a->id, $b->id]);
});

it('puts critical first in client priority mode, oldest first within a level', function () {
    Report::factory()->priority(ReportPriority::Low)
        ->create(['queued_at' => now()->subHour(), 'name' => 'low-old']);
    Report::factory()->priority(ReportPriority::Critical)
        ->create(['queued_at' => now()->subMinute(), 'name' => 'critical-new']);
    Report::factory()->priority(ReportPriority::Critical)
        ->create(['queued_at' => now()->subMinutes(30), 'name' => 'critical-old']);
    Report::factory()->priority(ReportPriority::Medium)
        ->create(['queued_at' => now()->subMinutes(45), 'name' => 'medium']);

    expect(ReportQueue::query(QueueSortMode::ClientPriority)->pluck('name')->all())
        ->toBe(['critical-old', 'critical-new', 'medium', 'low-old']);
});

it('sorts unscored reports last in ai mode and falls back to arrival order', function () {
    Report::factory()->create(['queued_at' => now()->subMinutes(50), 'name' => 'unscored-old']);
    Report::factory()->create(['queued_at' => now()->subMinutes(5), 'name' => 'unscored-new']);
    Report::factory()->scored(30.0)->create(['queued_at' => now()->subMinute(), 'name' => 'low-score']);
    Report::factory()->scored(95.0)->create(['queued_at' => now()->subMinute(), 'name' => 'high-score']);

    expect(ReportQueue::query(QueueSortMode::AiPriority)->pluck('name')->all())
        ->toBe(['high-score', 'low-score', 'unscored-old', 'unscored-new']);
});

it('follows the global setting when no mode is passed', function () {
    Report::factory()->priority(ReportPriority::Low)
        ->create(['queued_at' => now()->subHour(), 'name' => 'low-old']);
    Report::factory()->priority(ReportPriority::Critical)
        ->create(['queued_at' => now(), 'name' => 'critical-new']);

    expect(ReportQueue::peek()->name)->toBe('low-old');

    Setting::setQueueSortMode(QueueSortMode::ClientPriority);

    expect(ReportQueue::peek()->name)->toBe('critical-new');
});

it('claims the head of the queue for an admin', function () {
    $admin = User::factory()->activeAdmin()->create();
    $head = Report::factory()->create(['queued_at' => now()->subHour()]);
    Report::factory()->create(['queued_at' => now()]);

    $claimed = ReportQueue::claimNext($admin);

    expect($claimed->id)->toBe($head->id);
    expect($claimed->status)->toBe(ReportStatus::Assigned);
    expect($claimed->assigned_admin_id)->toBe($admin->id);
    expect($claimed->assigned_at)->not->toBeNull();
    expect($claimed->first_response_at)->not->toBeNull();
    expect(ReportQueue::size())->toBe(1);
});

it('writes history and an assignment row when claiming', function () {
    $admin = User::factory()->activeAdmin()->create();
    $report = Report::factory()->create();

    ReportQueue::claimNext($admin);

    $history = ReportStatusHistory::query()->where('report_id', $report->id)->sole();
    expect($history->from_status)->toBe(ReportStatus::New);
    expect($history->to_status)->toBe(ReportStatus::Assigned);
    expect($history->changed_by_user_id)->toBe($admin->id);

    $assignment = ReportAssignment::query()->where('report_id', $report->id)->sole();
    expect($assignment->user_id)->toBe($admin->id);
    expect($assignment->role)->toBe(AssignmentRole::Admin);
});

it('returns null when the queue is empty', function () {
    expect(ReportQueue::claimNext(User::factory()->activeAdmin()->create()))->toBeNull();
    expect(ReportQueue::peek())->toBeNull();
});

it('never hands the same report to two admins', function () {
    $reports = Report::factory()->count(2)->create();
    $first = User::factory()->activeAdmin()->create();
    $second = User::factory()->activeAdmin()->create();

    $a = ReportQueue::claimNext($first);
    $b = ReportQueue::claimNext($second);

    expect($a->id)->not->toBe($b->id);
    expect([$a->id, $b->id])->toEqualCanonicalizing($reports->pluck('id')->all());
    expect(ReportQueue::size())->toBe(0);
});

it('sets first_response_at only on the first claim', function () {
    $admin = User::factory()->activeAdmin()->create();
    $report = Report::factory()->create([
        'first_response_at' => now()->subHours(2),
    ]);

    $claimed = ReportQueue::claimNext($admin);

    expect($claimed->first_response_at->toDateTimeString())
        ->toBe($report->first_response_at->toDateTimeString());
});

it('excludes soft deleted reports from the queue', function () {
    Report::factory()->count(2)->create();
    Report::factory()->create()->delete();

    expect(ReportQueue::size())->toBe(2);
    expect(DB::table('reports')->count())->toBe(3);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/ReportQueueTest.php`
Expected: FAIL — `Class "App\Services\Queue\ReportQueue" not found`.

- [ ] **Step 3: Add the queue scopes to Report**

Add to `backend/app/Models/Report.php` (import `use App\Enums\QueueSortMode;` and `use Illuminate\Database\Eloquent\Builder;`):

```php
    /** The global queue: everything waiting for an operator. @param  Builder<$this>  $query */
    public function scopeInQueue(Builder $query): void
    {
        $query->where('status', ReportStatus::New);
    }

    /**
     * The three orderings from CLAUDE.md section 7. Each matches one of the
     * partial indexes created with this table.
     *
     * @param  Builder<$this>  $query
     */
    public function scopeSortedForQueue(Builder $query, QueueSortMode $mode): void
    {
        match ($mode) {
            QueueSortMode::Fifo => $query
                ->orderBy('queued_at')
                ->orderBy('id'),
            QueueSortMode::ClientPriority => $query
                ->orderByDesc('priority_weight')
                ->orderBy('queued_at')
                ->orderBy('id'),
            // Unscored reports rank last, then fall back to arrival order.
            QueueSortMode::AiPriority => $query
                ->orderByRaw('ai_priority DESC NULLS LAST')
                ->orderBy('queued_at')
                ->orderBy('id'),
        };
    }
```

- [ ] **Step 4: Write the ReportQueue service**

`backend/app/Services/Queue/ReportQueue.php`:

```php
<?php

namespace App\Services\Queue;

use App\Enums\AssignmentRole;
use App\Enums\QueueSortMode;
use App\Enums\ReportStatus;
use App\Models\Report;
use App\Models\ReportAssignment;
use App\Models\ReportStatusHistory;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * The global report queue. One queue for the whole organisation, ordered by a
 * single global setting — changing the sort mode reorders it for every admin
 * at once (CLAUDE.md section 7).
 */
final class ReportQueue
{
    /** @return Builder<Report> */
    public static function query(?QueueSortMode $mode = null): Builder
    {
        return Report::query()
            ->inQueue()
            ->sortedForQueue($mode ?? Setting::queueSortMode());
    }

    public static function peek(?QueueSortMode $mode = null): ?Report
    {
        return self::query($mode)->first();
    }

    public static function size(): int
    {
        return Report::query()->inQueue()->count();
    }

    /**
     * Hand the admin the next report and assign it to them. Uses
     * FOR UPDATE SKIP LOCKED so two admins in `active` mode racing for work
     * always get different reports rather than blocking or colliding.
     */
    public static function claimNext(User $admin, ?QueueSortMode $mode = null): ?Report
    {
        return DB::transaction(function () use ($admin, $mode): ?Report {
            $report = self::query($mode)
                ->lock('for update skip locked')
                ->first();

            if ($report === null) {
                return null;
            }

            $from = $report->status;

            $report->forceFill([
                'status' => ReportStatus::Assigned,
                'assigned_admin_id' => $admin->id,
                'assigned_at' => now(),
                'first_response_at' => $report->first_response_at ?? now(),
            ])->save();

            ReportStatusHistory::create([
                'report_id' => $report->id,
                'changed_by_user_id' => $admin->id,
                'from_status' => $from,
                'to_status' => ReportStatus::Assigned,
                'context' => ['source' => 'queue.claim', 'mode' => ($mode ?? Setting::queueSortMode())->value],
            ]);

            ReportAssignment::create([
                'report_id' => $report->id,
                'user_id' => $admin->id,
                'role' => AssignmentRole::Admin,
                'assigned_by_user_id' => $admin->id,
                'assigned_at' => now(),
            ]);

            return $report;
        });
    }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/ReportQueueTest.php`
Expected: PASS, 12 tests.

If `never hands the same report to two admins` fails, the two `claimNext` calls are running in the same transaction — `RefreshDatabase` wraps each test in one, and `SKIP LOCKED` cannot skip a lock held by the same transaction. Because the calls are sequential (the first commits its inner transaction before the second starts) this still passes; the test asserts correctness of *ordering after assignment*, not true concurrency. Genuine concurrent behaviour needs two connections and is out of scope here — note it as a follow-up rather than reworking the test.

- [ ] **Step 6: Format and commit**

```bash
docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pint
git add backend/app backend/tests
git commit -m "feat: add global report queue with skip-locked claiming"
```

---

### Task 14: Seeders

Two layers. Reference data (`staff_roles`, `categories`, `request_types`, `settings`) is idempotent and safe to run on any environment — this is the layer a new niche rewrites. Demo data (users, reports across every status, requests, attachments, pings, streams) exists so the admin queue and the field view have something to render, and never runs in production.

**Files:**
- Create: `backend/database/seeders/StaffRoleSeeder.php`, `CategorySeeder.php`, `RequestTypeSeeder.php`, `SettingSeeder.php`, `UserSeeder.php`, `DemoReportSeeder.php`
- Modify: `backend/database/seeders/DatabaseSeeder.php`
- Test: `backend/tests/Feature/Schema/SeederTest.php`

**Interfaces:**
- Consumes: every model and factory built so far.
- Produces:
  - `DatabaseSeeder` runs reference seeders always, then `UserSeeder` + `DemoReportSeeder` only when `app()->environment() !== 'production'`.
  - Reference seeders use `updateOrCreate` keyed on `slug` — running twice changes nothing.
  - Known demo logins: `super@codaro.test`, `admin@codaro.test`, `admin2@codaro.test`, `staff@codaro.test`, `client@codaro.test` — all with password `password`.

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Schema/SeederTest.php`:

```php
<?php

use App\Enums\QueueSortMode;
use App\Enums\ReportStatus;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Report;
use App\Models\RequestType;
use App\Models\Setting;
use App\Models\StaffRole;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

it('seeds the reference catalogs', function () {
    $this->seed();

    expect(StaffRole::query()->count())->toBeGreaterThan(0);
    expect(Category::query()->count())->toBeGreaterThan(0);
    expect(RequestType::query()->pluck('slug')->all())
        ->toContain('connection', 'repair', 'meeting', 'money', 'service_arrival');
});

it('is idempotent — seeding twice changes nothing', function () {
    $this->seed(\Database\Seeders\StaffRoleSeeder::class);
    $this->seed(\Database\Seeders\CategorySeeder::class);
    $this->seed(\Database\Seeders\RequestTypeSeeder::class);

    $roles = StaffRole::query()->count();
    $categories = Category::query()->count();
    $types = RequestType::query()->count();

    $this->seed(\Database\Seeders\StaffRoleSeeder::class);
    $this->seed(\Database\Seeders\CategorySeeder::class);
    $this->seed(\Database\Seeders\RequestTypeSeeder::class);

    expect(StaffRole::query()->count())->toBe($roles);
    expect(Category::query()->count())->toBe($categories);
    expect(RequestType::query()->count())->toBe($types);
});

it('points every category at a service that handles it', function () {
    $this->seed(\Database\Seeders\StaffRoleSeeder::class);
    $this->seed(\Database\Seeders\CategorySeeder::class);

    expect(Category::query()->whereNull('staff_role_id')->count())->toBe(0);
});

it('defaults the global queue to fifo', function () {
    $this->seed(\Database\Seeders\SettingSeeder::class);

    expect(Setting::queueSortMode())->toBe(QueueSortMode::Fifo);
});

it('seeds one user per role with a known password', function () {
    $this->seed();

    expect(User::query()->role(UserRole::SuperAdmin)->count())->toBe(1);
    expect(User::query()->role(UserRole::Admin)->count())->toBeGreaterThanOrEqual(2);
    expect(User::query()->role(UserRole::Staff)->count())->toBeGreaterThanOrEqual(1);
    expect(User::query()->role(UserRole::Client)->count())->toBeGreaterThanOrEqual(1);

    $admin = User::query()->where('email', 'admin@codaro.test')->sole();
    expect(Hash::check('password', $admin->password))->toBeTrue();
});

it('seeds demo reports covering every status', function () {
    $this->seed();

    $statuses = Report::query()->distinct()->pluck('status')->map->value->sort()->values();

    expect($statuses->all())->toEqualCanonicalizing(ReportStatus::values());
});

it('leaves reports in the queue for an admin to pick up', function () {
    $this->seed();

    expect(\App\Services\Queue\ReportQueue::size())->toBeGreaterThan(0);
});

it('gives demo reports the media a field worker would see', function () {
    $this->seed();

    expect(\App\Models\Attachment::query()->voiceNotes()->count())->toBeGreaterThan(0);
    expect(\App\Models\LocationPing::query()->count())->toBeGreaterThan(0);
    expect(Report::query()->whereHas('requests')->count())->toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/SeederTest.php`
Expected: FAIL — `Class "Database\Seeders\StaffRoleSeeder" not found`.

- [ ] **Step 3: Write the reference seeders**

`backend/database/seeders/StaffRoleSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Models\StaffRole;
use Illuminate\Database\Seeder;

/**
 * Reference data. Idempotent, keyed on slug — this is the file a new
 * deployment rewrites to match its own services.
 */
class StaffRoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['slug' => 'dispatcher', 'name' => 'Dyspozytor', 'is_external' => false, 'sort_order' => 10],
            ['slug' => 'paramedic', 'name' => 'Ratownik medyczny', 'is_external' => false, 'sort_order' => 20],
            ['slug' => 'technician', 'name' => 'Technik / serwisant', 'is_external' => false, 'sort_order' => 30],
            ['slug' => 'security', 'name' => 'Ochrona', 'is_external' => false, 'sort_order' => 40],
            ['slug' => 'fire-brigade', 'name' => 'Straż pożarna', 'is_external' => true, 'sort_order' => 50],
            ['slug' => 'police', 'name' => 'Policja', 'is_external' => true, 'sort_order' => 60],
            ['slug' => 'ambulance', 'name' => 'Pogotowie ratunkowe', 'is_external' => true, 'sort_order' => 70],
        ];

        foreach ($roles as $role) {
            StaffRole::query()->updateOrCreate(['slug' => $role['slug']], $role);
        }
    }
}
```

`backend/database/seeders/CategorySeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Enums\ReportPriority;
use App\Models\Category;
use App\Models\StaffRole;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $roles = StaffRole::query()->pluck('id', 'slug');

        $categories = [
            ['slug' => 'medical', 'name' => 'Zdarzenie medyczne', 'staff_role' => 'paramedic', 'default_priority' => ReportPriority::Critical, 'sort_order' => 10],
            ['slug' => 'fire', 'name' => 'Pożar / zadymienie', 'staff_role' => 'fire-brigade', 'default_priority' => ReportPriority::Critical, 'sort_order' => 20],
            ['slug' => 'security-incident', 'name' => 'Zagrożenie bezpieczeństwa', 'staff_role' => 'security', 'default_priority' => ReportPriority::High, 'sort_order' => 30],
            ['slug' => 'technical-failure', 'name' => 'Awaria techniczna', 'staff_role' => 'technician', 'default_priority' => ReportPriority::Medium, 'sort_order' => 40],
            ['slug' => 'water-damage', 'name' => 'Zalanie / wyciek wody', 'staff_role' => 'technician', 'default_priority' => ReportPriority::High, 'sort_order' => 50],
            ['slug' => 'power-outage', 'name' => 'Brak zasilania', 'staff_role' => 'technician', 'default_priority' => ReportPriority::High, 'sort_order' => 60],
            ['slug' => 'assistance', 'name' => 'Prośba o pomoc', 'staff_role' => 'dispatcher', 'default_priority' => ReportPriority::Low, 'sort_order' => 70],
            ['slug' => 'other', 'name' => 'Inne', 'staff_role' => 'dispatcher', 'default_priority' => ReportPriority::Low, 'sort_order' => 99],
        ];

        foreach ($categories as $category) {
            $slug = $category['staff_role'];
            unset($category['staff_role']);

            Category::query()->updateOrCreate(
                ['slug' => $category['slug']],
                [...$category, 'staff_role_id' => $roles[$slug] ?? null],
            );
        }
    }
}
```

`backend/database/seeders/RequestTypeSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Models\RequestType;
use App\Models\StaffRole;
use Illuminate\Database\Seeder;

/** The five sub-task types from CLAUDE.md section 4, as editable rows. */
class RequestTypeSeeder extends Seeder
{
    public function run(): void
    {
        $roles = StaffRole::query()->pluck('id', 'slug');

        $types = [
            ['slug' => 'connection', 'name' => 'Prośba o połączenie', 'staff_role' => 'dispatcher', 'requires_staff' => false, 'sort_order' => 10],
            ['slug' => 'repair', 'name' => 'Naprawa', 'staff_role' => 'technician', 'requires_staff' => true, 'sort_order' => 20],
            ['slug' => 'meeting', 'name' => 'Spotkanie', 'staff_role' => 'dispatcher', 'requires_staff' => true, 'requires_scheduled_at' => true, 'sort_order' => 30],
            ['slug' => 'money', 'name' => 'Prośba o środki', 'staff_role' => 'dispatcher', 'requires_amount' => true, 'sort_order' => 40],
            ['slug' => 'service_arrival', 'name' => 'Przyjazd służby', 'staff_role' => 'ambulance', 'requires_staff' => true, 'sort_order' => 50],
        ];

        foreach ($types as $type) {
            $slug = $type['staff_role'];
            unset($type['staff_role']);

            RequestType::query()->updateOrCreate(
                ['slug' => $type['slug']],
                [...$type, 'staff_role_id' => $roles[$slug] ?? null],
            );
        }
    }
}
```

`backend/database/seeders/SettingSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Enums\QueueSortMode;
use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        // Only sets defaults — never overwrites a mode a hyperadmin already chose.
        if (Setting::query()->find(Setting::QUEUE_SORT_MODE) === null) {
            Setting::setQueueSortMode(QueueSortMode::Fifo);
        }

        foreach ([
            'retention.location_pings_days' => 30,
            'queue.auto_assign_enabled' => true,
        ] as $key => $value) {
            if (Setting::query()->find($key) === null) {
                Setting::put($key, $value);
            }
        }
    }
}
```

- [ ] **Step 4: Write the UserSeeder**

`backend/database/seeders/UserSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Enums\AdminStatus;
use App\Enums\UserRole;
use App\Models\StaffRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/** Demo accounts. Never runs in production — see DatabaseSeeder. */
class UserSeeder extends Seeder
{
    public function run(): void
    {
        $paramedic = StaffRole::query()->where('slug', 'paramedic')->value('id');
        $technician = StaffRole::query()->where('slug', 'technician')->value('id');

        $users = [
            ['email' => 'super@codaro.test', 'name' => 'Hiperadministrator', 'role' => UserRole::SuperAdmin],
            ['email' => 'admin@codaro.test', 'name' => 'Administrator Aktywny', 'role' => UserRole::Admin, 'admin_status' => AdminStatus::Active],
            ['email' => 'admin2@codaro.test', 'name' => 'Administrator Wybór', 'role' => UserRole::Admin, 'admin_status' => AdminStatus::Manual],
            ['email' => 'staff@codaro.test', 'name' => 'Ratownik Medyczny', 'role' => UserRole::Staff, 'staff_role_id' => $paramedic],
            ['email' => 'staff2@codaro.test', 'name' => 'Technik Serwisowy', 'role' => UserRole::Staff, 'staff_role_id' => $technician],
            ['email' => 'client@codaro.test', 'name' => 'Anna Klient', 'role' => UserRole::Client],
            ['email' => 'client2@codaro.test', 'name' => 'Piotr Klient', 'role' => UserRole::Client],
        ];

        foreach ($users as $user) {
            User::query()->updateOrCreate(
                ['email' => $user['email']],
                [
                    ...$user,
                    'password' => Hash::make('password'),
                    'phone' => '+48'.fake()->numerify('#########'),
                    'email_verified_at' => now(),
                    'is_active' => true,
                ],
            );
        }
    }
}
```

- [ ] **Step 5: Write the DemoReportSeeder**

`backend/database/seeders/DemoReportSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Enums\ReportPriority;
use App\Enums\ReportStatus;
use App\Enums\UserRole;
use App\Models\Attachment;
use App\Models\Category;
use App\Models\LocationPing;
use App\Models\LocationStream;
use App\Models\Report;
use App\Models\ReportStatusHistory;
use App\Models\Request;
use App\Models\RequestType;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Enough data for the admin queue, the client history and the field view to
 * all render something meaningful. Never runs in production.
 */
class DemoReportSeeder extends Seeder
{
    public function run(): void
    {
        $clients = User::query()->role(UserRole::Client)->get();
        $admins = User::query()->role(UserRole::Admin)->get();
        $staff = User::query()->role(UserRole::Staff)->get();
        $categories = Category::query()->get();
        $requestTypes = RequestType::query()->get();

        if ($clients->isEmpty() || $categories->isEmpty()) {
            $this->command?->warn('DemoReportSeeder skipped: run UserSeeder and CategorySeeder first.');

            return;
        }

        // 12 waiting in the queue, spread across priorities, some already scored.
        foreach (range(1, 12) as $i) {
            $report = Report::factory()
                ->priority(fake()->randomElement(ReportPriority::cases()))
                ->create([
                    'client_id' => $clients->random()->id,
                    'category_id' => $categories->random()->id,
                    'queued_at' => now()->subMinutes($i * 7),
                    'created_at' => now()->subMinutes($i * 7),
                ]);

            if ($i % 3 === 0) {
                $report->forceFill([
                    'ai_priority' => fake()->randomFloat(2, 10, 100),
                    'ai_priority_calculated_at' => now(),
                    'ai_priority_reason' => ['category_weight' => 0.6, 'keywords' => ['pilne']],
                ])->save();
            }

            ReportStatusHistory::create([
                'report_id' => $report->id,
                'from_status' => null,
                'to_status' => ReportStatus::New,
                'context' => ['source' => 'seed'],
            ]);
        }

        // 8 in flight, one per non-new status, with the media a responder needs.
        $inFlight = [
            ReportStatus::Assigned, ReportStatus::Assigned,
            ReportStatus::InProgress, ReportStatus::InProgress,
            ReportStatus::Waiting, ReportStatus::Closed,
            ReportStatus::Closed, ReportStatus::Rejected,
        ];

        foreach ($inFlight as $i => $status) {
            $factory = match ($status) {
                ReportStatus::Assigned => Report::factory()->assigned($admins->random()),
                ReportStatus::InProgress => Report::factory()->inProgress(),
                ReportStatus::Waiting => Report::factory()->waiting(),
                ReportStatus::Closed => Report::factory()->closed(),
                ReportStatus::Rejected => Report::factory()->rejected(),
                default => Report::factory(),
            };

            $report = $factory->create([
                'client_id' => $clients->random()->id,
                'category_id' => $categories->random()->id,
                'assigned_staff_id' => $staff->isNotEmpty() ? $staff->random()->id : null,
                'queued_at' => now()->subHours($i + 1),
                'created_at' => now()->subHours($i + 1),
            ]);

            ReportStatusHistory::create([
                'report_id' => $report->id,
                'from_status' => ReportStatus::New,
                'to_status' => $status,
                'changed_by_user_id' => $admins->isNotEmpty() ? $admins->random()->id : null,
                'context' => ['source' => 'seed'],
            ]);

            Attachment::factory()->photo()->count(2)->create(['report_id' => $report->id]);
            Attachment::factory()->voiceNote()->create([
                'report_id' => $report->id,
                'uploaded_by_user_id' => $report->client_id,
            ]);

            foreach ($requestTypes->random(min(2, $requestTypes->count())) as $seq => $type) {
                Request::factory()->create([
                    'report_id' => $report->id,
                    'request_type_id' => $type->id,
                    'staff_role_id' => $type->staff_role_id,
                    'assigned_staff_id' => $staff->isNotEmpty() ? $staff->random()->id : null,
                    'sequence' => $seq + 1,
                ]);
            }
        }

        // One report transmitting live, with a location trail behind it.
        $streaming = Report::factory()->inProgress()->streamingLocation()->create([
            'client_id' => $clients->random()->id,
            'category_id' => $categories->random()->id,
            'assigned_staff_id' => $staff->isNotEmpty() ? $staff->random()->id : null,
        ]);

        $stream = LocationStream::factory()->create([
            'report_id' => $streaming->id,
            'started_by_user_id' => $streaming->client_id,
            'ping_count' => 20,
            'last_ping_at' => now(),
        ]);

        foreach (range(1, 20) as $i) {
            LocationPing::factory()->create([
                'report_id' => $streaming->id,
                'location_stream_id' => $stream->id,
                'recorded_at' => now()->subSeconds((20 - $i) * 10),
            ]);
        }
    }
}
```

- [ ] **Step 6: Rewrite DatabaseSeeder**

`backend/database/seeders/DatabaseSeeder.php`:

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Reference data — idempotent, safe everywhere including production.
        $this->call([
            StaffRoleSeeder::class,
            CategorySeeder::class,
            RequestTypeSeeder::class,
            SettingSeeder::class,
        ]);

        if (app()->environment('production')) {
            return;
        }

        $this->call([
            UserSeeder::class,
            DemoReportSeeder::class,
        ]);
    }
}
```

The stock `WithoutModelEvents` trait is dropped deliberately: `Report`'s `creating` hook is what assigns `reference` and `queued_at`, and suppressing it would produce reports with no reference number.

- [ ] **Step 7: Run the test to verify it passes**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/SeederTest.php`
Expected: PASS, 8 tests.

- [ ] **Step 8: Seed the dev database for real**

Run:
```bash
docker compose -f docker/docker-compose.yml exec -T app php artisan migrate:fresh --seed
docker compose -f docker/docker-compose.yml exec -T postgres psql -U app -d app -c \
  "SELECT status, count(*) FROM reports GROUP BY status ORDER BY status"
```
Expected: rows for `assigned`, `closed`, `in_progress`, `new`, `rejected`, `waiting` — `new` should be 12.

- [ ] **Step 9: Format and commit**

```bash
docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pint
git add backend/database backend/tests
git commit -m "feat: add reference and demo seeders"
```

---

### Task 15: Reconcile CLAUDE.md and verify the whole schema

CLAUDE.md §21 requires the spec to be updated whenever roles, statuses or the data model change. Three deliberate deviations landed; this task records them and runs the full verification.

**Files:**
- Modify: `/home/ihnat/code/htdocs/codaro/CLAUDE.md` (sections 1, 4, 7, 10)
- Modify: `docs/superpowers/plans/2026-08-20-domain-schema.md` (mark complete)
- Test: `backend/tests/Feature/Schema/SchemaIntegrityTest.php`

**Interfaces:**
- Consumes: everything.
- Produces: a spec that matches the database, and a test that fails if a future migration drops a required table.

- [x] **Step 1: Write the integrity test**

`backend/tests/Feature/Schema/SchemaIntegrityTest.php`:

```php
<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

it('has every domain table', function (string $table) {
    expect(Schema::hasTable($table))->toBeTrue();
})->with([
    'staff_roles', 'categories', 'request_types', 'settings',
    'reports', 'requests',
    'report_status_histories', 'report_revisions', 'report_assignments',
    'attachments', 'location_streams', 'location_pings',
    'media_stream_sessions',
    'device_tokens', 'notifications', 'notification_deliveries',
]);

it('protects every lifecycle column with a check constraint', function (string $table, string $column) {
    $name = "{$table}_{$column}_check";

    $exists = DB::selectOne(
        'SELECT 1 AS found FROM pg_constraint WHERE conname = ? AND contype = ?',
        [$name, 'c'],
    );

    expect($exists)->not->toBeNull("missing check constraint {$name}");
})->with([
    ['users', 'role'],
    ['users', 'admin_status'],
    ['categories', 'default_priority'],
    ['reports', 'status'],
    ['reports', 'priority'],
    ['reports', 'location_mode'],
    ['requests', 'status'],
    ['report_status_histories', 'to_status'],
    ['report_assignments', 'role'],
    ['attachments', 'type'],
    ['media_stream_sessions', 'kind'],
    ['media_stream_sessions', 'status'],
    ['device_tokens', 'platform'],
    ['notification_deliveries', 'status'],
]);

it('keeps the append-only triggers in place', function (string $table) {
    $trigger = DB::selectOne(
        'SELECT 1 AS found FROM pg_trigger WHERE tgname = ? AND NOT tgisinternal',
        ["{$table}_append_only"],
    );

    expect($trigger)->not->toBeNull("missing append-only trigger on {$table}");
})->with(['report_status_histories', 'report_revisions', 'report_assignments']);

it('keeps the three queue indexes partial', function (string $index) {
    $definition = DB::selectOne(
        'SELECT indexdef FROM pg_indexes WHERE indexname = ?',
        [$index],
    );

    expect($definition)->not->toBeNull("missing index {$index}");
    expect($definition->indexdef)->toContain("WHERE ((status)::text = 'new'::text)");
})->with([
    'reports_queue_fifo_idx',
    'reports_queue_client_priority_idx',
    'reports_queue_ai_priority_idx',
]);

it('cascades a report deletion through every child table', function () {
    $report = \App\Models\Report::factory()->create();

    \App\Models\Request::factory()->create(['report_id' => $report->id]);
    \App\Models\Attachment::factory()->photo()->create(['report_id' => $report->id]);
    \App\Models\LocationPing::factory()->create(['report_id' => $report->id]);
    \App\Models\MediaStreamSession::factory()->create(['report_id' => $report->id]);
    \App\Models\ReportStatusHistory::create([
        'report_id' => $report->id,
        'to_status' => \App\Enums\ReportStatus::New,
    ]);

    $report->forceDelete();

    foreach (['requests', 'attachments', 'location_pings', 'media_stream_sessions', 'report_status_histories'] as $table) {
        expect(DB::table($table)->count())->toBe(0, "{$table} was not cascaded");
    }
});
```

The `indexdef` assertion depends on how Postgres renders the predicate. Run the test once and, if the string differs, paste the real `indexdef` into the expectation rather than loosening it to a substring like `WHERE`.

- [x] **Step 2: Run it**

Run: `docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest tests/Feature/Schema/SchemaIntegrityTest.php`
Expected: PASS, 37 tests.

- [x] **Step 3: Update CLAUDE.md section 4**

Replace the `User` block in the section 4 code fence with:

```
User
 ├─ id, name, email, phone, role[client|admin|super_admin|staff]
 ├─ admin_status[active|manual]        -- tylko dla admina (auto-przydział vs wybór)
 ├─ staff_role_id                      -- stanowisko/służba (tylko dla staff)
 └─ is_active, locale, last_seen_at, metadata
    -- push_token NIE jest kolumną: patrz DeviceToken (obsługa wielu urządzeń)
```

Add these entries after the `MediaStreamSession` block:

```
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

Also note on `Report`: `priority_weight` is a generated column (`low=1 … critical=4`) and `queued_at` is the FIFO key, separate from `created_at`.

- [x] **Step 4: Update CLAUDE.md section 7**

Replace the "Implementacja wyboru trybu" block with:

```
Tryb sortowania jest **globalny dla całej organizacji** — nie jest preferencją
pojedynczego administratora. Przechowywany jako wiersz `queue.sort_mode`
w tabeli `settings`; zmienia go hiperadministrator, a zmiana obowiązuje
natychmiast wszystkich adminów (broadcast `QueueSortModeChanged`).

- endpoint kolejki: `GET /api/v1/queue` — bez parametru `sort`;
- `User.queue_sort_preference` NIE istnieje (świadoma zmiana wobec pierwotnej notatki).
```

- [x] **Step 5: Update CLAUDE.md section 10**

Replace the first line with:

```
Flow: `expo-notifications` rejestruje token → zapis jako wiersz w `device_tokens`
(jeden na urządzenie, `platform` + `is_active`) → backend wysyła przez
`expo-server-sdk-php` w Jobie. Każda próba wysyłki zapisywana w
`notification_deliveries` wraz z ticketem Expo; odczyt receipta oznacza
`settled_at`, a `DeviceNotRegistered` wyłącza dany `DeviceToken`.
```

- [x] **Step 6: Update CLAUDE.md section 1 glossary**

Add rows: `Stanowisko/służba → StaffRole` (already present — correct the "logika" note), `Typ żądania → RequestType`, `Ustawienie globalne → Setting`, `Token urządzenia → DeviceToken`, `Historia edycji → ReportRevision`, `Historia przypisań → ReportAssignment`.

- [x] **Step 7: Run the entire suite from scratch**

```bash
docker compose -f docker/docker-compose.yml exec -T app php artisan migrate:fresh --seed
docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest
docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pint --test
```
Expected: migrations and seeders complete without error; **all** Pest tests pass; Pint reports no style issues.

- [x] **Step 8: Verify rollback of the whole stack**

```bash
docker compose -f docker/docker-compose.yml exec -T app php artisan migrate:fresh
docker compose -f docker/docker-compose.yml exec -T app php artisan migrate:rollback --step=17
docker compose -f docker/docker-compose.yml exec -T postgres psql -U app -d app -c "\dt"
```
Expected: only `users`, `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `personal_access_tokens`, `migrations` remain. Then `php artisan migrate` brings everything back.

- [x] **Step 9: Commit**

```bash
docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pint
git add CLAUDE.md docs backend
git commit -m "docs: reconcile CLAUDE.md with the implemented schema"
```

---

## Verification

End-to-end, from a clean database:

```bash
cd /home/ihnat/code/htdocs/codaro
docker compose -f docker/docker-compose.yml up -d
docker compose -f docker/docker-compose.yml exec -T app php artisan migrate:fresh --seed
docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pest
docker compose -f docker/docker-compose.yml exec -T app ./vendor/bin/pint --test
```

Then confirm the queue actually behaves, using tinker:

```bash
docker compose -f docker/docker-compose.yml exec -T app php artisan tinker --execute="
\$admin = App\Models\User::where('email','admin@codaro.test')->first();
echo 'queue size: '.App\Services\Queue\ReportQueue::size().PHP_EOL;
echo 'sort mode: '.App\Models\Setting::queueSortMode()->value.PHP_EOL;
echo 'head (fifo): '.App\Services\Queue\ReportQueue::peek()->reference.PHP_EOL;
App\Models\Setting::setQueueSortMode(App\Enums\QueueSortMode::ClientPriority);
echo 'head (priority): '.App\Services\Queue\ReportQueue::peek()->reference.PHP_EOL;
\$claimed = App\Services\Queue\ReportQueue::claimNext(\$admin);
echo 'claimed: '.\$claimed->reference.' -> '.\$claimed->status->value.PHP_EOL;
echo 'queue size after claim: '.App\Services\Queue\ReportQueue::size().PHP_EOL;
"
```

Expected: queue size 12, sort mode `fifo`, the FIFO head differs from the priority head (unless the oldest report also happens to be critical), the claim returns a report now in `assigned`, and the queue drops to 11.

Finally, confirm the audit trail is genuinely immutable:

```bash
docker compose -f docker/docker-compose.yml exec -T postgres psql -U app -d app -c \
  "UPDATE report_status_histories SET note = 'tampered' WHERE id = 1"
```

Expected: `ERROR: Table report_status_histories is append-only and cannot be updated`.

---

## What this plan deliberately leaves out

- **Controllers, routes, Resources, Policies.** Scope was schema-only. `routes/api.php` keeps its `// Domain routes … future work` placeholder.
- **`PriorityScorer` and the AI scoring job.** The columns (`ai_priority`, `ai_priority_calculated_at`, `ai_priority_reason`) and the null-last ordering exist; the service in `app/Services/Priority/` does not.
- **Broadcast events.** `ReportCreated`, `ReportStatusChanged`, `QueueSortModeChanged` etc. are §8's work, not the schema's.
- **The auto-close rule.** `Report::hasOpenRequests()` is the primitive; the observer that flips a report to `closed` when it returns false belongs with the status-transition service.
- **Assignment release.** The append-only trigger means releasing an assignment must insert a row rather than update one. Whichever task builds assignment has to handle that explicitly.
- **`LocationPing` retention job.** `settings['retention.location_pings_days']` is seeded and `recorded_at` is indexed; the scheduled command is not written.
- **Mobile TypeScript types.** `mobile/src/api/` still has no domain types.
- **True concurrency test for `SKIP LOCKED`.** Needs two database connections outside `RefreshDatabase`'s transaction; noted in Task 13.
