<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_services', function (Blueprint $table) {
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('service_code', 50);
            $table->timestamp('selected_at')->useCurrent();
            $table->foreignId('selected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreign('service_code')->references('code')->on('services')->restrictOnDelete();
            $table->primary(['client_id', 'service_code']);
            $table->index('service_code', 'idx_client_services_service');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_services');
    }
};
