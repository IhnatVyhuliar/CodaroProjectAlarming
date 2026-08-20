<?php

use App\Enums\ReportPriority;
use App\Enums\ReportStatus;
use App\Enums\RequestStatus;
use App\Enums\UserRole;

it('exposes backing values for every enum', function () {
    expect(UserRole::values())->toBe(['client', 'admin', 'super_admin', 'staff']);
    expect(ReportStatus::values())
        ->toBe(['new', 'assigned', 'in_progress', 'waiting', 'closed', 'rejected']);
    expect(ReportPriority::values())->toBe(['low', 'medium', 'high', 'critical']);
});

it('orders priorities by weight', function () {
    expect(ReportPriority::Low->weight())->toBe(1);
    expect(ReportPriority::Critical->weight())->toBe(4);
    expect(ReportPriority::Critical->weight())
        ->toBeGreaterThan(ReportPriority::High->weight());
});

it('allows the status transitions from CLAUDE.md section 6', function () {
    expect(ReportStatus::New->canTransitionTo(ReportStatus::Assigned))->toBeTrue();
    expect(ReportStatus::New->canTransitionTo(ReportStatus::Rejected))->toBeTrue();
    expect(ReportStatus::Assigned->canTransitionTo(ReportStatus::InProgress))->toBeTrue();
    expect(ReportStatus::InProgress->canTransitionTo(ReportStatus::Waiting))->toBeTrue();
    expect(ReportStatus::Waiting->canTransitionTo(ReportStatus::InProgress))->toBeTrue();
    expect(ReportStatus::InProgress->canTransitionTo(ReportStatus::Closed))->toBeTrue();
});

it('rejects illegal status transitions', function () {
    expect(ReportStatus::New->canTransitionTo(ReportStatus::Closed))->toBeFalse();
    expect(ReportStatus::New->canTransitionTo(ReportStatus::InProgress))->toBeFalse();
    expect(ReportStatus::Closed->canTransitionTo(ReportStatus::New))->toBeFalse();
    expect(ReportStatus::Rejected->canTransitionTo(ReportStatus::Assigned))->toBeFalse();
    expect(ReportStatus::New->canTransitionTo(ReportStatus::New))->toBeFalse();
});

it('knows which statuses are terminal and which are open', function () {
    expect(ReportStatus::Closed->isTerminal())->toBeTrue();
    expect(ReportStatus::Rejected->isTerminal())->toBeTrue();
    expect(ReportStatus::Waiting->isTerminal())->toBeFalse();
    expect(ReportStatus::openStatuses())
        ->toBe(['new', 'assigned', 'in_progress', 'waiting']);
    expect(RequestStatus::Done->isTerminal())->toBeTrue();
    expect(RequestStatus::Cancelled->isTerminal())->toBeTrue();
    expect(RequestStatus::Pending->isTerminal())->toBeFalse();
});
