<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// View dashboard & list gabungan (schema.md §04-G). Bukan tabel; tidak menyimpan data. Dibuat setelah semua tabel.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
CREATE OR REPLACE VIEW v_daily_revenue AS
SELECT branch_id, paid_date, COUNT(*) AS invoices_paid,
       SUM(amount) AS gross_revenue,                              -- refund tetap termasuk
       SUM(COALESCE(refund_amount, 0)) AS refund_total,
       SUM(amount - COALESCE(refund_amount, 0)) AS revenue        -- VERIFIED revenue (bagian refund keluar)
FROM invoices
WHERE status = 'paid'
GROUP BY branch_id, paid_date
SQL);

        DB::statement(<<<'SQL'
CREATE OR REPLACE VIEW v_daily_sessions AS
SELECT s.branch_id, s.session_date,
       COUNT(*)                                                                AS sessions_total,
       SUM(s.status = 'completed')                                             AS sessions_completed,
       SUM(s.status = 'cancelled')                                             AS sessions_cancelled,
       SUM(s.status = 'cancelled' AND COALESCE(s.cancel_reason, '') <> 'RD')   AS sessions_cancel_counted,
       SUM(s.status = 'cancelled' AND COALESCE(r.is_therapist_off, 0) = 1)     AS sessions_cancel_therapist_off,
       SUM(s.status = 'reschedule_pending')                                    AS sessions_pending,
       SUM(s.status IN ('scheduled','rescheduled'))                            AS sessions_upcoming
FROM schedules s
LEFT JOIN cancel_reasons r ON r.code = s.cancel_reason   -- tabel kecil ber-PK code
GROUP BY s.branch_id, s.session_date
SQL);

        DB::statement(<<<'SQL'
CREATE OR REPLACE VIEW v_daily_credit_usage AS
SELECT branch_id, entry_date, action, COUNT(*) AS entries, SUM(credit_change) AS credit_change
FROM credit_ledger
GROUP BY branch_id, entry_date, action
SQL);

        DB::statement(<<<'SQL'
CREATE OR REPLACE VIEW v_therapist_sessions AS
SELECT s.id AS schedule_id, s.branch_id, s.therapist_id, s.client_id, c.child_name,
       s.session_date, s.start_time, s.end_time, s.type, s.status,
       COALESCE(r.filled_sections, 0) AS filled_sections, r.updated_at AS report_updated_at
FROM schedules s
JOIN clients c ON c.id = s.client_id
LEFT JOIN session_reports r ON r.schedule_id = s.id
SQL);

        DB::statement(<<<'SQL'
CREATE OR REPLACE VIEW v_unreported_sessions AS
SELECT s.id AS schedule_id, s.branch_id, s.therapist_id, s.client_id, c.child_name,
       s.session_date, s.start_time, s.end_time, s.type, s.completed_at,
       COALESCE(r.filled_sections, 0) AS filled_sections
FROM schedules s
JOIN clients c ON c.id = s.client_id
LEFT JOIN session_reports r ON r.schedule_id = s.id
WHERE s.status = 'completed' AND COALESCE(r.filled_sections, 0) = 0
SQL);

        DB::statement(<<<'SQL'
CREATE OR REPLACE VIEW v_invoice_queue AS
SELECT i.id AS invoice_id, i.branch_id, i.invoice_number, i.status, i.amount, i.issued_at,
       c.id AS client_id, c.client_code, c.child_name, c.parent_name,
       i.proof_upload_count, p.id AS last_proof_id, p.uploaded_at AS last_proof_at
FROM invoices i
JOIN clients c ON c.id = i.client_id
LEFT JOIN payment_proofs p ON p.id = (
  SELECT p2.id FROM payment_proofs p2 WHERE p2.invoice_id = i.id ORDER BY p2.uploaded_at DESC LIMIT 1
)
SQL);

    }

    public function down(): void
    {
        DB::statement('DROP VIEW IF EXISTS v_invoice_queue');
        DB::statement('DROP VIEW IF EXISTS v_unreported_sessions');
        DB::statement('DROP VIEW IF EXISTS v_therapist_sessions');
        DB::statement('DROP VIEW IF EXISTS v_daily_credit_usage');
        DB::statement('DROP VIEW IF EXISTS v_daily_sessions');
        DB::statement('DROP VIEW IF EXISTS v_daily_revenue');
    }
};
