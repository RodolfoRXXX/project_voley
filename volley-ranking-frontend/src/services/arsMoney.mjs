export function parseArsMinor(value) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, decimal = ""] = normalized.split(".");
  const amount = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amount >= 1 && amount <= 999999999999 ? amount : null;
}
export const formatArs = (minor) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(minor / 100);
