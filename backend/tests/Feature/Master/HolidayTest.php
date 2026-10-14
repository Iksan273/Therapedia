<?php

namespace Tests\Feature\Master;

use App\Models\Holiday;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

/** M3: hari libur (satu tanggal, rentang, duplikat, cabang, affected_sessions). */
class HolidayTest extends TestCase
{
    use AuthFixtures, OrganizationFixtures, RefreshDatabase;

    private User $master;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
        $this->master = $this->makeStaff('master');
    }

    public function test_read_for_any_staff_write_needs_holidays_module(): void
    {
        $this->getJson('/api/v1/holidays')->assertStatus(401);
        $this->actAs($this->makeStaff('therapist'))->getJson('/api/v1/holidays')->assertOk();
        $this->actAs($this->makeStaff('therapist'))->postJson('/api/v1/holidays', ['name' => 'X', 'holiday_date' => '2026-12-25'])->assertStatus(403);
        $this->actAs($this->makeStaff('admin_schedule'))->postJson('/api/v1/holidays', ['name' => 'Natal', 'holiday_date' => '2026-12-25'])->assertCreated();
    }

    public function test_single_date_returns_a_list_with_one_row(): void
    {
        $res = $this->actAs($this->master)->postJson('/api/v1/holidays', ['name' => 'Natal', 'holiday_date' => '2026-12-25'])->assertCreated();

        $this->assertCount(1, $res->json('data'));
        $res->assertJsonPath('data.0.holiday_date', '2026-12-25')->assertJsonPath('data.0.branch_id', null)->assertJsonPath('data.0.affected_sessions', 0);
    }

    public function test_range_is_split_into_one_row_per_date(): void
    {
        $res = $this->actAs($this->master)->postJson('/api/v1/holidays', [
            'name' => 'Cuti Bersama', 'start_date' => '2026-12-24', 'end_date' => '2026-12-27', 'branch_id' => $this->branchId('EAST'),
        ])->assertCreated();

        $this->assertSame(['2026-12-24', '2026-12-25', '2026-12-26', '2026-12-27'], collect($res->json('data'))->pluck('holiday_date')->all());
        $this->assertSame(4, Holiday::withoutGlobalScopes()->where('branch_id', $this->branchId('EAST'))->count());
    }

    public function test_range_validation(): void
    {
        $this->actAs($this->master);

        $this->postJson('/api/v1/holidays', ['name' => 'X', 'start_date' => '2026-12-27', 'end_date' => '2026-12-24'])->assertStatus(422)->assertJsonStructure(['errors' => ['end_date']]);
        $this->postJson('/api/v1/holidays', ['name' => 'X', 'start_date' => '2026-01-01', 'end_date' => '2027-01-02'])->assertStatus(422)
            ->assertJsonPath('errors.end_date.0', 'Rentang hari libur maksimal 366 hari.');
        $this->postJson('/api/v1/holidays', ['name' => 'X', 'holiday_date' => '2026-12-25', 'start_date' => '2026-12-24', 'end_date' => '2026-12-26'])->assertStatus(422);
        $this->postJson('/api/v1/holidays', ['name' => 'X'])->assertStatus(422)->assertJsonStructure(['errors' => ['holiday_date']]);
        $this->assertSame(0, Holiday::withoutGlobalScopes()->count());
    }

    public function test_duplicate_date_in_same_branch_is_rejected_and_nothing_is_saved(): void
    {
        $this->actAs($this->master);
        $east = $this->branchId('EAST');

        $this->postJson('/api/v1/holidays', ['name' => 'A', 'holiday_date' => '2026-12-25', 'branch_id' => $east])->assertCreated();
        $this->postJson('/api/v1/holidays', ['name' => 'B', 'start_date' => '2026-12-24', 'end_date' => '2026-12-26', 'branch_id' => $east])
            ->assertStatus(422)->assertJsonPath('errors.holiday_date.0', 'Hari libur sudah ada untuk cabang ini pada: 2026-12-25.');
        $this->assertSame(1, Holiday::withoutGlobalScopes()->count(), 'rentang gagal total, tidak ada baris parsial');

        // cabang lain / semua cabang boleh di tanggal yang sama
        $this->postJson('/api/v1/holidays', ['name' => 'C', 'holiday_date' => '2026-12-25', 'branch_id' => $this->branchId('WEST')])->assertCreated();
        $this->postJson('/api/v1/holidays', ['name' => 'D', 'holiday_date' => '2026-12-25'])->assertCreated();
        $this->postJson('/api/v1/holidays', ['name' => 'E', 'holiday_date' => '2026-12-25'])->assertStatus(422);
    }

    public function test_branch_staff_manage_own_branch_and_all_branches_but_not_other_branches(): void
    {
        $staff = $this->actAs($this->makeStaff('admin_schedule'));
        $west = $this->branchId('WEST');

        $staff->postJson('/api/v1/holidays', ['name' => 'Lokal', 'holiday_date' => '2026-12-25', 'branch_id' => $this->branchId('EAST')])->assertCreated();
        $staff->postJson('/api/v1/holidays', ['name' => 'Semua', 'holiday_date' => '2026-12-26'])->assertCreated();
        $staff->postJson('/api/v1/holidays', ['name' => 'Lain', 'holiday_date' => '2026-12-27', 'branch_id' => $west])->assertStatus(403);

        $other = Holiday::query()->withoutGlobalScopes()->create(['name' => 'Barat', 'holiday_date' => '2026-12-28', 'branch_id' => $west]);
        $staff->patchJson("/api/v1/holidays/{$other->id}", ['name' => 'Curi'])->assertNotFound();
        $staff->deleteJson("/api/v1/holidays/{$other->id}")->assertNotFound();

        $dates = collect($staff->getJson('/api/v1/holidays')->json('data'))->pluck('holiday_date')->all();
        $this->assertSame(['2026-12-25', '2026-12-26'], $dates, 'libur cabang lain tidak terlihat, libur semua cabang terlihat');
    }

    public function test_list_filters_by_year_and_branch_for_master(): void
    {
        $this->actAs($this->master);
        $east = $this->branchId('EAST');

        $this->postJson('/api/v1/holidays', ['name' => 'Semua 2026', 'holiday_date' => '2026-12-25'])->assertCreated();
        $this->postJson('/api/v1/holidays', ['name' => 'East 2027', 'holiday_date' => '2027-01-01', 'branch_id' => $east])->assertCreated();
        $this->postJson('/api/v1/holidays', ['name' => 'West 2027', 'holiday_date' => '2027-01-02', 'branch_id' => $this->branchId('WEST')])->assertCreated();

        $this->assertCount(3, $this->getJson('/api/v1/holidays')->json('data'));
        $this->assertCount(1, $this->getJson('/api/v1/holidays?year=2026')->json('data'));
        $this->assertSame(['Semua 2026', 'East 2027'], collect($this->getJson("/api/v1/holidays?branch_id={$east}")->json('data'))->pluck('name')->all());
    }

    public function test_update_and_delete(): void
    {
        $this->actAs($this->master);
        $id = $this->postJson('/api/v1/holidays', ['name' => 'Natal', 'holiday_date' => '2026-12-25'])->json('data.0.id');
        $this->postJson('/api/v1/holidays', ['name' => 'Tahun Baru', 'holiday_date' => '2027-01-01'])->assertCreated();

        $this->patchJson("/api/v1/holidays/{$id}", ['name' => 'Hari Natal'])->assertOk()->assertJsonPath('data.name', 'Hari Natal')->assertJsonPath('data.holiday_date', '2026-12-25');
        $this->putJson("/api/v1/holidays/{$id}", ['holiday_date' => '2027-01-01'])->assertStatus(422)->assertJsonStructure(['errors' => ['holiday_date']]);
        $this->patchJson("/api/v1/holidays/{$id}", ['holiday_date' => '2026-12-26'])->assertOk()->assertJsonPath('data.holiday_date', '2026-12-26');

        $this->deleteJson("/api/v1/holidays/{$id}")->assertNoContent();
        $this->getJson("/api/v1/holidays/{$id}")->assertNotFound();
    }

    public function test_affected_sessions_counts_only_open_sessions_on_that_date_and_branch(): void
    {
        $client = $this->makeClient();
        $insert = fn (string $status, string $date, ?int $branch = null) => DB::table('schedules')->insert([
            'branch_id' => $branch ?? $client->branch_id, 'client_id' => $client->id, 'therapist_id' => $this->master->id,
            'session_date' => $date, 'start_time' => '09:00', 'end_time' => '10:00', 'status' => $status, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $insert('scheduled', '2026-12-25');
        $insert('reschedule_pending', '2026-12-25');
        $insert('completed', '2026-12-25');
        $insert('scheduled', '2026-12-26');
        $insert('scheduled', '2026-12-25', $this->branchId('WEST'));

        $this->actAs($this->master);
        $this->postJson('/api/v1/holidays', ['name' => 'East', 'holiday_date' => '2026-12-25', 'branch_id' => $this->branchId('EAST')])
            ->assertCreated()->assertJsonPath('data.0.affected_sessions', 2);
        $this->postJson('/api/v1/holidays', ['name' => 'Semua', 'start_date' => '2026-12-26', 'end_date' => '2026-12-26'])
            ->assertCreated()->assertJsonPath('data.0.affected_sessions', 1);

        $this->assertSame(5, DB::table('schedules')->where('status', '!=', 'cancelled')->count(), 'sesi tidak diubah di Sprint 1');
    }
}
