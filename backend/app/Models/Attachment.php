<?php

namespace App\Models;

use App\Enums\AttachmentType;
use Database\Factories\AttachmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'report_id', 'request_id', 'uploaded_by_user_id', 'type', 'disk', 'path',
    'original_name', 'mime_type', 'size_bytes', 'duration_seconds',
    'width', 'height', 'checksum', 'metadata',
])]
class Attachment extends Model
{
    /** @use HasFactory<AttachmentFactory> */
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'type' => AttachmentType::class,
            'size_bytes' => 'integer',
            'duration_seconds' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
            'metadata' => 'array',
        ];
    }

    /** @return BelongsTo<Report, $this> */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    /** @return BelongsTo<Request, $this> */
    public function request(): BelongsTo
    {
        return $this->belongsTo(Request::class);
    }

    /** @return BelongsTo<User, $this> */
    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }

    public function isPlayable(): bool
    {
        return in_array($this->type, [AttachmentType::Audio, AttachmentType::Video], true);
    }

    /** @param  Builder<$this>  $query */
    public function scopeOfType(Builder $query, AttachmentType $type): void
    {
        $query->where('type', $type);
    }

    /** @param  Builder<$this>  $query */
    public function scopeVoiceNotes(Builder $query): void
    {
        $query->where('type', AttachmentType::Audio);
    }
}
