// @vitest-environment jsdom
// Panel revert: alasan wajib, efek ditampilkan sebelum konfirmasi, slot terisi memblokir.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { RevertSessionPanel } from "@/features/schedule/components/calendar/RevertSessionPanel";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const preview = {
  toStatus: "scheduled",
  entry: { packageName: "Regular Therapist (10x)" },
  creditChange: 1,
  quotaChange: 0,
  clientRestore: null,
};

async function mount(props) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(<RevertSessionPanel schedule={{ id: "s-1", status: "completed" }} preview={preview} conflicts={[]} onConfirm={() => {}} {...props} />));
  return { el, root };
}

const click = (el, testId) => act(async () => el.querySelector(`[data-testid="${testId}"]`).dispatchEvent(new MouseEvent("click", { bubbles: true })));
const type = (el, testId, value) =>
  act(async () => {
    const input = el.querySelector(`[data-testid="${testId}"]`);
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

test("konfirmasi nonaktif sampai alasan diisi, lalu mengirim alasan; efek kredit tampil", async () => {
  const onConfirm = vi.fn();
  const { el, root } = await mount({ onConfirm });
  await click(el, "session-revert-button");

  expect(el.querySelector('[data-testid="session-revert-effects"]').textContent).toContain("+1 kredit dikembalikan ke Regular Therapist (10x)");
  const confirm = el.querySelector('[data-testid="session-confirm-revert-button"]');
  expect(confirm.disabled).toBe(true);

  await type(el, "session-revert-reason", "  Salah klik  ");
  expect(confirm.disabled).toBe(false);
  await click(el, "session-confirm-revert-button");
  expect(onConfirm).toHaveBeenCalledWith("Salah klik");
  act(() => root.unmount());
});

test("slot terisi memblokir revert", async () => {
  const { el, root } = await mount({ conflicts: ["Terapis A sudah menangani client lain di jam tersebut (1 jadwal bersamaan)."] });
  await click(el, "session-revert-button");
  await type(el, "session-revert-reason", "Salah klik");
  expect(el.querySelector('[data-testid="session-revert-conflict"]')).not.toBeNull();
  expect(el.querySelector('[data-testid="session-confirm-revert-button"]').disabled).toBe(true);
  act(() => root.unmount());
});
