<?php

namespace App\Enums;

enum MediaStreamKind: string
{
    case Camera = 'camera';
    case Audio = 'audio';
    case Screen = 'screen';

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
