<?php

use App\Enums\ReportPriority;
use App\Models\Category;
use App\Models\RequestType;
use App\Models\StaffRole;
use Illuminate\Database\QueryException;

it('creates a category bound to the service that handles it', function () {
    $role = StaffRole::factory()->create(['slug' => 'medical']);
    $category = Category::factory()->create([
        'slug' => 'medical-emergency',
        'name' => 'Nagły wypadek medyczny',
        'staff_role_id' => $role->id,
        'default_priority' => ReportPriority::Critical,
    ]);

    expect($category->staffRole->slug)->toBe('medical');
    expect($category->default_priority)->toBe(ReportPriority::Critical);
    expect($role->categories)->toHaveCount(1);
});

it('rejects duplicate category slugs', function () {
    Category::factory()->create(['slug' => 'fire']);
    Category::factory()->create(['slug' => 'fire']);
})->throws(QueryException::class);

it('nests categories for niches that need subcategories', function () {
    $parent = Category::factory()->create(['slug' => 'technical']);
    $child = Category::factory()->create(['slug' => 'technical-water', 'parent_id' => $parent->id]);

    expect($child->parent->slug)->toBe('technical');
    expect($parent->children->pluck('slug')->all())->toBe(['technical-water']);
});

it('deletes child categories with their parent', function () {
    $parent = Category::factory()->create();
    Category::factory()->create(['parent_id' => $parent->id]);

    $parent->delete();

    expect(Category::query()->count())->toBe(0);
});

it('rejects an unknown default_priority but allows null', function () {
    expect(Category::factory()->create(['default_priority' => null])->default_priority)->toBeNull();

    expect(fn () => DB::table('categories')->insert([
        'slug' => 'bad', 'name' => 'Bad', 'default_priority' => 'apocalyptic',
        'created_at' => now(), 'updated_at' => now(),
    ]))->toThrow(QueryException::class);
});

it('creates the five request types from the spec', function () {
    foreach (['connection', 'repair', 'meeting', 'money', 'service_arrival'] as $slug) {
        RequestType::factory()->create(['slug' => $slug]);
    }

    expect(RequestType::query()->count())->toBe(5);
});

it('flags which request types need extra data', function () {
    $money = RequestType::factory()->create(['slug' => 'money', 'requires_amount' => true]);
    $meeting = RequestType::factory()->create(['slug' => 'meeting', 'requires_scheduled_at' => true]);

    expect($money->requires_amount)->toBeTrue();
    expect($money->requires_scheduled_at)->toBeFalse();
    expect($meeting->requires_scheduled_at)->toBeTrue();
});

it('scopes catalogs to active rows', function () {
    Category::factory()->create(['is_active' => true]);
    Category::factory()->create(['is_active' => false]);
    RequestType::factory()->create(['is_active' => false]);

    expect(Category::query()->active()->count())->toBe(1);
    expect(RequestType::query()->active()->count())->toBe(0);
});
