<?php

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
        // Shared by all three audit tables. DELETE is deliberately still
        // allowed so GDPR erasure remains possible; only rewriting is blocked.
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION forbid_row_update() RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'Table % is append-only and cannot be updated', TG_TABLE_NAME;
            END;
            $$ LANGUAGE plpgsql;
        SQL);

        Schema::create('report_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->foreignId('changed_by_user_id')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->string('from_status', 32)->nullable();
            $table->string('to_status', 32);
            $table->text('note')->nullable();
            // Why the change happened: which event, which request completed, etc.
            $table->jsonb('context')->default(new Expression("'{}'::jsonb"));
            $table->timestamp('created_at')->useCurrent();

            $table->index(['report_id', 'created_at']);
            $table->index(['changed_by_user_id', 'created_at']);
        });

        CheckConstraint::enum('report_status_histories', 'from_status', ReportStatus::values(), nullable: true);
        CheckConstraint::enum('report_status_histories', 'to_status', ReportStatus::values());

        DB::statement(
            'CREATE TRIGGER report_status_histories_append_only '.
            'BEFORE UPDATE ON report_status_histories '.
            'FOR EACH ROW EXECUTE FUNCTION forbid_row_update()'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('report_status_histories');
        DB::statement('DROP FUNCTION IF EXISTS forbid_row_update()');
    }
};
