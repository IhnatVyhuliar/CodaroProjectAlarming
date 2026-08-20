<?php

namespace App\Models;

use App\Enums\MediaStreamKind;
use App\Enums\MediaStreamStatus;
use Database\Factories\MediaStreamSessionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'report_id', 'started_by_user_id', 'kind', 'provider', 'room_name', 'status',
    'started_at', 'ended_at', 'duration_seconds', 'recording_disk',
    'recording_path', 'recording_url', 'metadata',
])]
class MediaStreamSession extends Model
{
    /** @use HasFactory<MediaStreamSessionFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'kind' => MediaStreamKind::class,
            'status' => MediaStreamStatus::class,
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'duration_seconds' => 'integer',
            'metadata' => 'array',
        ];
    }

    /** @return BelongsTo<Report, $this> */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    /** @return BelongsTo<User, $this> */
    public function startedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'started_by_user_id');
    }

    public function isLive(): bool
    {
        return $this->status === MediaStreamStatus::Live;
    }

    /** @param  Builder<$this>  $query */
    public function scopeLive(Builder $query): void
    {
        $query->where('status', MediaStreamStatus::Live);
    }

    /** @param  Builder<$this>  $query */
    public function scopeOfKind(Builder $query, MediaStreamKind $kind): void
    {
        $query->where('kind', $kind);
    }
}
