<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One "live tracking" session. The client starts it and can stop it with a
     * single button (CLAUDE.md section 9.2); ended_at is what the stop writes.
     */
    public function up(): void
    {
        Schema::create('location_streams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->foreignId('started_by_user_id')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('ended_at')->nullable();
            $table->timestamp('last_ping_at')->nullable();
            $table->unsignedInteger('ping_count')->default(0);
            $table->string('stop_reason', 64)->nullable();
            $table->jsonb('metadata')->default(new Expression("'{}'::jsonb"));
            $table->timestamps();

            $table->index(['report_id', 'started_at']);
        });

        // A report cannot be transmitting from two sessions at once.
        DB::statement(
            'CREATE UNIQUE INDEX location_streams_one_live_per_report '.
            'ON location_streams (report_id) WHERE ended_at IS NULL'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('location_streams');
    }
};
