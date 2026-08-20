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
