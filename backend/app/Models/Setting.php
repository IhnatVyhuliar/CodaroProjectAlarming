<?php

namespace App\Models;

use App\Enums\QueueSortMode;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['key', 'value', 'description', 'updated_by_user_id'])]
class Setting extends Model
{
    public const QUEUE_SORT_MODE = 'queue.sort_mode';

    protected $primaryKey = 'key';

    protected $keyType = 'string';

    public $incrementing = false;

    protected function casts(): array
    {
        return [
            'value' => 'array',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::query()->find($key);

        return $setting === null ? $default : $setting->value;
    }

    /**
     * $userId is the author of THIS write, not a running "last human touched it"
     * pointer. Null means a system write (seeder, job) with no human author, and
     * deliberately replaces any previous attribution rather than carrying it forward.
     */
    public static function put(string $key, mixed $value, ?int $userId = null): void
    {
        static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $value, 'updated_by_user_id' => $userId],
        );
    }

    /** The single global queue ordering. Unset or corrupt values fall back to FIFO. */
    public static function queueSortMode(): QueueSortMode
    {
        $stored = static::get(self::QUEUE_SORT_MODE);

        return is_string($stored)
            ? (QueueSortMode::tryFrom($stored) ?? QueueSortMode::Fifo)
            : QueueSortMode::Fifo;
    }

    public static function setQueueSortMode(QueueSortMode $mode, ?int $userId = null): void
    {
        static::put(self::QUEUE_SORT_MODE, $mode->value, $userId);
    }
}
