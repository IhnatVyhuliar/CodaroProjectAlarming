<?php

namespace Database\Factories;

use App\Enums\RequestStatus;
use App\Models\Report;
use App\Models\Request;
use App\Models\RequestType;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Request> */
class RequestFactory extends Factory
{
    protected $model = Request::class;

    public function definition(): array
    {
        return [
            'report_id' => Report::factory(),
            'request_type_id' => RequestType::factory(),
            'status' => RequestStatus::Pending,
            'sequence' => 0,
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->sentence(),
            'metadata' => [],
        ];
    }

    public function inProgress(): static
    {
        return $this->state(fn () => [
            'status' => RequestStatus::InProgress,
            'started_at' => now(),
        ]);
    }

    public function done(): static
    {
        return $this->state(fn () => [
            'status' => RequestStatus::Done,
            'started_at' => now()->subMinutes(20),
            'completed_at' => now(),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn () => [
            'status' => RequestStatus::Cancelled,
            'completed_at' => now(),
            'cancel_reason' => 'Nieaktualne',
        ]);
    }
}
