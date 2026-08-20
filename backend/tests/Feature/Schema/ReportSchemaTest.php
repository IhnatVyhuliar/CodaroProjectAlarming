<?php

use App\Enums\LocationMode;
use App\Enums\ReportPriority;
use App\Enums\ReportStatus;
use App\Models\Category;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('creates a report in the new status with a queue timestamp', function () {
    $report = Report::factory()->create();

    expect($report->status)->toBe(ReportStatus::New);
    expect($report->priority)->toBe(ReportPriority::Medium);
    expect($report->location_mode)->toBe(LocationMode::OneTime);
    expect($report->queued_at)->not->toBeNull();
    expect($report->closed_at)->toBeNull();
    expect($report->isOpen())->toBeTrue();
});

it('generates a human-readable reference number', function () {
    $first = Report::factory()->create();
    $second = Report::factory()->create();

    expect($first->reference)->toMatch('/^ZG-\d{4}-\d{6}$/');
    expect($second->reference)->not->toBe($first->reference);
});

it('derives priority_weight from priority in the database', function () {
    $low = Report::factory()->create(['priority' => ReportPriority::Low]);
    $critical = Report::factory()->create(['priority' => ReportPriority::Critical]);

    expect($low->fresh()->priority_weight)->toBe(1);
    expect($critical->fresh()->priority_weight)->toBe(4);
});

it('recomputes priority_weight when the client edits the priority', function () {
    $report = Report::factory()->create(['priority' => ReportPriority::Low]);

    $report->update(['priority' => ReportPriority::High]);

    expect($report->fresh()->priority_weight)->toBe(3);
});

it('refuses to write priority_weight directly', function () {
    $report = Report::factory()->create();

    DB::table('reports')->where('id', $report->id)->update(['priority_weight' => 99]);
})->throws(QueryException::class);

it('refuses unknown statuses, priorities and location modes', function (string $column, string $value) {
    $report = Report::factory()->create();

    expect(fn () => DB::table('reports')->where('id', $report->id)->update([$column => $value]))
        ->toThrow(QueryException::class);
})->with([
    ['status', 'exploded'],
    ['priority', 'apocalyptic'],
    ['location_mode', 'telepathy'],
]);

it('stores coordinates with seven decimal places', function () {
    $report = Report::factory()->create([
        'location_lat' => 52.2296756,
        'location_lng' => 21.0122287,
        'location_updated_at' => now(),
    ]);

    expect((float) $report->fresh()->location_lat)->toBe(52.2296756);
    expect((float) $report->fresh()->location_lng)->toBe(21.0122287);
});

it('links the client, category and both assignees', function () {
    $client = User::factory()->client()->create();
    $admin = User::factory()->admin()->create();
    $staff = User::factory()->staff()->create();
    $category = Category::factory()->create();

    $report = Report::factory()->create([
        'client_id' => $client->id,
        'category_id' => $category->id,
        'assigned_admin_id' => $admin->id,
        'assigned_staff_id' => $staff->id,
    ]);

    expect($report->client->id)->toBe($client->id);
    expect($report->category->id)->toBe($category->id);
    expect($report->assignedAdmin->id)->toBe($admin->id);
    expect($report->assignedStaff->id)->toBe($staff->id);
    expect($client->reports)->toHaveCount(1);
});

it('keeps the report when an assignee is deleted', function () {
    $admin = User::factory()->admin()->create();
    $report = Report::factory()->create(['assigned_admin_id' => $admin->id]);

    $admin->forceDelete();

    expect($report->fresh()->assigned_admin_id)->toBeNull();
});

it('holds an ai priority score with its explanation', function () {
    $report = Report::factory()->scored(87.5)->create();

    expect((float) $report->ai_priority)->toBe(87.5);
    expect($report->ai_priority_calculated_at)->not->toBeNull();
    expect($report->ai_priority_reason)->toBeArray();
});

it('leaves ai_priority null until the job has run', function () {
    expect(Report::factory()->create()->ai_priority)->toBeNull();
});

it('marks terminal reports as not open', function () {
    expect(Report::factory()->closed()->create()->isOpen())->toBeFalse();
    expect(Report::factory()->rejected()->create()->isOpen())->toBeFalse();
    expect(Report::factory()->waiting()->create()->isOpen())->toBeTrue();
});

it('creates the three partial queue indexes', function () {
    $indexes = collect(DB::select("SELECT indexname FROM pg_indexes WHERE tablename = 'reports'"))
        ->pluck('indexname');

    expect($indexes)->toContain('reports_queue_fifo_idx')
        ->toContain('reports_queue_client_priority_idx')
        ->toContain('reports_queue_ai_priority_idx');
});
