<?php

use App\Enums\RequestStatus;
use App\Models\Report;
use App\Models\Request as ReportRequest;
use App\Models\RequestType;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('attaches a request to a report', function () {
    $report = Report::factory()->create();
    $type = RequestType::factory()->create(['slug' => 'service_arrival']);

    $request = ReportRequest::factory()->create([
        'report_id' => $report->id,
        'request_type_id' => $type->id,
    ]);

    expect($request->status)->toBe(RequestStatus::Pending);
    expect($request->report->id)->toBe($report->id);
    expect($request->requestType->slug)->toBe('service_arrival');
    expect($report->requests)->toHaveCount(1);
});

it('orders requests by sequence so the admin works through them in order', function () {
    $report = Report::factory()->create();

    ReportRequest::factory()->create(['report_id' => $report->id, 'sequence' => 3, 'title' => 'third']);
    ReportRequest::factory()->create(['report_id' => $report->id, 'sequence' => 1, 'title' => 'first']);
    ReportRequest::factory()->create(['report_id' => $report->id, 'sequence' => 2, 'title' => 'second']);

    expect($report->requests->pluck('title')->all())->toBe(['first', 'second', 'third']);
});

it('knows when a report still has open requests', function () {
    $report = Report::factory()->create();
    ReportRequest::factory()->done()->create(['report_id' => $report->id]);
    $open = ReportRequest::factory()->create(['report_id' => $report->id]);

    expect($report->hasOpenRequests())->toBeTrue();

    $open->update(['status' => RequestStatus::Cancelled]);

    expect($report->fresh()->hasOpenRequests())->toBeFalse();
});

it('treats done and cancelled as closing a request', function () {
    $report = Report::factory()->create();
    ReportRequest::factory()->done()->create(['report_id' => $report->id]);
    ReportRequest::factory()->cancelled()->create(['report_id' => $report->id]);

    expect($report->hasOpenRequests())->toBeFalse();
    expect(ReportRequest::query()->open()->count())->toBe(0);
});

it('deletes requests together with their report', function () {
    $report = Report::factory()->create();
    ReportRequest::factory()->count(3)->create(['report_id' => $report->id]);

    $report->forceDelete();

    expect(ReportRequest::withTrashed()->count())->toBe(0);
});

it('refuses an unknown request status', function () {
    $request = ReportRequest::factory()->create();

    DB::table('requests')->where('id', $request->id)->update(['status' => 'maybe']);
})->throws(QueryException::class);

it('stores money requests with two decimal places', function () {
    $request = ReportRequest::factory()->create(['amount' => 1234.56]);

    expect((float) $request->fresh()->amount)->toBe(1234.56);
});

it('finds the requests assigned to one staff member', function () {
    $staff = User::factory()->staff()->create();
    $other = User::factory()->staff()->create();

    ReportRequest::factory()->count(2)->create(['assigned_staff_id' => $staff->id]);
    ReportRequest::factory()->create(['assigned_staff_id' => $other->id]);

    expect(ReportRequest::query()->forStaff($staff)->count())->toBe(2);
});
