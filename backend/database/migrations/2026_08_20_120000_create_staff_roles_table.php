<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Stanowisko / służba — the kind of responder that handles a category of
     * report. Data, not an enum, so a new deployment can define its own set of
     * services without a migration.
     */
    public function up(): void
    {
        Schema::create('staff_roles', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('name');
            $table->text('description')->nullable();
            // Służby zewnętrzne (fire brigade, ambulance) vs in-house staff.
            $table->boolean('is_external')->default(false);
            $table->string('color', 16)->nullable();
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
        Schema::dropIfExists('staff_roles');
    }
};
