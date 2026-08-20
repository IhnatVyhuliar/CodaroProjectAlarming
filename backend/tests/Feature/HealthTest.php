<?php

test('health endpoint responds ok', function () {
    $response = $this->getJson('/api/v1/health');

    $response->assertOk()->assertJson(['status' => 'ok']);
});
