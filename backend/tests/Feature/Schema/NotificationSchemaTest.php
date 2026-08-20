<?php

use App\Enums\DevicePlatform;
use App\Enums\NotificationDeliveryStatus;
use App\Models\DeviceToken;
use App\Models\NotificationDelivery;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\DB;

it('registers several devices for one user', function () {
    $user = User::factory()->client()->create();

    DeviceToken::factory()->create(['user_id' => $user->id, 'platform' => DevicePlatform::Ios]);
    DeviceToken::factory()->create(['user_id' => $user->id, 'platform' => DevicePlatform::Android]);

    expect($user->deviceTokens)->toHaveCount(2);
});

it('rejects the same expo token twice', function () {
    DeviceToken::factory()->create(['token' => 'ExponentPushToken[abc]']);
    DeviceToken::factory()->create(['token' => 'ExponentPushToken[abc]']);
})->throws(QueryException::class);

it('disables a token that expo reported as unregistered', function () {
    $token = DeviceToken::factory()->create();

    $token->disable('DeviceNotRegistered');

    expect($token->fresh()->is_active)->toBeFalse();
    expect($token->fresh()->disabled_reason)->toBe('DeviceNotRegistered');
    expect(DeviceToken::query()->active()->count())->toBe(0);
});

it('removes device tokens when the user is hard deleted', function () {
    $user = User::factory()->client()->create();
    DeviceToken::factory()->count(2)->create(['user_id' => $user->id]);

    $user->forceDelete();

    expect(DeviceToken::query()->count())->toBe(0);
});

it('keeps device tokens when the user is only soft deleted', function () {
    $user = User::factory()->client()->create();
    DeviceToken::factory()->create(['user_id' => $user->id]);

    $user->delete();

    expect(DeviceToken::query()->count())->toBe(1);
});

it('has the standard laravel notifications table', function () {
    $user = User::factory()->client()->create();

    $user->notify(new class extends Notification
    {
        public function via($notifiable): array
        {
            return ['database'];
        }

        public function toArray($notifiable): array
        {
            return ['report_id' => 1, 'message' => 'Status zgłoszenia zmieniony'];
        }
    });

    expect($user->notifications()->count())->toBe(1);
    expect($user->unreadNotifications()->count())->toBe(1);
    expect($user->notifications()->first()->data['message'])
        ->toBe('Status zgłoszenia zmieniony');
});

it('records a push delivery with its expo ticket', function () {
    $user = User::factory()->client()->create();
    $token = DeviceToken::factory()->create(['user_id' => $user->id]);

    $delivery = NotificationDelivery::create([
        'user_id' => $user->id,
        'device_token_id' => $token->id,
        'channel' => 'expo',
        'status' => NotificationDeliveryStatus::Sent,
        'provider_ticket_id' => 'XXXXXXXX-XXXX-XXXX',
        'payload' => ['title' => 'Nowe zgłoszenie'],
        'sent_at' => now(),
    ]);

    expect($delivery->status)->toBe(NotificationDeliveryStatus::Sent);
    expect($delivery->deviceToken->id)->toBe($token->id);
    expect(NotificationDelivery::query()->pendingReceipt()->count())->toBe(1);
});

it('stops counting a delivery as pending once it settles', function () {
    $user = User::factory()->client()->create();

    NotificationDelivery::create([
        'user_id' => $user->id,
        'channel' => 'expo',
        'status' => NotificationDeliveryStatus::Delivered,
        'provider_ticket_id' => 'ticket-1',
        'settled_at' => now(),
    ]);

    expect(NotificationDelivery::query()->pendingReceipt()->count())->toBe(0);
});

it('refuses unknown delivery statuses and platforms', function (string $table, string $column, string $value) {
    $user = User::factory()->client()->create();
    $id = $table === 'device_tokens'
        ? DeviceToken::factory()->create(['user_id' => $user->id])->id
        : NotificationDelivery::create([
            'user_id' => $user->id,
            'channel' => 'expo',
            'status' => NotificationDeliveryStatus::Queued,
        ])->id;

    expect(fn () => DB::table($table)->where('id', $id)->update([$column => $value]))
        ->toThrow(QueryException::class);
})->with([
    ['device_tokens', 'platform', 'blackberry'],
    ['notification_deliveries', 'status', 'maybe'],
]);
