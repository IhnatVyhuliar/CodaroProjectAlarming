<?php

use Illuminate\Support\Facades\DB;

it('runs tests against postgres, not sqlite', function () {
    expect(DB::connection()->getDriverName())->toBe('pgsql');
    expect(DB::connection()->getDatabaseName())->toStartWith('app_testing');
});

it('has a postgres 16 or newer server', function () {
    $version = DB::selectOne('SHOW server_version')->server_version;

    expect((int) $version)->toBeGreaterThanOrEqual(16);
});

it('applied the migrations into the test database', function () {
    expect(DB::getSchemaBuilder()->hasTable('users'))->toBeTrue();
});
