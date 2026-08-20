<?php

use App\Enums\DevicePlatform;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Expo push targets, one row per device. Replaces the single
     * users.push_token from CLAUDE.md section 4: a user may carry a phone and a
     * tablet, and a token Expo reports as unregistered must be disabled on its own.
     */
    public function up(): void
    {
        Schema::create('device_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('token')->unique();
            $table->string('platform', 16);
            $table->string('device_name')->nullable();
            $table->string('app_version', 32)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('disabled_at')->nullable();
            $table->string('disabled_reason', 64)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
        });

        CheckConstraint::enum('device_tokens', 'platform', DevicePlatform::values());
    }

    public function down(): void
    {
        CheckConstraint::drop('device_tokens', 'platform');
        Schema::dropIfExists('device_tokens');
    }
};
