<?php

use App\Enums\AssignmentRole;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Who held this report and when. reports.assigned_admin_id /
     * assigned_staff_id remain the fast "who has it now" pointers; this table
     * is the history behind them, and the room to send more than one responder.
     */
    public function up(): void
    {
        Schema::create('report_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role', 32);
            $table->foreignId('assigned_by_user_id')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamp('unassigned_at')->nullable();
            $table->string('unassign_reason')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['report_id', 'assigned_at']);
            $table->index(['user_id', 'assigned_at']);
        });

        CheckConstraint::enum('report_assignments', 'role', AssignmentRole::values());

        DB::statement(
            'CREATE UNIQUE INDEX report_assignments_active_unique '.
            'ON report_assignments (report_id, user_id) WHERE unassigned_at IS NULL'
        );

        DB::statement(
            'CREATE TRIGGER report_assignments_append_only '.
            'BEFORE UPDATE ON report_assignments '.
            'FOR EACH ROW EXECUTE FUNCTION forbid_row_update()'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('report_assignments');
    }
};
