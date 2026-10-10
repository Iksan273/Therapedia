import { DEFAULT_THERAPIST_OFF_REASONS, RESCHEDULE_DROPPED, cancellationStats, isTherapistOffCancel } from "@/domain/schedule";

const codes = DEFAULT_THERAPIST_OFF_REASONS.map((r) => r.value);
const sess = (status, cancelReason) => ({ status, cancelReason });

describe("cancellationStats (Therapist Off)", () => {
  const schedules = [
    sess("completed"),
    sess("completed"),
    sess("cancelled", "S"), // client sakit
    sess("cancelled", "TO"), // terapis off
    sess("cancelled", "TS"), // terapis sakit
    sess("cancelled", RESCHEDULE_DROPPED), // netral, tidak dihitung
    sess("scheduled"),
    sess("rescheduled"),
  ];

  test("Therapist Off tetap terhitung di Cancellation Rate keseluruhan", () => {
    const st = cancellationStats(schedules, codes);
    expect(st.total).toBe(8);
    expect(st.cancelled).toBe(3);
    expect(st.therapistOff).toBe(2);
    expect(st.cancelRate).toBe(38); // 3/8
    expect(st.therapistOffRate).toBe(25); // 2/8
  });

  test("tanpa kode Therapist Off, semua cancel hanya masuk keseluruhan", () => {
    const st = cancellationStats(schedules, []);
    expect(st.cancelled).toBe(3);
    expect(st.therapistOff).toBe(0);
  });

  test("kumpulan kosong → 0%", () => {
    expect(cancellationStats([], codes)).toMatchObject({ total: 0, cancelRate: 0, therapistOffRate: 0 });
  });

  test("isTherapistOffCancel hanya untuk sesi cancelled ber-kode terdaftar", () => {
    expect(isTherapistOffCancel(sess("cancelled", "TO"), codes)).toBe(true);
    expect(isTherapistOffCancel(sess("completed", "TO"), codes)).toBe(false);
    expect(isTherapistOffCancel(sess("cancelled", "S"), codes)).toBe(false);
    expect(isTherapistOffCancel(sess("cancelled"), codes)).toBe(false);
  });
});
