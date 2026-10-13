<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->enum('type', ['gdrive_folder', 'referral', 'observation_video', 'report', 'other'])->default('gdrive_folder');
            $table->string('label', 150)->nullable();
            $table->string('url', 500);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['client_id', 'type'], 'idx_client_docs_client');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_documents');
    }
};
