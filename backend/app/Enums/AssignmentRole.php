<?php

namespace App\Enums;

enum AssignmentRole: string
{
    case Admin = 'admin';
    case Staff = 'staff';

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
