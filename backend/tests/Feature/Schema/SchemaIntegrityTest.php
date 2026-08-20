<?php

use App\Enums\ReportStatus;
use App\Models\Attachment;
use App\Models\LocationPing;
use App\Models\MediaStreamSession;
use App\Models\Report;
use App\Models\ReportStatusHistory;
use App\Models\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

it('has every domain table', function (string $table) {
    expect(Schema::hasTable($table))->toBeTrue();
})->with([
    'staff_roles', 'categories', 'request_types', 'settings',
    'reports', 'requests',
    'report_status_histories', 'report_revisions', 'report_assignments',
    'attachments', 'location_streams', 'location_pings',
    'media_stream_sessions',
    'device_tokens', 'notifications', 'notification_deliveries',
]);

it('protects every lifecycle column with a check constraint', function (string $table, string $column) {
    $name = "{$table}_{$column}_check";

    $exists = DB::selectOne(
        'SELECT 1 AS found FROM pg_constraint WHERE conname = ? AND contype = ?',
        [$name, 'c'],
    );

    expect($exists)->not->toBeNull("missing check constraint {$name}");
})->with([
    ['users', 'role'],
    ['users', 'admin_status'],
    ['categories', 'default_priority'],
    ['reports', 'status'],
    ['reports', 'priority'],
    ['reports', 'location_mode'],
    ['requests', 'status'],
    ['report_status_histories', 'to_status'],
    ['report_assignments', 'role'],
    ['attachments', 'type'],
    ['media_stream_sessions', 'kind'],
    ['media_stream_sessions', 'status'],
    ['device_tokens', 'platform'],
    ['notification_deliveries', 'status'],
]);

it('keeps the append-only triggers in place', function (string $table) {
    $trigger = DB::selectOne(
        'SELECT 1 AS found FROM pg_trigger WHERE tgname = ? AND NOT tgisinternal',
        ["{$table}_append_only"],
    );

    expect($trigger)->not->toBeNull("missing append-only trigger on {$table}");
})->with(['report_status_histories', 'report_revisions', 'report_assignments']);

it('keeps the three queue indexes partial', function (string $index) {
    $definition = DB::selectOne(
        'SELECT indexdef FROM pg_indexes WHERE indexname = ?',
        [$index],
    );

    expect($definition)->not->toBeNull("missing index {$index}");
    expect($definition->indexdef)->toContain("WHERE (((status)::text = 'new'::text) AND (deleted_at IS NULL))");
})->with([
    'reports_queue_fifo_idx',
    'reports_queue_client_priority_idx',
    'reports_queue_ai_priority_idx',
]);

it('cascades a report deletion through every child table', function () {
    $report = Report::factory()->create();

    Request::factory()->create(['report_id' => $report->id]);
    Attachment::factory()->photo()->create(['report_id' => $report->id]);
    LocationPing::factory()->create(['report_id' => $report->id]);
    MediaStreamSession::factory()->create(['report_id' => $report->id]);
    ReportStatusHistory::create([
        'report_id' => $report->id,
        'to_status' => ReportStatus::New,
    ]);

    $report->forceDelete();

    foreach (['requests', 'attachments', 'location_pings', 'media_stream_sessions', 'report_status_histories'] as $table) {
        expect(DB::table($table)->count())->toBe(0, "{$table} was not cascaded");
    }
});
