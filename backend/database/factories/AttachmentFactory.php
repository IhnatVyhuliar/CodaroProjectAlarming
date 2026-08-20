<?php

namespace Database\Factories;

use App\Enums\AttachmentType;
use App\Models\Attachment;
use App\Models\Report;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Attachment> */
class AttachmentFactory extends Factory
{
    protected $model = Attachment::class;

    public function definition(): array
    {
        return [
            'report_id' => Report::factory(),
            'type' => AttachmentType::File,
            'disk' => 's3',
            'path' => 'reports/'.Str::uuid().'.bin',
            'original_name' => 'plik.bin',
            'mime_type' => 'application/octet-stream',
            'size_bytes' => $this->faker->numberBetween(1_000, 5_000_000),
            'metadata' => [],
        ];
    }

    public function photo(): static
    {
        return $this->state(fn () => [
            'type' => AttachmentType::Photo,
            'path' => 'reports/'.Str::uuid().'.jpg',
            'original_name' => 'zdjecie.jpg',
            'mime_type' => 'image/jpeg',
            'width' => 1920,
            'height' => 1080,
        ]);
    }

    /** A short recording sent as a file, not a live stream (CLAUDE.md 9.5). */
    public function voiceNote(): static
    {
        return $this->state(fn () => [
            'type' => AttachmentType::Audio,
            'path' => 'reports/'.Str::uuid().'.m4a',
            'original_name' => 'wiadomosc.m4a',
            'mime_type' => 'audio/mp4',
            'duration_seconds' => $this->faker->numberBetween(3, 60),
        ]);
    }

    public function document(): static
    {
        return $this->state(fn () => [
            'type' => AttachmentType::File,
            'path' => 'reports/'.Str::uuid().'.pdf',
            'original_name' => 'dokument.pdf',
            'mime_type' => 'application/pdf',
        ]);
    }

    public function video(): static
    {
        return $this->state(fn () => [
            'type' => AttachmentType::Video,
            'path' => 'reports/'.Str::uuid().'.mp4',
            'original_name' => 'nagranie.mp4',
            'mime_type' => 'video/mp4',
            'duration_seconds' => $this->faker->numberBetween(5, 180),
            'width' => 1280,
            'height' => 720,
        ]);
    }
}
