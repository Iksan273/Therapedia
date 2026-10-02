// Konversi key objek camelCase (frontend) ↔ snake_case (Laravel API / MySQL).
// Dipakai interceptor httpClient, jadi kode frontend tetap memakai camelCase.

const toSnake = (key) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (key) => key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

const isPlainObject = (v) => Object.prototype.toString.call(v) === "[object Object]";

function convertKeys(value, convert) {
  if (Array.isArray(value)) return value.map((v) => convertKeys(v, convert));
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [convert(k), convertKeys(v, convert)]));
}

export const keysToSnake = (value) => convertKeys(value, toSnake);
export const keysToCamel = (value) => convertKeys(value, toCamel);
