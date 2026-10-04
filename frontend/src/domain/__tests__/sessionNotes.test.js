import { bookingNoteOf, cancelNoteOf } from "@/domain/schedule";

describe("catatan sesi dipisah per sumber", () => {
  test("bookingNote dan cancelNote tidak saling menimpa", () => {
    const s = { status: "cancelled", bookingNote: "Bawa mainan favorit", cancelNote: "Anak demam" };
    expect(bookingNoteOf(s)).toBe("Bawa mainan favorit");
    expect(cancelNoteOf(s)).toBe("Anak demam");
  });

  test("data lama (field `notes`): sesi cancelled = catatan cancel, selain itu = catatan penjadwalan", () => {
    expect(cancelNoteOf({ status: "cancelled", notes: "Izin keluarga" })).toBe("Izin keluarga");
    expect(bookingNoteOf({ status: "cancelled", notes: "Izin keluarga" })).toBeNull();
    expect(bookingNoteOf({ status: "completed", notes: "Sesi pagi" })).toBe("Sesi pagi");
    expect(cancelNoteOf({ status: "completed", notes: "Sesi pagi" })).toBeNull();
  });

  test("tanpa catatan = null", () => {
    expect(bookingNoteOf({ status: "scheduled" })).toBeNull();
    expect(cancelNoteOf(undefined)).toBeNull();
  });
});
