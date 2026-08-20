<?php

namespace App\Enums;

enum AttachmentType: string
{
    case Photo = 'photo';
    case File = 'file';
    case Audio = 'audio';
    case Video = 'video';

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
