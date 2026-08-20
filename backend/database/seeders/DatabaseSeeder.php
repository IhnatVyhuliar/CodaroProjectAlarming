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
