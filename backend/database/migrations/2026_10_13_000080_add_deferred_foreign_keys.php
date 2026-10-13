<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// FK melingkar / ke tabel yang dibuat belakangan (schema.md §09): ditambahkan setelah semua tabel ada.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::table('roles', function (Blueprint $table) {
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->foreign('leave_id')->references('id')->on('client_leaves')->nullOnDelete();
            $table->foreign('leave_schedule_id')->references('id')->on('schedules')->nullOnDelete();
            $table->foreign('replaces_invoice_id')->references('id')->on('invoices')->nullOnDelete();
        });

        Schema::table('client_packages', function (Blueprint $table) {
            $table->foreign('converted_from_package_id')->references('id')->on('client_packages')->cascadeOnDelete();
            $table->foreign('converted_to_package_id')->references('id')->on('client_packages')->nullOnDelete();
        });

        Schema::table('credit_ledger', function (Blueprint $table) {
            $table->foreign('reverses_ledger_id')->references('id')->on('credit_ledger')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropForeign(['updated_by']);
        });

        Schema::table('roles', function (Blueprint $table) {
            $table->dropForeign(['updated_by']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['leave_id']);
            $table->dropForeign(['leave_schedule_id']);
            $table->dropForeign(['replaces_invoice_id']);
        });

        Schema::table('client_packages', function (Blueprint $table) {
            $table->dropForeign(['converted_from_package_id']);
            $table->dropForeign(['converted_to_package_id']);
        });

        Schema::table('credit_ledger', function (Blueprint $table) {
            $table->dropForeign(['reverses_ledger_id']);
        });
    }
};
