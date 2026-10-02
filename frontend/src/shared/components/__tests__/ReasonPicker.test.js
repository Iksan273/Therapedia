// @vitest-environment jsdom
// Pilihan cepat + "Lainnya (ketik sendiri)": nilai yang keluar selalu string.
import { useState } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ReasonPicker } from "@/shared/components/ReasonPicker";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const OPTIONS = [
  { value: "sakit", label: "Sakit" },
  { value: "izin", label: "Izin" },
];

let latest;
function Harness({ initial }) {
  const [value, setValue] = useState(initial);
  latest = value;
  return <ReasonPicker options={OPTIONS} value={value} onChange={setValue} testId="rp" />;
}

async function mount(initial) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(<Harness initial={initial} />));
  return { el, root };
}

test("nilai pilihan cepat tidak menampilkan input custom", async () => {
  const { el, root } = await mount("sakit");
  expect(el.querySelector('[data-testid="rp-custom-input"]')).toBeNull();
  act(() => root.unmount());
});

test("nilai yang bukan kode pilihan cepat tampil sebagai teks custom", async () => {
  const { el, root } = await mount("Anak ujian sekolah");
  const input = el.querySelector('[data-testid="rp-custom-input"]');
  expect(input).not.toBeNull();
  expect(input.value).toBe("Anak ujian sekolah");
  expect(latest).toBe("Anak ujian sekolah");
  act(() => root.unmount());
});
