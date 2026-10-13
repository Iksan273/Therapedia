<?php

namespace Tests\Feature\Foundation;

use App\Exceptions\ApiException;
use App\Models\Client;
use App\Models\User;
use App\Support\BranchContext;
use App\Support\Paginate;
use App\Support\PrefixSearch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Helper fondasi M0 yang murni (tanpa query ke database). */
class SupportHelpersTest extends TestCase
{
    // ---- Versioned (optimistic lock)

    public function test_matching_version_passes(): void
    {
        $client = (new Client)->setAttribute('version', 3);
        $client->assertVersion(3);
        $client->assertVersion('3'); // JSON/FE bisa mengirim string
        $this->addToAssertionCount(2);
    }

    public function test_stale_version_throws_409(): void
    {
        $client = (new Client)->setAttribute('version', 3);

        try {
            $client->assertVersion(2);
            $this->fail('Harus melempar ApiException');
        } catch (ApiException $e) {
            $this->assertSame(409, $e->status);
            $this->assertSame('version_conflict', $e->errorCode);
        }
    }

    public function test_missing_version_throws_422_on_version_field(): void
    {
        $client = (new Client)->setAttribute('version', 1);

        foreach ([null, '', 'abc'] as $bad) {
            try {
                $client->assertVersion($bad);
                $this->fail('Harus melempar ApiException');
            } catch (ApiException $e) {
                $this->assertSame(422, $e->status);
                $this->assertArrayHasKey('version', $e->errors);
            }
        }
    }

    // ---- Paginate

    public function test_per_page_defaults_to_10_and_is_clamped(): void
    {
        $this->assertSame(10, Paginate::perPage(Request::create('/x')));
        $this->assertSame(50, Paginate::perPage(Request::create('/x?per_page=999')));
        $this->assertSame(1, Paginate::perPage(Request::create('/x?per_page=0')));
        $this->assertSame(25, Paginate::perPage(Request::create('/x?per_page=25')));
    }

    public function test_page_is_at_least_1(): void
    {
        $this->assertSame(1, Paginate::page(Request::create('/x')));
        $this->assertSame(1, Paginate::page(Request::create('/x?page=-4')));
        $this->assertSame(3, Paginate::page(Request::create('/x?page=3')));
    }

    public function test_cursor_round_trip_and_invalid_cursor(): void
    {
        $this->assertSame('12345', Paginate::decodeCursor(Paginate::encodeCursor(12345)));

        $this->expectException(ApiException::class);
        Paginate::decodeCursor('!!!bukan-cursor!!!');
    }

    // ---- BranchContext

    private function requestFor(?User $user, string $query = ''): Request
    {
        $request = Request::create('/x'.$query);
        $request->setUserResolver(fn () => $user);

        return $request;
    }

    public function test_branch_staff_is_always_locked_to_own_branch(): void
    {
        $staff = (new User)->forceFill(['branch_id' => 2]);

        $this->assertSame(2, BranchContext::resolve($this->requestFor($staff)));
        $this->assertSame(2, BranchContext::resolve($this->requestFor($staff, '?branch_id=3')), 'branch_id request harus diabaikan');
    }

    public function test_master_can_filter_by_branch_or_see_all(): void
    {
        $master = (new User)->forceFill(['branch_id' => null]);

        $this->assertNull(BranchContext::resolve($this->requestFor($master)));
        $this->assertNull(BranchContext::resolve($this->requestFor($master, '?branch_id=all')));
        $this->assertNull(BranchContext::resolve($this->requestFor($master, '?branch_id=')));
        $this->assertSame(3, BranchContext::resolve($this->requestFor($master, '?branch_id=3')));
    }

    public function test_invalid_branch_id_is_422(): void
    {
        $master = (new User)->forceFill(['branch_id' => null]);

        $this->expectException(ApiException::class);
        BranchContext::resolve($this->requestFor($master, '?branch_id=abc'));
    }

    public function test_apply_adds_where_only_when_branch_resolved(): void
    {
        $master = (new User)->forceFill(['branch_id' => null]);

        $all = BranchContext::apply(DB::table('clients'), $this->requestFor($master));
        $one = BranchContext::apply(DB::table('clients'), $this->requestFor($master, '?branch_id=3'));

        $this->assertStringNotContainsString('branch_id', $all->toSql());
        $this->assertStringContainsString('`branch_id` = ?', $one->toSql());
        $this->assertSame([3], $one->getBindings());
    }

    // ---- PrefixSearch

    public function test_prefix_search_matches_start_only_across_columns(): void
    {
        $query = PrefixSearch::apply(DB::table('clients'), '  Ad ', ['child_name', 'parent_name', 'client_code']);

        $this->assertStringContainsString('`child_name` like ? or `parent_name` like ? or `client_code` like ?', $query->toSql());
        $this->assertSame(['Ad%', 'Ad%', 'Ad%'], $query->getBindings());
    }

    public function test_prefix_search_escapes_wildcards_and_skips_empty_term(): void
    {
        $query = PrefixSearch::apply(DB::table('clients'), '50%_x', ['child_name']);
        $this->assertSame(['50\\%\\_x%'], $query->getBindings());

        $this->assertStringNotContainsString('like', PrefixSearch::apply(DB::table('clients'), '   ', ['child_name'])->toSql());
        $this->assertStringNotContainsString('like', PrefixSearch::apply(DB::table('clients'), null, ['child_name'])->toSql());
    }
}
