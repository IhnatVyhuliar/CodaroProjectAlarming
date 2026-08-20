<?php

namespace App\Enums;

enum MediaStreamStatus: string
{
    case Pending = 'pending';
    case Live = 'live';
    case Ended = 'ended';
    case Failed = 'failed';

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
