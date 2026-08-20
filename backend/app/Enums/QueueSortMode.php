<?php

namespace App\Enums;

enum QueueSortMode: string
{
    case Fifo = 'fifo';
    case ClientPriority = 'client_priority';
    case AiPriority = 'ai_priority';

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
