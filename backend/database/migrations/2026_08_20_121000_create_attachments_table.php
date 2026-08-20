<?php

use App\Enums\AttachmentType;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Photos, documents, videos and voice notes (CLAUDE.md section 9.5).
     * Objects live in MinIO; nothing here is publicly reachable — access goes
     * through a signed temporary URL minted after a Policy check (section 18).
     */
    public function up(): void
    {
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
            $table->foreignId('request_id')->nullable()
                ->constrained('requests')->nullOnDelete();
            $table->foreignId('uploaded_by_user_id')->nullable()
                ->constrained('users')->nullOnDelete();

            $table->string('type', 32);
            $table->string('disk', 32)->default('s3');
            $table->string('path');
            $table->string('original_name')->nullable();
            $table->string('mime_type', 128)->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();

            // Audio and video only — lets the player show a duration up front.
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('checksum', 64)->nullable();

            $table->jsonb('metadata')->default(new Expression("'{}'::jsonb"));
            $table->timestamps();
            $table->softDeletes();

            $table->index(['report_id', 'type']);
            $table->index(['report_id', 'created_at']);
            $table->index('request_id');
        });

        CheckConstraint::enum('attachments', 'type', AttachmentType::values());
    }

    public function down(): void
    {
        CheckConstraint::drop('attachments', 'type');
        Schema::dropIfExists('attachments');
    }
};
