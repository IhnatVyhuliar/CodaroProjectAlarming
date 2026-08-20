<?php

use App\Enums\QueueSortMode;
use App\Enums\ReportStatus;
use App\Enums\UserRole;
use App\Models\Attachment;
use App\Models\Category;
use App\Models\LocationPing;
use App\Models\Report;
use App\Models\RequestType;
use App\Models\Setting;
use App\Models\StaffRole;
use App\Models\User;
use App\Services\Queue\ReportQueue;
use Database\Seeders\CategorySeeder;
use Database\Seeders\RequestTypeSeeder;
use Database\Seeders\SettingSeeder;
use Database\Seeders\StaffRoleSeeder;
use Illuminate\Support\Facades\Hash;

it('seeds the reference catalogs', function () {
    $this->seed();

    expect(StaffRole::query()->count())->toBeGreaterThan(0);
    expect(Category::query()->count())->toBeGreaterThan(0);
    expect(RequestType::query()->pluck('slug')->all())
        ->toContain('connection', 'repair', 'meeting', 'money', 'service_arrival');
});

it('is idempotent — seeding twice changes nothing', function () {
    $this->seed(StaffRoleSeeder::class);
    $this->seed(CategorySeeder::class);
    $this->seed(RequestTypeSeeder::class);

    $roles = StaffRole::query()->count();
    $categories = Category::query()->count();
    $types = RequestType::query()->count();

    $this->seed(StaffRoleSeeder::class);
    $this->seed(CategorySeeder::class);
    $this->seed(RequestTypeSeeder::class);

    expect(StaffRole::query()->count())->toBe($roles);
    expect(Category::query()->count())->toBe($categories);
    expect(RequestType::query()->count())->toBe($types);
});

it('points every category at a service that handles it', function () {
    $this->seed(StaffRoleSeeder::class);
    $this->seed(CategorySeeder::class);

    expect(Category::query()->whereNull('staff_role_id')->count())->toBe(0);
});

it('defaults the global queue to fifo', function () {
    $this->seed(SettingSeeder::class);

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

    expect(ReportQueue::size())->toBeGreaterThan(0);
});

it('gives demo reports the media a field worker would see', function () {
    $this->seed();

    expect(Attachment::query()->voiceNotes()->count())->toBeGreaterThan(0);
    expect(LocationPing::query()->count())->toBeGreaterThan(0);
    expect(Report::query()->whereHas('requests')->count())->toBeGreaterThan(0);
});
