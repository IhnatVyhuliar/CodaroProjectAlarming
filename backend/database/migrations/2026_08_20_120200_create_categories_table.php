<?php

use App\Enums\ReportPriority;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()
                ->constrained('categories')->cascadeOnDelete();
            $table->string('slug', 64)->unique();
            $table->string('name');
            $table->text('description')->nullable();
            // Which service handles this category by default (CLAUDE.md section 4).
            $table->foreignId('staff_role_id')->nullable()
                ->constrained('staff_roles')->nullOnDelete();
            // Pre-fills the client's priority picker; the client may override it.
            $table->string('default_priority', 32)->nullable();
            $table->boolean('requires_location')->default(true);
            $table->string('color', 16)->nullable();
            $table->string('icon', 64)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->jsonb('metadata')->default(new Expression("'{}'::jsonb"));
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
            $table->index('parent_id');
        });

        CheckConstraint::enum('categories', 'default_priority', ReportPriority::values(), nullable: true);
    }

    public function down(): void
    {
        CheckConstraint::drop('categories', 'default_priority');
        Schema::dropIfExists('categories');
    }
};
