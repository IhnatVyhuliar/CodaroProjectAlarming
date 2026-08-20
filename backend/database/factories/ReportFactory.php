<?php

namespace Database\Factories;

use App\Enums\LocationMode;
use App\Enums\ReportPriority;
use App\Enums\ReportStatus;
use App\Models\Category;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Report> */
class ReportFactory extends Factory
{
    protected $model = Report::class;

    public function definition(): array
    {
        return [
            'client_id' => User::factory()->client(),
            'category_id' => Category::factory(),
            'name' => $this->faker->sentence(4),
            'description' => $this->faker->paragraph(),
            'status' => ReportStatus::New,
            'priority' => ReportPriority::Medium,
            'location_mode' => LocationMode::OneTime,
            // Warsaw-ish, so seeded demo data plots somewhere sensible on a map.
            'location_lat' => $this->faker->latitude(51.9, 52.4),
            'location_lng' => $this->faker->longitude(20.8, 21.3),
            'location_accuracy' => $this->faker->randomFloat(2, 3, 60),
            'location_updated_at' => now(),
            'metadata' => [],
        ];
    }

    public function assigned(?User $admin = null): static
    {
        return $this->state(fn () => [
            'status' => ReportStatus::Assigned,
            'assigned_admin_id' => $admin?->id ?? User::factory()->admin(),
            'assigned_at' => now(),
            'first_response_at' => now(),
        ]);
    }

    public function inProgress(): static
    {
        return $this->assigned()->state(fn () => ['status' => ReportStatus::InProgress]);
    }

    public function waiting(): static
    {
        return $this->assigned()->state(fn () => ['status' => ReportStatus::Waiting]);
    }

    public function closed(): static
    {
        return $this->assigned()->state(fn () => [
            'status' => ReportStatus::Closed,
            'closed_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn () => [
            'status' => ReportStatus::Rejected,
            'closed_at' => now(),
            'close_reason' => 'Duplikat zgłoszenia',
        ]);
    }

    public function streamingLocation(): static
    {
        return $this->state(fn () => ['location_mode' => LocationMode::Streaming]);
    }

    public function priority(ReportPriority $priority): static
    {
        return $this->state(fn () => ['priority' => $priority]);
    }

    /** A report the PriorityScorer job has already rated. */
    public function scored(float $score): static
    {
        return $this->state(fn () => [
            'ai_priority' => $score,
            'ai_priority_calculated_at' => now(),
            'ai_priority_reason' => [
                'category_weight' => 0.4,
                'keywords' => ['pożar'],
                'has_media' => true,
            ],
        ]);
    }
}
