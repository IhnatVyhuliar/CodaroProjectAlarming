<?php

use App\Enums\LocationMode;
use App\Enums\ReportPriority;
use App\Enums\ReportStatus;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // IF NOT EXISTS: `migrate:fresh` (used by RefreshDatabase in every fresh test
        // process) wipes tables via `db:wipe`, which does not drop standalone
        // sequences — without this guard, the second ever run of the suite would
        // fail here with "relation already exists".
        DB::statement('CREATE SEQUENCE IF NOT EXISTS reports_reference_seq');

        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 32)->unique();

            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()
                ->constrained('categories')->nullOnDelete();

            $table->string('name');
            $table->text('description')->nullable();

            $table->string('status', 32)->default(ReportStatus::New->value);

            // Chosen by the client when filing (CLAUDE.md section 7, mode 2).
            $table->string('priority', 32)->default(ReportPriority::Medium->value);
            // Generated, never written by the application: guarantees that ordering
            // by client priority is numeric, not alphabetical.
            $table->smallInteger('priority_weight')->storedAs(
                "CASE priority WHEN 'low' THEN 1 WHEN 'medium' THEN 2 ".
                "WHEN 'high' THEN 3 WHEN 'critical' THEN 4 ELSE 0 END"
            );

            // Filled asynchronously by PriorityScorer (CLAUDE.md section 7, mode 3).
            $table->decimal('ai_priority', 6, 2)->nullable();
            $table->timestamp('ai_priority_calculated_at')->nullable();
            $table->jsonb('ai_priority_reason')->nullable();

            $table->string('location_mode', 32)->default(LocationMode::OneTime->value);
            $table->decimal('location_lat', 10, 7)->nullable();
            $table->decimal('location_lng', 10, 7)->nullable();
            $table->decimal('location_accuracy', 8, 2)->nullable();
            $table->string('location_address')->nullable();
            $table->timestamp('location_updated_at')->nullable();

            $table->foreignId('assigned_admin_id')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_staff_id')->nullable()
                ->constrained('users')->nullOnDelete();

            // Queue position. Separate from created_at so an edit never reshuffles FIFO.
            $table->timestamp('queued_at')->nullable();
            $table->timestamp('assigned_at')->nullable();
            // First time an operator acted — the hyperadmin's response-time metric.
            $table->timestamp('first_response_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by_user_id')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->string('close_reason')->nullable();

            $table->jsonb('metadata')->default(new Expression("'{}'::jsonb"));
            $table->timestamps();
            $table->softDeletes();

            $table->index(['client_id', 'created_at']);
            $table->index(['assigned_admin_id', 'status']);
            $table->index(['assigned_staff_id', 'status']);
            $table->index(['category_id', 'status']);
            $table->index('closed_at');
        });

        DB::statement(
            'ALTER TABLE reports ALTER COLUMN reference SET DEFAULT '.
            "'ZG-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('reports_reference_seq')::text, 6, '0')"
        );

        CheckConstraint::enum('reports', 'status', ReportStatus::values());
        CheckConstraint::enum('reports', 'priority', ReportPriority::values());
        CheckConstraint::enum('reports', 'location_mode', LocationMode::values());

        // The global queue is `reports WHERE status = 'new'`. One partial index
        // per sort mode from CLAUDE.md section 7 — each covers its ORDER BY exactly.
        DB::statement(
            'CREATE INDEX reports_queue_fifo_idx ON reports (queued_at, id) '.
            "WHERE status = 'new' AND deleted_at IS NULL"
        );
        DB::statement(
            'CREATE INDEX reports_queue_client_priority_idx ON reports (priority_weight DESC, queued_at, id) '.
            "WHERE status = 'new' AND deleted_at IS NULL"
        );
        DB::statement(
            'CREATE INDEX reports_queue_ai_priority_idx ON reports (ai_priority DESC NULLS LAST, queued_at, id) '.
            "WHERE status = 'new' AND deleted_at IS NULL"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
        DB::statement('DROP SEQUENCE IF EXISTS reports_reference_seq');
    }
};
