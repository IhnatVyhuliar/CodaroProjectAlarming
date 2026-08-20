<?php

namespace App\Models;

use Database\Factories\LocationPingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['report_id', 'location_stream_id', 'lat', 'lng', 'accuracy', 'altitude', 'speed', 'heading', 'battery_level', 'is_moving', 'recorded_at'])]
class LocationPing extends Model
{
    /** @use HasFactory<LocationPingFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'lat' => 'decimal:7',
            'lng' => 'decimal:7',
            'accuracy' => 'decimal:2',
            'altitude' => 'decimal:2',
            'speed' => 'decimal:2',
            'heading' => 'decimal:2',
            'battery_level' => 'integer',
            'is_moving' => 'boolean',
            'recorded_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Report, $this> */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    /** @return BelongsTo<LocationStream, $this> */
    public function stream(): BelongsTo
    {
        return $this->belongsTo(LocationStream::class, 'location_stream_id');
    }

    /** @param  Builder<$this>  $query */
    public function scopeRecordedBetween(Builder $query, mixed $from, mixed $to): void
    {
        $query->whereBetween('recorded_at', [$from, $to]);
    }
}
