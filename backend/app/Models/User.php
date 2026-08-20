<?php

namespace App\Models;

use App\Enums\AdminStatus;
use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'phone', 'password', 'role', 'admin_status', 'staff_role_id', 'is_active', 'locale', 'metadata'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'admin_status' => AdminStatus::class,
            'is_active' => 'boolean',
            'metadata' => 'array',
        ];
    }

    /** @return BelongsTo<StaffRole, $this> */
    public function staffRole(): BelongsTo
    {
        return $this->belongsTo(StaffRole::class);
    }

    /** Reports this user filed as a client. @return HasMany<Report, $this> */
    public function reports(): HasMany
    {
        return $this->hasMany(Report::class, 'client_id');
    }

    /** @return HasMany<DeviceToken, $this> */
    public function deviceTokens(): HasMany
    {
        return $this->hasMany(DeviceToken::class);
    }

    public function isClient(): bool
    {
        return $this->role === UserRole::Client;
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === UserRole::SuperAdmin;
    }

    public function isStaff(): bool
    {
        return $this->role === UserRole::Staff;
    }

    /** @param  Builder<$this>  $query */
    public function scopeRole(Builder $query, UserRole $role): void
    {
        $query->where('role', $role);
    }
}
