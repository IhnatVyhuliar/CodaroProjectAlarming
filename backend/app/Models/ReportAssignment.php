<?php

namespace App\Models;

use App\Enums\AssignmentRole;
use Database\Factories\ReportAssignmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Append-only. A Postgres trigger rejects any UPDATE. */
#[Fillable(['report_id', 'user_id', 'role', 'assigned_by_user_id', 'assigned_at', 'unassigned_at', 'unassign_reason'])]
class ReportAssignment extends Model
{
    /** @use HasFactory<ReportAssignmentFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'role' => AssignmentRole::class,
            'assigned_at' => 'datetime',
            'unassigned_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Report, $this> */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<User, $this> */
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by_user_id');
    }
}
