<?php

namespace Database\Seeders;

use App\Enums\ReportPriority;
use App\Enums\ReportStatus;
use App\Enums\UserRole;
use App\Models\Attachment;
use App\Models\Category;
use App\Models\LocationPing;
use App\Models\LocationStream;
use App\Models\Report;
use App\Models\ReportStatusHistory;
use App\Models\Request;
use App\Models\RequestType;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Enough data for the admin queue, the client history and the field view to
 * all render something meaningful. Never runs in production.
 */
class DemoReportSeeder extends Seeder
{
    public function run(): void
    {
        $clients = User::query()->role(UserRole::Client)->get();
        $admins = User::query()->role(UserRole::Admin)->get();
        $staff = User::query()->role(UserRole::Staff)->get();
        $categories = Category::query()->get();
        $requestTypes = RequestType::query()->get();

        if ($clients->isEmpty() || $categories->isEmpty()) {
            $this->command?->warn('DemoReportSeeder skipped: run UserSeeder and CategorySeeder first.');

            return;
        }

        // 12 waiting in the queue, spread across priorities, some already scored.
        foreach (range(1, 12) as $i) {
            $report = Report::factory()
                ->priority(fake()->randomElement(ReportPriority::cases()))
                ->create([
                    'client_id' => $clients->random()->id,
                    'category_id' => $categories->random()->id,
                    'queued_at' => now()->subMinutes($i * 7),
                    'created_at' => now()->subMinutes($i * 7),
                ]);

            if ($i % 3 === 0) {
                $report->forceFill([
                    'ai_priority' => fake()->randomFloat(2, 10, 100),
                    'ai_priority_calculated_at' => now(),
                    'ai_priority_reason' => ['category_weight' => 0.6, 'keywords' => ['pilne']],
                ])->save();
            }

            ReportStatusHistory::create([
                'report_id' => $report->id,
                'from_status' => null,
                'to_status' => ReportStatus::New,
                'context' => ['source' => 'seed'],
            ]);
        }

        // 8 in flight, one per non-new status, with the media a responder needs.
        $inFlight = [
            ReportStatus::Assigned, ReportStatus::Assigned,
            ReportStatus::InProgress, ReportStatus::InProgress,
            ReportStatus::Waiting, ReportStatus::Closed,
            ReportStatus::Closed, ReportStatus::Rejected,
        ];

        // Statuses reached only via the `assigned()` state (directly or
        // chained through inProgress/waiting/closed) need a real admin
        // passed explicitly — otherwise the factory's default
        // `User::factory()->admin()` mints a throwaway admin per report.
        $needsAdmin = [
            ReportStatus::Assigned->value => true,
            ReportStatus::InProgress->value => true,
            ReportStatus::Waiting->value => true,
            ReportStatus::Closed->value => true,
        ];

        foreach ($inFlight as $i => $status) {
            $admin = $admins->random();

            $factory = match ($status) {
                ReportStatus::Assigned => Report::factory()->assigned($admin),
                ReportStatus::InProgress => Report::factory()->inProgress(),
                ReportStatus::Waiting => Report::factory()->waiting(),
                ReportStatus::Closed => Report::factory()->closed(),
                ReportStatus::Rejected => Report::factory()->rejected(),
                default => Report::factory(),
            };

            $report = $factory->create([
                'client_id' => $clients->random()->id,
                'category_id' => $categories->random()->id,
                'assigned_staff_id' => $staff->isNotEmpty() ? $staff->random()->id : null,
                'queued_at' => now()->subHours($i + 1),
                'created_at' => now()->subHours($i + 1),
                ...(($needsAdmin[$status->value] ?? false) ? ['assigned_admin_id' => $admin->id] : []),
            ]);

            ReportStatusHistory::create([
                'report_id' => $report->id,
                'from_status' => ReportStatus::New,
                'to_status' => $status,
                'changed_by_user_id' => $admins->isNotEmpty() ? $admins->random()->id : null,
                'context' => ['source' => 'seed'],
            ]);

            Attachment::factory()->photo()->count(2)->create(['report_id' => $report->id]);
            Attachment::factory()->voiceNote()->create([
                'report_id' => $report->id,
                'uploaded_by_user_id' => $report->client_id,
            ]);

            foreach ($requestTypes->random(min(2, $requestTypes->count())) as $seq => $type) {
                Request::factory()->create([
                    'report_id' => $report->id,
                    'request_type_id' => $type->id,
                    'staff_role_id' => $type->staff_role_id,
                    'assigned_staff_id' => $staff->isNotEmpty() ? $staff->random()->id : null,
                    'sequence' => $seq + 1,
                ]);
            }
        }

        // One report transmitting live, with a location trail behind it.
        $streamingAdmin = $admins->random();

        $streaming = Report::factory()->inProgress()->streamingLocation()->create([
            'client_id' => $clients->random()->id,
            'category_id' => $categories->random()->id,
            'assigned_admin_id' => $streamingAdmin->id,
            'assigned_staff_id' => $staff->isNotEmpty() ? $staff->random()->id : null,
        ]);

        ReportStatusHistory::create([
            'report_id' => $streaming->id,
            'from_status' => ReportStatus::New,
            'to_status' => ReportStatus::InProgress,
            'changed_by_user_id' => $streamingAdmin->id,
            'context' => ['source' => 'seed'],
        ]);

        $stream = LocationStream::factory()->create([
            'report_id' => $streaming->id,
            'started_by_user_id' => $streaming->client_id,
            'ping_count' => 20,
            'last_ping_at' => now(),
        ]);

        foreach (range(1, 20) as $i) {
            LocationPing::factory()->create([
                'report_id' => $streaming->id,
                'location_stream_id' => $stream->id,
                'recorded_at' => now()->subSeconds((20 - $i) * 10),
            ]);
        }
    }
}
