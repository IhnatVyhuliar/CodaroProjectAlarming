<?php

namespace Database\Factories;

use App\Models\LocationPing;
use App\Models\Report;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<LocationPing> */
class LocationPingFactory extends Factory
{
    protected $model = LocationPing::class;

    public function definition(): array
    {
        return [
            'report_id' => Report::factory(),
            'lat' => $this->faker->latitude(51.9, 52.4),
            'lng' => $this->faker->longitude(20.8, 21.3),
            'accuracy' => $this->faker->randomFloat(2, 3, 50),
            'battery_level' => $this->faker->numberBetween(5, 100),
            'is_moving' => true,
            'recorded_at' => now(),
        ];
    }
}
