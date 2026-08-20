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
