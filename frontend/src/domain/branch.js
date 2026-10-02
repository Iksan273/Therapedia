// Domain cabang klinik.

export const BRANCHES = [
  { id: "branch-sby-timur", name: "East", code: "EAST", city: "Surabaya" },
  { id: "branch-citraland", name: "Citraland", code: "CTL", city: "Surabaya" },
  { id: "branch-sby-barat", name: "West", code: "WEST", city: "Surabaya" },
];

// Nama cabang untuk tampilan; "—" bila id tidak dikenal (jangan menebak cabang lain)
export const branchName = (id) => BRANCHES.find((b) => b.id === id)?.name || "—";
