// Adapter penyimpanan lokal (localStorage) untuk mode demo.
// Satu-satunya modul yang boleh menyentuh window.localStorage untuk data domain.
// Saat API Laravel aktif, store domain beralih ke services/http dan modul ini hanya dipakai untuk preferensi UI.

export const STORAGE_PREFIX = "therapedia_v5_";
export const LEGACY_PREFIX = "therapedia_v4_";

// Normalisasi istilah lama di data tersimpan (nama paket & cabang yang sudah diganti)
function migrateRawState(raw) {
  if (!raw) return null;
  try {
    const replaced = raw
      .replace(/Paket Reguler/g, "Regular Therapist")
      .replace(/Paket VIP/g, "Senior Therapist")
      .replace(/Surabaya Timur/g, "East")
      .replace(/Surabaya Barat/g, "West");
    return JSON.parse(replaced);
  } catch (e) {
    return null;
  }
}

// Baca nilai tersimpan untuk `key`. Mengembalikan undefined bila belum ada / rusak.
// Data versi lama (v4) dimigrasi otomatis ke prefix aktif.
export function readPersisted(key) {
  const storageKey = STORAGE_PREFIX + key;
  const legacyKey = LEGACY_PREFIX + key;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw !== null) {
      const migrated = migrateRawState(raw);
      if (migrated !== null) return migrated;
    }

    const rawLegacy = window.localStorage.getItem(legacyKey);
    if (rawLegacy !== null) {
      const migrated = migrateRawState(rawLegacy);
      if (migrated !== null) {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(migrated));
          window.localStorage.removeItem(legacyKey);
        } catch (_) {}
        return migrated;
      }
    }
  } catch (e) {
    // entry rusak → pemanggil memakai seed
  }
  return undefined;
}

export function writePersisted(key, value) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    // storage penuh / tidak tersedia → state tetap in-memory
  }
}

// Apakah key sudah punya data yang bisa dipakai (dipakai bootstrap seed)
export function hasPersisted(key) {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key) ?? window.localStorage.getItem(LEGACY_PREFIX + key);
    return raw != null && JSON.parse(raw) !== null;
  } catch {
    return false;
  }
}

export function removePersisted(key) {
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + key);
    window.localStorage.removeItem(LEGACY_PREFIX + key);
  } catch {
    // abaikan
  }
}

export function clearPersistedData() {
  Object.keys(window.localStorage)
    .filter((k) => k.startsWith("therapedia_"))
    .forEach((k) => window.localStorage.removeItem(k));
}

// Hapus seluruh data demo lalu kembali ke halaman awal (seed dimuat ulang saat boot)
export function resetDemoData() {
  clearPersistedData();
  window.location.assign("/");
}
