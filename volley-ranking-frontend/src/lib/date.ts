// src/lib/date.ts

// Unificar la forma de mostrar fechas

import { Timestamp } from "firebase/firestore";

type DateLike = Date | Timestamp;

export function formatDateTime(value: DateLike): string {
  const date =
    value instanceof Date ? value : value.toDate();

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// 👇 NUEVO: para inputs datetime-local
export function formatForDateTimeLocal(value: DateLike): string {
  const date =
    value instanceof Date ? value : value.toDate();

  const pad = (n: number) => n.toString().padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}