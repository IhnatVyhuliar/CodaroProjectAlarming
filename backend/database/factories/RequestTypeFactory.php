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
