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
