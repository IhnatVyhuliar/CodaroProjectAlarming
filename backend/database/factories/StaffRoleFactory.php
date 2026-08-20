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
