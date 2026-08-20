<?php

namespace App\Enums;

enum AdminStatus: string
{
    case Active = 'active';
    case Manual = 'manual';

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
