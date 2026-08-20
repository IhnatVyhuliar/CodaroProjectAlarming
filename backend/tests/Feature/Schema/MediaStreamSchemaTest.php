<?php

use App\Enums\MediaStreamKind;
use App\Enums\MediaStreamStatus;
use App\Models\MediaStreamSession;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('opens a camera session tied to a livekit room', function () {
    $report = Report::factory()->create();
    $client = User::factory()->client()->create();

    $session = MediaStreamSession::factory()->live()->create([
        'report_id' => $report->id,
        'started_by_user_id' => $client->id,
        'kind' => MediaStreamKind::Camera,
    ]);

    expect($session->kind)->toBe(MediaStreamKind::Camera);
    expect($session->status)->toBe(MediaStreamStatus::Live);
    expect($session->provider)->toBe('livekit');
    expect($session->isLive())->toBeTrue();
    expect($report->mediaStreamSessions)->toHaveCount(1);
});

it('rejects two sessions sharing a room name', function () {
    MediaStreamSession::factory()->create(['room_name' => 'report-1-camera']);
    MediaStreamSession::factory()->create(['room_name' => 'report-1-camera']);
})->throws(QueryException::class);

it('runs camera and audio sessions on one report at once', function () {
    $report = Report::factory()->create();

    MediaStreamSession::factory()->live()->create([
        'report_id' => $report->id, 'kind' => MediaStreamKind::Camera,
    ]);
    MediaStreamSession::factory()->live()->create([
        'report_id' => $report->id, 'kind' => MediaStreamKind::Audio,
    ]);

    expect($report->liveMediaStreams()->count())->toBe(2);
    expect(MediaStreamSession::query()->ofKind(MediaStreamKind::Audio)->count())->toBe(1);
});

it('keeps a recording pointer after the session ends', function () {
    $session = MediaStreamSession::factory()->ended()->create();

    expect($session->status)->toBe(MediaStreamStatus::Ended);
    expect($session->ended_at)->not->toBeNull();
    expect($session->recording_path)->not->toBeNull();
    expect($session->isLive())->toBeFalse();
});

it('refuses unknown kinds and statuses', function (string $column, string $value) {
    $session = MediaStreamSession::factory()->create();

    expect(fn () => DB::table('media_stream_sessions')->where('id', $session->id)->update([$column => $value]))
        ->toThrow(QueryException::class);
})->with([
    ['kind', 'telepathy'],
    ['status', 'buffering'],
]);

it('deletes sessions with their report', function () {
    $report = Report::factory()->create();
    MediaStreamSession::factory()->count(2)->create(['report_id' => $report->id]);

    $report->forceDelete();

    expect(MediaStreamSession::query()->count())->toBe(0);
});
