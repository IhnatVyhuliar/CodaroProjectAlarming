<?php

use App\Enums\QueueSortMode;
use App\Models\Setting;
use App\Models\User;

it('falls back to fifo when the sort mode was never set', function () {
    expect(Setting::queueSortMode())->toBe(QueueSortMode::Fifo);
});

it('stores the queue sort mode globally', function () {
    $superAdmin = User::factory()->superAdmin()->create();

    Setting::setQueueSortMode(QueueSortMode::AiPriority, $superAdmin->id);

    expect(Setting::queueSortMode())->toBe(QueueSortMode::AiPriority);
    expect(Setting::query()->find(Setting::QUEUE_SORT_MODE)->updated_by_user_id)
        ->toBe($superAdmin->id);
});

it('keeps exactly one row per key when the mode changes', function () {
    Setting::setQueueSortMode(QueueSortMode::ClientPriority);
    Setting::setQueueSortMode(QueueSortMode::Fifo);

    expect(Setting::query()->where('key', Setting::QUEUE_SORT_MODE)->count())->toBe(1);
    expect(Setting::queueSortMode())->toBe(QueueSortMode::Fifo);
});

it('round-trips arbitrary json values', function () {
    Setting::put('retention.location_pings_days', 30);
    Setting::put('sla.targets', ['critical' => 300, 'high' => 900]);

    expect(Setting::get('retention.location_pings_days'))->toBe(30);
    // toEqual, not toBe: jsonb does not preserve object key order (unlike json),
    // so the order-sensitive === behind toBe cannot pass here on any Postgres install.
    expect(Setting::get('sla.targets'))->toEqual(['critical' => 300, 'high' => 900]);
    expect(Setting::get('missing.key', 'fallback'))->toBe('fallback');
});

it('ignores a stored sort mode that is no longer valid', function () {
    Setting::put(Setting::QUEUE_SORT_MODE, 'by_vibes');

    expect(Setting::queueSortMode())->toBe(QueueSortMode::Fifo);
});

it('attributes a setting to whoever made the most recent write', function () {
    $admin = User::factory()->superAdmin()->create();

    Setting::setQueueSortMode(QueueSortMode::AiPriority, $admin->id);
    expect(Setting::query()->find(Setting::QUEUE_SORT_MODE)->updated_by_user_id)
        ->toBe($admin->id);

    // A system write (seeder, job) has no human author, so attribution resets to
    // null rather than carrying the previous admin forward and misattributing it.
    Setting::setQueueSortMode(QueueSortMode::Fifo);
    expect(Setting::query()->find(Setting::QUEUE_SORT_MODE)->updated_by_user_id)
        ->toBeNull();
});
