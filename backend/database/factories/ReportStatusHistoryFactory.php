<?php

namespace Database\Factories;

use App\Enums\ReportStatus;
use App\Models\Report;
use App\Models\ReportStatusHistory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ReportStatusHistory> */
class ReportStatusHistoryFactory extends Factory
{
    protected $model = ReportStatusHistory::class;

    public function definition(): array
    {
        return [
            'report_id' => Report::factory(),
            'changed_by_user_id' => User::factory()->admin(),
            'from_status' => ReportStatus::New,
            'to_status' => ReportStatus::Assigned,
            'note' => null,
            'context' => [],
        ];
    }
}
