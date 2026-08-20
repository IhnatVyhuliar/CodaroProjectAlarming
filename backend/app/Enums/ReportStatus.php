<?php

namespace App\Enums;

enum ReportStatus: string
{
    case New = 'new';
    case Assigned = 'assigned';
    case InProgress = 'in_progress';
    case Waiting = 'waiting';
    case Closed = 'closed';
    case Rejected = 'rejected';

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** Statuses a report can sit in while still needing work. @return array<int, string> */
    public static function openStatuses(): array
    {
        return [
            self::New->value,
            self::Assigned->value,
            self::InProgress->value,
            self::Waiting->value,
        ];
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::Closed, self::Rejected], true);
    }

    /** The state machine from CLAUDE.md section 6. @return array<int, self> */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::New => [self::Assigned, self::Rejected],
            self::Assigned => [self::InProgress, self::Waiting, self::Closed, self::Rejected],
            self::InProgress => [self::Waiting, self::Closed],
            self::Waiting => [self::InProgress, self::Closed],
            self::Closed, self::Rejected => [],
        };
    }

    public function canTransitionTo(self $to): bool
    {
        return in_array($to, $this->allowedTransitions(), true);
    }
}
