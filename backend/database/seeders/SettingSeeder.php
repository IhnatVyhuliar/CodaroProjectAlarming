<?php

namespace Database\Seeders;

use App\Enums\QueueSortMode;
use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        // Only sets defaults — never overwrites a mode a hyperadmin already chose.
        if (Setting::query()->find(Setting::QUEUE_SORT_MODE) === null) {
            Setting::setQueueSortMode(QueueSortMode::Fifo);
        }

        foreach ([
            'retention.location_pings_days' => 30,
            'queue.auto_assign_enabled' => true,
        ] as $key => $value) {
            if (Setting::query()->find($key) === null) {
                Setting::put($key, $value);
            }
        }
    }
}
