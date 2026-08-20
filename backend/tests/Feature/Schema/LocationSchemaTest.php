<?php

use App\Models\LocationPing;
use App\Models\LocationStream;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('opens a location stream on a report', function () {
    $report = Report::factory()->streamingLocation()->create();
    $client = User::factory()->client()->create();

    $stream = LocationStream::factory()->create([
        'report_id' => $report->id,
        'started_by_user_id' => $client->id,
    ]);

    expect($stream->isLive())->toBeTrue();
    expect($stream->ended_at)->toBeNull();
    expect($stream->startedBy->id)->toBe($client->id);
    expect($report->activeLocationStream()->exists())->toBeTrue();
});

it('allows only one live stream per report', function () {
    $report = Report::factory()->create();

    LocationStream::factory()->create(['report_id' => $report->id]);
    LocationStream::factory()->create(['report_id' => $report->id]);
})->throws(QueryException::class);

it('allows a new stream once the previous one stopped', function () {
    $report = Report::factory()->create();

    LocationStream::factory()->ended()->create(['report_id' => $report->id]);
    LocationStream::factory()->create(['report_id' => $report->id]);

    expect($report->locationStreams()->count())->toBe(2);
    expect(LocationStream::query()->live()->count())->toBe(1);
});

it('records pings against a stream and its report', function () {
    $report = Report::factory()->create();
    $stream = LocationStream::factory()->create(['report_id' => $report->id]);

    LocationPing::factory()->count(5)->create([
        'report_id' => $report->id,
        'location_stream_id' => $stream->id,
    ]);

    expect($stream->pings)->toHaveCount(5);
    expect($report->locationPings()->count())->toBe(5);
});

it('accepts a ping without a stream for one-time sharing', function () {
    $report = Report::factory()->create();

    $ping = LocationPing::factory()->create([
        'report_id' => $report->id,
        'location_stream_id' => null,
    ]);

    expect($ping->location_stream_id)->toBeNull();
});

it('exposes the most recent ping for the field map', function () {
    $report = Report::factory()->create();

    LocationPing::factory()->create([
        'report_id' => $report->id,
        'lat' => 52.1, 'lng' => 21.0,
        'recorded_at' => now()->subMinutes(10),
    ]);
    LocationPing::factory()->create([
        'report_id' => $report->id,
        'lat' => 52.4, 'lng' => 21.3,
        'recorded_at' => now(),
    ]);

    expect((float) $report->latestLocationPing->lat)->toBe(52.4);
});

it('stores optional telemetry alongside the coordinates', function () {
    $ping = LocationPing::factory()->create([
        'accuracy' => 12.5,
        'speed' => 4.2,
        'heading' => 180.0,
        'battery_level' => 43,
        'is_moving' => true,
    ]);

    expect((float) $ping->fresh()->accuracy)->toBe(12.5);
    expect($ping->fresh()->battery_level)->toBe(43);
    expect($ping->fresh()->is_moving)->toBeTrue();
});

it('deletes streams and pings with their report', function () {
    $report = Report::factory()->create();
    $stream = LocationStream::factory()->create(['report_id' => $report->id]);
    LocationPing::factory()->count(3)->create([
        'report_id' => $report->id,
        'location_stream_id' => $stream->id,
    ]);

    $report->forceDelete();

    expect(LocationStream::query()->count())->toBe(0);
    expect(LocationPing::query()->count())->toBe(0);
});

it('supports purging pings by age for gdpr retention', function () {
    $report = Report::factory()->closed()->create();

    LocationPing::factory()->create(['report_id' => $report->id, 'recorded_at' => now()->subDays(40)]);
    LocationPing::factory()->create(['report_id' => $report->id, 'recorded_at' => now()->subDay()]);

    LocationPing::query()->where('recorded_at', '<', now()->subDays(30))->delete();

    expect(LocationPing::query()->count())->toBe(1);
});

it('carries no updated_at on the high-volume ping table', function () {
    expect(DB::getSchemaBuilder()->hasColumn('location_pings', 'updated_at'))->toBeFalse();
});
