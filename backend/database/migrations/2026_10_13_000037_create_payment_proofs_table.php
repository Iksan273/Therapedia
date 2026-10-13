<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_proofs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->string('file_path', 500);
            $table->string('file_name', 200);
            $table->string('mime_type', 80);
            $table->unsignedInteger('file_size');
            $table->enum('uploaded_by_type', ['client', 'user']);
            $table->unsignedBigInteger('uploaded_by_id');
            $table->timestamp('uploaded_at')->useCurrent();
            $table->index(['invoice_id', 'uploaded_at'], 'idx_proofs_invoice');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_proofs');
    }
};
