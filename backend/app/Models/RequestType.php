<?php

namespace App\Models;

use Database\Factories\RequestTypeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['slug', 'name', 'description', 'staff_role_id', 'requires_staff', 'requires_amount', 'requires_scheduled_at', 'icon', 'sort_order', 'is_active', 'metadata'])]
class RequestType extends Model
{
    /** @use HasFactory<RequestTypeFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'requires_staff' => 'boolean',
            'requires_amount' => 'boolean',
            'requires_scheduled_at' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'metadata' => 'array',
        ];
    }

    /** @return BelongsTo<StaffRole, $this> */
    public function staffRole(): BelongsTo
    {
        return $this->belongsTo(StaffRole::class);
    }

    /** @return HasMany<Request, $this> */
    public function requests(): HasMany
    {
        return $this->hasMany(Request::class);
    }

    /** @param  Builder<$this>  $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }
}
