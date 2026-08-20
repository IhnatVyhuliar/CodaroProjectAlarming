<?php

use App\Enums\AdminStatus;
use App\Enums\UserRole;
use App\Support\Database\CheckConstraint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 32)->nullable()->after('email');
            $table->string('role', 32)->default(UserRole::Client->value)->after('phone');
            // Only meaningful for role=admin: auto-assign from the queue, or pick manually.
            $table->string('admin_status', 32)->nullable()->after('role');
            $table->foreignId('staff_role_id')->nullable()->after('admin_status')
                ->constrained('staff_roles')->nullOnDelete();
            $table->boolean('is_active')->default(true)->after('staff_role_id');
            $table->string('locale', 8)->default('pl')->after('is_active');
            $table->timestamp('last_seen_at')->nullable()->after('locale');
            $table->jsonb('metadata')->default(new Expression("'{}'::jsonb"))->after('last_seen_at');
            $table->softDeletes();

            $table->index(['role', 'is_active']);
            $table->index(['role', 'admin_status']);
        });

        CheckConstraint::enum('users', 'role', UserRole::values());
        CheckConstraint::enum('users', 'admin_status', AdminStatus::values(), nullable: true);
    }

    public function down(): void
    {
        CheckConstraint::drop('users', 'role');
        CheckConstraint::drop('users', 'admin_status');

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['staff_role_id']);
            $table->dropIndex(['role', 'is_active']);
            $table->dropIndex(['role', 'admin_status']);
            $table->dropSoftDeletes();
            $table->dropColumn([
                'phone', 'role', 'admin_status', 'staff_role_id',
                'is_active', 'locale', 'last_seen_at', 'metadata',
            ]);
        });
    }
};
