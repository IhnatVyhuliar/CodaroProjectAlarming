<?php

namespace Database\Factories;

use App\Models\LocationStream;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<LocationStream> */
class LocationStreamFactory extends Factory
{
    protected $model = LocationStream::class;

    public function definition(): array
    {
        return [
            'report_id' => Report::factory(),
            'started_by_user_id' => User::factory()->client(),
            'started_at' => now()->subMinutes(5),
            'ping_count' => 0,
            'metadata' => [],
        ];
    }

    public function ended(): static
    {
        return $this->state(fn () => [
            'ended_at' => now(),
            'stop_reason' => 'client_stopped',
        ]);
    }
}
