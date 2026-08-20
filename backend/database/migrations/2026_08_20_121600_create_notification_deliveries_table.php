<?php

use App\Enums\NotificationDeliveryStatus;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One row per outbound delivery attempt. Expo returns a ticket at send time
     * and a receipt minutes later; without this table a silently dropped push is
     * invisible, and there is nothing to drive token cleanup from.
     */
    public function up(): void
    {
        Schema::create('notification_deliveries', function (Blueprint $table) {
            $table->id();
            $table->uuid('notification_id')->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('device_token_id')->nullable()
                ->constrained('device_tokens')->nullOnDelete();

            // expo | broadcast | database
            $table->string('channel', 32);
            $table->string('status', 32)->default(NotificationDeliveryStatus::Queued->value);
            $table->string('provider_ticket_id')->nullable();
            $table->string('provider_receipt_id')->nullable();
            $table->text('error')->nullable();
            $table->jsonb('payload')->default(new Expression("'{}'::jsonb"));

            $table->timestamp('sent_at')->nullable();
            // Set once the provider receipt has been read back.
            $table->timestamp('settled_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['status', 'created_at']);
            $table->index('notification_id');
        });

        CheckConstraint::enum('notification_deliveries', 'status', NotificationDeliveryStatus::values());
    }

    public function down(): void
    {
        CheckConstraint::drop('notification_deliveries', 'status');
        Schema::dropIfExists('notification_deliveries');
    }
};
