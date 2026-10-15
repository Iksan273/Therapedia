<?php

namespace Tests\Feature\Organization;

use App\Models\BranchBankAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

class BranchBankAccountTest extends TestCase
{
    use AuthFixtures, OrganizationFixtures, RefreshDatabase;

    private User $master;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
        $this->master = $this->makeStaff('master');
    }

    private function url(string $code = 'EAST', string $suffix = ''): string
    {
        return '/api/v1/branches/'.$this->branchId($code).'/bank-accounts'.$suffix;
    }

    private function payload(array $override = []): array
    {
        return array_merge(['bank_name' => 'BCA', 'account_number' => '123 456 7890', 'account_holder' => 'PT Therapedia'], $override);
    }

    public function test_create_returns_account_and_branch_list_includes_it_ordered(): void
    {
        $this->actAs($this->master)->postJson($this->url(), $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.bank_name', 'BCA')
            ->assertJsonPath('data.is_active', true);
        $this->postJson($this->url(), $this->payload(['bank_name' => 'Mandiri', 'account_number' => '999']))->assertCreated();

        $list = $this->getJson('/api/v1/branches')->assertOk()->json('data');
        $east = collect($list)->firstWhere('code', 'EAST');
        $this->assertSame(['BCA', 'Mandiri'], collect($east['bank_accounts'])->pluck('bank_name')->all());
        $this->assertSame([], collect($list)->firstWhere('code', 'WEST')['bank_accounts']);
    }

    public function test_writes_require_branch_master_module(): void
    {
        $this->actAs($this->makeStaff('finance'))->postJson($this->url(), $this->payload())->assertStatus(403);
    }

    public function test_validation_and_duplicate_pair_per_branch(): void
    {
        $this->actAs($this->master)->postJson($this->url(), [])->assertStatus(422)
            ->assertJsonValidationErrors(['bank_name', 'account_number', 'account_holder']);
        $this->postJson($this->url(), $this->payload(['account_number' => 'abc']))->assertStatus(422)->assertJsonValidationErrors(['account_number']);

        $this->postJson($this->url(), $this->payload())->assertCreated();
        $this->postJson($this->url(), $this->payload())->assertStatus(422)->assertJsonValidationErrors(['account_number']);
        // pasangan sama boleh di cabang lain
        $this->postJson($this->url('WEST'), $this->payload())->assertCreated();
    }

    public function test_update_toggle_and_delete(): void
    {
        $id = $this->actAs($this->master)->postJson($this->url(), $this->payload())->json('data.id');

        $this->putJson($this->url('EAST', "/$id"), ['account_holder' => 'Therapedia East'])
            ->assertOk()->assertJsonPath('data.account_holder', 'Therapedia East')->assertJsonPath('data.bank_name', 'BCA');
        $this->patchJson($this->url('EAST', "/$id/active"), ['is_active' => false])->assertOk()->assertJsonPath('data.is_active', false);
        $this->deleteJson($this->url('EAST', "/$id"))->assertNoContent();
        $this->assertDatabaseMissing('branch_bank_accounts', ['id' => $id]);
    }

    public function test_account_of_another_branch_is_404(): void
    {
        $id = $this->actAs($this->master)->postJson($this->url('EAST'), $this->payload())->json('data.id');

        $this->putJson($this->url('WEST', "/$id"), ['account_holder' => 'X'])->assertNotFound();
        $this->deleteJson($this->url('WEST', "/$id"))->assertNotFound();
    }

    public function test_parent_session_exposes_only_active_accounts_of_own_branch(): void
    {
        $east = $this->branchId('EAST');
        BranchBankAccount::query()->create(['branch_id' => $east, 'bank_name' => 'BCA', 'account_number' => '111', 'account_holder' => 'A', 'sort_order' => 1]);
        BranchBankAccount::query()->create(['branch_id' => $east, 'bank_name' => 'BNI', 'account_number' => '222', 'account_holder' => 'A', 'sort_order' => 2, 'is_active' => false]);
        BranchBankAccount::query()->create(['branch_id' => $this->branchId('WEST'), 'bank_name' => 'BRI', 'account_number' => '333', 'account_holder' => 'A']);
        $client = $this->makeClient(['branch_id' => $east]);

        $res = $this->postJson('/api/v1/auth/client-login', [
            'client_code' => $client->client_code,
            'date_of_birth' => '2018-05-17',
        ])->assertOk();

        $accounts = $res->json('data.client.branch.bank_accounts');
        $this->assertSame(['BCA'], collect($accounts)->pluck('bank_name')->all());
    }
}
