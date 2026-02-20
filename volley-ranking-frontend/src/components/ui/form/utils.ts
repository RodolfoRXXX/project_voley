
export const inputClass = (valid: boolean) =>
  `w-full rounded border p-2 transition-colors
  bg-white text-neutral-900
  dark:bg-[var(--surface)] dark:text-[var(--foreground)]
  ${valid ? "border-green-500" : "border-red-500"}`;
