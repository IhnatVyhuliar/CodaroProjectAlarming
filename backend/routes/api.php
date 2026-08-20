<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::prefix('v1')->group(function () {
    Route::middleware('auth:sanctum')->group(function () {
        // Domain routes (reports, requests, categories, queue, ...) — future work.
    });
});
