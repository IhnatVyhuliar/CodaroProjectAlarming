<?php

use App\Enums\MediaStreamKind;
use App\Enums\MediaStreamStatus;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A live camera/microphone session (CLAUDE.md section 9.3). room_name is
     * the LiveKit room the admin or responder joins as a viewer.
     */
    public function up(): void
    {
        Schema::create('media_stream_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->foreignId('started_by_user_id')->nullable()
                ->constrained('users')->nullOnDelete();

            $table->string('kind', 32);
            // Leaves room for the MVP pseudo-streaming path from section 9.3.
            $table->string('provider', 32)->default('livekit');
            $table->string('room_name', 128)->unique();
            $table->string('status', 32)->default(MediaStreamStatus::Pending->value);

            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();

            $table->string('recording_disk', 32)->nullable();
            $table->string('recording_path')->nullable();
            $table->string('recording_url')->nullable();

            $table->jsonb('metadata')->default(new Expression("'{}'::jsonb"));
            $table->timestamps();

            $table->index(['report_id', 'status']);
            $table->index(['status', 'started_at']);
        });

        CheckConstraint::enum('media_stream_sessions', 'kind', MediaStreamKind::values());
        CheckConstraint::enum('media_stream_sessions', 'status', MediaStreamStatus::values());
    }

    public function down(): void
    {
        CheckConstraint::drop('media_stream_sessions', 'kind');
        CheckConstraint::drop('media_stream_sessions', 'status');
        Schema::dropIfExists('media_stream_sessions');
    }
};
