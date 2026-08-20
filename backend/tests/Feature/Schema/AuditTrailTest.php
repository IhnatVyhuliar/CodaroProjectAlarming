<?php

use App\Enums\AssignmentRole;
use App\Enums\ReportStatus;
use App\Models\Report;
use App\Models\ReportAssignment;
use App\Models\ReportRevision;
use App\Models\ReportStatusHistory;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('records a status transition with its author', function () {
    $report = Report::factory()->create();
    $admin = User::factory()->admin()->create();

    $history = ReportStatusHistory::create([
        'report_id' => $report->id,
        'changed_by_user_id' => $admin->id,
        'from_status' => ReportStatus::New,
        'to_status' => ReportStatus::Assigned,
        'note' => 'Przypisano do siebie',
        'context' => ['source' => 'queue.claim'],
    ]);

    expect($history->from_status)->toBe(ReportStatus::New);
    expect($history->to_status)->toBe(ReportStatus::Assigned);
    expect($history->changedBy->id)->toBe($admin->id);
    expect($history->context)->toBe(['source' => 'queue.claim']);
    expect($report->statusHistories)->toHaveCount(1);
});

it('allows a null from_status for the very first entry', function () {
    $report = Report::factory()->create();

    $history = ReportStatusHistory::create([
        'report_id' => $report->id,
        'from_status' => null,
        'to_status' => ReportStatus::New,
    ]);

    expect($history->from_status)->toBeNull();
});

it('refuses to update a status history row', function () {
    $report = Report::factory()->create();
    $history = ReportStatusHistory::create([
        'report_id' => $report->id,
        'to_status' => ReportStatus::New,
    ]);

    DB::table('report_status_histories')->where('id', $history->id)
        ->update(['note' => 'rewriting history']);
})->throws(QueryException::class);

it('refuses to update a revision or an assignment', function (string $table) {
    $report = Report::factory()->create();
    $id = DB::table($table)->insertGetId(match ($table) {
        'report_revisions' => [
            'report_id' => $report->id,
            'changes' => json_encode(['name' => ['old' => 'a', 'new' => 'b']]),
            'created_at' => now(),
        ],
        'report_assignments' => [
            'report_id' => $report->id,
            'user_id' => User::factory()->admin()->create()->id,
            'role' => 'admin',
            'assigned_at' => now(),
            'created_at' => now(),
        ],
    });

    expect(fn () => DB::table($table)->where('id', $id)->update(['report_id' => $report->id]))
        ->toThrow(QueryException::class);
})->with(['report_revisions', 'report_assignments']);

it('still allows deletion for gdpr erasure', function () {
    $report = Report::factory()->create();
    ReportStatusHistory::create(['report_id' => $report->id, 'to_status' => ReportStatus::New]);

    DB::table('report_status_histories')->where('report_id', $report->id)->delete();

    expect(ReportStatusHistory::query()->count())->toBe(0);
});

it('records what the client edited after filing', function () {
    $report = Report::factory()->create();
    $client = User::factory()->client()->create();

    $revision = ReportRevision::create([
        'report_id' => $report->id,
        'user_id' => $client->id,
        'changes' => [
            'name' => ['old' => 'Wyciek wody', 'new' => 'Zalanie mieszkania'],
            'priority' => ['old' => 'medium', 'new' => 'high'],
        ],
    ]);

    expect($revision->changes)->toHaveKey('priority');
    expect($revision->changes['priority']['new'])->toBe('high');
    expect($report->revisions)->toHaveCount(1);
});

it('tracks assignment spans for workload analytics', function () {
    $report = Report::factory()->create();
    $admin = User::factory()->admin()->create();

    $assignment = ReportAssignment::create([
        'report_id' => $report->id,
        'user_id' => $admin->id,
        'role' => AssignmentRole::Admin,
        'assigned_at' => now()->subMinutes(30),
    ]);

    expect($assignment->role)->toBe(AssignmentRole::Admin);
    expect($assignment->unassigned_at)->toBeNull();
    expect($report->assignments)->toHaveCount(1);
});

it('allows only one active assignment per user per report', function () {
    $report = Report::factory()->create();
    $staff = User::factory()->staff()->create();

    ReportAssignment::create([
        'report_id' => $report->id, 'user_id' => $staff->id,
        'role' => AssignmentRole::Staff, 'assigned_at' => now(),
    ]);
    ReportAssignment::create([
        'report_id' => $report->id, 'user_id' => $staff->id,
        'role' => AssignmentRole::Staff, 'assigned_at' => now(),
    ]);
})->throws(QueryException::class);

it('allows re-assigning the same user after they were released', function () {
    $report = Report::factory()->create();
    $staff = User::factory()->staff()->create();

    ReportAssignment::create([
        'report_id' => $report->id, 'user_id' => $staff->id,
        'role' => AssignmentRole::Staff,
        'assigned_at' => now()->subHour(), 'unassigned_at' => now()->subMinutes(10),
    ]);
    ReportAssignment::create([
        'report_id' => $report->id, 'user_id' => $staff->id,
        'role' => AssignmentRole::Staff, 'assigned_at' => now(),
    ]);

    expect(ReportAssignment::query()->count())->toBe(2);
});

it('carries no updated_at on append-only tables', function () {
    expect(DB::getSchemaBuilder()->hasColumn('report_status_histories', 'updated_at'))->toBeFalse();
    expect(DB::getSchemaBuilder()->hasColumn('report_revisions', 'updated_at'))->toBeFalse();
    expect(DB::getSchemaBuilder()->hasColumn('report_assignments', 'updated_at'))->toBeFalse();
});
