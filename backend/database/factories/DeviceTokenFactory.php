<?php

namespace Database\Factories;

use App\Enums\DevicePlatform;
use App\Models\DeviceToken;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<DeviceToken> */
class DeviceTokenFactory extends Factory
{
    protected $model = DeviceToken::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->client(),
            'token' => 'ExponentPushToken['.Str::random(22).']',
            'platform' => DevicePlatform::Android,
            'device_name' => $this->faker->word().' '.$this->faker->numberBetween(10, 15),
            'app_version' => '1.0.0',
            'is_active' => true,
            'last_used_at' => now(),
        ];
    }

    public function disabled(): static
    {
        return $this->state(fn () => [
            'is_active' => false,
            'disabled_at' => now(),
            'disabled_reason' => 'DeviceNotRegistered',
        ]);
    }
}
