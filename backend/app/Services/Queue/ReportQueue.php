<?php

namespace App\Services\Queue;

use App\Enums\AssignmentRole;
use App\Enums\QueueSortMode;
use App\Enums\ReportStatus;
use App\Models\Report;
use App\Models\ReportAssignment;
use App\Models\ReportStatusHistory;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * The global report queue. One queue for the whole organisation, ordered by a
 * single global setting — changing the sort mode reorders it for every admin
 * at once (CLAUDE.md section 7).
 */
final class ReportQueue
{
    /** @return Builder<Report> */
    public static function query(?QueueSortMode $mode = null): Builder
    {
        return Report::query()
            ->inQueue()
            ->sortedForQueue($mode ?? Setting::queueSortMode());
    }

    public static function peek(?QueueSortMode $mode = null): ?Report
    {
        return self::query($mode)->first();
    }

    public static function size(): int
    {
        return Report::query()->inQueue()->count();
    }

    /**
     * Hand the admin the next report and assign it to them. Uses
     * FOR UPDATE SKIP LOCKED so two admins in `active` mode racing for work
     * always get different reports rather than blocking or colliding.
     */
    public static function claimNext(User $admin, ?QueueSortMode $mode = null): ?Report
    {
        return DB::transaction(function () use ($admin, $mode): ?Report {
            $report = self::query($mode)
                ->lock('for update skip locked')
                ->first();

            if ($report === null) {
                return null;
            }

            $from = $report->status;

            $report->forceFill([
                'status' => ReportStatus::Assigned,
                'assigned_admin_id' => $admin->id,
                'assigned_at' => now(),
                'first_response_at' => $report->first_response_at ?? now(),
            ])->save();

            ReportStatusHistory::create([
                'report_id' => $report->id,
                'changed_by_user_id' => $admin->id,
                'from_status' => $from,
                'to_status' => ReportStatus::Assigned,
                'context' => ['source' => 'queue.claim', 'mode' => ($mode ?? Setting::queueSortMode())->value],
            ]);

            ReportAssignment::create([
                'report_id' => $report->id,
                'user_id' => $admin->id,
                'role' => AssignmentRole::Admin,
                'assigned_by_user_id' => $admin->id,
                'assigned_at' => now(),
            ]);

            return $report;
        });
    }
}
