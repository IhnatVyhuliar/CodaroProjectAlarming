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
