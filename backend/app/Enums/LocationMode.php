<?php

namespace App\Enums;

enum LocationMode: string
{
    case OneTime = 'one_time';
    case Streaming = 'streaming';

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
