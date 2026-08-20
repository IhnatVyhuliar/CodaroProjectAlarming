<?php

use App\Enums\AssignmentRole;
use App\Enums\QueueSortMode;
use App\Enums\ReportPriority;
use App\Enums\ReportStatus;
use App\Models\Report;
use App\Models\ReportAssignment;
use App\Models\ReportStatusHistory;
use App\Models\Setting;
use App\Models\User;
use App\Services\Queue\ReportQueue;
use Illuminate\Support\Facades\DB;

it('holds only new reports', function () {
    Report::factory()->count(3)->create();
    Report::factory()->assigned()->create();
    Report::factory()->closed()->create();

    expect(ReportQueue::size())->toBe(3);
});

it('orders by arrival in fifo mode', function () {
    $first = Report::factory()->create(['queued_at' => now()->subMinutes(30), 'name' => 'first']);
    $second = Report::factory()->create(['queued_at' => now()->subMinutes(20), 'name' => 'second']);
    $third = Report::factory()->create(['queued_at' => now()->subMinutes(10), 'name' => 'third']);

    expect(ReportQueue::query(QueueSortMode::Fifo)->pluck('name')->all())
        ->toBe(['first', 'second', 'third']);
    expect(ReportQueue::peek(QueueSortMode::Fifo)->id)->toBe($first->id);
});

it('breaks ties on id so the order is stable', function () {
    $at = now()->subHour();
    $a = Report::factory()->create(['queued_at' => $at]);
    $b = Report::factory()->create(['queued_at' => $at]);

    expect(ReportQueue::query(QueueSortMode::Fifo)->pluck('id')->all())
        ->toBe([$a->id, $b->id]);
});

it('puts critical first in client priority mode, oldest first within a level', function () {
    Report::factory()->priority(ReportPriority::Low)
        ->create(['queued_at' => now()->subHour(), 'name' => 'low-old']);
    Report::factory()->priority(ReportPriority::Critical)
        ->create(['queued_at' => now()->subMinute(), 'name' => 'critical-new']);
    Report::factory()->priority(ReportPriority::Critical)
        ->create(['queued_at' => now()->subMinutes(30), 'name' => 'critical-old']);
    Report::factory()->priority(ReportPriority::Medium)
        ->create(['queued_at' => now()->subMinutes(45), 'name' => 'medium']);

    expect(ReportQueue::query(QueueSortMode::ClientPriority)->pluck('name')->all())
        ->toBe(['critical-old', 'critical-new', 'medium', 'low-old']);
});

it('sorts unscored reports last in ai mode and falls back to arrival order', function () {
    Report::factory()->create(['queued_at' => now()->subMinutes(50), 'name' => 'unscored-old']);
    Report::factory()->create(['queued_at' => now()->subMinutes(5), 'name' => 'unscored-new']);
    Report::factory()->scored(30.0)->create(['queued_at' => now()->subMinute(), 'name' => 'low-score']);
    Report::factory()->scored(95.0)->create(['queued_at' => now()->subMinute(), 'name' => 'high-score']);

    expect(ReportQueue::query(QueueSortMode::AiPriority)->pluck('name')->all())
        ->toBe(['high-score', 'low-score', 'unscored-old', 'unscored-new']);
});

it('follows the global setting when no mode is passed', function () {
    Report::factory()->priority(ReportPriority::Low)
        ->create(['queued_at' => now()->subHour(), 'name' => 'low-old']);
    Report::factory()->priority(ReportPriority::Critical)
        ->create(['queued_at' => now(), 'name' => 'critical-new']);

    expect(ReportQueue::peek()->name)->toBe('low-old');

    Setting::setQueueSortMode(QueueSortMode::ClientPriority);

    expect(ReportQueue::peek()->name)->toBe('critical-new');
});

it('claims the head of the queue for an admin', function () {
    $admin = User::factory()->activeAdmin()->create();
    $head = Report::factory()->create(['queued_at' => now()->subHour()]);
    Report::factory()->create(['queued_at' => now()]);

    $claimed = ReportQueue::claimNext($admin);

    expect($claimed->id)->toBe($head->id);
    expect($claimed->status)->toBe(ReportStatus::Assigned);
    expect($claimed->assigned_admin_id)->toBe($admin->id);
    expect($claimed->assigned_at)->not->toBeNull();
    expect($claimed->first_response_at)->not->toBeNull();
    expect(ReportQueue::size())->toBe(1);
});

it('writes history and an assignment row when claiming', function () {
    $admin = User::factory()->activeAdmin()->create();
    $report = Report::factory()->create();

    ReportQueue::claimNext($admin);

    $history = ReportStatusHistory::query()->where('report_id', $report->id)->sole();
    expect($history->from_status)->toBe(ReportStatus::New);
    expect($history->to_status)->toBe(ReportStatus::Assigned);
    expect($history->changed_by_user_id)->toBe($admin->id);

    $assignment = ReportAssignment::query()->where('report_id', $report->id)->sole();
    expect($assignment->user_id)->toBe($admin->id);
    expect($assignment->role)->toBe(AssignmentRole::Admin);
});

it('returns null when the queue is empty', function () {
    expect(ReportQueue::claimNext(User::factory()->activeAdmin()->create()))->toBeNull();
    expect(ReportQueue::peek())->toBeNull();
});

it('never hands the same report to two admins', function () {
    $reports = Report::factory()->count(2)->create();
    $first = User::factory()->activeAdmin()->create();
    $second = User::factory()->activeAdmin()->create();

    $a = ReportQueue::claimNext($first);
    $b = ReportQueue::claimNext($second);

    expect($a->id)->not->toBe($b->id);
    expect([$a->id, $b->id])->toEqualCanonicalizing($reports->pluck('id')->all());
    expect(ReportQueue::size())->toBe(0);
});

it('sets first_response_at only on the first claim', function () {
    $admin = User::factory()->activeAdmin()->create();
    $report = Report::factory()->create([
        'first_response_at' => now()->subHours(2),
    ]);

    $claimed = ReportQueue::claimNext($admin);

    expect($claimed->first_response_at->toDateTimeString())
        ->toBe($report->first_response_at->toDateTimeString());
});

it('excludes soft deleted reports from the queue', function () {
    Report::factory()->count(2)->create();
    Report::factory()->create()->delete();

    expect(ReportQueue::size())->toBe(2);
    expect(DB::table('reports')->count())->toBe(3);
});
