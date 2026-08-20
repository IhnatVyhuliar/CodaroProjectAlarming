<?php

namespace App\Models;

use Database\Factories\LocationStreamFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['report_id', 'started_by_user_id', 'started_at', 'ended_at', 'last_ping_at', 'ping_count', 'stop_reason', 'metadata'])]
class LocationStream extends Model
{
    /** @use HasFactory<LocationStreamFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'last_ping_at' => 'datetime',
            'ping_count' => 'integer',
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

    /** @return HasMany<LocationPing, $this> */
    public function pings(): HasMany
    {
        return $this->hasMany(LocationPing::class)->orderBy('recorded_at');
    }

    public function isLive(): bool
    {
        return $this->ended_at === null;
    }

    /** @param  Builder<$this>  $query */
    public function scopeLive(Builder $query): void
    {
        $query->whereNull('ended_at');
    }
}
