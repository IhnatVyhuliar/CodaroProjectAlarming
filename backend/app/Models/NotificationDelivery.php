<?php

namespace App\Models;

use App\Enums\NotificationDeliveryStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'notification_id', 'user_id', 'device_token_id', 'channel', 'status',
    'provider_ticket_id', 'provider_receipt_id', 'error', 'payload',
    'sent_at', 'settled_at',
])]
class NotificationDelivery extends Model
{
    protected function casts(): array
    {
        return [
            'status' => NotificationDeliveryStatus::class,
            'payload' => 'array',
            'sent_at' => 'datetime',
            'settled_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<DeviceToken, $this> */
    public function deviceToken(): BelongsTo
    {
        return $this->belongsTo(DeviceToken::class);
    }

    /** Sent to Expo, receipt not yet read back. @param  Builder<$this>  $query */
    public function scopePendingReceipt(Builder $query): void
    {
        $query->whereNotNull('provider_ticket_id')->whereNull('settled_at');
    }
}
