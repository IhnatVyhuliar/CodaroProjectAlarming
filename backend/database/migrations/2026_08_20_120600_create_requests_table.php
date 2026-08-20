<?php

use App\Enums\RequestStatus;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A sub-task inside a report: call the client back, send a service,
     * schedule a meeting, request funds. The report closes when every
     * request here is terminal.
     */
    public function up(): void
    {
        Schema::create('requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->foreignId('request_type_id')->nullable()
                ->constrained('request_types')->nullOnDelete();
            // Which service should carry this out, when no individual is named yet.
            $table->foreignId('staff_role_id')->nullable()
                ->constrained('staff_roles')->nullOnDelete();
            $table->foreignId('assigned_staff_id')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->foreignId('created_by_user_id')->nullable()
                ->constrained('users')->nullOnDelete();

            $table->string('status', 32)->default(RequestStatus::Pending->value);
            // The order the admin works through them ("po kolei").
            $table->unsignedSmallInteger('sequence')->default(0);

            $table->string('title')->nullable();
            $table->text('description')->nullable();
            // Only for money requests; request_types.requires_amount drives validation.
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('currency', 3)->nullable();
            // Only for meetings / scheduled service arrivals.
            $table->timestamp('scheduled_at')->nullable();

            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('cancel_reason')->nullable();

            $table->jsonb('metadata')->default(new Expression("'{}'::jsonb"));
            $table->timestamps();
            $table->softDeletes();

            $table->index(['report_id', 'sequence']);
            $table->index(['report_id', 'status']);
            $table->index(['assigned_staff_id', 'status']);
            $table->index(['staff_role_id', 'status']);
        });

        CheckConstraint::enum('requests', 'status', RequestStatus::values());
    }

    public function down(): void
    {
        CheckConstraint::drop('requests', 'status');
        Schema::dropIfExists('requests');
    }
};
