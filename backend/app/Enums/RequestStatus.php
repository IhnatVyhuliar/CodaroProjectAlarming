<?php

namespace App\Enums;

enum RequestStatus: string
{
    case Pending = 'pending';
    case InProgress = 'in_progress';
    case Done = 'done';
    case Cancelled = 'cancelled';

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::Done, self::Cancelled], true);
    }
}
