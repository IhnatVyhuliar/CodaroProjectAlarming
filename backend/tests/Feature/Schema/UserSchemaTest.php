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
