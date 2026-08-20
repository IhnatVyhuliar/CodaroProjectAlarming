<?php

namespace App\Support\Database;

use Illuminate\Support\Facades\DB;

/**
 * Mirrors a PHP backed enum into a Postgres CHECK constraint, so an illegal
 * lifecycle value cannot reach the table even through raw SQL.
 */
final class CheckConstraint
{
    public static function name(string $table, string $column): string
    {
        return "{$table}_{$column}_check";
    }

    /**
     * @param  array<int, string>  $values
     */
    public static function enum(string $table, string $column, array $values, bool $nullable = false): void
    {
        $quoted = implode(', ', array_map(
            static fn (string $value): string => "'".str_replace("'", "''", $value)."'",
            $values,
        ));

        $expression = "\"{$column}\" IN ({$quoted})";

        if ($nullable) {
            $expression = "\"{$column}\" IS NULL OR {$expression}";
        }

        $name = self::name($table, $column);

        DB::statement("ALTER TABLE \"{$table}\" ADD CONSTRAINT \"{$name}\" CHECK ({$expression})");
    }

    public static function drop(string $table, string $column): void
    {
        $name = self::name($table, $column);

        DB::statement("ALTER TABLE \"{$table}\" DROP CONSTRAINT IF EXISTS \"{$name}\"");
    }
}
