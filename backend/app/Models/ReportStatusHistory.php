<?php

namespace App\Models;

use App\Enums\ReportStatus;
use Database\Factories\ReportStatusHistoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Append-only. A Postgres trigger rejects any UPDATE. */
#[Fillable(['report_id', 'changed_by_user_id', 'from_status', 'to_status', 'note', 'context'])]
class ReportStatusHistory extends Model
{
    /** @use HasFactory<ReportStatusHistoryFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'from_status' => ReportStatus::class,
            'to_status' => ReportStatus::class,
            'context' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Report, $this> */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    /** @return BelongsTo<User, $this> */
    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}
