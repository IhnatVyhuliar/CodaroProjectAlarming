<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Field-level edit history: "dodaj załączniki, zmień, ale jest historia
     * zmiany zgłoszeń". Shape: {"field": {"old": …, "new": …}}.
     */
    public function up(): void
    {
        Schema::create('report_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->jsonb('changes');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['report_id', 'created_at']);
        });

        DB::statement(
            'CREATE TRIGGER report_revisions_append_only '.
            'BEFORE UPDATE ON report_revisions '.
            'FOR EACH ROW EXECUTE FUNCTION forbid_row_update()'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('report_revisions');
    }
};
