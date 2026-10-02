import { useEffect, useState } from "react";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const CUSTOM = "__custom__";

// Pilihan cepat + opsi "Lainnya (ketik sendiri)". Nilai yang dikirim ke `onChange` selalu STRING:
// `value` pilihan cepat, atau teks bebas yang diketik user (tanpa relasi ke daftar pilihan).
export function ReasonPicker({ options, value, onChange, placeholder = "Pilih alasan...", customPlaceholder = "Tulis alasan sendiri...", testId, className }) {
  const matchesOption = Boolean(value) && options.some((o) => o.value === value);
  const [forceCustom, setForceCustom] = useState(false);

  // Nilai dari luar (mis. form di-reset) yang cocok pilihan cepat → kembali ke mode pilihan
  useEffect(() => {
    if (matchesOption) setForceCustom(false);
  }, [matchesOption]);

  const isCustom = forceCustom || (Boolean(value) && !matchesOption);

  const handleSelect = (v) => {
    if (v === CUSTOM) {
      setForceCustom(true);
      if (matchesOption) onChange("");
      return;
    }
    setForceCustom(false);
    onChange(v);
  };

  return (
    <div className={className ? `space-y-2 ${className}` : "space-y-2"}>
      <Select value={isCustom ? CUSTOM : value || ""} onValueChange={handleSelect}>
        <SelectTrigger className="border-slate-200 bg-white font-semibold text-xs" data-testid={testId ? `${testId}-select` : undefined}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-slate-200">
          {options.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM}>Lainnya (ketik sendiri)</SelectItem>
        </SelectContent>
      </Select>
      {isCustom && (
        <Input
          autoFocus
          maxLength={150}
          className="border-slate-200 bg-white text-xs"
          placeholder={customPlaceholder}
          value={matchesOption ? "" : value || ""}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId ? `${testId}-custom-input` : undefined}
        />
      )}
    </div>
  );
}
