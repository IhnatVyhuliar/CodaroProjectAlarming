<?php

namespace Database\Factories;

use App\Enums\MediaStreamKind;
use App\Enums\MediaStreamStatus;
use App\Models\MediaStreamSession;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<MediaStreamSession> */
class MediaStreamSessionFactory extends Factory
{
    protected $model = MediaStreamSession::class;

    public function definition(): array
    {
        return [
            'report_id' => Report::factory(),
            'started_by_user_id' => User::factory()->client(),
            'kind' => MediaStreamKind::Camera,
            'provider' => 'livekit',
            'room_name' => 'report-'.Str::uuid(),
            'status' => MediaStreamStatus::Pending,
            'metadata' => [],
        ];
    }

    public function live(): static
    {
        return $this->state(fn () => [
            'status' => MediaStreamStatus::Live,
            'started_at' => now(),
        ]);
    }

    public function ended(): static
    {
        return $this->state(fn () => [
            'status' => MediaStreamStatus::Ended,
            'started_at' => now()->subMinutes(12),
            'ended_at' => now(),
            'duration_seconds' => 720,
            'recording_disk' => 's3',
            'recording_path' => 'recordings/'.Str::uuid().'.mp4',
        ]);
    }
}
