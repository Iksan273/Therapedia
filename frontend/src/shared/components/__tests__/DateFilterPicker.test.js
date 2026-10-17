// @vitest-environment jsdom
// DateFilterPicker: opsi untuk form login ortu (ikon kiri, format "DD / MM / YYYY" dengan pemisah otomatis, kosongkan nilai bila belum valid).
import { useState } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import DateFilterPicker from "@/shared/components/DateFilterPicker";
import { parseDdMmYyyy } from "@/shared/lib/format";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;
let container;
let latest;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  latest = undefined;
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function Host({ initial = "", ...props }) {
  const [value, setValue] = useState(initial);
  latest = value;
  return <DateFilterPicker value={value} onChange={(e) => setValue(e?.target?.value ?? e ?? "")} data-testid="dob" {...props} />;
}
const input = () => container.querySelector('[data-testid="dob"]');
const type = (value) =>
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input(), value);
    input().dispatchEvent(new Event("input", { bubbles: true }));
  });

const SPACED = { iconPosition: "left", displayFormat: "spaced", size: "lg", clearOnInvalid: true };

test("parseDdMmYyyy menerima pemisah dengan spasi ('05 / 03 / 2018') selain format lama", () => {
  expect(parseDdMmYyyy("05 / 03 / 2018")).toBe("2018-03-05");
  expect(parseDdMmYyyy("5-3-2018")).toBe("2018-03-05");
  expect(parseDdMmYyyy("05/03/2018")).toBe("2018-03-05");
  expect(parseDdMmYyyy("31 / 02 / 2018")).toBeNull(); // tanggal tidak ada
  expect(parseDdMmYyyy("05 / 03")).toBeNull();
});

test("mode spaced: ketik angka saja diformat 'DD / MM / YYYY' otomatis, nilai ISO terkirim saat lengkap, keypad numerik", () => {
  act(() => root.render(<Host {...SPACED} />));
  expect(input().placeholder).toBe("DD/MM/YYYY"); // placeholder bawaan; halaman login menimpa

  type("05");
  expect(input().value).toBe("05");
  type("050");
  expect(input().value).toBe("05 / 0");
  type("0503");
  expect(input().value).toBe("05 / 03");
  type("050320");
  expect(input().value).toBe("05 / 03 / 20");
  type("05032018");
  expect(input().value).toBe("05 / 03 / 2018");
  expect(latest).toBe("2018-03-05");
  expect(input().inputMode).toBe("numeric");

  type("0503201899"); // kelebihan angka diabaikan
  expect(input().value).toBe("05 / 03 / 2018");
});

test("mode spaced: hapus mundur wajar dan nilai induk dikosongkan selama belum lengkap (tidak mengirim tanggal lama)", () => {
  act(() => root.render(<Host {...SPACED} initial="2018-03-05" />));
  expect(input().value).toBe("05 / 03 / 2018"); // nilai awal ditampilkan dengan format spaced

  type("05 / 03 / 201"); // hapus satu digit
  expect(latest).toBe(""); // clearOnInvalid
  type("05 / 03 / ");
  expect(input().value).toBe("05 / 03");
  type("");
  expect(latest).toBe("");
});

test("tanggal tidak ada (31 / 02) atau lewat maxDate tidak dikirim", () => {
  act(() => root.render(<Host {...SPACED} maxDate="2026-10-17" />));
  type("31022018");
  expect(latest).toBe("");
  type("01012030"); // di masa depan
  expect(latest).toBe("");
  type("17102026");
  expect(latest).toBe("2026-10-17");
});

test("ikon kalender di kiri (sejajar ikon kunci), tombol hapus di kanan; pemakai lama tetap ikon di kanan dengan format dd/MM/yyyy", () => {
  act(() => root.render(<Host {...SPACED} initial="2018-03-05" />));
  const picker = container.querySelector('[data-testid="dob-picker-btn"]');
  expect(picker.parentElement.className).toContain("left-1");
  expect(container.querySelector('[data-testid="dob-clear"]')).not.toBeNull();

  act(() => root.unmount());
  root = createRoot(container);
  act(() => root.render(<Host initial="2018-03-05" />));
  expect(input().value).toBe("05/03/2018");
  expect(container.querySelector('[data-testid="dob-picker-btn"]').parentElement.className).toContain("right-1.5");
  expect(input().inputMode).toBe("");
});

describe("kalender terbuka saat kolom diklik", () => {
  const calendarOpen = () => document.querySelector('[role="dialog"]') !== null || document.querySelector(".rdp") !== null;
  const click = (el) => act(() => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));

  test("klik kolom langsung membuka kalender (tidak harus klik ikon), fokus tetap di kolom agar bisa mengetik", () => {
    act(() => root.render(<Host {...SPACED} />));
    expect(calendarOpen()).toBe(false);

    input().focus();
    click(input());
    expect(calendarOpen()).toBe(true);
    expect(document.activeElement).toBe(input()); // tidak berpindah ke kalender

    type("05032018"); // masih bisa mengetik, tanggal lengkap yang valid menutup kalender
    expect(latest).toBe("2018-03-05");
    expect(calendarOpen()).toBe(false);
  });

  test("klik ikon kalender tetap membuka kalender, dan klik di kolom saat terbuka tidak menutupnya", () => {
    act(() => root.render(<Host {...SPACED} />));
    click(container.querySelector('[data-testid="dob-picker-btn"]'));
    expect(calendarOpen()).toBe(true);

    click(input()); // klik di dalam kolom sendiri bukan 'klik di luar'
    expect(calendarOpen()).toBe(true);
  });

  test("panah bawah membuka, Esc menutup kalender (papan ketik)", () => {
    act(() => root.render(<Host {...SPACED} />));
    act(() => input().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    expect(calendarOpen()).toBe(true);
    act(() => input().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(calendarOpen()).toBe(false);
  });

  test("openOnInputClick={false} mengembalikan perilaku lama (hanya ikon yang membuka)", () => {
    act(() => root.render(<Host {...SPACED} openOnInputClick={false} />));
    click(input());
    expect(calendarOpen()).toBe(false);
    click(container.querySelector('[data-testid="dob-picker-btn"]'));
    expect(calendarOpen()).toBe(true);
  });
});
