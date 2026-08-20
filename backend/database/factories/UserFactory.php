<?php

namespace Database\Factories;

use App\Enums\AdminStatus;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'role' => UserRole::Client,
            'phone' => $this->faker->phoneNumber(),
            'is_active' => true,
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function client(): static
    {
        return $this->state(fn () => ['role' => UserRole::Client]);
    }

    public function admin(): static
    {
        return $this->state(fn () => [
            'role' => UserRole::Admin,
            'admin_status' => AdminStatus::Manual,
        ]);
    }

    /** An admin in call-centre mode: the queue pushes work to them. */
    public function activeAdmin(): static
    {
        return $this->state(fn () => [
            'role' => UserRole::Admin,
            'admin_status' => AdminStatus::Active,
        ]);
    }

    public function superAdmin(): static
    {
        return $this->state(fn () => ['role' => UserRole::SuperAdmin]);
    }

    public function staff(): static
    {
        return $this->state(fn () => ['role' => UserRole::Staff]);
    }
}
