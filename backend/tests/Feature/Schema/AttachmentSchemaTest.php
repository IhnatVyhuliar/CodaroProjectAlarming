<?php

use App\Enums\AttachmentType;
use App\Models\Attachment;
use App\Models\Report;
use App\Models\Request as ReportRequest;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('stores a photo against a report', function () {
    $report = Report::factory()->create();
    $client = User::factory()->client()->create();

    $attachment = Attachment::factory()->photo()->create([
        'report_id' => $report->id,
        'uploaded_by_user_id' => $client->id,
    ]);

    expect($attachment->type)->toBe(AttachmentType::Photo);
    expect($attachment->disk)->toBe('s3');
    expect($attachment->uploadedBy->id)->toBe($client->id);
    expect($report->attachments)->toHaveCount(1);
});

it('stores a voice note with its duration', function () {
    $report = Report::factory()->create();

    $note = Attachment::factory()->voiceNote()->create(['report_id' => $report->id]);

    expect($note->type)->toBe(AttachmentType::Audio);
    expect($note->mime_type)->toBe('audio/mp4');
    expect($note->duration_seconds)->toBeGreaterThan(0);
    expect($note->isPlayable())->toBeTrue();
    expect($report->voiceNotes()->count())->toBe(1);
});

it('separates voice notes from photos on the same report', function () {
    $report = Report::factory()->create();
    Attachment::factory()->photo()->count(3)->create(['report_id' => $report->id]);
    Attachment::factory()->voiceNote()->count(2)->create(['report_id' => $report->id]);

    expect($report->attachments()->count())->toBe(5);
    expect($report->voiceNotes()->count())->toBe(2);
    expect(Attachment::query()->ofType(AttachmentType::Photo)->count())->toBe(3);
});

it('optionally binds an attachment to one request', function () {
    $report = Report::factory()->create();
    $request = ReportRequest::factory()->create(['report_id' => $report->id]);

    $attachment = Attachment::factory()->photo()->create([
        'report_id' => $report->id,
        'request_id' => $request->id,
    ]);

    expect($attachment->request->id)->toBe($request->id);
});

it('keeps the attachment when its request is deleted', function () {
    $report = Report::factory()->create();
    $request = ReportRequest::factory()->create(['report_id' => $report->id]);
    $attachment = Attachment::factory()->photo()->create([
        'report_id' => $report->id,
        'request_id' => $request->id,
    ]);

    $request->forceDelete();

    expect($attachment->fresh()->request_id)->toBeNull();
    expect($attachment->fresh())->not->toBeNull();
});

it('deletes attachments with their report', function () {
    $report = Report::factory()->create();
    Attachment::factory()->count(2)->create(['report_id' => $report->id]);

    $report->forceDelete();

    expect(Attachment::withTrashed()->count())->toBe(0);
});

it('refuses an unknown attachment type', function () {
    $attachment = Attachment::factory()->photo()->create();

    DB::table('attachments')->where('id', $attachment->id)->update(['type' => 'hologram']);
})->throws(QueryException::class);

it('records size so upload limits can be audited', function () {
    $attachment = Attachment::factory()->photo()->create(['size_bytes' => 4_194_304]);

    expect($attachment->fresh()->size_bytes)->toBe(4_194_304);
});
