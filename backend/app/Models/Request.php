<?php

namespace App\Models;

use App\Enums\RequestStatus;
use Database\Factories\RequestFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A sub-task of a Report. Import aliased wherever Illuminate\Http\Request is
 * also in scope: `use App\Models\Request as ReportRequest;`
 */
#[Fillable([
    'report_id', 'request_type_id', 'staff_role_id', 'assigned_staff_id',
    'created_by_user_id', 'status', 'sequence', 'title', 'description',
    'amount', 'currency', 'scheduled_at', 'started_at', 'completed_at',
    'cancel_reason', 'metadata',
])]
class Request extends Model
{
    /** @use HasFactory<RequestFactory> */
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'status' => RequestStatus::class,
            'sequence' => 'integer',
            'amount' => 'decimal:2',
            'metadata' => 'array',
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Report, $this> */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    /** @return BelongsTo<RequestType, $this> */
    public function requestType(): BelongsTo
    {
        return $this->belongsTo(RequestType::class);
    }

    /** @return BelongsTo<StaffRole, $this> */
    public function staffRole(): BelongsTo
    {
        return $this->belongsTo(StaffRole::class);
    }

    /** @return BelongsTo<User, $this> */
    public function assignedStaff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_staff_id');
    }

    /** @return BelongsTo<User, $this> */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /** @param  Builder<$this>  $query */
    public function scopeOpen(Builder $query): void
    {
        $query->whereIn('status', [RequestStatus::Pending, RequestStatus::InProgress]);
    }

    /** @param  Builder<$this>  $query */
    public function scopeForStaff(Builder $query, User $user): void
    {
        $query->where('assigned_staff_id', $user->id);
    }
}
