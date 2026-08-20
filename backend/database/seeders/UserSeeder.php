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
