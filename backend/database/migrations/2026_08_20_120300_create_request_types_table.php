<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The sub-task vocabulary: connection, repair, meeting, money,
     * service_arrival — and whatever a future niche needs. CLAUDE.md models
     * this as an enum; a table keeps it editable without a deploy.
     */
    public function up(): void
    {
        Schema::create('request_types', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('staff_role_id')->nullable()
                ->constrained('staff_roles')->nullOnDelete();
            // Drives conditional validation when a dispatcher attaches this request.
            $table->boolean('requires_staff')->default(false);
            $table->boolean('requires_amount')->default(false);
            $table->boolean('requires_scheduled_at')->default(false);
            $table->string('icon', 64)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->jsonb('metadata')->default(new Expression("'{}'::jsonb"));
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('request_types');
    }
};
