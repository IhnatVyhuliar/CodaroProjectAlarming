<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The location trail. High volume (one row every 5-15s per live report) and
     * GDPR-sensitive: section 18 requires a retention policy, which is why
     * recorded_at is indexed on its own.
     */
    public function up(): void
    {
        Schema::create('location_pings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            // Null for a one-time share, set for every ping inside a session.
            $table->foreignId('location_stream_id')->nullable()
                ->constrained('location_streams')->cascadeOnDelete();

            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            $table->decimal('accuracy', 8, 2)->nullable();
            $table->decimal('altitude', 8, 2)->nullable();
            $table->decimal('speed', 8, 2)->nullable();
            $table->decimal('heading', 6, 2)->nullable();
            $table->unsignedTinyInteger('battery_level')->nullable();
            $table->boolean('is_moving')->nullable();

            // When the device took the fix — not when the batch reached us.
            $table->timestamp('recorded_at')->useCurrent();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['report_id', 'recorded_at']);
            $table->index(['location_stream_id', 'recorded_at']);
            $table->index('recorded_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('location_pings');
    }
};
