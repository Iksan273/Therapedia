<?php

namespace Tests\Feature\Organization;

use App\Models\AccessModule;
use App\Models\RolePermission;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthFixtures;
use Tests\Concerns\OrganizationFixtures;
use Tests\TestCase;

/** Modul akses yang dipisah dari inquiry_pipeline / revenue: kode, urutan, dan default per role. */
class AccessModulesSeedTest extends TestCase
{
    use AuthFixtures, OrganizationFixtures, RefreshDatabase;

    private const NEW_MODULES = ['assessment_master', 'inquiry_master_data', 'branch_performance'];

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedFoundation();
    }

    private function allowedModules(string $roleCode): array
    {
        return RolePermission::query()
            ->where('role_id', $this->roleId($roleCode))
            ->where('allowed', true)
            ->pluck('module_code')
            ->all();
    }

    public function test_new_modules_exist_and_follow_the_seeder_order(): void
    {
        $codes = AccessModule::query()->orderBy('sort_order')->pluck('code')->all();

        $this->assertSame(array_keys(RbacSeeder::MODULES), $codes);
        foreach (self::NEW_MODULES as $module) {
            $this->assertContains($module, $codes);
        }
    }

    public function test_every_system_role_has_a_row_for_every_module(): void
    {
        foreach (array_keys(RbacSeeder::ROLES) as $roleCode) {
            $this->assertSame(
                count(RbacSeeder::MODULES),
                RolePermission::where('role_id', $this->roleId($roleCode))->count(),
                "role {$roleCode}: matriks tidak lengkap"
            );
        }
    }

    public function test_default_access_keeps_who_could_open_the_pages_before(): void
    {
        // Admin Inquiry dulu membuka Assessment Master Data & Master Layanan lewat inquiry_pipeline: akses dipertahankan.
        $adminInquiry = $this->allowedModules('admin_inquiry');
        $this->assertContains('assessment_master', $adminInquiry);
        $this->assertContains('inquiry_master_data', $adminInquiry);

        // Performa All-Branch dulu satu paket dengan revenue tetapi halamannya khusus Master: tidak ikut ke role lain.
        foreach (['manager', 'admin_inquiry', 'admin_schedule', 'finance', 'therapist'] as $roleCode) {
            $this->assertNotContains('branch_performance', $this->allowedModules($roleCode), "{$roleCode} tidak boleh otomatis");
        }
        foreach (['manager', 'admin_schedule', 'finance', 'therapist'] as $roleCode) {
            $this->assertNotContains('assessment_master', $this->allowedModules($roleCode));
            $this->assertNotContains('inquiry_master_data', $this->allowedModules($roleCode));
        }
    }

    public function test_master_has_all_modules_through_the_api(): void
    {
        $master = $this->makeStaff('master');

        $this->actAs($master)->getJson('/api/v1/access-modules')->assertOk();
        $session = $this->postJson('/api/v1/auth/login', ['email' => $master->email, 'password' => self::PASSWORD])->assertOk();

        $this->assertSame(array_keys(RbacSeeder::MODULES), $session->json('data.user.permissions'));
    }

    public function test_the_modules_can_be_granted_to_a_custom_role_independently(): void
    {
        $master = $this->makeStaff('master');
        $role = $this->makeCustomRole('kurator', []);

        $this->actAs($master)->putJson('/api/v1/roles/'.$role->id.'/permissions', [
            'permissions' => [
                ['module_code' => 'assessment_master', 'allowed' => true],
                ['module_code' => 'branch_performance', 'allowed' => true],
            ],
        ])->assertOk()->assertJsonPath('data.permissions', ['branch_performance', 'assessment_master']);

        $this->assertNotContains('inquiry_master_data', $this->allowedModules('kurator'));
    }
}
