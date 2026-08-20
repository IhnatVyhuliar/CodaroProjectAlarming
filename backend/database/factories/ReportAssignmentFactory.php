<?php

namespace Database\Factories;

use App\Enums\AssignmentRole;
use App\Models\Report;
use App\Models\ReportAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ReportAssignment> */
class ReportAssignmentFactory extends Factory
{
    protected $model = ReportAssignment::class;

    public function definition(): array
    {
        return [
            'report_id' => Report::factory(),
            'user_id' => User::factory()->admin(),
            'role' => AssignmentRole::Admin,
            'assigned_at' => now(),
        ];
    }

    public function released(): static
    {
        return $this->state(fn () => ['unassigned_at' => now()]);
    }
}
